# Techne v5 · web IDE in Material 3

v5 turns v4 into one web IDE for both roles, laid out like VS Code for the Web. v4's Material 3 rules below still apply. v1–v4 live in their own folders and repos; never edit them from here.

## Web IDE layout (decided with the user, 2026-11-01)
- One layout for new grads and seniors (`shell.js`, `m3-shell.css`): top search bar, navigation rail, side bar, editor tabs, status bar. Only the rail's items change by role.
- Rail: the Techne logo opens Home (no hamburger menu). The new grad's Ask Senior Techne is the rail FAB. Occasional pages (Your year, What Techne records, Your twin and How Techne asks for seniors) live in the avatar menu.
- Side bar: one view at a time with its own title and actions; pressing the open view again hides it. Learning path and Queue stay on the rail even though Home summarises them.
- Every screen is an editor tab. An opened draft or question is a preview tab (italic) that the next one replaces; it fills the editor area, it isn't an overlay.
- Status bar: the Senior Techne switch (click to turn it off), onboarding week, credits, twin recording.
- Home is the VS Code welcome page: Start and Recent on the left. On the right, the learning path for new grads; for seniors, Needs you, with drafts and questions in one tagged list.
- Shell controls use `data-wi-*` attributes (handled in `shell.js`); page controls keep `data-act`, `data-sact` and `data-gact`.

## New grad help and side bar (decided with the user, 2026-11-01, round 2)
- The rail's star (Ask Senior Techne) opens a chat in the right panel: ask anything, answered from seniors' twins, or "no twin covers this" (sent to the Question Queue). A walkthrough in progress is pinned there instead.
- Need help opens the Inline walkthrough by default. The pin on an inline card moves the walkthrough into the right panel at the same step; unpin puts it back on the code. A follow-up typed on the inline card pins it and continues in the panel.
- Side bar views follow the code you have open, as VS Code's do: the code stays in the editor. Your twin shows what's saved about the open file and who knows it, with "Document this solution" (the save dialog) at the bottom. Learning shows the path for the issue you're on. With no code open (Home, other pages) both show everything.
- Each of those views ends with a clear button to open the full page.
- Colour: Google blue (#0B57D0) on white. No purple.

## Setup
- Material Web (`@material/web` 2.5.0) through the CDN import map in `index.html`. No build step.
- `m3.js` imports the single `@material/web/all.js` bundle. esm.run bundles each entry point separately, so importing components one by one registers shared pieces (md-ripple, md-elevation) twice and throws.
- Use the material3 MCP server (`.mcp.json`) for component code, design tokens and icons. Read material-web.dev for component APIs.
- Colours come only from `tokens.css`: `--md-sys-color-*` generated from seed #0B57D0 (Google blue) with the seed's full chroma on Tonal Spot roles, cool near-neutral greys, a teal-blue tertiary and pure white light surfaces, light and dark, plus `--md-custom-color-success|warning` harmonised to the seed. The generator is `m3gen/gen5.mjs` in the session scratchpad (bundle with esbuild first). Regenerate it, don't hand-edit it.

## Make it look like M3, not a re-skin
- M3 type scale in Roboto Flex through the `md-typescale-*` classes: body 14–16px, titles 22px, headlines 28–32px. Code is Roboto Mono.
- Spacing on an 8px grid: 16px and 24px padding.
- md-* components for every control: buttons, icon buttons, FAB, switches, checkboxes, radios, chips, tabs, lists, text fields, selects, menus, dialogs, progress.
- Material Web has no navigation rail, editor tabs, status bar, card, snackbar or segmented button. Build those from the M3 specs and tokens (`m3-shell.css` for `.wi-*`, `m3.css` for `.m3-card`, `.toast.m3-snackbar`, `.m3-seg`).
- Material Symbols (`<md-icon>name</md-icon>`) for icons. No hard-coded hex colours in CSS; derive tints with `color-mix()` on tokens.
- Status labels (Verified, Inferred, No twin covers this) are `.m3-status`, not chips: they aren't controls.
- The Glass walkthrough keeps its blur and translucency (the user chose this on 2026-10-31); its tint, type and controls are M3.

## Watch out for
- The reset in `m3.css` skips md-* elements and anything with a `slot` attribute. Light DOM styles beat a component's `::slotted()` rules, so resetting slotted children wipes the padding md-dialog, md-list-item and others give them. Don't add a global `*{margin:0;padding:0}`.
- Don't leave old classes like `.btn` on md-* elements. Their padding, height and radius override the component.
- `md-switch` uses `.selected`, not `.checked`. Chips take their text from the `label` attribute. md-* buttons default to `type="submit"` inside a form.
- A component's own `:host { display }` beats the user agent's `[hidden]`, so `m3.css` forces `[hidden] { display: none !important }`.
- `md-tabs` reports its change through the `change` event and `activeTabIndex`.

## Process
- Local preview: the `techne-v5` launch entry (port 5198) serves a scratchpad copy, so rsync `techne-v5/` there after each edit.
- Screenshot every changed screen in light and dark before calling it done.
- Never push or publish without the user's go-ahead.
