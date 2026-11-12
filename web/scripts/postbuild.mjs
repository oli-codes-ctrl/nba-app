/**
 * Makes the static export's prefetch files reachable on a plain static host.
 *
 * Next writes each route's per-segment payload as a nested path
 * (out/players/x/__next.players/$d$slug/__PAGE__.txt) but the browser asks
 * for the dotted name (out/players/x/__next.players.$d$slug.__PAGE__.txt).
 * A Node server maps one to the other; a static host cannot, so every link
 * hover would log a 404. This moves each nested file to the name requested.
 */
import { readdir, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(fileURLToPath(new URL('..', import.meta.url)), 'out');
let moved = 0;

async function flatten(routeDir, nestedDir, prefix) {
  for (const entry of await readdir(nestedDir, { withFileTypes: true })) {
    const from = join(nestedDir, entry.name);
    if (entry.isDirectory()) await flatten(routeDir, from, `${prefix}.${entry.name}`);
    else {
      await rename(from, join(routeDir, `${prefix}.${entry.name}`));
      moved++;
    }
  }
}

async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === '_next') continue;
    const path = join(dir, entry.name);
    if (entry.name.startsWith('__next.')) {
      await flatten(dir, path, entry.name);
      await rm(path, { recursive: true });
    } else {
      await walk(path);
    }
  }
}

await walk(OUT);
console.log(`postbuild: ${moved} prefetch files moved to the names the browser requests`);
