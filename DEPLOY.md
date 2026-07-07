# Deploying the Rajasthan Digital Atlas to GitHub Pages

The atlas is a **pure static site** — HTML + ES modules + SVG + GeoJSON, no build step, no backend. That means GitHub Pages can serve it directly with almost no configuration.

Time from start to live URL: **~5 minutes**.

---

## Prerequisites

You need:

1. A **GitHub account** (free tier works; no Pro required).
2. **Git** installed locally (`git --version` to verify).
3. This project folder on disk — `/Users/maverick/Downloads/Rajasthan-Atlas` (or wherever you cloned it).

Optional but nice:

* **GitHub CLI** (`gh`) — makes creating the remote repo a one-liner. Install from https://cli.github.com/ or use `brew install gh` on macOS.

---

## Step 1 — Prepare the local folder

Open a terminal in the project root (`cd /Users/maverick/Downloads/Rajasthan-Atlas`) and run:

```bash
# Initialise git if you haven't already
git init -b main

# Stage the whole project (the .gitignore already excludes scratchpad + IDE junk)
git add .

# Verify what you're about to commit — should be ~28 MB, ~200-300 files
git status --short | wc -l

# Commit
git commit -m "Initial commit — Rajasthan Digital Atlas v1.0 (Modules 1-9)"
```

The `.nojekyll` file is already in the repo — **do not delete it**. It stops GitHub Pages from running Jekyll, which would otherwise ignore filenames with leading underscores and break the deploy.

---

## Step 2 — Create the GitHub repo

### Option A — with GitHub CLI (one command)

```bash
gh repo create Rajasthan-Atlas --public --source=. --remote=origin --push
```

That creates the remote, adds it as `origin`, and pushes `main` in one shot. Skip to Step 4.

### Option B — via github.com

1. Go to https://github.com/new
2. **Repository name:** `Rajasthan-Atlas` (or any name you prefer).
3. **Visibility:** Public. *(Private repos need GitHub Pro for Pages; public is free.)*
4. Do **not** initialise with README, .gitignore or licence — you already have them.
5. Click **Create repository**.

Then locally:

```bash
# Replace <your-username> with your GitHub username
git remote add origin https://github.com/<your-username>/Rajasthan-Atlas.git
git push -u origin main
```

The push uploads ~28 MB (~200-300 files). Takes 30-90 seconds depending on your uplink.

---

## Step 3 — Enable GitHub Pages

1. On your new repo page, click **Settings** (top-right tab).
2. Scroll to **Pages** (left sidebar, under *Code and automation*).
3. Under **Build and deployment → Source**, choose **Deploy from a branch**.
4. Under **Branch**, choose `main` and folder `/ (root)`. Click **Save**.

GitHub queues a deployment. After 1-3 minutes the top of the Pages settings screen shows:

> **Your site is live at `https://<your-username>.github.io/Rajasthan-Atlas/`**

Click through and you should see the full atlas.

---

## Step 4 — Verify

Load the live URL and check:

- [ ] The map renders with districts, hillshade and place labels.
- [ ] The **Layers** popover opens (bottom-left button).
- [ ] Clicking a district / river / dam opens the detail panel on the right.
- [ ] The **Revise** button (top-right nav) opens the dashboard with live-computed cards.
- [ ] The **Compare** button lets you pick two features and shows a diff.
- [ ] Browser console is clean (open DevTools → Console; there should be no red errors).

If the map is blank and the console shows `Failed to fetch atlas/data/atlas.json`, your `.nojekyll` file is missing or the repo folder wasn't `/ (root)`. Re-check Step 3.

---

## Optional — custom domain

If you own a domain (say `atlas.example.com`):

1. Create a file named `CNAME` in the repo root containing exactly one line:
   ```
   atlas.example.com
   ```
2. Commit and push.
3. At your DNS provider, add a **CNAME record** for `atlas` pointing at `<your-username>.github.io`.
4. Back in GitHub → Settings → Pages, enter the custom domain in the box and tick **Enforce HTTPS** once the SSL certificate is issued (usually within an hour).

---

## Optional — auto-deploy on every push

For a static site with no build step, this is not needed — the default *"Deploy from a branch"* setting already re-publishes on every push to `main`. Just:

```bash
# Make a change locally
git add .
git commit -m "Update <whatever>"
git push
```

GitHub redeploys in 1-2 minutes. No workflow file required.

If you later add a build step and want an explicit workflow, create `.github/workflows/pages.yml`:

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: '.'
      - id: deployment
        uses: actions/deploy-pages@v4
```

Then in GitHub → Settings → Pages, switch **Source** from *"Deploy from a branch"* to *"GitHub Actions"*.

---

## Troubleshooting

**Site is blank; console shows a 404 for a `.css` or `.js` file.**
Your `.nojekyll` file is missing. Add it (empty file at repo root), commit, push.

**Site works but a specific layer is broken.**
The layer's GeoJSON probably didn't get committed. Run `git status` — untracked GeoJSONs are your culprit.

**Site is stale — you pushed but the change isn't showing.**
GitHub Pages caches for a minute or two. Do a hard-refresh (Cmd+Shift+R on macOS, Ctrl+Shift+R on Windows / Linux). If that fails, check the **Actions** tab for a failed deploy.

**Push is rejected because the repo is too big.**
Highly unlikely at 28 MB (GitHub's soft limit is 1 GB). If you see this it means you committed `.claude/`, `scratchpad/` or a large temp file by accident. Check `.gitignore`, run `git rm -r --cached <path>`, and re-commit.

**You want to keep the OSM raw dumps out of the repo.**
The `atlas/data/raw/osm-*.json` files (~15 MB) are build-time source data for the Python pipeline. If you'd rather keep them out of git, add to `.gitignore`:

```
atlas/data/raw/osm-*.json
atlas/data/raw/*.geojson
```

Then run `git rm --cached atlas/data/raw/osm-*.json` and commit. The runtime site does not need those files — only the Python build scripts do.

---

## What just happened

1. GitHub Pages spun up an nginx behind a global CDN (Fastly) at `<user>.github.io/<repo>/`.
2. The `.nojekyll` marker told Pages to skip Jekyll and serve every file as-is.
3. Your `index.html` boots the ES-module graph, `AtlasCore` fetches `atlas/data/atlas.json`, `DataManager` fetches every GeoJSON on demand, `KnowledgeGraph` fetches `knowledge-graph.json`, and the whole atlas comes online.
4. On every push to `main`, Pages rebuilds and republishes automatically — no CI needed.

The atlas is now permanently reachable at your Pages URL until you take it down.
