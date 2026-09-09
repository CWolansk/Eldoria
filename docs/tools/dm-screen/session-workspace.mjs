import { emptySession, validateSession, nextTurn } from './session-state.mjs';

export function mountSessionWorkspace(root, getParty, notice) {
  const key = 'eldoria-dm-session-v1';
  const escape = v => String(v ?? '').replace(/[&<>"']/gu, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  let session = emptySession(), previous = null;
  try { const saved = localStorage.getItem(key); if (saved) session = validateSession(JSON.parse(saved)); }
  catch (_) { notice('Saved session could not be loaded. Import a session backup to recover it.', 'danger'); }
  function save() {
    try { localStorage.setItem(key, JSON.stringify(session)); root.querySelector('[data-session-status]').textContent = 'Saved in this browser · Export a backup to move devices'; }
    catch (_) { root.querySelector('[data-session-status]').textContent = 'Browser storage unavailable. Export a backup before leaving.'; }
  }
  function render() {
    const party = getParty();
    root.innerHTML = `
      <div class="dm-panel__header"><div><h2>Encounter & session</h2><p>Initiative and notes stay in this browser. Character HP comes from the party; NPC HP stays in this encounter.</p></div><strong>Round ${session.round}</strong></div>
      <div class="dm-form-actions"><button class="button" data-session-action="party">Add party</button><button class="button button-secondary" data-session-action="sort">Sort initiative</button><button class="button" data-session-action="next" ${session.combatants.length ? '' : 'disabled'}>Next turn</button><button class="button button-secondary" data-session-action="undo" ${previous ? '' : 'disabled'}>Undo turn</button><button class="button button-secondary" data-session-action="export">Export session</button><button class="button button-secondary" data-session-action="import">Import session</button><input type="file" data-session-import accept="application/json,.json" hidden></div>
      <form data-npc-form class="dm-npc-form"><label>Name<input class="input" name="name" required maxlength="200" placeholder="Add NPC or monster"></label><label>Initiative<input class="input" name="initiative" type="number" value="0" min="-100" max="100" required></label><label>HP<input class="input" name="hp" type="number" value="1" min="0" max="1000000" required></label><label>AC<input class="input" name="ac" type="number" value="10" min="0" max="100" required></label><button class="button" type="submit">Add combatant</button></form>
      <div class="dm-table-scroll"><table class="dm-overview"><caption>Initiative order · durations decrease at the start of each new round</caption><thead><tr><th>Combatant</th><th>Initiative</th><th>HP</th><th>AC</th><th>Effect / rounds left</th><th>Remove</th></tr></thead><tbody>${session.combatants.map(c => {
        const character = party.find(p => p.id === c.characterId);
        return `<tr data-combatant="${escape(c.id)}" ${c.id === session.activeId ? 'aria-current="true"' : ''}><th>${c.id === session.activeId ? '▶ ' : ''}${escape(character?.name || c.name)}${c.characterId && !character ? '<small>Party data unavailable</small>' : ''}${character?.concentration ? `<small>Concentrating: ${escape(character.concentration)}</small>` : ''}</th><td><input aria-label="Initiative for ${escape(c.name)}" class="input" type="number" min="-100" max="100" value="${c.initiative}" data-field="initiative"></td><td>${c.characterId ? character ? `${character.hp.current}/${character.hp.complete === false ? '?' : character.hp.max}` : '—' : `<input aria-label="HP for ${escape(c.name)}" class="input" type="number" min="0" max="1000000" value="${c.hp}" data-field="hp">`}</td><td>${c.characterId ? character?.ac ?? '—' : `<input aria-label="AC for ${escape(c.name)}" class="input" type="number" min="0" max="100" value="${c.ac}" data-field="ac">`}</td><td><input aria-label="Effect for ${escape(c.name)}" class="input" maxlength="200" value="${escape(c.effect)}" data-field="effect"><input aria-label="Rounds remaining for ${escape(c.name)}" class="input" type="number" min="0" max="1000" value="${c.rounds}" data-field="rounds"><small>0 = no automatic expiry</small></td><td><button class="button button-secondary" data-remove="${escape(c.id)}" aria-label="Remove ${escape(c.name)}">×</button></td></tr>`;
      }).join('') || '<tr><td colspan="6">Add the party or an NPC to start an encounter.</td></tr>'}</tbody></table></div>
      <label class="dm-session-notes">Session notes<textarea class="textarea" data-session-notes rows="8" maxlength="100000" placeholder="Clues, rulings, reminders, and plans…">${escape(session.notes)}</textarea></label>
      <section><h3>Pinned references</h3><form data-pin-form class="dm-pin-form"><input class="input" name="name" required maxlength="200" aria-label="Reference name" placeholder="Reference name"><input class="input" name="url" type="url" required aria-label="Reference URL" placeholder="https://…"><button class="button" type="submit">Pin reference</button></form><ul class="dm-pins">${session.pins.map((p,i) => `<li><a target="_blank" rel="noopener noreferrer" href="${escape(p.url)}">${escape(p.name)}</a><button class="button button-secondary" data-unpin="${i}" aria-label="Unpin ${escape(p.name)}">×</button></li>`).join('')}</ul></section>
      <p data-session-status role="status"></p>`;
  }
  root.addEventListener('submit', event => {
    event.preventDefault(); const form = event.target; const values = Object.fromEntries(new FormData(form));
    const before = structuredClone(session);
    try {
      if (form.matches('[data-npc-form]')) session.combatants.push({ id: crypto.randomUUID(), characterId: '', name: values.name, initiative: +values.initiative, hp: +values.hp, ac: +values.ac, effect: '', rounds: 0 });
      if (form.matches('[data-pin-form]')) session.pins.push(values);
      session = validateSession(session); previous = null; render(); save();
    } catch (error) { session = before; notice(error.message, 'danger'); }
  });
  root.addEventListener('input', event => {
    if (event.target.matches('[data-session-notes]')) { session.notes = event.target.value; save(); }
  });
  root.addEventListener('change', async event => {
    const field = event.target.dataset.field;
    if (field) {
      if (!event.target.checkValidity()) { event.target.reportValidity(); return; }
      const c = session.combatants.find(c => c.id === event.target.closest('[data-combatant]').dataset.combatant);
      c[field] = field === 'effect' ? event.target.value : +event.target.value;
      previous = null; save();
    }
    if (event.target.matches('[data-session-import]') && event.target.files[0]) {
      try {
        const file = event.target.files[0]; if (file.size > 1000000) throw new Error('Session file is too large.');
        const imported = validateSession(JSON.parse(await file.text()));
        if (!confirm('Replace the encounter, notes, and pins in this browser with the imported session? Export first if you need a backup.')) return;
        session = imported; previous = null; render(); save();
      } catch (error) { notice(error.message, 'danger'); }
    }
  });
  root.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    const action = button.dataset.sessionAction;
    if (action === 'import') { root.querySelector('[data-session-import]').click(); return; }
    if (action === 'export') {
      const url = URL.createObjectURL(new Blob([JSON.stringify(session,null,2)], {type:'application/json'}));
      const link = document.createElement('a'); link.href=url; link.download='eldoria-session.json'; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); return;
    }
    if (!action && !button.hasAttribute('data-remove') && !button.hasAttribute('data-unpin')) return;
    if (action === 'party') {
      if (!getParty().length) return notice('Load the party first. You can still add NPCs.', 'danger');
      for (const c of getParty()) if (!session.combatants.some(e => e.characterId === c.id) && session.combatants.length < 100) session.combatants.push({id:crypto.randomUUID(),characterId:c.id,name:c.name,initiative:c.initiative || 0,hp:0,ac:0,effect:'',rounds:0});
      session.activeId ||= session.combatants[0]?.id || ''; previous = null;
    }
    if (action === 'sort') { session.combatants.sort((a,b)=>b.initiative-a.initiative); if (!session.started) session.activeId = session.combatants[0]?.id || ''; previous = null; }
    if (action === 'next') { previous = structuredClone(session); session = nextTurn(session); }
    if (action === 'undo' && previous) { session = { ...previous, notes: session.notes, pins: session.pins }; previous = null; }
    if (button.hasAttribute('data-remove')) { session.combatants = session.combatants.filter(c=>c.id!==button.dataset.remove); if (!session.combatants.some(c=>c.id===session.activeId)) session.activeId=session.combatants[0]?.id || ''; previous=null; }
    if (button.hasAttribute('data-unpin')) session.pins.splice(+button.dataset.unpin,1);
    render(); save();
  });
  render(); save();
  return { refresh: () => {
    if (root.contains(document.activeElement)) return;
    const drafts = [...root.querySelectorAll('form input')].map(input => ({form:input.closest('form').hasAttribute('data-npc-form') ? '[data-npc-form]' : '[data-pin-form]',name:input.name,value:input.value}));
    render();
    for (const draft of drafts) root.querySelector(`${draft.form} [name="${draft.name}"]`).value = draft.value;
    save();
  } };
}
