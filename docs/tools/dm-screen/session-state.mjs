export const emptySession = () => ({ version: 1, round: 1, started: false, activeId: "", combatants: [], notes: "", pins: [] });
export function validateSession(value) {
  if (!value || value.version !== 1 || !Array.isArray(value.combatants) || value.combatants.length > 100 || !Array.isArray(value.pins) || value.pins.length > 50) throw new Error("Choose an Eldoria session export (version 1).");
  const numeric = (v, min, max) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < min || n > max) throw new Error("Session contains an invalid number.");
    return Math.trunc(n);
  };
  const string = (v, max = 200) => String(v ?? "").slice(0, max);
  const combatants = value.combatants.map(c => ({
    id: string(c.id), characterId: string(c.characterId), name: string(c.name),
    initiative: numeric(c.initiative, -100, 100), hp: numeric(c.hp, 0, 1000000), ac: numeric(c.ac, 0, 100),
    effect: string(c.effect), rounds: numeric(c.rounds || 0, 0, 1000)
  }));
  if (combatants.some(c => !c.id || !c.name) || new Set(combatants.map(c => c.id)).size !== combatants.length) throw new Error("Session combatants need unique IDs and names.");
  const pins = value.pins.map(p => {
    const url = new URL(p.url);
    if (!['https:', 'http:'].includes(url.protocol)) throw new Error("Reference links must use HTTPS or HTTP.");
    return { name: string(p.name), url: url.href };
  });
  return { version: 1, round: numeric(value.round, 1, 10000), started: Boolean(value.started), activeId: combatants.some(c => c.id === value.activeId) ? value.activeId : combatants[0]?.id || "", combatants, notes: string(value.notes, 100000), pins };
}
export function nextTurn(session) {
  const next = structuredClone(session);
  if (!next.combatants.length) return next;
  next.started = true;
  const index = next.combatants.findIndex(c => c.id === next.activeId);
  const nextIndex = (index + 1) % next.combatants.length;
  next.activeId = next.combatants[nextIndex].id;
  if (nextIndex === 0 && index >= 0) {
    next.round += 1;
    next.combatants.forEach(c => { if (c.rounds > 0) { c.rounds -= 1; if (!c.rounds) c.effect = ""; } });
  }
  return next;
}
