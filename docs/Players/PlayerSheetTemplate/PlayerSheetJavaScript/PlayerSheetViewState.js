// Keep the reader's place when the sheet redraws.
// A redraw (after an edit, or when the DM changes something) rebuilds the open tab.
// Sections the reader had opened are opened again and the page stays where it was.

function describeDetails(details) {
    const summary = (details.querySelector("summary")?.textContent || "").trim();
    const row = details.closest(".player-sheet-item-row, .player-sheet-item-card, .player-sheet-feature-card, [data-gear-group]");
    const owner = (row?.querySelector(".player-sheet-item-row__title, .player-sheet-item-card__title, .player-sheet-info-card__title, h4")?.textContent || "").trim();
    return `${summary}|${owner}`;
}

function eachDetails(container, visit) {
    const counts = new Map();
    container.querySelectorAll("details").forEach((details) => {
        const label = describeDetails(details);
        const index = counts.get(label) || 0;
        counts.set(label, index + 1);
        visit(details, `${label}#${index}`);
    });
}

export function captureViewState(container, view = typeof window !== "undefined" ? window : null) {
    if (!container) {
        return null;
    }

    const open = new Set();
    eachDetails(container, (details, key) => {
        if (details.open) {
            open.add(key);
        }
    });
    return { open, scrollX: view?.scrollX || 0, scrollY: view?.scrollY || 0 };
}

export function restoreViewState(container, state, view = typeof window !== "undefined" ? window : null) {
    if (!container || !state) {
        return;
    }

    eachDetails(container, (details, key) => {
        if (state.open.has(key)) {
            details.open = true;
        }
    });

    if ((state.scrollY || state.scrollX) && typeof view?.scrollTo === "function") {
        try {
            view.scrollTo(state.scrollX, state.scrollY);
        } catch (_error) {
            // Not available everywhere; losing the scroll position is harmless.
        }
    }
}
