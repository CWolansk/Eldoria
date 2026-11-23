// Boots the real page (PlayerSheet.html body + PlayerSheet.js) under jsdom against a
// fetch-level fake of the API, so save, retry and refresh behaviour can be tested whole.
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { loadSheetFixtures } from "./fixtures.mjs";

// The fake server applies play actions with the API's own code, so the tests exercise
// the real rules. Needs `npm ci` in docs/api once.
function loadApplyDmAction() {
  try {
    return createRequire(import.meta.url)("../../../../api/src/dmDashboard.js").applyDmAction;
  } catch (error) {
    throw new Error(`Play action tests need the API's dependencies. Run "npm ci" in docs/api first. (${error.message})`);
  }
}

export async function bootSheetPage(options = {}) {
  const fx = await loadSheetFixtures(options);
  const html = await readFile(new URL("../../PlayerSheet.html", import.meta.url), "utf8");
  const body = html.slice(html.indexOf("<body"), html.lastIndexOf("</body>")).replace(/^<body[^>]*>/u, "");
  document.body.innerHTML = body.replace(/<script[\s\S]*?<\/script>/gu, "");
  document.body.className = "hub-page";

  const server = {
    dto: structuredClone(options.dto || fx.createDto()),
    failSaves: false,
    failActions: false,
    actions: [],
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
    options.onRequest?.(url.href, method);
    if (/\/dm\/characters\/[^/]+\/actions$/u.test(url.pathname) && method === "POST") {
      if (server.failActions) {
        throw new TypeError("Failed to fetch");
      }
      const action = JSON.parse(init.body);
      server.actions.push(action);
      try {
        const next = loadApplyDmAction()(server.dto, action, {});
        server.version += 1;
        server.dto = { ...next, lastModified: `v${server.version}` };
      } catch (error) {
        return respond(error.statusCode || 500, { error: error.message });
      }
      return respond(200, { character: { id: server.dto.id }, undo: null });
    }
    if (/\/characters\/[^/]+$/u.test(url.pathname)) {
      if (method === "GET") {
        if (options.failCharacterGet) {
          throw new TypeError("Failed to fetch");
        }
        if (options.characterGate) {
          await options.characterGate;
        }
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

  // Stand-in for the inline script in PlayerSheet.html (jsdom does not run page scripts here).
  window.setTab = (tabName) => { window.__eldoriaPendingTab = tabName; };
  options.beforeImport?.();

  const quiet = ["warn", "error", "info", "log"].map((name) => [name, console[name]]);
  for (const [name] of quiet) console[name] = () => {};
  const page = await import(`../../PlayerSheet.js?boot=${Date.now()}`);
  const restoreConsole = () => { for (const [name, fn] of quiet) console[name] = fn; };

  const status = () => document.querySelector("#level-editor-save-status");
  return { fx, server, page, status, restoreConsole };
}
