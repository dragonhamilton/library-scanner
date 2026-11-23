# library-scanner

I use this to catalogue my books. Take a photo of a shelf, the app cuts it into spines, reads each one with OCR, and I go through and fix whatever it got wrong. The books end up in Postgres.

This is ported from an Electron app that used Claude, Google Books and Notion. This version replaced all of that with local pieces.

## What's where

```
apps/server        Fastify API: image processing (sharp), OCR, Postgres
apps/web           React + Vite client
packages/shared    types both sides use
db/migrations      SQL, run automatically when the server starts
tools/rapidocr     optional Python OCR worker
e2e                Playwright tests
scripts/doctor.sh  checks the machine is set up
```

The app only stores what it can get from the photo: title, author and publisher (guessed from the OCR, then fixed by hand), the raw OCR text, the spine image, its position, size and colour, my notes, and a status (unreviewed, confirmed or skipped).

## Installing

The machine only has internal npm and PyPI mirrors, and they're missing most releases from the last couple of weeks. `pnpm-workspace.yaml` sets `minimumReleaseAge` to 21 days so pnpm doesn't pick anything too new. sharp's libvips and the Tesseract English model both come as npm packages, so nothing gets compiled or downloaded during install.


```bash
pnpm install
```

```bash
git add pnpm-lock.yaml && git commit -m "Add lockfile resolved against the internal mirror"
```

## Database

```bash
/usr/lib/postgresql/16/bin/initdb -D "$HOME/pgdata" -U postgres --auth=trust
```

```bash
/usr/lib/postgresql/16/bin/pg_ctl -D "$HOME/pgdata" -l "$HOME/pgdata/server.log" -o "-h 127.0.0.1 -p 5432 -k /tmp" start
```

```bash
psql -h 127.0.0.1 -U postgres -c "CREATE ROLE scanner LOGIN PASSWORD 'scanner'" -c "CREATE DATABASE library_scanner OWNER scanner" -c "CREATE DATABASE library_scanner_e2e OWNER scanner"
```

The tables get created when the server starts, or with `pnpm db:migrate`.

## Running it

```bash
pnpm dev
```

API on port 3000, client at http://127.0.0.1:5173. To run it as one process serving the built client on 3000:

```bash
pnpm build && pnpm start
```

The camera button only works on localhost or HTTPS (browser rule). Uploading a photo always works.

Defaults are fine as they are. If you need to change something, put `PORT`, `DATABASE_URL`, `DATA_DIR` or `OCR_ENGINE` in a `.env` file in this folder.

## How a scan goes

1. Upload or take a photo of a shelf.
2. It guesses how many books there are from the dark gaps between spines. Fix the number if it's wrong.
3. It slices the photo and reads each spine, trying it rotated both ways and upright and keeping the best reading.
4. Go through the spines: fix title, author and publisher, then Confirm or Skip. Read again re-runs the OCR, and clicking the spine image lets you recrop it.
5. Library lists everything and exports CSV, JSON, or a ZIP with the images.

## OCR

Tesseract (tesseract.js) is the default and needs nothing extra.

`OCR_ENGINE=rapidocr` runs `tools/rapidocr/ocr_server.py` with uv instead. It has to be `rapidocr-onnxruntime` 1.3 or 1.4, because those include the models in the wheel; the newer `rapidocr` package downloads them when it runs, which doesn't work here. Needs Python 3.10 to 3.12. The first start builds the venv from the PyPI mirror.

Both are behind the same interface in `apps/server/src/ocr`. I haven't decided which is better on real shelves yet.

## Tests

```bash
pnpm typecheck
```

```bash
pnpm test
```

The Vitest tests cover counting and slicing on a generated shelf image, guessing title and author, the CSV export, and Tesseract reading text with the network off.

```bash
pnpm e2e
```

Playwright runs the whole flow in Chromium against `library_scanner_e2e` (or `E2E_DATABASE_URL` if set). It uses the Chromium that's already installed for Playwright 1.56, which is why `@playwright/test` is pinned to `~1.56.0`. Don't run `playwright install`, because browser downloads are blocked. If it can't find the browser, set `PLAYWRIGHT_BROWSERS_PATH` or `PLAYWRIGHT_CHROMIUM_PATH`.

## Known problems

- The slicer smooths over about a quarter of a spine's width, so thin gaps can disappear and dark print on a spine can look like a gap. There's an `it.fails` test in `apps/server/test/image-processing.test.ts` for this; change it to `it` once the slicer is better. Until then, recrop in the review screen.
- OCR on spines is a lot worse than Claude was, so expect to fix most books by hand.
- There's no login. Keep it on localhost, or put it behind something that has authentication.