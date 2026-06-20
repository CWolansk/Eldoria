import { PlayerSheetDtoHelper } from "../PlayerSheetDtoHelper.js";
import { createElement } from "../PlayerSheetHtmlHelper.js";
import {
    createSection,
    createTabShell
} from "./PlayerSheetTabHelpers.js";

const ALLOWED_NOTE_TAGS = new Set([
    "a",
    "b",
    "blockquote",
    "br",
    "div",
    "em",
    "i",
    "li",
    "ol",
    "p",
    "s",
    "strong",
    "u",
    "ul"
]);

const DROPPED_NOTE_TAGS = new Set([
    "embed",
    "iframe",
    "link",
    "meta",
    "object",
    "script",
    "style"
]);

const NOTE_FORMAT_ACTIONS = [
    { command: "bold", label: "B", title: "Bold" },
    { command: "italic", label: "I", title: "Italic" },
    { command: "underline", label: "U", title: "Underline" },
    { command: "insertUnorderedList", label: "•", title: "Bulleted list" },
    { command: "insertOrderedList", label: "1.", title: "Numbered list" },
    { command: "removeFormat", label: "Tx", title: "Clear formatting" }
];

function getElementTagName(node) {
    return String(node?.tagName || "").toLowerCase();
}

function isAllowedHref(value) {
    const href = String(value || "").trim();
    return /^(?:https?:|mailto:|#|\/)/iu.test(href);
}

function sanitizeNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
        return document.createTextNode(node.textContent || "");
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
        return document.createDocumentFragment();
    }

    const tagName = getElementTagName(node);
    if (DROPPED_NOTE_TAGS.has(tagName)) {
        return document.createDocumentFragment();
    }

    if (!ALLOWED_NOTE_TAGS.has(tagName)) {
        const fragment = document.createDocumentFragment();
        for (const child of Array.from(node.childNodes)) {
            fragment.appendChild(sanitizeNode(child));
        }
        return fragment;
    }

    const clean = document.createElement(tagName);
    if (tagName === "a" && isAllowedHref(node.getAttribute("href"))) {
        clean.setAttribute("href", node.getAttribute("href"));
        clean.setAttribute("target", "_blank");
        clean.setAttribute("rel", "noopener noreferrer");
    }

    for (const child of Array.from(node.childNodes)) {
        clean.appendChild(sanitizeNode(child));
    }

    return clean;
}

function normalizeEmptyHtml(html) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    return wrapper.textContent.trim() ? html.trim() : "";
}

export function sanitizeNotesHtml(html) {
    const template = document.createElement("template");
    template.innerHTML = String(html || "");
    const container = document.createElement("div");

    for (const child of Array.from(template.content.childNodes)) {
        container.appendChild(sanitizeNode(child));
    }

    return normalizeEmptyHtml(container.innerHTML);
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/gu, "&amp;")
        .replace(/</gu, "&lt;")
        .replace(/>/gu, "&gt;")
        .replace(/"/gu, "&quot;")
        .replace(/'/gu, "&#39;");
}

function plainTextToHtml(value) {
    const text = String(value || "").trim();
    if (!text) {
        return "";
    }

    return text
        .split(/\n{2,}/u)
        .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/gu, "<br>")}</p>`)
        .join("");
}

function getInitialNotesHtml(notes = {}) {
    const richText = String(notes.richText || notes.html || "").trim();
    if (richText) {
        return sanitizeNotesHtml(richText);
    }

    return plainTextToHtml(notes.freeform);
}

function getPlainTextFromEditor(editor) {
    return String(editor?.innerText || editor?.textContent || "")
        .replace(/\u00a0/gu, " ")
        .replace(/[ \t]+\n/gu, "\n")
        .replace(/\n{3,}/gu, "\n\n")
        .trim();
}

function createToolbarButton(action, editor, markDirty) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "player-sheet-button player-sheet-button--small player-sheet-notes__toolbar-button";
    button.textContent = action.label;
    button.title = action.title;
    button.setAttribute("aria-label", action.title);
    button.dataset.notesCommand = action.command;
    button.addEventListener("click", () => {
        editor.focus();
        document.execCommand(action.command, false, action.value || null);
        markDirty();
    });
    return button;
}

export function BuildPlayerSheetNotesTab(playerSheetObject, context = {}) {
    const shell = createTabShell("Notes");
    const section = createSection("Player Notes");
    section.classList.add("player-sheet-notes");

    const toolbar = createElement("div", "player-sheet-notes__toolbar");
    const editor = createElement("div", "player-sheet-notes__editor");
    editor.contentEditable = typeof context.onChange === "function" ? "true" : "false";
    editor.setAttribute("role", "textbox");
    editor.setAttribute("aria-label", "Player notes");
    editor.setAttribute("aria-multiline", "true");
    editor.spellcheck = true;
    editor.innerHTML = getInitialNotesHtml(context.dto?.notes || playerSheetObject?.notes);

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className = "player-sheet-button player-sheet-button--primary player-sheet-notes__save";
    saveButton.textContent = "Save Notes";
    saveButton.disabled = typeof context.onChange !== "function";

    const status = createElement("span", "player-sheet-notes__status", saveButton.disabled ? "Read only" : "Saved");
    status.setAttribute("aria-live", "polite");

    function markDirty() {
        if (saveButton.disabled) {
            return;
        }
        saveButton.dataset.dirty = "true";
        status.textContent = "Unsaved changes";
    }

    for (const action of NOTE_FORMAT_ACTIONS) {
        toolbar.appendChild(createToolbarButton(action, editor, markDirty));
    }

    editor.addEventListener("input", markDirty);
    editor.addEventListener("paste", (event) => {
        event.preventDefault();
        const text = event.clipboardData?.getData("text/plain") || "";
        document.execCommand("insertText", false, text);
        markDirty();
    });

    saveButton.addEventListener("click", async () => {
        if (typeof context.onChange !== "function") {
            return;
        }

        saveButton.disabled = true;
        status.textContent = "Saving";
        const richText = sanitizeNotesHtml(editor.innerHTML);
        editor.innerHTML = richText;
        const notes = {
            ...(PlayerSheetDtoHelper.getValue(context.dto, "notes", {}) || {}),
            freeform: getPlainTextFromEditor(editor),
            richText
        };
        const nextDto = PlayerSheetDtoHelper.patch(context.dto, "notes", notes);
        await context.onChange(nextDto);
        status.textContent = "Saved";
        saveButton.disabled = false;
        delete saveButton.dataset.dirty;
    });

    const actions = createElement("div", "player-sheet-notes__actions");
    actions.appendChild(saveButton);
    actions.appendChild(status);

    section.appendChild(toolbar);
    section.appendChild(editor);
    section.appendChild(actions);
    shell.appendChild(section);
}
