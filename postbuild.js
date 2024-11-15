import fs from "node:fs/promises";

for (const type of ["module", "commonjs"]) {
  await fs.cp("types", `dist/${type}`, { recursive: true });
  await fs.writeFile(`dist/${type}/package.json`, JSON.stringify({ type }), "utf-8");
}
