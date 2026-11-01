// Senior view, in the same web IDE as the new grad. Two lists with two ownership models:
// - Your twin's drafts: delegated to you only, never locked.
// - Question Queue: shared by every senior, first come first served, with claims.
// Nothing is approved in one click: every item opens for review first, and approvals can be undone.
const Senior = (() => {
  const $ = s => document.querySelector(s);
  let timers = [];
  const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };

  let body, sheetWrap;
  let screen = 'home', credits = 1240, flagged = null, interviewDone = false;
  let drafts, queue, docs, past, pastKnown, pastTab = 'todo';
  let draftTab = 'todo', queueTab = 'todo', queueFilter = 'all';
  let repoTopic = 'All', repoQuery = '', repoSort = 'used', repoSel = null;

  const DRAFT_KIND = {
    session: ['videocam', () => 'From your session'],
    sent: ['send', d => `Sent to you · ${d.askedBy} asked`],
    sessans: ['videocam', () => 'From your session + your answer'],
    interview: ['diversity_3', () => 'From your interview with Techne'],
    past: ['history', d => `From your past work · ${d.when}`],
  };
  const sym = App.sym, status = App.status;
  const synthChip = () => `<md-assist-chip class="m3-synth" label="Synthetic" title="Asks as a synthetic new grad. Click to see how it’s built."><md-icon slot="icon">auto_awesome</md-icon></md-assist-chip>`;
  const QUEUE_KIND = {
    workaround: ['flag', 'Workaround to check'],
    uncovered: ['help', 'Uncovered question'],
    answer: ['chat', 'Drafted answer to check'],
    published: ['person', 'Published by a new grad'],
  };

  function reset() {
    drafts = DATA.drafts.map(d => ({ ...d, status: 'todo' }));
    if (sentRecently()) drafts.unshift({ ...DATA.sentDraft, status: 'todo', fresh: true });
    if (restartFresh) Object.assign(drafts.find(x => x.id === 'd-restart'), { fresh: true, ago: 'just now' });
    if (interviewDone) drafts.unshift({ ...DATA.interviewDraft, status: 'todo', fresh: true });
    queue = DATA.queue.map(q => ({ ...q, status: 'todo' }));
    docs = DATA.docs.map(d => ({ ...d }));
    past = DATA.pastWork.items.map(i => ({ ...i, status: 'todo' }));
    pastKnown = {}; pastTab = 'todo';
    credits = 1240;
    draftTab = 'todo'; queueTab = 'todo'; queueFilter = 'all'; sideQuery = '';
    repoTopic = 'All'; repoQuery = ''; repoSel = null;
    SeniorPages.reset();
    Shell.renderStatus('senior');
  }
  const todoDrafts = () => drafts.filter(d => d.status === 'todo');
  const openQs = () => queue.filter(q => q.status === 'todo' && q.claimedBy !== 'Dev K.');

  // rail badges and the side bar lists follow the counts
  function updateCounts() { Shell.refresh('senior', ['drafts', 'queue']); }

  // ── shared bits ──
  function pieSVG(parts, size = 150) {
    const c = size / 2, R = c - 4;
    let a = -Math.PI / 2, paths = '';
    parts.forEach(p => {
      const b = a + p.v / 100 * Math.PI * 2;
      const [x1, y1, x2, y2] = [c + R * Math.cos(a), c + R * Math.sin(a), c + R * Math.cos(b), c + R * Math.sin(b)];
      paths += `<path d="M${c} ${c} L${x1.toFixed(2)} ${y1.toFixed(2)} A${R} ${R} 0 ${b - a > Math.PI ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}Z" fill="${p.fill}" stroke="var(--md-sys-color-surface-container-low)" stroke-width="2.5" stroke-linejoin="round"/>`;
      a = b;
    });
    return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">${paths}</svg>`;
  }
  const legend = parts => parts.map(p => `<li><i class="m3-swatch" style="background:${p.fill}"></i><span>${p.label}</span><b>${p.v}%</b></li>`).join('');
  // a small picture of what the new grad's IDE showed
  function shot(r) {
    const tree = r.tree.map((t, i) => `<div class="${i === r.treeOn ? 'on' : ''} ${/\./.test(t) ? 'f' : 'd'}">${sym(/\./.test(t) ? 'description' : 'folder')}${t}</div>`).join('');
    const code = r.code.map(([n, l]) => `<div class="${n === r.hl ? 'hl' : ''}"><span>${n}</span>${l || ' '}</div>`).join('');
    const term = r.term.map(l => `<div>${l.replace(/<r>/g, '<em>').replace(/<\/r>/g, '</em>')}</div>`).join('');
    return `<figure class="m3-shot"><figcaption class="md-typescale-label-large">${sym('code')}${r.file}<span class="m3-muted md-typescale-body-small">Techne IDE</span></figcaption>
      <div class="m3-shot-body"><div class="m3-shot-tree md-typescale-body-small">${tree}</div><div class="m3-shot-right"><div class="m3-shot-code">${code}</div><div class="m3-shot-term">${term}</div></div></div></figure>`;
  }
  function addCredits(n) {
    const from = credits, to = credits + n, t0 = performance.now();
    credits = to;
    const pill = $('#credits-pill');
    pill.classList.remove('gain'); void pill.offsetWidth; pill.classList.add('gain');
    $('#credits-plus').textContent = `${n > 0 ? '+' : ''}${n}`;
    const tick = now => {
      const k = Math.min(1, (now - t0) / 700);
      $('#credits').textContent = Math.round(from + (to - from) * k).toLocaleString('en-US');
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // ═════════ YOUR HOME ═════════
  const EXPERTISE = [
    { label: 'COBOL', v: 46, fill: 'var(--md-sys-color-primary)' }, { label: 'Procurement', v: 28, fill: 'var(--md-sys-color-tertiary)' },
    { label: 'JCL & batch', v: 16, fill: 'var(--md-sys-color-secondary)' }, { label: 'Other', v: 10, fill: 'var(--md-sys-color-outline-variant)' },
  ];
  // ═════════ HOME: the welcome page, with what needs you where VS Code has its walkthroughs ═════════
  const isNew = it => it.fresh || it.id === flagged;
  function needsYou() {
    const ds = todoDrafts(), qs = openQs(), out = [];
    for (let i = 0; i < Math.max(ds.length, qs.length); i++) { if (ds[i]) out.push(['draft', ds[i]]); if (qs[i]) out.push(['q', qs[i]]); }
    return out.sort((a, b) => isNew(b[1]) - isNew(a[1]));
  }
  function homeHTML() {
    const items = needsYou();
    const cards = items.slice(0, 5).map(([t, it], i) => {
      if (t === 'draft') {
        const [ic, lab] = DRAFT_KIND[it.kind];
        return { icon: i ? ic : 'star', featured: !i, title: it.title, desc: i < 2 ? `${lab(it)} · ${it.ago}. Only you can approve it.` : '', tag: it.fresh ? 'New draft' : 'Draft', tone: 'draft', attrs: `data-wi-act="open-draft" data-id="${it.id}"` };
      }
      const [ic, lab] = QUEUE_KIND[it.kind];
      return { icon: i ? ic : 'star', featured: !i, title: it.title, desc: i < 2 ? `${lab} · ${it.who} · ${it.ago}` : '', tag: it.claimedBy === 'you' ? 'Claimed by you' : it.id === flagged ? 'New question' : 'Question', tone: 'question', attrs: `data-wi-act="open-q" data-id="${it.id}"` };
    });
    return Shell.welcome({
      sub: 'Priya R. · senior · COBOL and procurement',
      start: [['folder_open', 'Open folder…', 'data-wi-act="soon"'], ['call_split', 'Clone repository…', 'data-wi-act="soon"'], ['search', 'Search the repository…', 'data-wi-act="search"'],
        ['videocam', 'Replay today’s session', 'data-wi-screen="ide" data-wi-side="files"'], ['auto_awesome', 'How Techne asks', 'data-wi-screen="persona"']],
      recent: [['VENDSYNC.jcl', 'procurement-batch · jcl', 'data-wi-screen="ide" data-wi-side="files"'], ...docs.filter(d => !d.fresh).slice(0, 2).map(d => [d.title, 'repository', `data-wi-act="doc" data-id="${d.id}"`])],
      rt: `Needs you · ${items.length}`, links: [['All drafts', 'data-wi-act="show-view" data-v="drafts"'], ['All questions', 'data-wi-act="show-view" data-v="queue"']], cards,
    });
  }
  // Your impact: contributions and expertise, shown on Your year
  function impactHTML() {
    return `<section class="m3-card outlined m3-impact open">
        <div class="m3-card-head"><h2 class="md-typescale-title-large">Your impact</h2><p class="md-typescale-body-medium m3-muted">Contributions and expertise this year</p></div>
        <div class="m3-impact-body">
          <div class="hm-block">
            <div class="md-typescale-body-medium" id="peak"></div>
            <div class="hm-wrap"><div class="hm-days md-typescale-label-small"><span></span><span>Mon</span><span></span><span>Wed</span><span></span><span>Fri</span><span></span></div>
              <div><div class="hm-months md-typescale-label-small" id="hm-months"></div><div class="hm" id="hm"></div></div></div>
          </div>
          <div class="m3-pie"><div class="pie-svg">${pieSVG(EXPERTISE, 120)}</div><ul class="m3-legend md-typescale-body-medium">${legend(EXPERTISE)}</ul></div>
          <div class="m3-cstats">${[['128', 'docs you approved'], ['41', 'new grads helped'], ['12', 'interviews with Techne'], ['<span id="hm-total"></span>', 'contributions']].map(([b, t]) => `<div><div class="md-typescale-headline-small">${b}</div><div class="md-typescale-body-medium m3-muted">${t}</div></div>`).join('')}</div>
        </div>
      </section>`;
  }
  function heatmap() {
    if (!$('#hm')) return;
    const r = App.rng(42);
    const start = new Date(2026, 0, 5), today = new Date(2026, 9, 30);
    const weeks = Math.floor((today - start) / 864e5 / 7) + 1;
    const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let cells = '', months = '', peak = { v: 0 }, total = 0, last = -1;
    for (let w = 0; w < weeks; w++) {
      const monday = new Date(start.getTime() + w * 7 * 864e5);
      if (monday.getMonth() !== last) { last = monday.getMonth(); months += `<span style="grid-column:${w + 1}">${MON[last]}</span>`; }
      for (let d = 0; d < 7; d++) {
        const day = new Date(monday.getTime() + d * 864e5);
        if (day > today) { cells += '<i class="fut"></i>'; continue; }
        const v = r() < (d >= 5 ? .1 : .58) ? Math.ceil(r() * r() * 14) : 0;
        total += v;
        if (v > peak.v) peak = { v, day };
        cells += `<i class="l${v === 0 ? 0 : v <= 2 ? 1 : v <= 5 ? 2 : v <= 9 ? 3 : 4}" title="${v} on ${MON[day.getMonth()]} ${day.getDate()}"></i>`;
      }
    }
    $('#hm').innerHTML = cells;
    $('#hm-months').innerHTML = months;
    $('#peak').innerHTML = `Peak: <b>${peak.v} reviews</b> <span class="m3-muted">(${MON[peak.day.getMonth()]} ${peak.day.getDate()})</span>`;
    $('#hm-total').textContent = total;
  }
  const RESULT_M3 = { approved: ['ok', 'Approved · published'], sentback: ['info', 'Sent back to redraft'], answered: ['ok', 'Answered'], noted: ['ok', 'Approved with a note'] };
  // ═════════ QUESTION QUEUE ═════════
  const QUEUE_FILTERS = [['all', 'All'], ['uncovered', 'Uncovered'], ['workaround', 'Workarounds'], ['published', 'From new grads'], ['answer', 'Drafted answers']];
  function queueHTML() {
    const todo = queue.filter(q => q.status === 'todo');
    const n = k => todo.filter(q => k === 'all' || q.kind === k).length;
    return `<div class="m3-page">
      <p class="m3-intro md-typescale-body-large">Questions real new grads asked that no twin could answer yet. Anyone can claim one.</p>
      <md-tabs class="m3-page-tabs" id="queue-tabs" aria-label="Question Queue" active-tab-index="${queueTab === 'done' ? 1 : 0}">
        <md-secondary-tab>To do <span class="m3-tab-count">${todo.length}</span></md-secondary-tab>
        <md-secondary-tab>Done <span class="m3-tab-count">${queue.length - todo.length}</span></md-secondary-tab>
      </md-tabs>
      ${queueTab === 'todo' ? `<md-chip-set data-filter="queue" aria-label="Show">${QUEUE_FILTERS.map(([v, l]) =>
        `<md-filter-chip label="${l} · ${n(v)}" data-val="${v}" ${queueFilter === v ? 'selected' : ''}></md-filter-chip>`).join('')}</md-chip-set>` : ''}
      <section class="m3-card outlined"><md-list class="m3-qlist" id="qlist"></md-list></section>
    </div>`;
  }
  function renderQueue() {
    let list = queue.filter(q => q.status === queueTab && (queueTab === 'done' || queueFilter === 'all' || q.kind === queueFilter));
    list = list.sort((a, b) => (b.id === flagged) - (a.id === flagged));
    if (!$('#qlist')) { updateCounts(); return; }
    $('#qlist').innerHTML = list.length ? list.map((q, i) => {
      const [ic, lab] = QUEUE_KIND[q.kind];
      const theirs = q.claimedBy && q.claimedBy !== 'you';
      const first = q.who.split(' ')[0];
      const fresh = q.id === flagged && q.status === 'todo';
      const sub = q.kind === 'workaround' ? [['auto_awesome', `Best guess, no twin: ${q.ai.map(s => s[0]).join(' → ')}`], ['person', `${first} applied it · ${q.did.result}`]]
        : q.kind === 'uncovered' ? [['auto_awesome', q.aiSays]]
        : q.kind === 'published' ? [['inventory_2', `From ${first}’s twin, shared for credits`]]
        : [['auto_awesome', `Drafted by Senior Techne · ${q.ai.length} steps`]];
      const tip = `${q.claimedBy} claimed this. It’s theirs to answer.`;
      const acts = q.status === 'done' ? status(...RESULT_M3[q.result])
        : theirs ? `<span title="${tip}">${status('info', `Claimed by ${q.claimedBy}`, 'lock')}</span><md-filled-tonal-button disabled title="${tip}">Review</md-filled-tonal-button>`
        : q.claimedBy === 'you' ? `${status('info', 'Claimed by you', 'lock')}<md-filled-tonal-button data-act="open-q">Review</md-filled-tonal-button>`
        : `<md-outlined-button data-act="claim">${sym('lock', 'icon')}Claim</md-outlined-button><md-filled-tonal-button data-act="open-q">Review</md-filled-tonal-button>`;
      return `${i ? '<md-divider></md-divider>' : ''}<md-list-item class="m3-qrow ${theirs ? 'is-theirs' : ''} ${fresh ? 'is-fresh' : ''}" data-id="${q.id}">
        <span slot="start" class="m3-lead k-${q.kind}">${sym(ic)}</span>
        <div slot="headline" class="m3-qtitle" ${theirs ? '' : 'data-act="open-q"'}>${fresh ? '<span class="m3-new md-typescale-label-small">New</span>' : ''}${q.title}</div>
        <div slot="supporting-text" class="m3-meta">${lab} · ${q.who} · ${q.ago}<span class="m3-tag">${q.topic}</span>${q.asked > 1 ? `<span class="m3-meta-i">${sym('group')}${q.asked} new grads asked this</span>` : ''}</div>
        ${sub.map(([si, t]) => `<div slot="supporting-text" class="m3-qsub">${sym(si)}<span>${t}</span></div>`).join('')}
        <div slot="end" class="m3-row-acts">${acts}</div>
      </md-list-item>`;
    }).join('') : `<div class="m3-empty md-typescale-body-medium">${sym('task_alt')}${queueTab === 'todo' ? 'Queue is clear.' : 'Nothing done yet.'}</div>`;
    updateCounts();
  }

  // ═════════ COMPANY REPOSITORY ═════════
  const TOPICS = [
    { label: 'COBOL', v: 34, fill: 'var(--md-sys-color-primary)' }, { label: 'Procurement', v: 31, fill: 'var(--md-sys-color-tertiary)' },
    { label: 'JCL & batch', v: 22, fill: 'var(--md-sys-color-secondary)' }, { label: 'Onboarding', v: 13, fill: 'var(--md-sys-color-outline-variant)' },
  ];
  const FROM = { answer: ['chat', 'Drafted answer'], session: ['videocam', 'From a session'], published: ['person', 'Published by a new grad'], interview: ['diversity_3', 'From an interview with Techne'] };
  function repoHTML() {
    return `<div class="m3-page m3-repo ${repoSel ? 'has-sel' : ''}">
      <aside class="m3-repo-side">
        <section class="m3-card outlined">
          <div class="m3-card-head"><h2 class="md-typescale-title-medium">Topics</h2><p class="md-typescale-body-medium m3-muted">Across every senior’s twin</p></div>
          <div class="m3-pie col">${pieSVG(TOPICS, 128)}<ul class="m3-legend md-typescale-body-medium">${legend(TOPICS)}</ul></div>
        </section>
        <section class="m3-card filled m3-glance">${[['412', 'docs'], ['87%', 'checked in the last 90 days'], ['23', 'twins contributing'], ['1.9k', 'uses this month']].map(([b, t]) =>
          `<div><div class="md-typescale-headline-small">${b}</div><div class="md-typescale-body-small m3-muted">${t}</div></div>`).join('')}</section>
        <section class="m3-card outlined">
          <div class="m3-card-head"><h2 class="md-typescale-title-medium">Twins answering most</h2></div>
          <md-list class="m3-dense m3-people">${[['P', 'Priya R.', 'COBOL · 612 answers'], ['D', 'Dev K.', 'JCL · 488 answers'], ['L', 'Lena M.', 'Procurement · 201'], ['M', 'Maya Chen', 'New grad · 6 published']].map(([i, n, m]) =>
            `<md-list-item><span slot="start" class="m3-avatar">${i}</span><div slot="headline">${n}’s twin</div><div slot="supporting-text">${m}</div></md-list-item>`).join('')}</md-list>
        </section>
      </aside>
      <section class="m3-repo-main">
        <p class="m3-intro md-typescale-body-large">Everything a senior has approved, from sessions, interviews, answers and new grads’ published work.</p>
        <div class="m3-repo-tools">
          <md-outlined-text-field id="repo-q" label="Search docs" value="${repoQuery}">${sym('search', 'leading-icon')}</md-outlined-text-field>
          <md-outlined-select id="repo-sort" label="Sort by">
            <md-select-option value="used" ${repoSort === 'used' ? 'selected' : ''}><div slot="headline">Most used</div></md-select-option>
            <md-select-option value="recent" ${repoSort === 'recent' ? 'selected' : ''}><div slot="headline">Recently checked</div></md-select-option>
          </md-outlined-select>
        </div>
        <md-chip-set data-filter="topic" aria-label="Topic">${['All', 'COBOL', 'Procurement', 'JCL', 'Onboarding'].map(t =>
          `<md-filter-chip label="${t}" data-val="${t}" ${repoTopic === t ? 'selected' : ''}></md-filter-chip>`).join('')}</md-chip-set>
        <div class="m3-doclist" id="doclist"></div>
      </section>
      <aside class="m3-repo-preview" id="repo-preview"></aside>
    </div>`;
  }
  const AGE = s => s === 'just now' ? 0 : parseFloat(s) * (/day/.test(s) ? 1 : /week/.test(s) ? 7 : /month/.test(s) ? 30 : 1);
  function renderDocs() {
    let list = docs.filter(d => (repoTopic === 'All' || d.topic === repoTopic) && (!repoQuery || (d.title + d.summary).toLowerCase().includes(repoQuery.toLowerCase())));
    list = list.sort((a, b) => a.fresh ? -1 : b.fresh ? 1 : repoSort === 'used' ? b.used - a.used : AGE(a.checked) - AGE(b.checked));
    $('#doclist').innerHTML = list.length ? list.map(d => {
      const [fi, fl] = FROM[d.from];
      return `<button class="m3-card outlined m3-doc ${d.versions > 1 ? 'stacked' : ''} ${repoSel === d.id ? 'sel' : ''} ${d.fresh ? 'is-fresh' : ''}" data-act="doc" data-id="${d.id}" aria-pressed="${repoSel === d.id}">
        <md-ripple></md-ripple><md-focus-ring></md-focus-ring>
        <span class="m3-doc-top"><span class="m3-tag">${d.topic}</span><span class="m3-meta-i">${sym(fi)}${d.author ? `Published by ${d.author.split(' ')[0]}` : fl}</span>${d.stale ? status('warn', 'Needs a recheck', 'schedule', true) : ''}${d.fresh ? '<span class="m3-new md-typescale-label-small">New</span>' : ''}</span>
        <span class="md-typescale-title-medium">${d.title}</span><span class="md-typescale-body-medium m3-muted">${d.summary}</span>
        <span class="m3-doc-meta md-typescale-body-small"><span class="m3-meta-i">${sym('diversity_3')}${d.by === 'Team' ? 'Team' : `${d.by}’s twin`} · checked ${d.checked}</span><span class="m3-meta-i">${sym('visibility')}Used ${d.used} times</span><span class="m3-meta-i">${sym('layers')}v${d.versions}</span></span>
      </button>`;
    }).join('') : `<div class="m3-empty md-typescale-body-medium">${sym('search_off')}No docs match. Try another topic or search.</div>`;
    renderPreview();
  }
  function renderPreview() {
    const el = $('#repo-preview');
    const d = docs.find(x => x.id === repoSel);
    if (!d) { el.innerHTML = ''; return; }
    const [fi, fl] = FROM[d.from];
    const hist = [[`v${d.versions}`, `Checked by ${d.by}`, d.checked], ...(d.versions > 1 ? [[`v${d.versions - 1}`, 'Edited after 3 new grads asked a follow-up', '2 months ago']] : []),
      ['v1', d.author ? `Published from ${d.author}’s twin` : d.from === 'interview' ? `Drafted from ${d.by}’s interview with Techne` : d.from === 'session' ? `Drafted from ${d.by}’s recorded session` : 'Drafted by Senior Techne from a new grad’s question', 'first version']];
    el.innerHTML = `<section class="m3-card filled m3-pv">
      <div class="m3-pv-top"><span class="m3-tag">${d.topic}</span><md-icon-button data-act="doc-close" aria-label="Close the preview">${sym('close')}</md-icon-button></div>
      <h2 class="md-typescale-headline-small">${d.title}</h2>
      <div class="m3-doc-meta md-typescale-body-small"><span class="m3-meta-i">${sym(fi)}${fl}</span><span class="m3-meta-i">${sym('visibility')}Used ${d.used} times</span></div>
      <p class="md-typescale-body-large">${d.summary}</p>
      ${d.stale ? `<div class="m3-card m3-warnbox">${sym('schedule')}<div class="md-typescale-body-medium">Not checked in 4 months. Techne will ask ${d.by} about it on Monday.</div></div>` : ''}
      <h3 class="m3-label md-typescale-title-small">History</h3>
      <ol class="m3-hist">${hist.map(([v, t, w]) => `<li><span class="m3-hv md-typescale-label-medium">${v}</span><div><div class="md-typescale-title-small">${t}</div><div class="md-typescale-body-small m3-muted">${w}</div></div></li>`).join('')}</ol>
      <div class="m3-actions start"><md-filled-tonal-button data-act="doc-edit">${sym('edit', 'icon')}Suggest an edit</md-filled-tonal-button><md-outlined-button data-act="doc-outdated">${sym('flag', 'icon')}Mark outdated</md-outlined-button></div>
    </section>`;
  }

  // ═════════ REVIEW SHEETS ═════════
  const stepsEd = list => `<ol class="m3-steps">${list.map(([t, b], i) => `<li><span class="m3-step-n md-typescale-label-large">${i + 1}</span><div><div class="md-typescale-title-small" contenteditable="true" spellcheck="false">${t}</div><p class="md-typescale-body-medium" contenteditable="true" spellcheck="false">${b}</p></div></li>`).join('')}</ol>`;
  const chips = list => `<md-chip-set>${list.map(f => `<md-assist-chip label="${f.replace(/<[^>]+>/g, '').replace(/"/g, '&quot;')}"><md-icon slot="icon">link</md-icon></md-assist-chip>`).join('')}</md-chip-set>`;
  const asker = (who, role, ago) => `<div class="m3-asker"><span class="m3-avatar">${who[0]}</span><div><div class="md-typescale-title-small">${who}</div><div class="md-typescale-body-small m3-muted">${role}</div></div><span class="md-typescale-body-small m3-muted">${ago}</span></div>`;
  const label = (t, extra = '') => `<h3 class="m3-label md-typescale-title-small">${t}${extra}</h3>`;
  // An opened draft or question fills the editor area as a preview tab
  function openSheet(html, id, type) {
    sheetWrap.hidden = false; body.hidden = true;
    sheetWrap.dataset.id = id;
    sheetWrap.dataset.type = type;
    sheetWrap.innerHTML = `<div class="m3-sheet" role="region" aria-label="Review">${html}</div>`;
    sheetWrap.scrollTop = 0;
    const it = type === 'draft' ? drafts.find(x => x.id === id) : type === 'past' ? pastItem(id) : queue.find(x => x.id === id);
    Shell.setPreview('senior', { label: it?.title || it?.system || 'Review', icon: type === 'draft' ? 'rate_review' : type === 'past' ? 'history' : 'help' });
    updateCounts();
  }
  function hideSheet() { if (sheetWrap.hidden) return; sheetWrap.hidden = true; body.hidden = false; Shell.previewActive('senior', false); updateCounts(); }
  function showSheet() { if (!sheetWrap.innerHTML) return; sheetWrap.hidden = false; body.hidden = true; Shell.previewActive('senior', true); updateCounts(); }
  function closeSheet() {
    const was = !!sheetWrap.innerHTML;
    sheetWrap.hidden = true; sheetWrap.innerHTML = ''; body.hidden = false;
    if (was) { Shell.setPreview('senior', null); updateCounts(); }
  }
  const reviewing = (type, id) => !sheetWrap.hidden && sheetWrap.dataset.type === type && sheetWrap.dataset.id === id;
  const sheetTop = (back, kind, topic, chip) => `<header class="m3-sheet-top">
    <md-icon-button data-act="close" aria-label="Back to ${back}"><md-icon>arrow_back</md-icon></md-icon-button>
    <div class="m3-sheet-title"><div class="md-typescale-title-large">${kind}</div><div class="md-typescale-body-medium m3-muted">${back} · ${topic}</div></div>
    ${chip}
    <md-icon-button data-act="close" aria-label="Close"><md-icon>close</md-icon></md-icon-button></header>`;

  // Your twin's drafts: yours, so no claim or lock chip
  function openDraft(id) {
    const d = drafts.find(x => x.id === id);
    d.fresh = false;
    let left;
    if (d.kind === 'session') {
      left = `${label('Your recorded session')}<div class="m3-when md-typescale-body-medium">${sym('videocam')}${d.session.when}</div>
        <ol class="m3-timeline">${d.session.moments.map(([t, k, txt, key]) => `<li class="${key ? 'key' : ''}"><span class="md-typescale-label-medium m3-muted">${t}</span><span class="m3-tl-ic">${sym(k === 'doc' ? 'menu_book' : k === 'message' ? 'chat' : 'terminal')}</span><div class="md-typescale-body-medium">${txt}${key ? `<span class="m3-key md-typescale-label-small">${sym('star')}Key moment</span>` : ''}</div></li>`).join('')}</ol>`;
    } else if (d.kind === 'sessans') {
      const m = DATA.seniorIde.moments[d.moment];
      const ans = DATA.interview.find(q => q.moment === d.moment)?.given || DATA.seniorIde.probe.answer;
      left = `${label('The moment in your session')}
        <div class="m3-card filled m3-moment">${sym('star')}<div><div class="md-typescale-title-small">${m.time} · ${m.label}</div><code>restart VENDSYNC --from=STEP03</code><div class="md-typescale-body-medium m3-muted">${m.reason}</div></div></div>
        ${label('Your answer to Techne', synthChip())}
        <blockquote class="m3-quote md-typescale-body-large">“${ans}”</blockquote>
        <p class="m3-cap md-typescale-body-small">${sym('info')}Techne asked as a new grad, because 9 new grads asked about rerunning a failed job this month.</p>`;
    } else if (d.kind === 'past') {
      const i = pastItem(d.pastId);
      left = `${label('What Techne found')}${pastArtifact(i)}
        ${label('Your answer to Techne', synthChip())}
        <blockquote class="m3-quote md-typescale-body-large">“${i.given || i.guess}”</blockquote>
        <p class="m3-cap md-typescale-body-small">${sym('history')}${i.given ? 'You added this' : 'You confirmed Techne’s guess'}. Techne asked as a new grad.</p>`;
    } else if (d.kind === 'sent') {
      left = `${label(`What ${d.askedBy.split(' ')[0]} was doing`)}${shot(d.shot)}
        ${d.inferred ? `<div class="m3-card m3-warnbox">${sym('warning')}<div><div class="md-typescale-title-small">Your twin inferred this</div><div class="md-typescale-body-medium">${d.inferred}</div></div></div>` : `<p class="m3-cap md-typescale-body-small">${sym('send')}Senior Techne sent this to you because your twin drafted the answer.</p>`}`;
    } else {
      left = `${label('Your interview with Techne', synthChip())}
        <ol class="m3-qa">${DATA.interview.map(i => `<li><div class="md-typescale-title-small">${sym('auto_awesome')}${i.q}</div><p class="md-typescale-body-medium">${i.given || i.answer}</p></li>`).join('')}</ol>
        <p class="m3-cap md-typescale-body-small">${sym('info')}${DATA.persona.note}</p>`;
    }
    const right = `${d.kind === 'sent' ? asker(d.askedBy, 'Asked Senior Techne · routed to your twin', d.ago) : ''}
      ${label('Goes into your twin and the team docs as')}
      <h2 class="m3-doc-h md-typescale-headline-small" contenteditable="true" spellcheck="false">${d.title.replace(/^Confirm: /, '')}</h2>
      ${label(`${d.steps.length} steps`, `<span class="md-typescale-body-small m3-muted m3-hint">${sym('edit')}Click any step to edit</span>`)}
      ${stepsEd(d.steps)}
      ${label('Drafted from')}${chips(d.from)}`;
    openSheet(`${sheetTop('Your twin’s drafts', DRAFT_KIND[d.kind][1](d), d.topic, status('info', 'Your twin · only you review this'))}
      <div class="m3-sheet-grid"><div class="m3-sheet-col">${left}</div><div class="m3-sheet-col">${right}</div></div>
      <footer class="m3-sheet-foot" id="sheet-foot"><span class="md-typescale-body-medium m3-muted">Approving teaches your twin and publishes this to the company repository.</span>
        <md-outlined-button data-act="sendback">Send back</md-outlined-button><md-filled-button data-act="approve">${sym('check', 'icon')}Approve and publish</md-filled-button></footer>`, id, 'draft');
  }

  function openQueueItem(id) {
    const q = queue.find(x => x.id === id);
    if (q.claimedBy && q.claimedBy !== 'you') { App.toast(`${q.claimedBy} claimed this. It’s theirs to answer.`); return; }
    q.claimedBy = 'you';
    renderQueue();
    let left, right, foot;
    const first = q.who.split(' ')[0];
    if (q.kind === 'workaround') {
      left = `${label(`What ${first} hit`)}${shot(q.shot)}
        ${label('What Senior Techne suggested', status('bad', 'No twin covers this', null, true))}${stepsEd(q.ai)}`;
      right = `${asker(q.who, q.role, q.ago)}
        ${label(`What ${first} did`)}
        <div class="m3-diff"><div class="m3-diff-file md-typescale-label-large">${sym('description')}${q.did.file}</div>${q.did.removed.map(l => `<div class="rm"><span>−</span>${l}</div>`).join('')}${q.did.added.map(l => `<div class="add"><span>+</span>${l}</div>`).join('')}<div class="m3-diff-res md-typescale-body-small">${sym('terminal')}${q.did.result}</div></div>
        ${label('Your call')}
        <div class="m3-choices" id="choices" role="radiogroup">${[['good', 'Good fix', 'Publish it as checked by you. Your twin learns it.'], ['note', 'OK for test data only', 'Publish it with a note about when not to use it'], ['wrong', 'Not the right fix', 'Write the correct answer instead']].map(([v, t, d]) =>
          `<label><md-radio name="call" value="${v}" aria-label="${t}"></md-radio><div><div class="md-typescale-title-small">${t}</div><div class="md-typescale-body-medium m3-muted">${d}</div></div></label>`).join('')}
        </div><md-outlined-text-field id="call-text" type="textarea" rows="3" placeholder="Your note or the correct answer" hidden></md-outlined-text-field>`;
      foot = `<span class="md-typescale-body-medium m3-muted">${first} sees your call in their IDE, and your twin learns the answer.</span>
        <md-filled-button data-act="send-call" id="send-call" disabled>${sym('send', 'icon')}Send</md-filled-button>`;
    } else if (q.kind === 'uncovered') {
      left = `${label('Question')}<p class="md-typescale-title-large">“${q.title}”</p>${label('Context')}<p class="md-typescale-body-medium">${q.context}</p>
        ${label('Senior Techne says')}<blockquote class="m3-quote m3-ai md-typescale-body-large">${sym('auto_awesome')}<span>${q.aiSays}</span></blockquote>
        <p class="m3-cap md-typescale-body-small">${sym('group')}${q.asked} new grad${q.asked > 1 ? 's' : ''} asked this in the last 30 days</p>`;
      right = `${asker(q.who, q.role, q.ago)}${label('Your answer')}
        <md-outlined-text-field id="answer-text" type="textarea" rows="7" placeholder="Answer in your own words. Your twin turns it into steps for you to check."></md-outlined-text-field>
        <md-text-button class="m3-start" data-act="voice">${sym('mic', 'icon')}Or record a quick voice answer</md-text-button>`;
      foot = `<span class="md-typescale-body-medium m3-muted">Your answer goes into your twin as a draft for you to check, then all ${q.asked} new grad${q.asked > 1 ? 's get' : ' gets'} it.</span>
        <md-filled-button data-act="send-answer">${sym('send', 'icon')}Send to my twin</md-filled-button>`;
    } else {
      left = `${label(`From ${first}’s twin`)}<blockquote class="m3-quote md-typescale-body-large">“${q.note}”</blockquote>
        ${label(`What ${first} ran`)}<pre class="m3-code">${q.ran.join('\n')}</pre>
        <p class="m3-cap md-typescale-body-small">${sym('toll')}${first} earns credits if you approve this.</p>`;
      right = `${asker(q.who, q.role, q.ago)}${label('Goes into the team docs as')}
        <h2 class="m3-doc-h md-typescale-headline-small" contenteditable="true" spellcheck="false">${q.title}</h2>${stepsEd(q.steps)}`;
      foot = `<span class="md-typescale-body-medium m3-muted">Approving publishes this to the company repository, credited to ${first}.</span>
        <md-outlined-button data-act="sendback">Send back</md-outlined-button><md-filled-button data-act="approve">${sym('check', 'icon')}Approve and publish</md-filled-button>`;
    }
    openSheet(`${sheetTop('Question Queue', QUEUE_KIND[q.kind][1], q.topic, status('info', 'Claimed by you · other seniors see it’s yours'))}
      <div class="m3-sheet-grid"><div class="m3-sheet-col sheet-left">${left}</div><div class="m3-sheet-col sheet-right">${right}</div></div>
      <footer class="m3-sheet-foot" id="sheet-foot">${foot}</footer>`, id, 'queue');
    $('#choices')?.addEventListener('change', e => {
      $('#send-call').disabled = false;
      const t = $('#call-text');
      t.hidden = e.target.value === 'good';
      t.placeholder = e.target.value === 'note' ? 'When shouldn’t someone use this fix?' : 'What’s the right fix?';
    });
  }

  // Send back explains exactly what happens, naming who gets the comment
  function sendBackForm() {
    const type = sheetWrap.dataset.type, id = sheetWrap.dataset.id;
    const item = type === 'draft' ? drafts.find(x => x.id === id) : queue.find(x => x.id === id);
    const drafter = type === 'draft' ? 'Senior Techne, which drafted this from your work' : `${item.who}, who wrote it`;
    $('#sheet-foot').outerHTML = `<footer class="m3-sheet-foot reject" id="sheet-foot">
      <div class="m3-card filled m3-explain">${sym('info')}<div><div class="md-typescale-title-small">What happens when you send it back</div>
        <ul class="md-typescale-body-medium"><li>Your comment goes to ${drafter}.</li><li>The draft goes back to be redrafted.</li><li>Nothing is recorded against anyone.</li><li>It comes back to your To do once it’s redrafted.</li></ul></div></div>
      <md-outlined-text-field id="comment" type="textarea" rows="3" label="What should change?"></md-outlined-text-field>
      <div class="m3-actions"><md-text-button data-act="cancel-sendback">Cancel</md-text-button><md-filled-button data-act="confirm-sendback">${sym('send', 'icon')}Send back</md-filled-button></div></footer>`;
    later(() => $('#comment').focus(), 50);
  }

  function finish(type, id, result, msg, gain, doc) {
    const item = type === 'draft' ? drafts.find(x => x.id === id) : queue.find(x => x.id === id);
    closeSheet();
    item.status = 'done';
    item.result = result;
    if (flagged === id) flagged = null;
    let added = null;
    if (doc) { added = { id: 'n' + Date.now(), by: 'Priya R.', used: 0, checked: 'just now', versions: 1, fresh: true, ...doc }; docs.unshift(added); }
    if (gain) addCredits(gain);
    rerender();
    App.undoToast(`${msg}`, () => {
      item.status = 'todo';
      delete item.result;
      if (added) docs = docs.filter(x => x !== added);
      if (gain) addCredits(-gain);
      rerender();
    });
  }
  function renderQueuePage() {
    body.innerHTML = queueHTML(); renderQueue();
    // a freshly rendered md-tabs can fire change for its initial tab, so only re-render on a real switch
    $('#queue-tabs').addEventListener('change', e => {
      const t = e.target.activeTabIndex ? 'done' : 'todo';
      if (t !== queueTab) { queueTab = t; renderQueuePage(); }
    });
  }
  function rerender() { if (screen === 'home') body.innerHTML = homeHTML(); else if (screen === 'queue') renderQueuePage(); else if (screen === 'hot' || screen === 'twin') rerenderHot(); updateCounts(); }
  // keep the scroll position when the Hot spots or Your twin page re-renders after a change
  function rerenderHot() { if (screen !== 'hot' && screen !== 'twin') return; const y = body.scrollTop; SeniorPages.render(screen, body); body.scrollTop = y; Shell.refresh('senior', ['hot', 'files']); }

  function onAct(act, el) {
    const row = el.closest('.m3-drow, .m3-qrow');
    const id = row?.dataset.id || sheetWrap.dataset.id;
    const type = sheetWrap.dataset.type;
    switch (act) {
      case 'open-draft': openDraft(id); break;
      case 'open-q': openQueueItem(id); break;
      case 'claim': { const q = queue.find(x => x.id === id); q.claimedBy = 'you'; renderQueue(); App.toast(`Claimed. Other seniors see it’s yours.`); break; }
      case 'close': closeSheet(); rerender(); break;
      case 'approve': {
        const it = type === 'draft' ? drafts.find(x => x.id === id) : queue.find(x => x.id === id);
        const title = document.querySelector('.m3-doc-h, .doc-h')?.textContent.trim() || it.title;
        finish(type, id, 'approved', type === 'draft' ? 'Approved and published. Your twin learned it.' : `Approved and published, credited to ${it.who.split(' ')[0]}.`, 15,
          { title, topic: it.topic, from: type === 'draft' ? (it.kind === 'interview' ? 'interview' : it.kind === 'session' || it.kind === 'sessans' ? 'session' : 'answer') : 'published', author: type === 'queue' ? it.who : undefined, summary: it.steps[0][1].replace(/<[^>]+>/g, '') });
        break;
      }
      case 'sendback': sendBackForm(); break;
      case 'cancel-sendback': type === 'draft' ? openDraft(id) : openQueueItem(id); break;
      case 'confirm-sendback': finish(type, id, 'sentback', 'Sent back. It returns to your To do once it’s redrafted.', 0); break;
      case 'send-call': {
        const v = [...document.querySelectorAll('#choices md-radio')].find(r => r.checked)?.value;
        const q = queue.find(x => x.id === id);
        finish('queue', id, v === 'wrong' ? 'answered' : v === 'note' ? 'noted' : 'approved',
          v === 'wrong' ? `Sent. ${q.who.split(' ')[0]} gets your answer as a walkthrough.` : `Published as checked by you. ${q.who.split(' ')[0]}’s fix is in the team docs.`,
          v === 'wrong' ? 20 : 15, v === 'wrong' ? null : { title: q.title, topic: q.topic, from: 'answer', summary: q.ai[1][1] });
        break;
      }
      case 'send-answer': {
        const q = queue.find(x => x.id === id);
        finish('queue', id, 'answered', `Sent to your twin. Check its draft in Drafts, then all ${q.asked} new grad${q.asked > 1 ? 's get' : ' gets'} it.`, 20);
        break;
      }
      case 'voice': App.toast(`Voice answers work on mobile. Try the Mobile tab.`); break;
      case 'to-drafts': draftTab = 'todo'; Shell.setView('senior', 'drafts', true); break;
      case 'past-tab': pastTab = el.dataset.val; rerenderHot(); break;
      case 'open-past': openPast(el.dataset.id); break;
      case 'past-add': openPast(id, 'add'); break;
      case 'past-who': openPast(id, 'who'); break;
      case 'past-cancel': openPast(id); break;
      case 'past-confirm': pastDone(id, 'confirmed'); break;
      case 'past-obsolete': pastDone(id, 'obsolete'); break;
      case 'past-hand': pastDone(id, 'handed', undefined, el.dataset.to); break;
      case 'past-save': {
        const f = $('#past-a');
        SeniorPages.finishTyping(f);
        if (!f?.value.trim()) { f?.focus(); App.toast('Add a sentence first, or press Cancel.'); return; }
        pastDone(id, 'confirmed', f.value.trim());
        break;
      }
      case 'top-search': shellAct('search'); break;
      case 'top-notes': App.toast(`${todoDrafts().length} drafts and ${openQs().length} open questions need you.`); break;
      case 'to-queue': App.set({ screen: 'queue' }); break;
      case 'doc': repoSel = repoSel === el.dataset.id ? null : el.dataset.id; $('.m3-repo').classList.toggle('has-sel', !!repoSel); renderDocs(); break;
      case 'doc-close': repoSel = null; $('.m3-repo').classList.remove('has-sel'); renderDocs(); break;
      case 'doc-edit': App.toast('Opens the doc in the company repository for editing.'); break;
      case 'doc-outdated': App.toast(`Marked outdated. Techne will ask ${docs.find(x => x.id === repoSel).by} to recheck it.`); break;
    }
  }

  function show(scr) {
    screen = scr;
    hideSheet();
    $('#senior').dataset.screen = scr;
    body.classList.toggle('full', scr === 'ide');
    body.scrollTop = 0;
    if (scr === 'home') body.innerHTML = homeHTML();
    else if (scr === 'queue') renderQueuePage();
    else if (scr === 'repo') {
      body.innerHTML = repoHTML(); renderDocs();
      $('#repo-q').addEventListener('input', e => { repoQuery = e.target.value; renderDocs(); });
      $('#repo-sort').addEventListener('change', e => { repoSort = e.target.value; renderDocs(); });
    } else SeniorPages.render(scr, body);
    if (scr === 'report') heatmap();
    updateCounts();
  }

  // ═════════ YOUR PAST WORK ═════════
  const pastItem = id => past?.find(x => x.id === id);
  // A hot spot that traces to past work: inferred once Priya confirms it, covered once she approves the draft
  function hotCover(h) {
    if (!h.traces || !past) return { cover: h.cover, twin: h.twin };
    const it = pastItem(h.traces), d = drafts.find(x => x.pastId === h.traces);
    if (d?.status === 'done' && d.result === 'approved') return { cover: 'covered', twin: 'priya' };
    if (it?.status === 'done' && it.result === 'confirmed') return { cover: 'inferred', twin: 'priya' };
    return { cover: h.cover, twin: h.twin };
  }

  // Coverage of Priya's past: each confirmed item fills one system in its year
  function coverage() {
    const P = DATA.pastWork, added = past.filter(i => i.status === 'done' && i.result === 'confirmed');
    return { ...P.coverage, known: P.coverage.known + added.length, years: P.years.map(y => ({ ...y, known: y.known + added.filter(i => i.year === y.year).length })) };
  }
  const SIGNAL = { today: ['today', () => 'Opened today'], asked: ['forum', () => 'New grads asked'], unchecked: ['schedule', i => `Not checked since ${i.year}`] };
  function pastResult(i) {
    if (i.result === 'obsolete') return status('info', 'Marked obsolete', 'block', true);
    if (i.result === 'handed') return status('info', `Sent to ${i.to}`, 'forward', true);
    const d = drafts.find(x => x.pastId === i.id);
    return d?.status === 'done' && d.result === 'approved' ? status('ok', 'In your twin', 'verified', true) : status('ok', 'Draft in Your twin’s drafts', 'rate_review', true);
  }
  const pastMeta = i => `Last changed by you · ${i.lastChanged}${i.onlyYou ? ' · only you' : ''}`;
  function pastSectionHTML() {
    const C = coverage(), todo = past.filter(i => i.status === 'todo'), list = pastTab === 'todo' ? todo : past.filter(i => i.status !== 'todo');
    const pageSeg = (cur, opts) => `<div class="m3-seg" role="radiogroup" aria-label="Found by Techne">${opts.map(([v, l]) => `<button role="radio" aria-checked="${cur === v}" class="${cur === v ? 'on' : ''}" data-act="past-tab" data-val="${v}"><md-ripple></md-ripple><md-focus-ring></md-focus-ring>${cur === v ? sym('check') : ''}<span>${l}</span></button>`).join('')}</div>`;
    return `<section class="m3-card outlined m3-past" id="past-work">
      <div class="m3-card-head row"><h2 class="md-typescale-title-large">Your past work</h2>${status('info', 'Only you see this', 'lock')}</div>
      <div class="m3-cover">
        <p class="md-typescale-body-large">Your twin knows <b>${C.known} of the ${C.total}</b> systems you’ve worked on since ${C.since}.</p>
        <div class="m3-years" role="img" aria-label="Systems your twin knows, by year">${C.years.map(y => `<div class="m3-year" title="${y.year}: ${y.known} of ${y.systems} systems"><span class="m3-ybar"><i style="height:${Math.round(y.known / y.systems * 100)}%"></i></span><span class="md-typescale-label-small">${y.year}</span></div>`).join('')}</div>
        <p class="m3-cap md-typescale-body-small">${sym('history')}Techne fills this in a few minutes at a time. You never start from a blank page.</p>
      </div>
      <div class="m3-past-h"><h3 class="md-typescale-title-medium">Found by Techne</h3>${pageSeg(pastTab, [['todo', `To do · ${todo.length}`], ['done', `Done · ${past.length - todo.length}`]])}</div>
      ${list.length ? `<md-list class="m3-plist">${list.map((i, k) => `${k ? '<md-divider></md-divider>' : ''}<md-list-item class="m3-prow" data-id="${i.id}">
          <span slot="start" class="m3-lead k-past">${sym(SIGNAL[i.signal][0])}</span>
          <div slot="headline">${i.system}<span class="m3-pfile">${i.file}</span></div>
          <div slot="supporting-text" class="m3-meta">${status('info', SIGNAL[i.signal][1](i), SIGNAL[i.signal][0], true)}<span>${pastMeta(i)}</span></div>
          <div slot="end" class="m3-row-acts">${i.status === 'todo' ? `<md-filled-button data-act="open-past" data-id="${i.id}">Add context</md-filled-button>` : pastResult(i)}</div>
        </md-list-item>`).join('')}</md-list>`
        : `<div class="m3-empty md-typescale-body-medium">${sym('task_alt')}${pastTab === 'todo' ? 'Nothing to explain right now. Techne finds more as it learns your work.' : 'Nothing done yet.'}</div>`}
      <p class="m3-cap m3-past-foot md-typescale-body-small">${sym('lock')}Skip anything. Nothing here is shared until you approve it, and it’s never shown to your manager.</p>
    </section>`;
  }
  // ── the past-work card: opens as a preview tab, like a draft ──
  let pastMode = null;
  function pastArtifact(i) {
    const A = i.artifact;
    if (A.kind === 'diff') return `<div class="m3-diff"><div class="m3-diff-file md-typescale-label-large">${sym('commit')}${A.commit} · ${A.message}</div>${A.removed.map(l => `<div class="rm"><span>−</span>${l}</div>`).join('')}${A.added.map(l => `<div class="add"><span>+</span>${l}</div>`).join('')}<div class="m3-diff-res md-typescale-body-small">${sym('description')}${A.file} · ${i.lastChanged}</div></div>
      ${A.incident ? `<blockquote class="m3-quote m3-art"><div class="md-typescale-title-small">${sym('report')}${A.incident.id} · ${A.incident.title}</div>${A.incident.lines.map(l => `<div class="md-typescale-body-medium">${l}</div>`).join('')}</blockquote>` : ''}`;
    if (A.kind === 'shot') return `${shot(A.shot)}<p class="m3-cap md-typescale-body-small">${sym('commit')}Commit ${A.commit} · ${A.message}</p>`;
    return `<blockquote class="m3-quote m3-art"><div class="md-typescale-title-small">${sym('description')}${A.file}</div>${A.lines.map(l => `<div class="md-typescale-body-medium">${l}</div>`).join('')}</blockquote>`;
  }
  function pastCard(i) {
    const left = `${label('What Techne found')}${pastArtifact(i)}
      ${label('Why Techne is asking')}
      <div class="m3-why-past">
        <div class="m3-meta-i md-typescale-body-medium">${sym(SIGNAL[i.signal][0])}${i.signalText}</div>
        ${i.lineage ? `<div class="md-typescale-label-medium m3-muted">Real new grad questions, anonymised · ${i.lineage.count}</div><ul class="m3-why-q md-typescale-body-medium">${i.lineage.questions.map(q => `<li>“${q}”</li>`).join('')}</ul>` : ''}
        ${i.onlyYou ? `<div class="m3-meta-i md-typescale-body-medium">${sym('person')}Only you have changed this since ${i.year}.</div>` : ''}
      </div>`;
    const right = `${label('Techne · asking as a new grad', synthChip())}
      <p class="m3-pq md-typescale-title-large">${i.question}</p>
      ${label('Techne’s guess')}
      <div class="m3-card filled m3-guess">${status('warn', 'Inferred', 'warning')}<p class="md-typescale-body-large">${i.guess}</p></div>
      ${pastMode === 'add' ? `${label(i.runbook ? 'What changed' : 'Add context')}<md-outlined-text-field id="past-a" type="textarea" rows="3" data-script="past" data-item="${i.id}" placeholder="One sentence is enough" aria-label="${i.runbook ? 'What changed' : 'Add context'}"></md-outlined-text-field>` : ''}
      ${pastMode === 'who' ? `${label('Who knows it?')}<div class="m3-who-pick">${['Dev K.', 'Lena M.'].map(n => `<md-outlined-button data-act="past-hand" data-to="${n}">${sym('person', 'icon')}${n}</md-outlined-button>`).join('')}</div>` : ''}`;
    const foot = pastMode === 'add'
      ? `<span class="md-typescale-body-medium m3-muted">It becomes a draft only you can approve.</span><md-text-button data-act="past-cancel">Cancel</md-text-button><md-filled-button data-act="past-save">${sym('check', 'icon')}Save</md-filled-button>`
      : pastMode === 'who'
        ? `<span class="md-typescale-body-medium m3-muted">Techne will ask them instead. Nothing of yours is shared.</span><md-text-button data-act="past-cancel">Cancel</md-text-button>`
        : `<span class="md-typescale-body-medium m3-muted">Skip anything. Nothing is shared until you approve it.</span>
          ${i.runbook ? '' : '<md-text-button data-act="past-who">Someone else knows</md-text-button>'}
          <md-text-button data-act="past-obsolete">Obsolete</md-text-button>
          <md-outlined-button data-act="past-add">${i.runbook ? 'Update' : 'Add context'}</md-outlined-button>
          <md-filled-button data-act="past-confirm">${sym('check', 'icon')}${i.runbook ? 'Still true' : 'That’s right'}</md-filled-button>`;
    return `${sheetTop('Your past work', i.system, `${i.file} · last changed ${i.lastChanged}`, status('info', 'Only you see this', 'lock'))}
      <div class="m3-sheet-grid"><div class="m3-sheet-col">${left}</div><div class="m3-sheet-col">${right}</div></div>
      <footer class="m3-sheet-foot" id="sheet-foot">${foot}</footer>`;
  }
  function openPast(id, mode = null) {
    const i = pastItem(id);
    if (!i || i.status !== 'todo') return;
    pastMode = mode;
    openSheet(pastCard(i), id, 'past');
    if (mode === 'add') later(() => $('#past-a')?.focus(), 150);
  }
  // That's right or Save: a draft lands first in Your twin's drafts, the item moves to Done, coverage fills in by one
  function pastDone(id, result, answer, to) {
    const i = pastItem(id);
    closeSheet();
    Object.assign(i, { status: 'done', result, to, given: answer });
    let d = null;
    if (result === 'confirmed') {
      d = { id: `d-${id}`, pastId: id, kind: 'past', title: i.draftTitle, ago: 'just now', topic: i.topic, when: i.lastChanged, fresh: true, status: 'todo', steps: i.draftSteps,
        from: [`Your ${i.runbook ? 'runbook' : 'change'} · ${i.lastChanged}`, answer ? 'Your answer to Techne · today' : 'Techne’s guess, confirmed by you · today'] };
      drafts = drafts.filter(x => x.pastId !== id);
      drafts.unshift(d);
    }
    rerender();
    Shell.refresh('senior', ['hot', 'files']);
    App.undoToast(result === 'confirmed' ? 'Added to your twin. The draft is first in Your twin’s drafts.'
      : result === 'obsolete' ? 'Marked obsolete. Techne won’t ask about it again.' : `Sent to ${to}’s list. Techne will ask them instead.`, () => {
      Object.assign(i, { status: 'todo', result: undefined, to: undefined, given: undefined });
      if (d) drafts = drafts.filter(x => x !== d);
      rerender();
      Shell.refresh('senior', ['hot', 'files']);
    });
  }

  // the same list in the Hot spots side bar
  function pastSide() {
    const todo = past.filter(i => i.status === 'todo');
    return `<div class="wi-rest md-typescale-label-large">Your past work · ${todo.length}</div>
      ${todo.length ? `<md-list>${todo.map(i => `<md-list-item type="button" data-wi-act="past" data-id="${i.id}"><md-icon slot="start">${SIGNAL[i.signal][0]}</md-icon><div slot="headline">${i.system}</div><div slot="supporting-text">${SIGNAL[i.signal][1](i)} · ${i.lastChanged}</div></md-list-item>`).join('')}</md-list>`
        : jobNone('Nothing to explain right now.')}`;
  }

  // ═════════ WEB IDE CHROME: side bar views, status bar ═════════
  const TREE = [['jcl', 1, 1], ['VENDSYNC.jcl', 0, 2, true], ['POBATCH.jcl', 0, 2], ['VSAMREORG.jcl', 0, 2], ['runbooks', 1, 1], ['Vendor sync recovery.md', 0, 2]];
  const openPage = (scr, l) => `<md-icon-button data-wi-screen="${scr}" aria-label="${l}" title="${l}"><md-icon>open_in_new</md-icon></md-icon-button>`;
  const seg = (act, cur, opts) => `<div class="m3-seg" role="radiogroup">${opts.map(([v, l]) => `<button role="radio" aria-checked="${cur === v}" class="${cur === v ? 'on' : ''}" data-wi-act="${act}" data-val="${v}"><md-ripple></md-ripple><md-focus-ring></md-focus-ring>${cur === v ? sym('check') : ''}<span>${l}</span></button>`).join('')}</div>`;
  const emptySide = t => `<div class="wi-note md-typescale-body-medium">${sym('task_alt')}<span>${t}</span></div>`;
  const COVER_SIDE = { covered: ['verified', 'Covered'], partial: ['warning', 'Partly covered'], inferred: ['warning', 'Inferred'], gap: ['help', 'Gap'] };
  let sideQuery = '';
  // With VENDSYNC.jcl open, each view puts what's about this job first, in an outlined card, as the new grad's do
  const JOB = { file: 'VENDSYNC.jcl', what: 'Nightly vendor sync · steps 1–2 commit to VENDMAST', re: /vendsync|vendmast|vendor sync|restart|rerun|nightly vendor/i };
  const inJob = () => screen === 'ide';
  const jobCard = (sec, inner) => `<section class="wi-issue" aria-label="About ${JOB.file}">
      <div class="wi-issue-h md-typescale-label-large">About the job you have open</div>
      <div class="wi-issue-what">${sym('description')}<div><div class="wi-ctx-file">${JOB.file}</div><div class="md-typescale-body-small m3-muted">${JOB.what}</div></div></div>
      <div class="wi-issue-sec md-typescale-label-medium">${sec}</div>${inner}</section>`;
  const jobNone = t => `<div class="wi-note md-typescale-body-small">${sym('info')}<span>${t}</span></div>`;
  const docRow = d => `<md-list-item type="button" class="${screen === 'repo' && repoSel === d.id && sheetWrap.hidden ? 'on' : ''}" data-wi-act="doc" data-id="${d.id}"><md-icon slot="start">${d.stale ? 'schedule' : 'description'}</md-icon><div slot="headline">${d.title}</div><div slot="supporting-text">${d.by === 'Team' ? 'Team' : `${d.by}’s twin`} · used ${d.used}×</div></md-list-item>`;
  const byTopic = list => [...new Set(list.map(d => d.topic))].map(t => `<div class="wi-sec md-typescale-label-large">${t}</div><md-list>${list.filter(d => d.topic === t).map(docRow).join('')}</md-list>`).join('');
  const docsSide = () => {
    const list = docs.filter(d => !sideQuery || (d.title + d.summary).toLowerCase().includes(sideQuery.toLowerCase()));
    if (!list.length) return emptySide('No docs match.');
    if (sideQuery || !inJob()) return byTopic(list);
    const mine = list.filter(d => JOB.re.test(d.title));
    return `${jobCard('Docs about this job', `<md-list>${mine.map(docRow).join('')}</md-list>`)}<div class="wi-rest md-typescale-label-large">All docs</div>${byTopic(list.filter(d => !mine.includes(d)))}`;
  };
  function sideView(v) {
    if (!drafts) return { title: '', body: '' };
    if (v === 'files') return {
      title: 'Explorer',
      body: `<div class="wi-sec md-typescale-label-large">procurement-batch</div>
        <ul class="wi-tree">${TREE.map(([n, dir, d, open]) => `<li class="${dir ? 'dir' : 'file'} ${open && screen === 'ide' && sheetWrap.hidden ? 'on' : ''}" style="--d:${d - 1}">${open ? `<button data-wi-screen="ide">${sym('description')}<span>${n}</span></button>` : `${dir ? sym('expand_more') : ''}${sym(dir ? 'folder' : 'description')}<span>${n}</span>`}</li>`).join('')}</ul>
        <div class="wi-sec md-typescale-label-large">Your twin today</div>${SeniorPages.todayHTML()}`,
    };
    if (v === 'drafts') {
      const list = drafts.filter(d => d.status === draftTab), nd = todoDrafts().length;
      const row = d => { const [ic, lab] = DRAFT_KIND[d.kind]; return `<md-list-item type="button" class="${d.status === 'done' ? 'done' : ''} ${reviewing('draft', d.id) ? 'on' : ''}" data-wi-act="open-draft" data-id="${d.id}"><md-icon slot="start">${ic}</md-icon><div slot="headline">${d.title}</div><div slot="supporting-text">${d.status === 'done' ? RESULT_M3[d.result][1] : `${d.fresh ? 'New · ' : ''}${lab(d)} · ${d.ago}`}</div></md-list-item>`; };
      const empty = emptySide(draftTab === 'todo' ? 'Nothing to review. Your twin is up to date.' : 'Nothing done yet today.');
      const head = `${seg('dtab', draftTab, [['todo', `To do · ${nd}`], ['done', `Done · ${drafts.length - nd}`]])}`;
      if (!inJob()) return {
        title: 'Your twin’s drafts',
        body: `${head}<div class="wi-note md-typescale-body-small">${sym('lock')}<span>Drafted from your work. Only you can approve them.</span></div>
          ${list.length ? `<md-list>${list.map(row).join('')}</md-list>` : empty}`,
      };
      const mine = list.filter(d => JOB.re.test(d.title)), rest = list.filter(d => !mine.includes(d));
      return {
        title: 'Your twin’s drafts',
        body: `${head}${jobCard('Drafts from this job', mine.length ? `<md-list>${mine.map(row).join('')}</md-list>` : jobNone('Nothing drafted from this job yet.'))}
          ${rest.length ? `<div class="wi-rest md-typescale-label-large">Other drafts</div><md-list>${rest.map(row).join('')}</md-list>` : ''}`,
        foot: `<md-filled-button data-wi-act="teach">${sym('diversity_3', 'icon')}Teach your twin</md-filled-button>`,
      };
    }
    if (v === 'queue') {
      const todo = queue.filter(q => q.status === 'todo'), list = queue.filter(q => q.status === queueTab).sort((a, b) => (b.id === flagged) - (a.id === flagged));
      const row = q => {
        const theirs = q.claimedBy && q.claimedBy !== 'you';
        const sub = q.status === 'done' ? RESULT_M3[q.result][1] : `${q.id === flagged ? 'New · ' : ''}${q.claimedBy ? (theirs ? `Claimed by ${q.claimedBy}` : 'Claimed by you') : QUEUE_KIND[q.kind][1]} · ${q.who.split(' ')[0]}`;
        return `<md-list-item type="button" class="${q.status === 'done' ? 'done' : ''} ${reviewing('queue', q.id) ? 'on' : ''}" ${theirs ? 'disabled' : `data-wi-act="open-q" data-id="${q.id}"`}><md-icon slot="start">${theirs ? 'lock' : QUEUE_KIND[q.kind][0]}</md-icon><div slot="headline">${q.title}</div><div slot="supporting-text">${sub}</div></md-list-item>`;
      };
      const head = seg('qtab', queueTab, [['todo', `To do · ${todo.length}`], ['done', `Done · ${queue.length - todo.length}`]]);
      const foot = `<md-filled-tonal-button data-wi-screen="queue">${sym('inbox', 'icon')}Open the full queue</md-filled-tonal-button>`;
      if (!inJob()) return {
        title: 'Question Queue', acts: openPage('queue', 'Open the full queue'), foot,
        body: `${head}${list.length ? `<md-list>${list.map(row).join('')}</md-list>` : emptySide(queueTab === 'todo' ? 'Queue is clear.' : 'Nothing done yet.')}`,
      };
      const mine = list.filter(q => JOB.re.test(q.title)), rest = list.filter(q => !mine.includes(q));
      return {
        title: 'Question Queue', acts: openPage('queue', 'Open the full queue'), foot,
        body: `${head}${jobCard('Questions your know-how here could answer', mine.length ? `<md-list>${mine.map(row).join('')}</md-list>` : jobNone('No open questions about this job.'))}
          ${rest.length ? `<div class="wi-rest md-typescale-label-large">Other questions</div><md-list>${rest.map(row).join('')}</md-list>` : ''}`,
      };
    }
    if (v === 'repo') return {
      title: 'Company repository', acts: openPage('repo', 'Open the repository'),
      foot: `<md-filled-tonal-button data-wi-screen="repo">${sym('library_books', 'icon')}Open the repository</md-filled-tonal-button>`,
      body: `<md-outlined-text-field id="side-q" placeholder="Search docs" aria-label="Search the company repository" value="${sideQuery.replace(/"/g, '&quot;')}"><md-icon slot="leading-icon">search</md-icon></md-outlined-text-field><div id="side-docs">${docsSide()}</div>`,
    };
    const hotRow = h => { const c = hotCover(h).cover; return `<md-list-item type="button" data-wi-screen="hot"><md-icon slot="start">${COVER_SIDE[c][0]}</md-icon><div slot="headline">${h.topic}</div><div slot="supporting-text">${h.n} questions · ${COVER_SIDE[c][1]}${h.next ? ` · ${h.next}` : ''}</div></md-list-item>`; };
    const hotFoot = `<md-filled-tonal-button data-wi-screen="hot">${sym('local_fire_department', 'icon')}Open Hot spots</md-filled-tonal-button>`;
    const mineHot = inJob() ? DATA.hotspots.filter(h => JOB.re.test(h.topic)) : [];
    if (!inJob()) return {
      title: 'Hot spots', acts: openPage('hot', 'Open Hot spots'), foot: hotFoot,
      body: `<div class="wi-note md-typescale-body-small">${sym('forum')}<span>Where new grads’ questions cluster this month.</span></div>
        <md-list>${DATA.hotspots.map(hotRow).join('')}</md-list>${pastSide()}`,
    };
    return {
      title: 'Hot spots', acts: openPage('hot', 'Open Hot spots'), foot: hotFoot,
      body: `${jobCard('Where new grads get stuck near this job', mineHot.length ? `<md-list>${mineHot.map(hotRow).join('')}</md-list>` : jobNone('No hot spots near this job.'))}
        <div class="wi-rest md-typescale-label-large">Everywhere else</div>
        <md-list>${DATA.hotspots.filter(h => !mineHot.includes(h)).map(hotRow).join('')}</md-list>${pastSide()}`,
    };
  }
  function sideAfter(v, el) {
    if (v !== 'repo') return;
    el.querySelector('#side-q').addEventListener('input', e => { sideQuery = e.target.value; el.querySelector('#side-docs').innerHTML = docsSide(); });
  }
  function statusHTML() {
    const rec = SeniorPages.recording();
    return `<span class="wi-si">${sym('call_split')}procurement-batch · main</span>
      <button class="wi-si wi-rec ${rec ? '' : 'off'}" data-wi-screen="ide" title="${rec ? 'Your twin learns from your IDE sessions, within what you allowed. Never used in performance reviews.' : 'Paused: your twin isn’t learning from anything.'}"><md-ripple></md-ripple><md-focus-ring></md-focus-ring><i></i>${rec ? 'Your twin is learning' : 'Your twin is paused'}</button>
      <button class="wi-si wi-credits push" id="credits-pill" data-wi-act="credits" title="Earn credits by reviewing, writing and fixing team docs"><md-ripple></md-ripple><md-focus-ring></md-focus-ring>${sym('toll')}<span id="credits">${credits.toLocaleString('en-US')}</span>&nbsp;credits<span class="m3-credits-plus" id="credits-plus">+15</span></button>
      <button class="wi-si" data-wi-act="bell" aria-label="Notifications"><md-ripple></md-ripple><md-focus-ring></md-focus-ring>${sym('notifications')}</button>`;
  }
  function openDoc(id) {
    repoSel = id;
    if (screen === 'repo') { hideSheet(); Shell.sync('senior', 'repo'); $('.m3-repo')?.classList.add('has-sel'); renderDocs(); }
    else Shell.openScreen('senior', 'repo');
  }
  function shellAct(act, el) {
    switch (act) {
      case 'open-draft': openDraft(el.dataset.id); break;
      case 'open-q': openQueueItem(el.dataset.id); break;
      case 'dtab': draftTab = el.dataset.val; Shell.refresh('senior', ['drafts']); break;
      case 'qtab': queueTab = el.dataset.val; Shell.refresh('senior', ['queue']); if (screen === 'queue') renderQueuePage(); break;
      case 'doc': openDoc(el.dataset.id); break;
      case 'show-view': Shell.setView('senior', el.dataset.v, true); break;
      case 'search': Shell.setView('senior', 'repo', true); setTimeout(() => $('#side-q')?.focus(), 50); break;
      case 'credits': App.toast(`${credits.toLocaleString('en-US')} credits. You earn them when your reviews and docs help new grads.`); break;
      case 'bell': App.toast(`${todoDrafts().length} drafts and ${openQs().length} open questions need you.`); break;
      case 'soon': App.toast('That isn’t available yet.'); break;
      case 'startup': App.toast('Home opens when you start Techne. Turn it off in Settings.'); break;
      case 'moments-list': SeniorPages.toggleMoments(); Shell.refresh('senior', ['files']); break;
      case 'moment': SeniorPages.openMoment(+el.dataset.i); break;
      case 'teach': body.querySelector('[data-sact="interview"]')?.click(); break;
      case 'past': openPast(el.dataset.id); break;
    }
  }

  function init() {
    body = $('#dash-body');
    sheetWrap = $('#sheet-wrap');
    Shell.register('senior', {
      root: '#swi', view: 'files',
      rail: [
        { id: 'files', icon: 'folder_copy', label: 'Explorer' },
        { id: 'drafts', icon: 'rate_review', label: 'Drafts', badge: () => drafts ? todoDrafts().length : 0, badgeId: 'home-count' },
        { id: 'queue', icon: 'inbox', label: 'Queue', badge: () => queue ? openQs().length : 0, badgeId: 'queue-count' },
        { id: 'repo', icon: 'library_books', label: 'Repository' },
        { id: 'hot', icon: 'local_fire_department', label: 'Hot spots' },
      ],
      me: { name: 'Priya R.', sub: 'Senior · COBOL and procurement' },
      menu: [['twin', 'Your twin', 'diversity_3'], ['report', 'Your year', 'insights'], ['persona', 'How Techne asks', 'auto_awesome']],
      tabs: { home: ['Home', 'home'], twin: ['Your twin', 'diversity_3'], queue: ['Question Queue', 'inbox'], repo: ['Company repository', 'library_books'], ide: ['VENDSYNC.jcl', 'description'], hot: ['Hot spots', 'local_fire_department'], persona: ['How Techne asks', 'auto_awesome'], report: ['Your year', 'insights'] },
      side: sideView, sideAfter, status: statusHTML,
      search: { label: 'Search the company repository, files and commands' },
      onSearch: () => shellAct('search'),
      act: shellAct, hidePreview: hideSheet, showPreview: showSheet, closePreview: closeSheet,
    });
    $('#senior').addEventListener('click', e => {
      // single-choice filter chips: the clicked one stays selected
      const f = e.target.closest('md-filter-chip[data-val]');
      if (f) {
        const kind = f.parentElement.dataset.filter;
        if (kind === 'queue') { queueFilter = f.dataset.val; renderQueuePage(); }
        if (kind === 'topic') { repoTopic = f.dataset.val; f.parentElement.querySelectorAll('md-filter-chip').forEach(c => { c.selected = c === f; }); renderDocs(); }
        return;
      }
      const b = e.target.closest('[data-act]');
      if (b && !b.disabled && !b.closest('.sp-ide')) onAct(b.dataset.act, b);
    });
  }

  function start(st) { reset(); show(st.screen); }
  function stop() { timers.forEach(clearTimeout); timers = []; closeSheet(); SeniorPages.stop(); }
  function flag(id) { flagged = id; }
  // Maya's inferred step, sent from the new grad side (maybe from another tab)
  function sentRecently() {
    try { const t = +localStorage.getItem('techne-sent-priya'); return t && Date.now() - t < 2 * 3600e3; } catch { return false; }
  }
  function receiveSent() {
    if (!drafts || drafts.some(d => d.id === DATA.sentDraft.id)) return;
    drafts.unshift({ ...DATA.sentDraft, status: 'todo', fresh: true });
    if (screen === 'home' && sheetWrap.hidden) { draftTab = 'todo'; show('home'); } else updateCounts();
  }
  function dropSent() {
    if (!drafts) return;
    drafts = drafts.filter(d => d.id !== DATA.sentDraft.id);
    if (screen === 'home' && sheetWrap.hidden) show('home'); else updateCounts();
  }
  addEventListener('storage', e => {
    if (e.key !== 'techne-sent-priya') return;
    if (e.newValue) receiveSent(); else dropSent();
  });

  // Called when Priya answers the question card: the restart draft is freshly drafted from it
  let restartFresh = false;
  function freshRestart() {
    restartFresh = true;
    const d = drafts.find(x => x.id === 'd-restart');
    if (d && d.status === 'todo') { d.fresh = true; d.ago = 'just now'; }
  }
  // Called when Priya finishes the end-of-day interview with Techne
  function addInterviewDraft() {
    interviewDone = true;
    if (!drafts.some(d => d.id === DATA.interviewDraft.id)) drafts.unshift({ ...DATA.interviewDraft, status: 'todo', fresh: true });
    updateCounts();
  }

  function hardReset() { interviewDone = false; restartFresh = false; flagged = null; }
  return { init, start, restart: start, stop, show, flag, addInterviewDraft, freshRestart, receiveSent, hardReset, impactHTML, heatmap, hotCover, pastItem, pastSectionHTML, openPast };
})();
