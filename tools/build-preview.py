"""Builds preview-standalone.html: all four embeds with CSS, JS and the current
edition's data inlined, so it opens by double-click (no server needed) and can be
emailed or shared for review. The live embeds on GitHub Pages don't use this file.

Run from the project folder:  python3 tools/build-preview.py
"""
import html, json, pathlib, re

root = pathlib.Path(__file__).resolve().parent.parent
cfg = json.loads((root / 'data/current.json').read_text(encoding='utf-8'))
csv = (root / cfg['price_file']).read_text(encoding='utf-8')
css = (root / 'assets/promo.css').read_text(encoding='utf-8')
js = (root / 'assets/promo.js').read_text(encoding='utf-8')
data = '<script>window.PROMO_DATA=' + json.dumps({'cfg': cfg, 'csv': csv}, ensure_ascii=False).replace('</', '<\\/') + ';</script>'

def standalone(page):
    src = (root / page).read_text(encoding='utf-8')
    src = src.replace('<link rel="stylesheet" href="assets/promo.css">', '<style>' + css + '</style>')
    src = src.replace('<script src="assets/promo.js"></script>', data + '<script>' + js + '</script>')
    return src

embeds = [
    ('countdown.html', 'Countdown', 'countdown.html', 110),
    ('omaggio.html', 'Offerta omaggio', 'omaggio.html', 440),
    ('listino.html', 'Listino interattivo', 'listino.html', 1400),
    ('stima-ordine.html', 'Stima ordine', 'stima-ordine.html', 1150),
]
sections = ''.join(
    f'<section><h2>{t}</h2><p class="small"><code>{f}</code></p>'
    f'<iframe title="{t}" height="{h}" srcdoc="{html.escape(standalone(p), quote=True)}"></iframe></section>'
    for p, t, f, h in embeds)

page = f'''<!doctype html>
<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Promo embeds preview</title>
<style>{css}
body {{ max-width: 1040px; margin: 0 auto; padding: 24px 16px 48px; }}
section {{ margin-top: 28px; }} h1 {{ font-size: 22px; }} h2 {{ font-size: 17px; margin-bottom: 2px; }}
code {{ background: var(--surface); padding: 2px 6px; border-radius: 6px; font-size: 13px; }}
iframe {{ width: 100%; border: 1px dashed var(--line); border-radius: 12px; margin-top: 8px; display: block; }}
</style></head><body>
<h1>{html.escape(cfg['title'])} · {html.escape(cfg['category'])} — embed preview</h1>
<p class="small">Standalone review copy with the data built in. In Foleon each block is a separate embed pointing at its GitHub Pages URL.</p>
{sections}
<script>
window.addEventListener('message', function (e) {{
  if (!e.data || e.data.type !== 'sirvis-embed-height') return;
  document.querySelectorAll('iframe').forEach(function (f) {{ if (f.contentWindow === e.source) f.style.height = e.data.height + 'px'; }});
}});
</script></body></html>'''
out = root / 'preview-standalone.html'
out.write_text(page, encoding='utf-8')
print('Wrote', out, f'({len(page)//1024} KB)')
