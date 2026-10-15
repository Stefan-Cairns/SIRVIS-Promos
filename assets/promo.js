/* SIRVIS promo embeds — shared engine.
   Loads the edition config + price file, calculates prices, formats them,
   builds tracked CTA links and keeps the iframe sized for Foleon. */
(function () {
  'use strict';

  var params = new URLSearchParams(location.search);

  // ?theme=dark: white text for dark or coloured Foleon sections. ?theme=light: dark text for light sections.
  var theme = params.get('theme');
  if (theme === 'dark' || theme === 'light') document.documentElement.classList.add('on-' + theme);

  // ---------- CSV ----------
  function parseCSV(text) {
    var rows = [], row = [], field = '', q = false, i, c;
    text = text.replace(/^﻿/, '');
    for (i = 0; i < text.length; i++) {
      c = text[i];
      if (q) {
        if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (c === '"') q = false;
        else field += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field); field = '';
        if (row.some(function (v) { return v.trim() !== ''; })) rows.push(row);
        row = [];
      } else field += c;
    }
    if (field !== '' || row.length) { row.push(field); if (row.some(function (v) { return v.trim() !== ''; })) rows.push(row); }
    var head = rows.shift().map(function (h) { return h.trim(); });
    return rows.map(function (r) {
      var o = {};
      head.forEach(function (h, k) { o[h] = (r[k] || '').trim(); });
      return o;
    });
  }

  // ---------- Maths ----------
  var num = function (v) { var n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? 0 : n; };
  var round2 = function (n) { return Math.round((n + 1e-9) * 100) / 100; };

  // Net case price = list × (1 − discount) + excise. Unit = unrounded net ÷ pack size
  // (this matches the wholesaler's canvass, e.g. Corona Extra €28,92 → €1,20 a bottiglia).
  function rawNet(list, discount, excise) { return list * (1 - discount) + excise; }
  function netPrice(list, discount, excise) { return round2(rawNet(list, discount, excise)); }

  function enrich(r) {
    var list = num(r.list_price), excise = num(r.excise), disc = num(r.discount), pack = num(r.pack_size) || 1;
    var net = netPrice(list, disc, excise);
    var p = {
      code: r.code, name: r.product, supplier: r.supplier, category: r.category,
      format: r.format, pack: pack, list: list, excise: excise, discount: disc,
      net: net, unit: round2(rawNet(list, disc, excise) / pack),
      saving: round2(list * disc),
      promo: r.promo_label || '',
      alcoholFree: r.alcohol_free === '1' || /true|si|sì|yes/i.test(r.alcohol_free),
      featured: r.featured === '1',
      image: r.image || '',
      gift: null, compare: null
    };
    if (r.compare_discount !== '') {
      var cd = num(r.compare_discount);
      p.compare = { discount: cd, net: netPrice(list, cd, excise), unit: round2(rawNet(list, cd, excise) / pack) };
    }
    if (num(r.gift_every) > 0) {
      p.gift = { every: num(r.gift_every), qty: num(r.gift_qty), item: r.gift_item, code: r.gift_code };
    }
    return p;
  }

  // ---------- Formatting (Italian) ----------
  var eur = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var pct = function (d) { return Math.round(d * 100) + '%'; };
  function fmtDate(iso) {
    var p = iso.split('-');
    var m = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
    return Number(p[2]) + ' ' + m[Number(p[1]) - 1] + ' ' + p[0];
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; });
  }

  // ---------- Links ----------
  // CTA → SIRVIS PLP with UTM tags. Any utm_* or agent param on the embed URL
  // (e.g. a per-agent Foleon link) overrides / is carried through.
  function ctaUrl(cfg, content, product) {
    var base = (product && cfg.product_url_template) ? cfg.product_url_template.replace('{code}', encodeURIComponent(product.code)) : cfg.plp_url;
    var u;
    try { u = new URL(base); } catch (e) { return base; }
    var utm = cfg.utm || {};
    Object.keys(utm).forEach(function (k) { u.searchParams.set(k, utm[k]); });
    if (content) u.searchParams.set('utm_content', content);
    params.forEach(function (v, k) { if (/^utm_/.test(k) || k === 'agent') u.searchParams.set(k, v); });
    return u.toString();
  }

  // ---------- Iframe sizing ----------
  // Posts the content height to the parent; harmless if nothing listens.
  function autoHeight() {
    var last = 0;
    var send = function () {
      var h = Math.ceil(document.documentElement.scrollHeight);
      if (h !== last) { last = h; try { parent.postMessage({ type: 'sirvis-embed-height', height: h, embed: document.body.dataset.embed || '' }, '*'); } catch (e) {} }
    };
    if (window.ResizeObserver) new ResizeObserver(send).observe(document.body);
    window.addEventListener('load', send);
    send();
  }

  // ---------- Loader ----------
  function load() {
    var cfgPath = params.get('edition') ? 'data/' + params.get('edition').replace(/[^a-z0-9_-]/gi, '') + '.json' : 'data/current.json';
    // Standalone preview (preview-standalone.html) inlines the data, so it works
    // when opened as a local file, where browsers block fetch().
    var inline = window.PROMO_DATA;
    if (inline) {
      return Promise.resolve({ cfg: inline.cfg, products: parseCSV(inline.csv).filter(function (r) { return r.code; }).map(enrich) });
    }
    return fetch(cfgPath, { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('Config non trovata: ' + cfgPath); return r.json(); })
      .then(function (cfg) {
        return fetch(cfg.price_file, { cache: 'no-cache' })
          .then(function (r) { if (!r.ok) throw new Error('Listino non trovato: ' + cfg.price_file); return r.text(); })
          .then(function (txt) { return { cfg: cfg, products: parseCSV(txt).filter(function (r) { return r.code; }).map(enrich) }; });
      });
  }

  function fail(el, err) {
    el.innerHTML = '<p class="error">Impossibile caricare le offerte. Riprova più tardi.</p>';
    if (window.console) console.error(err);
  }

  // Product image, with a neutral placeholder tile if the file is missing.
  function imageHTML(p) {
    var src = p.image || ('assets/img/' + p.code + '.png');
    return '<div class="ph"><img src="' + esc(src) + '" alt="' + esc(p.name + ' ' + p.format) + '" loading="lazy" onerror="this.remove()"><span aria-hidden="true">' + esc(p.format.replace(/^\D*/, '')) + '</span></div>';
  }

  window.Promo = {
    load: load, fail: fail, eur: eur, pct: pct, esc: esc, fmtDate: fmtDate,
    ctaUrl: ctaUrl, autoHeight: autoHeight, imageHTML: imageHTML,
    netPrice: netPrice, round2: round2, parseCSV: parseCSV, enrich: enrich, params: params
  };
})();
