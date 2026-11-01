// Web IDE chrome shared by the new grad and senior sides. A navigation rail picks what the side bar shows,
// every screen opens as an editor tab, and a status bar holds background state. Material Web has no rail,
// editor tabs or status bar, so they're built here from M3 tokens (styles in m3-shell.css).
const Shell = (() => {
  const sym = (n, slot) => App.sym(n, slot);
  const C = {};
  const tabs = {}, view = {}, collapsed = {}, preview = {};

  const root = role => document.querySelector(C[role].root);
  const $r = (role, sel) => root(role).querySelector(sel);
  const tabOf = (role, scr) => C[role].tabOf?.(scr) || scr;
  const current = role => App.state.role === role ? tabOf(role, App.state.screen) : 'home';

  // cfg: root, view, rail [{id, icon, label, badge?, tone?}], fab?, me {name, sub, screen} (the avatar opens Your twin),
  // tabs {screen: [label | () => label, icon]}, tabOf?, side(view) → {title, acts, body, foot?}, sideAfter?(view, el),
  // status() → html, search {label}, onSearch(), act(name, el), hidePreview(), showPreview(), closePreview()
  function register(role, cfg) {
    C[role] = cfg;
    tabs[role] = ['home'];
    view[role] = cfg.view;
    collapsed[role] = false;
    preview[role] = null;
    const r = root(role);
    r.querySelector('.wi-top').innerHTML = `<button class="wi-search md-typescale-body-medium" data-wi="search"><md-ripple></md-ripple><md-focus-ring></md-focus-ring>${sym('search')}<span>${cfg.search.label}</span><kbd class="md-typescale-label-small">⌘K</kbd></button>`;
    r.addEventListener('click', e => onClick(role, e));
    renderAll(role);
  }

  // ── rail ──
  function renderRail(role) {
    const c = C[role], onHome = !preview[role]?.active && current(role) === 'home';
    $r(role, '.wi-rail').innerHTML = `
      <button class="wi-home ${onHome ? 'on' : ''}" data-wi="home" aria-label="Home" title="Home"><md-ripple></md-ripple><md-focus-ring></md-focus-ring><span class="m3-logo">T</span></button>
      ${c.fab ? `<md-fab class="wi-fab" id="${c.fab.id}" variant="primary" aria-label="${c.fab.label}" title="${c.fab.label}" data-wi-act="${c.fab.act}"><md-icon slot="icon">${c.fab.icon}</md-icon></md-fab>` : ''}
      <div class="wi-dests" role="tablist" aria-label="Side bar">${c.rail.map(d => {
        const on = !collapsed[role] && view[role] === d.id, n = d.badge?.();
        return `<button class="wi-dest ${on ? 'on' : ''}" role="tab" aria-selected="${on}" data-wi-view="${d.id}" title="${d.label}"><md-focus-ring></md-focus-ring>
          <span class="wi-ind"><md-ripple></md-ripple>${sym(d.icon)}${d.badge ? `<span class="wi-badge ${d.tone || ''}" id="${d.badgeId}" ${n ? '' : 'hidden'}>${n}</span>` : ''}</span>
          <span class="wi-lab md-typescale-label-medium">${d.label}</span></button>`;
      }).join('')}</div>
      <span class="wi-grow"></span>
      <button class="wi-me ${!preview[role]?.active && current(role) === tabOf(role, c.me.screen) ? 'on' : ''}" data-wi="me" aria-label="Your twin · ${c.me.name}" title="Your twin"><md-ripple></md-ripple><md-focus-ring></md-focus-ring><span class="m3-avatar sm">${c.me.name[0]}</span></button>`;
  }

  // ── side bar: one view at a time ──
  function renderSide(role) {
    const side = $r(role, '.wi-side'), v = view[role];
    root(role).classList.toggle('side-off', collapsed[role]);
    if (collapsed[role]) { side.innerHTML = ''; return; }
    const s = C[role].side(v);
    side.innerHTML = `<header class="wi-side-h"><h2 class="md-typescale-title-small">${s.title}</h2><span class="wi-side-acts">${s.acts || ''}</span></header><div class="wi-side-b" data-view="${v}">${s.body}</div>${s.foot ? `<footer class="wi-side-foot">${s.foot}</footer>` : ''}`;
    C[role].sideAfter?.(v, side);
  }
  // pressing the open view again hides the side bar, as in VS Code
  function setView(role, v, force) {
    if (!force && view[role] === v && !collapsed[role]) collapsed[role] = true;
    else { view[role] = v; collapsed[role] = false; }
    renderRail(role); renderSide(role);
    C[role].relayout?.();
  }

  // ── editor tabs ──
  function renderTabs(role) {
    const c = C[role], p = preview[role], cur = current(role);
    const list = tabs[role].map(id => {
      const [label, ic] = c.tabs[id] || [id, 'tab'];
      return { id, label: typeof label === 'function' ? label() : label, ic, on: !p?.active && id === cur };
    });
    const closable = list.length + (p ? 1 : 0) > 1;
    const tab = t => `<div class="wi-tab ${t.on ? 'on' : ''} ${t.preview ? 'preview' : ''}" role="tab" aria-selected="${t.on}">
        <button class="wi-tab-main md-typescale-body-medium" ${t.preview ? 'data-wi="preview"' : `data-wi-tab="${t.id}"`} title="${t.label}${t.preview ? ' · preview' : ''}"><md-ripple></md-ripple><md-focus-ring></md-focus-ring>${sym(t.ic)}<span>${t.label}</span></button>
        ${closable ? `<md-icon-button class="wi-tab-x" ${t.preview ? 'data-wi="close-preview"' : `data-wi-x="${t.id}"`} aria-label="Close ${t.label}"><md-icon>close</md-icon></md-icon-button>` : ''}</div>`;
    $r(role, '.wi-tabs').innerHTML = list.map(tab).join('') + (p ? tab({ label: p.label, ic: p.icon, on: p.active, preview: true }) : '');
    $r(role, '.wi-tab.on')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  function renderStatus(role) { $r(role, '.wi-status').innerHTML = C[role].status(); }

  function renderAll(role) { renderRail(role); renderSide(role); renderTabs(role); renderStatus(role); }

  // App calls this after every screen change
  function sync(role, scr) {
    if (!C[role]) return;
    const t = tabOf(role, scr);
    if (!tabs[role].includes(t)) tabs[role].push(t);
    renderAll(role);
  }

  function openScreen(role, scr) {
    if (preview[role]?.active) C[role].hidePreview();
    if (App.state.role === role && App.state.screen === scr) { renderRail(role); renderTabs(role); }
    else App.set({ role, screen: scr });
  }

  function closeTab(role, id) {
    const i = tabs[role].indexOf(id);
    if (i < 0) return;
    tabs[role].splice(i, 1);
    if (!preview[role]?.active && current(role) === id) {
      const next = tabs[role][Math.min(i, tabs[role].length - 1)];
      if (next) { App.set({ screen: next }); return; }
      if (preview[role]) { C[role].showPreview(); return; }
    }
    renderTabs(role); renderRail(role);
  }

  // An opened review is a preview tab, as in VS Code: opening the next item replaces it
  function setPreview(role, p) {
    preview[role] = p ? { ...p, active: true } : null;
    renderRail(role); renderTabs(role);
  }
  function previewActive(role, on) {
    if (!preview[role]) return;
    preview[role].active = on;
    renderRail(role); renderTabs(role);
  }

  // refresh the parts that show counts or lists, without touching a side bar the viewer may be typing in
  function refresh(role, views) {
    if (!C[role]) return;
    renderRail(role);
    if (!collapsed[role] && (!views || views.includes(view[role]))) renderSide(role);
  }

  function onClick(role, e) {
    const el = e.target.closest('[data-wi],[data-wi-view],[data-wi-tab],[data-wi-x],[data-wi-screen],[data-wi-act]');
    if (!el || !root(role).contains(el)) return;
    const d = el.dataset;
    if (d.wiX) closeTab(role, d.wiX);
    else if (d.wiTab) openScreen(role, d.wiTab);
    else if (d.wiView) setView(role, d.wiView);
    else if (d.wiScreen) { if (d.wiSide) setView(role, d.wiSide, true); openScreen(role, d.wiScreen); }
    else if (d.wiAct) C[role].act(d.wiAct, el);
    else switch (d.wi) {
      case 'home': openScreen(role, 'home'); break;
      case 'me': openScreen(role, C[role].me.screen); break;
      case 'search': C[role].onSearch(); break;
      case 'preview': C[role].showPreview(); break;
      case 'close-preview': C[role].closePreview(); break;
    }
  }

  // Your twin is one page with tabs: what it knows, your year, and how Techne works for you
  function subTabs(el, items, cur) {
    el.innerHTML = `<md-tabs class="wi-subtabs" aria-label="Your twin" active-tab-index="${Math.max(0, items.findIndex(([s]) => s === cur))}">${items.map(([, l, ic]) => `<md-primary-tab><md-icon slot="icon">${ic}</md-icon>${l}</md-primary-tab>`).join('')}</md-tabs><div class="wi-twin-body"></div>`;
    el.querySelector('md-tabs').addEventListener('change', e => { const s = items[e.target.activeTabIndex]?.[0]; if (s && s !== App.state.screen) App.set({ screen: s }); });
    return el.querySelector('.wi-twin-body');
  }

  // ── Home: the VS Code welcome page, with Start and Recent on the left ──
  const TAG = { now: 'primary', done: 'ok', draft: 'tertiary', question: 'secondary', later: '' };
  const card = c => `<button class="wi-card ${c.featured ? 'featured' : ''}" ${c.attrs || ''}><md-ripple></md-ripple><md-focus-ring></md-focus-ring>
      <span class="wi-card-ic">${sym(c.icon)}</span>
      <span class="wi-card-t"><span class="md-typescale-title-small">${c.title}</span>${c.desc ? `<span class="md-typescale-body-medium m3-muted">${c.desc}</span>` : ''}</span>
      ${c.tag ? `<span class="wi-tag ${TAG[c.tone] ?? ''} md-typescale-label-medium">${c.tag}</span>` : ''}
      ${c.pct != null ? `<span class="wi-card-bar" style="--p:${c.pct}%" aria-label="${c.pct}% done"></span>` : ''}</button>`;
  function welcome(o) {
    return `<div class="wi-welcome">
      <header class="wi-wel-head"><h1 class="md-typescale-display-small">Techne</h1><p class="md-typescale-title-large m3-muted">${o.sub}</p></header>
      <div class="wi-wel-cols">
        <section>
          <h2 class="md-typescale-title-large">Start</h2>
          <ul class="wi-links">${o.start.map(([ic, l, attrs]) => `<li><md-text-button ${attrs}><md-icon slot="icon">${ic}</md-icon>${l}</md-text-button></li>`).join('')}</ul>
          <h2 class="md-typescale-title-large">Recent</h2>
          <ul class="wi-links recent">${o.recent.map(([l, path, attrs]) => `<li><md-text-button ${attrs}>${l}</md-text-button><span class="md-typescale-body-medium m3-muted">${path}</span></li>`).join('')}</ul>
        </section>
        <section>
          <div class="wi-wel-rh"><h2 class="md-typescale-title-large">${o.rt}</h2><span>${o.links.map(([l, attrs]) => `<md-text-button ${attrs}>${l}</md-text-button>`).join('')}</span></div>
          <div class="wi-cards">${o.cards.length ? o.cards.map(card).join('') : `<div class="wi-empty md-typescale-body-large">${sym('done_all')}You’re all caught up.</div>`}</div>
        </section>
      </div>
      <label class="wi-wel-foot md-typescale-body-medium"><md-checkbox checked touch-target="wrapper" data-wi-act="startup"></md-checkbox>Show Home on startup</label>
    </div>`;
  }

  // ⌘K / Ctrl+K opens the search, as the bar's hint says
  addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && C[App.state.role]) { e.preventDefault(); C[App.state.role].onSearch(); }
  });

  return { register, subTabs, sync, setView, setPreview, previewActive, refresh, renderStatus: role => C[role] && renderStatus(role), view: role => view[role], welcome, openScreen };
})();
