# Techne prototype v5 · a web IDE in Material 3

A clickable prototype of Techne, an IDE workspace where every engineer has a **twin** that grows with their career.

Live: https://saoumyamandy.github.io/techne-prototype-v5/

v5 turns v4 into one web IDE for both roles, laid out like VS Code for the Web. The old side panel mixed pages, files, onboarding progress and identity in one column; now each has its own place:
- **Navigation rail:** the Techne logo opens Home; icons pick what the side bar shows; your avatar opens a menu with the occasional pages. For new grads, Ask Senior Techne is the floating action button at the top.
- **Side bar:** one view at a time, with its own title and actions. Pressing the open view again hides it.
- **Editor tabs:** every page opens as a tab beside the code. An opened draft or question is a preview tab (italic) that the next one replaces.
- **Status bar:** the branch, the Senior Techne switch, onboarding week or credits, and whether your twin is learning.
- **Home:** the VS Code welcome page. Start and Recent on the left; the learning path (new grad) or Needs you, drafts and questions together (senior), on the right.

The design system is v4's [Material Web](https://material-web.dev) build in Google blue on white: tokens from seed #0B57D0, the M3 type scale in Roboto Flex, and Material Symbols.

Previous rounds:
- v4: https://saoumyamandy.github.io/techne-prototype-v4/
- v3: https://saoumyamandy.github.io/techne-prototype-v3/
- v2: https://saoumyamandy.github.io/techne-prototype-v2/
- Round 1: https://saoumyamandy.github.io/techne-prototype/

## The idea

- **Your twin.** Every engineer has one. It learns from what you save: tasks, walkthroughs and questions. It's private until you share something.
- **Senior Techne** routes questions across seniors' twins. Every answer names the twin it came from ("answering from Priya R.'s twin"), or says plainly that no twin covers it yet.
- **Techne asks as a new grad.** When Techne interviews seniors about key moments, it asks as a synthetic new grad, always labelled *Synthetic*: the questions real new grads ask, so seniors' twins learn the *why*. It's never a real person.
- Nothing joins the team docs until a senior approves it.

## What to try

Use the Controls bar at the top to switch between **New grad**, **Senior** and **Mobile**, pick a screen, and compare variants. Press H to hide the bar.

