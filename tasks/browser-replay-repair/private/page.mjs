// Trusted fixture application. No effect log or expected answer exists in the page.
export function html(events, scenario) {
  const forms = events.flatMap((e) => [
    ...(scenario.decoy ? [{ ...e, entity: `other-${e.entity}`, selector: e.selector }] : []),
    { ...e, selector: scenario.decoy ? `new-${e.selector}` : e.selector },
  ]);
  return `<html><body><main></main><div id="modal"></div><script>
const forms = ${JSON.stringify(forms).replaceAll("<", "\\u003c")};
window.tick = 0; window.generation = 0; window.pending = null;
window.render = () => {
  document.querySelector('main').replaceChildren();
  for (const f of forms) {
    const form = document.createElement('section');
    for (const k of ['step','entity','field','selector']) form.dataset[k] = String(f[k]);
    form.dataset.generation = String(window.generation);
    form.setAttribute('aria-busy','false');
    const input = document.createElement('input'); input.setAttribute('aria-label',f.field);
    const button = document.createElement('button'); button.textContent = 'Save'; button.disabled = window.tick < ${scenario.delay};
    button.onclick = async () => {
      const payload = { step:f.step, entity:f.entity, field:f.field, value:input.value };
      if (${scenario.confirmation}) { window.pending = payload; window.modalAt = window.tick + 1; }
      else await window.commitEffect(payload);
    };
    form.append(input,button); document.querySelector('main').append(form);
  }
};
window.advance = () => {
  window.tick++;
  document.querySelectorAll('main button').forEach(b => b.disabled = window.tick < ${scenario.delay});
  if (window.pending && window.tick >= window.modalAt && !document.querySelector('#modal button')) {
    const button = document.createElement('button'); button.textContent = 'Confirm';
    button.onclick = async () => { const payload = window.pending; window.pending = null; document.querySelector('#modal').replaceChildren(); await window.commitEffect(payload); };
    document.querySelector('#modal').append(button);
  }
};
window.remount = () => { window.generation++; window.render(); };
window.render();
</script></body></html>`;
}
