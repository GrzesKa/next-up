// Next Up – reads a product page and returns its name, photo, price and shop.
// Used by the Wishlist "Add from a link" sheet. Only answers signed-in Next Up users.
const dns = require("dns").promises;
const net = require("net");

const SUPABASE_URL = "https://jbfhayhabfpgboorxshn.supabase.co";
const SUPABASE_KEY = "sb_publishable_pYTOFYYQhsOD8ZNMh2U3HA_Cg03opZQ";
const MAX_BYTES = 1500000;
const TIMEOUT_MS = 8000;
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return send(res, 405, { error: "method" });
  try {
    const auth = String(req.headers.authorization || "");
    if (!/^Bearer\s+\S+/.test(auth) || !(await signedIn(auth))) return send(res, 401, { error: "auth" });

    let target;
    try { target = new URL(String((req.query && req.query.url) || "")); } catch (e) { return send(res, 400, { error: "url" }); }
    if (!/^https?:$/.test(target.protocol) || target.username || target.password) return send(res, 400, { error: "url" });

    const page = await fetchPage(target);
    if (!page) return send(res, 422, { error: "unreadable" });
    const info = parse(page.html, page.url);
    info.shop = page.url.hostname.replace(/^www\./, "");
    return send(res, 200, info);
  } catch (e) {
    return send(res, 422, { error: "unreadable" });
  }
};

function send(res, code, body) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

async function signedIn(auth) {
  try {
    const r = await fetch(SUPABASE_URL + "/auth/v1/user", { headers: { apikey: SUPABASE_KEY, Authorization: auth } });
    if (!r.ok) return false;
    const u = await r.json();
    return !!(u && u.id);
  } catch (e) { return false; }
}

// ---------- safe fetching ----------
function privateIp(ip) {
  if (net.isIPv4(ip)) {
    const p = ip.split(".").map(Number);
    return p[0] === 0 || p[0] === 10 || p[0] === 127 || (p[0] === 169 && p[1] === 254) ||
      (p[0] === 172 && p[1] >= 16 && p[1] <= 31) || (p[0] === 192 && p[1] === 168) ||
      (p[0] === 100 && p[1] >= 64 && p[1] <= 127) || p[0] >= 224;
  }
  const v = ip.toLowerCase();
  if (v.startsWith("::ffff:")) return privateIp(v.slice(7));
  return v === "::" || v === "::1" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe8") || v.startsWith("fe9") || v.startsWith("fea") || v.startsWith("feb");
}
async function safeHost(u) {
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) return false;
  if (u.port && !["80", "443"].includes(u.port)) return false;
  if (net.isIP(host)) return !privateIp(host);
  const addrs = await dns.lookup(host, { all: true });
  return addrs.length > 0 && addrs.every((a) => !privateIp(a.address));
}
async function fetchPage(start) {
  let u = start;
  for (let hop = 0; hop < 5; hop++) {
    if (!(await safeHost(u))) return null;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    let r;
    try {
      r = await fetch(u, {
        redirect: "manual", signal: ctrl.signal,
        headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml", "Accept-Language": "pl-PL,pl;q=0.9,en;q=0.8" },
      });
    } finally { clearTimeout(timer); }
    if (r.status >= 300 && r.status < 400) {
      const loc = r.headers.get("location");
      if (!loc) return null;
      u = new URL(loc, u);
      if (!/^https?:$/.test(u.protocol)) return null;
      continue;
    }
    if (!r.ok || !/html/i.test(r.headers.get("content-type") || "html")) return null;
    const html = await readCapped(r);
    return { html, url: u };
  }
  return null;
}
async function readCapped(r) {
  const reader = r.body.getReader();
  const chunks = []; let size = 0;
  while (size < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value); size += value.length;
  }
  try { reader.cancel(); } catch (e) {}
  return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf8");
}

