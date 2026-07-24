# Brown Forge IT Solutions — website

A small, self-contained static website to advertise IT services and show a
portfolio. No build step, no frameworks, no dependencies — just open
`index.html`. It's mobile-friendly and adapts to light/dark automatically.

## Files

| File | Purpose |
|------|---------|
| `index.html` | All the page content (edit your text here) |
| `styles.css` | Styles + theme colors (light & dark) |
| `app.js` | Mobile menu toggle + footer year |
| `assets/favicon.svg` | Browser-tab icon |

## Make it yours — quick edits

Everything you'll want to change is in **`index.html`**, marked with
`EDIT ME` comments:

- **Name / brand** — the `<title>`, the header `brand-name`, and the footer.
- **About** — the intro text and the "facts" list (city, availability, rate).
- **Services** — the four service cards.
- **Portfolio** — duplicate a `.project` block for each real project, and set
  each card's `href` to a link (a live site, a GitHub repo, or a photo).
- **Contact** — set the `mailto:` email and any social links.

**Change the brand color** for the whole site in one place — edit
`--accent` (and `--accent-strong`) at the top of `styles.css`.

## Run locally

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Publish free with GitHub Pages

1. Put these files in a GitHub repo (or the repo root).
2. **Settings → Pages → Build and deployment → Deploy from a branch.**
3. Pick your branch and folder, Save, wait ~1 minute, open the URL it gives you.

> If the site lives in a subfolder, your URL will end in that folder name
> (e.g. `…github.io/<repo>/portfolio-site/`). Moving these files to the repo
> root gives a cleaner URL.
