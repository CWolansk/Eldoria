---
<%*
let date = await tp.system.prompt("Enter start date (YYYY-MM-DD):");
let linkedNotes = await tp.system.prompt("Enter linked notes (separate by comma):");
let description = await tp.system.prompt("Enter a brief description:");

linkedNotes = linkedNotes.split(",").map(note => note.trim()).filter(note => note !== "").map(note => `[[${note}]]`).join(" ");

-%>
fc-date: <% date %>
fc-end: 
fc-category: Consequences
---
<% description %>

Consequences of the results of <% linkedNotes %>
