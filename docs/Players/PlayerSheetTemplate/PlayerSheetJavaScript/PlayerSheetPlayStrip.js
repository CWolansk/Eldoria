// The play strip: what a player changes during a session, first on the sheet.
// Hit points, temporary hit points, death saves, conditions, exhaustion,
// concentration and inspiration.
//
// Hit points, conditions and the like are sent as small actions ("take 7 damage")
// through options.onPlayAction, the same route the DM screen uses, so a player's
// tap and a DM's change made at the same moment both land. Nothing here saves the
// whole sheet except inspiration, which only the player ever changes.

import { CONDITION_NAMES } from "../ConditionRules.js";

const STRIP_ID = "player-sheet-play-strip";
const MAX_AMOUNT = 9999;

function el(tag, className = "", text = "") {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== "") node.textContent = text;
    return node;
}

function button(label, className, onClick, attrs = {}) {
    const node = el("button", `player-sheet-play__button ${className}`.trim(), label);
    node.type = "button";
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    node.addEventListener("click", onClick);
    return node;
}

function numberInput(id, label, placeholder = "") {
    const input = el("input", "player-sheet-play__amount");
    input.id = id;
    input.type = "number";
    input.min = "1";
    input.max = String(MAX_AMOUNT);
    input.step = "1";
    input.inputMode = "numeric";
    input.placeholder = placeholder;
    input.setAttribute("aria-label", label);
    return input;
}

function readAmount(input) {
    const amount = Math.floor(Number(input.value));
    return Number.isFinite(amount) && amount >= 1 && amount <= MAX_AMOUNT ? amount : 0;
}

function list(values) {
    return Array.isArray(values) ? values.map((value) => String(value || "").trim()).filter(Boolean) : [];
}

export function getPlayState(sheet = {}) {
    const hp = sheet.hp || {};
    return {
        hpCurrent: Math.max(0, Number(hp.current) || 0),
        hpMax: Math.max(0, Number(hp.max) || 0),
        hpComplete: hp.complete !== false && (Number(hp.max) || 0) > 0,
        hpTemp: Math.max(0, Number(hp.temp) || 0),
        deathSuccesses: Math.min(3, Math.max(0, Number(sheet.deathSaves?.successes) || 0)),
        deathFailures: Math.min(3, Math.max(0, Number(sheet.deathSaves?.failures) || 0)),
        conditions: list(sheet.notes?.conditions),
        exhaustion: Math.min(6, Math.max(0, Number(sheet.notes?.exhaustion) || 0)),
        concentration: String(sheet.concentration || "").trim(),
        inspiration: sheet.identity?.inspiration === true
    };
}

/**
 * @param {object} sheet compiled sheet
 * @param {object} options
 * @param {(action: object) => Promise<void>} [options.onPlayAction] sends one action; when
 *   absent the strip is read-only.
 * @param {(value: boolean) => Promise<void>} [options.onInspirationChange]
 */
