// Mobile tab: one phone frame, four flows. Seniors review their twin's drafts and answer Techne's questions on the go;
// new grads ask Senior Techne in Slack and look through their own twin.
const Mobile = (() => {
  const $ = s => document.querySelector(s);
  const sym = App.sym, status = App.status;
  let timers = [];
  const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
  let root, screen = 'approvals';
  let drafts, open = null, sendBack = false, probe = 'asking', slack = [], archive;

  const INFO = {
    approvals: ['Senior', 'Your twin’s drafts', 'Review what your twin drafted from your work, between meetings. Nothing is approved without opening it, and every approval can be undone.'],
    probes: ['Senior', 'Techne’s questions', 'Techne asks as a synthetic new grad about key moments from your day. Tap a reply or record a voice note.'],
    slack: ['New grad', 'Slack with Senior Techne', 'Ask like you’d message a colleague. Every answer says whose twin it came from.'],
    archive: ['New grad', 'Your twin', 'What you’ve saved and learned. Private until you share it.'],
  };
  const KIND_IC = { walk: 'diversity_3', question: 'chat', saved: 'inventory_2', note: 'edit_note' };

  function reset() {
    drafts = DATA.drafts.slice(0, 3).map(d => ({ ...d, status: 'todo' }));
    open = null; sendBack = false; probe = 'asking';
    slack = [
      { me: true, t: 'how do I add PDF invoices to the vendor file copy? PROC-512' },
      { bot: true, twin: 'priya', steps: DATA.scenarios.filecopy.steps.slice(1, 4) },
    ];
    archive = GradPages.items().map(i => ({ ...i }));
  }

  const statusBar = () => `<div class="mp-status md-typescale-label-large"><span>9:41</span><span class="mp-cam"></span><span class="mp-icons">${sym('signal_cellular_alt')}${sym('wifi')}${sym('battery_full')}</span></div>`;
  // M3 top app bar: small with a back arrow inside a flow, medium (title below) at the top of a flow
  const topBar = (title, { back, trailing = '', sub = '' } = {}) => back
    ? `<header class="mp-bar small"><md-icon-button data-mact="back" aria-label="Back to ${back}">${sym('arrow_back')}</md-icon-button><span class="mp-title md-typescale-title-large">${title}</span>${trailing}</header>`
    : `<header class="mp-bar medium"><div class="mp-bar-row"><h2 class="md-typescale-headline-small">${title}</h2>${trailing}</div>${sub ? `<p class="md-typescale-body-medium m3-muted">${sub}</p>` : ''}</header>`;

  function approvalsHTML() {
    if (open) {
      const d = drafts.find(x => x.id === open);
      return `<div class="mp-app">
        ${topBar('Draft', { back: 'Drafts', trailing: status('info', 'Your twin', 'diversity_3') })}
        <div class="mp-scroll mp-pad">
          <span class="m3-tag">${d.topic}</span>
          <h3 class="md-typescale-headline-small">${d.title}</h3>
          <p class="md-typescale-body-medium m3-muted">${d.kind === 'sent' ? `Sent to you · ${d.askedBy} asked` : d.kind === 'sessans' ? 'From your session + your answer' : 'From your session'} · ${d.ago}</p>
          ${d.inferred ? `<div class="m3-card m3-warnbox">${sym('warning')}<div><div class="md-typescale-title-small">Your twin inferred this</div><div class="md-typescale-body-medium">${d.inferred}</div></div></div>` : ''}
          <ol class="m3-steps">${d.steps.map(([t, b], i) => `<li><span class="m3-step-n md-typescale-label-large">${i + 1}</span><div><div class="md-typescale-title-small">${t}</div><p class="md-typescale-body-medium">${b}</p></div></li>`).join('')}</ol>
        </div>
        <div class="mp-actions"><md-outlined-button data-mact="sendback">Send back</md-outlined-button><md-filled-button data-mact="approve">${sym('check', 'icon')}Approve and publish</md-filled-button></div>
        ${sendBack ? `<div class="mp-scrim" data-mact="sb-cancel"></div><div class="mp-sheet" role="dialog" aria-label="Send back">
            <span class="mp-handle"></span>
            <div class="md-typescale-title-medium">What happens when you send it back</div>
            <ul class="md-typescale-body-medium"><li>Your comment goes to Senior Techne, which drafted this.</li><li>It’s redrafted and comes back to your To do.</li><li>Nothing is recorded against anyone.</li></ul>
            <md-outlined-text-field type="textarea" rows="2" label="What should change?"></md-outlined-text-field>
            <div class="m3-actions"><md-text-button data-mact="sb-cancel">Cancel</md-text-button><md-filled-button data-mact="sb-send">${sym('send', 'icon')}Send back</md-filled-button></div></div>` : ''}
      </div>`;
    }
    const todo = drafts.filter(d => d.status === 'todo');
    const doneRows = drafts.filter(d => d.status === 'done');
    return `<div class="mp-app">
      ${topBar('Your twin’s drafts', { trailing: todo.length ? `<span class="mp-count md-typescale-label-medium">${todo.length} to do</span>` : '', sub: 'Techne drafted these from your work. Approving teaches your twin and publishes to the team.' })}
      <div class="mp-scroll"><md-list class="mp-list">${todo.length ? todo.map(d => `<md-list-item type="button" data-mact="open" data-id="${d.id}">
        <span slot="start" class="m3-lead ${d.kind === 'sent' ? 'k-sent' : ''}">${sym(d.kind === 'sent' ? 'send' : 'videocam')}</span>
        <div slot="headline">${d.title}</div>
        <div slot="supporting-text">${d.kind === 'sent' ? `${d.askedBy} asked` : d.kind === 'sessans' ? 'From your session + your answer' : 'From your session'} · ${d.ago}</div>
        <span slot="end" class="mp-review md-typescale-label-large">Review</span></md-list-item>`).join('')
        : `<div class="m3-empty md-typescale-body-medium">${sym('task_alt')}All caught up</div>`}
        ${doneRows.map(d => `<md-list-item class="mp-done"><span slot="start" class="m3-lead k-verified">${sym('check')}</span><div slot="headline">${d.title}</div>
          <div slot="supporting-text">Approved · published</div></md-list-item>`).join('')}</md-list></div>
    </div>`;
  }

  function probesHTML() {
    const P = DATA.seniorIde.probe;
    if (probe === 'done') return `<div class="mp-app mp-center"><span class="mp-okic">${sym('check')}</span><h3 class="md-typescale-headline-small">Thanks, Priya</h3>
      <p class="md-typescale-body-medium m3-muted">Your twin drafted this into your drafts for you to check before anyone sees it.</p>
      <md-outlined-button data-mact="probe-reset">Show the question again</md-outlined-button></div>`;
    const replies = [P.answer, 'Steps 1–2 commit to VENDMAST. Never rerun them.', 'It depends. Let’s talk about it tonight.'];
    return `<div class="mp-app">
      ${topBar('Techne asks', { trailing: App.synth(), sub: 'About a key moment from today · 1 of 3' })}
      <div class="mp-scroll mp-pad">
        <div class="m3-card filled mp-q"><p class="md-typescale-title-medium">${P.q}</p>${status('info', P.at, 'terminal')}</div>
        <h3 class="m3-label md-typescale-title-small">Quick replies</h3>
        <div class="mp-replies">${replies.map(r => `<button class="m3-card outlined md-typescale-body-medium" data-mact="reply"><md-ripple></md-ripple><md-focus-ring></md-focus-ring>${r}</button>`).join('')}</div>
        <p class="m3-cap md-typescale-body-small">${sym('info')}${DATA.persona.note}</p>
      </div>
      <md-fab class="mp-fab ${probe === 'rec' ? 'rec' : ''}" variant="${probe === 'rec' ? 'tertiary' : 'primary'}" label="${probe === 'rec' ? 'Recording… tap to send' : 'Record a voice answer'}" data-mact="voice"><md-icon slot="icon">${probe === 'rec' ? 'stop' : 'mic'}</md-icon></md-fab>
    </div>`;
  }

  function slackHTML() {
    const bot = `<span class="mp-av bot">${sym('auto_awesome')}</span>`;
    const name = `<span class="md-typescale-title-small">Senior Techne</span><span class="m3-tag">APP</span>`;
    const msg = m => m.me
      ? `<div class="mp-msg"><span class="mp-av">M</span><div><div class="mp-msg-h"><span class="md-typescale-title-small">Maya Chen</span><span class="md-typescale-body-small m3-muted">9:44</span></div><p class="md-typescale-body-medium">${m.t}</p></div></div>`
      : m.typing ? `<div class="mp-msg">${bot}<div><div class="mp-msg-h">${name}</div><span class="mp-typing" aria-label="Senior Techne is typing"><i></i><i></i><i></i></span></div></div>`
      : `<div class="mp-msg">${bot}<div><div class="mp-msg-h">${name}<span class="md-typescale-body-small m3-muted">9:44</span></div>
          <p class="md-typescale-body-small m3-muted">${m.twin ? `Answering from ${App.twinName(m.twin)}’s twin` : 'No twin covers this yet'}</p>
          ${m.steps ? `<ol class="mp-steps md-typescale-body-medium">${m.steps.map(s => `<li><span>${s.title}</span>${App.stepTag(s, true)}</li>`).join('')}</ol>
            <md-text-button class="mp-open" data-mact="open-ide">${sym('code', 'icon')}Open the walkthrough in Techne IDE</md-text-button>`
          : `<p class="md-typescale-body-medium">${m.t}</p>${m.queued ? status('info', 'Sent to the Question Queue', 'group', true) : ''}`}</div></div>`;
    return `<div class="mp-app">
      <header class="mp-bar small">${sym('arrow_back')}${bot}<span class="mp-title md-typescale-title-medium">Senior Techne</span>${sym('expand_more')}</header>
      <div class="mp-scroll mp-thread" id="sl-thread">${slack.map(msg).join('')}</div>
      <div class="mp-input"><md-outlined-text-field id="sl-q" placeholder="Message Senior Techne" value="do PDFs need a virus scan first?" aria-label="Message Senior Techne"></md-outlined-text-field>
        <md-filled-icon-button type="button" data-mact="ask" aria-label="Send">${sym('send')}</md-filled-icon-button></div>
    </div>`;
  }

  function archiveHTML() {
    const VIS = { private: ['lock', 'Only you'], shared: ['group', 'Shared'], published: ['toll', 'Published'] };
    return `<div class="mp-app">
      ${topBar('Your twin', { trailing: status('info', 'Private', 'lock'), sub: `${archive.length} items · only you see these until you share one` })}
      <div class="mp-scroll"><md-list class="mp-list">${archive.map(i => `<md-list-item>
        <span slot="start" class="m3-lead">${sym(KIND_IC[i.type])}</span>
        <div slot="headline">${i.title}</div><div slot="supporting-text">${i.date} · ${i.with}</div>
        <div slot="end">${i.vis === 'private' ? `<md-text-button data-mact="share" data-id="${i.id}">Share</md-text-button>` : status(i.vis === 'published' ? 'ok' : 'info', VIS[i.vis][1], VIS[i.vis][0], true)}</div></md-list-item>`).join('')}</md-list></div>
    </div>`;
  }

  function render() {
    const [who, title, desc] = INFO[screen];
    const body = screen === 'approvals' ? approvalsHTML() : screen === 'probes' ? probesHTML() : screen === 'slack' ? slackHTML() : archiveHTML();
    root.innerHTML = `<div class="mob">
      <div class="mob-info">
        <span class="mob-who md-typescale-label-large">${who}</span>
        <h1 class="md-typescale-display-small">${title}</h1>
        <p class="md-typescale-body-large m3-muted">${desc}</p>
        <md-list class="mob-flows" aria-label="Mobile flows">${Object.entries(INFO).map(([k, [w, t]]) =>
          `<md-list-item type="button" class="${k === screen ? 'on' : ''}" data-mscreen="${k}" ${k === screen ? 'aria-current="true"' : ''}>
            ${sym(k === 'approvals' ? 'rate_review' : k === 'probes' ? 'auto_awesome' : k === 'slack' ? 'forum' : 'diversity_3', 'start')}
            <div slot="overline">${w}</div><div slot="headline">${t}</div></md-list-item>`).join('')}</md-list>
      </div>
      <div class="phone"><div class="phone-screen">${statusBar()}${body}<div class="mp-snack" id="m-snack" role="status"></div><div class="mp-gesture"></div></div></div>
    </div>`;
    const th = $('#sl-thread');
    if (th) th.scrollTop = th.scrollHeight;
    $('#sl-q')?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); askSlack(); } });
  }

  // M3 snackbar, inside the phone
  function snack(text, undo) {
    const s = $('#m-snack');
    s.innerHTML = `<span class="md-typescale-body-medium">${text}</span>${undo ? '<md-text-button>Undo</md-text-button>' : ''}`;
    s.classList.add('in');
    if (undo) s.querySelector('md-text-button').onclick = () => { undo(); s.classList.remove('in'); };
    later(() => s.classList.remove('in'), 5000);
  }

  function askSlack() {
    const q = $('#sl-q').value.trim();
    if (!q) return;
    slack.push({ me: true, t: q.replace(/</g, '&lt;') }, { bot: true, typing: true });
    render();
    later(() => {
      slack.pop();
      slack.push({ bot: true, twin: null, t: 'No twin knows whether PDFs need a virus scan before they reach the share. I’ve asked the seniors and will message you when one answers.', queued: true });
      render();
    }, 1100);
  }

  function onAct(act, el) {
    switch (act) {
      case 'open': open = el.dataset.id; sendBack = false; break;
      case 'back': open = null; break;
      case 'approve': {
        const d = drafts.find(x => x.id === open);
        d.status = 'done'; open = null; render();
        snack('Approved and published', () => { d.status = 'todo'; render(); });
        return;
      }
      case 'sendback': sendBack = true; break;
      case 'sb-cancel': sendBack = false; break;
      case 'sb-send': { const d = drafts.find(x => x.id === open); d.status = 'sent'; open = null; sendBack = false; render(); snack('Sent back. It returns once redrafted.'); return; }
      case 'reply': probe = 'done'; break;
      case 'voice':
        if (probe === 'rec') { probe = 'done'; render(); snack('Voice note sent · 0:14'); return; }
        probe = 'rec'; break;
      case 'probe-reset': probe = 'asking'; break;
      case 'ask': askSlack(); return;
      case 'open-ide': App.set({ role: 'grad', screen: 'ide', sc: 'filecopy' }); return;
      case 'share': { const i = archive.find(x => x.id === el.dataset.id); i.vis = 'shared'; render(); snack('Shared. A senior reviews it first.'); return; }
    }
    render();
  }

  function init() {
    root = $('#mobile');
    root.addEventListener('click', e => {
      const t = e.target.closest('[data-mscreen]');
      if (t) { App.set({ screen: t.dataset.mscreen }); return; }
      const b = e.target.closest('[data-mact]');
      if (b) onAct(b.dataset.mact, b);
    });
  }
  function show(scr) { screen = scr; open = null; sendBack = false; render(); }
  function start(st) { reset(); show(st.screen); }
  function stop() { timers.forEach(clearTimeout); timers = []; }

  return { init, start, restart: start, stop, show };
})();
