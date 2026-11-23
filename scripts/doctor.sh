#!/usr/bin/env bash
# Checks that this machine can install, run and test the app offline.
# Read-only: it only reports what it finds. Run: pnpm doctor
set -u

ok=0; warn=0; fail=0
pass()  { printf '  \033[32m✓\033[0m %s\n' "$1"; ok=$((ok+1)); }
note()  { printf '  \033[33m!\033[0m %s\n' "$1"; warn=$((warn+1)); }
bad()   { printf '  \033[31m✗\033[0m %s\n' "$1"; fail=$((fail+1)); }

cd "$(dirname "$0")/.."

echo "Tools"
if command -v node >/dev/null; then
  v=$(node -v); major=${v#v}; major=${major%%.*}
  [ "$major" -ge 22 ] && pass "node $v" || bad "node $v (need >= 22.21)"
else bad "node not found"; fi

if command -v pnpm >/dev/null; then
  v=$(pnpm -v)
  pass "pnpm $v"
  minor=$(echo "$v" | cut -d. -f2)
  [ "${v%%.*}" -gt 10 ] || [ "$minor" -ge 16 ] || bad "pnpm $v is too old for minimumReleaseAge (need >= 10.16)"
  pass "npm registry: $(pnpm config get registry)"
else bad "pnpm not found"; fi

if command -v uv >/dev/null; then pass "uv $(uv --version | cut -d' ' -f2) (only needed for OCR_ENGINE=rapidocr)"
else note "uv not found (only needed for OCR_ENGINE=rapidocr)"; fi
py=$(command -v python3.12 || command -v python3.11 || command -v python3.10 || true)
[ -n "$py" ] && pass "python for RapidOCR: $py" || note "no Python 3.10–3.12 found (RapidOCR wheels stop at 3.12)"

echo "Dependencies"
if [ -d node_modules ]; then
  pass "node_modules present"
  if (cd apps/server && node -e "import('sharp').then(()=>process.exit(0),()=>process.exit(1))" 2>/dev/null); then
    pass "sharp loads its prebuilt libvips"
  else bad "sharp does not load (is @img/sharp-linux-x64 in the mirror?)"; fi
  if [ -f node_modules/.pnpm/node_modules/@tesseract.js-data/eng/4.0.0/eng.traineddata.gz ] || \
     ls node_modules/.pnpm/@tesseract.js-data+eng*/node_modules/@tesseract.js-data/eng/4.0.0/eng.traineddata.gz >/dev/null 2>&1; then
    pass "Tesseract English model installed from npm"
  else bad "Tesseract English model missing (@tesseract.js-data/eng)"; fi
else
  note "node_modules missing: run pnpm install"
fi
[ -f pnpm-lock.yaml ] && pass "pnpm-lock.yaml present" || note "no pnpm-lock.yaml yet: the first pnpm install creates it; commit it"

echo "Playwright"
if [ -x node_modules/.bin/playwright ]; then
  pass "@playwright/test $(node_modules/.bin/playwright --version | awk '{print $2}')"
  if [ -n "${PLAYWRIGHT_CHROMIUM_PATH:-}" ]; then
    [ -x "$PLAYWRIGHT_CHROMIUM_PATH" ] && pass "PLAYWRIGHT_CHROMIUM_PATH=$PLAYWRIGHT_CHROMIUM_PATH" || bad "PLAYWRIGHT_CHROMIUM_PATH is not executable"
  else
    dir=${PLAYWRIGHT_BROWSERS_PATH:-$HOME/.cache/ms-playwright}
    found=$(ls -d "$dir"/chromium-* 2>/dev/null | tr '\n' ' ')
    [ -n "$found" ] && pass "browsers in $dir: $found" || bad "no Chromium in $dir (set PLAYWRIGHT_BROWSERS_PATH or PLAYWRIGHT_CHROMIUM_PATH; don't run playwright install)"
  fi
else note "Playwright not installed yet"; fi

echo "PostgreSQL"
if command -v pg_lsclusters >/dev/null; then
  pg_lsclusters | sed 's/^/    /'
  pg_lsclusters | grep -q ' online ' && pass "a cluster is running" || note "no cluster running: sudo pg_ctlcluster 16 main start"
else note "pg_lsclusters not found (not Debian/Ubuntu packaging?)"; fi
if command -v psql >/dev/null; then
  url=$(grep -E '^DATABASE_URL=' .env 2>/dev/null | cut -d= -f2-)
  url=${DATABASE_URL:-${url:-postgres://scanner:scanner@127.0.0.1:5432/library_scanner}}
  if psql "$url" -Atc 'select 1' >/dev/null 2>&1; then pass "can connect to $url"
  else note "cannot connect to $url yet (see README: database setup)"; fi
fi

echo
echo "$ok ok, $warn warnings, $fail problems"
[ "$fail" -eq 0 ]