**New grad**
- **Home:** Continue the ticket, Ask Senior Techne, recent files, and this week's learning path with progress.
- **Ask Senior Techne** (the star on the rail): a chat beside the code. Ask anything; answers name the twin they came from, or say no twin covers it and send it to the Question Queue.
- **Need help:** the inline walkthrough appears against the problem. Pin it to move it into the right panel, and type a follow-up on the card to continue there.
- **Your avatar opens Your twin**, a page with three tabs: *What it knows* (a young twin, two weeks old), *Your year*, and *What Techne records*.
- **Drafts, Repository and Hot spots follow your code too**, and stay sparse because Maya is two weeks in: what your twin drafted from this work, team docs about it (read-only, with what you've published), and where new grads get stuck on it and where you did.
- **Your twin and Learning follow your code:** with a file open, Your twin shows what you've saved about it, who knows it, and *Document this solution*; Learning shows the path for the issue you're on. Each has a button to open the full page.
- **IDE**, with four scenarios. The scenario starts the first time its code is on screen:
  - *Covered*: Priya's twin has a verified answer.
  - *Not covered*: no twin covers it. Your workaround goes to the Question Queue.
  - *Restart after failure*: Maya's VENDSYNC fails at step 3 (SQLCODE -911). Senior Techne answers from Priya's twin (3 verified · 1 general), and "Where this comes from" traces each step back to Priya's session, her answer to Techne and her approval.
  - *File copy*: a task, not an error. General steps are mixed with steps from Priya's twin, and one inferred step is sent to Priya to confirm. It ends with a git commit and the save dialog.
- **Seen before** (`#seen`): Maya's twin already holds the copybook fix, so help is one line with the command and Run in terminal.
- **Walkthrough styles:** Inline (the default: a glass card right against the problem, which you can pin to the panel), Split, Glass or Both. **Help placement:** terminal button or corner button. The **Senior Techne** switch in the status bar sets whether help pops up on its own.
- **Your twin:** a knowledge graph and timeline. Items are private by default, and you can share them for credits.
- **Learning path**, **What Techne records** (onboarding and permissions, never used in performance reviews), and **Your year** (a report you own).

**Senior**
- **Home:** *Needs you* mixes your twin's drafts and open questions, each tagged, newest first. Drafts are only yours and never locked. Every item opens for review as a preview tab, and approving can be undone.
- **Your avatar opens Your twin**, with tabs for *What it knows*, *Your year* (with Your impact) and *How Techne asks*.
- **Rail:** Explorer (files, plus *Your twin today*: sessions, key moments and Techne's questions), Drafts and Queue (lists with To do and Done, badges for what's open), Repository (search and open docs), Hot spots.
- **Side bar follows your code:** with VENDSYNC.jcl open, Drafts, Queue, Repository and Hot spots show what's about this job first, then everything else. Drafts has *Teach your twin*, which opens the end-of-day interview.
- **Your twin** (`#senior-twin`): everything Senior Techne answers from Priya's work. It shows the topics it knows (verified or inferred), every doc with its trail back to where it came from and how often it helped, what new grads asked it this week, and its gaps. Priya can pause learning, confirm an inferred doc, keep a doc private or retire it, and test her twin.
- **Question Queue:** shared by every senior. You claim an item before answering it, and claimed items are locked for everyone else.
- **Company repository:** every approved doc and its history.
- **Your IDE** (the VENDSYNC.jcl tab): a recording indicator and Pause, a session timeline with the key moments Techne flagged (star a terminal line to see why), Techne's question card with "Why Techne is asking", and the end-of-day interview. Answering drafts a doc into Your twin's drafts.
- **How Techne's questions are built** (`#persona`): what the new grad persona is built from, what it deliberately doesn't know, what's never used, and how its quality is measured. Every Synthetic badge links here.
- **Hot spots:** where new grads' questions cluster, which interviews Techne has planned, and the past work behind a cluster ("Traces to your change · Mar 2019").
- **Your past work** (`#past`, on Hot spots): a senior's twin only learns from work done after Techne was switched on, so Techne fills in the years before, a little at a time, starting with what new grads need. It finds old work worth explaining from three signals:
  - *Today's work touches old work:* Priya opens a file she last changed years ago, with no doc behind it.
  - *New grads ask about it:* a question cluster traces back to code only Priya has changed.
  - *Old artifacts go unchecked:* a runbook or incident review she wrote hasn't been checked in years.

  Each item opens as a preview tab with what Techne found (the commit, the code, the runbook), why it's asking, its question as a synthetic new grad, and its guess. Priya confirms it, adds one sentence, marks it obsolete, or says who else knows. A confirmed item drafts a doc for her twin and fills one more system on the coverage strip (14 of 31 since 2015). It's private to her and never shown to her manager.
- **Your year:** the senior's own report, with *Your impact* (contribution heatmap and expertise).

**Mobile** (phone frame): senior drafts on the go, Techne's questions with quick replies and voice, a new grad asking Senior Techne in Slack, and the new grad's twin.

Short links: `#senior-ide`, `#senior`, `#senior-twin`, `#past`, `#restart`, `#seen`, `#filecopy`, `#persona`, `#onboarding`, `#archive`, `#queue`, `#hotspots`, `#mobile`.

Answer fields on Techne's questions type out a prepared answer whatever keys you press. Replay resets every screen.

All names, code and data are made up.

## Run locally

```
python3 -m http.server 5198
```

Then open http://localhost:5198. It's plain HTML, CSS and JavaScript with no build step: Material Web loads from a CDN through an import map.

## Files

| File | What it holds |
| --- | --- |
| `index.html` | Page structure and the Material Web import map |
| `m3.js` | Loads Material Web (`@material/web/all.js`) |
| `tokens.css` | M3 colour tokens from seed #0B57D0 (Google blue) with white surfaces, light and dark. Generated, don't hand-edit |
| `m3.css` | Base, prototype bar, cards, snackbar, segmented button and senior pages |
| `m3-shell.css` | Web IDE chrome: search bar, navigation rail, side bar, editor tabs, status bar, Home |
| `m3-grad.css` | New grad IDE, walkthroughs and pages |
| `m3-mobile.css` | Mobile tab |
| `app.js` | Prototype bar, state, and shared status labels, Synthetic chip and snackbars |
| `shell.js` | Web IDE chrome for both roles: rail, side bar views, editor and preview tabs, status bar, the Home layout |
| `data.js` | Twins, the new grad persona, scenarios, drafts, queue, repository and page content |
| `grad.js` | New grad IDE, walkthrough variants, save dialog |
| `gradpages.js` | New grad Home, side bar views, Your twin, learning path, onboarding, year report |
| `senior.js` | Senior Home, side bar views, status bar, Question Queue, repository, review tabs |
| `seniorpages.js` | Senior IDE, Techne's interview, hot spots |
| `mobile.js` | Mobile tab |
