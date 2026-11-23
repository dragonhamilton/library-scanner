import fs from 'fs';
import { getKey } from './keychain';
import { getConfig, saveConfig } from './config';
import type { BookEntry } from './ipc-handlers';

const NOTION_VERSION = '2022-06-28';

function notionHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Notion-Version': NOTION_VERSION,
  };
}

function extractPageId(url: string): string {
  const match = url.match(/([a-f0-9]{32})(?:[?#]|$)/i) ?? url.match(/([a-f0-9-]{36})(?:[?#]|$)/i);
  if (!match) throw new Error('Could not extract Notion page ID from URL');
  return match[1].replace(/-/g, '');
}

export async function testNotionConnection(token: string): Promise<boolean> {
  const res = await fetch('https://api.notion.com/v1/users/me', {
    headers: notionHeaders(token),
  });
  return res.ok;
}

async function createSingleDatabase(
  token: string,
  parentId: string,
  name: string
): Promise<string> {
  const res = await fetch('https://api.notion.com/v1/databases', {
    method: 'POST',
    headers: notionHeaders(token),
    body: JSON.stringify({
      parent: { type: 'page_id', page_id: parentId },
      title: [{ type: 'text', text: { content: name } }],
      properties: {
        Title: { title: {} },
        Author: { rich_text: {} },
        ISBN: { rich_text: {} },
        Notes: { rich_text: {} },
        'Spine Image': { files: {} },
        'Date Added': { date: {} },
      },
    }),
  });
  if (!res.ok) throw new Error(`Failed to create database "${name}": ${await res.text()}`);
  const data = await res.json() as { id: string };
  return data.id;
}

export async function createDatabase(
  token: string,
  parentPageUrl: string,
  name: string,
  unknownName: string
): Promise<{ databaseId: string; unknownDatabaseId: string }> {
  const parentId = extractPageId(parentPageUrl);
  const databaseId = await createSingleDatabase(token, parentId, name);
  const unknownDatabaseId = await createSingleDatabase(token, parentId, unknownName);
  saveConfig({ databaseId, unknownDatabaseId });
  return { databaseId, unknownDatabaseId };
}

async function uploadSpineImage(token: string, imagePath: string): Promise<string | null> {
  try {
    // Step 1: Create file upload object
    const createRes = await fetch('https://api.notion.com/v1/file_uploads', {
      method: 'POST',
      headers: notionHeaders(token),
      body: JSON.stringify({ filename: 'spine.jpg', content_type: 'image/jpeg' }),
    });
    if (!createRes.ok) return null;
    const { upload_url, id } = await createRes.json() as { upload_url: string; id: string };

    // Step 2: Upload bytes
    const bytes = fs.readFileSync(imagePath);
    const uploadRes = await fetch(upload_url, {
      method: 'POST',
      headers: { 'Content-Type': 'image/jpeg' },
      body: bytes,
    });
    if (!uploadRes.ok) return null;
    return id;
  } catch {
    return null;
  }
}

async function checkDuplicate(
  token: string,
  databaseId: string,
  book: BookEntry
): Promise<boolean> {
  // Prefer ISBN match (exact); fall back to title match
  const filters = [];
  if (book.isbn) {
    filters.push({
      property: 'ISBN',
      rich_text: { equals: book.isbn },
    });
  }
  if (book.title) {
    filters.push({
      property: 'Title',
      title: { equals: book.title },
    });
  }
  if (filters.length === 0) return false;

  const body: Record<string, unknown> = {
    filter: filters.length === 1 ? filters[0] : { or: filters },
    page_size: 1,
  };

  const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: 'POST',
    headers: notionHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) return false;
  const data = await res.json() as { results: unknown[] };
  return data.results.length > 0;
}

export interface UploadResult {
  id: string;
  status: 'uploaded' | 'error' | 'duplicate';
  notionPageId?: string;
}

export async function uploadBooks(books: BookEntry[]): Promise<UploadResult[]> {
  const token = getKey('notionToken');
  if (!token) throw new Error('Notion token not configured');
  const { databaseId, unknownDatabaseId } = getConfig();
  if (!databaseId) throw new Error('Notion database not configured');

  const results: UploadResult[] = [];

  for (const book of books.filter(b => b.selected)) {
    try {
      const isDuplicate = await checkDuplicate(token, databaseId, book);
      if (isDuplicate) {
        results.push({ id: book.id, status: 'duplicate' });
        continue;
      }

      const fileUploadId = await uploadSpineImage(token, book.spineImagePath);

      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const properties: Record<string, unknown> = {
        Title: { title: [{ text: { content: book.title } }] },
        Author: { rich_text: [{ text: { content: book.author } }] },
        ISBN: { rich_text: [{ text: { content: book.isbn } }] },
        Notes: { rich_text: [{ text: { content: book.notes } }] },
        'Date Added': { date: { start: today } },
      };

      if (fileUploadId) {
        properties['Spine Image'] = {
          files: [{ type: 'file_upload', file_upload: { id: fileUploadId } }],
        };
      }

      const targetDatabaseId = book.isbn ? databaseId : (unknownDatabaseId || databaseId);
      const res = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: notionHeaders(token),
        body: JSON.stringify({ parent: { database_id: targetDatabaseId }, properties }),
      });

      if (!res.ok) throw new Error(await res.text());
      const page = await res.json() as { id: string };
      results.push({ id: book.id, status: 'uploaded', notionPageId: page.id });
    } catch {
      results.push({ id: book.id, status: 'error' });
    }
  }

  return results;
}
