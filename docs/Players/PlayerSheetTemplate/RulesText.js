// One place that turns catalog rules data into text a player can read.
// Pure functions, no DOM and no network, so the compiler and tests can use them.

// Keys that describe how an entry is built, not what it says.
const STRUCTURAL_KEYS = new Set([
    "type", "style", "source", "page", "id", "data", "colStyles", "rowStyles",
    "srd", "srd52", "basicRules", "basicRules2024", "otherSources", "kind", "hash"
]);

const TEXT_KEYS = ["entries", "entry", "items", "rows", "text", "caption", "colLabels"];

/** Remove {@tag text|source} markup, keeping the readable text. */
export function cleanRulesText(value) {
    return String(value ?? "")
        .replace(/[{]@[^}]+[}]/gu, (match) => {
            const content = match.slice(2, -1);
            const withoutTag = content.replace(/^[a-zA-Z]+ ?/u, "");
            return withoutTag.split("|")[0].trim();
        })
        .replace(/\s+/gu, " ")
        .trim();
}

function stripHtml(value) {
    return String(value ?? "").replace(/<[^>]*>/gu, " ");
}

/**
 * Join every piece of text inside a rules value.
 * @param {*} value
 * @param {object} [options]
 * @param {boolean} [options.display] true for text shown to a player: structural keys
 *   such as "type" are left out and entry names read as "Name." In search mode
 *   (the default) every value is kept so matching behaves as before.
 * @param {string[]} [options.privateKeys] keys starting with "_" that should be kept
 * @param {number} [options.maxDepth]
 */
export function flattenRulesText(value, options = {}, depth = 0) {
    const maxDepth = options.maxDepth ?? 5;
    if (value == null || depth > maxDepth) {
        return "";
    }

    if (typeof value === "string" || typeof value === "number") {
        return stripHtml(value);
    }

    if (typeof value === "boolean") {
        return options.display ? "" : String(value);
    }

    if (Array.isArray(value)) {
        return value.map((entry) => flattenRulesText(entry, options, depth + 1)).filter(Boolean).join(" ");
    }

    if (typeof value === "object") {
        const privateKeys = options.privateKeys || [];
        const parts = [];
        for (const [key, entry] of Object.entries(value)) {
            if (key.startsWith("_") && !privateKeys.includes(key)) {
                continue;
            }
            if (options.display && STRUCTURAL_KEYS.has(key)) {
                continue;
            }
            let text = flattenRulesText(entry, options, depth + 1);
            if (!text) {
                continue;
            }
            if (options.display && key === "name" && TEXT_KEYS.some((textKey) => value[textKey] != null)) {
                text = /[.:!?]$/u.test(text.trim()) ? text.trim() : `${text.trim()}.`;
            }
            parts.push(text);
        }
        return parts.join(" ");
    }

    return "";
}

/** Readable text for any rules value: flattened for display, then cleaned of markup. */
export function toDisplayRulesText(value, options = {}) {
    return cleanRulesText(flattenRulesText(value, { ...options, display: true }));
}

/** "Attunement: true" should read as words. */
export function formatAttunementText(value) {
    if (value == null || value === false || value === "") {
        return "";
    }
    if (value === true || String(value).trim().toLowerCase() === "true") {
        return "Required";
    }
    const text = cleanRulesText(value);
    if (!text) {
        return "";
    }
    return /^(?:by|if|while)\b/iu.test(text) ? `Required ${text}` : text;
}

const SOURCE_LABELS = {
    basechoices: "Starting choices",
    "base-choices": "Starting choices",
    levels: "Level choices",
    feats: "Feat",
    race: "Race",
    background: "Background",
    class: "Class"
};

/** Internal source keys such as "baseChoices" become labels a player recognises. */
export function formatSourceLabel(value, fallback = "") {
    const text = String(value ?? "").trim();
    if (!text) {
        return fallback;
    }
    return SOURCE_LABELS[text.toLowerCase()] || text;
}

/** True when a spell's dice restore hit points instead of dealing damage. */
export function isHealingSpell(record = {}) {
    const raw = record?.raw || {};
    const damageTypes = [record.damageInflict, raw.damageInflict].flat().filter(Boolean);
    if (damageTypes.length) {
        return false;
    }
    const miscTags = [record.miscTags, raw.miscTags].flat().filter(Boolean).map((tag) => String(tag).toUpperCase());
    if (miscTags.includes("HL")) {
        return true;
    }
    const text = flattenRulesText([record.entries, raw.entries]).toLowerCase();
    return /\bregains?\b[^.]{0,80}\bhit points?\b/u.test(text)
        || /\brestores?\b[^.]{0,80}\bhit points?\b/u.test(text);
}
