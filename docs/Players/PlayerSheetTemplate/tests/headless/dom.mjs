// Headless DOM for node:test. Installs a jsdom window as globals so the sheet's
// browser modules can be imported and exercised without a browser.
import { JSDOM } from "jsdom";

const GLOBAL_KEYS = [
  "window", "document", "navigator", "location", "localStorage", "sessionStorage",
  "HTMLElement", "HTMLInputElement", "HTMLSelectElement", "HTMLTextAreaElement",
  "HTMLButtonElement", "HTMLDetailsElement", "HTMLDialogElement", "HTMLImageElement",
  "Element", "Node", "NodeFilter", "DocumentFragment", "DOMParser",
  "Event", "CustomEvent", "KeyboardEvent", "MouseEvent", "InputEvent", "FocusEvent",
  "MutationObserver", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame",
  "Image", "File", "FileReader", "Blob", "FormData", "CSS"
];

export function installDom(html = "<!DOCTYPE html><html><head><title>Player Sheet | Eldoria Player Wiki</title></head><body></body></html>", options = {}) {
  const dom = new JSDOM(html, {
    url: options.url || "https://eldoria.test/Players/PlayerSheetTemplate/PlayerSheet.html?id=test-character",
    pretendToBeVisual: true
  });
  for (const key of GLOBAL_KEYS) {
    const value = dom.window[key];
    if (value === undefined) {
      continue;
    }
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value: typeof value === "function" && !value.prototype ? value.bind(dom.window) : value
    });
  }
  const dialogProto = dom.window.HTMLDialogElement?.prototype;
  if (dialogProto && typeof dialogProto.showModal !== "function") {
    dialogProto.showModal = function showModal() { this.setAttribute("open", ""); };
    dialogProto.show = dialogProto.showModal;
    dialogProto.close = function close() { this.removeAttribute("open"); this.dispatchEvent(new dom.window.Event("close")); };
  }
  if (!globalThis.CSS) {
    globalThis.CSS = { escape: (value) => String(value).replace(/[^a-zA-Z0-9_-]/gu, "\$&") };
  }
  return dom;
}

export function tick(ms = 0) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitFor(predicate, message = "condition not met", attempts = 60) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (predicate()) {
      return;
    }
    await tick();
  }
  throw new Error(message);
}

// Any fetch of a local .json file is a rule violation: catalog data is API only.
export function trapFetch() {
  const calls = [];
  globalThis.fetch = async (input) => {
    calls.push(String(input?.url || input));
    throw new Error(`Unexpected network fetch in headless test: ${String(input?.url || input)}`);
  };
  return calls;
}
