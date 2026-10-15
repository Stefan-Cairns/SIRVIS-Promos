# SIRVIS promo embeds

Four embeddable widgets for the Foleon promo leaflet, driven by one price file per edition. Static HTML, CSS and JavaScript only: no build step, no server, no external libraries.

| Embed | File | What it does | Suggested Foleon height |
| --- | --- | --- | --- |
| Interactive price list | `listino.html` | Product cards with net case price, unit price, discount, saving, promo badges; search, supplier / promo / alcohol-free / gift filters, sorting | 1400px (one supplier: ~600px) |
| Order estimate | `stima-ordine.html` | Case steppers per SKU, live total, saving and gifts earned; "Order on SIRVIS" button and "Copy summary" for the order | 1100px |
| Gift offer | `omaggio.html` | Hero block for a gift mechanic (October: Ceres Strong, 6 glasses per 3 cases) with a case counter | 420px desktop, 560px mobile |
| Countdown | `countdown.html` | Time left until the end of the edition (23:59 Italian time on `valid_to`); switches to a "new offers on SIRVIS" message when it ends | 110px |

`index.html` is a preview page that shows all four together once the folder is hosted (GitHub Pages, or a local web server).

**Opening the files by double-click won't work.** Browsers block a page opened from your computer (`file://`) from reading the price file next to it, so the embeds show only "Impossibile caricare le offerte". That's a browser rule, not a bug: they work as soon as they're served from GitHub Pages. To review an edition before uploading, open `preview-standalone.html` instead: it has the data built in and works by double-click. Rebuild it after changing the data with `python3 tools/build-preview.py`.

## 1. Host on GitHub Pages

1. Create a repository (e.g. `sirvis-promo-embeds`) and upload the contents of this folder to the root of the `main` branch.
2. Settings → Pages → Source: *Deploy from a branch*, branch `main`, folder `/ (root)`.
3. After a minute the embeds are live at `https://<your-account>.github.io/sirvis-promo-embeds/listino.html` (and so on).
4. Open `https://<your-account>.github.io/sirvis-promo-embeds/` to check the preview page.

The `.nojekyll` file stops GitHub processing the files; keep it.

## 2. Add to Foleon

For each embed, add Foleon's embed element and paste the page URL (or an `<iframe>` with that URL). Set the height from the table above, and preview on mobile.

Useful URL options (add to the end of the URL):

| Option | Example | Effect |
| --- | --- | --- |
| `filter` | `listino.html?filter=s:Peroni` | Opens the price list on one supplier, so each supplier section in Foleon can have its own embed. Also `promo`, `free` (alcohol-free), `gift` |
| `code` | `omaggio.html?code=100162` | Chooses which gift offer to feature, if an edition has more than one |
| `qty` | `stima-ordine.html?qty=100162:3` | Pre-fills quantities, e.g. to start the estimate on the hero offer |
| `agent`, `utm_*` | `listino.html?agent=MR01` | Carried through to the SIRVIS link, so clicks can be credited to an agent or channel |
| `edition` | `listino.html?edition=2026-11-birra` | Loads `data/2026-11-birra.json` instead of `data/current.json` (for previews or archived editions) |
| `bg` | `countdown.html?bg=transparent` | Transparent background, to sit on a Foleon colour block |

Each embed also posts its height to the parent page (`{type: 'sirvis-embed-height', height}`), in case Foleon or another host can use it to resize automatically.

## 3. New promotion each month

Everything an edition needs is in two files in `data/`.

1. **Price file** — copy `data/2026-10-birra.csv` to a new name (e.g. `data/2026-11-birra.csv`) and replace the rows with the new canvass. Open it in Excel or Google Sheets; save as CSV (comma-separated, UTF-8).
2. **Edition config** — edit `data/current.json`: title, category, `valid_from`, `valid_to`, `price_file` (the new CSV), `utm_campaign`, and anything else that changed.
3. Upload both files to GitHub. The live embeds update within a minute or two; Foleon does not need to change.
4. Open the preview page and check prices against the canvass (see *Checking prices* below).

To keep an old edition viewable, save its config as e.g. `data/2026-10-birra.json` before editing `current.json`, then use `?edition=2026-10-birra`.

### Price file columns

| Column | Required | Notes |
| --- | --- | --- |
| `code` | yes | Product code from the canvass |
| `product` | yes | Display name |
| `supplier` | yes | Groups and filters (Heineken, Ceres, Peroni, InBev…) |
| `category` | yes | e.g. Birra |
| `format` | yes | e.g. `Vetro 33cl` |
| `pack_size` | yes | Bottles per case (24, 12) |
| `list_price` | yes | L01, € per case |
| `excise` | no | Tasse, € per case; blank = 0 (alcohol-free) |
| `discount` | yes | As a decimal: 0.36 = 36% |
| `compare_discount` | no | The standard (non-promo) discount, shown as a struck-through price. October: Peroni and Raffo |
| `promo_label` | no | Badge text, e.g. `Promo SIPRO` |
| `alcohol_free` | no | `1` for 0.0 products |
| `gift_every`, `gift_qty`, `gift_item`, `gift_code` | no | Gift mechanic: every 3 cases → 6 Ceres calici, code P00580 |
| `image` | no | Pack shot path; blank uses `assets/img/<code>.png` |
| `featured` | no | `1` to flag a highlight (reserved for a future highlights strip) |

Prices are calculated, not typed: **net case price = list × (1 − discount) + excise**, and **unit price = that unrounded net ÷ pack size**, rounded to the cent. This reproduces every figure on the October canvass.

### Pack shots

Save each pack shot as `assets/img/<code>.png` (e.g. `assets/img/100056.png`), transparent background, about 300 × 400 px. Until an image exists, the card shows a neutral tile with the format (e.g. "33cl"). Use only the suppliers' approved images.

### Brand colours

The embeds use the SIRVIS palette from `SIRVIS_Brand_Colours.docx`, set as variables at the top of `assets/promo.css`: SIRVIS Grey `#303E48` for text and dark blocks, SIRVIS Green `#02AF8B` for brand highlights, Primary Hover `#277E6C` for buttons and discount badges, and Primary Disabled `#C7E6E0` for light green bands. White text on SIRVIS Green measures 2.8:1 contrast, below the 4.5:1 that small text needs, so small buttons use `#277E6C` (4.9:1). SIRVIS Green carries text only at large sizes, such as the gift offer button. Change the variables there if the palette changes.

### CTA link

`plp_url` in `data/current.json` is where every "Ordina su SIRVIS" button goes, with UTM tags added (`utm_source=foleon`, `utm_medium=digital-leaflet`, `utm_campaign`, and `utm_content` naming the embed). **Replace the placeholder `https://www.sirvis.it/` with the real PLP URL.** If SIRVIS product pages can be addressed by code, set `product_url_template` (e.g. `https://…/prodotto/{code}`) and the gift offer will link straight to the product.

## Checking prices

With Node.js installed:

```
node tools/check-prices.js data/2026-10-birra.csv tools/expected-2026-10.json
```

It compares every calculated net and unit price with the figures from the canvass. For a new edition, copy the expected file, type in the canvass's Pr.netto and Pr.unit figures, and run it against the new CSV.

## Notes

- Prices are labelled "IVA e accise incluse" per the agreed assumption; change `price_note` in the config if that turns out to be wrong.
- Everyone qualifies for Promo SIPRO, so the promo price is shown as the price, with the standard price struck through where the canvass lists both.
- The order estimate does not place orders or pass a basket to SIRVIS; it sends the customer to the PLP and offers a copyable summary.
