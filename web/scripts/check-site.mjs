/**
 * Checks the built site (out/) before it ships, without a browser:
 * - every internal link, script, stylesheet, image and icon resolves to a file;
 * - every #anchor a link points at exists on its page;
 * - every page has one h1, a title, a description, a canonical link and a
 *   share image, and no two pages share a title.
 * Run after a build: `node scripts/check-site.mjs`. NEXT_PUBLIC_BASE_PATH must
 * match the build. Exits 1 on any problem.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(fileURLToPath(new URL('..', import.meta.url)), 'out');
const BASE = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/$/, '');

function pages(dir, found = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '_next' || entry.name.startsWith('.')) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) pages(path, found);
    else if (entry.name.endsWith('.html')) found.push(path);
  }
  return found;
}

/** The file a site path is served from, or null. */
function fileFor(pathname) {
  if (BASE && !(pathname === BASE || pathname.startsWith(BASE + '/'))) return null;
  let path = decodeURIComponent(pathname.slice(BASE.length) || '/');
  let file = join(OUT, path);
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  return existsSync(file) ? file : null;
}

const problems = [];
const titles = new Map();
const idsCache = new Map();
function idsOf(file) {
  if (!idsCache.has(file)) {
    const html = readFileSync(file, 'utf8');
    idsCache.set(file, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  }
  return idsCache.get(file);
}

const list = pages(OUT);
let links = 0;
for (const file of list) {
  const html = readFileSync(file, 'utf8');
  const where = relative(OUT, file).split(sep).join('/');
  const isError = where === '404.html' || where.startsWith('_not-found') || where === '404/index.html';

  const h1 = (html.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) problems.push(`${where}: ${h1} h1 elements`);
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1];
  if (!title) problems.push(`${where}: no title`);
  else if (!isError) {
    if (titles.has(title)) problems.push(`${where}: same title as ${titles.get(title)} ("${title}")`);
    else titles.set(title, where);
  }
  if (!isError) {
    if (!/<meta name="description" content="[^"]{50,}/.test(html)) problems.push(`${where}: no description (or under 50 characters)`);
    if (!/<link rel="canonical"/.test(html)) problems.push(`${where}: no canonical link`);
    if (!/<meta property="og:image" content="[^"]+\.png"/.test(html)) problems.push(`${where}: no share image`);
  }

  for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const raw = m[1].replace(/&amp;/g, '&');
    if (/^(https?:|mailto:|data:|#$)/.test(raw)) continue;
    const url = new URL(raw, `http://site${BASE}/${where.replace(/index\.html$|[^/]+\.html$/, '')}`);
    links++;
    const target = fileFor(url.pathname);
    if (!target) {
      problems.push(`${where}: broken link ${raw}`);
      continue;
    }
    if (url.hash && target.endsWith('.html') && !idsOf(target).has(decodeURIComponent(url.hash.slice(1)))) {
      problems.push(`${where}: link ${raw} points at a missing #${url.hash.slice(1)}`);
    }
  }
}

console.log(`check-site: ${list.length} pages, ${links} links and files, ${problems.length} problems`);
for (const p of problems.slice(0, 60)) console.log(`  ${p}`);
if (problems.length > 60) console.log(`  ... and ${problems.length - 60} more`);
process.exit(problems.length ? 1 : 0);
