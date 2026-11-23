// Boots the real page (PlayerSheet.html body + PlayerSheet.js) under jsdom against a
// fetch-level fake of the API, so save, retry and refresh behaviour can be tested whole.
import { readFile } from "node:fs/promises";
import { loadSheetFixtures } from "./fixtures.mjs";

export async function bootSheetPage(options = {}) {
  const fx = await loadSheetFixtures(options);
  const html = await readFile(new URL("../../PlayerSheet.html", import.meta.url), "utf8");
  const body = html.slice(html.indexOf("<body"), html.lastIndexOf("</body>")).replace(/^<body[^>]*>/u, "");
  document.body.innerHTML = body.replace(/<script[\s\S]*?<\/script>/gu, "");
  document.body.className = "hub-page";

  const server = {
    dto: structuredClone(options.dto || fx.createDto()),
    failSaves: false,
    saves: [],
    gets: 0,
    version: 1
  };
  server.dto.lastModified = `v${server.version}`;

  const respond = (status, payload) => new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" }
  });

  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input?.url || input));
    const method = String(init.method || "GET").toUpperCase();
    if (/\/characters\/[^/]+$/u.test(url.pathname)) {
      if (method === "GET") {
        server.gets += 1;
        return respond(200, server.dto);
      }
      if (server.failSaves) {
        throw new TypeError("Failed to fetch");
      }
      const saved = JSON.parse(init.body);
      server.version += 1;
      server.dto = { ...saved, lastModified: `v${server.version}` };
      server.saves.push(saved);
      return respond(200, server.dto);
    }
    return respond(404, { error: "Not found in headless fake." });
  };

  const quiet = ["warn", "error", "info", "log"].map((name) => [name, console[name]]);
  for (const [name] of quiet) console[name] = () => {};
  const page = await import(`../../PlayerSheet.js?boot=${Date.now()}`);
  const restoreConsole = () => { for (const [name, fn] of quiet) console[name] = fn; };

  const status = () => document.querySelector("#level-editor-save-status");
  return { fx, server, page, status, restoreConsole };
}
