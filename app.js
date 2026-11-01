// App: prototype bar, state kept in the URL hash, theme, snackbars and shared M3 labels. The web IDE chrome is in shell.js.
const App = (() => {
  function rng(seed) {
    return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }

  // Box of an element relative to another (no scaling any more, so plain rect math)
  function rel(el, root) {
    const r = el.getBoundingClientRect(), s = root.getBoundingClientRect();
    return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height };
  }

  // M3 snackbar: one line of text, no icon
  function toast(html) {
    const t = document.getElementById('toast');
    t.classList.remove('has-btn');
    t.innerHTML = `<span class="m3-snackbar-text">${html}</span>`;
    t.classList.remove('in'); void t.offsetWidth; t.classList.add('in');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => t.classList.remove('in'), 4000);
  }

  // ── state, kept in the hash so a reload or shared link lands on the same view ──
  const SCREENS = {
    grad: [['home', 'Home'], ['ide', 'IDE'], ['save', 'Describe-task save'], ['archive', 'Your twin (archive)'], ['learn', 'Learning path'], ['onboard', 'Onboarding + permissions'], ['report', 'Year-end report']],
    senior: [['home', 'Home'], ['twin', 'Your twin'], ['queue', 'Question Queue'], ['repo', 'Company repository'], ['ide', 'Your IDE'], ['hot', 'Hot spots'], ['persona', 'How Techne’s questions are built'], ['report', 'Year-end report']],
    mobile: [['approvals', 'Senior · your twin’s drafts'], ['probes', 'Senior · Techne’s questions'], ['slack', 'New grad · Slack'], ['archive', 'New grad · your twin']],
  };
  const state = { role: 'grad', screen: 'home', wt: 'split', help: 'terminal', sc: 'checked', seen: '0', theme: 'light' };
  const modules = {};
  let started = null;

  // Short links for sharing (#queue, #repository…); the long key=value form is for local use
  const TOKENS = {
    ide: { role: 'grad', screen: 'ide' }, grad: { role: 'grad', screen: 'home' },
    senior: { role: 'senior', screen: 'home' }, home: { role: 'senior', screen: 'home' },
    repository: { role: 'senior', screen: 'repo' }, queue: { role: 'senior', screen: 'queue' },
    'senior-ide': { role: 'senior', screen: 'ide' }, hotspots: { role: 'senior', screen: 'hot' },
    archive: { role: 'grad', screen: 'archive' }, learning: { role: 'grad', screen: 'learn' },
    onboarding: { role: 'grad', screen: 'onboard' }, save: { role: 'grad', screen: 'save' },
    filecopy: { role: 'grad', screen: 'ide', sc: 'filecopy' }, restart: { role: 'grad', screen: 'ide', sc: 'restart' },
    seen: { role: 'grad', screen: 'ide', sc: 'checked', seen: '1' },
    persona: { role: 'senior', screen: 'persona' },
    'senior-twin': { role: 'senior', screen: 'twin' },
    inline: { role: 'grad', screen: 'ide', sc: 'checked', wt: 'inline' }, mobile: { role: 'mobile', screen: 'approvals' },
  };
  function hostTheme() {
    const t = document.documentElement.dataset.theme;
    if (t === 'dark' || t === 'light') return t;
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function readHash() {
    const h = location.hash.slice(1);
    if (TOKENS[h]) Object.assign(state, TOKENS[h]);
    else {
      const p = new URLSearchParams(h);
      for (const k in state) if (p.has(k)) state[k] = p.get(k);
    }
    if (!SCREENS[state.role]) state.role = 'grad';
    if (!SCREENS[state.role].some(([id, , r]) => id === state.screen && !r)) state.screen = SCREENS[state.role][0][0];
  }
  function writeHash() {
    try { history.replaceState(null, '', '#' + new URLSearchParams(state)); } catch { /* sandboxed frames may refuse */ }
  }

  function set(patch) {
    const prev = { ...state };
    Object.assign(state, patch);
    if (patch.role && patch.role !== prev.role && !patch.screen) state.screen = SCREENS[state.role][0][0];
    writeHash();
    apply(prev);
  }

  function apply(prev = {}) {
    if (document.documentElement.dataset.theme !== state.theme) document.documentElement.dataset.theme = state.theme;
    document.body.dataset.role = state.role;
    renderBar();
    document.getElementById('grad').hidden = state.role !== 'grad';
    document.getElementById('senior').hidden = state.role !== 'senior';
    document.getElementById('mobile').hidden = state.role !== 'mobile';
    const mod = modules[state.role];
    if (started !== state.role) {
      if (started) modules[started].stop();
      started = state.role;
      mod.start(state);
    } else {
      const restartKeys = state.role === 'grad' ? ['wt', 'help', 'sc', 'seen'] : [];
      if (restartKeys.some(k => prev[k] !== state[k])) mod.restart(state);
      else if (prev.screen !== state.screen) mod.show?.(state.screen);
      else if (prev.theme !== state.theme) mod.relayout?.();
    }
    // every screen is an editor tab in the web IDE
    Shell.sync(state.role, state.screen);
  }

  // ── prototype bar (M3: segmented buttons for the role, menus for everything else) ──
  // Material Web has no segmented button, so .m3-seg is built from the M3 spec: the selected segment shows a check
  const seg = (key, opts) => `<div class="m3-seg" role="radiogroup" data-key="${key}">${opts.map(([v, l, ic]) => {
    const on = state[key] === v;
    return `<button role="radio" aria-checked="${on}" class="${on ? 'on' : ''}" data-val="${v}"><md-ripple></md-ripple><md-focus-ring></md-focus-ring>${on ? sym('check') : ic ? sym(ic) : ''}<span>${l}</span></button>`;
  }).join('')}</div>`;
  const pick = (key, label, opts) => {
    const cur = opts.find(([v]) => v === state[key]) || opts[0];
    return `<span class="pb-pick"><md-text-button id="pb-${key}" data-menu="${key}" trailing-icon>${label} · ${cur[1]}${sym('arrow_drop_down', 'icon')}</md-text-button>
      <md-menu anchor="pb-${key}" positioning="popover" data-key="${key}">${opts.map(([v, l, off]) =>
        `<md-menu-item data-val="${v}" ${v === cur[0] ? 'selected' : ''} ${off ? 'disabled' : ''}><div slot="headline">${l}</div></md-menu-item>`).join('')}</md-menu></span>`;
  };

  function renderBar() {
    const bar = document.getElementById('pbar');
    bar.innerHTML = `
      <span class="pb-name md-typescale-title-small"><i class="pb-dot"></i>Prototype</span>
      ${seg('role', [['grad', 'New grad', 'school'], ['senior', 'Senior', 'person'], ['mobile', 'Mobile', 'smartphone']])}
      <span class="pb-sep"></span>
      ${pick('screen', 'Screen', SCREENS[state.role].map(([id, label, round]) => [id, label, round]))}
      ${state.role === 'grad' && (state.screen === 'ide' || state.screen === 'save') ? `
        <span class="pb-sep"></span>
        ${pick('sc', 'Scenario', [['checked', 'Covered'], ['unchecked', 'Not covered'], ['filecopy', 'File copy'], ['restart', 'Restart after failure']])}
        ${state.sc === 'checked' ? pick('seen', 'Seen before', [['0', 'Off'], ['1', 'On']]) : ''}
        ${pick('wt', 'Walkthrough', [['split', 'Split'], ['glass', 'Glass'], ['inline', 'Inline'], ['both', 'Both']])}
        ${pick('help', 'Help', [['terminal', 'Terminal'], ['corner', 'Corner']])}` : ''}
      <span class="pb-right">
        <md-icon-button id="pb-theme" aria-label="Switch to ${state.theme === 'dark' ? 'light' : 'dark'} theme" title="Switch to ${state.theme === 'dark' ? 'light' : 'dark'} theme">${sym(state.theme === 'dark' ? 'light_mode' : 'dark_mode')}</md-icon-button>
        <md-text-button id="pb-replay" title="Replay this screen. Press H to hide this bar.">${sym('replay', 'icon')}Replay</md-text-button>
      </span>`;
    bar.querySelectorAll('.m3-seg').forEach(s => s.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (b && state[s.dataset.key] !== b.dataset.val) set({ [s.dataset.key]: b.dataset.val });
    }));
    bar.querySelectorAll('[data-menu]').forEach(b => b.addEventListener('click', () => {
      const m = bar.querySelector(`md-menu[data-key="${b.dataset.menu}"]`);
      m.open = !m.open;
    }));
    bar.querySelectorAll('md-menu').forEach(m => m.addEventListener('close-menu', e => {
      const v = e.detail.initiator?.dataset.val, key = m.dataset.key;
      if (v != null && state[key] !== v) set({ [key]: v });
    }));
    bar.querySelector('#pb-theme').onclick = () => set({ theme: state.theme === 'dark' ? 'light' : 'dark' });
    bar.querySelector('#pb-replay').onclick = replay;
  }

  // Replay puts every module back to how a fresh load finds it
  function replay() {
    try { localStorage.removeItem('techne-sent-priya'); } catch { /* blocked */ }
    Grad.reset(); GradPages.reset(); Senior.hardReset(); SeniorPages.reset();
    modules[state.role].restart(state);
  }

  function start() {
    modules.grad = Grad;
    modules.senior = Senior;
    modules.mobile = Mobile;
    Grad.init();
    Senior.init();
    Mobile.init();
    state.theme = hostTheme();
    readHash();
    // Loading the senior IDE (start of the story) or the file-copy task (before Maya sends anything) clears a send
    // left over from an earlier run-through, in every open tab. Works for short links and reloads alike.
    if ((state.role === 'senior' && state.screen === 'ide') || (state.role === 'grad' && state.sc === 'filecopy')) {
      try { localStorage.removeItem('techne-sent-priya'); } catch { /* blocked */ }
    }
    writeHash();
    apply();
    // follow the viewer's own theme switch
    new MutationObserver(() => {
      const t = document.documentElement.dataset.theme;
      if ((t === 'dark' || t === 'light') && t !== state.theme) { state.theme = t; writeHash(); renderBar(); }
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    addEventListener('keydown', e => {
      if (e.key.toLowerCase() !== 'h' || e.metaKey || e.ctrlKey) return;
      if (/INPUT|TEXTAREA|SELECT|TEXT-FIELD/.test(document.activeElement.tagName) || document.activeElement.isContentEditable) return;
      document.body.classList.toggle('bar-hidden');
      modules[state.role].relayout?.();
    });
    addEventListener('resize', () => modules[state.role].relayout?.());
    // a short link typed into an open tab works like a fresh visit to it
    addEventListener('hashchange', () => {
      const h = location.hash.slice(1);
      if (TOKENS[h]) set({ seen: '0', sc: 'checked', ...TOKENS[h] });
    });
    document.addEventListener('click', e => {
      if (!e.target.closest('.synth, .m3-synth')) return;
      e.preventDefault(); e.stopPropagation();
      set({ role: 'senior', screen: 'persona' });
    }, true);
  }

  // Small shared pieces used by several screens (Material 3)
  const twinName = id => id ? DATA.twins[id].name : null;
  const sym = (n, slot = '') => `<md-icon${slot ? ` slot="${slot}"` : ''}>${n}</md-icon>`;
  // data.js still names icons the v3 way; this maps them to Material Symbols
  const MS = { video: 'videocam', message: 'chat', user: 'person', users: 'group', twin: 'diversity_3', sparkle: 'auto_awesome', alert: 'warning', shield: 'verified_user', clock: 'schedule', eye: 'visibility', x: 'close', arrow: 'arrow_forward', coin: 'toll', play: 'play_arrow', record: 'fiber_manual_record', graph: 'hub', flame: 'local_fire_department', report: 'insights', book: 'menu_book', bell: 'notifications', phone: 'smartphone', git: 'commit', copy: 'content_copy', buoy: 'support', panel: 'view_sidebar', branch: 'call_split', hash: 'tag', clip: 'attach_file', plus: 'add', file: 'description', archive: 'inventory_2', sun: 'light_mode', moon: 'dark_mode' };
  const msName = n => MS[n] || n;
  // status label: not a control, so it isn't a chip. kind is ok | warn | bad | info
  const STAT_ICON = { ok: 'verified', warn: 'warning', bad: 'help', info: 'info' };
  const status = (kind, label, ic, mini) => `<span class="m3-status ${kind}${mini ? ' mini' : ''}">${sym(ic || STAT_ICON[kind])}${label}</span>`;
  const synth = () => `<md-assist-chip class="m3-synth" label="Synthetic" title="Asks as a synthetic new grad. Click to see how it’s built."><md-icon slot="icon">auto_awesome</md-icon></md-assist-chip>`;
  const STATUS = {
    verified: ['Verified', 'verified', 'ok'],
    inferred: ['Inferred', 'warning', 'warn'],
    unknown: ['No twin covers this', 'help', 'bad'],
    general: ['General knowledge', 'menu_book', 'info'],
  };
  // "Priya R.'s twin · Verified" style tag for a step
  function stepTag(s, mini = false) {
    const [label, ic, kind] = STATUS[s.status];
    const who = s.twin ? `${twinName(s.twin)}’s twin` : 'Senior Techne';
    return status(kind, s.status === 'general' || s.status === 'unknown' ? label : `${who} · ${label}`, ic, mini);
  }

  // Toast with an Undo button; calls undo() if pressed within ~5 s
  function undoToast(html, undo) {
    const t = document.getElementById('toast');
    t.innerHTML = `<span class="m3-snackbar-text">${html}</span><md-text-button class="m3-snack-action">Undo</md-text-button>`;
    t.classList.remove('in'); void t.offsetWidth; t.classList.add('in', 'has-btn');
    t.querySelector(".m3-snack-action").onclick = () => { undo(); t.classList.remove('in'); };
    clearTimeout(toast.t);
    toast.t = setTimeout(() => t.classList.remove('in', 'has-btn'), 6000);
  }

  return { sym, msName, status, rng, rel, toast, undoToast, set, start, state, twinName, synth, stepTag, STATUS };
})();
