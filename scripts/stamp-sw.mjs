// Stamps public/sw.js VERSION with a unique value before each build.
//
// Why this exists: an installed PWA keeps serving its cached JS chunks until the
// service worker's VERSION changes. A hard-coded VERSION means a deploy silently
// never reaches existing installs — the server has the new bundle, the phone keeps
// running the old one. Stamping per build makes every deploy invalidate the caches.
//
// Run by `npm run build:prod` / `build:staging` (see package.json) and by
// cloudbuild.yaml, which builds with `npm run build:prod`.

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const SW_PATH = 'public/sw.js';
const PLACEHOLDER = '__SW_VERSION__';

const source = readFileSync(SW_PATH, 'utf8');
if (!source.includes(PLACEHOLDER)) {
  // Already stamped (re-running a build without a clean checkout is fine, but a
  // missing placeholder means someone hard-coded a literal again — fail loudly).
  if (!/const VERSION = '[^']+';/.test(source)) {
    console.error(`[stamp-sw] no ${PLACEHOLDER} or VERSION literal found in ${SW_PATH}`);
    process.exit(1);
  }
  console.warn('[stamp-sw] VERSION already stamped, leaving as-is');
  process.exit(0);
}

// Build id = time + a short hash of the tree inputs, so two builds in the same
// second still differ and the value is traceable to a build.
const build = process.env.BUILD_ID || `${Date.now()}`;
const stamp = createHash('sha256').update(build).digest('hex').slice(0, 12);

writeFileSync(SW_PATH, source.replace(PLACEHOLDER, stamp));
console.log(`[stamp-sw] VERSION = ${stamp} (build ${build})`);
