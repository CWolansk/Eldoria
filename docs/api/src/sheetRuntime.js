const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
let compiler;
function getSheetCompiler() {
  const deployed = path.join(__dirname, "sheet-runtime/Players/PlayerSheetTemplate/SheetCompiler.js");
  const source = fs.existsSync(deployed) ? deployed : path.resolve(__dirname, "../../Players/PlayerSheetTemplate/SheetCompiler.js");
  compiler ||= import(pathToFileURL(source).href);
  return compiler;
}
module.exports = { getSheetCompiler };
