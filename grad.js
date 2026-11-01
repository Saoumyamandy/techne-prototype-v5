// New grad view: the Techne IDE, three scenarios, and three ways Senior Techne walks you through them.
// Every answer names the twin it came from, or says that no twin covers it.
const Grad = (() => {
  const $ = s => document.querySelector(s);
  const sym = (n, slot) => App.sym(n, slot);
  // data.js still names icons the v3 way (video, twin, users…)
  const ms = n => App.msName(n);
  let timers = [];
  const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };

  let root, ide, editor, termBody, layer, svg, sp, divider, side, gpage, modal;
  let S, opts;
  let step = -1, ready = false, seniorOn = true, patched = false, screen = 'home', sentToPriya = false, begun = false, pendingAsk = false, pinned = false;
  const knownMode = () => opts.seen === '1' && S.known;
  let placed = null;
  let anchored = [];
  let panelW = 460;

  const KW = new Set(('IDENTIFICATION DIVISION PROGRAM-ID ENVIRONMENT INPUT-OUTPUT SECTION FILE-CONTROL SELECT ASSIGN TO ORGANIZATION IS INDEXED ' +
    'RECORD KEY DATA FILE FD COPY WORKING-STORAGE PIC VALUE ZERO PROCEDURE OPEN I-O INPUT PERFORM UNTIL CLOSE STOP RUN READ AT END MOVE NOT ADD ' +
    'END-READ END-PERFORM DISPLAY LINE SEQUENTIAL IF ELSE END-IF NUMERIC').split(' '));

  function hlCobol(text) {
    if (/^ {6}\*/.test(text)) return `<span class="c-cm">${text}</span>`;
    return text.replace(/("[^"]*")|(\b\d[\dV()]*)|([A-Z][A-Z0-9-]*)/g, (m, str, num, word) => {
      if (str) return `<span class="c-str">${str}</span>`;
      if (num) return `<span class="c-num">${num}</span>`;
      if (KW.has(word)) return `<span class="c-kw">${word}</span>`;
      if (word.includes('-') || word.length > 3) return `<span class="c-id">${word}</span>`;
      return word;
    });
  }
  function hlSh(text) {
    if (/^\s*#/.test(text)) return `<span class="c-cm">${text}</span>`;
    return text.replace(/("[^"]*")|(\$\w+)|\b(cp|touch|set|mkdir)\b|(--?[\w-]+)/g, (m, str, v, kw, flag) => {
      if (str) return `<span class="c-str">${str}</span>`;
      if (v) return `<span class="c-id">${v}</span>`;
      if (kw) return `<span class="c-kw">${kw}</span>`;
      return `<span class="c-num">${flag}</span>`;
    });
  }
  function hlJcl(l) {
    if (/^\/\/\*/.test(l)) return `<span class="c-cm">${l}</span>`;
    return l.replace(/^(\/\/\w*)/, '<span class="c-id">$1</span>')
      .replace(/\b(JOB|EXEC|DD|PGM|DSN|DISP|CLASS|MSGCLASS|PARM|SHR|OLD)\b/g, '<span class="c-kw">$1</span>')
      .replace(/('[^']*')/g, '<span class="c-str">$1</span>');
  }
  const hl = t => S.lang === 'sh' ? hlSh(t) : S.lang === 'jcl' ? hlJcl(t) : hlCobol(t);

  // ── IDE chrome ──
  function renderTree() {
    $('#tree').innerHTML = DATA.tree.map(f => {
      const chev = f.dir ? `<md-icon class="chev">${f.closed ? 'chevron_right' : 'expand_more'}</md-icon>` : '';
      const open = f.name === S.file;
      return `<li id="${DATA.fid(f.name)}" class="${f.dir ? 'dir' : 'file'} ${open && screen !== 'home' && ['ide', 'save'].includes(screen) ? 'on' : ''} ${open ? 'open' : ''}" style="--d:${f.depth}" ${open ? 'data-wi-screen="ide" title="Open ' + f.name + '"' : ''}>${chev}<md-icon>${f.dir ? 'folder' : 'description'}</md-icon><span>${f.name}</span></li>`;
    }).join('');
  }

  // Where the fix goes: a line number, or the line holding one of the scenario's marks
  const fixAt = () => S.fix.at === 'errLine' ? S.errLine : S.lineOf(S.fix.at);
  function codeLines() {
    if (!patched) return S.code;
    const at = fixAt();
    return [...S.code.slice(0, at - 1), ...S.fix.lines, ...S.code.slice(at - 1 + S.fix.replace)];
  }
  function renderEditor() {
    const at = patched ? fixAt() : 0;
    const added = patched ? [at, at + S.fix.lines.length - 1] : null;
    editor.innerHTML = codeLines().map((l, i) => {
      const n = i + 1;
      let src = hl(l);
      // wrap each mark's text in a span the walkthrough can point at
      for (const [id, text] of Object.entries(S.marks)) {
        const pos = l.indexOf(text);
        if (pos < 0 || (patched && id === 't-err')) continue;
        src = hl(l.slice(0, pos)) + `<span id="${id}">${hl(text)}</span>` + hl(l.slice(pos + text.length));
        break;
      }
      const isAdded = added && n >= added[0] && n <= added[1];
      return `<div class="ln ${isAdded ? 'added' : ''}" data-n="${n}"><span class="n">${n}</span><span class="lc">${src || ' '}</span></div>`;
    }).join('');
  }
  function scrollToLine(n) {
    const el = editor.querySelector(`.ln[data-n="${n}"]`);
    if (el) editor.scrollTop = Math.max(0, el.offsetTop - editor.clientHeight / 3);
  }

  // ── terminal ──
  function line(html, cls = '') {
    const d = document.createElement('div');
    d.className = 'tl ' + cls;
    d.innerHTML = html;
    termBody.appendChild(d);
    termBody.scrollTop = termBody.scrollHeight;
    return d;
  }
  const PROMPT = '<span class="pr">maya@techne</span> <span class="pd">procurement-core</span> <span class="pc">%</span> ';
  function newPrompt() {
    termBody.querySelectorAll('.caret').forEach(c => c.remove());
    return line(`<span class="pwrap">${PROMPT}<span class="cmd"></span><span class="caret"></span></span>`, 'prompt');
  }
  function type(promptEl, text, done) {
    const cmd = promptEl.querySelector('.cmd');
    let i = 0;
    const tick = () => {
      cmd.textContent = text.slice(0, ++i);
      if (i < text.length) later(tick, 18 + Math.random() * 24);
      else later(() => { promptEl.querySelector('.caret')?.remove(); done && done(); }, 220);
    };
    later(tick, 120);
  }
  function typeAll(cmds, firstPrompt, done) {
    const next = (i, p) => {
      if (i >= cmds.length) return done();
      type(p, cmds[i], () => next(i + 1, i + 1 < cmds.length ? newPrompt() : null));
    };
    next(0, firstPrompt);
  }
  function chain(lines, done) {
    let t = 0;
    lines.forEach(([cls, html], i) => { t += i ? 170 : 260; later(() => line(cls ? `<span class="${cls}">${html}</span>` : html), t); });
    later(done, t + 120);
  }

  const helpBtn = () => opts.help === 'corner' ? $('#help-corner') : $('#help-term');
  // the corner FAB extends to show its label while it nudges
  function nudge(on) {
    helpBtn().classList.toggle('nudge', on);
    const fab = $('#help-corner md-fab');
    if (fab) fab.label = $('#help-corner').classList.contains('nudge') ? 'Need help?' : '';
  }
  function setError(on) {
    if (S.error) editor.querySelector(`.ln[data-n="${S.errLine}"]`)?.classList.toggle('err', on);
    $('#problems').hidden = !on;
    if (on) scrollToLine(S.errLine);
  }

  // Opening state: a failing run, or (file copy) a fresh branch for a ticket
  function runStart() {
    line('<span class="mut">Last login: Fri Oct 30 09:31:04 on ttys002</span>');
    const after = () => {
      newPrompt().id = 't-prompt';
      ready = true;
      if (S.error) setError(true);
      if (pendingAsk) { pendingAsk = false; later(openHelp, 300); return; }
      later(() => {
        helpBtn().classList.add('ready');
        if (seniorOn) showNudge();
      }, 900);
    };
    if (S.error) {
      const p = newPrompt();
      later(() => type(p, S.run, () => chain(S.fail(S.errLine), after)), 700);
      return;
    }
    let t = 600;
    S.intro.forEach(([kind, text]) => {
      if (kind === 'cmd') {
        later(() => { const p = newPrompt(); p.querySelector('.cmd').textContent = text; p.querySelector('.caret').remove(); }, t);
        t += 450;
      } else { later(() => line(kind ? `<span class="${kind}">${text}</span>` : text), t); t += 200; }
    });
    later(after, t + 200);
  }

  // ── cards anchored to the help button ──
  function makeCard(cls, html, parent = layer) {
    const c = document.createElement('div');
    c.className = cls;
    c.innerHTML = html;
    parent.appendChild(c);
    return c;
  }
  function anchor(card) {
    const b = App.rel(helpBtn(), root);
    card.style.left = `${Math.max(12, b.x + b.w - card.offsetWidth)}px`;
    card.style.bottom = `${root.clientHeight - b.y + 10}px`;
    if (!anchored.includes(card)) anchored.push(card);
  }
  function dropAnchored() { anchored.forEach(c => c.remove()); anchored = []; }

  // Who the answer comes from. Never an unnamed "Senior Techne" answer.
  const fromLine = a => a.twin ? `answering from ${App.twinName(a.twin)}’s twin` : 'no twin covers this yet';
  function verifRow(a) {
    if (!a.twin) return `<div class="verif warn"><span class="wic">${sym('help')}</span><div class="vtext"><div class="md-typescale-title-small">No senior’s twin covers this yet</div><div class="md-typescale-body-small">A best guess. Your fix goes to seniors to check.</div></div></div>`;
    const t = DATA.twins[a.twin];
    const counts = S.steps.reduce((m, s) => (m[s.status] = (m[s.status] || 0) + 1, m), {});
    const badge = a.mixed
      ? App.status(counts.inferred ? 'warn' : 'ok', ['verified', 'inferred', 'general'].filter(k => counts[k]).map(k => `${counts[k]} ${k}`).join(' · '))
      : App.status('ok', 'Verified');
    return `<div class="verif"><span class="m3-avatar sm">${t.initial}</span><div class="vtext"><div class="md-typescale-title-small">From ${t.name}’s twin</div><div class="md-typescale-body-small m3-muted">${t.role}</div></div>${badge}</div>`;
  }
  // card header: who is speaking, what they noticed, and a dismiss button
  const pinBtn = () => `<md-icon-button data-act="pin" title="Pin to the Ask panel" aria-label="Pin to the Ask panel">${sym('push_pin')}</md-icon-button>`;
  const cardHead = (ic, who, what, pin) => `<div class="ahead">${sym(ic)}<span class="md-typescale-title-small">${who}</span><span class="md-typescale-body-small m3-muted">${what}</span>${pin ? pinBtn() : ''}<md-icon-button data-act="dismiss" aria-label="Dismiss">${sym('close')}</md-icon-button></div>`;
  // code to run, with its actions under it
  const codeBox = (code, acts) => `<div class="g-code">${code}</div><div class="g-code-acts">${acts}</div>`;
  const runBtn = label => `<md-filled-button data-act="run">${sym('play_arrow', 'icon')}${label}</md-filled-button>`;

  // Help fades with what you know: one line and one click when your twin already holds the fix
  function showKnown() {
    dropAnchored();
    nudge(false);
    const K = S.known;
    const c = makeCard('acard glass seen-card', `
      ${cardHead('diversity_3', 'Your twin', 'has this one')}
      <div class="seen-line md-typescale-title-medium">${K.line}</div>
      ${codeBox(K.code, runBtn('Run in terminal'))}
      <div class="seen-foot">${App.status('ok', K.when, 'inventory_2', true)}<md-text-button data-act="all-steps" trailing-icon>Show all steps${sym('expand_more', 'icon')}</md-text-button></div>`);
    anchor(c);
  }

  function showNudge() {
    if (step >= 0 || !sp.hidden || anchored.length || screen !== 'ide') return;
    if (knownMode()) { showKnown(); return; }
    nudge(true);
    const a = S.answer;
    const c = makeCard('acard glass nudge-card', `
      ${cardHead('auto_awesome', 'Senior Techne', S.error ? 'noticed this error' : 'noticed your ticket')}
      <div class="ftitle md-typescale-title-medium">${a.title}</div>
      <div class="fmeta md-typescale-body-small m3-muted">${S.nudge || `Walkthrough · ${S.steps.length} steps · about ${a.minutes} min`}</div>
      ${verifRow(a)}
      <div class="facts"><md-filled-button data-act="walk" trailing-icon>Walk me through it${sym('arrow_forward', 'icon')}</md-filled-button><md-text-button data-act="dismiss">Not now</md-text-button></div>`);
    anchor(c);
  }

  function searchHTML() {
    return `
      <div class="srow done">${sym('check_circle')}<span>${S.error ? 'Read your terminal' : 'Read your ticket'}</span><code>${S.short}</code></div>
      <div class="srow" data-search><md-circular-progress indeterminate aria-label="Asking"></md-circular-progress><span>Asking the twins who know this</span></div>
      <div class="srcs" data-srcs></div>`;
  }
  function runSearch(box, done) {
    S.answer.sources.forEach((t, i) => later(() => {
      const s = document.createElement('md-assist-chip');
      s.className = 'src';
      s.setAttribute('label', t);
      s.innerHTML = '<md-icon slot="icon">link</md-icon>';
      box.querySelector('[data-srcs]').appendChild(s);
    }, 340 + i * 320));
    later(() => {
      const r = box.querySelector('[data-search]');
      const a = S.answer;
      r.classList.add('done');
      if (!a.twin) r.classList.add('warn');
      r.innerHTML = `${sym(a.twin ? 'check_circle' : 'warning')}<span>${a.twin ? `${App.twinName(a.twin)}’s twin knows this` : 'No twin covers this. Drafted a best guess'}</span>`;
      done();
    }, 1400);
  }
  const foundHTML = (a, withActs) => `
    <div class="ftitle md-typescale-title-medium">${a.title}</div>
    <div class="fmeta md-typescale-body-small m3-muted">Walkthrough · ${S.steps.length} steps · about ${a.minutes} min</div>
    ${verifRow(a)}
    <div class="fnote md-typescale-body-small">${a.note}</div>
    ${withActs ? `<div class="facts"><md-filled-button data-act="walk" trailing-icon>Walk me through it${sym('arrow_forward', 'icon')}</md-filled-button><md-text-button data-act="ask">Ask a senior instead</md-text-button></div>` : ''}`;

  // All three entry points (terminal button, corner button, "Ask Senior Techne") open this one card
  function openHelp() {
    if (screen !== 'ide') App.set({ screen: 'ide' });
    if (!ready) { pendingAsk = true; App.toast('Senior Techne is reading your workspace…'); return; }
    dropAnchored();
    nudge(false);
    if (knownMode()) { showKnown(); return; }
    if (!['glass', 'inline'].includes(opts.wt)) { openPanel(true); return; }
    clearGuide();
    const c = makeCard('acard glass', `
      ${cardHead('auto_awesome', 'Senior Techne', 'is looking into it', true)}
      ${searchHTML()}<div class="found" data-found hidden></div>`);
    anchor(c);
    runSearch(c, () => {
      const f = c.querySelector('[data-found]');
      f.innerHTML = foundHTML(S.answer, true);
      f.hidden = false;
    });
  }

  // ── step focus ──
  function focusOn(s) {
    if (s.spot.some(sel => !$(sel))) { Shell.setView('grad', 'files', true); renderTree(); }
    clearFocus();
    s.spot.forEach(sel => {
      const el = $(sel);
      if (!el) return;
      el.classList.add('spot');
      el.closest('.ln, .tl, li')?.classList.add('target');
    });
    const first = $(s.spot[0]);
    const kind = first?.closest('.ln') ? 'code' : first?.closest('li') ? 'tree' : 'term';
    // Split keeps the code readable: highlight only, no dimming
    if (opts.wt !== 'split') ide.dataset.focus = kind;
    if (kind === 'code') { const ln = first.closest('.ln'); if (ln) scrollToLine(+ln.dataset.n); }
  }
  function clearFocus() {
    document.querySelectorAll('#grad .spot').forEach(e => e.classList.remove('spot'));
    document.querySelectorAll('#grad .target').forEach(e => e.classList.remove('target'));
    delete ide.dataset.focus;
  }
  function clearGuide() {
    layer.querySelectorAll('.gcard').forEach(c => c.remove());
    svg.innerHTML = '';
    placed = null;
    clearFocus();
  }

  // Lead with one short line; anything after the first sentence goes behind "More"
  function brief(html) {
    const m = html.match(/^(.+?[.!?])\s+(?=[A-Z<])(.+)$/s);
    if (!m) return `<p>${html}</p>`;
    return `<p>${m[1]}</p><details class="more"><summary>More</summary><p>${m[2]}</p></details>`;
  }
  const codeBlock = s => s.code ? codeBox(s.code.replace(/</g, '&lt;'),
    `<md-text-button data-act="copy">${sym('content_copy', 'icon')}<span>Copy</span></md-text-button>${runBtn(S.fix.label)}`) : '';
  const noteHTML = s => s.note ? `<div class="gnote">${sym('info')}<span>${s.note}</span></div>` : '';
  const sentHTML = s => !s.sentTo ? ''
    : sentToPriya ? `<div class="sent-to done">${sym('check_circle')}<span>Sent to ${App.twinName(s.sentTo)} · it’s in her drafts to confirm</span></div>`
    : `<div class="sent-to">${sym('warning')}<span>Inferred: nobody has verified this yet.</span><md-filled-tonal-button data-act="send-priya">${sym('send', 'icon')}Send to Priya</md-filled-tonal-button></div>`;
  // The inferred step lands first in Priya's drafts, in this tab and in any other open tab
  function sendToPriya() {
    sentToPriya = true;
    try { localStorage.setItem('techne-sent-priya', String(Date.now())); } catch { /* storage blocked: same-tab only */ }
    Senior.receiveSent();
    App.toast('Sent to Priya R. It’s first in her drafts.');
    if (opts.wt === 'split') showPanelStep(step); else showGlassStep(step);
  }
  // A step with a trail shows where the knowledge came from, end to end; others keep a one-line source
  const whereHTML = s => s.trail
    ? `<details class="where"><summary>${sym('info')}Where this comes from</summary><ol class="trail">${s.trail.map(([when, ic, what, sub]) =>
        `<li><span class="tr-dot">${sym(ms(ic))}</span><div>${when ? `<span class="tr-when">${when}</span>` : ''}<b>${what}</b>${sub ? `<span class="tr-sub">${sub}</span>` : ''}</div></li>`).join('')}</ol></details>`
    : `<details class="where"><summary>${sym('info')}Where this comes from</summary><p>${s.source}</p></details>`;

  // Glass and Both: the step floats as a glass card pinned to the code
  function showGlassStep(i) {
    clearGuide();
    step = i;
    const s = S.steps[i];
    helpBtn().classList.add('away');
    focusOn(s);
    const dots = S.steps.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('');
    const inline = opts.wt === 'inline';
    const c = makeCard(`gcard glass ${inline ? 'inline' : ''}`, `
      ${inline ? '<i class="notch"></i>' : `<span class="badge md-typescale-label-large">${i + 1}</span>`}
      <div class="ghead"><span class="md-typescale-label-medium">Step ${i + 1} of ${S.steps.length}</span><span class="ghead-acts">${pinBtn()}<md-icon-button data-act="end" title="End walkthrough" aria-label="End walkthrough">${sym('close')}</md-icon-button></span></div>
      ${App.stepTag(s)}
      <h4 class="md-typescale-title-medium">${s.title}</h4>
      ${brief(s.body)}
      ${sentHTML(s)}${codeBlock(s)}${noteHTML(s)}${whereHTML(s)}
      <div class="gfoot">
        <span class="dots">${dots}</span>
        <div class="gbtns">
          ${i > 0 ? '<md-text-button data-act="back">Back</md-text-button>' : ''}
          ${i < S.steps.length - 1 ? `<md-filled-button data-act="next" trailing-icon>Next${sym('arrow_forward', 'icon')}</md-filled-button>` : ''}
        </div>
      </div>
      <div class="g-ask"><md-outlined-text-field class="g-ask-q" placeholder="Ask a follow-up" aria-label="Ask a follow-up. It continues in the Ask panel."><md-icon slot="leading-icon">auto_awesome</md-icon><md-icon-button slot="trailing-icon" data-act="inline-send" aria-label="Send">${sym('arrow_upward')}</md-icon-button></md-outlined-text-field></div>`);
    c.querySelector('.g-ask-q').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); askFromInline(); } });
    placed = { card: c, s };
    place();
    if (opts.wt === 'both') renderProgress();
  }

  function place() {
    if (!placed) return;
    const { card, s } = placed;
    const T = App.rel($(s.target), root);
    const cw = card.offsetWidth, ch = card.offsetHeight;
    let x, y;
    if (opts.wt === 'inline') {
      const W = root.clientWidth, H = root.clientHeight;
      x = Math.min(Math.max(T.x - 18, 12), W - cw - 12);
      y = T.y + T.h + 14;
      const above = y + ch > H - 12;
      if (above) y = Math.max(12, T.y - ch - 14);
      card.classList.toggle('above', above);
      card.style.left = `${x}px`;
      card.style.top = `${y}px`;
      card.style.setProperty('--notch', `${Math.min(Math.max(T.x + Math.min(T.w / 2, 36) - x, 18), cw - 26)}px`);
      svg.innerHTML = '';
      return;
    }
    if (s.place === 'editor') {
      const E = App.rel(editor, root);
      x = E.x + E.w - cw - 32;
      y = T.y - 52;
      if (x < T.x + T.w + 60) { x = Math.max(E.x + 24, T.x + 20); y = T.y + T.h + 30; }
      y = Math.min(Math.max(y, E.y + 12), root.clientHeight - ch - 12);
    } else if (s.place === 'side') {
      const Sd = App.rel(side, root);
      x = Sd.x + Sd.w + 28;
      y = Math.min(T.y - 30, root.clientHeight - ch - 12);
    } else {
      const R = App.rel($('#term'), root);
      x = R.x + R.w - cw - 24;
      y = Math.max(12, R.y + R.h - ch - 20);
    }
    card.style.left = `${x}px`;
    card.style.top = `${y}px`;
    const x1 = x - 15, y1 = y + 33, x2 = T.x + T.w + 10, y2 = T.y + T.h / 2;
    const dx = Math.max(50, Math.abs(x1 - x2) * .45);
    svg.innerHTML = `<path class="cpath" d="M${x1} ${y1} C ${x1 - dx} ${y1}, ${x2 + dx} ${y2}, ${x2} ${y2}"/>
      <circle class="chalo" cx="${x2}" cy="${y2}" r="11"/><circle class="cdot" cx="${x2}" cy="${y2}" r="4"/>`;
  }

  // ── the Ask panel: Senior Techne's chat, and where a walkthrough goes when you pin it ──
  function panelShell(mode, thread, sugg, placeholder) {
    sp.hidden = false;
    divider.hidden = false;
    sp.style.width = `${panelW}px`;
    sp.dataset.mode = mode;
    const ctx = S.error ? `${S.file}:${S.errLine}` : S.ticket;
    sp.innerHTML = `
      <div class="sp-head"><span class="sp-av">${sym('auto_awesome')}</span><div class="sp-title"><span class="md-typescale-title-medium">Senior Techne</span><span class="sp-from md-typescale-body-small m3-muted">${mode === 'chat' ? '· ask anything' : ''}</span></div>
        ${pinned ? `<md-icon-button data-act="unpin" title="Unpin: back onto the code" aria-label="Unpin: back onto the code">${sym('keep_off')}</md-icon-button>` : ''}
        <md-icon-button data-act="close-panel" title="Close" aria-label="Close">${sym('close')}</md-icon-button></div>
      <div class="sp-ctx" id="sp-ctx">
        <span class="ctx-label md-typescale-label-medium">Context</span>
        <md-chip-set id="sp-chips">
          ${mode === 'chat' ? '' : `<md-assist-chip label="${S.error ? 'Terminal output' : S.ticket}"><md-icon slot="icon">${S.error ? 'terminal' : 'link'}</md-icon></md-assist-chip>`}
          <md-assist-chip label="${S.error && mode !== 'chat' ? ctx : S.file}"><md-icon slot="icon">description</md-icon></md-assist-chip>
          <md-assist-chip class="add" data-act="add-ctx" label="Add context"><md-icon slot="icon">add</md-icon></md-assist-chip>
        </md-chip-set>
      </div>
      <div class="sp-thread" id="sp-thread">${thread}</div>
      <md-chip-set class="sp-sugg">${sugg.map(q => `<md-suggestion-chip data-act="sugg" label="${q}"></md-suggestion-chip>`).join('')}</md-chip-set>
      <form class="sp-input" id="sp-input">
        <md-outlined-text-field id="sp-q" type="textarea" rows="2" placeholder="${placeholder}" aria-label="Ask Senior Techne"></md-outlined-text-field>
        <div class="sp-row"><md-icon-button type="button" data-act="add-ctx" title="Add context" aria-label="Add context">${sym('attach_file')}</md-icon-button><span class="md-typescale-body-small m3-muted">Enter to send</span><md-filled-button type="submit" trailing-icon>Send${sym('arrow_upward', 'icon')}</md-filled-button></div>
      </form>`;
    sp.querySelector('#sp-input').onsubmit = e => { e.preventDefault(); followUp(); };
    sp.querySelector('#sp-q').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); followUp(); } });
    later(relayout, 30);
  }
  const aiMsg = (html, id = '') => `<div class="msg ai" ${id ? `id="${id}"` : ''}><div class="who md-typescale-label-medium">${sym('auto_awesome')}Senior Techne</div><div class="abody">${html}</div></div>`;
  // The rail's star: a chat about this repo, answered from seniors' twins
  function openChat() {
    clearGuide();
    dropAnchored();
    nudge(false);
    pinned = false;
    panelShell('chat', aiMsg(`<p>Ask me anything about procurement-core. I answer from seniors’ twins, say whose, and tell you when no twin covers it yet.</p>`),
      ['Where do copybooks live?', 'Why does VENDSYNC fail on restart?', 'How do I read the VSAM file for a report?'], 'Ask about this repo, or paste a log or link');
    later(() => $('#sp-q')?.focus(), 120);
  }
  // Pin moves the inline walkthrough into the panel at the same step; unpin puts it back onto the code
  function pin() {
    const at = Math.max(step, 0);
    pinned = true;
    opts.wt = 'split';
    openPanel(false, at);
  }
  function unpin() {
    const at = Math.max(step, 0);
    pinned = false;
    opts.wt = 'inline';
    closePanel();
    showGlassStep(at);
  }
  // A follow-up typed on the inline card pins the walkthrough and continues in the Ask panel
  function askFromInline() {
    const q = layer.querySelector('.g-ask-q')?.value.trim();
    if (!q) { App.toast('Type a question first.'); layer.querySelector('.g-ask-q')?.focus(); return; }
    pin();
    $('#sp-q').value = q;
    followUp();
  }

  function openPanel(withSearch, at = 0) {
    clearGuide();
    dropAnchored();
    nudge(false);
    helpBtn().classList.add('away');
    panelShell('walk', `<div class="msg me"><div class="bubble">${S.ask ? S.ask : S.error ? `My <code>${S.run.split(' ')[0]}</code> failed with <code>${S.short}</code>. What’s going on?` : `I’m on ${S.ticket}: include PDF invoices in the nightly vendor file copy. Where do I start?`}</div></div>${aiMsg('', 'sp-answer')}`,
      S.error ? ['Why does this happen?', 'What if it fails again?', 'Who else hit this?'] : ['What could break?', 'Who owns this job?', 'How do I test it?'], 'Ask a follow-up, or paste a log or link');
    const body = sp.querySelector('#sp-answer .abody');
    const reveal = () => {
      sp.querySelector('.sp-from').innerHTML = `· ${fromLine(S.answer)}`;
      sp.querySelector('.sp-head').insertAdjacentHTML('beforeend', '');
      body.insertAdjacentHTML('beforeend', `<div class="found">${foundHTML(S.answer, false)}</div>`);
      startPanelSteps(body, at);
    };
    if (withSearch) { body.innerHTML = searchHTML(); runSearch(body, reveal); }
    else reveal();
  }
  function closePanel() {
    sp.hidden = true;
    divider.hidden = true;
    sp.innerHTML = '';
    clearGuide();
    step = -1;
    helpBtn().classList.remove('away');
  }

  function startPanelSteps(body, at = 0) {
    if (opts.wt === 'split') {
      body.insertAdjacentHTML('beforeend', `<ol class="psteps" id="psteps"></ol>`);
      showPanelStep(at);
    } else {
      body.insertAdjacentHTML('beforeend', `<p class="pnote">I’ve pinned the steps onto your code. Follow them there, or jump to one here.</p><ol class="pprog" id="pprog"></ol>`);
      showGlassStep(0);
    }
    body.insertAdjacentHTML('beforeend', `<md-text-button class="ask-link" data-act="ask">${sym('group', 'icon')}Ask a senior instead</md-text-button>`);
  }

  // Split: steps live in the panel, the code is highlighted (not dimmed)
  function showPanelStep(i) {
    step = i;
    focusOn(S.steps[i]);
    $('#psteps').innerHTML = S.steps.map((s, k) => `
      <li class="pstep ${k === i ? 'on' : k < i ? 'done' : ''}" data-act="goto" data-i="${k}">
        <div class="ps-head"><span class="sn">${k < i ? sym('check') : k + 1}</span><span class="ps-t md-typescale-title-small">${s.title}</span>${k === i ? '' : App.stepTag(s, true)}</div>
        ${k === i ? `<div class="ps-body">${App.stepTag(s)}${brief(s.body)}${sentHTML(s)}${codeBlock(s)}${noteHTML(s)}${whereHTML(s)}
          <div class="gbtns">${k > 0 ? '<md-text-button data-act="back">Back</md-text-button>' : ''}
          ${k < S.steps.length - 1 ? `<md-filled-button data-act="next" trailing-icon>Next${sym('arrow_forward', 'icon')}</md-filled-button>` : ''}</div></div>` : ''}
      </li>`).join('');
    $('#psteps .pstep.on')?.scrollIntoView({ block: 'nearest' });
  }
  function renderProgress() {
    const el = $('#pprog');
    if (!el) return;
    el.innerHTML = S.steps.map((s, k) => `<li class="${k === step ? 'on' : k < step ? 'done' : ''}" data-act="goto" data-i="${k}"><span class="sn">${k < step ? sym('check') : k + 1}</span><span class="pp-t">${s.title}</span>${App.stepTag(s, true)}</li>`).join('');
  }
  function goStep(i) { if (opts.wt === 'split') showPanelStep(i); else showGlassStep(i); }
  function startWalk() {
    dropAnchored();
    nudge(false);
    if (['glass', 'inline'].includes(opts.wt)) showGlassStep(0);
    else openPanel(false);
  }

  function followUp() {
    const ta = $('#sp-q');
    const q = ta.value.trim();
    if (!q) return;
    ta.value = '';
    const th = $('#sp-thread');
    th.insertAdjacentHTML('beforeend', `<div class="msg me"><div class="bubble"></div></div>`);
    th.lastElementChild.querySelector('.bubble').textContent = q;
    th.insertAdjacentHTML('beforeend', `<div class="msg ai"><div class="who md-typescale-label-medium">${sym('auto_awesome')}Senior Techne</div><div class="abody"><span class="typing"><i></i><i></i><i></i></span></div></div>`);
    th.scrollTop = th.scrollHeight;
    later(() => {
      const r = replyFor(q);
      th.lastElementChild.querySelector('.abody').innerHTML = `${App.stepTag(r)}${brief(r.text)}${r.status === 'unknown' ? `<div class="queued">${sym('group')}Added to the Question Queue for any senior</div>` : ''}`;
      th.scrollTop = th.scrollHeight;
    }, 1000);
  }
  const CHAT = [
    [/copybook|cobcpy|vendrec/i, { twin: 'priya', status: 'verified', text: 'Copybooks live in <code>copybooks/</code>. Set <code>COBCPY=./copybooks</code> before you build, and add it to <code>~/.zshrc</code> so every terminal has it.' }],
    [/restart|vendsync|-911|lock/i, { twin: 'priya', status: 'verified', text: 'Restart VENDSYNC from the failed step, not the top. Steps 1 and 2 already committed to VENDMAST, and a -911 at step 3 usually means the 4 PM report holds a lock.' }],
    [/vsam|report/i, { twin: 'priya', status: 'verified', text: 'Read the nightly CSV export for reports, not the VSAM file. The export is consistent and doesn’t lock VENDMAST.' }],
    [/pdf|invoice|vendor_copy|file copy/i, { twin: 'priya', status: 'inferred', text: 'PDF invoices should copy to their own folder before the done marker, so the 2 AM PO batch sees them. Priya hasn’t confirmed the folder yet.' }],
    [/numeric|po-amt|s0c7|test data/i, { twin: null, status: 'general', text: 'Bad numeric data usually means the test file has spaces where the field expects digits. Compare the record layout in the copybook with the data.' }],
  ];
  function replyFor(q) {
    const hit = CHAT.find(([re]) => re.test(q));
    if (hit) return hit[1];
    // in a walkthrough, the scenario's own follow-up answers questions like its suggestion chips; anything else is unknown
    if (sp.dataset.mode === 'walk' && /again|why|happen|break|else|test|owns?\b/i.test(q)) return S.reply;
    return { twin: null, status: 'unknown', text: 'No twin covers this yet, so I won’t guess. I’ve added it to the Question Queue, and the senior who answers teaches their twin too.' };
  }

  const ADD_CTX = [['description', 'README.md'], ['image', 'Screenshot'], ['link', 'Ticket PROC-482'], ['terminal', 'run.log']];
  let ctxIdx = 0;
  function addContext() {
    const [ic, label] = ADD_CTX[ctxIdx++ % ADD_CTX.length];
    const chip = document.createElement('md-assist-chip');
    chip.className = 'new';
    chip.setAttribute('label', label);
    chip.innerHTML = `<md-icon slot="icon">${ic}</md-icon>`;
    $('#sp-chips').insertBefore(chip, $('#sp-chips .add'));
  }

  // ── applying the fix ──
  function runFix() {
    clearGuide();
    step = -1;
    const p = $('#t-prompt');
    p.removeAttribute('id');
    const finish = () => chain(S.fix.out, () => {
      newPrompt().id = 't-prompt';
      setError(false);
      later(showDone, 450);
    });
    if (S.fix.kind === 'patch') {
      patched = true;
      renderEditor();
      scrollToLine(fixAt());
      later(() => typeAll(S.fix.cmds, p, finish), 500);
    } else typeAll(S.fix.cmds, p, finish);
  }

  function doneHTML() {
    const d = S.done;
    const head = `<div class="dhead"><span class="okic">${sym('check')}</span><div><div class="md-typescale-title-medium">${d.title}</div><div class="md-typescale-body-small m3-muted">${d.sub}</div></div></div>`;
    if (knownMode()) return `${head}<div class="thanks">${sym('diversity_3')}<span>Fixed without the walkthrough. Your twin will keep this help short next time.</span></div>`;
    if (d.kind === 'queued') return `${head}
      <div class="queued-box">
        <div class="qb-h md-typescale-title-small">${sym('group')}Sent to the Question Queue</div>
        <p class="md-typescale-body-medium">No twin covers this, so your workaround went to the Question Queue. Any senior can claim it. Once one approves it, it joins the team docs and Senior Techne learns it.</p>
        <span class="qb-foot md-typescale-body-small">${sym('diversity_3')}Saved privately to your twin</span>
      </div>
      <div class="facts"><md-text-button data-act="to-senior" trailing-icon>See it in the Question Queue${sym('arrow_forward', 'icon')}</md-text-button></div>`;
    if (d.kind === 'save') return `${head}
      ${sentToPriya ? `<div class="sent-to">${sym('send')}<span>Step 4 went to Priya R. to confirm. Her answer updates this walkthrough.</span></div>` : ''}
      <p class="q md-typescale-body-medium">Commit, and save how you did this to your twin?</p>
      <div class="facts" data-fb><md-filled-button data-act="commit">${sym('commit', 'icon')}Commit and save to your twin</md-filled-button><md-text-button data-act="dismiss-done">Not now</md-text-button></div>`;
    return `${head}<p class="q md-typescale-body-medium">Did this walkthrough help?</p>
      <div class="facts" data-fb><md-filled-button data-act="yes">Yes, it helped</md-filled-button><md-text-button data-act="no">Not really</md-text-button></div>`;
  }
  function showDone() {
    if (S.done.kind === 'queued') { GradPages.add({ type: 'question', title: S.answer.title, with: 'In the Question Queue', topics: ['COBOL', 'Test data'], vis: 'shared' }); bumpArchive(); }
    if (['glass', 'inline'].includes(opts.wt)) {
      helpBtn().classList.remove('away', 'ready');
      const c = makeCard('acard glass done', `<md-icon-button class="corner-x" data-act="dismiss" aria-label="Dismiss">${sym('close')}</md-icon-button>${doneHTML()}`);
      anchor(c);
    } else {
      clearFocus();
      document.querySelectorAll('#psteps .pstep, #pprog li').forEach(li => {
        li.className = li.classList.contains('pstep') ? 'pstep done' : 'done';
        li.querySelector('.ps-body')?.remove();
        li.querySelector('.sn').innerHTML = sym('check');
      });
      sp.querySelector('.abody > [data-act="ask"]')?.remove();
      const th = $('#sp-thread');
      th.insertAdjacentHTML('beforeend', `<div class="msg ai done"><div class="who md-typescale-label-medium">${sym('auto_awesome')}Senior Techne</div><div class="abody">${doneHTML()}</div></div>`);
      th.scrollTop = th.scrollHeight;
    }
  }
  function bumpArchive() {
    Shell.refresh('grad', ['twin']);
    const n = $('#arch-count');
    if (!n) return;
    n.classList.remove('bump'); void n.offsetWidth; n.classList.add('bump');
  }

  // git commit → Techne opens the describe-task dialog
  function commitAndSave() {
    const p = $('#t-prompt');
    if (!p) { openSave('commit'); return; }
    p.removeAttribute('id');
    typeAll([S.commit || 'git commit -am "Fix"'], p, () => chain([
      ['', '[proc-512-pdf-invoices 3f2a91c] PROC-512: copy PDF invoices before the done marker'],
      ['mut', ' 1 file changed, 4 insertions(+)'],
    ], () => { newPrompt().id = 't-prompt'; later(() => openSave('commit'), 400); }));
  }

  // ── Describe-task save dialog (md-dialog, so it opens in the top layer) ──
  const TIMELINE = [
    ['09:41', 'link', 'Opened PROC-512', true],
    ['09:42', 'description', 'Opened scripts/vendor_copy.sh', true],
    ['09:44', 'diversity_3', 'Walkthrough with Priya R.’s twin · 5 steps', true],
    ['09:47', 'chat', 'Slack DM with Ana Park', false, 'Private messages start unticked'],
    ['09:49', 'code', 'Edited vendor_copy.sh · 4 lines added', true],
    ['09:50', 'terminal', './scripts/vendor_copy.sh --dry-run ✓', true],
    ['09:52', 'commit', 'git commit · 3f2a91c', true],
  ];
  const videoOff = () => `<span>${sym('videocam_off')}Screen video is off</span><small>Off by default. Turn it on to replay what you did.</small>`;
  function openSave(trigger) {
    const t = trigger === 'commit'
      ? `${sym('commit')}<span>Techne noticed your commit on <code>proc-512-pdf-invoices</code></span>`
      : `${sym('auto_awesome')}<span>Techne spotted a finished task</span>`;
    modal.hidden = false;
    modal.innerHTML = `<md-dialog class="g-save" aria-label="Save to your twin">
      <div slot="headline" class="g-dhead">
        <div><span class="m-trig md-typescale-body-medium">${t}</span><span class="md-typescale-headline-small">Save this to your twin?</span></div>
        <md-icon-button data-act="close-save" aria-label="Close">${sym('close')}</md-icon-button>
      </div>
      <div slot="content" class="m-body">
        <md-outlined-text-field id="task-desc" type="textarea" rows="3" label="Describe the task, in your words" value="Added PDF invoices to the nightly vendor file copy. PDFs go to their own folder and copy before the done marker, so the 2 AM PO batch sees them."></md-outlined-text-field>
        <div class="m-split">
          <div>
            <h3 class="m3-label md-typescale-title-small">Screen video</h3>
            <div class="video off" id="video">${videoOff()}</div>
            <label class="g-switch-row md-typescale-body-medium"><md-switch id="video-on"></md-switch>Include screen video</label>
          </div>
          <div>
            <h3 class="m3-label md-typescale-title-small">What happened <span class="md-typescale-body-small m3-muted">· untick anything to leave it out</span></h3>
            <ol class="rec">${TIMELINE.map(([tm, ic, txt, on, hint], i) => `<li><label><md-checkbox touch-target="wrapper" ${on ? 'checked' : ''} data-i="${i}" aria-label="${txt}"></md-checkbox><span class="tt">${tm}</span>${sym(ic)}<span class="rec-t">${txt}${hint ? `<small>${hint}</small>` : ''}</span></label></li>`).join('')}</ol>
          </div>
        </div>
        <h3 class="m3-label md-typescale-title-small">Who can see it</h3>
        <div class="vis">
          <label><md-radio name="vis" value="private" checked aria-label="Only me"></md-radio><div><div class="md-typescale-title-small">Only me</div><div class="md-typescale-body-small m3-muted">Stays in your twin. Nobody else sees it.</div></div></label>
          <label><md-radio name="vis" value="team" aria-label="Share with the team"></md-radio><div><div class="md-typescale-title-small">Share with the team</div><div class="md-typescale-body-small m3-muted">A senior reviews it before it joins team docs. +10 credits if approved.</div></div></label>
        </div>
      </div>
      <div slot="actions" class="g-dacts"><span class="md-typescale-body-small m3-muted">${sym('shield')}You own this. It’s never used in performance reviews.</span><md-text-button data-act="close-save">Not now</md-text-button><md-filled-button data-act="save-twin">Save to my twin</md-filled-button></div>
    </md-dialog>`;
    const dlg = modal.querySelector('md-dialog');
    dlg.addEventListener('closed', () => { if (dlg.isConnected) hideSave(); });
    customElements.whenDefined('md-dialog').then(() => dlg.show());
    $('#video-on').addEventListener('change', e => {
      const v = $('#video'), on = e.target.selected;
      v.className = `video ${on ? 'on' : 'off'}`;
      v.innerHTML = on
        ? `<span>${sym('play_arrow')}09:41 – 09:52 · 11 min</span><small>Click a step to jump there</small><md-linear-progress class="scrub" value="0" aria-label="Video position"></md-linear-progress>`
        : videoOff();
    });
    modal.querySelectorAll('.rec li').forEach((li, i) => li.addEventListener('click', e => {
      const bar = modal.querySelector('.scrub');
      if (bar && !e.target.closest('md-checkbox')) bar.value = i / (TIMELINE.length - 1);
    }));
  }
  function closeSave() { modal.querySelector('md-dialog')?.close(); }
  function hideSave() { modal.innerHTML = ''; modal.hidden = true; }
  function saveToTwin() {
    const shared = [...modal.querySelectorAll('md-radio[name="vis"]')].find(r => r.checked)?.value === 'team';
    closeSave();
    GradPages.addSaved(shared);
    bumpArchive();
    App.toast(shared
      ? 'Saved to your twin and shared. A senior reviews it before it joins team docs.'
      : 'Saved to your twin. Only you can see it.');
  }

  function onAct(act, el) {
    const card = el.closest('.acard, .gcard');
    switch (act) {
      case 'dismiss':
        card?.remove();
        anchored = anchored.filter(c => c !== card);
        nudge(false);
        break;
      case 'walk': startWalk(); break;
      case 'all-steps': startWalk(); break;
      case 'send-priya': sendToPriya(); break;
      case 'next': goStep(step + 1); break;
      case 'back': goStep(step - 1); break;
      case 'goto': if (+el.dataset.i !== step) goStep(+el.dataset.i); break;
      case 'end': clearGuide(); step = -1; helpBtn().classList.remove('away'); if (!sp.hidden) renderProgress(); break;
      case 'close-panel': pinned = false; if (opts.wt === 'split' && App.state.wt !== 'split') opts.wt = App.state.wt; closePanel(); break;
      case 'pin': pin(); break;
      case 'unpin': unpin(); break;
      case 'inline-send': askFromInline(); break;
      case 'copy': {
        const label = el.querySelector('span');
        navigator.clipboard?.writeText(S.steps.find(s => s.code).code)
          .then(() => { label.textContent = 'Copied'; })
          .catch(() => { label.textContent = 'Select to copy'; });
        break;
      }
      case 'run': runFix(); break;
      case 'add-ctx': addContext(); break;
      case 'sugg': $('#sp-q').value = el.getAttribute('label') || el.textContent; followUp(); break;
      case 'ask': {
        const html = `<div class="sent">
          <div class="ftitle md-typescale-title-medium">Sent to the Question Queue</div>
          <p class="md-typescale-body-medium">Your ${S.error ? `error, line ${S.errLine}` : 'ticket'} and your last 3 commands go with it. Any senior can claim it, usually within 20 minutes, and the answer arrives here as a walkthrough.</p>
          <md-text-button data-act="to-senior" trailing-icon>See the Question Queue${sym('arrow_forward', 'icon')}</md-text-button></div>`;
        if (card) card.querySelector('[data-found]').outerHTML = html;
        else el.outerHTML = html;
        break;
      }
      case 'to-senior': Senior.flag('q1'); App.set({ role: 'senior', screen: 'queue' }); break;
      case 'yes':
        el.closest('[data-fb]').outerHTML = `<div class="thanks">${sym('diversity_3')}<span>Saved to your twin. Priya R. earns credits when her twin helps.</span></div>`;
        GradPages.add({ type: 'walk', title: S.answer.title, with: `${App.twinName(S.answer.twin)}’s twin`, topics: ['COBOL', 'Copybooks'], vis: 'private' });
        bumpArchive();
        break;
      case 'no':
        el.closest('[data-fb]').outerHTML = `<div class="thanks">${sym('chat')}<span>Thanks. Priya R. will see this and can improve her twin’s answer.</span></div>`;
        break;
      case 'commit': el.closest('[data-fb]').outerHTML = `<div class="thanks">${sym('commit')}<span>Committing…</span></div>`; commitAndSave(); break;
      case 'dismiss-done': el.closest('[data-fb]').remove(); break;
      case 'close-save': closeSave(); break;
      case 'save-twin': saveToTwin(); break;
    }
  }

  // the status bar item works as a switch
  function toggleSenior() {
    seniorOn = !seniorOn;
    Shell.renderStatus('grad');
    App.toast(seniorOn
      ? 'Senior Techne is on. It’ll offer help when something breaks or you start a ticket.'
      : 'Senior Techne is off. It waits until you ask.');
    if (!seniorOn) {
      anchored.filter(c => c.classList.contains('nudge-card')).forEach(c => c.remove());
      anchored = anchored.filter(c => !c.classList.contains('nudge-card'));
      nudge(false);
    } else if (ready && step < 0 && sp.hidden) later(showNudge, 300);
  }

  function wireDivider() {
    divider.addEventListener('pointerdown', e => {
      divider.setPointerCapture(e.pointerId);
      ide.classList.add('dragging');
      const x0 = e.clientX, w0 = panelW, max = $('#body').clientWidth * .6;
      const move = ev => {
        panelW = Math.min(max, Math.max(340, w0 - (ev.clientX - x0)));
        sp.style.width = `${panelW}px`;
        relayout();
      };
      const up = () => {
        ide.classList.remove('dragging');
        divider.removeEventListener('pointermove', move);
        divider.removeEventListener('pointerup', up);
      };
      divider.addEventListener('pointermove', move);
      divider.addEventListener('pointerup', up);
    });
  }

  function relayout() { place(); anchored.forEach(anchor); }

  // Switch the editor area between code and the other new grad screens (each one an editor tab)
  function show(scr) {
    screen = scr;
    const code = scr === 'ide' || scr === 'save';
    $('#body').hidden = !code;
    gpage.hidden = code;
    layer.hidden = !code;
    if ($('#tree')) renderTree();
    if (!code) { hideSave(); GradPages.render(scr, gpage); gpage.scrollTop = 0; return; }
    if (!begun) { begun = true; runStart(); }
    if (scr === 'save') openSave('suggest');
    relayout();
  }

  // ── web IDE chrome for the new grad ──
  const branch = () => S?.key === 'filecopy' ? 'proc-512-pdf-invoices' : 'main';
  function statusHTML() {
    return `<span class="wi-si">${sym('call_split')}procurement-core · ${branch()}</span>
      <button class="wi-si wi-st ${seniorOn ? 'on' : ''}" id="st-toggle" role="switch" aria-checked="${seniorOn}" data-wi-act="senior" title="${seniorOn ? 'On: Senior Techne watches your work and offers help. Click to turn it off.' : 'Off: Senior Techne waits until you ask. Click to turn it on.'}"><md-ripple></md-ripple><md-focus-ring></md-focus-ring><i></i>Senior Techne: <b>${seniorOn ? 'on' : 'off'}</b></button>
      <button class="wi-si push" data-wi-screen="learn" data-wi-side="path" title="Your learning path"><md-ripple></md-ripple><md-focus-ring></md-focus-ring>${sym('school')}Onboarding · week 2 of 6</button>
      <button class="wi-si" data-wi-act="bell" aria-label="Notifications"><md-ripple></md-ripple><md-focus-ring></md-focus-ring>${sym('notifications')}</button>`;
  }
  function filesSide() {
    return { title: 'Explorer', acts: `<md-icon-button data-wi-act="collapse-tree" aria-label="Collapse folders" title="Collapse folders"><md-icon>unfold_less</md-icon></md-icon-button>`,
      body: `<ul class="tree" id="tree"></ul>` };
  }
  function shellAct(act) {
    switch (act) {
      case 'ask': ask(); break;
      case 'senior': toggleSenior(); break;
      case 'bell': App.toast(seniorOn ? 'No new answers. Senior Techne will tell you when a senior replies.' : 'Senior Techne is off, so it won’t notify you.'); break;
      case 'collapse-tree': App.toast('Only this ticket’s folders are in the prototype.'); break;
      case 'startup': App.toast('Home opens when you start Techne. Turn it off in Settings.'); break;
      case 'document': App.set({ screen: 'save' }); break;
      case 'soon': App.toast('Not in this prototype. Continue the ticket or ask Senior Techne.'); break;
      default: GradPages.shellAct?.(act);
    }
  }
  // The rail's star: Senior Techne's chat, beside the code. A walkthrough in progress is pinned there instead.
  function ask() {
    if (screen !== 'ide' && screen !== 'save') App.set({ screen: 'ide' });
    if (!sp.hidden) { $('#sp-q')?.focus(); return; }
    if (step >= 0 && placed) { pin(); later(() => $('#sp-q')?.focus(), 120); return; }
    openChat();
  }

  function init() {
    root = $('#grad'); ide = $('#ide'); editor = $('#editor'); termBody = $('#term-body');
    layer = $('#guide-layer'); svg = $('#connector'); sp = $('#sp'); divider = $('#divider'); side = $('#side');
    gpage = $('#gpage'); modal = $('#grad-modal');
    $('#help-term').onclick = openHelp;
    $('#help-corner').onclick = openHelp;
    Shell.register('grad', {
      root: '#ide', view: 'files',
      fab: { id: 'nav-ask', icon: 'auto_awesome', label: 'Ask Senior Techne', act: 'ask' },
      rail: [
        { id: 'files', icon: 'folder_copy', label: 'Explorer' },
        { id: 'twin', icon: 'diversity_3', label: 'Your twin', badge: () => GradPages.total(), badgeId: 'arch-count', tone: 'count' },
        { id: 'path', icon: 'route', label: 'Learning' },
      ],
      me: { name: 'Maya Chen', sub: 'New grad · Procurement' },
      menu: [['report', 'Your year', 'insights'], ['onboard', 'What Techne records', 'shield_person']],
      tabs: { home: ['Home', 'home'], ide: [() => S?.file || 'Code', 'description'], archive: ['Your twin', 'diversity_3'], learn: ['Learning path', 'route'], report: ['Your year', 'insights'], onboard: ['What Techne records', 'shield_person'] },
      tabOf: scr => scr === 'save' ? 'ide' : scr,
      side: v => v === 'files' ? filesSide() : GradPages.side(v),
      sideAfter: v => { if (v === 'files' && S) renderTree(); },
      status: statusHTML,
      search: { label: 'Search files, run commands, or ask Senior Techne' },
      onSearch: ask,
      act: shellAct,
      relayout: () => relayout(),
    });
    root.addEventListener('click', e => {
      const b = e.target.closest('[data-act]');
      if (b && root.contains(b) && !gpage.contains(b) && !b.closest('.wi-side, .wi-rail, .wi-status')) onAct(b.dataset.act, b);
    });
    // an opened "Where this comes from" scrolls fully into view, so the trail is never below the fold
    root.addEventListener('toggle', e => { if (e.target.matches?.('details.where') && e.target.open) e.target.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, true);
    wireDivider();
  }

  function stop() {
    timers.forEach(clearTimeout);
    timers = [];
    clearGuide();
    dropAnchored();
  }

  function restart(st) {
    stop();
    opts = { wt: st.wt, help: st.help, sc: st.sc, seen: st.seen };
    S = DATA.scenarios[opts.sc] || DATA.scenarios.checked;
    step = -1; ready = false; patched = false; sentToPriya = false; begun = false; pendingAsk = false; pinned = false;
    ide.dataset.help = opts.help;
    ide.dataset.wt = opts.wt;
    sp.hidden = true; divider.hidden = true; sp.innerHTML = '';
    hideSave();
    ['#help-term', '#help-corner'].forEach(s => $(s).classList.remove('nudge', 'ready', 'away'));
    $('#help-corner md-fab').label = '';
    $('#term-right').textContent = S.key === 'filecopy' ? 'zsh · proc-512-pdf-invoices' : 'zsh · procurement-core';
    if ($('#tree')) renderTree();
    renderEditor();
    termBody.innerHTML = '';
    $('#problems').hidden = true;
    editor.scrollTop = 0;
    show(st.screen);
    Shell.refresh('grad'); Shell.renderStatus('grad');
  }

  // Back to a fresh visit: Senior Techne on, archive count as loaded
  function reset() {
    seniorOn = true;
    setTimeout(() => { Shell.refresh('grad'); Shell.renderStatus('grad'); });
  }
  const file = () => S?.file;
  const issue = () => S?.key;
  const inCode = () => screen === 'ide' || screen === 'save';
  const where = () => ({ error: !!S?.error, at: S?.error ? `${S.file}:${S.errLine}` : S?.file });
  const task = () => S?.key === 'filecopy' ? 'PROC-512' : S?.file;
  return { init, start: restart, restart, stop, show, relayout, reset, ask, file, task, issue, inCode, where };
})();
