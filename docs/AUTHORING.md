# Authoring guide — enriching and extending the atlas

This atlas is a static site served from GitHub Pages. Authoring is **file-based**: you edit two JSON files, commit, push. There is no in-browser editing UI for visitors, so this workflow is inherently **admin-only** — only accounts with push access to the repo can add content.

## What you can add

* **Facts** on any existing feature (district, river, industry, etc.)
* **Photos** on any feature, with captions and credits
* **Your own notes** on any feature (private-feeling annotations that render in the detail card)
* **Entire new layers** — your own points, polygons, or lines

Nothing else changes about the atlas engine; both files are optional.

---

## Two files, two purposes

### 1. `atlas/data/enrichment.json` — enrich existing features

The atlas already ships 64 layers and 473 features, and many features have only skeleton content (`districts.geojson` has almost no facts, for example). This file lets you attach `extraFacts[]`, `images[]`, and `yourNotes` to **any feature by its id**.

Structure:

```json
{
  "features": {
    "<feature-id>": {
      "extraFacts": ["Fact 1", "Fact 2"],
      "images": [
        { "url": "path/or/https-url",
          "caption": "Optional caption",
          "credit":  "Optional photographer / source" }
      ],
      "yourNotes": "Free text. Rendered as a highlighted callout in the detail card."
    }
  }
}
```

Feature IDs are the exact strings the atlas uses internally. **The fastest way to find an id** is to open the map with `?ids=1`:

  <https://thefundabox.github.io/Rajasthan-Atlas/map.html?ids=1>

A dark box appears in the bottom-left. Click any feature on the map, and the box shows `<layer-id> / <feature-id>`. Click the box to copy the id to the clipboard.

Common ids to remember:

| Feature | id |
|---|---|
| Barmer district | `barmer` |
| Chambal River | `chambal-river` |
| Bhadla Solar Park | `solar-parks-bhadla-solar-park` |
| Rampura Agucha Mine | `mine-rampura-agucha` |
| Arid climate zone | `climate-regions-arid` |
| Mewar Region | `regional-zones-mewar` |
| RAPS Rawatbhata | `power-plants-raps-rawatbhata` |

Districts use their name in kebab-case: `jaipur`, `sri-ganganagar`, `khairthal-tijara`.

### 2. `atlas/data/custom/index.json` — register new layers

Every entry loads a GeoJSON from your own file and registers it as a layer, appearing in the Layers tab and the map.

```json
{
  "layers": [
    {
      "id":       "my-visits",
      "name":     "Places I've Visited",
      "type":     "point",
      "data":     "atlas/data/custom/my-visits.geojson",
      "category": "custom",
      "icon":     "📍",
      "color":    "#e07048"
    }
  ]
}
```

Required: `id`, `name`, `type` (`point` / `polygon` / `line`), `data`.
Optional: `category` (default `custom`), `icon` (single emoji), `color` (any CSS colour), `visible`, `zIndex`.

Then create the GeoJSON at the referenced path. Every feature should have at minimum `id`, `geometry`, and `properties.name`:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id":   "visit-jaisalmer-fort",
      "geometry": { "type": "Point", "coordinates": [70.9143, 26.9124] },
      "properties": {
        "name": "Jaisalmer Fort",
        "type": "custom_point",
        "category": "custom",
        "notes": {
          "facts": [
            "One of only 6 UNESCO-inscribed Hill Forts of Rajasthan",
            "The only 'living fort' in the country — thousands still live inside"
          ]
        },
        "images": [
          { "url": "atlas/media/visits/jaisalmer-fort.jpg",
            "caption": "The golden fort at sunset" }
        ]
      }
    }
  ]
}
```

---

## Images and icons

**Icons** — one emoji per feature in the layer config. Rendered at the point coordinate.

**Photos** — two options:

1. **Commit to the repo.** Put files under `atlas/media/<place>/<name>.jpg`. Reference in `images[].url` as a repo-relative path. Simplest, works offline. Keep files under ~200 KB; a JPG of a place usually needs 100–150 KB after `cwebp` / `mozjpeg`.

2. **Link externally.** `images[].url` accepts any absolute URL (Cloudinary, imgix, Unsplash, your own S3). Zero repo weight. Best for large infographics.

Photos render as a grid in the feature's detail card. Click to open the full-size image.

---

## Typical author loop

```bash
# 1. Pull latest
git pull

# 2. Find the feature id you want to enrich
#    Open map.html?ids=1, click the feature, copy the id

# 3. Edit enrichment.json (or a custom/*.geojson)
#    Add extraFacts, images, or your notes.

# 4. Preview locally (optional)
python3 -m http.server 8770 --directory .
# Open http://localhost:8770/

# 5. Commit and push
git add atlas/data/enrichment.json
git commit -m "Enrich Barmer with border + oil facts"
git push
```

The live site rebuilds in ~30 seconds. **Hard-refresh** (`Cmd + Shift + R`) to bypass browser cache.

---

## Common issues

**My facts don't show up.** Check the browser console — enrichment.json will refuse to load if it's malformed. Use a JSON linter or run `python3 -m json.tool atlas/data/enrichment.json`.

**The image doesn't load.** Check the URL is reachable. If you used a repo-relative path, make sure the file is committed.

**My custom layer doesn't appear.** Check the console — `[CustomContent] failed to register …` messages there will tell you what's wrong. Common mistakes:
- `data` path is wrong
- GeoJSON is invalid (validate at [geojsonlint.com](https://geojsonlint.com))
- `id` clashes with an existing layer id

**Everyone can see my `yourNotes`.** That's expected — the atlas is public. `yourNotes` is for private-feeling annotations that render in the card; it doesn't have any access control. If you need actually private notes, use a separate file that's `.gitignore`d.

---

## Security model

* This atlas is a static site. There is no backend, no database, no login.
* **Only accounts with GitHub push access to this repo can add content.** The public sees only the results.
* Anyone can view any content. Do not put credentials, PII, or sensitive information in enrichment.json or custom layer files.
* If a co-editor needs to help, grant them GitHub write-access. Consider using a branch + PR workflow to review before merging to `main`.

---

## Future work

If the text-editor workflow becomes painful, we can add an in-browser editor (Approach 2 in the strategic proposal) — visits at `?edit=1` get an "Add / Edit" side panel; edits live in localStorage; an Export button downloads the JSON to paste into the repo. Or a proper CMS (Approach 3, Decap CMS) if multiple people need to edit.

For now, this text-editor workflow keeps everything simple, versioned via git, and reversible.
