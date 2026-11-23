// "Removed X. Undo" message shown after a one-tap removal.
// The removal itself still applies and saves at once; Undo re-applies the removed
// entry to whatever the sheet looks like at that moment, so later edits are kept.

const TOAST_REGION_ID = "player-sheet-toast-region";
export const UNDO_TOAST_DURATION_MS = 8000;

let activeTimer = null;

function ensureRegion() {
    let region = document.getElementById(TOAST_REGION_ID);
    if (!region) {
        region = document.createElement("div");
        region.id = TOAST_REGION_ID;
        region.className = "player-sheet-toast-region";
        region.setAttribute("role", "status");
        region.setAttribute("aria-live", "polite");
        document.body.appendChild(region);
    }
    return region;
}

export function dismissUndoToast() {
    if (activeTimer) {
        clearTimeout(activeTimer);
        activeTimer = null;
    }
    document.getElementById(TOAST_REGION_ID)?.replaceChildren();
}

/**
 * @param {object} options
 * @param {string} options.message text such as "Removed Longsword."
 * @param {() => (void|Promise<void>)} options.onUndo called when Undo is pressed
 * @param {number} [options.duration]
 */
export function showUndoToast({ message, onUndo, duration = UNDO_TOAST_DURATION_MS } = {}) {
    if (typeof document === "undefined" || typeof onUndo !== "function") {
        return null;
    }

    dismissUndoToast();
    const region = ensureRegion();
    const toast = document.createElement("div");
    toast.className = "player-sheet-toast";

    const text = document.createElement("span");
    text.className = "player-sheet-toast__text";
    text.textContent = message || "Removed.";

    const undo = document.createElement("button");
    undo.type = "button";
    undo.className = "player-sheet-toast__undo";
    undo.textContent = "Undo";
    undo.dataset.undo = "true";
    undo.addEventListener("click", async () => {
        undo.disabled = true;
        try {
            await onUndo();
            dismissUndoToast();
        } catch (error) {
            console.error("Undo failed:", error);
            text.textContent = "Undo failed. Try again.";
            undo.disabled = false;
        }
    });

    toast.append(text, undo);
    region.replaceChildren(toast);
    if (duration > 0) {
        activeTimer = setTimeout(dismissUndoToast, duration);
        activeTimer?.unref?.();
    }
    return toast;
}

/** The sheet as it is now (other edits may have landed since the removal). */
export function getLatestDto(context, fallbackDto) {
    const latest = typeof context?.getDto === "function" ? context.getDto() : null;
    return latest || fallbackDto;
}

/** Put a removed entry back at its old position, or at the end if the list got shorter. */
export function reinsertAt(list, index, entry) {
    const next = Array.isArray(list) ? [...list] : [];
    const position = Math.max(0, Math.min(Number.isInteger(index) ? index : next.length, next.length));
    next.splice(position, 0, entry);
    return next;
}
