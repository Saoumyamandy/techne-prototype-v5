// New grad pages that open as editor tabs: Home, Your twin (archive), learning path, onboarding and permissions.
// The year-end report renderer is shared with the senior side.
const GradPages = (() => {
  const $ = s => document.querySelector(s);
  let items = DATA.archive.map(a => ({ ...a }));
  let topic = null, onbStep = 2, onbRole = 'grad';

  const sym = (n, slot) => App.sym(n, slot);
  const TYPE = { walk: ['diversity_3', 'Walkthrough'], question: ['chat', 'Question'], saved: ['inventory_2', 'Saved work'], note: ['edit_note', 'Note'] };
  const VIS = { private: ['lock', 'Only you'], shared: ['group', 'Shared with team'], published: ['toll', 'Published'] };
  const visTag = v => `<span class="m3-status g-v-${v}">${sym(VIS[v][0])}${VIS[v][1]}</span>`;

  // Older items not shown on the timeline, so the rail badge and the page agree
  const OLDER = 17;
  const total = () => OLDER + items.length;
  function add(item) {
    items = items.filter(i => i.title !== item.title);
    items.unshift({ id: 'z' + Date.now(), date: 'Oct 30', fresh: true, ...item });
  }
  function addSaved(shared) {
    items = items.filter(i => i.id !== 'z0');
    items.unshift({ id: 'z0', date: 'Oct 30', type: 'saved', title: 'Added PDF invoices to the vendor file copy', with: 'With Priya R.’s twin · commit 3f2a91c', topics: ['Vendor files', 'PDF invoices'], vis: shared ? 'shared' : 'private', fresh: true });
  }
  // page title block shared by the new grad pages
  const head = (title, sub, side = '', over = '') => `<header class="g-head"><div>${over}<h1 class="md-typescale-headline-medium">${title}</h1><p class="md-typescale-body-large m3-muted">${sub}</p></div>${side}</header>`;
  const cardHead = (title, side = '') => `<div class="m3-card-head row"><h2 class="md-typescale-title-large">${title}</h2>${side}</div>`;

  // ── Your twin: knowledge graph + timeline ──
  function archiveHTML() {
    const shared = items.filter(i => i.vis !== 'private').length;
    const g = DATA.graph;
    const pos = Object.fromEntries(g.nodes.map(n => [n.id, n]));
    const counts = t => items.filter(i => i.topics.includes(t)).length;
    const svg = `<svg viewBox="0 0 560 360" class="kgraph" role="img" aria-label="Topics in your twin">
      ${g.links.map(([a, b]) => `<line x1="${pos[a].x}" y1="${pos[a].y}" x2="${pos[b].x}" y2="${pos[b].y}" class="kl ${topic && (a === topic || b === topic) ? 'on' : ''}"/>`).join('')}
      ${g.nodes.map(n => `<g class="kn ${topic === n.id ? 'on' : ''} ${counts(n.id) ? '' : 'empty'}" data-topic="${n.id}" tabindex="0" role="button" aria-label="${n.id}: ${counts(n.id)} items">
        <circle cx="${n.x}" cy="${n.y}" r="${n.r}"/>
        <text x="${n.x}" y="${n.y + n.r + 16}" text-anchor="middle">${n.id}</text>
        ${counts(n.id) ? `<text x="${n.x}" y="${n.y + 4}" text-anchor="middle" class="kc">${counts(n.id)}</text>` : ''}</g>`).join('')}
    </svg>`;
    const list = items.filter(i => !topic || i.topics.includes(topic));
    return `<div class="m3-page g-archive">
      ${head('Your twin', 'Everything you’ve done and learned, built up as you work. Private by default: only you see it until you share something.',
        `<div class="g-stats">${[[total(), 'items'], [shared, 'shared'], [45, 'credits']].map(([n, l]) => `<div><div class="md-typescale-headline-small">${n}</div><div class="md-typescale-body-medium m3-muted">${l}</div></div>`).join('')}</div>`)}
      <div class="g-arch-grid">
        <section class="m3-card outlined">
          ${cardHead('What your twin knows', topic ? `<md-text-button data-gact="clear">${sym('close', 'icon')}Show all</md-text-button>` : '<span class="md-typescale-body-small m3-muted">Click a topic to filter</span>')}
          <div class="g-graph">${svg}</div>
        </section>
        <section class="m3-card outlined">
          ${cardHead(`Timeline${topic ? ` · ${topic}` : ''}`, `<span class="md-typescale-body-small m3-muted">${topic ? `${list.length} items` : `Latest ${list.length} of ${total()}`}</span>`)}
          <md-list class="g-atl">${list.map(i => {
            const [ti, tl] = TYPE[i.type];
            return `<md-list-item class="${i.fresh ? 'is-fresh' : ''}">
              <div slot="start" class="g-atl-start"><span class="g-atl-date md-typescale-label-small">${i.date}</span><span class="m3-lead g-k-${i.type}">${sym(ti)}</span></div>
              <div slot="headline">${i.title}</div>
              <div slot="supporting-text">${tl} · ${i.with}</div>
              <div slot="supporting-text" class="g-tags">${i.topics.map(t => `<span class="m3-tag">${t}</span>`).join('')}</div>
              <div slot="end" class="g-atl-end">${visTag(i.vis)}${i.vis === 'private' ? `<md-outlined-button data-gact="share" data-id="${i.id}">Share for credits</md-outlined-button>` : ''}</div>
            </md-list-item>`;
          }).join('')}</md-list>
        </section>
      </div>
    </div>`;
  }

  // two bars on one track: a lighter one behind (Priya, or now) and a solid one in front (you, or the start of the year)
  const bars = (front, back) => `<div class="g-bars"><i class="back" style="width:${back}%"></i><i class="front" style="width:${front}%"></i></div>`;

  // ── Learning path: your twin next to a senior's twin ──
  function learnHTML() {
    const L = DATA.learning;
    return `<div class="m3-page g-learn">
      ${head('Learning path', 'Where you are against Priya R.’s twin, and what to learn next for your target role.',
        `<md-outlined-select id="target-role" label="Target role">${[L.role, 'Batch operations engineer', 'Reporting engineer'].map((o, i) => `<md-select-option value="${o}" ${i ? '' : 'selected'}><div slot="headline">${o}</div></md-select-option>`).join('')}</md-outlined-select>`)}
      <div class="g-two">
        <section class="m3-card outlined">
          ${cardHead('Your twin vs Priya R.’s twin', '<span class="g-legend md-typescale-body-small"><i class="front"></i>You <i class="back"></i>Priya</span>')}
          <ul class="g-cmp">${L.compare.map(([t, me, sr]) => `<li><span class="md-typescale-body-medium">${t}</span>${bars(me, sr)}<b class="md-typescale-label-large">${me}%</b></li>`).join('')}</ul>
          <p class="g-basis md-typescale-body-small">${sym('info')}${L.basis}</p>
        </section>
        <section class="m3-card outlined">
          ${cardHead('Your next 4 weeks')}
          <ol class="g-weeks">${L.weeks.map(w => `<li class="${w.items.some(i => i[1] === 'now') ? 'cur' : w.items.every(i => i[1] === 'done') ? 'done' : ''}">
            <span class="g-wk md-typescale-label-medium">Week ${w.w}</span><div><div class="md-typescale-title-small">${w.title}</div><ul>${w.items.map(([t, st]) => `<li class="s-${st} md-typescale-body-medium">${sym(st === 'done' ? 'check_circle' : st === 'now' ? 'play_circle' : 'radio_button_unchecked')}${t}${st === 'now' ? '<span class="g-now md-typescale-label-small">In progress</span>' : ''}</li>`).join('')}</ul></div></li>`).join('')}</ol>
          <div class="m3-card-actions"><md-filled-button data-gact="quiz">${sym('diversity_3', 'icon')}Ask Priya’s twin to quiz you</md-filled-button></div>
        </section>
      </div>
    </div>`;
  }

  // ── Onboarding and what Techne records ──
  const STEPS = ['Who you are', 'Your twin', 'What Techne records', 'Done'];
  function onboardHTML() {
    const body = [
      `<h2 class="md-typescale-headline-small">Who are you?</h2><p class="md-typescale-body-large m3-muted">This sets what your twin learns first.</p>
        <div class="g-choice">
          <label><md-radio name="orole" value="grad" ${onbRole === 'grad' ? 'checked' : ''} aria-label="New grad"></md-radio><div>${sym('school')}<div class="md-typescale-title-small">New grad</div><div class="md-typescale-body-small m3-muted">Get unblocked, build a record of good work</div></div></label>
          <label><md-radio name="orole" value="senior" ${onbRole === 'senior' ? 'checked' : ''} aria-label="Senior engineer"></md-radio><div>${sym('diversity_3')}<div class="md-typescale-title-small">Senior engineer</div><div class="md-typescale-body-small m3-muted">Teach your twin, approve what the team learns</div></div></label>
        </div>
        <md-outlined-select id="orole-sel" class="g-full" label="${onbRole === 'grad' ? 'Target role' : 'Your expertise'}">${(onbRole === 'grad' ? ['Procurement engineer', 'Batch operations engineer', 'Reporting engineer'] : ['COBOL and procurement', 'JCL and batch', 'Reporting data']).map((o, i) => `<md-select-option value="${o}" ${i ? '' : 'selected'}><div slot="headline">${o}</div></md-select-option>`).join('')}</md-outlined-select>`,
      `<h2 class="md-typescale-headline-small">Meet your twin</h2><p class="md-typescale-body-large m3-muted">Every engineer at the company has a twin that grows with their career.</p>
        <div class="g-explain">
          <div>${sym('diversity_3')}<div class="md-typescale-title-small">Your twin</div><span class="md-typescale-body-medium">Learns from what you save: tasks, walkthroughs, questions. Private until you share.</span></div>
          <div>${sym('auto_awesome')}<div class="md-typescale-title-small">Senior Techne</div><span class="md-typescale-body-medium">Routes your questions to the senior whose twin knows the answer, and always tells you whose it is.</span></div>
          <div>${App.synth()}<div class="md-typescale-title-small">Techne, as a new grad</div><span class="md-typescale-body-medium">When Techne interviews seniors, it asks the questions real new grads ask, so their twins learn the why. Never a real person.</span></div>
        </div>`,
      `<h2 class="md-typescale-headline-small">What Techne records</h2><p class="md-typescale-body-large m3-muted">You choose. You can change this any time from your avatar menu.</p>
        <div class="g-perm">
          ${[['In the IDE', [['Commands and errors', true], ['Files you change', true], ['Code you write', true]]],
             ['In the browser', [['Docs, runbooks and tickets', true], ['Every other site', false, 'Never recorded']]],
             ['Elsewhere', [['Screen video', false, 'Off by default, opt in per task'], ['#proc Slack channels', true], ['Slack DMs', false]]]].map(([g, rows]) =>
            `<div class="g-perm-g"><h3 class="md-typescale-title-small">${g}</h3>${rows.map(([l, on, hint]) => `<label class="g-switch-row"><div><div class="md-typescale-body-large">${l}</div>${hint ? `<div class="md-typescale-body-small m3-muted">${hint}</div>` : ''}</div><md-switch ${on ? 'selected' : ''} ${hint === 'Never recorded' ? 'disabled' : ''} aria-label="${l}"></md-switch></label>`).join('')}</div>`).join('')}
          <div class="g-perm-g"><h3 class="md-typescale-title-small">Never record</h3><md-chip-set class="g-never">${['Personal email', 'HR portal', 'Banking', 'Health sites'].map(n => `<md-input-chip label="${n}" remove-only></md-input-chip>`).join('')}<md-assist-chip label="Add"><md-icon slot="icon">add</md-icon></md-assist-chip></md-chip-set></div>
        </div>
        <ol class="g-promises">
          <li>${sym('lock')}<div><div class="md-typescale-title-small">Private until you share.</div><span class="md-typescale-body-medium">Your twin is yours. Nobody sees anything in it until you choose to share it.</span></div></li>
          <li>${sym('pause_circle')}<div><div class="md-typescale-title-small">Pause any time.</div><span class="md-typescale-body-medium">One click stops recording. Nothing is captured until you resume.</span></div></li>
          <li>${sym('shield')}<div><div class="md-typescale-title-small">Never used in performance reviews.</div><span class="md-typescale-body-medium">You can see, edit and delete anything in your twin. Your manager only sees what you choose to share.</span></div></li>
        </ol>`,
      `<h2 class="md-typescale-headline-small">You’re set</h2><p class="md-typescale-body-large m3-muted">Your twin starts learning from your next task. Senior Techne is on, so it’ll offer help when something breaks.</p>
        <ul class="g-summary md-typescale-body-large"><li>${sym('check_circle')}${onbRole === 'grad' ? 'Target role: Procurement engineer' : 'Expertise: COBOL and procurement'}</li><li>${sym('check_circle')}Recording: IDE, docs and #proc channels</li><li>${sym('check_circle')}Screen video: off</li><li>${sym('check_circle')}Never recorded: 4 kinds of site</li></ul>
        <md-filled-button data-gact="to-ide">${sym('code', 'icon')}Open the IDE</md-filled-button>`,
    ][onbStep];
    return `<div class="m3-page g-onboard"><section class="m3-card outlined g-onb-card">
      <ol class="g-stepper">${STEPS.map((st, i) => `<li class="${i === onbStep ? 'on' : i < onbStep ? 'done' : ''}"><span class="g-sn md-typescale-label-medium">${i < onbStep ? sym('check') : i + 1}</span><span class="md-typescale-label-large">${st}</span></li>`).join('<li class="g-step-line" aria-hidden="true"></li>')}</ol>
      <div class="g-onb-body">${body}</div>
      <div class="g-onb-foot">${onbStep > 0 ? '<md-text-button data-gact="onb-back">Back</md-text-button>' : '<span></span>'}${onbStep < 3 ? `<md-filled-button data-gact="onb-next" trailing-icon>Next${sym('arrow_forward', 'icon')}</md-filled-button>` : ''}</div>
    </section></div>`;
  }

  // ── Year-end report, owned by the person (both roles; also rendered inside the senior shell) ──
  function reportHTML(role) {
    const R = DATA.report[role];
    return `<div class="m3-page g-report">
      <header class="g-head"><div>${App.status('ok', 'Owned by you · only you see this', 'lock')}<h1 class="md-typescale-headline-medium">${R.title}</h1><p class="md-typescale-body-large m3-muted">${R.who} · ${R.period}</p></div>
        <div class="g-acts"><md-outlined-button data-gact="rep-share">${sym('send', 'icon')}Share with my manager</md-outlined-button><md-filled-button data-gact="rep-download">${sym('download', 'icon')}Download for yourself</md-filled-button></div></header>
      <div class="m3-stats">${R.stats.map(([n, l]) => `<div class="m3-card filled m3-stat"><div class="md-typescale-headline-large">${n}</div><div class="md-typescale-body-medium m3-muted">${l}</div></div>`).join('')}</div>
      <div class="g-two">
        <section class="m3-card outlined">${cardHead('How your twin grew', '<span class="g-legend md-typescale-body-small"><i class="front"></i>Start of year <i class="back"></i>Now</span>')}
          <ul class="g-cmp">${R.growth.map(([t, a, b]) => `<li><span class="md-typescale-body-medium">${t}</span>${bars(a, b)}<b class="md-typescale-label-large">${a}→${b}%</b></li>`).join('')}</ul></section>
        <section class="m3-card outlined">${cardHead('Highlights')}<ul class="g-hl md-typescale-body-large">${R.highlights.map(h => `<li>${sym('star')}${h}</li>`).join('')}</ul></section>
      </div>
      <p class="g-note md-typescale-body-medium">${sym('shield')}Built from what you saved and shared. Recordings are never used in performance reviews, and your manager sees this report only if you share it.</p>
    </div>`;
  }

  // ── Home: the welcome page, with the learning path where VS Code has its walkthroughs ──
  function homeHTML() {
    const L = DATA.learning, wk = L.weeks.find(w => w.items.some(i => i[1] === 'now')) || L.weeks[0];
    const next = L.weeks[L.weeks.indexOf(wk) + 1];
    const file = Grad.file(), files = DATA.tree.filter(f => !f.dir).map(f => f.name);
    const dirOf = name => {
      const i = DATA.tree.findIndex(f => f.name === name);
      for (let j = i - 1; j >= 0; j--) if (DATA.tree[j].dir && DATA.tree[j].depth < DATA.tree[i].depth) return DATA.tree[j].name;
      return '';
    };
    const open = 'data-wi-screen="learn" data-wi-side="path"', code = 'data-wi-screen="ide" data-wi-side="files"';
    const cards = [
      ...wk.items.map(([t, st]) => st === 'now'
        ? { icon: 'star', title: t, desc: `Week ${wk.w} · ${wk.title}. Senior Techne can walk you through it.`, pct: 40, tag: 'In progress', tone: 'now', featured: true, attrs: open }
        : { icon: st === 'done' ? 'check_circle' : 'radio_button_unchecked', title: t, pct: st === 'done' ? 100 : 0, tag: st === 'done' ? 'Done' : 'Up next', tone: st === 'done' ? 'done' : 'later', attrs: open }),
      ...(next ? next.items.map(([t]) => ({ icon: 'lock', title: t, tag: `Week ${next.w}`, tone: 'later', attrs: open })) : []),
    ].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0)).slice(0, 5);
    return Shell.welcome({
      sub: 'Maya Chen · new grad · week 2 of 6',
      start: [['note_add', 'New file…', 'data-wi-act="soon"'], ['folder_open', 'Open folder…', 'data-wi-act="soon"'], ['call_split', 'Clone repository…', 'data-wi-act="soon"'],
        ['play_arrow', `Continue ${Grad.task()}`, code], ['auto_awesome', 'Ask Senior Techne…', 'data-wi-act="ask"']],
      recent: [file, ...files.filter(f => f !== file)].slice(0, 3).map(f => [f, dirOf(f), f === file ? code : 'data-wi-act="soon"']),
      rt: `Learning path · week ${wk.w} of 6`, links: [['See all', open]], cards,
    });
  }

  // ── side bar views: Your twin and Learning path follow the code you have open ──
  // what each scenario is about, so the views can show what's relevant to it
  const ISSUE = {
    checked: { what: 'Copybook not found: VENDREC', topics: ['Copybooks'], twin: 'priya', knows: 'Local COBOL builds · 24 docs, verified',
      skill: ['COBOL builds and listings', 62, 95], steps: [['Fix a copybook error with Priya’s twin', 'now'], ['Set COBCPY once for every repo', 'next'], ['Read a compile listing', 'next']] },
    unchecked: { what: 'Invalid numeric data in PO-AMT', topics: ['Test data'], twin: null, knows: 'Nobody’s twin covers this yet. Your workaround goes to the Question Queue.',
      skill: ['Procurement domain', 35, 96], steps: [['Read the PO record layout in the copybook', 'next'], ['Run the PO batch in test', 'next'], ['Ask Dev K.’s twin about test data', 'later']] },
    filecopy: { what: 'PROC-512 · PDF invoices in the nightly copy', topics: ['Vendor files', 'PDF invoices'], twin: 'priya', knows: 'Nightly vendor file copy · 11 docs, 1 inferred',
      skill: ['Vendor files and the nightly copy', 40, 92], steps: [['PROC-512: PDF invoices in the file copy', 'now'], ['Run the PO batch in test', 'next'], ['VSAM vs the nightly export', 'later']] },
    restart: { what: 'VENDSYNC failed at step 3 (SQLCODE -911)', topics: ['JCL', 'Vendor sync'], twin: 'priya', knows: 'Vendor sync and restarts · 18 docs, verified',
      skill: ['Batch and JCL restarts', 15, 70], steps: [['Restart VENDSYNC from the failed step', 'now'], ['Shadow Dev K.’s twin on a JCL restart', 'next'], ['Read “Restarting a failed JCL step”', 'next']] },
  };
  const openPage = (scr, label) => `<md-icon-button data-wi-screen="${scr}" aria-label="${label}" title="${label}"><md-icon>open_in_new</md-icon></md-icon-button>`;
  const twinRow = i => `<md-list-item type="button" data-wi-screen="archive" class="${i.fresh ? 'on' : ''}"><md-icon slot="start">${TYPE[i.type][0]}</md-icon><div slot="headline">${i.title}</div><div slot="supporting-text">${TYPE[i.type][1]} · ${VIS[i.vis][1]}</div></md-list-item>`;
  const stepRow = ([t, st]) => `<md-list-item type="button" data-wi-screen="learn" class="${st === 'now' ? 'on' : st === 'done' ? 'done' : ''}"><md-icon slot="start">${st === 'done' ? 'check_circle' : st === 'now' ? 'play_circle' : st === 'later' ? 'lock' : 'radio_button_unchecked'}</md-icon><div slot="headline">${t}</div></md-list-item>`;
  const progress = () => `<div class="wi-sec md-typescale-label-large"><span>Your path</span><span>Week 2 of 6</span></div>
    <md-linear-progress value="0.333" aria-label="Onboarding: week 2 of 6"></md-linear-progress>`;
  const ctxCard = (label, I, file) => `<div class="wi-ctx"><span class="md-typescale-label-medium">${label}</span>${file ? `<span class="wi-ctx-file">${sym('description')}${file}</span>` : ''}<span class="md-typescale-body-small">${I.what}</span></div>`;
  function side(v) {
    const I = Grad.inCode() && ISSUE[Grad.issue()];
    if (v === 'twin') {
      const openBtn = `<md-outlined-button data-wi-screen="archive">${sym('open_in_new', 'icon')}Open Your twin</md-outlined-button>`;
      if (!I) return {
        title: 'Your twin', acts: openPage('archive', 'Open Your twin'),
        body: `<div class="wi-note md-typescale-body-small">${sym('lock')}<span>${total()} things saved. Private until you share one.</span></div>
          <div class="wi-sec md-typescale-label-large">Recent</div><md-list>${items.slice(0, 7).map(twinRow).join('')}</md-list>`,
        foot: `<md-filled-tonal-button data-wi-screen="archive">${sym('diversity_3', 'icon')}Open Your twin</md-filled-tonal-button>`,
      };
      const about = items.filter(i => i.fresh || i.topics?.some(t => I.topics.includes(t)));
      const t = I.twin && DATA.twins[I.twin];
      return {
        title: 'Your twin', acts: openPage('archive', 'Open Your twin'),
        body: `${ctxCard('About the code you have open', I, Grad.file())}
          <div class="wi-sec md-typescale-label-large">Saved about this</div>
          ${about.length ? `<md-list>${about.map(twinRow).join('')}</md-list>`
            : `<div class="wi-note md-typescale-body-small">${sym('bookmark_add')}<span>Nothing saved about this yet. Document it once it works, and next time help is one line.</span></div>`}
          <div class="wi-sec md-typescale-label-large">Who knows this</div>
          <div class="wi-who ${t ? '' : 'none'}"><span class="m3-avatar sm">${t ? t.initial : '?'}</span><div><div class="md-typescale-title-small">${t ? `${t.name}’s twin` : 'No twin yet'}</div><div class="md-typescale-body-small m3-muted">${I.knows}</div></div></div>`,
        foot: `<md-filled-button data-wi-act="document">${sym('note_add', 'icon')}Document this solution</md-filled-button>${openBtn}`,
      };
    }
    const L = DATA.learning;
    const foot = `<md-filled-tonal-button data-wi-screen="learn">${sym('route', 'icon')}Open full learning path</md-filled-tonal-button>`;
    if (!I) return {
      title: 'Learning path', acts: openPage('learn', 'Open the learning path'), foot,
      body: `${progress()}${L.weeks.map(w => `<div class="wi-sec md-typescale-label-large">Week ${w.w} · ${w.title}</div><md-list>${w.items.map(stepRow).join('')}</md-list>`).join('')}`,
    };
    const [sk, me, sr] = I.skill;
    return {
      title: 'Learning path', acts: openPage('learn', 'Open the learning path'), foot,
      body: `${ctxCard('For the issue you’re on', I)}
        <div class="wi-skill"><div class="wi-skill-row md-typescale-body-medium"><span>${sk}</span><b>${me}%</b></div>
          <div class="wi-bars"><i class="back" style="width:${sr}%"></i><i class="front" style="width:${me}%"></i></div>
          <span class="md-typescale-body-small m3-muted">You ${me}% · Priya R.’s twin ${sr}%</span></div>
        <div class="wi-sec md-typescale-label-large">Learn this next</div>
        <md-list>${I.steps.map(stepRow).join('')}</md-list>
        <md-text-button data-gact="quiz">${sym('diversity_3', 'icon')}Ask Priya’s twin to quiz you</md-text-button>
        ${progress()}`,
    };
  }

  let host = null, current = null;
  function render(scr, el) {
    host = el; current = scr;
    el.innerHTML = scr === 'home' ? homeHTML() : scr === 'archive' ? archiveHTML() : scr === 'learn' ? learnHTML() : scr === 'onboard' ? onboardHTML() : reportHTML('grad');
    if (scr === 'onboard') el.querySelectorAll('md-radio[name="orole"]').forEach(r => r.addEventListener('change', () => { onbRole = r.value; render('onboard', el); }));
  }

  function onAct(act, el) {
    switch (act) {
      case 'share': {
        const it = items.find(i => i.id === el.dataset.id);
        it.vis = 'shared';
        App.toast('Shared. A senior reviews it in the Question Queue before it joins team docs. +10 credits if approved.');
        break;
      }
      case 'clear': topic = null; break;
      case 'quiz': App.toast('Priya’s twin will quiz you on vendor files at the end of the day. 5 questions.'); return;
      case 'onb-next': onbStep = Math.min(3, onbStep + 1); break;
      case 'onb-back': onbStep = Math.max(0, onbStep - 1); break;
      case 'to-ide': onbStep = 2; App.set({ screen: 'ide' }); return;
      case 'rep-download': App.toast('Downloaded your-year-2026.pdf. It’s yours to keep.'); return;
      case 'rep-share': {
        // md-dialog renders in the top layer, so where it sits in the page doesn't matter
        const where = el.closest('.g-report');
        where.querySelector('.rep-dialog')?.remove();
        where.insertAdjacentHTML('beforeend', `<md-dialog class="rep-dialog" aria-label="Share with your manager">
          <div slot="headline" class="g-dhead"><div><span class="m-trig md-typescale-body-medium">${sym('lock')}<span>Nothing is sent until you press Share</span></span><span class="md-typescale-headline-small">Choose what your manager sees</span></div></div>
          <div slot="content" class="g-share">${[['Your numbers', 'Tasks saved, walkthroughs, docs published, credits'], ['How your twin grew', 'Topics at the start of the year and now'], ['Highlights', '3 things you did that helped the team']].map(([t, d], i) =>
            `<label class="g-share-row"><md-checkbox touch-target="wrapper" ${i < 2 ? 'checked' : ''} aria-label="${t}"></md-checkbox><div><div class="md-typescale-title-small">${t}</div><div class="md-typescale-body-small m3-muted">${d}</div></div></label>`).join('')}
            <p class="g-note md-typescale-body-small">${sym('shield')}Recordings and your private twin are never included.</p></div>
          <div slot="actions" class="g-dacts"><span class="md-typescale-body-small m3-muted">You can take it back any time.</span><md-text-button data-gact="rep-close">Cancel</md-text-button><md-filled-button data-gact="rep-send">${sym('send', 'icon')}Share</md-filled-button></div>
        </md-dialog>`);
        const dlg = where.querySelector('.rep-dialog');
        dlg.addEventListener('closed', () => dlg.remove());
        // Material Web loads as a module, so it may not be defined yet on a fast first click
        customElements.whenDefined('md-dialog').then(() => dlg.show());
        return;
      }
      case 'rep-close': el.closest('md-dialog').close(); return;
      case 'rep-send': {
        const dlg = el.closest('md-dialog');
        const n = [...dlg.querySelectorAll('md-checkbox')].filter(c => c.checked).length;
        dlg.close();
        App.toast(`Shared ${n} section${n === 1 ? '' : 's'} with your manager. You can take it back any time.`);
        return;
      }
    }
    render(current, host);
  }

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-gact]');
    if (b) { onAct(b.dataset.gact, b); return; }
    const n = e.target.closest('.kn');
    if (n && host?.contains(n)) { topic = topic === n.dataset.topic ? null : n.dataset.topic; render('archive', host); }
  });

  function reset() { items = DATA.archive.map(a => ({ ...a })); topic = null; onbStep = 2; onbRole = 'grad'; }
  return { render, reportHTML, add, addSaved, total, reset, side, items: () => items };
})();