export function BuildPlayerSheetPlayStrip(sheet, options = {}) {
    const container = document.querySelector("#GlobalCharacterSheetInformationHeader .CharacterHeaderContainer");
    if (!container) {
        return null;
    }

    const state = getPlayState(sheet);
    const canAct = typeof options.onPlayAction === "function";
    const previous = document.getElementById(STRIP_ID);
    const openForm = previous?.dataset.openForm || "";
    const strip = el("section", "player-sheet-play");
    strip.id = STRIP_ID;
    strip.setAttribute("aria-label", "Play: hit points and conditions");
    if (openForm) strip.dataset.openForm = openForm;

    const message = el("p", "player-sheet-play__message");
    message.setAttribute("role", "status");
    message.setAttribute("aria-live", "polite");
    message.hidden = true;

    async function send(action, control) {
        if (!canAct) return;
        const controls = [...strip.querySelectorAll("button, input, select")];
        controls.forEach((node) => { node.disabled = true; });
        message.hidden = true;
        try {
            await options.onPlayAction(action);
        } catch (error) {
            controls.forEach((node) => { node.disabled = false; });
            message.textContent = error?.userMessage || "That did not go through. Check your connection and try again.";
            message.hidden = false;
            control?.focus?.();
        }
    }

    // ---- hit points ----
    const hp = el("div", "player-sheet-play__hp");
    const hpValue = el("div", "player-sheet-play__hp-value");
    hpValue.dataset.playHp = "true";
    const current = el("strong", "player-sheet-play__hp-current", String(state.hpCurrent));
    hpValue.append(
        el("span", "player-sheet-play__label", "HP"),
        current,
        el("span", "player-sheet-play__hp-max", state.hpComplete ? ` / ${state.hpMax}` : " / ?")
    );
    if (state.hpTemp > 0) {
        const temp = el("span", "player-sheet-play__hp-temp", `+${state.hpTemp} temp`);
        temp.dataset.playTemp = "true";
        hpValue.appendChild(temp);
    }
    hp.appendChild(hpValue);

    if (canAct) {
        const amount = numberInput("player-sheet-play-amount", "Amount of damage, healing or temporary hit points", "Amount");
        const act = (type, label) => button(label, `player-sheet-play__button--${type}`, () => {
            const value = readAmount(amount);
            if (!value) {
                message.textContent = "Enter an amount first.";
                message.hidden = false;
                amount.focus();
                return;
            }
            void send({ type, amount: value }, amount);
        }, { "data-play-action": type });
        const controls = el("div", "player-sheet-play__hp-controls");
        controls.append(amount, act("damage", "Damage"));
        if (state.hpComplete) controls.appendChild(act("heal", "Heal"));
        controls.appendChild(act("temp-hp", "Set temp"));
        amount.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                controls.querySelector("[data-play-action='damage']").click();
            }
        });
        hp.appendChild(controls);
    }
    strip.appendChild(hp);

    // ---- maximum hit points not set (item 15) ----
    if (!state.hpComplete) {
        const setup = el("div", "player-sheet-play__setup");
        setup.dataset.playSetup = "true";
        setup.appendChild(el("p", "player-sheet-play__setup-text", "Maximum hit points are not set yet, so healing is off."));
        if (canAct) {
            const maxInput = numberInput("player-sheet-play-max-hp", "Maximum hit points", "Max HP");
            const form = el("div", "player-sheet-play__setup-form");
            form.hidden = openForm !== "max-hp";
            form.append(
                maxInput,
                button("Save max HP", "player-sheet-play__button--primary", () => {
                    const value = readAmount(maxInput);
                    if (!value) {
                        message.textContent = "Enter your maximum hit points first.";
                        message.hidden = false;
                        maxInput.focus();
                        return;
                    }
                    delete strip.dataset.openForm;
                    void send({ type: "set-max-hp", value }, maxInput);
                }, { "data-play-action": "set-max-hp" }),
                el("p", "player-sheet-play__hint", "Enter your full maximum: every level's hit points with your Constitution bonus and extras such as Tough already added in.")
            );
            setup.append(
                button("Set up HP", "player-sheet-play__button--primary", () => {
                    form.hidden = !form.hidden;
                    if (form.hidden) delete strip.dataset.openForm;
                    else {
                        strip.dataset.openForm = "max-hp";
                        maxInput.focus();
                    }
                }, { "data-play-setup-open": "true" }),
                form
            );
        }
        strip.appendChild(setup);
    }

    // ---- death saves, only while at 0 hit points ----
    if (state.hpCurrent === 0 && (state.hpComplete || state.deathSuccesses || state.deathFailures)) {
        const death = el("div", "player-sheet-play__death");
        death.dataset.playDeath = "true";
        const row = (label, key, filled, other) => {
            const group = el("div", "player-sheet-play__pips");
            group.setAttribute("role", "group");
            group.setAttribute("aria-label", `${label}: ${filled} of 3`);
            group.appendChild(el("span", "player-sheet-play__label", label));
            for (let index = 1; index <= 3; index += 1) {
                const on = index <= filled;
                const next = on && index === filled ? index - 1 : index;
                const pip = button("", `player-sheet-play__pip${on ? " player-sheet-play__pip--on" : ""}`, () => {
                    void send({
                        type: "set-death-saves",
                        successes: key === "successes" ? next : other,
                        failures: key === "failures" ? next : other
                    });
                }, {
                    "aria-label": `${label} ${index}${on ? " (marked)" : ""}`,
                    "aria-pressed": on ? "true" : "false",
                    "data-play-death": `${key}:${index}`
                });
                pip.disabled = !canAct;
                group.appendChild(pip);
            }
            return group;
        };
        death.append(
            row("Death saves", "successes", state.deathSuccesses, state.deathFailures),
            row("Failures", "failures", state.deathFailures, state.deathSuccesses)
        );
        strip.appendChild(death);
    }

    // ---- conditions and exhaustion ----
    const status = el("div", "player-sheet-play__status");
    const conditions = el("div", "player-sheet-play__conditions");
    conditions.appendChild(el("span", "player-sheet-play__label", "Conditions"));
    if (!state.conditions.length) {
        conditions.appendChild(el("span", "player-sheet-play__none", "none"));
    }
    for (const condition of state.conditions) {
        const chip = el("span", "player-sheet-play__chip", condition);
        if (canAct) {
            chip.appendChild(button("×", "player-sheet-play__chip-remove", () => {
                void send({ type: "remove-condition", condition });
            }, { "aria-label": `Remove ${condition}`, "data-play-remove-condition": condition }));
        }
        conditions.appendChild(chip);
    }
    if (canAct) {
        const select = el("select", "player-sheet-play__select");
        select.id = "player-sheet-play-condition";
        select.setAttribute("aria-label", "Add a condition");
        const first = el("option", "", "Add condition…");
        first.value = "";
        select.appendChild(first);
        const active = new Set(state.conditions.map((name) => name.toLowerCase()));
        for (const name of CONDITION_NAMES) {
            if (active.has(name.toLowerCase())) continue;
            const option = el("option", "", name);
            option.value = name;
            select.appendChild(option);
        }
        select.addEventListener("change", () => {
            if (select.value) void send({ type: "add-condition", condition: select.value }, select);
        });
        conditions.appendChild(select);
    }
    status.appendChild(conditions);

    const exhaustion = el("div", "player-sheet-play__exhaustion");
    exhaustion.setAttribute("role", "group");
    exhaustion.setAttribute("aria-label", `Exhaustion ${state.exhaustion} of 6`);
    exhaustion.appendChild(el("span", "player-sheet-play__label", "Exhaustion"));
    if (canAct) {
        const down = button("−", "player-sheet-play__step", () => {
            void send({ type: "set-exhaustion", value: state.exhaustion - 1 });
        }, { "aria-label": "One less exhaustion", "data-play-exhaustion": "-1" });
        down.disabled = state.exhaustion <= 0;
        exhaustion.appendChild(down);
    }
    const exhaustionValue = el("strong", "player-sheet-play__exhaustion-value", String(state.exhaustion));
    exhaustionValue.dataset.playExhaustionValue = "true";
    exhaustion.appendChild(exhaustionValue);
    if (canAct) {
        const up = button("+", "player-sheet-play__step", () => {
            void send({ type: "set-exhaustion", value: state.exhaustion + 1 });
        }, { "aria-label": "One more exhaustion", "data-play-exhaustion": "1" });
        up.disabled = state.exhaustion >= 6;
        exhaustion.appendChild(up);
    }
    status.appendChild(exhaustion);
    strip.appendChild(status);

    // ---- concentration and inspiration ----
    const focus = el("div", "player-sheet-play__focus");
    const concentration = el("div", "player-sheet-play__concentration");
    concentration.appendChild(el("span", "player-sheet-play__label", "Concentrating on"));
    if (state.concentration) {
        const chip = el("span", "player-sheet-play__chip", state.concentration);
        chip.dataset.playConcentration = "true";
        if (canAct) {
            chip.appendChild(button("×", "player-sheet-play__chip-remove", () => {
                void send({ type: "set-concentration", value: "" });
            }, { "aria-label": `Stop concentrating on ${state.concentration}`, "data-play-concentration-clear": "true" }));
        }
        concentration.appendChild(chip);
    } else if (canAct) {
        const input = el("input", "player-sheet-play__text");
        input.id = "player-sheet-play-concentration";
        input.type = "text";
        input.maxLength = 120;
        input.placeholder = "nothing";
        input.setAttribute("aria-label", "Spell or effect you are concentrating on");
        const set = button("Set", "", () => {
            const value = input.value.trim();
            if (value) void send({ type: "set-concentration", value }, input);
        }, { "data-play-concentration-set": "true" });
        input.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                set.click();
            }
        });
        concentration.append(input, set);
    } else {
        concentration.appendChild(el("span", "player-sheet-play__none", "nothing"));
    }
    focus.appendChild(concentration);

    if (typeof options.onInspirationChange === "function") {
        const inspiration = button(
            state.inspiration ? "Inspiration: yes" : "Inspiration: no",
            `player-sheet-play__toggle${state.inspiration ? " player-sheet-play__toggle--on" : ""}`,
            async () => {
                inspiration.disabled = true;
                try {
                    await options.onInspirationChange(!state.inspiration);
                } catch (error) {
                    inspiration.disabled = false;
                    message.textContent = "That did not go through. Try again.";
                    message.hidden = false;
                }
            },
            { "aria-pressed": state.inspiration ? "true" : "false", "data-play-inspiration": "true" }
        );
        focus.appendChild(inspiration);
    }
    strip.appendChild(focus);
    strip.appendChild(message);

    if (previous) previous.replaceWith(strip);
    else container.prepend(strip);

    // The strip replaces these plain-text boxes; hide them so nothing is shown twice.
    if (canAct) {
        for (const selector of [".CombatHeader .HP", ".DeathSaves", ".DeathFailures", ".DefenseState .Conditions", ".DefenseState .Exhaustion"]) {
            const node = container.querySelector(selector);
            if (node) node.hidden = true;
        }
    }

    return strip;
}
