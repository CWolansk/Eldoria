// Package the exact compiler used by the browser, including its import closure.
// No runtime downloads or independently maintained backend copy of sheet rules.
const fs = require("node:fs");
const path = require("node:path");
const docsRoot = path.resolve(__dirname, "../..");
function stageSheetRuntime(destination) {
  const visited = new Set();
  function copy(relative) {
    const file = path.resolve(docsRoot, relative);
    if (!file.startsWith(docsRoot + path.sep)) throw new Error(`Import escapes docs: ${relative}`);
    if (visited.has(file)) return;
    visited.add(file);
    const source = fs.readFileSync(file, "utf8");
    const target = path.join(destination, path.relative(docsRoot, file));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, source);
    for (const match of source.matchAll(/(?:from\s*|import\s*)["'](\.[^"']+)["']/gu)) {
      copy(path.relative(docsRoot, path.resolve(path.dirname(file), match[1])));
    }
  }
  copy("Players/PlayerSheetTemplate/SheetCompiler.js");
  fs.writeFileSync(path.join(destination, "package.json"), '{"private":true,"type":"module"}\n');
  return visited.size;
}
if (require.main === module) {
  if (!process.argv[2]) throw new Error("Pass the runtime destination directory.");
  console.log(`Staged ${stageSheetRuntime(path.resolve(process.argv[2]))} sheet modules.`);
}
module.exports = { stageSheetRuntime };
