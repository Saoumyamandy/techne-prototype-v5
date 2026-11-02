// Senior pages: Your IDE (recording + Techne's in-IDE question), the end-of-day interview,
// hot spots, Your twin and How Techne asks. When Techne asks as a new grad it is synthetic, and always badged as such.
const SeniorPages = (() => {
  const $ = s => document.querySelector(s);
  const sym = App.sym, status = App.status;
  let timers = [];
  const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
  let host = null, recording = true, probeState = 'hidden', qIndex = 0, momentsOpen = false;

  const label = (t, extra = '') => `<h3 class="m3-label md-typescale-title-small">${t}${extra}</h3>`;
  const stat = (value, text, ic) => `<div class="m3-card filled m3-stat">
      <div class="m3-stat-top md-typescale-label-large">${ic ? sym(ic) : ''}${text}</div>
      <div class="md-typescale-headline-large">${value}</div></div>`;
  // recording state: a status label with a live dot, not a control
  const recLabel = text => `<span class="m3-rec ${recording ? 'on' : 'off'} md-typescale-label-large">${recording ? '<i></i>' : sym('pause_circle')}${recording ? text : 'Paused'}</span>`;

  // Why Techne is asking: the real demand (anonymised) and the moment behind a persona question
  function whyHTML(key) {
    const L = DATA.lineage[key], m = DATA.seniorIde.moments[L.moment];
    return `<details class="m3-why"><summary class="md-typescale-label-large">${sym('info')}Why Techne is asking${sym('expand_more')}</summary>
      <div class="m3-why-body">
        <div class="m3-why-cl"><span class="md-typescale-title-small">${L.cluster}</span><span class="md-typescale-body-small m3-muted">${L.count}</span></div>
        <div class="md-typescale-label-medium m3-muted">Real new grad questions, anonymised</div>
        <ul class="m3-why-q md-typescale-body-medium">${L.questions.map(q => `<li>“${q}”</li>`).join('')}</ul>
        <div class="md-typescale-label-medium m3-muted">The moment it matches</div>
        <div class="m3-why-m">${sym('star')}<div><div class="md-typescale-title-small">${m.time} · ${m.label}</div><div class="md-typescale-body-medium">${m.reason}</div></div></div>
      </div></details>`;
  }
  const rateHTML = () => `<div class="m3-rate"><span class="md-typescale-body-medium m3-muted">Is this a good question?</span>
    <md-chip-set><md-assist-chip label="Useful" data-sact="rate-up"><md-icon slot="icon">thumb_up</md-icon></md-assist-chip><md-assist-chip label="Not relevant" data-sact="rate-down"><md-icon slot="icon">thumb_down</md-icon></md-assist-chip></md-chip-set></div>`;

  // ── Senior IDE ──
  function hlJcl(l) {
    if (/^\/\/\*/.test(l)) return `<span class="c-cm">${l}</span>`;
    return l.replace(/^(\/\/\w*)/, '<span class="c-id">$1</span>')
      .replace(/\b(JOB|EXEC|DD|PGM|DSN|DISP|CLASS|MSGCLASS|PARM|SHR|OLD)\b/g, '<span class="c-kw">$1</span>')
      .replace(/('[^']*')/g, '<span class="c-str">$1</span>');
  }
  function ideHTML() {
    const I = DATA.seniorIde;
    return `<div class="m3-ide">
      <div class="m3-ide-main">
        <header class="m3-ide-bar">
          <nav class="m3-crumbs md-typescale-body-medium" aria-label="File path">procurement-batch${sym('chevron_right')}jcl${sym('chevron_right')}<b>VENDSYNC.jcl</b></nav>
          <div class="m3-row-acts">
            <span title="Recording what you do in the IDE, within what you allowed. Never used in performance reviews.">${recLabel('Recording')}</span>
            <md-outlined-button data-sact="pause">${sym(recording ? 'pause' : 'play_arrow', 'icon')}${recording ? 'Pause' : 'Resume'}</md-outlined-button>
            <md-filled-button data-sact="interview">${sym('diversity_3', 'icon')}End-of-day interview · 3</md-filled-button>
          </div>
        </header>
        <div class="m3-sess md-typescale-body-medium">
          <span class="m3-meta-i">${sym('videocam')}${I.session.label}<span class="m3-muted">${I.session.range}</span></span>
          <div class="m3-sess-bar"><i></i>${I.moments.map((m, i) => `<button class="${m.main ? 'is-main' : ''}" style="left:${m.pos}%" data-sact="moment" data-i="${i}" aria-label="Key moment at ${m.time}: ${m.label}"></button>`).join('')}</div>
          <span class="m3-muted">${I.moments.length} key moments</span>
        </div>
        <div class="m3-ide-work">
          <div class="m3-editor">${I.code.map((l, i) => `<div class="${i === 6 ? 'key' : ''}"><span class="n">${i + 1}</span><span>${hlJcl(l)}</span></div>`).join('')}</div>
          <div class="m3-term">
            <div class="m3-term-head md-typescale-label-large">${sym('terminal')}Terminal<span>zsh · procurement-batch</span></div>
            <div class="m3-term-body">${I.term.map(([k, t], li) => {
              const mi = I.moments.findIndex(m => m.line === li);
              const star = mi >= 0 ? `<button class="m3-mstar" data-sact="moment" data-i="${mi}" aria-label="Why this is a key moment">${sym('star')}</button>` : '';
              const body = k === 'cmd' ? `<span class="pr">priya@techne</span> <span class="pd">procurement-batch</span> <span class="pc">%</span> ${t}` : t;
              return `<div class="${mi >= 0 ? 'moment' : ''} ${mi >= 0 && I.moments[mi].main ? 'is-main' : ''}">${star}${body}</div>`;
            }).join('')}
            <div><span class="pr">priya@techne</span> <span class="pd">procurement-batch</span> <span class="pc">%</span> <span class="caret"></span></div></div>
          </div>
        </div>
      </div>
      ${probeHTML()}
    </div>`;
  }
  // "Your twin today", shown under the Explorer's file tree in the side bar
  function todayHTML() {
    const I = DATA.seniorIde;
    return `<ul class="wi-today md-typescale-body-medium">
      <li>${sym('videocam')}<span>2 sessions recorded</span></li>
      <li><button data-wi-act="moments-list" aria-expanded="${momentsOpen}"><md-ripple></md-ripple><md-focus-ring></md-focus-ring>${sym('star')}<span>${I.moments.length} key moments found</span>${sym(momentsOpen ? 'expand_less' : 'expand_more')}</button></li>
      ${momentsOpen ? `<li class="wi-km-list">${I.moments.map((m, i) => `<button data-wi-act="moment" data-i="${i}"><md-ripple></md-ripple><md-focus-ring></md-focus-ring><span class="md-typescale-label-medium m3-muted">${m.time}</span>${m.label}</button>`).join('')}</li>` : ''}
      <li>${sym('auto_awesome')}<span>3 questions from Techne</span></li>
      ${(() => { const t = DATA.pastWork.items.filter(i => i.signal === 'today' && Senior.pastItem(i.id)?.status === 'todo');
        return t.length ? `<li><button data-wi-act="past" data-id="${t[0].id}"><md-ripple></md-ripple><md-focus-ring></md-focus-ring>${sym('history')}<span>${t.length} past change${t.length > 1 ? 's' : ''} to explain</span>${sym('chevron_right')}</button></li>` : ''; })()}
    </ul>`;
  }
  // a key moment picked in the side bar opens on the session timeline
  function openMoment(i) {
    const go = () => { const b = host?.querySelector(`.m3-sess-bar [data-i="${i}"]`); if (b) showMoment(i, b); };
    // a freshly opened IDE re-renders once Techne's question appears, so wait for that
    if (App.state.role !== 'senior' || App.state.screen !== 'ide') { const first = probeState === 'hidden'; App.set({ role: 'senior', screen: 'ide' }); setTimeout(go, first ? 900 : 150); }
    else { Shell.openScreen('senior', 'ide'); go(); }
  }

  // Techne's question in the IDE: a glass card, like the new grad's walkthrough, with M3 inside
  function probeHTML() {
    if (probeState === 'hidden' || !recording) return '';
    const P = DATA.seniorIde.probe;
    const head = closeAct => `<div class="m3-probe-head"><span class="md-typescale-title-small">Techne · asking as a new grad</span>${App.synth()}
      <md-icon-button data-sact="${closeAct}" aria-label="${closeAct === 'probe-later' ? 'Save for later' : 'Close'}" title="${closeAct === 'probe-later' ? 'Save for later' : 'Close'}">${sym('close')}</md-icon-button></div>`;
    if (probeState === 'answered') return `<div class="m3-probe m3-glass done">${head('probe-close')}
      <p class="m3-probe-thanks md-typescale-body-medium">${sym('check_circle')}<span>Thanks. Your twin drafted this into <b>Your twin’s drafts</b> for you to check before anyone sees it.</span></p>
      <md-text-button class="m3-start" data-sact="to-drafts" trailing-icon>Review the draft${sym('arrow_forward', 'icon')}</md-text-button></div>`;
    return `<div class="m3-probe m3-glass">${head('probe-later')}
      <p class="md-typescale-title-medium">${P.q}</p>
      ${status('info', P.at, 'terminal')}
      ${whyHTML(P.lineage)}
      ${rateHTML()}
      <md-outlined-text-field id="probe-a" type="textarea" rows="2" placeholder="A sentence is enough" data-script="probe" aria-label="Your answer"></md-outlined-text-field>
      <div class="m3-actions"><md-text-button data-sact="probe-later">Ask me tonight</md-text-button><md-filled-button data-sact="probe-answer">Answer</md-filled-button></div>
    </div>`;
  }

  // The 4:18 question may already be answered on the card; the interview doesn't ask it twice
  function skipAnswered() { while (qIndex < DATA.interview.length && DATA.interview[qIndex].given) qIndex++; }

  // Small popover explaining why Techne flagged a moment, anchored to whatever was clicked
  function showMoment(i, anchor) {
    const m = DATA.seniorIde.moments[i];
    const ide = host.querySelector('.m3-ide');
    ide.querySelector('.m3-mpop')?.remove();
    const pop = document.createElement('div');
    pop.className = 'm3-mpop';
    pop.setAttribute('role', 'dialog');
    pop.innerHTML = `<div class="m3-mpop-head">${sym('star')}<span class="md-typescale-title-small">Key moment · ${m.time}</span><md-icon-button data-sact="moment-close" aria-label="Close">${sym('close')}</md-icon-button></div>
      <div class="md-typescale-title-medium">${m.label}</div><p class="md-typescale-body-medium">${m.reason}</p>
      <span class="m3-meta-i md-typescale-body-small m3-muted">${sym('terminal')}Captured from your terminal</span>`;
    ide.appendChild(pop);
    const a = App.rel(anchor, ide), W = ide.clientWidth;
    const left = Math.min(Math.max(16, a.x + a.w / 2 - 160), W - 336);
    // open below things near the top (timeline, sidebar), above things near the bottom (terminal)
    if (a.y < ide.clientHeight / 2) pop.style.top = `${a.y + a.h + 8}px`;
    else pop.style.bottom = `${ide.clientHeight - a.y + 8}px`;
    pop.style.left = `${left}px`;
    ide.querySelectorAll('[data-sact="moment"]').forEach(b => b.classList.toggle('active', +b.dataset.i === i));
  }

  // ── End-of-day interview: an md-dialog, kept open while the questions advance ──
  function interviewInner() {
    const Q = DATA.interview;
    const done = qIndex >= Q.length;
    const who = `<div class="m3-iv-who md-typescale-label-large">Techne ${App.synth()}</div>`;
    const msgs = Q.slice(0, Math.min(qIndex + 1, Q.length)).map((q, i) => `
      <div class="m3-iv-ai">${who}<div class="m3-bubble ans"><p class="md-typescale-body-large">${q.q}</p>${i === qIndex ? whyHTML(q.lineage) + rateHTML() : ''}</div></div>
      ${i < qIndex ? `<div class="m3-bubble ask md-typescale-body-medium">${q.given}</div>` : ''}`).join('');
    return `
      <div slot="headline" class="m3-iv-head"><div><span class="md-typescale-label-large m3-muted">End-of-day interview · about 5 min</span><span>Techne has ${Q.length} questions about today</span></div>
        <md-icon-button data-sact="iv-close" aria-label="Finish later" title="Finish later">${sym('close')}</md-icon-button></div>
      <div slot="content" class="m3-iv-body">
        <div class="m3-iv-prog"><md-linear-progress value="${Math.min(qIndex, Q.length) / Q.length}" aria-label="Interview progress"></md-linear-progress><span class="md-typescale-label-medium m3-muted">${done ? 'Done' : `Question ${qIndex + 1} of ${Q.length}`}</span></div>
        <div class="m3-iv-thread" id="iv-thread">${msgs}
          ${done ? `<div class="m3-iv-ai">${who}<div class="m3-bubble ans"><p class="md-typescale-body-large">Thanks, that’s all. Your twin drafted <b>“${DATA.interviewDraft.title}”</b> from your answers. It’s in Your twin’s drafts to check before it’s published.</p></div></div>` : ''}
        </div>
        ${done ? '' : `<md-outlined-text-field id="iv-a" type="textarea" rows="2" placeholder="Answer in a sentence or two" data-script="iv" aria-label="Your answer"></md-outlined-text-field>`}
      </div>
      <div slot="actions" class="m3-iv-acts">${done
        ? `<span class="m3-meta-i md-typescale-body-small m3-muted">${sym('verified_user')}Your answers stay in your twin until you approve them.</span><md-filled-button data-sact="iv-review" trailing-icon>Review the draft${sym('arrow_forward', 'icon')}</md-filled-button>`
        : `<md-text-button data-sact="iv-skip">Skip this one</md-text-button><md-filled-button data-sact="iv-send">${sym('send', 'icon')}Send</md-filled-button>`}</div>`;
  }
  function openInterview() {
    let dlg = host.querySelector('md-dialog.iv-wrap');
    if (!dlg) {
      host.insertAdjacentHTML('beforeend', `<md-dialog class="iv-wrap m3-iv" aria-label="End-of-day interview"></md-dialog>`);
      dlg = host.querySelector('md-dialog.iv-wrap');
      // Escape or the scrim also means "finish later"
      dlg.addEventListener('cancel', e => { e.preventDefault(); closeInterview(true); });
    }
    dlg.innerHTML = interviewInner();
    if (!dlg.open) dlg.show();
    requestAnimationFrame(() => { const th = $('#iv-thread'); if (th) th.scrollTop = th.scrollHeight; });
  }
  function closeInterview(saved) {
    const dlg = host.querySelector('md-dialog.iv-wrap');
    if (!dlg) return;
    dlg.close().then(() => dlg.remove());
    if (saved) App.toast('Interview saved. Pick it up any time today.');
  }

  // ── Hot spots ──
  const COVER = { covered: ['ok', 'verified', 'Covered'], partial: ['warn', 'warning', 'Partly covered'], inferred: ['warn', 'warning', 'Inferred, awaiting check'], gap: ['bad', 'help', 'Gap'] };
  // one square per question this month, coloured by how well a twin covers it
  const segs = h => Array.from({ length: h.n }, (_, i) => {
    const c = h.cover === 'covered' ? 'ok' : h.cover === 'gap' ? 'bad' : h.cover === 'partial' ? (i < h.n / 2 ? 'ok' : 'warn') : 'warn';
    return `<i class="${c}"></i>`;
  }).join('');
  function hotHTML() {
    const H = DATA.hotspots.map(h => ({ ...h, ...Senior.hotCover(h) }));
    return `<div class="m3-page">
      <p class="m3-intro md-typescale-body-large">Where new grads’ questions cluster this month, and the past work behind them. Gaps shape what Techne asks seniors next.</p>
      <div class="m3-stats three">
        ${stat(H.reduce((a, h) => a + h.n, 0), 'Questions this month', 'forum')}
        ${stat(`${H.filter(h => h.cover === 'covered').length} <span class="md-typescale-body-medium m3-muted">of ${H.length}</span>`, 'Covered by a twin', 'verified')}
        ${stat(H.filter(h => h.cover === 'gap').length, 'Gaps', 'help')}
      </div>
      <div class="m3-hot-grid">
        <section class="m3-card outlined">
          <div class="m3-card-head row"><h2 class="md-typescale-title-large">By topic</h2>
            <div class="m3-key md-typescale-body-small"><span><i class="ok"></i>Covered</span><span><i class="warn"></i>Partly covered or inferred</span><span><i class="bad"></i>Gap</span></div></div>
          <table class="m3-table md-typescale-body-medium">
            <thead class="md-typescale-title-small"><tr><th>Topic</th><th>Questions this month</th><th>Trend</th><th>Coverage</th><th>Next</th></tr></thead>
            <tbody>${H.map(h => { const [kind, ic, lab] = COVER[h.cover], it = h.traces && Senior.pastItem(h.traces); return `<tr>
              <td><span class="md-typescale-title-small">${h.topic}</span>${it ? `<span class="m3-trace md-typescale-body-small">${sym('history')}Traces to your change · ${it.lastChanged}</span>` : ''}</td>
              <td><div class="m3-segrow"><span class="m3-segs">${segs(h)}</span><span>${h.n}</span></div></td>
              <td class="m3-trend ${h.trend > 0 ? 'up' : h.trend < 0 ? 'down' : ''}">${h.trend === null ? 'New' : h.trend === 0 ? 'Flat' : `<span class="m3-meta-i">${sym(h.trend > 0 ? 'trending_up' : 'trending_down')}${Math.abs(h.trend)}%</span>`}</td>
              <td>${status(kind, `${lab}${h.twin ? ` · ${App.twinName(h.twin)}` : ''}`, ic, true)}</td>
              <td><div class="m3-next">${it && it.status === 'todo' ? `<md-text-button data-act="open-past" data-id="${it.id}">${sym('add_comment', 'icon')}Add context</md-text-button>` : ''}${h.cluster ? `<md-text-button data-sact="cluster" data-cl="${h.cluster}" trailing-icon>${h.next}${sym('arrow_forward', 'icon')}</md-text-button>` : h.next ? `<span class="m3-muted">${h.next}</span>` : ''}</div></td></tr>`; }).join('')}</tbody>
          </table>
        </section>
        ${Senior.pastSectionHTML()}
        <section class="m3-card outlined">
          <div class="m3-card-head"><div class="m3-row-acts"><h2 class="md-typescale-title-large">Upcoming interviews</h2>${App.synth()}</div>
            <p class="md-typescale-body-medium m3-muted">Techne interviews seniors about gaps, 5 minutes at the end of their day.</p></div>
          <md-list class="m3-dense">${DATA.interviewsPlanned.map(([who, topic, when, cl]) =>
            `<md-list-item type="button" data-sact="cluster" data-cl="${cl}"><span slot="start" class="m3-avatar">${who[0]}</span><div slot="headline">${topic}</div><div slot="supporting-text">with ${who} · ${when}</div>${sym('chevron_right', 'end')}</md-list-item>`).join('')}</md-list>
          <div class="m3-card-actions"><md-text-button data-sact="cluster" data-cl="">${sym('info', 'icon')}How Techne’s questions are built</md-text-button></div>
        </section>
      </div>
    </div>`;
  }

  // ── Your twin (senior): what it knows, where each piece came from, who asked, and the controls ──
  let twinTopic = null, twinOpen = 't1', twinTest = false;
  const docState = {}, confirmed = {};
  const trailHTML = t => `<ol class="m3-trail">${t.map(([when, ic, what, sub]) =>
    `<li><span class="m3-tl-ic">${sym(App.msName(ic))}</span><div>${when ? `<div class="md-typescale-label-medium m3-muted">${when}</div>` : ''}<div class="md-typescale-title-small">${what}</div>${sub ? `<div class="md-typescale-body-small m3-muted">${sub}</div>` : ''}</div></li>`).join('')}</ol>`;
  function twinHTML() {
    const T = DATA.twinPage, K = DATA.twinKnows;
    // confirming an inferred doc is kept in page state, so Replay puts it back
    const docs = T.docs.map(d => confirmed[d.id] ? { ...d, inferred: false, checked: 'just now', from: 'Inferred, confirmed by you' } : d)
      .filter(d => !twinTopic || d.topic === twinTopic);  // data order: waiting for you first, then newest
    const STATE = { private: ['lock', 'Private · not answered from'], retired: ['block', 'Retired · no longer answered from'] };
    const STAT_IC = ['description', 'forum', 'school', 'thumb_up'];
    return `<div class="m3-page">
      <div class="m3-pagehead">
        <p class="m3-intro md-typescale-body-large">Everything Senior Techne answers from your work. You decide what it knows.</p>
        <div class="m3-row-acts">${recLabel('Learning from your work')}
          <md-outlined-button data-sact="twin-pause">${sym(recording ? 'pause' : 'play_arrow', 'icon')}${recording ? 'Pause learning' : 'Resume'}</md-outlined-button></div>
      </div>
      <div class="m3-stats">${T.stats.map(([n, l], i) => stat(n, l.charAt(0).toUpperCase() + l.slice(1), STAT_IC[i])).join('')}</div>
      <div class="m3-twin-grid">
        <div class="m3-col">
          <section class="m3-card outlined">
            <div class="m3-card-head row"><div><h2 class="md-typescale-title-large">What it knows</h2><p class="md-typescale-body-medium m3-muted">${twinTopic ? `Showing ${twinTopic}` : 'Click a topic to see its docs'}</p></div>
              ${twinTopic ? `<md-text-button data-sact="twin-topic" data-t="">${sym('close', 'icon')}Show all topics</md-text-button>` : ''}</div>
            <div class="m3-tk">${T.topics.map(t => `<button class="${twinTopic === t.name ? 'on' : ''}" data-sact="twin-topic" data-t="${t.name}" aria-pressed="${twinTopic === t.name}"><md-ripple></md-ripple><md-focus-ring></md-focus-ring>
              <span class="md-typescale-title-small">${t.name}</span>
              <span class="m3-segs">${Array.from({ length: t.docs }, (_, i) => `<i class="${i < t.docs - t.inferred ? 'ok' : 'warn'}"></i>`).join('')}</span>
              <span class="md-typescale-body-medium"><b>${t.docs}</b> docs</span>
              <span class="md-typescale-body-small m3-muted">${t.used} uses this month</span></button>`).join('')}</div>
            <div class="m3-key md-typescale-body-small m3-key-foot"><span><i class="ok"></i>Verified by you</span><span><i class="warn"></i>Inferred, waiting for you</span></div>
          </section>
          <section class="m3-card outlined">
            <div class="m3-card-head"><h2 class="md-typescale-title-large">Docs in your twin${twinTopic ? ` · ${twinTopic}` : ''}</h2>
              <p class="md-typescale-body-medium m3-muted">Waiting for you first, then newest · ${docs.length} of ${twinTopic ? T.topics.find(t => t.name === twinTopic).docs : 128}</p></div>
            <div class="m3-tdocs">${docs.map(d => {
              const st = docState[d.id], open = twinOpen === d.id;
              return `<div class="m3-tdoc ${open ? 'open' : ''} ${st ? 'is-' + st : ''}">
                <button class="m3-tdoc-row" data-sact="twin-doc" data-id="${d.id}" aria-expanded="${open}"><md-ripple></md-ripple><md-focus-ring></md-focus-ring>
                  <span class="m3-lead ${d.inferred ? 'k-workaround' : 'k-verified'}">${sym(d.inferred ? 'warning' : 'diversity_3')}</span>
                  <span class="m3-tdoc-main"><span class="md-typescale-title-small">${d.title}</span><span class="md-typescale-body-small m3-muted">${d.topic} · ${d.from} · checked ${d.checked}</span></span>
                  ${st ? status('info', STATE[st][1], STATE[st][0]) : d.inferred ? status('warn', 'Inferred · check it') : `<span class="md-typescale-body-small m3-muted"><b>${d.used}</b> uses · ${d.helped} helped</span>`}
                  ${sym(open ? 'expand_less' : 'expand_more')}
                </button>
                ${open ? `<div class="m3-tdoc-body">
                  ${label('Where it came from')}${trailHTML(d.trail)}
                  <div class="m3-actions start">
                    ${d.inferred ? `<md-filled-button data-sact="twin-confirm" data-id="${d.id}">${sym('check', 'icon')}Confirm it</md-filled-button>` : `<md-outlined-button data-sact="twin-edit">${sym('edit', 'icon')}Edit</md-outlined-button>`}
                    <md-outlined-button data-sact="twin-private" data-id="${d.id}">${sym(st === 'private' ? 'lock_open' : 'lock', 'icon')}${st === 'private' ? 'Make it answerable again' : 'Keep private'}</md-outlined-button>
                    <md-text-button data-sact="twin-retire" data-id="${d.id}">${sym(st === 'retired' ? 'undo' : 'block', 'icon')}${st === 'retired' ? 'Bring it back' : 'Retire'}</md-text-button>
                  </div>
                </div>` : ''}
              </div>`;
            }).join('')}</div>
          </section>
        </div>
        <aside class="m3-col">
          <section class="m3-card outlined">
            <div class="m3-card-head"><h2 class="md-typescale-title-large">Asked this week</h2><p class="md-typescale-body-medium m3-muted">New grads’ questions Senior Techne answered from your twin</p></div>
            <md-list class="m3-asked">${T.asked.map(([q, who, ago, st, helped]) => `<md-list-item>
              <span slot="start" class="m3-lead ${st === 'gap' ? 'k-uncovered' : 'k-answer'}">${sym(st === 'gap' ? 'help' : 'chat')}</span>
              <div slot="headline">${q}</div><div slot="supporting-text">${who} · ${ago}</div>
              <div slot="supporting-text" class="m3-row-status">${st === 'gap' ? status('bad', 'Your twin didn’t know · in the Question Queue', null, true) : status('ok', `Answered${helped ? ' · it helped' : ''}`, 'check', true)}</div>
            </md-list-item>`).join('')}</md-list>
          </section>
          <section class="m3-card outlined">
            <div class="m3-card-head"><h2 class="md-typescale-title-large">Gaps</h2><p class="md-typescale-body-medium m3-muted">What new grads ask that your twin can’t answer yet</p></div>
            <md-list class="m3-dense">${K.gaps.map(([g, n, pid]) => {
              const it = pid && Senior.pastItem(pid);
              return `<md-list-item>${sym(it ? 'history' : 'help', 'start')}<div slot="headline">${g}</div><div slot="supporting-text">${it ? `${n} · Techne found your ${it.year} change.` : n}</div>
                ${it ? it.status === 'todo' ? `<md-text-button slot="end" data-act="open-past" data-id="${pid}">Add context</md-text-button>` : `<span slot="end">${status('ok', 'Added from your past work', 'history', true)}</span>` : ''}</md-list-item>`;
            }).join('')}</md-list>
            <p class="m3-subhead md-typescale-body-medium">Techne will ask you about the first one on Friday, as a new grad.</p>
            <div class="m3-card-actions">${twinTest ? `<div class="m3-test">
                <div class="m3-bubble ask md-typescale-body-medium">${K.test.q}</div>
                <div class="m3-bubble ans">${App.stepTag({ twin: 'priya', status: 'verified' })}<p class="md-typescale-body-medium">${K.test.a}</p><small class="md-typescale-body-small m3-muted">${K.test.src}</small></div>
                <div class="m3-bubble ask md-typescale-body-medium">${K.test.gapQ}</div>
                <div class="m3-bubble ans">${App.stepTag({ twin: null, status: 'unknown' })}<p class="md-typescale-body-medium">${K.test.gapA}</p></div></div>`
              : `<md-outlined-button data-sact="twin-test">${sym('chat', 'icon')}Test your twin</md-outlined-button>`}</div>
          </section>
        </aside>
      </div>
    </div>`;
  }

  // ── How Techne's questions are built ──
  let focusCluster = null;
  function personaHTML() {
    const P = DATA.personaPage;
    const sec = (title, extra = '', sub = '') => `<div class="m3-sec-h"><h2 class="md-typescale-headline-small">${title}</h2>${extra}${sub ? `<span class="md-typescale-body-medium m3-muted">${sub}</span>` : ''}</div>`;
    return `<div class="m3-page m3-persona">
      <p class="m3-intro md-typescale-body-large">When Techne interviews seniors, it asks as a synthetic new grad: the questions real new grads ask, so seniors’ twins learn the why.</p>
      <section>
        ${sec('Built from', '', 'Real questions, anonymised. Refreshed weekly.')}
        <div class="m3-card outlined"><md-list class="m3-clusters">${P.clusters.map((c, i) => `${i ? '<md-divider></md-divider>' : ''}<md-list-item class="${focusCluster === c.id ? 'flash' : ''}" id="cl-${c.id}">
          <div slot="headline">${c.name}</div><div slot="supporting-text">“${c.ex}”</div>
          <div slot="end" class="m3-cl-n"><span class="md-typescale-title-large">${c.n}</span><span class="md-typescale-body-small m3-muted">questions this month</span></div></md-list-item>`).join('')}</md-list></div>
        <div class="m3-two">${P.other.map(([n, l, sub]) => `<div class="m3-card filled m3-stat"><div class="md-typescale-headline-large">${n}</div><div class="md-typescale-title-small">${l}</div><div class="md-typescale-body-small m3-muted">${sub}</div></div>`).join('')}</div>
      </section>
      <section>
        ${sec('The new grad Techne asks as', App.synth())}
        <div class="m3-two">
          <div class="m3-card outlined"><div class="m3-card-head"><h3 class="m3-meta-i md-typescale-title-medium m3-knows">${sym('check_circle')}Knows</h3></div>
            <md-list class="m3-dense">${P.knows.map(k => `<md-list-item><div slot="headline">${k}</div></md-list-item>`).join('')}</md-list></div>
          <div class="m3-card outlined"><div class="m3-card-head"><h3 class="m3-meta-i md-typescale-title-medium m3-doesnt">${sym('help')}Doesn’t know yet</h3></div>
            <md-list class="m3-dense">${P.doesnt.map(k => `<md-list-item><div slot="headline">${k}</div></md-list-item>`).join('')}</md-list></div>
        </div>
        <p class="m3-cap md-typescale-body-medium">${sym('info')}The gaps are on purpose. They make Techne ask what a new grad would.</p>
      </section>
      <section>
        ${sec('Never used')}
        <div class="m3-card outlined m3-never">${P.never.map(([ic, t]) => `<div class="md-typescale-body-large">${sym(App.msName(ic))}<span>${t}</span></div>`).join('')}</div>
      </section>
      <section>
        ${sec('How we know it’s any good')}
        <div class="m3-stats three">
          <div class="m3-card filled m3-stat"><div class="md-typescale-headline-large">${P.quality.match}</div><div class="md-typescale-body-medium">${P.quality.matchText}</div></div>
          <div class="m3-card filled m3-stat"><div class="md-typescale-headline-large">${P.quality.useful}</div><div class="md-typescale-body-medium">Seniors rated Techne’s questions Useful</div></div>
          <div class="m3-card filled m3-stat"><div class="m3-meta-i md-typescale-title-small">${sym('update')}${P.quality.version}</div><div class="md-typescale-body-medium">Every Useful or Not relevant a senior taps tunes the next version.</div></div>
        </div>
      </section>
    </div>`;
  }

  function render(scr, el) {
    host = el;
    if (scr === 'twin') { el.innerHTML = twinHTML(); return; }
    if (scr === 'persona') {
      el.innerHTML = personaHTML();
      if (focusCluster) { const t = el.querySelector(`#cl-${focusCluster}`); t?.scrollIntoView({ block: 'center' }); focusCluster = null; }
      else el.scrollTop = 0;
      return;
    }
    if (scr === 'ide') {
      if (probeState === 'hidden') later(() => { probeState = 'asking'; if (host.querySelector('.m3-ide')) rerender('ide'); }, 700);
      el.innerHTML = ideHTML();
    } else if (scr === 'hot') el.innerHTML = hotHTML();
    else el.innerHTML = GradPages.reportHTML('senior').replace(/<p class="g-note/, `${Senior.impactHTML()}<p class="g-note`);
  }
  // keeps an open interview dialog across a re-render of the page under it
  function rerender(scr) {
    const iv = host.querySelector('md-dialog.iv-wrap');
    if (iv) iv.remove();
    render(scr, host);
    if (iv) host.appendChild(iv);
  }

  function onAct(act, el) {
    switch (act) {
      case 'moment': showMoment(+el.dataset.i, el); break;
      case 'twin-topic': twinTopic = el.dataset.t || null; twinOpen = null; rerender('twin'); break;
      case 'twin-doc': twinOpen = twinOpen === el.dataset.id ? null : el.dataset.id; rerender('twin'); break;
      case 'twin-test': twinTest = true; rerender('twin'); break;
      case 'twin-pause':
        recording = !recording;
        App.toast(recording ? 'Your twin is learning again.' : 'Paused. Your twin won’t learn from anything until you resume.');
        rerender('twin'); Shell.renderStatus('senior'); break;
      case 'twin-edit': App.toast('Opens the doc in the company repository for editing.'); break;
      case 'twin-confirm': {
        confirmed[el.dataset.id] = true;
        App.toast('Confirmed. Maya’s walkthrough now shows it as verified.'); rerender('twin'); break;
      }
      case 'twin-private': {
        const id = el.dataset.id;
        docState[id] = docState[id] === 'private' ? undefined : 'private';
        App.toast(docState[id] ? 'Kept private. Senior Techne won’t answer from it.' : 'Senior Techne can answer from it again.');
        rerender('twin'); break;
      }
      case 'twin-retire': {
        const id = el.dataset.id, was = docState[id];
        docState[id] = was === 'retired' ? undefined : 'retired';
        rerender('twin');
        if (docState[id]) App.undoToast('Retired. Senior Techne won’t answer from it.', () => { docState[id] = was; rerender('twin'); });
        break;
      }
      case 'cluster': focusCluster = el.dataset.cl || null; App.set({ role: 'senior', screen: 'persona' }); break;
      case 'moment-close': host.querySelector('.m3-mpop')?.remove(); host.querySelectorAll('[data-sact="moment"].active').forEach(b => b.classList.remove('active')); break;
      case 'pause':
        recording = !recording;
        App.toast(recording ? 'Recording again.' : 'Recording paused. Nothing is captured until you resume.');
        rerender('ide'); Shell.renderStatus('senior');
        break;
      case 'probe-answer':
        finishTyping($('#probe-a'));
        if (!$('#probe-a').value.trim()) { $('#probe-a').focus(); return; }
        DATA.interview.find(q => q.moment === DATA.seniorIde.probe.moment).given = $('#probe-a').value.trim();
        probeState = 'answered'; Senior.freshRestart(); rerender('ide'); break;
      case 'probe-later': probeState = 'later'; App.toast('Saved for tonight’s interview.'); rerender('ide'); break;
      case 'probe-close': probeState = 'later'; rerender('ide'); break;
      case 'to-drafts': Shell.setView('senior', 'drafts', true); Senior.openDraft('d-restart'); break;
      case 'interview': skipAnswered(); openInterview(); break;
      case 'rate-up': case 'rate-down': {
        App.toast(act === 'rate-up' ? 'Thanks. Techne will ask more questions like this.' : 'Got it. Techne will ask fewer questions like this.');
        const r = el.closest('.m3-rate');
        r.querySelectorAll('md-assist-chip').forEach(c => { c.disabled = c !== el; });
        r.classList.add('done');
        break;
      }
      case 'iv-send': case 'iv-skip': {
        if (act === 'iv-send') finishTyping($('#iv-a'));
        const a = $('#iv-a')?.value.trim();
        if (act === 'iv-send' && !a) { $('#iv-a').focus(); return; }
        DATA.interview[qIndex].given = act === 'iv-skip' ? '(Skipped. Techne will ask another day.)' : a;
        qIndex++;
        skipAnswered();
        openInterview();
        break;
      }
      case 'iv-close': closeInterview(true); break;
      case 'iv-review': closeInterview(false); Senior.addInterviewDraft(); Shell.setView('senior', 'drafts', true); Senior.openDraft(DATA.interviewDraft.id); break;
    }
  }

  // Answer fields type out the scripted answer, whatever keys are pressed, so a live walkthrough never stalls on typing
  const scriptFor = el => el.dataset.script === 'probe' ? DATA.seniorIde.probe.answer
    : el.dataset.script === 'past' ? DATA.pastWork.items.find(x => x.id === el.dataset.item)?.answer || ''
    : DATA.interview[qIndex]?.answer || '';
  let typing = null;
  function startTyping(el) {
    if (el.dataset.typed || typing) return;
    const text = scriptFor(el);
    el.value = '';
    let i = 0;
    const step = () => {
      el.value = text.slice(0, ++i);
      if (i < text.length) typing = setTimeout(step, 18 + Math.random() * 26);
      else { typing = null; el.dataset.typed = '1'; }
    };
    step();
  }
  function finishTyping(el) {
    if (!el) return;
    if (typing || !el.dataset.typed && el.value) { clearTimeout(typing); typing = null; el.value = scriptFor(el); el.dataset.typed = '1'; }
  }
  // the fields are md-outlined-text-field, so key and input events arrive retargeted to the host element
  document.addEventListener('keydown', e => {
    const el = e.target.closest?.('[data-script]');
    if (!el || e.metaKey || e.ctrlKey || ['Tab', 'Shift', 'Alt', 'Meta', 'Control', 'CapsLock', 'Escape'].includes(e.key)) return;
    e.preventDefault();
    if (e.key === 'Enter' && el.dataset.typed) { document.querySelector(el.dataset.script === 'probe' ? '[data-sact="probe-answer"]' : el.dataset.script === 'past' ? '[data-act="past-save"]' : '[data-sact="iv-send"]')?.click(); return; }
    startTyping(el);
  }, true);
  // paste, dictation and IME also produce the scripted answer
  document.addEventListener('beforeinput', e => {
    const el = e.target.closest?.('[data-script]');
    if (!el) return;
    e.preventDefault();
    startTyping(el);
  }, true);

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-sact]');
    if (b && host?.contains(b) && !b.disabled) onAct(b.dataset.sact, b);
  });

  function stop() { timers.forEach(clearTimeout); timers = []; host?.querySelector('md-dialog.iv-wrap')?.remove(); }
  function reset() { focusCluster = null; twinTopic = null; twinOpen = 't1'; twinTest = false; for (const k in docState) delete docState[k]; for (const k in confirmed) delete confirmed[k]; stop(); clearTimeout(typing); typing = null; recording = true; probeState = 'hidden'; qIndex = 0; momentsOpen = false; DATA.interview.forEach(q => delete q.given); }
  return { render, stop, reset, finishTyping, todayHTML, openMoment, toggleMoments: () => { momentsOpen = !momentsOpen; }, recording: () => recording };
})();
