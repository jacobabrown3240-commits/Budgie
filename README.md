# Kakeibo

A phone-first budgeting app, named after the traditional Japanese household
budgeting ledger (家計簿). Plan your **weekly** budget (weeks start Monday), log
what actually happened, compare, and reflect on the month's weeks.

> The app is **Kakeibo**; the repository and its GitHub Pages URL remain under
> `Budgie` (`…github.io/Budgie/`), so existing links keep working.

It's a small, self-contained web app (no build step, no server, no account).
All data is stored **locally on your device** in the browser. You can add it to
your phone's home screen and use it fully offline like a native app.

## What it does

- **Plan** — set up income sources and expense categories with the amounts you
  *expect* for the week. See planned income, expenses, and what's left to save,
  plus a donut chart of where the money is going.
- **Actual** — at the end of the month, type in what actually came in and went
  out. Each row shows the planned amount for reference.
- **Compare** — planned vs. actual, at a glance: overall income/spending/net
  deltas, an overview chart, and a per-category breakdown showing which
  categories came in over or under budget.
- **History** — every month you plan or track is kept privately on your device.
  See a net-savings-over-time trend, per-month income/spending, and tap any
  month to jump to it.

Categories get an **icon automatically** based on their name (🏠 Rent,
🛒 Groceries, 🚗 Transport, …). Tap a category's icon to pick a different one.

Other conveniences:

- Move between months with the `‹ / ›` arrows in the header.
- **⋮ menu** → copy last month's plan into this month, export/import a JSON
  backup, or reset the current month.

## Run it on your phone

Because it's a static Progressive Web App, the easiest way to get it on your
phone is **GitHub Pages**:

1. Push this repo to GitHub (already done if you're reading this there).
2. In the repo, go to **Settings → Pages**.
3. Under *Build and deployment*, set **Source = Deploy from a branch**, pick the
   branch this app lives on, folder **/(root)**, and Save.
4. Wait ~1 minute, then open the URL GitHub gives you on your phone.
5. In your phone browser: **Share → Add to Home Screen** (iOS) or the
   **Install app / Add to Home screen** prompt (Android Chrome).

Now it launches full-screen from your home screen and works offline.

> **Seeing only this README instead of the app?** GitHub Pages is serving a
> branch that doesn't contain the app yet. Make sure **Settings → Pages** points
> at the branch these files live on (or merge them into your default branch),
> and open the URL ending in **`/Budgie/`**.

### Run locally

Any static file server works, e.g.:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Your data

Everything stays in your browser's `localStorage` on the device — nothing is
uploaded anywhere. Use **⋮ → Export backup** periodically to save a `.json`
file, and **Import** to restore it or move to another device.

## Files

| File | Purpose |
|------|---------|
| `index.html` | App shell and layout |
| `styles.css` | Styles + light/dark theme tokens |
| `app.js` | All logic: state, storage, charts, interactions |
| `manifest.webmanifest` | PWA metadata (name, icons, colors) |
| `sw.js` | Service worker for offline use |
| `icons/` | App icons |
