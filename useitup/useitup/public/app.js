(() => {
const $ = s => document.querySelector(s);
const el = (t, x, c) => { const e = document.createElement(t); if (x) e.textContent = x; if (c) e.className = c; return e; };
const getC = () => (document.cookie.match(/(?:^|; )uiu_consent=(yes|no)/) || [])[1];
let consent = getC(), state = { items: [], saved: 0 };
if (consent === 'yes') try { state = JSON.parse(localStorage.getItem('uiu')) || state; } catch {}
const persist = () => { if (consent === 'yes') try { localStorage.setItem('uiu', JSON.stringify(state)); } catch {} };
const days = s => { const t = new Date(); t.setHours(0, 0, 0, 0); return Math.round((new Date(s + 'T00:00:00') - t) / 864e5); };

const RECIPES = [
 ['Chicken fried rice', ['chicken', 'rice', 'egg', 'carrot', 'onion', 'pepper']],
 ['Chicken and rice soup', ['chicken', 'rice', 'carrot', 'onion', 'potato']],
 ['Roast chicken with potatoes', ['chicken', 'potato', 'garlic', 'onion', 'lemon']],
 ['Creamy chicken pasta', ['chicken', 'pasta', 'cream', 'garlic', 'mushroom']],
 ['Chicken salad wrap', ['chicken', 'lettuce', 'tomato', 'cucumber', 'cheese']],
 ['Beef and veggie stir fry', ['beef', 'pepper', 'onion', 'carrot', 'rice', 'mushroom']],
 ['Veggie fried rice', ['rice', 'egg', 'carrot', 'pepper', 'onion']],
 ['Tomato pasta', ['tomato', 'pasta', 'garlic', 'onion']],
 ['Tuna pasta salad', ['tuna', 'pasta', 'tomato', 'onion']],
 ['Bean and rice chili', ['beans', 'rice', 'tomato', 'onion', 'pepper']],
 ['Shakshuka', ['egg', 'tomato', 'pepper', 'onion']],
 ['Veggie omelette', ['egg', 'pepper', 'cheese', 'spinach', 'mushroom']],
 ['Cheesy potato bake', ['potato', 'cheese', 'milk', 'onion', 'garlic']],
 ['Rice pudding', ['rice', 'milk', 'apple', 'banana']],
 ['Banana pancakes', ['banana', 'egg', 'milk', 'flour']],
 ['Fruit smoothie', ['banana', 'yogurt', 'berries', 'milk', 'apple']]];
const ALIAS = { rise: 'rice', ryce: 'rice' };
const dist = (a, b) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j;
 for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1));
 return d[a.length][b.length]; };
const near = (w, g) => w.includes(g) || (g.length >= 5 && w.length >= 5 && dist(w, g) <= 1);

function render() {
 state.items.sort((a, b) => a.exp.localeCompare(b.exp));
 const ul = $('#list'); ul.replaceChildren();
 if (!state.items.length) ul.append(el('li', 'Nothing here yet. Add your first item above.', 'empty'));
 state.items.forEach(it => {
  const n = days(it.exp), li = el('li', '', n < 0 ? 'bad' : n <= 2 ? 'warn' : 'ok'), row = el('div', '', 'row');
  const used = el('button', 'Used it'), del = el('button', 'Remove');
  used.type = del.type = 'button'; del.setAttribute('aria-label', 'Remove ' + it.food);
  used.onclick = () => { state.items = state.items.filter(x => x !== it); if (n >= 0) state.saved++; persist(); render(); };
  del.onclick = () => { state.items = state.items.filter(x => x !== it); persist(); render(); };
  row.append(used, del);
  li.append(el('strong', it.food), el('span', n < 0 ? 'Expired' : n === 0 ? 'Use today' : n === 1 ? '1 day left' : n + ' days left'), row);
  ul.append(li);
 });
 $('#saved').textContent = state.saved;
 const have = state.items.filter(i => days(i.exp) >= 0).flatMap(i => i.food.toLowerCase().split(/[\s,;.]+/).filter(Boolean)).map(w => ALIAS[w] || w);
 const hits = RECIPES.map(([t, ing]) => [t, ing.filter(g => have.some(w => near(w, g)))]).filter(r => r[1].length >= 1).sort((a, b) => b[1].length - a[1].length);
 const rl = $('#recipes'); rl.replaceChildren();
 if (!hits.length) rl.append(el('li', state.items.length ? 'No match yet. Try common foods like chicken, rice, eggs, potatoes or tomatoes.' : 'Add a few items and matching meal ideas will appear here.'));
 hits.slice(0, 4).forEach(([t, u]) => { const li = el('li'); li.append(el('strong', t), el('p', 'Uses your ' + u.join(', ') + '.', 'meta')); rl.append(li); });
}

const err = (f, k, m) => { const p = f.querySelector(`[data-for="${k}"]`), i = f.elements[k]; if (p) p.textContent = m || ''; if (i) m ? i.setAttribute('aria-invalid', 'true') : i.removeAttribute('aria-invalid'); };
const clear = f => [...f.elements].forEach(e => e.name && err(f, e.name, ''));

$('#item-form').addEventListener('submit', e => {
 e.preventDefault(); const f = e.target; clear(f);
 const food = f.elements.food.value.trim(), exp = f.elements.exp.value; let bad = false;
 if (food.length < 2 || food.length > 40) { err(f, 'food', "Enter the food's name (2 to 40 characters)."); bad = true; }
 if (!exp) { err(f, 'exp', 'Pick a use-by date.'); bad = true; }
 else if (days(exp) < 0) { err(f, 'exp', 'That date has passed. Pick today or a later date.'); bad = true; }
 else if (days(exp) > 730) { err(f, 'exp', 'Pick a date within the next two years.'); bad = true; }
 if (bad) return;
 state.items.push({ food, exp }); persist(); render(); f.reset(); f.elements.food.focus();
});

const cf = $('#contact-form'); cf.elements.ts.value = Date.now();
cf.addEventListener('submit', async e => {
 e.preventDefault(); clear(cf); const st = $('#status'); st.textContent = 'Sending...';
 const d = { who: cf.elements.who.value, email: cf.elements.email.value, message: cf.elements.message.value, website: cf.elements.website.value, ts: cf.elements.ts.value };
 try {
  const r = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
  const j = await r.json(); st.textContent = '';
  if (j.ok) { cf.reset(); cf.elements.ts.value = Date.now(); st.textContent = 'Thanks! Your message was sent.'; }
  else Object.entries(j.errors || {}).forEach(([k, m]) => k === 'form' ? (st.textContent = m) : err(cf, k, m));
 } catch { st.textContent = 'Could not send. Check your connection and try again.'; }
});

const bar = $('#cookie'); if (!consent) bar.hidden = false;
const choose = v => {
 consent = v; bar.hidden = true;
 document.cookie = `uiu_consent=${v};max-age=31536000;path=/;SameSite=Lax${location.protocol === 'https:' ? ';Secure' : ''}`;
 try { v === 'yes' ? persist() : localStorage.removeItem('uiu'); } catch {}
};
$('#yes').onclick = () => choose('yes'); $('#no').onclick = () => choose('no');
$('.sticky').addEventListener('click', () => setTimeout(() => $('#food').focus(), 60));
render();
})();
