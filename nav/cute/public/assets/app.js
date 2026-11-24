/* cute.syl.red — front end.
 * Plain JavaScript, no build step and no third-party code.
 * The page is built with DOM methods only (never innerHTML), so text from the database
 * can't inject HTML, and it works under a strict Content-Security-Policy.
 */
'use strict';

(() => {
  // ------------------------------------------------------------------ state
  const S = { user: null, csrf: null, settings: null, lib: null, firstRender: true };
  const app = document.getElementById('app');
  const SVGNS = 'http://www.w3.org/2000/svg';
  const MICROS = ['Calcium (mg)', 'Iron (mg)', 'Potassium (mg)', 'Sodium (mg)', 'Magnesium (mg)', 'Zinc (mg)', 'Vitamin C (mg)', 'Vitamin D (µg)', 'Vitamin B12 (µg)'];
  const EXTRA_MACROS = [['fiber', 'Fiber', 'g'], ['sugar', 'Sugar', 'g'], ['satfat', 'Saturated fat', 'g'], ['salt', 'Salt', 'g']];

  // ------------------------------------------------------------------ DOM helpers
  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    setProps(el, props);
    append(el, kids);
    return el;
  }
  function s(tag, attrs, ...kids) {
    const el = document.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'style') el.style.cssText = v;   // CSSOM is allowed by our CSP, style="" attributes are not
      else el.setAttribute(k, String(v));
    }
    append(el, kids);
    return el;
  }
  function setProps(el, props) {
    if (!props) return;
    for (const [k, v] of Object.entries(props)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'style') for (const [p, val] of Object.entries(v)) el.style.setProperty(p, val);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'value') el.value = v;
      else if (k === 'checked' || k === 'disabled' || k === 'selected' || k === 'open') el[k] = !!v;
      else el.setAttribute(k, v === true ? '' : String(v));
    }
  }
  function append(el, kids) {
    for (const kid of kids.flat(Infinity)) {
      if (kid === null || kid === undefined || kid === false) continue;
      el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    }
  }

  const ICONS = {
    heart: ['M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z'],
    cal: ['M4 9a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z', 'M8 3v4M16 3v4M4 10h16'],
    book: ['M5 4h10a4 4 0 0 1 4 4v12H9a4 4 0 0 1-4-4V4z', 'M9 9h6M9 13h4'],
    chart: ['M4 20V10M10 20V4M16 20v-7M22 20H2'],
    gear: ['M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z', 'M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1'],
    left: ['M15 6l-6 6 6 6'], right: ['M9 6l6 6-6 6'],
    plus: ['M12 5v14M5 12h14'], minus: ['M5 12h14'],
    edit: ['M4 20h4L19 9l-4-4L4 16v4z'],
    search: ['M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'M20 20l-4-4'],
    drop: ['M12 2.5S4 11.5 4 16a8 8 0 0 0 16 0c0-4.5-8-13.5-8-13.5z'],
    down: ['M12 4v11M7 10l5 5 5-5M5 20h14'], up: ['M12 16V5M7 10l5-5 5 5M5 20h14'],
    lock: ['M7 11h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2z', 'M8 11V8a4 4 0 0 1 8 0v3'],
    cat: ['M5 10V3.5l4.2 3.6a9 9 0 0 1 5.6 0L19 3.5V10c1 1.6 1.3 3.4.7 5.2C18.6 18.4 15.6 20.5 12 20.5S5.4 18.4 4.3 15.2C3.7 13.4 4 11.6 5 10z', 'M9 13h.01M15 13h.01', 'M11 16l1 .8 1-.8'],
    sun: ['M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', 'M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4'],
    moon: ['M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z'],
    auto: ['M12 3a9 9 0 1 0 0 18V3z', 'M12 3a9 9 0 0 1 0 18'],
    trash: ['M5 7h14M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3'],
    check: ['M5 12l5 5 9-10'], x: ['M6 6l12 12M18 6L6 18'],
  };
  function icon(name, size = 20, sw = 2.2) {
    return s('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': sw, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' },
      ICONS[name].map((d) => s('path', { d })));
  }

  // ------------------------------------------------------------------ formatting
  const fmt = (v, d = 0) => (v === null || v === undefined || Number.isNaN(v)) ? '–' : Number(v).toLocaleString('en-GB', { maximumFractionDigits: d, minimumFractionDigits: 0 });
  const fmtWater = (ml) => (ml / 1000).toLocaleString('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 3 }) + ' L';
  const fmtL = (ml) => (ml / 1000).toLocaleString('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  const parseNum = (str) => { const n = parseFloat(String(str).replace(',', '.')); return Number.isFinite(n) ? n : null; };
  const toDate = (iso) => new Date(iso + 'T12:00:00Z');
  const isoOf = (d) => d.toISOString().slice(0, 10);
  const addDays = (iso, n) => { const d = toDate(iso); d.setUTCDate(d.getUTCDate() + n); return isoOf(d); };
  const longDate = (iso) => toDate(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' });
  const shortDate = (iso) => toDate(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const fullDate = (iso) => toDate(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const monthName = (ym) => toDate(ym + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const bmiInfo = (b) => b === null ? null : b < 18.5 ? ['under range', 'warn'] : b < 25 ? ['in range', 'ok'] : b < 30 ? ['above range', 'warn'] : ['well above range', 'warn'];
  const STATUS_LABEL = { open: 'Day open', closed: 'Closed', skipped: 'Skipped', none: 'Not logged' };
  // Stored kinds stay 'food' / 'drink' (so old data and backups keep working); the UI says solid / liquid.
  const KIND_LABEL = { food: 'solid', drink: 'liquid', meal: 'meal' };
  // Search matches every typed word against "name + brand", so "kikkoman soy" finds Soy sauce (Kikkoman).
  const matchQ = (q, ...fields) => {
    const hay = fields.filter(Boolean).join(' ').toLowerCase();
    return q.trim().toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
  };

  // ------------------------------------------------------------------ API
  class ApiError extends Error { constructor(msg, status) { super(msg); this.status = status; } }
  async function api(method, url, body) {
    const opts = { method, headers: { Accept: 'application/json' }, credentials: 'same-origin' };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = typeof body === 'string' ? body : JSON.stringify(body);
    }
    if (method !== 'GET' && S.csrf) opts.headers['X-CSRF-Token'] = S.csrf;
    let res;
    try { res = await fetch(url, opts); } catch { throw new ApiError("Can't reach the server. Are you online?", 0); }
    let data = null;
    try { data = await res.json(); } catch { /* empty */ }
    if (res.status === 401 && url !== '/api/login') {
      S.user = null; S.csrf = null;
      renderLogin();
      throw new ApiError('Please log in again.', 401);
    }
    if (!res.ok) throw new ApiError((data && data.error) || `Error ${res.status}`, res.status);
    return data;
  }

  // ------------------------------------------------------------------ toast & modal
  let toastHost;
  function toast(msg, kind = '') {
    if (!toastHost || !toastHost.isConnected) { toastHost = h('div', { class: 'toast-host', role: 'status' }); document.body.append(toastHost); }
    const t = h('div', { class: 'toast ' + kind, text: msg });
    toastHost.append(t);
    setTimeout(() => t.remove(), 3200);
  }
  const fail = (e) => { if (e && e.status !== 401) toast(e.message || 'Something went wrong', 'error'); };

  function modal(title, body, actions) {
    return new Promise((resolve) => {
      const back = h('div', { class: 'modal-back', onclick: (e) => { if (e.target === back) close(null); } });
      const close = (v) => { back.remove(); document.removeEventListener('keydown', onKey); resolve(v); };
      const onKey = (e) => { if (e.key === 'Escape') close(null); };
      document.addEventListener('keydown', onKey);
      const box = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
        h('h2', { text: title }), body,
        h('div', { class: 'row' }, actions.map((a) => h('button', {
          class: 'btn grow ' + (a.cls || 'btn-outline'), type: 'button', text: a.label,
          onclick: () => close(a.value !== undefined ? a.value : (a.get ? a.get() : true)),
        }))));
      back.append(box);
      document.body.append(back);
      const first = box.querySelector('input, button');
      if (first) first.focus();
    });
  }
  const confirmBox = (title, text, yes = 'Yes', cls = 'btn-primary') =>
    modal(title, h('p', { class: 'muted', text }), [{ label: 'Cancel', value: false }, { label: yes, value: true, cls }]);

  /** Searchable list of your foods in a sheet. Resolves with the chosen food, or null. */
  function pickFood(foods, title = 'Choose an ingredient') {
    return new Promise((resolve) => {
      const back = h('div', { class: 'modal-back', onclick: (e) => { if (e.target === back) close(null); } });
      const close = (v) => { back.remove(); document.removeEventListener('keydown', onKey); resolve(v); };
      const onKey = (e) => { if (e.key === 'Escape') close(null); };
      document.addEventListener('keydown', onKey);
      const search = h('input', { id: 'pick-q', class: 'input', type: 'search', placeholder: 'Name or brand', autocomplete: 'off' });
      const list = h('ul', { class: 'list picker-list' });
      const draw = () => {
        const shown = foods.filter((f) => matchQ(search.value, f.name, f.brand));
        list.replaceChildren(...(shown.length ? shown.map((f) => h('li', {}, h('button', { class: 'pick', type: 'button', onclick: () => close(f) },
          h('span', { class: 'badge ' + f.kind, text: KIND_LABEL[f.kind] }),
          h('span', { class: 'grow' }, h('div', { style: { 'font-weight': '800' }, text: f.name }),
            h('div', { class: 'tiny muted', text: `${f.brand ? f.brand + ' · ' : ''}${fmt(f.nutrients.kcal)} kcal per 100 ${f.unit}` })))))
          : [h('li', { class: 'empty', text: 'No matches. You can add new items in the Food library.' })]));
      };
      search.addEventListener('input', draw);
      search.addEventListener('keydown', (e) => {
        // Enter picks the first match, so "type, Enter" is enough on a keyboard.
        if (e.key === 'Enter') { e.preventDefault(); const first = list.querySelector('button.pick'); if (first) first.click(); }
      });
      draw();
      back.append(h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
        h('div', { class: 'row between' }, h('h2', { text: title }), h('button', { class: 'icon-btn flat', type: 'button', 'aria-label': 'Close', onclick: () => close(null) }, icon('x', 18))),
        h('div', { class: 'search' }, h('label', { class: 'sr', for: 'pick-q', text: 'Search ingredients' }), icon('search', 20, 2.4), search),
        list));
      document.body.append(back);
      search.focus();
    });
  }

  // ------------------------------------------------------------------ theme
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  function applyTheme(pref) {
    pref = pref || 'auto';
    try { localStorage.setItem('cute_theme', pref); } catch { /* private mode */ }
    const t = pref === 'auto' ? (darkQuery.matches ? 'dark' : 'light') : pref;
    document.documentElement.className = 'theme-' + t;
    let meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--bg').trim());
  }
  darkQuery.addEventListener('change', () => applyTheme(S.settings ? S.settings.theme : storedTheme()));
  const storedTheme = () => { try { return localStorage.getItem('cute_theme'); } catch { return null; } };
  applyTheme(storedTheme());

  // ------------------------------------------------------------------ page frame
  function hearts() {
    return h('div', { class: 'hearts', 'aria-hidden': 'true' }, ['h1', 'h2', 'h3', 'h4'].map((c) => h('div', { class: 'heart ' + c })));
  }
  function nav(active) {
    const items = [['today', '#/today', 'heart', 'Today'], ['history', '#/history', 'cal', 'History'], ['foods', '#/foods', 'book', 'Foods'], ['stats', '#/stats', 'chart', 'Stats'], ['settings', '#/settings', 'gear', 'Settings']];
    return h('nav', { class: 'nav', 'aria-label': 'Main' }, items.map(([k, href, ic, label]) =>
      h('a', { href, 'aria-current': k === active ? 'page' : null }, icon(ic), label)));
  }
  function page(active, children, { wide = false } = {}) {
    const shell = h('main', { class: 'shell' + (wide ? ' wide' : '') }, children);
    app.replaceChildren(hearts(), shell, nav(active));
    if (S.firstRender) S.firstRender = false;
    return shell;
  }
  function loading(active) {
    page(active, [h('div', { class: 'empty' }, h('div', { class: 'mascot small' }, h('img', { src: '/assets/img/mascot.png', alt: '' })), 'Loading…')]);
  }

  // ------------------------------------------------------------------ login
  function renderLogin(message) {
    applyTheme(storedTheme());
    const user = h('input', { id: 'u', class: 'input', type: 'text', autocomplete: 'username', required: true, autocapitalize: 'none', spellcheck: 'false' });
    const pass = h('input', { id: 'p', class: 'input', type: 'password', autocomplete: 'current-password', required: true });
    const err = h('p', { class: 'err', role: 'alert', text: message || '' });
    const btn = h('button', { class: 'btn btn-primary btn-block', type: 'submit' }, 'Log in', icon('right', 18, 2.5));
    const form = h('form', {
      class: 'card', onsubmit: async (e) => {
        e.preventDefault();
        btn.disabled = true; err.textContent = '';
        try {
          const r = await api('POST', '/api/login', { username: user.value, password: pass.value });
          S.user = r.username; S.csrf = r.csrf; S.settings = r.settings;
          applyTheme(S.settings.theme);
          pass.value = '';
          if (!location.hash || location.hash === '#/' || location.hash === '#/login') location.hash = '#/today';
          route();
        } catch (ex) {
          err.textContent = ex.message; btn.disabled = false; pass.select();
        }
      },
    },
    h('div', { class: 'field-wrap' }, h('label', { class: 'label', for: 'u', text: 'Username' }), user),
    h('div', { class: 'field-wrap' }, h('label', { class: 'label', for: 'p', text: 'Password' }), pass),
    err, btn);
    app.replaceChildren(hearts(), h('main', { class: 'login' }, h('div', { class: 'login-inner' },
      h('div', { class: 'stack pop', style: { 'align-items': 'center', 'text-align': 'center' } },
        h('div', { class: 'mascot' }, h('img', { src: '/assets/img/mascot.png', alt: 'cute.syl.red mascot', width: 184, height: 184 })),
        h('div', { class: 'logo' }, 'cute', h('span', { text: '.syl.red' })),
        h('p', { class: 'muted', text: 'hi again! time for a little check-in' })),
      form,
      h('p', { class: 'row small muted' }, icon('lock', 16, 2), 'Private tracker · no sign-ups'))));
    user.focus();
  }

  // ------------------------------------------------------------------ day view
  async function viewDay(date) {
    loading('today');
    try {
      const d = date ? await api('GET', '/api/days/' + date) : await api('GET', '/api/today');
      if (!date && d.done) return renderDone(d);
      renderDay(d, !date);
    } catch (e) { fail(e); }
  }

  function renderDone(d) {
    page('today', [
      h('div', { class: 'card pop', style: { 'align-items': 'center', 'text-align': 'center' } },
        h('div', { class: 'mascot' }, h('img', { src: '/assets/img/mascot.png', alt: '' })),
        h('h1', { text: 'All done for today' }),
        h('p', { class: 'muted', text: `${longDate(d.date)} is closed. A fresh day opens tomorrow — sleep well!` }),
        h('div', { class: 'row wrap', style: { 'justify-content': 'center' } },
          h('a', { class: 'btn btn-primary', href: '#/day/' + d.date, text: "View today's log" }),
          h('a', { class: 'btn btn-outline', href: '#/stats', text: 'See my stats' }))),
    ]);
  }

  function renderDay(d, viaToday) {
    const goals = S.settings.goals;
    const date = d.date;
    const back = viaToday ? '#/today' : '#/day/' + date;
    const editable = true;
    const refresh = (nd) => renderDay(nd, viaToday);
    const t = d.totals;

    // Header
    const prev = h('a', { class: 'icon-btn', href: '#/day/' + addDays(date, -1), 'aria-label': 'Previous day' }, icon('left', 20, 2.5));
    const nextDate = addDays(date, 1);
    const next = date >= d.today
      ? h('button', { class: 'icon-btn', disabled: true, 'aria-label': 'Next day' }, icon('right', 20, 2.5))
      : h('a', { class: 'icon-btn', href: '#/day/' + nextDate, 'aria-label': 'Next day' }, icon('right', 20, 2.5));
    const header = h('header', { class: 'dayhead' }, prev,
      h('div', { class: 'mid' }, h('h1', { text: longDate(date) }),
        h('span', { class: 'chip ' + d.status }, d.status === 'open' ? h('span', { class: 'dot' }) : null, STATUS_LABEL[d.status])),
      next);

    const parts = [header];

    if (d.is_current && date < d.today) {
      parts.push(h('div', { class: 'banner pop' },
        h('span', { text: `This day is still open. End or skip it to move on — or catch up: every empty day until today gets skipped.` }),
        h('button', {
          class: 'btn btn-small btn-outline', type: 'button', text: 'Catch up to today', onclick: async () => {
            try { await api('POST', '/api/days/catch-up'); toast('All caught up!'); location.hash = '#/today'; route(); } catch (e) { fail(e); }
          },
        })));
    }
    if (d.status !== 'open') {
      parts.push(h('div', { class: 'card tight pop' },
        h('p', { class: 'small muted', text: d.status === 'none' ? 'Nothing logged for this day yet. Anything you add is saved straight away.' : 'This day is closed. You can still correct it — changes save straight away.' }),
        d.status !== 'none' ? h('button', {
          class: 'btn btn-small btn-outline', type: 'button', text: 'Reopen day', onclick: async () => {
            try { refresh(await api('POST', `/api/days/${date}/reopen`)); toast('Day reopened'); } catch (e) { fail(e); }
          },
        }) : null));
    }

    // Calories
    const goal = Number(goals.kcal) || 0;
    const pct = goal > 0 ? Math.min(t.kcal / goal, 1) : 0;
    const C = 339.3;
    const arc = s('circle', { class: 'ring-arc' + (S.animateRing ? ' anim' : '') + (t.kcal > goal ? ' over' : ''), cx: 64, cy: 64, r: 54, fill: 'none', 'stroke-width': 14, 'stroke-linecap': 'round', 'stroke-dasharray': C, 'stroke-dashoffset': (C * (1 - pct)).toFixed(1), transform: 'rotate(-90 64 64)' });
    S.animateRing = false;
    const left = goal - t.kcal;
    const macroBar = (cls, label, val, g) => h('div', { class: 'bar-row' },
      h('div', { class: 'top' }, h('span', { text: label }), h('span', { class: 'muted', text: `${fmt(val)} / ${fmt(g)} g` })),
      h('div', { class: 'bar ' + cls, role: 'img', 'aria-label': `${label} ${fmt(val)} of ${fmt(g)} grams` },
        h('span', { style: { width: (g > 0 ? Math.min(100, val / g * 100) : 0) + '%' } })));
    const microChips = [
      ...EXTRA_MACROS.map(([k, label, u]) => h('span', { class: 'chip outline', text: `${label} ${fmt(t[k], 1)}${k === 'fiber' ? ' / ' + fmt(goals.fiber) : ''} ${u}` })),
      ...Object.entries(t.micros || {}).map(([name, v]) => {
        const m = name.match(/^(.*) \((.*)\)$/);
        return h('span', { class: 'chip outline', text: m ? `${m[1]} ${fmt(v, 1)} ${m[2]}` : `${name} ${fmt(v, 1)}` });
      }),
    ];
    parts.push(h('section', { class: 'card pop', 'aria-label': 'Calories and macros' },
      h('div', { class: 'row', style: { gap: '18px' } },
        h('div', { class: 'ring-wrap' },
          s('svg', { width: 128, height: 128, viewBox: '0 0 128 128', role: 'img', 'aria-label': `${fmt(t.kcal)} of ${fmt(goal)} kcal` },
            s('circle', { class: 'ring-track', cx: 64, cy: 64, r: 54, fill: 'none', 'stroke-width': 14 }), arc),
          h('div', { class: 'center' }, h('span', { class: 'num', style: { 'font-size': '26px', 'line-height': '1' }, text: fmt(t.kcal) }), h('span', { class: 'tiny muted', text: `of ${fmt(goal)} kcal` }))),
        h('div', { class: 'stack', style: { gap: '4px' } },
          h('span', { class: 'small muted', text: left >= 0 ? 'Still to go' : 'Over your goal' }),
          h('span', { class: 'bigleft' }, fmt(Math.abs(left)), ' ', h('span', { style: { 'font-size': '16px' }, text: 'kcal' })),
          h('span', { class: 'small muted', text: t.kcal === 0 ? 'nothing logged yet' : left >= 0 ? "you're doing lovely" : 'still lovely, just noting it' }))),
      h('div', { class: 'stack' },
        macroBar('p', 'Protein', t.protein, goals.protein),
        macroBar('c', 'Carbs', t.carbs, goals.carbs),
        macroBar('f', 'Fat', t.fat, goals.fat)),
      h('details', { class: 'micros' }, h('summary', { text: 'Micronutrients & more' }), h('div', { class: 'chips' }, microChips))));

    // Water
    // Each droplet is 250 mL; a droplet that is only partly reached is filled partly (e.g. 100 mL = 40%).
    const waterGoal = Number(goals.water_ml) || 2000;
    let water = d.water_ml;
    const waterLabel = h('span', { class: 'num', style: { 'font-size': '20px' } });
    const glassesEl = h('div', { class: 'glasses' });
    const saveWater = async (ml) => {
      water = Math.round(Math.max(0, Math.min(20000, ml))); drawWater();
      try { await api('PATCH', '/api/days/' + date, { water_ml: water }); } catch (e) { fail(e); }
    };
    const DROP = 'M12 2 C12 2 3 13 3 19 a9 9 0 0 0 18 0 C21 13 12 2 12 2Z';
    function droplet(frac, idx) {
      // The fill is the droplet shape clipped to a rectangle that rises from the bottom.
      const id = `drop-${date}-${idx}`;
      const top = 2, bottom = 28, hgt = (bottom - top) * frac;
      return s('svg', { width: 18, height: 22, viewBox: '0 0 24 30', 'aria-hidden': 'true' },
        s('defs', {}, s('clipPath', { id }, s('rect', { x: 0, y: (bottom - hgt).toFixed(2), width: 24, height: (hgt + 2).toFixed(2) }))),
        frac > 0 ? s('path', { class: 'drop-fill', d: DROP, 'clip-path': `url(#${id})` }) : null,
        s('path', { class: 'drop-line', d: DROP, stroke: 'currentColor', 'stroke-width': 2 }));
    }
    function drawWater() {
      waterLabel.replaceChildren(fmtWater(water) + ' ', h('span', { class: 'small muted', text: '/ ' + fmtL(waterGoal) + ' L' }));
      const count = Math.min(40, Math.max(4, Math.round(waterGoal / 250), Math.ceil(water / 250)));
      glassesEl.replaceChildren(...Array.from({ length: count }, (_, i) => {
        const frac = Math.max(0, Math.min(1, (water - i * 250) / 250));
        return h('button', {
          class: 'glass' + (frac >= 1 ? ' on' : frac > 0 ? ' part' : ''), type: 'button',
          'aria-label': `Set water to ${(i + 1) * 250} mL`, 'aria-pressed': String(frac >= 1),
          onclick: () => saveWater((i + 1) * 250 === water ? i * 250 : (i + 1) * 250),
        }, droplet(frac, i));
      }));
    }
    drawWater();
    const customIn = h('input', { id: 'water-custom', class: 'input', type: 'text', inputmode: 'numeric', placeholder: 'e.g. 330', autocomplete: 'off', 'aria-label': 'Custom amount in mL' });
    const custom = (sign) => {
      const v = parseNum(customIn.value);
      if (v === null || v <= 0) { toast('Type an amount in mL', 'error'); customIn.focus(); return; }
      saveWater(water + sign * v); customIn.value = '';
    };
    parts.push(h('section', { class: 'card pop', 'aria-label': 'Water' },
      h('div', { class: 'row between' }, h('h2', { class: 'water', text: 'Water' }), waterLabel),
      glassesEl,
      h('div', { class: 'row' },
        h('button', { class: 'btn btn-small btn-outline grow', type: 'button', text: '− 250 mL', onclick: () => saveWater(water - 250) }),
        h('button', { class: 'btn btn-small btn-outline grow', type: 'button', text: '+ 250 mL', onclick: () => saveWater(water + 250) }),
        h('button', { class: 'btn btn-small btn-outline grow', type: 'button', text: '+ 500 mL', onclick: () => saveWater(water + 500) })),
      h('form', { class: 'water-custom', onsubmit: (e) => { e.preventDefault(); custom(1); } },
        h('label', { class: 'label', for: 'water-custom', text: 'Custom amount' }),
        h('div', { class: 'row' },
          h('div', { class: 'grow', style: { position: 'relative' } }, customIn, h('span', { class: 'unit-suffix', text: 'mL' })),
          h('button', { class: 'btn btn-small btn-outline', type: 'button', 'aria-label': 'Remove this amount', onclick: () => custom(-1) }, icon('minus', 18, 3)),
          h('button', { class: 'btn btn-small btn-primary', type: 'submit' }, icon('plus', 18, 3), 'Add')))));

    // Body
    const bmiEl = h('div', { class: 'row between', style: { background: 'var(--field)', 'border-radius': '18px', padding: '12px 14px' } });
    const drawBmi = (b) => {
      const info = bmiInfo(b);
      bmiEl.replaceChildren(h('span', { class: 'small', style: { 'font-weight': '800' }, text: 'BMI' }),
        h('span', { class: 'row' }, h('span', { class: 'num', style: { 'font-size': '22px' }, text: b === null ? '–' : fmt(b, 1) }), info ? h('span', { class: 'chip ' + info[1], text: info[0] }) : null));
    };
    drawBmi(d.bmi);
    const bodyInput = (id, label, key, value, hint) => {
      const inp = h('input', { id, class: 'input big', type: 'text', inputmode: 'decimal', value: value === null ? '' : String(value), autocomplete: 'off' });
      inp.addEventListener('change', async () => {
        const v = inp.value.trim() === '' ? null : parseNum(inp.value);
        if (inp.value.trim() !== '' && v === null) { toast('Please type a number', 'error'); return; }
        try { const nd = await api('PATCH', '/api/days/' + date, { [key]: v }); drawBmi(nd.bmi); toast('Saved'); } catch (e) { fail(e); }
      });
      return h('div', { class: 'field-wrap' }, h('label', { class: 'label', for: id, text: label }), inp, h('span', { class: 'tiny muted', text: hint }));
    };
    parts.push(h('section', { class: 'card pop', 'aria-label': 'Body' },
      h('h2', { class: 'wine', text: 'Body' }),
      h('div', { class: 'grid2' },
        bodyInput('w', 'Weight (kg)', 'weight_kg', d.weight_kg, d.weight_kg === null ? 'not set yet' : 'remembered from before'),
        bodyInput('hgt', 'Height (cm)', 'height_cm', d.height_cm, d.height_cm === null ? 'set it once' : 'remembered')),
      bmiEl));

    // Eaten
    const rows = d.entries.length === 0
      ? [h('p', { class: 'muted small', text: 'Nothing yet. Add your first bite or sip below.' })]
      : d.entries.map((e) => h('div', { class: 'entry' },
        h('span', { class: 'badge ' + e.kind, text: KIND_LABEL[e.kind] }),
        h('div', { class: 'grow' }, h('div', { class: 'name', text: e.name }), h('div', { class: 'tiny muted', text: `${e.brand ? e.brand + ' · ' : ''}${fmt(e.amount, 1)} ${e.unit}` })),
        h('span', { class: 'kcal', text: fmt(e.totals.kcal) }),
        editable ? h('button', { class: 'icon-btn flat', type: 'button', 'aria-label': 'Edit ' + e.name, onclick: () => editEntry(e, refresh) }, icon('edit', 18)) : null));
    parts.push(h('section', { class: 'card tight pop', 'aria-label': 'Eaten' },
      h('h2', { text: d.status === 'open' && viaToday ? 'Eaten today' : 'Eaten' }), rows,
      h('a', { class: 'btn btn-primary btn-block', href: '#/add/' + date + (viaToday ? '?from=today' : ''), style: { 'margin-top': '8px' } }, icon('plus', 20, 3), 'Add food or drink')));

    // Close the day
    if (d.status === 'open') {
      parts.push(h('section', { class: 'card tight pop' },
        h('p', { class: 'small muted', text: 'The day stays open until you close it.' }),
        h('div', { class: 'row' },
          h('button', {
            class: 'btn btn-lace grow', type: 'button', text: 'End day', onclick: async () => {
              try { await api('POST', `/api/days/${date}/close`); toast('Day closed — well done!'); S.animateRing = true; location.hash = '#/today'; route(); } catch (e) { fail(e); }
            },
          }),
          h('button', {
            class: 'btn btn-outline grow', type: 'button', text: 'Skip day', onclick: async () => {
              const hasData = d.entries.length > 0 || water > 0;
              if (hasData && !await confirmBox('Skip this day?', 'Skipping closes the day with no information, so the food and water logged here will be removed.', 'Skip day')) return;
              try { await api('POST', `/api/days/${date}/skip`); toast('Day skipped'); location.hash = '#/today'; route(); } catch (e) { fail(e); }
            },
          })),
        h('p', { class: 'tiny muted', text: 'Skipping closes the day with no data. You can still edit it later from History.' })));
    }

    page('today', parts);
    void back;
  }

  async function editEntry(e, refresh) {
    const inp = h('input', { class: 'input big', type: 'text', inputmode: 'decimal', value: String(e.amount), 'aria-label': `Amount in ${e.unit}` });
    const res = await modal(e.name, h('div', { class: 'stack' },
      h('label', { class: 'label', text: `Amount (${e.unit})` }), inp),
    [{ label: 'Remove', value: 'delete', cls: 'btn-danger' }, { label: 'Save', cls: 'btn-primary', get: () => 'save' }]);
    try {
      if (res === 'delete') {
        if (!await confirmBox('Remove item?', `Remove ${e.name} from this day?`, 'Remove')) return;
        refresh(await api('DELETE', '/api/entries/' + e.id));
        toast('Removed');
      } else if (res === 'save') {
        const v = parseNum(inp.value);
        if (v === null || v <= 0) { toast('Please type an amount', 'error'); return; }
        refresh(await api('PATCH', '/api/entries/' + e.id, { amount: v }));
        toast('Updated');
      }
    } catch (ex) { fail(ex); }
  }

  // ------------------------------------------------------------------ add to day
  async function loadLib(force = false) {
    if (!S.lib || force) S.lib = await api('GET', '/api/foods');
    return S.lib;
  }

  async function viewAdd(date, params) {
    loading('today');
    let lib;
    try { lib = await loadLib(true); } catch (e) { return fail(e); }
    const backHref = params.get('from') === 'today' ? '#/today' : '#/day/' + date;
    const items = [
      ...lib.foods.map((f) => ({ key: 'f' + f.id, type: f.kind, name: f.name, brand: f.brand, unit: f.unit, per100: f.nutrients, food_id: f.id, def: 100 })),
      ...lib.meals.map((m) => ({ key: 'm' + m.id, type: 'meal', name: m.name, unit: 'g', per100: m.per100, meal_id: m.id, def: Math.round(m.weight) || 100 })),
    ].sort((a, b) => a.name.localeCompare(b.name));
    const st = { tab: 'all', q: '', sel: params.get('select') || null, amt: 100 };
    const pre = items.find((i) => i.key === st.sel);
    if (pre) st.amt = pre.def;

    const search = h('input', { id: 'q', class: 'input', type: 'search', placeholder: 'Name or brand, e.g. yogurt', autocomplete: 'off' });
    const tabs = h('div', { class: 'seg', role: 'group', 'aria-label': 'Filter' });
    const list = h('ul', { class: 'list' });
    const panel = h('div');

    function draw() {
      tabs.replaceChildren(...[['all', 'All'], ['food', 'Solids'], ['drink', 'Liquids'], ['meal', 'Meals']].map(([k, l]) =>
        h('button', { type: 'button', 'aria-pressed': String(st.tab === k), text: l, onclick: () => { st.tab = k; draw(); } })));
      const shown = items.filter((i) => (st.tab === 'all' || i.type === st.tab) && matchQ(st.q, i.name, i.brand));
      list.replaceChildren(...(shown.length ? shown.map((i) => h('li', { class: S.addAnimated ? null : 'pop' },
        h('button', {
          class: 'pick', type: 'button', 'aria-pressed': String(i.key === st.sel),
          onclick: () => { st.sel = i.key; st.amt = i.def; draw(); panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); },
        },
        h('span', { class: 'badge ' + i.type, text: KIND_LABEL[i.type] }),
        h('span', { class: 'grow' }, h('div', { style: { 'font-weight': '800' }, text: i.name }), h('div', { class: 'tiny muted', text: `${i.brand ? i.brand + ' · ' : ''}${fmt(i.per100.kcal)} kcal per 100 ${i.unit}` })),
        i.key === st.sel ? icon('check', 22, 2.6) : null))) : [h('li', { class: 'empty' }, items.length ? 'No matches.' : 'Your library is empty — create your first item.')]));
      drawPanel();
    }
    function drawPanel() {
      const i = items.find((x) => x.key === st.sel);
      if (!i) { panel.replaceChildren(); return; }
      const t = (k) => (i.per100[k] || 0) * st.amt / 100;
      const amtInput = h('input', { type: 'text', inputmode: 'decimal', value: String(st.amt), 'aria-label': `Amount in ${i.unit}` });
      amtInput.addEventListener('input', () => { const v = parseNum(amtInput.value); if (v !== null && v >= 0) { st.amt = v; drawTiles(); } });
      const tiles = h('div', { class: 'grid4' });
      function drawTiles() {
        tiles.replaceChildren(
          h('div', { class: 'tile t-kcal' }, h('div', { class: 'v num', text: fmt(t('kcal')) }), h('div', { class: 'l', text: 'kcal' })),
          h('div', { class: 'tile t-p' }, h('div', { class: 'v num', text: fmt(t('protein'), 1) + ' g' }), h('div', { class: 'l', text: 'protein' })),
          h('div', { class: 'tile t-c' }, h('div', { class: 'v num', text: fmt(t('carbs'), 1) + ' g' }), h('div', { class: 'l', text: 'carbs' })),
          h('div', { class: 'tile t-f' }, h('div', { class: 'v num', text: fmt(t('fat'), 1) + ' g' }), h('div', { class: 'l', text: 'fat' })));
      }
      drawTiles();
      const step = (d) => { st.amt = Math.max(0, Math.round((st.amt + d) * 10) / 10); amtInput.value = String(st.amt); drawTiles(); };
      const quick = i.type === 'meal' ? [Math.round(i.def / 2), i.def, Math.round(i.def * 1.5)] : [50, 100, 150, 200];
      const addBtn = h('button', {
        class: 'btn btn-primary btn-block', type: 'button', text: 'Add to day', onclick: async () => {
          if (!(st.amt > 0)) { toast('Please set an amount', 'error'); return; }
          addBtn.disabled = true;
          try {
            await api('POST', `/api/days/${date}/entries`, { food_id: i.food_id, meal_id: i.meal_id, amount: st.amt });
            toast(`${i.name} added`);
            location.hash = backHref;
          } catch (e) { fail(e); addBtn.disabled = false; }
        },
      });
      panel.replaceChildren(h('section', { class: 'card pop' },
        h('h2', { text: i.name }),
        h('div', { class: 'stepper' },
          h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Less', onclick: () => step(-10) }, icon('minus', 20, 3)),
          h('div', { class: 'amount' }, amtInput, h('div', { class: 'small muted', text: i.unit })),
          h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'More', onclick: () => step(10) }, icon('plus', 20, 3))),
        h('div', { class: 'quick' }, quick.map((q) => h('button', { class: 'btn btn-small btn-outline', type: 'button', text: `${q} ${i.unit}`, onclick: () => { st.amt = q; amtInput.value = String(q); drawTiles(); } }))),
        tiles, addBtn));
    }
    search.addEventListener('input', () => { st.q = search.value; draw(); });
    S.addAnimated = false;
    draw();
    S.addAnimated = true;
    page('today', [
      h('header', { class: 'row' }, h('a', { class: 'icon-btn', href: backHref, 'aria-label': 'Back' }, icon('left', 20, 2.5)), h('h1', { text: 'Add to ' + (backHref === '#/today' ? 'today' : shortDate(date)) })),
      h('div', { class: 'field-wrap' }, h('label', { class: 'label', for: 'q', text: 'Search your foods, meals and liquids' }), h('div', { class: 'search' }, icon('search', 20, 2.4), search)),
      tabs, list, panel,
      h('a', { href: `#/foods/new?back=${encodeURIComponent('add/' + date + (backHref === '#/today' ? '?from=today' : ''))}`, class: 'btn btn-ghost', style: { 'align-self': 'center' }, text: "Can't find it? Create a new item" }),
    ]);
  }

  // ------------------------------------------------------------------ library
  async function viewLibrary(tab) {
    loading('foods');
    let lib;
    try { lib = await loadLib(true); } catch (e) { return fail(e); }
    const st = { q: '' };
    let firstDraw = true;   // bounce the list in once, not on every keystroke
    const search = h('input', { id: 'lq', class: 'input', type: 'search', placeholder: 'Search by name or brand', autocomplete: 'off' });
    const list = h('ul', { class: 'list' });
    const draw = () => {
      if (tab === 'foods') {
        const shown = lib.foods.filter((f) => matchQ(st.q, f.name, f.brand));
        list.replaceChildren(...(shown.length ? shown.map((f) => h('li', { class: firstDraw ? 'pop' : null }, h('a', { class: 'libitem', href: '#/foods/' + f.id },
          h('div', { class: 'row' },
            h('span', { class: 'grow' }, h('div', { style: { 'font-weight': '800' }, text: f.name }), f.brand ? h('div', { class: 'tiny muted', text: f.brand }) : null),
            h('span', { class: 'badge ' + f.kind, text: KIND_LABEL[f.kind] }), h('span', { class: 'tiny muted', text: `per 100 ${f.unit}` })),
          h('div', { class: 'chips' },
            h('span', { class: 'chip kcal', text: `${fmt(f.nutrients.kcal)} kcal` }),
            h('span', { class: 'chip p', text: `P ${fmt(f.nutrients.protein, 1)} g` }),
            h('span', { class: 'chip c', text: `C ${fmt(f.nutrients.carbs, 1)} g` }),
            h('span', { class: 'chip f', text: `F ${fmt(f.nutrients.fat, 1)} g` }))))) : [h('li', { class: 'card empty' + (firstDraw ? ' pop' : '') }, lib.foods.length ? 'No matches.' : 'No foods yet. Add the things you eat often!')]));
      } else {
        const shown = lib.meals.filter((m) => matchQ(st.q, m.name, ...m.items.map((i) => `${i.name} ${i.brand || ''}`)));
        list.replaceChildren(...(shown.length ? shown.map((m) => h('li', { class: firstDraw ? 'pop' : null }, h('a', { class: 'libitem', href: '#/meals/' + m.id },
          h('div', { class: 'row between' }, h('span', { class: 'serif', style: { 'font-size': '19px', color: 'var(--wine)' }, text: m.name }), h('span', { class: 'small', style: { 'font-weight': '800' }, text: `${fmt(m.weight)} g · ${fmt(m.totals.kcal)} kcal` })),
          h('div', { class: 'tiny muted', text: m.items.map((i) => `${i.name}${i.brand ? ' (' + i.brand + ')' : ''} ${fmt(i.amount)} ${i.unit}`).join(' · ') })))) : [h('li', { class: 'card empty' + (firstDraw ? ' pop' : '') }, lib.meals.length ? 'No matches.' : 'No meals yet. A meal is a saved combination of foods.')]));
      }
    };
    search.addEventListener('input', () => { st.q = search.value; draw(); });
    draw();
    firstDraw = false;
    page('foods', [
      h('header', { class: 'row between' }, h('h1', { text: 'Food library' }),
        h('a', { class: 'btn btn-primary btn-small', href: tab === 'foods' ? '#/foods/new' : '#/meals/new' }, icon('plus', 16, 3), tab === 'foods' ? 'New item' : 'New meal')),
      h('div', { class: 'seg pop', role: 'group', 'aria-label': 'Library section' },
        h('a', { class: 'btn btn-small', href: '#/foods', style: tab === 'foods' ? { background: 'var(--rose)', color: 'var(--deeper)', flex: '1' } : { flex: '1', color: 'var(--muted)' }, 'aria-current': tab === 'foods' ? 'page' : null, text: 'Solids & liquids' }),
        h('a', { class: 'btn btn-small', href: '#/meals', style: tab === 'meals' ? { background: 'var(--rose)', color: 'var(--deeper)', flex: '1' } : { flex: '1', color: 'var(--muted)' }, 'aria-current': tab === 'meals' ? 'page' : null, text: 'Meals' })),
      h('div', { class: 'search pop' }, h('label', { class: 'sr', for: 'lq', text: 'Search library' }), icon('search', 20, 2.4), search),
      list,
    ]);
  }

  // ------------------------------------------------------------------ food form
  async function viewFoodForm(id, params) {
    loading('foods');
    let food = null;
    try {
      const lib = await loadLib(true);
      if (id) {
        food = lib.foods.find((f) => f.id === Number(id));
        if (!food) { toast('That item no longer exists', 'error'); location.hash = '#/foods'; return; }
      }
    } catch (e) { return fail(e); }
    const back = params.get('back');
    const backHref = back ? '#/' + back : '#/foods';
    const n = food ? food.nutrients : { kcal: '', protein: '', carbs: '', sugar: '', fat: '', satfat: '', fiber: '', salt: '', micros: {} };
    let kind = food ? food.kind : 'food';
    const name = h('input', { id: 'nm', class: 'input', type: 'text', maxlength: 80, value: food ? food.name : '', required: true });
    const brand = h('input', { id: 'br', class: 'input', type: 'text', maxlength: 60, value: food ? food.brand : '', placeholder: 'optional, e.g. Kikkoman', autocomplete: 'off' });
    const numField = (key, label) => {
      const inp = h('input', { id: 'n-' + key.replace(/\W+/g, '-'), class: 'input', type: 'text', inputmode: 'decimal', value: n[key] === '' || n[key] === undefined ? '' : String(n[key]) });
      return [inp, h('div', { class: 'field-wrap' }, h('label', { class: 'label', for: inp.id, text: label }), inp)];
    };
    const unitLabel = h('span', { class: 'small muted', style: { 'font-family': 'Nunito, sans-serif', 'font-style': 'normal' } });
    const macroDefs = [['kcal', 'Energy (kcal)'], ['protein', 'Protein (g)'], ['carbs', 'Carbs (g)'], ['sugar', 'of which sugar (g)'], ['fat', 'Fat (g)'], ['satfat', 'of which saturated (g)'], ['fiber', 'Fiber (g)'], ['salt', 'Salt (g)']];
    const macroInputs = {};
    const macroGrid = h('div', { class: 'grid2' }, macroDefs.map(([k, l]) => { const [inp, wrap] = numField(k, l); macroInputs[k] = inp; return wrap; }));

    const microRows = h('div', { class: 'grid2' });
    const microInputs = [];
    const addMicro = (label, value, custom) => {
      const inp = h('input', { class: 'input', type: 'text', inputmode: 'decimal', value: value === undefined || value === null ? '' : String(value), placeholder: '—', id: 'mi-' + microInputs.length });
      let nameInp = null;
      const wrap = h('div', { class: 'field-wrap' });
      if (custom) {
        nameInp = h('input', { class: 'input', type: 'text', maxlength: 40, placeholder: 'Name (unit), e.g. Folate (µg)', value: label || '', 'aria-label': 'Nutrient name' });
        wrap.append(nameInp, inp);
        inp.setAttribute('aria-label', 'Amount');
      } else {
        wrap.append(h('label', { class: 'label', for: inp.id, text: label }), inp);
      }
      microInputs.push({ label, inp, nameInp });
      microRows.append(wrap);
    };
    const existing = n.micros || {};
    MICROS.slice(0, 4).forEach((m) => addMicro(m, existing[m]));
    Object.entries(existing).forEach(([m, v]) => { if (!MICROS.slice(0, 4).includes(m)) addMicro(m, v, true); });

    const kindSeg = h('div', { class: 'seg on-field', role: 'radiogroup', 'aria-label': 'Item type' });
    const drawKind = () => {
      kindSeg.replaceChildren(...[['food', 'Solid · grams'], ['drink', 'Liquid · mL']].map(([k, l]) =>
        h('button', { type: 'button', role: 'radio', 'aria-checked': String(kind === k), text: l, onclick: () => { kind = k; drawKind(); } })));
      unitLabel.textContent = kind === 'drink' ? ' per 100 mL' : ' per 100 g';
    };
    drawKind();

    const save = h('button', { class: 'btn btn-primary grow', type: 'submit', text: 'Save item' });
    const form = h('form', {
      class: 'stack', style: { gap: '16px' }, onsubmit: async (e) => {
        e.preventDefault();
        const nutrients = { micros: {} };
        for (const [k] of macroDefs) {
          const v = macroInputs[k].value.trim() === '' ? 0 : parseNum(macroInputs[k].value);
          if (v === null) { toast(`Please check ${k}`, 'error'); macroInputs[k].focus(); return; }
          nutrients[k] = v;
        }
        for (const m of microInputs) {
          const label = m.nameInp ? m.nameInp.value.trim() : m.label;
          if (!label || m.inp.value.trim() === '') continue;
          const v = parseNum(m.inp.value);
          if (v === null) { toast(`Please check ${label}`, 'error'); m.inp.focus(); return; }
          nutrients.micros[label] = v;
        }
        save.disabled = true;
        try {
          const saved = await api(food ? 'PUT' : 'POST', food ? '/api/foods/' + food.id : '/api/foods', { name: name.value, brand: brand.value, kind, nutrients });
          S.lib = null;
          toast(food ? 'Saved' : `${saved.name} added to your library`);
          if (back && back.startsWith('add/')) {
            const [path, qs] = back.split('?');
            const p = new URLSearchParams(qs || ''); p.set('select', 'f' + saved.id);
            location.hash = '#/' + path + '?' + p.toString();
          } else location.hash = backHref;
        } catch (ex) { fail(ex); save.disabled = false; }
      },
    },
    h('section', { class: 'card pop' },
      h('div', { class: 'field-wrap' }, h('label', { class: 'label', for: 'nm', text: 'Name' }), name),
      h('div', { class: 'field-wrap' }, h('label', { class: 'label', for: 'br', text: 'Brand' }), brand),
      h('div', { class: 'field-wrap' }, h('span', { class: 'label', text: 'Measured as' }), kindSeg,
        h('span', { class: 'tiny muted', text: 'Solids are weighed in grams, liquids measured in millilitres. Soy sauce, oil and milk are liquids.' }))),
    h('section', { class: 'card pop' }, h('h2', {}, 'Macros', unitLabel), macroGrid),
    h('section', { class: 'card pop' },
      h('h2', { class: 'water' }, 'Micros ', h('span', { class: 'small muted', style: { 'font-family': 'Nunito, sans-serif', 'font-style': 'normal' }, text: 'optional' })),
      microRows,
      h('div', { class: 'row wrap' },
        h('label', { class: 'label sr', for: 'add-micro', text: 'Add a nutrient' }),
        (() => {
          const sel = h('select', { id: 'add-micro', class: 'input grow' }, h('option', { value: '', text: '+ Add another nutrient…' }),
            MICROS.slice(4).map((m) => h('option', { value: m, text: m })), h('option', { value: '__custom', text: 'Something else…' }));
          sel.addEventListener('change', () => {
            if (!sel.value) return;
            if (sel.value === '__custom') addMicro('', '', true);
            else if (!microInputs.some((m) => m.label === sel.value)) addMicro(sel.value, '');
            sel.value = '';
            const last = microInputs[microInputs.length - 1];
            (last.nameInp || last.inp).focus();
          });
          return sel;
        })())),
    h('div', { class: 'row' },
      h('a', { class: 'btn btn-outline grow', href: backHref, text: 'Cancel' }), save),
    food ? h('button', {
      class: 'btn btn-ghost', type: 'button', style: { 'align-self': 'center' }, onclick: async () => {
        if (!await confirmBox('Remove from library?', `${food.name} disappears from your library. Days where you ate it keep their numbers.`, 'Remove')) return;
        try { await api('DELETE', '/api/foods/' + food.id); S.lib = null; toast('Removed'); location.hash = '#/foods'; } catch (ex) { fail(ex); }
      },
    }, icon('trash', 18), 'Remove from library') : null);

    page('foods', [h('header', { class: 'row' }, h('a', { class: 'icon-btn', href: backHref, 'aria-label': 'Back' }, icon('left', 20, 2.5)), h('h1', { text: food ? 'Edit item' : 'New item' })), form]);
    if (!food) name.focus();
  }

  // ------------------------------------------------------------------ meal form
  async function viewMealForm(id) {
    loading('foods');
    let lib, meal = null;
    try {
      lib = await loadLib(true);
      if (id) {
        meal = lib.meals.find((m) => m.id === Number(id));
        if (!meal) { toast('That meal no longer exists', 'error'); location.hash = '#/meals'; return; }
      }
    } catch (e) { return fail(e); }
    if (!lib.foods.length) {
      page('foods', [h('div', { class: 'card empty' }, h('h2', { text: 'First, some foods' }), h('p', { text: 'A meal is made of foods from your library. Add a few foods first.' }), h('a', { class: 'btn btn-primary', href: '#/foods/new', text: 'New item' }))]);
      return;
    }
    const foodsById = new Map(lib.foods.map((f) => [f.id, f]));
    const rows = (meal ? meal.items : []).map((i) => ({ ...i }));
    const name = h('input', { id: 'mn', class: 'input', type: 'text', maxlength: 80, value: meal ? meal.name : '', required: true });
    const list = h('div', { class: 'stack' });
    const tiles = h('div', { class: 'grid4' });
    const drawTotals = () => {
      const tot = { kcal: 0, protein: 0, carbs: 0, fat: 0 }; let w = 0;
      for (const r of rows) {
        const f = foodsById.get(r.food_id); if (!f || !(r.amount > 0)) continue;
        for (const k in tot) tot[k] += (f.nutrients[k] || 0) * r.amount / 100;
        w += r.amount;
      }
      tiles.replaceChildren(
        h('div', { class: 'tile t-kcal' }, h('div', { class: 'v num', text: fmt(tot.kcal) }), h('div', { class: 'l', text: `kcal · ${fmt(w)} g` })),
        h('div', { class: 'tile t-p' }, h('div', { class: 'v num', text: fmt(tot.protein, 1) + ' g' }), h('div', { class: 'l', text: 'protein' })),
        h('div', { class: 'tile t-c' }, h('div', { class: 'v num', text: fmt(tot.carbs, 1) + ' g' }), h('div', { class: 'l', text: 'carbs' })),
        h('div', { class: 'tile t-f' }, h('div', { class: 'v num', text: fmt(tot.fat, 1) + ' g' }), h('div', { class: 'l', text: 'fat' })));
    };
    const drawRows = () => {
      if (!rows.length) {
        list.replaceChildren(h('p', { class: 'small muted', text: 'No ingredients yet. Add the first one below.' }));
        drawTotals();
        return;
      }
      list.replaceChildren(...rows.map((r, idx) => {
        const f = foodsById.get(r.food_id);
        const unit = (f || {}).unit || 'g';
        // Tap the ingredient to swap it for another one (opens the search sheet).
        const choose = h('button', {
          class: 'input ing-pick', type: 'button', id: 'ing-' + idx, 'aria-label': `Ingredient ${idx + 1}: change`,
          onclick: async () => { const nf = await pickFood(lib.foods, 'Change ingredient'); if (nf) { r.food_id = nf.id; drawRows(); } },
        },
        h('span', { class: 'grow' }, h('span', { class: 'ing-name', text: f ? f.name : (r.name || 'Removed item') + ' (removed)' }),
          f && f.brand ? h('span', { class: 'tiny muted', text: f.brand }) : null),
        icon('search', 16, 2.4));
        const amt = h('input', { class: 'input', id: 'amt-' + idx, type: 'text', inputmode: 'decimal', value: String(r.amount), 'aria-label': `Amount in ${unit}` });
        amt.addEventListener('input', () => { r.amount = parseNum(amt.value) || 0; drawTotals(); });
        return h('div', { class: 'ing' },
          h('div', { class: 'field-wrap' }, h('label', { class: 'label', for: choose.id, text: `Ingredient ${idx + 1}` }), choose),
          h('div', { class: 'field-wrap' }, h('label', { class: 'label', for: amt.id, text: unit }), amt),
          h('button', { class: 'icon-btn flat', type: 'button', 'aria-label': 'Remove ingredient', onclick: () => { rows.splice(idx, 1); drawRows(); } }, icon('x', 18)));
      }));
      drawTotals();
    };
    const addIngredient = async () => {
      const f = await pickFood(lib.foods);
      if (!f) return;
      rows.push({ food_id: f.id, amount: 100 });
      drawRows();
      const amt = document.getElementById('amt-' + (rows.length - 1));
      if (amt) { amt.focus(); amt.select(); }
    };
    drawRows();
    const save = h('button', { class: 'btn btn-primary grow', type: 'submit', text: 'Save meal' });
    const form = h('form', {
      class: 'stack', style: { gap: '16px' }, onsubmit: async (e) => {
        e.preventDefault();
        if (!rows.length) { toast('Add at least one ingredient', 'error'); return; }
        save.disabled = true;
        try {
          await api(meal ? 'PUT' : 'POST', meal ? '/api/meals/' + meal.id : '/api/meals', { name: name.value, items: rows.map((r) => ({ food_id: r.food_id, amount: r.amount })) });
          S.lib = null; toast('Meal saved'); location.hash = '#/meals';
        } catch (ex) { fail(ex); save.disabled = false; }
      },
    },
    h('section', { class: 'card pop' }, h('div', { class: 'field-wrap' }, h('label', { class: 'label', for: 'mn', text: 'Meal name' }), name)),
    h('section', { class: 'card pop' }, h('h2', { class: 'wine', text: 'Ingredients' }), list,
      h('button', { class: 'btn btn-outline btn-small', type: 'button', onclick: addIngredient }, icon('plus', 16, 3), 'Add ingredient'),
      h('p', { class: 'tiny muted', text: 'When you log this meal you enter how many grams you ate; the nutrients scale from the total above.' }),
      tiles),
    h('div', { class: 'row' }, h('a', { class: 'btn btn-outline grow', href: '#/meals', text: 'Cancel' }), save),
    meal ? h('button', {
      class: 'btn btn-ghost', type: 'button', style: { 'align-self': 'center' }, onclick: async () => {
        if (!await confirmBox('Remove meal?', `${meal.name} disappears from your library. Days where you ate it keep their numbers.`, 'Remove')) return;
        try { await api('DELETE', '/api/meals/' + meal.id); S.lib = null; toast('Removed'); location.hash = '#/meals'; } catch (ex) { fail(ex); }
      },
    }, icon('trash', 18), 'Remove meal') : null);
    page('foods', [h('header', { class: 'row' }, h('a', { class: 'icon-btn', href: '#/meals', 'aria-label': 'Back' }, icon('left', 20, 2.5)), h('h1', { text: meal ? 'Edit meal' : 'New meal' })), form]);
  }

  // ------------------------------------------------------------------ history
  async function viewHistory(params) {
    loading('history');
    const today = localToday();
    const month = /^\d{4}-\d{2}$/.test(params.get('m') || '') ? params.get('m') : today.slice(0, 7);
    let cal;
    try { cal = await api('GET', '/api/calendar/' + month); } catch (e) { return fail(e); }
    const byDate = new Map(cal.days.map((d) => [d.date, d.status]));
    const sel = { date: params.get('d') || (cal.today.startsWith(month) ? cal.today : null) };
    const first = toDate(month + '-01');
    const lead = (first.getUTCDay() + 6) % 7;   // Monday first
    const daysIn = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    const grid = h('div', { class: 'cal' });
    const detail = h('div');
    const prevM = isoOf(new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() - 1, 1))).slice(0, 7);
    const nextM = isoOf(new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 1))).slice(0, 7);

    const drawGrid = () => {
      const cells = [];
      for (let i = 0; i < lead; i++) cells.push(h('span'));
      for (let dnum = 1; dnum <= daysIn; dnum++) {
        const iso = `${month}-${String(dnum).padStart(2, '0')}`;
        const future = iso > cal.today;
        const st = byDate.get(iso) || 'none';
        cells.push(h('button', {
          type: 'button', class: `${future ? '' : st}${iso === sel.date ? ' sel' : ''}`, disabled: future,
          'aria-label': `${fullDate(iso)}, ${future ? 'future' : STATUS_LABEL[st]}`, 'aria-pressed': String(iso === sel.date),
          text: String(dnum), onclick: () => { sel.date = iso; drawGrid(); drawDetail(); },
        }));
      }
      grid.replaceChildren(...cells);
    };
    const drawDetail = async () => {
      if (!sel.date) { detail.replaceChildren(); return; }
      const want = sel.date;
      let d;
      try { d = await api('GET', '/api/days/' + want); } catch (e) { return fail(e); }
      if (want !== sel.date) return;
      const open = d.is_current ? '#/today' : '#/day/' + d.date;
      detail.replaceChildren(h('section', { class: 'card pop' },
        h('div', { class: 'row between' }, h('h2', { text: longDate(d.date) }), h('span', { class: 'chip ' + d.status, text: STATUS_LABEL[d.status] })),
        d.status === 'skipped' ? h('p', { class: 'small muted', text: 'This day was skipped, so nothing was logged. You can still fill it in.' })
          : h('div', { class: 'grid3' },
            h('div', { class: 'tile t-kcal' }, h('div', { class: 'v num', text: fmt(d.totals.kcal) }), h('div', { class: 'l', text: 'kcal' })),
            h('div', { class: 'tile t-w' }, h('div', { class: 'v num', text: fmtL(d.water_ml) + ' L' }), h('div', { class: 'l', text: 'water' })),
            h('div', { class: 'tile t-f' }, h('div', { class: 'v num', text: d.weight_kg === null ? '–' : fmt(d.weight_kg, 1) }), h('div', { class: 'l', text: 'kg' }))),
        h('div', { class: 'row' },
          h('a', { class: 'btn btn-primary grow', href: open, text: d.status === 'open' ? 'Open this day' : 'View & edit' }),
          d.status === 'closed' || d.status === 'skipped' ? h('button', {
            class: 'btn btn-outline grow', type: 'button', text: 'Reopen day', onclick: async () => {
              try { await api('POST', `/api/days/${d.date}/reopen`); toast('Day reopened'); byDate.set(d.date, 'open'); drawGrid(); drawDetail(); } catch (e) { fail(e); }
            },
          }) : null)));
    };
    drawGrid();
    drawDetail();
    page('history', [
      h('header', { class: 'row between' }, h('h1', { text: 'History' }),
        h('div', { class: 'row', style: { gap: '4px' } },
          h('a', { class: 'icon-btn', href: '#/history?m=' + prevM, 'aria-label': 'Previous month' }, icon('left', 18, 2.5)),
          h('span', { style: { 'font-weight': '800', 'min-width': '120px', 'text-align': 'center' }, text: monthName(month) }),
          month >= cal.today.slice(0, 7)
            ? h('button', { class: 'icon-btn', disabled: true, 'aria-label': 'Next month' }, icon('right', 18, 2.5))
            : h('a', { class: 'icon-btn', href: '#/history?m=' + nextM, 'aria-label': 'Next month' }, icon('right', 18, 2.5)))),
      h('section', { class: 'card tight pop' },
        h('div', { class: 'cal-head', 'aria-hidden': 'true' }, ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => h('span', { text: d }))),
        grid,
        h('div', { class: 'legend' },
          h('span', {}, h('i', { class: 'lg closed' }), 'Closed'), h('span', {}, h('i', { class: 'lg skipped' }), 'Skipped'), h('span', {}, h('i', { class: 'lg open' }), 'Open'))),
      detail,
    ]);
  }

  // ------------------------------------------------------------------ stats
  const RANGES = [['7', '7 days'], ['30', '30 days'], ['90', '90 days'], ['365', '1 year'], ['all', 'All time'], ['custom', 'Custom']];
  async function viewStats(params) {
    loading('stats');
    const today = localToday();
    let r = params.get('r') || '30';
    let from, to = today;
    if (r === 'custom') {
      from = params.get('from'); to = params.get('to') || today;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(from || '') || !/^\d{4}-\d{2}-\d{2}$/.test(to)) { from = addDays(today, -29); to = today; }
      if (from > to) [from, to] = [to, from];
    } else if (r === 'all') {
      from = '2000-01-01';
    } else {
      if (!['7', '30', '90', '365'].includes(r)) r = '30';
      from = addDays(today, -(Number(r) - 1));
    }
    let data;
    try { data = await api('GET', `/api/stats?from=${from}&to=${to}`); } catch (e) { return fail(e); }
    if (r === 'all') from = data.first_date || today;

    const goals = S.settings.goals;
    const byDate = new Map(data.days.map((d) => [d.date, d]));
    const allDates = [];
    for (let d = from; d <= to; d = addDays(d, 1)) allDates.push(d);
    const span = allDates.length;
    const bucket = span <= 92 ? 'day' : span <= 400 ? 'week' : 'month';
    const keyOf = (iso) => {
      if (bucket === 'day') return iso;
      if (bucket === 'month') return iso.slice(0, 7);
      const d = toDate(iso); const dow = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - dow); return isoOf(d);
    };
    const labelOf = (k) => bucket === 'month' ? toDate(k + '-01').toLocaleDateString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' }) : (bucket === 'week' ? 'week of ' : '') + shortDate(k);
    const groups = new Map();
    for (const iso of allDates) {
      const k = keyOf(iso);
      if (!groups.has(k)) groups.set(k, []);
      const d = byDate.get(iso);
      if (d) groups.get(k).push(d);
    }
    const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
    const logged = data.days.filter((d) => d.status === 'closed' || d.status === 'open');
    const closed = data.days.filter((d) => d.status === 'closed');
    const series = [...groups.entries()].map(([k, ds]) => {
      const c = ds.filter((d) => d.status === 'closed');
      const wts = ds.filter((d) => d.weight_kg !== null);
      const last = wts[wts.length - 1];
      return { key: k, label: labelOf(k), kcal: avg(c.map((d) => d.totals.kcal)), water: avg(c.map((d) => d.water_ml)), weight: last ? last.weight_kg : null, bmi: last ? last.bmi : null };
    });
    const weights = data.days.filter((d) => d.weight_kg !== null);
    const wFirst = weights[0], wLast = weights[weights.length - 1];

    // Range picker
    const seg = h('div', { class: 'seg stats-range', role: 'radiogroup', 'aria-label': 'Time range' },
      RANGES.map(([k, l]) => h('button', { type: 'button', role: 'radio', 'aria-checked': String(k === r), text: l, onclick: () => { location.hash = k === 'custom' ? `#/stats?r=custom&from=${from}&to=${to}` : '#/stats?r=' + k; } })));
    const fromIn = h('input', { id: 'from', class: 'input', type: 'date', value: from, max: today });
    const toIn = h('input', { id: 'to', class: 'input', type: 'date', value: to, max: today });
    const custom = r === 'custom' ? h('form', {
      class: 'card tight pop', onsubmit: (e) => { e.preventDefault(); if (fromIn.value && toIn.value) location.hash = `#/stats?r=custom&from=${fromIn.value}&to=${toIn.value}`; },
    }, h('div', { class: 'grid2' },
      h('div', { class: 'field-wrap' }, h('label', { class: 'label', for: 'from', text: 'From' }), fromIn),
      h('div', { class: 'field-wrap' }, h('label', { class: 'label', for: 'to', text: 'To' }), toIn)),
    h('button', { class: 'btn btn-primary btn-small', type: 'submit', text: 'Show range' })) : null;

    const head = [
      h('div', { class: 'row between wrap' },
        h('div', {}, h('h1', { text: 'Your summary' }), h('p', { class: 'muted small', text: `${fullDate(from)} – ${fullDate(to)} · ${closed.length} closed day${closed.length === 1 ? '' : 's'}${bucket !== 'day' ? ` · averaged per ${bucket}` : ''}` })),
        seg),
      custom,
    ];
    if (!logged.length && !weights.length) {
      page('stats', [...head, h('div', { class: 'card empty pop' }, h('div', { class: 'mascot small' }, h('img', { src: '/assets/img/mascot.png', alt: '' })), 'No data in this range yet. Close a few days and your charts appear here.')], { wide: true });
      return;
    }
    const avgKcal = avg(closed.map((d) => d.totals.kcal));
    const avgWater = avg(closed.map((d) => d.water_ml));
    const change = wFirst && wLast ? wLast.weight_kg - wFirst.weight_kg : null;
    const kpis = h('div', { class: 'kpis' },
      h('div', { class: 'kpi pop' }, h('div', { class: 'l', text: 'Avg calories' }), h('div', { class: 'v' }, fmt(avgKcal), ' ', h('small', { text: 'kcal' })), h('div', { class: 's', text: `goal ${fmt(goals.kcal)}` })),
      h('div', { class: 'kpi pop' }, h('div', { class: 'l', text: 'Avg water' }), h('div', { class: 'v' }, avgWater === null ? '–' : fmtL(avgWater), ' ', h('small', { text: 'L' })), h('div', { class: 's', text: `goal ${fmtL(goals.water_ml)} L` })),
      h('div', { class: 'kpi pop' }, h('div', { class: 'l', text: 'Weight change' }), h('div', { class: 'v' }, change === null ? '–' : (change > 0 ? '+' : change < 0 ? '−' : '') + fmt(Math.abs(change), 1), ' ', h('small', { text: 'kg' })), h('div', { class: 's', text: wLast ? `now ${fmt(wLast.weight_kg, 1)} kg` : 'no weigh-ins' })),
      h('div', { class: 'kpi pop' }, h('div', { class: 'l', text: 'BMI' }), h('div', { class: 'v', text: wLast && wLast.bmi !== null ? fmt(wLast.bmi, 1) : '–' }), h('div', { class: 's', text: wLast && wLast.bmi !== null ? bmiInfo(wLast.bmi)[0] : 'add your height' })));

    const xl = () => h('div', { class: 'xlabels' }, h('span', { text: series[0].label }), h('span', { text: series[series.length - 1].label }));
    const charts = [
      chartCard('Calories per ' + bucket, h('span', { class: 'legend-line' }, h('i'), `goal ${fmt(goals.kcal)} kcal`),
        (w) => barChart(series.map((p) => ({ v: p.kcal, t: `${p.label}: ${p.kcal === null ? 'no closed days' : fmt(p.kcal) + ' kcal'}`, over: p.kcal > goals.kcal })), { max: Math.max(goals.kcal * 1.35, ...series.map((p) => p.kcal || 0)), goal: goals.kcal, cls: 'bar-k', w, hgt: 240, yfmt: (v) => fmt(v / 1000, 1) + 'k' }), xl()),
      chartCard('Weight', null, (w) => lineChart(series.map((p) => ({ v: p.weight, t: p.weight === null ? '' : `${p.label}: ${fmt(p.weight, 1)} kg` })), { cls: 'line-w', unit: 'kg', w }), xl()),
      chartCard('BMI', h('span', { class: 'legend-line' }, h('span', { class: 'sw', style: { background: 'var(--mint)', 'border-radius': '3px' } }), '18.5–25'),
        (w) => lineChart(series.map((p) => ({ v: p.bmi, t: p.bmi === null ? '' : `${p.label}: BMI ${fmt(p.bmi, 1)}` })), { cls: 'line-b', min: 16, max: 32, band: [18.5, 25], w }), xl()),
      chartCard('Water', h('span', { class: 'legend-line' }, h('i'), `goal ${fmtL(goals.water_ml)} L`),
        (w) => barChart(series.map((p) => ({ v: p.water, t: `${p.label}: ${p.water === null ? 'no closed days' : fmtL(p.water) + ' L'}` })), { max: Math.max(goals.water_ml * 1.4, ...series.map((p) => p.water || 0)), goal: goals.water_ml, cls: 'bar-w', w, hgt: 200, yfmt: (v) => fmtL(v) + ' L' }), xl()),
      splitCard(closed),
    ];
    page('stats', [...head, kpis,
      h('div', { class: 'stack', style: { gap: '16px' } }, charts[0], h('div', { class: 'cards-auto' }, charts.slice(1)))], { wide: true });
  }

  // Charts are drawn at the real pixel width of their card (1 SVG unit = 1 px), so labels stay
  // the same size on a phone and a wide screen. A ResizeObserver redraws them when the width changes.
  function chartCard(title, legend, build, xlabels) {
    const holder = h('div', { class: 'chart-holder' });
    let last = 0;
    const ro = new ResizeObserver(() => {
      if (!holder.isConnected) { ro.disconnect(); return; }
      const w = Math.round(holder.clientWidth);
      if (w > 0 && Math.abs(w - last) > 4) { last = w; holder.replaceChildren(build(w)); }
    });
    ro.observe(holder);
    return h('section', { class: 'card pop' }, h('div', { class: 'row between wrap' }, h('h2', { text: title }), legend), holder, xlabels);
  }

  function barChart(points, o) {
    const W = o.w, H = o.hgt, L = 40, T = 10, B = H - 20;
    const n = points.length, slot = (W - L - 4) / n, bw = Math.max(1.5, slot * 0.68), rx = Math.min(4, bw / 2);
    const y = (v) => B - (v / o.max) * (B - T);
    return s('svg', { class: 'chart', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Bar chart' },
      s('line', { class: 'axis', x1: L, y1: B, x2: W, y2: B }),
      s('text', { x: L - 6, y: B + 4, 'text-anchor': 'end' }, '0'),
      s('text', { x: L - 6, y: y(o.goal) + 4, 'text-anchor': 'end' }, o.yfmt(o.goal)),
      points.map((p, i) => p.v === null ? null : s('rect', {
        class: o.cls + (p.over ? ' over' : ''), x: (L + 2 + i * slot + (slot - bw) / 2).toFixed(1), y: y(p.v).toFixed(1),
        width: bw.toFixed(1), height: Math.max(0, B - y(p.v)).toFixed(1), rx: rx.toFixed(1), style: `animation-delay:${(i * 0.5 / n).toFixed(3)}s`,
      }, s('title', {}, p.t))),
      s('line', { class: 'goal', x1: L, y1: y(o.goal), x2: W, y2: y(o.goal) }));
  }

  function lineChart(points, o) {
    const W = o.w, H = 200, L = 40, T = 16, B = 180;
    const vals = points.map((p) => p.v).filter((v) => v !== null);
    if (!vals.length) return h('p', { class: 'empty', text: 'No weigh-ins in this range yet.' });
    let min = o.min !== undefined ? o.min : Math.floor(Math.min(...vals) - 0.5);
    let max = o.max !== undefined ? o.max : Math.ceil(Math.max(...vals) + 0.5);
    if (o.min !== undefined) { min = Math.min(min, Math.floor(Math.min(...vals))); max = Math.max(max, Math.ceil(Math.max(...vals))); }
    const n = points.length;
    const x = (i) => L + 8 + (n === 1 ? (W - L - 16) / 2 : i * ((W - L - 16) / (n - 1)));
    const y = (v) => B - ((v - min) / (max - min || 1)) * (B - T);
    let d = '';
    points.forEach((p, i) => { if (p.v !== null) d += (d ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.v).toFixed(1) + ' '; });
    const lastIdx = points.map((p) => p.v !== null).lastIndexOf(true);
    const last = points[lastIdx];
    return s('svg', { class: 'chart', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Line chart' },
      o.band ? s('rect', { class: 'band', x: L, y: y(Math.min(o.band[1], max)), width: W - L, height: Math.max(0, y(Math.max(o.band[0], min)) - y(Math.min(o.band[1], max))), rx: 6 }) : null,
      s('line', { class: 'axis', x1: L, y1: B, x2: W, y2: B }),
      s('text', { x: L - 6, y: T + 4, 'text-anchor': 'end' }, fmt(max)),
      s('text', { x: L - 6, y: B + 4, 'text-anchor': 'end' }, fmt(min)),
      vals.length > 1 ? s('path', { class: 'line ' + o.cls, d, pathLength: 1 }) : null,
      points.map((p, i) => p.v === null ? null : s('circle', { cx: x(i), cy: y(p.v), r: i === lastIdx ? 6 : 10, fill: 'transparent' }, s('title', {}, p.t))),
      s('circle', { class: 'pt ' + o.cls, cx: x(lastIdx), cy: y(last.v), r: 6 }, s('title', {}, last.t)),
      o.unit ? s('text', { class: 'lbl', x: x(lastIdx) - 10, y: y(last.v) - 12, 'text-anchor': 'end' }, `${fmt(last.v, 1)} ${o.unit}`) : null);
  }

  function splitCard(closed) {
    const avg = (k) => closed.length ? closed.reduce((a, d) => a + (d.totals[k] || 0), 0) / closed.length : 0;
    const g = { p: avg('protein'), c: avg('carbs'), f: avg('fat') };
    const kc = { p: g.p * 4, c: g.c * 4, f: g.f * 9 };
    const tot = kc.p + kc.c + kc.f;
    const pct = (k) => tot > 0 ? Math.round(kc[k] / tot * 100) : 0;
    const item = (k, label, color) => h('div', { class: 'stack', style: { gap: '2px' } },
      h('span', { class: 'row small', style: { gap: '6px', 'font-weight': '800' } }, h('span', { class: 'sw', style: { background: color } }), label),
      h('span', { class: 'num', style: { 'font-size': '22px' }, text: pct(k) + '%' }),
      h('span', { class: 'tiny muted', text: `avg ${fmt(g[k])} g` }));
    return h('section', { class: 'card pop' },
      h('h2', { text: 'Where calories came from' }),
      tot > 0 ? h('div', { class: 'split', role: 'img', 'aria-label': `Protein ${pct('p')}%, carbs ${pct('c')}%, fat ${pct('f')}%` },
        h('span', { style: { flex: String(kc.p || 0.001), background: 'var(--protein)' } }),
        h('span', { style: { flex: String(kc.c || 0.001), background: 'var(--carbs)' } }),
        h('span', { style: { flex: String(kc.f || 0.001), background: 'var(--fat)' } })) : h('p', { class: 'muted small', text: 'No closed days with food yet.' }),
      h('div', { class: 'grid3' }, item('p', 'Protein', 'var(--protein)'), item('c', 'Carbs', 'var(--carbs)'), item('f', 'Fat', 'var(--fat)')),
      h('p', { class: 'tiny muted', text: 'Averages over closed days. Protein and carbs count 4 kcal per gram, fat 9.' }));
  }

  // ------------------------------------------------------------------ settings
  function viewSettings() {
    const st = S.settings;
    const themeSeg = h('div', { class: 'seg on-field grid', role: 'radiogroup', 'aria-label': 'Theme' });
    const drawTheme = () => themeSeg.replaceChildren(...[['light', 'Light', 'sun'], ['dark', 'Dark', 'moon'], ['mocha', 'Catppuccin', 'cat'], ['auto', 'Auto', 'auto']].map(([k, l, ic]) =>
      h('button', {
        type: 'button', role: 'radio', 'aria-checked': String(st.theme === k), onclick: async () => {
          st.theme = k; applyTheme(k); drawTheme();
          try { S.settings = await api('PUT', '/api/settings', { theme: k }); } catch (e) { fail(e); }
        },
      }, icon(ic, 18), l)));
    drawTheme();

    const goalDefs = [['kcal', 'Calories (kcal)', 1], ['water_ml', 'Water (L)', 1000], ['protein', 'Protein (g)', 1], ['carbs', 'Carbs (g)', 1], ['fat', 'Fat (g)', 1], ['fiber', 'Fiber (g)', 1]];
    const goalInputs = {};
    const goalsForm = h('form', {
      class: 'card pop', onsubmit: async (e) => {
        e.preventDefault();
        const goals = {};
        for (const [k, l, mult] of goalDefs) {
          const v = parseNum(goalInputs[k].value);
          if (v === null || v < 0) { toast(`Please check ${l}`, 'error'); goalInputs[k].focus(); return; }
          goals[k] = Math.round(v * mult * 100) / 100;
        }
        try { S.settings = await api('PUT', '/api/settings', { goals }); toast('Goals saved'); } catch (ex) { fail(ex); }
      },
    },
    h('h2', { text: 'Daily goals' }),
    h('div', { class: 'grid2' }, goalDefs.map(([k, l, mult]) => {
      const inp = h('input', { id: 'g-' + k, class: 'input', type: 'text', inputmode: 'decimal', value: String(Math.round(st.goals[k] / mult * 100) / 100) });
      goalInputs[k] = inp;
      return h('div', { class: 'field-wrap' }, h('label', { class: 'label', for: inp.id, text: l }), inp);
    })),
    h('button', { class: 'btn btn-primary btn-small', type: 'submit', text: 'Save goals' }));

    // Restore
    const fileIn = h('input', { id: 'file', class: 'sr', type: 'file', accept: 'application/json,.json' });
    const restoreArea = h('div', { class: 'stack' });
    fileIn.addEventListener('change', async () => {
      const f = fileIn.files && fileIn.files[0];
      if (!f) return;
      let text;
      try {
        text = await f.text();
        JSON.parse(text);
      } catch { toast("That file isn't valid JSON", 'error'); return; }
      try {
        const p = await api('POST', '/api/import/preview', text);
        let mode = 'merge';
        const modeSeg = h('div', { class: 'seg on-field', role: 'radiogroup', 'aria-label': 'Restore mode' });
        const explain = h('p', { class: 'tiny muted' });
        const drawMode = () => {
          modeSeg.replaceChildren(...[['merge', 'Merge'], ['replace', 'Replace all']].map(([k, l]) => h('button', { type: 'button', role: 'radio', 'aria-checked': String(mode === k), text: l, onclick: () => { mode = k; drawMode(); } })));
          explain.textContent = mode === 'merge'
            ? `Keeps everything here and adds the backup. Where both have the same day, food or meal, the backup's version wins (${p.days.matching} days, ${p.foods.matching} foods, ${p.meals.matching} meals overlap).`
            : `Deletes all ${p.current.days} days, ${p.current.foods} foods and ${p.current.meals} meals here first, then restores the backup exactly.`;
        };
        drawMode();
        restoreArea.replaceChildren(h('div', { class: 'card tight', style: { background: 'var(--field)', 'box-shadow': 'none' } },
          h('strong', { text: f.name }),
          h('p', { class: 'small', text: `Made ${p.exported_at ? new Date(p.exported_at).toLocaleString('en-GB') : 'at an unknown time'}.` }),
          h('p', { class: 'small', text: `${p.days.total} days${p.days.first ? ` (${fullDate(p.days.first)} – ${fullDate(p.days.last)})` : ''}, ${p.days.entries} logged items, ${p.foods.total} foods, ${p.meals.total} meals, plus settings.` }),
          modeSeg, explain,
          h('button', {
            class: 'btn btn-lace', type: 'button', text: 'Restore backup', onclick: async () => {
              const ok = await confirmBox(mode === 'replace' ? 'Replace everything?' : 'Merge this backup?',
                mode === 'replace' ? 'This removes all current data and can’t be undone. Export a backup first if you’re unsure.' : 'Matching days, foods and meals are overwritten by the backup.',
                mode === 'replace' ? 'Replace' : 'Merge');
              if (!ok) return;
              try {
                const r = await api('POST', '/api/import/' + mode, text);
                S.lib = null;
                const sess = await api('GET', '/api/session'); S.settings = sess.settings; applyTheme(S.settings.theme);
                toast(`Restored ${r.days} days, ${r.foods} foods, ${r.meals} meals`);
                restoreArea.replaceChildren(); fileIn.value = '';
                viewSettings();
              } catch (e) { fail(e); }
            },
          })));
      } catch (e) { fail(e); fileIn.value = ''; }
    });

    page('settings', [
      h('h1', { text: 'Settings' }),
      h('section', { class: 'card pop' }, h('h2', { text: 'Appearance' }), themeSeg,
        h('p', { class: 'tiny muted', text: "Catppuccin is the cosy Mocha flavour. Auto follows your phone or computer's dark mode setting." })),
      goalsForm,
      h('section', { class: 'card pop' }, h('h2', { class: 'water', text: 'Export backup' }),
        h('p', { class: 'small muted', text: 'One .json file with your settings, every day you logged, and your food library & meals. Keep it somewhere safe.' }),
        h('a', { class: 'btn btn-lace', href: '/api/export', download: '' }, icon('down', 18, 2.6), 'Download .json')),
      h('section', { class: 'card pop' }, h('h2', { class: 'wine', text: 'Restore backup' }),
        h('label', { for: 'file', class: 'btn btn-outline', style: { 'border-style': 'dashed', 'min-height': '84px', 'flex-direction': 'column', gap: '4px' } },
          icon('up', 26, 2.2), h('span', { text: 'Choose a backup file' }), h('span', { class: 'tiny muted', text: 'You will see a preview before anything changes' })),
        fileIn, restoreArea),
      h('section', { class: 'card pop', style: { 'flex-direction': 'row', 'align-items': 'center' } },
        h('div', { class: 'num', style: { width: '44px', height: '44px', 'border-radius': '50%', background: 'var(--tint)', color: 'var(--head)', display: 'flex', 'align-items': 'center', 'justify-content': 'center', 'font-size': '18px', 'flex-shrink': '0' }, text: (S.user || '?').slice(0, 1).toLowerCase() }),
        h('div', { class: 'grow' }, h('div', { style: { 'font-weight': '800' }, text: `Signed in as ${S.user}` }), h('div', { class: 'tiny muted', text: 'Accounts are managed on the server' })),
        h('button', {
          class: 'btn btn-outline btn-small', type: 'button', text: 'Log out', onclick: async () => {
            try { await api('POST', '/api/logout'); } catch { /* ignore */ }
            S.user = null; S.csrf = null; S.settings = null; S.lib = null;
            location.hash = '#/login'; renderLogin();
          },
        })),
      h('p', { class: 'tiny muted', style: { 'text-align': 'center' }, text: 'cute.syl.red · made with love' }),
    ]);
  }

  // ------------------------------------------------------------------ router
  async function route() {
    if (!S.user) {
      try {
        const sess = await api('GET', '/api/session');
        if (!sess.loggedIn) return renderLogin();
        S.user = sess.username; S.csrf = sess.csrf; S.settings = sess.settings;
        applyTheme(S.settings.theme);
      } catch (e) { return renderLogin(e.message); }
    }
    const raw = location.hash.replace(/^#/, '') || '/today';
    const [path, qs] = raw.split('?');
    const params = new URLSearchParams(qs || '');
    const parts = path.split('/').filter(Boolean);
    window.scrollTo(0, 0);
    switch (parts[0]) {
      case 'today': S.animateRing = true; return viewDay(null);
      case 'day': if (/^\d{4}-\d{2}-\d{2}$/.test(parts[1] || '')) { S.animateRing = true; return viewDay(parts[1]); } break;
      case 'add': if (/^\d{4}-\d{2}-\d{2}$/.test(parts[1] || '')) return viewAdd(parts[1], params); break;
      case 'foods':
        if (parts[1] === 'new') return viewFoodForm(null, params);
        if (/^\d+$/.test(parts[1] || '')) return viewFoodForm(parts[1], params);
        return viewLibrary('foods');
      case 'meals':
        if (parts[1] === 'new') return viewMealForm(null);
        if (/^\d+$/.test(parts[1] || '')) return viewMealForm(parts[1]);
        return viewLibrary('meals');
      case 'history': return viewHistory(params);
      case 'stats': return viewStats(params);
      case 'settings': return viewSettings();
      case 'login': location.hash = '#/today'; return undefined;
      default: break;
    }
    location.hash = '#/today';
    return undefined;
  }
  window.addEventListener('hashchange', route);
  route();
})();