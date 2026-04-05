export interface BookMetadata {
  title: string;
  authors: string[];
  isbn13: string | null;
  isbn10: string | null;
  publisher: string | null;
  publishedDate: string | null;
  thumbnail: string | null;
}

const DELAY_MS = 200;

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

function similarity(a: string, b: string): number {
  a = a.toLowerCase();
  b = b.toLowerCase();
  if (a === b) return 1;
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.length === 0) return 1;
  const distance = levenshtein(longer, shorter);
  return (longer.length - distance) / longer.length;
}

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

async function queryGoogleBooks(q: string, apiKey?: string | null): Promise<BookMetadata | null> {
  const keyParam = apiKey ? `&key=${encodeURIComponent(apiKey)}` : '';
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=1${keyParam}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json() as { items?: { volumeInfo: Record<string, unknown> }[] };
  if (!data.items?.length) return null;

  const info = data.items[0].volumeInfo as {
    title?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    industryIdentifiers?: { type: string; identifier: string }[];
    imageLinks?: { thumbnail?: string };
  };

  const identifiers = info.industryIdentifiers ?? [];
  return {
    title: info.title ?? '',
    authors: info.authors ?? [],
    isbn13: identifiers.find(i => i.type === 'ISBN_13')?.identifier ?? null,
    isbn10: identifiers.find(i => i.type === 'ISBN_10')?.identifier ?? null,
    publisher: info.publisher ?? null,
    publishedDate: info.publishedDate ?? null,
    thumbnail: info.imageLinks?.thumbnail ?? null,
  };
}

export async function lookupBook(
  title: string,
  author: string,
  apiKey?: string | null
): Promise<{ metadata: BookMetadata | null; confidence: number }> {
  await sleep(DELAY_MS);

  const queries = [
    author ? `intitle:${title} inauthor:${author}` : null,
    `intitle:${title}`,
    `${title} ${author}`.trim(),
  ].filter(Boolean) as string[];

  for (const q of queries) {
    const result = await queryGoogleBooks(q, apiKey);
    if (result?.isbn13 || result?.isbn10) {
      const conf = similarity(title, result.title);
      return { metadata: result, confidence: conf };
    }
  }

  return { metadata: null, confidence: 0 };
}
