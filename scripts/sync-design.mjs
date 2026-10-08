// Copies the shared design system (./design) into each app, so both apps
// look like the same product. Run from GreenRide-frontend-mobile:
//   node scripts/sync-design.mjs          copy
//   node scripts/sync-design.mjs --check  fail if an app's copy is out of date
import { cpSync, existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const source = join(root, 'design');
const apps = ['rider-app', 'driver-app'];
const check = process.argv.includes('--check');
let stale = false;

for (const app of apps) {
  const target = join(root, app, 'design');
  if (check) {
    for (const file of readdirSync(source)) {
      const copy = join(target, file);
      if (!existsSync(copy) || readFileSync(copy, 'utf8') !== readFileSync(join(source, file), 'utf8')) {
        console.error(`${app}/design/${file} is out of date`);
        stale = true;
      }
    }
    continue;
  }
  rmSync(target, { recursive: true, force: true });
  cpSync(source, target, { recursive: true });
  console.log(`design → ${app}/design`);
}
if (stale) process.exit(1);
