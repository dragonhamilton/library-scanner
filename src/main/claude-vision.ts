import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import { getKey } from './keychain';
import { resizeForClaude } from './image-processing';

export interface SpineDetection {
  spine_index: number;
  title_on_spine: string;
  author_on_spine: string | null;
  other_text: string | null;
  bounding_box: { description: string };
}

const SYSTEM_PROMPT = `You are a book spine reader. Given a photo of a bookshelf, identify every
visible book spine. For each book, extract:
- The title as printed on the spine
- The author name as printed on the spine (if visible)
- Any other identifying text (publisher, edition, etc.)

Return ONLY a JSON array. No markdown, no commentary. Each element:
{
  "spine_index": 1,
  "title_on_spine": "exact text",
  "author_on_spine": "exact text or null",
  "other_text": "any other text or null",
  "bounding_box": {
    "description": "position description for cropping, e.g. '3rd book from left'"
  }
}

Order the books left to right, top to bottom (for multi-shelf images).
If a spine is too blurry or obscured to read, include it with title_on_spine set to "[UNREADABLE]".`;

export async function detectSpines(imagePath: string): Promise<SpineDetection[]> {
  const apiKey = getKey('anthropicApiKey');
  if (!apiKey) throw new Error('Anthropic API key not configured');

  const client = new Anthropic({ apiKey });
  const imageBuffer = await resizeForClaude(imagePath);
  const base64 = imageBuffer.toString('base64');

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
              { type: 'text', text: 'Please identify all book spines in this image.' },
            ],
          },
        ],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      return JSON.parse(text) as SpineDetection[];
    } catch (err) {
      if (attempt === 2) throw err;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }

  throw new Error('Failed to detect spines after 3 attempts');
}
