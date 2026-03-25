import { readFileSync, writeFileSync } from "fs";

const files = ["dist/index.js", "dist/index.mjs"];
const directive = '"use client";\n';

for (const file of files) {
  const content = readFileSync(file, "utf8");
  if (!content.startsWith('"use client"')) {
    writeFileSync(file, directive + content);
    console.log(`Prepended "use client" to ${file}`);
  }
}
