import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

for (const type of [['esm', 'module'], ['cjs', 'commonjs']]) {
  await fs.cp(
    fileURLToPath(new URL(`../types`, import.meta.url)),
    fileURLToPath(new URL(`../dist/${type[0]}`, import.meta.url)),
    {recursive: true}
  );
  await fs.writeFile(
    fileURLToPath(new URL(`../dist/${type[0]}/package.json`, import.meta.url)),
    JSON.stringify({type: type[1]}),
    'utf-8'
  );
}