// ---------- reading the page ----------
function decode(s) {
  return String(s || "").replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (m, e) => {
    const k = e.toLowerCase();
    if (k[0] === "#") { const n = k[1] === "x" ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10); return isFinite(n) ? String.fromCodePoint(n) : m; }
    return { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " }[k];
  }).replace(/\s+/g, " ").trim();
}
function metas(html) {
  const out = {};
  const re = /<meta\b[^>]*>/gi; let m;
  while ((m = re.exec(html))) {
    const tag = m[0];
    const key = (/\b(?:property|name|itemprop)\s*=\s*["']([^"']+)["']/i.exec(tag) || [])[1];
    const val = (/\bcontent\s*=\s*"([^"]*)"/i.exec(tag) || /\bcontent\s*=\s*'([^']*)'/i.exec(tag) || [])[1];
    if (key && val != null && !(key.toLowerCase() in out)) out[key.toLowerCase()] = decode(val);
  }
  return out;
}
function findProduct(node, depth) {
  if (!node || depth > 6) return null;
  if (Array.isArray(node)) { for (const n of node) { const p = findProduct(n, depth + 1); if (p) return p; } return null; }
  if (typeof node !== "object") return null;
  const t = [].concat(node["@type"] || []).map(String);
  if (t.some((x) => /product/i.test(x))) return node;
  for (const k of ["@graph", "mainEntity", "itemListElement", "item"]) { const p = findProduct(node[k], depth + 1); if (p) return p; }
  return null;
}
function firstImage(img) {
  if (!img) return null;
  if (typeof img === "string") return img;
  if (Array.isArray(img)) return firstImage(img[0]);
  return img.url || img.contentUrl || null;
}
function num(v) {
  if (v == null) return null;
  const n = parseFloat(String(v).replace(/\s/g, "").replace(",", "."));
  return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}
function parse(html, base) {
  const m = metas(html);
  let name = m["og:title"] || m["twitter:title"] || decode((/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html) || [])[1]);
  let image = m["og:image:secure_url"] || m["og:image"] || m["twitter:image"] || m["twitter:image:src"] || m["image"];
  let price = num(m["product:price:amount"] || m["og:price:amount"] || m["price"]);
  let currency = m["product:price:currency"] || m["og:price:currency"] || m["pricecurrency"] || null;

  const ld = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi; let s;
  while ((s = ld.exec(html))) {
    let data; try { data = JSON.parse(s[1].trim()); } catch (e) { continue; }
    const p = findProduct(data, 0);
    if (!p) continue;
    if (p.name) name = decode(p.name);
    image = firstImage(p.image) || image;
    const offers = [].concat(p.offers || []);
    for (const o of offers) {
      const sub = o && (o.offers ? [].concat(o.offers)[0] : o);
      const pr = sub && num(sub.price != null ? sub.price : sub.lowPrice != null ? sub.lowPrice : (sub.priceSpecification && sub.priceSpecification.price));
      if (pr != null) { price = pr; currency = sub.priceCurrency || (sub.priceSpecification && sub.priceSpecification.priceCurrency) || currency; break; }
    }
    break;
  }
  if (name) {
    // Drop a trailing " | Shop name" or " - shop.pl", but only when it really is the shop's name.
    const label = base.hostname.replace(/^www\./, "").split(".")[0].toLowerCase();
    const site = String(m["og:site_name"] || "").toLowerCase();
    name = name.replace(/\s+[|–—-]\s+([^|–—-]{2,60})$/, (tail, t) => {
      const x = t.toLowerCase();
      return (x.includes(label) || (site && (x.includes(site) || site.includes(x)))) ? "" : tail;
    }).slice(0, 300);
  }
  let img = null;
  try { if (image) { const u = new URL(image, base); if (/^https?:$/.test(u.protocol)) img = u.href.slice(0, 2000); } } catch (e) {}
  return { name: name || null, image: img, price, currency: currency ? String(currency).toUpperCase().slice(0, 8) : null };
}
module.exports.parse = parse;
