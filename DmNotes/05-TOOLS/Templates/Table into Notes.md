<%*
var fileContents = await tp.system.clipboard();
var tableRows = fileContents.match(/\|(.*)\|/gm).map(e => e.slice(1,-1)); 
var headerRow = tableRows.splice(0, 1)[0].split(/\|/g).map(e => e.replace(/\|/g, "").trim());
headerRow.shift();
tableRows.splice(0, 1)
let promiseCalls = [];

for(let i = 0; i<tableRows.length; i++ ) {
    elems = tableRows[i].split(/\|/g).map(e => e.replace(/\|/g, "").trim()); 
    nameFile_i = elems.shift();
    let contentFile_i = elems.map((e, index) => headerRow[index] + " :: " + e).join("\n");
    promiseCalls.push(tp.file.create_new(contentFile_i, nameFile_i))
}
const createdFiles = await Promise.all(promiseCalls);
return createdFiles.map(e => "[[" + e.basename + "]]").join("\n");
%>