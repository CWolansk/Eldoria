<%*
let fc_date = await tp.system.prompt("Enter fc-date:");
let fc_end = await tp.system.prompt("Enter fc-end:");
let fc_category = await tp.system.prompt("Enter fc-category:");

if (fc_date === null) {
    fc_date = "";
}
if (fc_end === null) {
    fc_end = "";
}
if (fc_category === null) {
    fc_category = "";
}

-%>
---
fc-date: <% fc_date %>
fc-end: <% fc_end %>
fc-category: <% fc_category %>
---