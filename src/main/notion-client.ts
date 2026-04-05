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

export async function createDatabase(
  token: string,
  parentPageUrl: string,
  name: string
): Promise<string> {
  const parentId = extractPageId(parentPageUrl);
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
      },
    }),
  });
  if (!res.ok) throw new Error(`Failed to create database: ${await res.text()}`);
  const data = await res.json() as { id: string };
  saveConfig({ databaseId: data.id });
  return data.id;
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

export interface UploadResult {
  id: string;
  status: 'uploaded' | 'error';
  notionPageId?: string;
}

export async function uploadBooks(books: BookEntry[]): Promise<UploadResult[]> {
  const token = getKey('notionToken');
  if (!token) throw new Error('Notion token not configured');
  const { databaseId } = getConfig();
  if (!databaseId) throw new Error('Notion database not configured');

  const results: UploadResult[] = [];

  for (const book of books.filter(b => b.selected)) {
    try {
      const fileUploadId = await uploadSpineImage(token, book.spineImagePath);

      const properties: Record<string, unknown> = {
        Title: { title: [{ text: { content: book.title } }] },
        Author: { rich_text: [{ text: { content: book.author } }] },
        ISBN: { rich_text: [{ text: { content: book.isbn } }] },
        Notes: { rich_text: [{ text: { content: book.notes } }] },
      };

      if (fileUploadId) {
        properties['Spine Image'] = {
          files: [{ type: 'file_upload', file_upload: { id: fileUploadId } }],
        };
      }

      const res = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: notionHeaders(token),
        body: JSON.stringify({ parent: { database_id: databaseId }, properties }),
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
