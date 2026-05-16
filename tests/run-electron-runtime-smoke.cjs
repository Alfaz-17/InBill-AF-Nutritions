const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const electronBin = require('electron');

const result = spawnSync(electronBin, [path.join('tests', 'electron-runtime-smoke.cjs')], {
  cwd: root,
  env: process.env,
  stdio: 'inherit',
  shell: false,
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
