/* Next Up – tasks by priority, synced through Supabase. */
(() => {
  "use strict";

  // ---------- constants ----------
  const CFG = window.NEXTUP_CONFIG || {};
  // Category colour pairs: square colour (tile) + circle colour (count). Stored on the category as the square colour.
  const PAIRS = [
    { name: "Periwinkle & Apricot", sq: "#98A6EF", ci: "#F3C07E" },
    { name: "Lime & Forest", sq: "#C9D865", ci: "#245441" },
    { name: "Terracotta & Plum", sq: "#D96B4E", ci: "#6E1C3A" },
    { name: "Slate & Ice", sq: "#41626F", ci: "#C5D7F2" },
    { name: "Sage & Ochre", sq: "#B1C29E", ci: "#B58953" },
    { name: "Pink & Butter", sq: "#E9AFC6", ci: "#F8DE8A" },
    { name: "Pine & Orchid", sq: "#38504A", ci: "#E2A0D2" },
    { name: "Peach & Tangerine", sq: "#F6CBBB", ci: "#F58A55" },
    { name: "Ink & Sand", sq: "#2F3E66", ci: "#E9D8B0" },
    { name: "Mustard & Brick", sq: "#E0B84A", ci: "#8C3B2E" },
    { name: "Mint & Teal", sq: "#BFE3D0", ci: "#2F6F6A" },
    { name: "Lilac & Aubergine", sq: "#C9B6E8", ci: "#4A2E5C" },
  ];
  const COLORS = PAIRS.map((p) => p.sq);
  function lum(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
    if (!m) return 0.5;
    const n = parseInt(m[1], 16);
    const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  }
  const inkOn = (hex) => (lum(hex) < 0.2 ? "#FFFFFF" : "#151514");
  function pairFor(color) {
    const p = PAIRS.find((x) => x.sq.toLowerCase() === String(color || "").toLowerCase());
    const sq = p ? p.sq : (color || "#DEDAD2");
    const ci = p ? p.ci : (lum(sq) < 0.2 ? "#F2F0EB" : "#151514");
    return { sq, ci, sqInk: inkOn(sq), ciInk: inkOn(ci) };
  }
  function applyPair(node, color) {
    const p = pairFor(color);
    node.style.setProperty("--c", p.sq); node.style.setProperty("--c2", p.ci);
    node.style.setProperty("--ct", p.sqInk); node.style.setProperty("--c2t", p.ciInk);
  }
  const NO_CAT = { sq: "#DEDAD2", ci: "#B4B1A8" };
  const PRI = { 3: "High", 2: "Medium", 1: "Low" };
  const DEFAULT_CATS = [
    { name: "School", color: "#98A6EF" },
    { name: "Personal projects", color: "#C9D865" },
    { name: "Personal", color: "#D96B4E" },
  ];
  const ICONS = {
    all: '<svg class="icon" viewBox="0 0 16 16" fill="none"><path d="M2.5 4h11M2.5 8h11M2.5 12h7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    today: '<svg class="icon" viewBox="0 0 16 16" fill="none"><rect x="2.5" y="3.5" width="11" height="10" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    cal: '<svg class="icon" viewBox="0 0 16 16" fill="none"><rect x="2.5" y="3.5" width="11" height="10" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M2.5 6.5h11" stroke="currentColor" stroke-width="1.5"/><circle cx="5.5" cy="9.3" r=".9" fill="currentColor"/><circle cx="8" cy="9.3" r=".9" fill="currentColor"/><circle cx="10.5" cy="9.3" r=".9" fill="currentColor"/><circle cx="5.5" cy="11.6" r=".9" fill="currentColor"/></svg>',
    book: '<svg class="icon" viewBox="0 0 16 16" fill="none"><path d="M3 2.5h7.5a2 2 0 0 1 2 2v9H5a2 2 0 0 1-2-2v-9z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M3 11.5a2 2 0 0 1 2-2h7.5" stroke="currentColor" stroke-width="1.5"/></svg>',
    cart: '<svg class="icon" viewBox="0 0 16 16" fill="none"><path d="M1.8 2.5h2l1.6 7.6h7l1.5-5.4H4.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6.3" cy="13" r="1.1" fill="currentColor"/><circle cx="11.6" cy="13" r="1.1" fill="currentColor"/></svg>',
    week: '<svg class="icon" viewBox="0 0 16 16" fill="none"><path d="M3 12.5l3-4 3 2 4-6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    check: '<svg viewBox="0 0 12 12" fill="none"><path d="M2.5 6.2l2.3 2.3 4.7-4.8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    edit: '<svg viewBox="0 0 18 18" fill="none"><path d="M11.5 3.5l3 3L6 15H3v-3l8.5-8.5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
  };

  // ---------- state ----------
  let sb = null;
  let userId = null;
  let authKnown = false;
  let channel = null;
  let cats = [];
  let tasks = [];
  let shop = [];
  let books = [];
  let mem = [];
  let loaded = false;
  let seeding = false;
  const prefs = loadPrefs();
  let view = prefs.view || { type: "all" };
  let sortBy = prefs.sortBy || "urgency";
  let showDone = !!prefs.showDone;
  let calCat = prefs.calCat || "";
  let shelf = prefs.shelf || "to_read";

  function loadPrefs() { try { return JSON.parse(localStorage.getItem("nextup.prefs") || "{}"); } catch (e) { return {}; } }
  function savePrefs() { try { localStorage.setItem("nextup.prefs", JSON.stringify({ view, sortBy, showDone, calCat, shelf })); } catch (e) {} }

  const $ = (id) => document.getElementById(id);
  const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  // ---------- dates & urgency ----------
  function dateStr(offset) {
    const d = new Date(); d.setDate(d.getDate() + offset);
    return ymd(d);
  }
  const ymd = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const parseYmd = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  function daysUntil(s) {
    if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    const n = new Date(); n.setHours(0, 0, 0, 0);
    return Math.round((parseYmd(s) - n) / 86400000);
  }
  function fmtDate(s) {
    const dt = parseYmd(s);
    const opts = { weekday: "short", day: "numeric", month: "short" };
    if (dt.getFullYear() !== new Date().getFullYear()) opts.year = "numeric";
    return dt.toLocaleDateString("en-GB", opts);
  }
  const shortDay = (s) => parseYmd(s).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  function dueInfo(s) {
    const d = daysUntil(s);
    if (d === null) return null;
    if (d < 0) return { text: d === -1 ? "Overdue by 1 day" : "Overdue by " + (-d) + " days", cls: "due-over" };
    if (d === 0) return { text: "Due today", cls: "due-today" };
    if (d === 1) return { text: "Due tomorrow", cls: "due-soon" };
    if (d < 7) return { text: "Due " + parseYmd(s).toLocaleDateString("en-GB", { weekday: "long" }), cls: d <= 3 ? "due-soon" : "" };
    return { text: "Due " + fmtDate(s), cls: "" };
  }
  function urgency(t) {
    const d = daysUntil(t.due);
    let due = 0;
    if (d !== null) {
      if (d < 0) due = 50 + Math.min(-d, 10);
      else if (d === 0) due = 40;
      else if (d === 1) due = 30;
      else if (d <= 3) due = 22;
      else if (d <= 7) due = 14;
      else if (d <= 14) due = 7;
      else due = 2;
    }
    return due + (Number(t.priority) || 2) * 12;
  }
  function whyUrgent(t) {
    const d = daysUntil(t.due);
    const p = Number(t.priority) || 2;
    if (d !== null && d < 0) return "It is overdue";
    if (d === 0) return p === 3 ? "High priority and due today" : "It is due today";
    if (d === 1) return p === 3 ? "High priority and due tomorrow" : "It is due tomorrow";
    if (p === 3 && d === null) return "High priority with no deadline set";
    if (p === 3) return "Highest priority on your list";
    if (d !== null && d <= 7) return "Coming up soonest";
    return "Top of your list right now";
  }

  // ---------- sorting & filtering ----------
  function cmpDue(a, b) {
    const da = daysUntil(a.due), dbb = daysUntil(b.due);
    if (da === null && dbb === null) return 0;
    if (da === null) return 1;
    if (dbb === null) return -1;
    return da - dbb;
  }
  function sortTasks(arr, by) {
    const c = arr.slice();
    const created = (a, b) => (a.createdAt || 0) - (b.createdAt || 0);
    const fns = {
      urgency: (a, b) => urgency(b) - urgency(a) || cmpDue(a, b) || created(a, b),
      due: (a, b) => cmpDue(a, b) || (b.priority - a.priority) || created(a, b),
      priority: (a, b) => (b.priority - a.priority) || cmpDue(a, b) || created(a, b),
      newest: (a, b) => created(b, a),
    };
    c.sort(fns[by] || fns.urgency);
    return c;
  }
  const catById = (id) => cats.find((c) => c.id === id);
  function inView(t, v) {
    if (v.type === "today") { const d = daysUntil(t.due); return d !== null && d <= 0; }
    if (v.type === "week") { const d = daysUntil(t.due); return d !== null && d <= 7; }
    if (v.type === "cat") return v.id === "none" ? !catById(t.categoryId) : t.categoryId === v.id;
    return true;
  }

  // ---------- rows <-> objects ----------
  const toIso = (ms) => (ms ? new Date(ms).toISOString() : null);
  function taskFromRow(r) {
    return {
      id: r.id, title: r.title || "", notes: r.notes || "", categoryId: r.category_id || null,
      priority: Number(r.priority) || 2, due: r.due || null, done: !!r.done,
      doneAt: r.done_at ? Date.parse(r.done_at) : null, createdAt: r.created_at ? Date.parse(r.created_at) : Date.now(),
      repeat: r.repeat || null,
      progress: Math.max(0, Math.min(100, Number(r.progress) || 0)),
      cleared: r.cleared !== false,
    };
  }
  function taskToRow(t) {
    return {
      id: t.id, user_id: userId, title: t.title, notes: t.notes || "", category_id: t.categoryId || null,
      priority: Number(t.priority) || 2, due: t.due || null, done: !!t.done, done_at: toIso(t.doneAt), created_at: toIso(t.createdAt),
      repeat: t.repeat || null,
      progress: Math.max(0, Math.min(100, Number(t.progress) || 0)),
      cleared: t.cleared !== false,
    };
  }
  function patchToRow(p) {
    const map = { title: "title", notes: "notes", categoryId: "category_id", priority: "priority", due: "due", done: "done", repeat: "repeat", progress: "progress", cleared: "cleared" };
    const out = {};
    Object.keys(p).forEach((k) => {
      if (k === "doneAt") out.done_at = toIso(p.doneAt);
      else if (map[k]) out[map[k]] = p[k] === undefined ? null : p[k];
    });
    return out;
  }
  const catFromRow = (r) => ({ id: r.id, name: r.name || "", color: r.color || COLORS[0], position: Number(r.position) || 0 });
  const catToRow = (c) => ({ id: c.id, user_id: userId, name: c.name, color: c.color, position: c.position || 0 });
  const shopFromRow = (r) => ({ id: r.id, name: r.name || "", aisle: r.aisle || "other", done: !!r.done, doneAt: r.done_at ? Date.parse(r.done_at) : null, createdAt: r.created_at ? Date.parse(r.created_at) : Date.now() });
  const shopToRow = (i) => ({ id: i.id, user_id: userId, name: i.name, aisle: i.aisle || "other", done: !!i.done, done_at: toIso(i.doneAt), created_at: toIso(i.createdAt) });
  const bookFromRow = (r) => ({ id: r.id, title: r.title || "", author: r.author || "", coverUrl: r.cover_url || null, status: r.status || "to_read", sourceKey: r.source_key || null, createdAt: r.created_at ? Date.parse(r.created_at) : Date.now(), finishedAt: r.finished_at ? Date.parse(r.finished_at) : null, notes: r.notes || "" });
  const bookToRow = (b) => ({ id: b.id, user_id: userId, title: b.title, author: b.author || "", cover_url: b.coverUrl || null, status: b.status || "to_read", source_key: b.sourceKey || null, created_at: toIso(b.createdAt), finished_at: toIso(b.finishedAt), notes: b.notes || "" });
  const memFromRow = (r) => ({ id: r.id, word: r.word || "", aisle: r.aisle || "other" });
  const sortCats = () => { cats = cats.slice().sort((a, b) => a.position - b.position || a.name.localeCompare(b.name)); };

  // ---------- status & toast ----------
  function setStatus(kind, text) {
    $("status").className = "status" + (kind ? " " + kind : "");
    $("status-text").textContent = text;
  }
  let toastTimer = null, toastUndo = null;
  function toast(text, undo, actionLabel) {
    $("toast-text").textContent = text;
    toastUndo = undo || null;
    $("toast-undo").hidden = !undo;
    $("toast-undo").textContent = actionLabel || "Undo";
    $("toast").classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $("toast").classList.remove("show"); toastUndo = null; }, undo ? 6000 : 4500);
  }
  $("toast-undo").addEventListener("click", () => {
    const fn = toastUndo; toastUndo = null; $("toast").classList.remove("show");
    if (fn) fn();
  });

  // ---------- local copy + offline change queue ----------
  // Every change is applied on screen at once, saved to this device, and queued.
  // The queue is sent to Supabase in order whenever there is a connection; field-level
  // updates mean edits made elsewhere to other fields of the same task are kept.
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };
  const cacheKey = () => "nextup.cache." + userId;
  const outboxKey = () => "nextup.outbox." + userId;
  let outbox = [];
  let flushing = false;
  let needsReload = false;
  let offlineSession = false;

  function saveLocal() { if (userId && loaded) LS.set(cacheKey(), { cats, tasks, shop, mem, books, savedAt: Date.now() }); }
  function loadLocal() {
    const c = LS.get(cacheKey(), null);
    if (!c) return false;
    cats = Array.isArray(c.cats) ? c.cats : []; tasks = Array.isArray(c.tasks) ? c.tasks : [];
    shop = Array.isArray(c.shop) ? c.shop : []; mem = Array.isArray(c.mem) ? c.mem : [];
    books = Array.isArray(c.books) ? c.books : [];
    sortCats(); loaded = true;
    return true;
  }
  const isOffline = () => navigator.onLine === false;
  function isRetryable(err) {
    const m = String((err && (err.message || err.code || err)) || "");
    return isOffline() || /fetch|network|load failed|timeout|offline|jwt|token|PGRST30/i.test(m) || (err && (err.status === 401 || err.status === 0));
  }
  function statusLine() {
    if (!userId) return;
    const n = outbox.length;
    const waiting = n + (n === 1 ? " change" : " changes");
    if (isOffline() || offlineSession) setStatus("warn", n ? "Offline · " + waiting + " waiting to sync" : "Offline · showing your saved copy");
    else if (n) setStatus("", "Syncing " + waiting + "…");
    else setStatus("ok", "Synced across your devices");
  }
  function execOp(op) {
    const q = sb.from(op.table);
    if (op.kind === "upsert") return q.upsert(op.rows);
    if (op.kind === "update") return q.update(op.patch).eq("id", op.id);
    if (op.kind === "delete") return q.delete().in("id", op.ids);
    if (op.kind === "updateWhere") return q.update(op.patch).eq(op.field, op.value);
    if (op.kind === "deleteWhere") return q.delete().eq(op.field, op.value);
    return Promise.resolve({ error: null });
  }
  // Re-apply still-queued changes on top of freshly loaded data, so a reload never undoes them.
  const TABLES = {
    tasks: { get: () => tasks, set: (a) => { tasks = a; }, from: (r) => taskFromRow(r) },
    categories: { get: () => cats, set: (a) => { cats = a; sortCats(); }, from: (r) => catFromRow(r) },
    shopping_items: { get: () => shop, set: (a) => { shop = a; }, from: (r) => shopFromRow(r) },
    shopping_memory: { get: () => mem, set: (a) => { mem = a; }, from: (r) => memFromRow(r) },
    books: { get: () => books, set: (a) => { books = a; }, from: (r) => bookFromRow(r) },
  };
  function applyOpLocal(op) {
    const T = TABLES[op.table];
    if (!T) return;
    let arr = T.get();
    const field = op.localField || "categoryId";
    if (op.kind === "upsert") {
      op.rows.forEach((r) => {
        const o = T.from(r);
        const i = arr.findIndex((x) => x.id === o.id);
        arr = i === -1 ? arr.concat([o]) : arr.map((x, j) => (j === i ? o : x));
      });
    } else if (op.kind === "update") arr = arr.map((x) => (x.id === op.id ? Object.assign({}, x, op.local) : x));
    else if (op.kind === "delete") arr = arr.filter((x) => op.ids.indexOf(x.id) === -1);
    else if (op.kind === "updateWhere") arr = arr.map((x) => (x[field] === op.value ? Object.assign({}, x, op.local) : x));
    else if (op.kind === "deleteWhere") arr = arr.filter((x) => x[field] !== op.value);
    T.set(arr);
  }
  function persistOutbox() { if (userId) LS.set(outboxKey(), outbox); }
  function enqueue(op) {
    outbox.push(op);
    persistOutbox();
    saveLocal();
    if (isOffline() || offlineSession) needsReload = true;
    statusLine();
    flush();
  }
  async function flush() {
    if (flushing || !sb || !userId || offlineSession || !outbox.length) { statusLine(); return; }
    flushing = true;
    statusLine();
    while (outbox.length && !isOffline()) {
      let res;
      try { res = await execOp(outbox[0]); } catch (e) { res = { error: e }; }
      if (res && res.error) {
        if (isRetryable(res.error)) { needsReload = true; break; }
        console.error(res.error);
        toast("One change couldn't be saved and was skipped.");
        outbox.shift(); persistOutbox(); needsReload = true;
        continue;
      }
      outbox.shift(); persistOutbox();
    }
    flushing = false;
    statusLine();
    if (!outbox.length && needsReload) { needsReload = false; loadAll(true); }
  }

  async function loadAll(quiet) {
    if (!userId || offlineSession) return;
    if (!quiet && !loaded) setStatus("", "Loading your tasks…");
    let c, t, si, sm, bk;
    try {
      [c, t, si, sm, bk] = await Promise.all([
        sb.from("categories").select("*").order("position", { ascending: true }),
        sb.from("tasks").select("*").order("created_at", { ascending: true }),
        sb.from("shopping_items").select("*").order("created_at", { ascending: true }),
        sb.from("shopping_memory").select("*"),
        sb.from("books").select("*").order("created_at", { ascending: true }),
      ]);
    } catch (e) { c = { error: e }; t = { error: e }; }
    if (c.error || t.error) {
      console.error(c.error || t.error);
      if (!loaded) loadLocal();
      loaded = true;
      if (isOffline() || isRetryable(c.error || t.error)) statusLine();
      else setStatus("warn", "Couldn't reach your tasks. Showing your saved copy.");
      render();
      return;
    }
    cats = c.data.map(catFromRow); sortCats();
    tasks = t.data.map(taskFromRow);
    if (si && !si.error) shop = si.data.map(shopFromRow);
    if (sm && !sm.error) mem = sm.data.map(memFromRow);
    if (bk && !bk.error) books = bk.data.map(bookFromRow);
    outbox.forEach(applyOpLocal);
    loaded = true;
    if (!cats.length && !tasks.length && !seeding && !outbox.length) seedDefaults();
    saveLocal();
    statusLine();
    render();
  }

  function seedDefaults() {
    seeding = true;
    const rows = DEFAULT_CATS.map((c, i) => ({ id: uid("c"), name: c.name, color: c.color, position: i }));
    cats = rows.slice();
    render();
    enqueue({ kind: "upsert", table: "categories", rows: rows.map(catToRow) });
  }

  function subscribe() {
    if (offlineSession) return;
    if (channel) { sb.removeChannel(channel); channel = null; }
    channel = sb.channel("nextup-" + userId)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, (p) => applyChange("tasks", p))
      .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, (p) => applyChange("categories", p))
      .on("postgres_changes", { event: "*", schema: "public", table: "shopping_items" }, (p) => applyChange("shopping_items", p))
      .on("postgres_changes", { event: "*", schema: "public", table: "shopping_memory" }, (p) => applyChange("shopping_memory", p))
      .on("postgres_changes", { event: "*", schema: "public", table: "books" }, (p) => applyChange("books", p))
      .subscribe((status) => {
        if (status === "SUBSCRIBED" && loaded) statusLine();
      });
  }

  function applyChange(table, p) {
    if (!loaded) return;
    const T = TABLES[table];
    if (!T) return;
    let arr = T.get();
    if (p.eventType === "DELETE") {
      const id = p.old && p.old.id;
      if (!id) return;
      arr = arr.filter((x) => x.id !== id);
    } else {
      const row = p.new || {};
      if (row.user_id && row.user_id !== userId) return;
      const obj = T.from(row);
      const i = arr.findIndex((x) => x.id === obj.id);
      arr = i === -1 ? arr.concat([obj]) : arr.map((x, j) => (j === i ? obj : x));
    }
    T.set(arr);
    outbox.forEach((op) => { if (op.table === table) applyOpLocal(op); });
    saveLocal();
    render();
  }

  // ---------- task & category actions ----------
  function addTask(data) {
    const t = Object.assign({ id: uid("t"), notes: "", categoryId: null, priority: 2, due: null, done: false, doneAt: null, createdAt: Date.now(), repeat: null, progress: 0 }, data);
    tasks = tasks.concat([t]); render();
    enqueue({ kind: "upsert", table: "tasks", rows: [taskToRow(t)] });
  }
  function updateTask(id, patch) {
    tasks = tasks.map((x) => (x.id === id ? Object.assign({}, x, patch) : x)); render();
    enqueue({ kind: "update", table: "tasks", id, patch: patchToRow(patch), local: patch });
  }
  function restoreTasks(list) {
    const ids = new Set(list.map((t) => t.id));
    tasks = tasks.filter((x) => !ids.has(x.id)).concat(list); render();
    enqueue({ kind: "upsert", table: "tasks", rows: list.map(taskToRow) });
  }
  function deleteTasks(list) {
    const ids = list.map((t) => t.id);
    tasks = tasks.filter((x) => ids.indexOf(x.id) === -1); render();
    enqueue({ kind: "delete", table: "tasks", ids });
  }
  // ---------- repeating tasks ----------
  // Stored as "every:N:unit" or "every:N:week:d,d" (d = 0 Sun … 6 Sat). Older values are still understood.
  const DAY_SHORT = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const DAY_NAME = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
  function parseRepeat(rule) {
    if (!rule) return null;
    const legacy = { daily: [1, "day"], weekdays: [1, "week", [1, 2, 3, 4, 5]], weekly: [1, "week"], biweekly: [2, "week"], monthly: [1, "month"], yearly: [1, "year"] };
    if (legacy[rule]) { const l = legacy[rule]; return { n: l[0], unit: l[1], days: l[2] || null }; }
    if (rule.indexOf("days:") === 0) return { n: 1, unit: "week", days: rule.slice(5).split(",").map(Number) };
    const m = /^every:(\d+):(day|week|month|year)(?::([0-6](?:,[0-6])*))?$/.exec(rule);
    if (!m) return null;
    return { n: Math.max(1, Number(m[1])), unit: m[2], days: m[3] ? m[3].split(",").map(Number) : null };
  }
  function buildRepeat(n, unit, days) {
    if (!unit) return null;
    return "every:" + n + ":" + unit + (unit === "week" && days && days.length ? ":" + days.slice().sort((a, b) => a - b).join(",") : "");
  }
  const orderDays = (days) => WEEK_ORDER.filter((d) => days.indexOf(d) !== -1);
  function repeatLabel(rule) {
    const r = parseRepeat(rule);
    if (!r) return "REPEATS";
    const word = { day: ["DAILY", "DAYS"], week: ["WEEKLY", "WEEKS"], month: ["MONTHLY", "MONTHS"], year: ["YEARLY", "YEARS"] }[r.unit];
    if (r.unit === "week" && r.days) {
      const list = orderDays(r.days).map((d) => DAY_SHORT[d]).join(", ");
      if (r.days.length === 5 && [1, 2, 3, 4, 5].every((d) => r.days.indexOf(d) !== -1) && r.n === 1) return "WEEKDAYS";
      if (r.n === 1) return r.days.length === 1 ? "EVERY " + list : list;
      return "EVERY " + r.n + " WKS · " + list;
    }
    return r.n === 1 ? word[0] : "EVERY " + r.n + " " + word[1];
  }
  function repeatSentence(r) {
    if (!r) return "";
    const unit = r.n === 1 ? r.unit : r.unit + "s";
    let s = "Repeats every " + (r.n === 1 ? "" : r.n + " ") + unit;
    if (r.unit === "week" && r.days && r.days.length) {
      const names = orderDays(r.days).map((d) => DAY_NAME[d]);
      s += " on " + (names.length > 1 ? names.slice(0, -1).join(", ") + " and " + names[names.length - 1] : names[0]);
    }
    return s + ". When you tick it off, the next one appears.";
  }
  function repeatDays(rule) { const r = parseRepeat(rule); return r && r.unit === "week" && r.days && r.days.length ? r.days : null; }
  // Move a date forward (same day allowed) to the first chosen weekday.
  function alignToDays(dueStr, rule) {
    const days = repeatDays(rule);
    if (!days || !dueStr) return dueStr;
    const x = parseYmd(dueStr);
    for (let i = 0; i < 7 && days.indexOf(x.getDay()) === -1; i++) x.setDate(x.getDate() + 1);
    return ymd(x);
  }
  const mondayOf = (d) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
  function stepDate(d, rule, anchorDay) {
    const r = parseRepeat(rule) || { n: 1, unit: "day", days: null };
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const addMonths = (k) => {
      const day = anchorDay || x.getDate();
      x.setDate(1); x.setMonth(x.getMonth() + k);
      const last = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate();
      x.setDate(Math.min(day, last));
    };
    if (r.unit === "day") { x.setDate(x.getDate() + r.n); return x; }
    if (r.unit === "month") { addMonths(r.n); return x; }
    if (r.unit === "year") { addMonths(12 * r.n); return x; }
    if (!r.days || !r.days.length) { x.setDate(x.getDate() + 7 * r.n); return x; }
    // week with chosen days: next chosen day later this week, else first chosen day N weeks on
    const pos = (x.getDay() + 6) % 7;
    const later = orderDays(r.days).map((dd) => (dd + 6) % 7).filter((p) => p > pos);
    if (later.length) { x.setDate(x.getDate() + (later[0] - pos)); return x; }
    const mon = mondayOf(x); mon.setDate(mon.getDate() + 7 * r.n);
    mon.setDate(mon.getDate() + ((orderDays(r.days)[0] + 6) % 7));
    return mon;
  }
  // Next due date after completing: the first occurrence after today (no pile-up of missed ones).
  function nextDue(t) {
    const today = parseYmd(dateStr(0));
    const base = t.due ? parseYmd(t.due) : today;
    const anchor = base.getDate();
    let x = stepDate(base, t.repeat, anchor), guard = 0;
    while (x <= today && guard++ < 3000) x = stepDate(x, t.repeat, anchor);
    return ymd(x);
  }
  // Future occurrences of a repeating task between two dates (for the calendar).
  function occurrences(t, fromStr, toStr) {
    if (!t.repeat || !t.due || t.done) return [];
    const out = []; const anchor = parseYmd(t.due).getDate();
    let x = stepDate(parseYmd(t.due), t.repeat, anchor), guard = 0;
    const to = parseYmd(toStr), from = parseYmd(fromStr);
    while (x <= to && guard++ < 800) { if (x >= from) out.push(ymd(x)); x = stepDate(x, t.repeat, anchor); }
    return out;
  }

  // A ticked task stays in place, crossed off, until it's tapped a second time (or the day ends).
  function isPending(t) {
    if (!t.done || t.cleared !== false || !t.doneAt) return false;
    const d = new Date(t.doneAt), n = new Date();
    return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
  }
  const isShown = (t) => !t.done || isPending(t);
  function onCheck(t) {
    if (!t.done) return completeTask(t);
    if (isPending(t)) {
      updateTask(t.id, { cleared: true });
      toast("Cleared: " + clip(t.title, 40), () => updateTask(t.id, { cleared: false }));
      return;
    }
    reopenTask(t);
  }
  function completeTask(t) {
    const now = Date.now();
    if (t.repeat) {
      const next = Object.assign({}, t, { id: uid("t"), due: nextDue(t), done: false, doneAt: null, createdAt: now, progress: 0, cleared: true });
      updateTask(t.id, { done: true, doneAt: now, cleared: false, repeat: null });
      addTask(next);
      toast("Next one: " + shortDay(next.due));
      return;
    }
    updateTask(t.id, { done: true, doneAt: now, cleared: false });
  }
  // Un-tick. For a repeating task, also remove the next occurrence that ticking created.
  function reopenTask(t) {
    const next = t.doneAt ? tasks.find((x) => !x.done && x.repeat && x.id !== t.id && x.title === t.title &&
      (x.categoryId || null) === (t.categoryId || null) && Math.abs((x.createdAt || 0) - t.doneAt) < 15000) : null;
    if (next) deleteTasks([next]);
    updateTask(t.id, Object.assign({ done: false, doneAt: null, cleared: true }, next ? { repeat: next.repeat } : {}));
  }
  function toggleDone(t) { onCheck(t); }
  function deleteTask(t) {
    const copy = Object.assign({}, t);
    deleteTasks([t]);
    toast("Deleted: " + clip(t.title, 40), () => restoreTasks([copy]));
  }
  function saveCategory(c) {
    const i = cats.findIndex((x) => x.id === c.id);
    cats = i === -1 ? cats.concat([c]) : cats.map((x) => (x.id === c.id ? c : x));
    sortCats(); render();
    enqueue({ kind: "upsert", table: "categories", rows: [catToRow(c)] });
  }
  function deleteCategory(c, withTasks) {
    const inCat = tasks.filter((t) => t.categoryId === c.id);
    cats = cats.filter((x) => x.id !== c.id);
    if (withTasks) tasks = tasks.filter((t) => t.categoryId !== c.id);
    else tasks = tasks.map((t) => (t.categoryId === c.id ? Object.assign({}, t, { categoryId: null }) : t));
    render();
    if (inCat.length) {
      if (withTasks) enqueue({ kind: "deleteWhere", table: "tasks", field: "category_id", value: c.id });
      else enqueue({ kind: "updateWhere", table: "tasks", field: "category_id", value: c.id, patch: { category_id: null }, local: { categoryId: null } });
    }
    enqueue({ kind: "delete", table: "categories", ids: [c.id] });
  }
  function placeTask(id, due) {
    const t = tasks.find((x) => x.id === id);
    if (!t || (t.due || null) === (due || null)) return;
    const prev = t.due || null;
    updateTask(id, { due: due || null });
    toast((due ? "Moved to " + shortDay(due) : "Date removed") + ": " + clip(t.title, 32), () => updateTask(id, { due: prev }));
  }

  // ---------- render: shared ----------
  function renderNav() {
    const open = tasks.filter((t) => !t.done);
    const overdue = open.filter((t) => { const d = daysUntil(t.due); return d !== null && d < 0; }).length;
    const views = [
      { v: { type: "all" }, name: "All tasks", icon: ICONS.all, count: open.length },
      { v: { type: "today" }, name: "Today", icon: ICONS.today, count: open.filter((t) => inView(t, { type: "today" })).length, alert: overdue > 0 },
      { v: { type: "week" }, name: "Next 7 days", icon: ICONS.week, count: open.filter((t) => inView(t, { type: "week" })).length },
      { v: { type: "calendar" }, name: "Calendar", icon: ICONS.cal, count: 0 },
      { v: { type: "shopping" }, name: "Shopping", icon: ICONS.cart, count: shop.filter((i) => !i.done).length },
      { v: { type: "books" }, name: "Books", icon: ICONS.book, count: books.filter((b) => b.status === "to_read").length },
    ];
    const nv = $("nav-views"); nv.innerHTML = "";
    views.forEach((it) => nv.appendChild(navButton(it.v, it.name, it.icon, null, it.count, it.alert)));
    const nc = $("nav-cats"); nc.innerHTML = "";
    cats.forEach((c) => nc.appendChild(navButton({ type: "cat", id: c.id }, c.name, null, c.color, open.filter((t) => t.categoryId === c.id).length, false, true)));
    const orphan = open.filter((t) => !catById(t.categoryId)).length;
    if (orphan > 0) nc.appendChild(navButton({ type: "cat", id: "none" }, "No category", null, "#DEDAD2", orphan, false, true));
    $("cat-count").textContent = String(cats.length).padStart(2, "0") + (cats.length === 1 ? " LIST" : " LISTS");
    $("brand-date").textContent = new Date().toLocaleDateString("en-GB", { weekday: "short" }).toUpperCase() + " " + String(new Date().getDate()).padStart(2, "0") + "." + String(new Date().getMonth() + 1).padStart(2, "0");
  }
  function navButton(v, name, icon, color, count, alert, isCat) {
    const b = el("button", "nav-item" + (isCat ? " cat" : "")); b.type = "button";
    const active = view.type === v.type && (v.type !== "cat" || view.id === v.id);
    b.setAttribute("aria-current", active ? "true" : "false");
    if (icon) b.insertAdjacentHTML("beforeend", icon);
    if (color) { applyPair(b, color); b.appendChild(el("span", "dot")); }
    b.appendChild(el("span", "name", name));
    if (isCat) b.appendChild(el("span", "count" + (count ? "" : " zero"), String(count)));
    else if (count || v.type === "all" || v.type === "today" || v.type === "week" || v.type === "shopping" || v.type === "books") b.appendChild(el("span", "count" + (alert ? " alert" : "") + (count ? "" : " zero"), String(count)));
    b.addEventListener("click", () => { view = v; savePrefs(); render(); if (isPhone()) enterView(); });
    return b;
  }
  function renderCatSelect(sel, value) {
    sel.innerHTML = "";
    const none = el("option", null, "No category"); none.value = ""; sel.appendChild(none);
    cats.forEach((c) => { const o = el("option", null, c.name); o.value = c.id; sel.appendChild(o); });
    sel.value = value && catById(value) ? value : "";
  }
  function dateLabel(t) {
    const d = daysUntil(t.due);
    if (d === null) return { text: "NO DATE", cls: "" };
    const dt = parseYmd(t.due);
    const short = dt.toLocaleDateString("en-GB", { weekday: "short" }).toUpperCase() + " " + String(dt.getDate()).padStart(2, "0") + "." + String(dt.getMonth() + 1).padStart(2, "0");
    if (d < 0) return { text: "OVERDUE " + (-d) + "D · " + short, cls: "over" };
    if (d === 0) return { text: "TODAY", cls: "soon" };
    if (d === 1) return { text: "TOMORROW", cls: "soon" };
    return { text: short, cls: d <= 7 ? "soon" : "" };
  }
  function metaLine(t, opts) {
    const m = el("div", "meta");
    const dl = dateLabel(t);
    m.appendChild(el("span", "date " + dl.cls, dl.text));
    const c = catById(t.categoryId);
    if (c && !(opts && opts.hideCat)) { m.appendChild(el("span", "sep", "·")); m.appendChild(el("span", null, c.name.toUpperCase())); }
    if (t.repeat) { m.appendChild(el("span", "sep", "·")); m.appendChild(el("span", "rep", "↻ " + repeatLabel(t.repeat))); }
    if (t.notes && opts && opts.noteFlag) { m.appendChild(el("span", "sep", "·")); m.appendChild(el("span", null, "NOTES")); }
    return m;
  }
  function progressBar(t) {
    const pr = Number(t.progress) || 0;
    if (!pr || t.done) return null;
    const wrap = el("div", "progress");
    wrap.setAttribute("role", "progressbar");
    wrap.setAttribute("aria-valuemin", "0"); wrap.setAttribute("aria-valuemax", "100"); wrap.setAttribute("aria-valuenow", String(pr));
    wrap.setAttribute("aria-label", "Progress");
    const track = el("span", "progress-track");
    const fill = el("span", "progress-fill"); fill.style.width = pr + "%";
    track.appendChild(fill);
    wrap.appendChild(track);
    wrap.appendChild(el("span", "progress-pct", pr + "%"));
    return wrap;
  }
  function prioBars(p) {
    const s = el("span", "trio");
    s.setAttribute("role", "img"); s.setAttribute("aria-label", PRI[p] + " priority");
    s.title = PRI[p] + " priority";
    for (let i = 1; i <= 3; i++) s.appendChild(el("i", i <= p ? "on" : null));
    return s;
  }
  function dueShort(t) {
    const d = daysUntil(t.due);
    if (d !== null && d < 0) return "OVERDUE";
    if (d === 0) return "DUE TODAY";
    if (d === 1) return "DUE TOMORROW";
    if (d !== null && d <= 7) return "DUE IN " + d + " DAYS";
    if (Number(t.priority) === 3) return "HIGH PRIORITY";
    return "TOP OF YOUR LIST";
  }

  function taskRow(t) {
    const p = Number(t.priority) || 2;
    const li = el("li", "task" + (t.done ? " done" : ""));
    const c = catById(t.categoryId);
    applyPair(li, c ? c.color : NO_CAT.sq);
    if (!c) { li.style.setProperty("--c", NO_CAT.sq); li.style.setProperty("--c2", NO_CAT.ci); }
    const bar = el("span", "cbar"); bar.setAttribute("aria-hidden", "true"); bar.appendChild(el("span"));
    const body = el("button", "t-body"); body.type = "button";
    body.setAttribute("aria-label", "Edit " + t.title);
    body.appendChild(el("div", "t-title", t.title));
    body.appendChild(metaLine(t, { hideCat: view.type === "cat", noteFlag: true }));
    const pb = progressBar(t); if (pb) body.appendChild(pb);
    body.addEventListener("click", () => openTaskEditor(t));
    const pending = isPending(t);
    if (pending) li.classList.add("pending");
    const chk = el("button", "check"); chk.type = "button";
    chk.setAttribute("aria-label", pending ? "Clear " + t.title + " from the list" : t.done ? "Mark as not done" : "Mark done");
    chk.title = pending ? "Tap again to clear" : "";
    chk.innerHTML = ICONS.check;
    chk.addEventListener("click", () => onCheck(t));
    li.appendChild(bar); li.appendChild(body);
    if (pending) {
      const un = el("button", "untick", "Undo"); un.type = "button";
      un.setAttribute("aria-label", "Mark " + t.title + " as not done");
      un.addEventListener("click", () => reopenTask(t));
      li.appendChild(un);
    } else li.appendChild(prioBars(p));
    li.appendChild(chk);
    return li;
  }

  // ---------- render: list views ----------
  // "Do this next" uses the same block as every other task, marked with an outline and a label.
  function nextCard(top, big) {
    const ul = el("ul", "tasks next-list" + (big ? " big" : ""));
    const li = taskRow(top);
    li.classList.add("is-next");
    const body = li.querySelector(".t-body");
    const lab = el("div", "next-label");
    lab.appendChild(el("span", "next-tag", "DO THIS NEXT"));
    lab.appendChild(el("span", "next-why", dueShort(top)));
    body.insertBefore(lab, body.firstChild);
    ul.appendChild(li);
    return ul;
  }
  function renderHero(top, anyOpen) {
    const wrap = $("hero-wrap"); wrap.innerHTML = "";
    if (top) { wrap.appendChild(nextCard(top)); return; }
    wrap.appendChild(el("p", "next-empty", anyOpen ? "Nothing open here. Nice work." : "No open tasks yet. Tap + Add task to create one."));
  }
  function renderHomeNext() {
    const box = $("home-next"); box.innerHTML = "";
    if (!loaded) return;
    const top = sortTasks(tasks.filter(isShown), "urgency")[0];
    if (top) box.appendChild(nextCard(top, true));
  }

  function render() {
    if (!userId) return;
    if (view.type === "cat" && view.id !== "none" && !catById(view.id) && cats.length) view = { type: "all" };
    renderNav();
    renderHomeNext();

    const c = view.type === "cat" ? catById(view.id) : null;
    const isCal = view.type === "calendar";
    const isShop = view.type === "shopping";
    const isBooks = view.type === "books";
    $("view-title").textContent = isBooks ? "Books" : isShop ? "Shopping" : isCal ? "Calendar" : view.type === "today" ? "Today" : view.type === "week" ? "Next 7 days" : view.type === "cat" ? (c ? c.name : "No category") : "All tasks";
    $("btn-edit-cat").hidden = !c;
    $("list-mode").hidden = isCal || isShop || isBooks;
    $("books-mode").hidden = !isBooks;
    $("cal-mode").hidden = !isCal;
    $("shop-mode").hidden = !isShop;
    $("btn-add").hidden = isShop;
    $("btn-add").innerHTML = isBooks ? '<span aria-hidden="true">+</span> Add book' : '<span aria-hidden="true">+</span> Add task';
    $("main").classList.toggle("wide", isCal);

    if (!loaded) { $("list").innerHTML = '<li class="loading">Loading your tasks…</li>'; return; }
    if (isCal) { renderCalendar(); return; }
    if (isShop) { renderShopping(); return; }
    if (isBooks) { renderBooks(); return; }

    const scoped = tasks.filter((t) => inView(t, view));
    const open = scoped.filter((t) => !t.done);
    const pendingHere = scoped.filter(isPending);
    const done = scoped.filter((t) => t.done && !isPending(t)).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
    const overdue = open.filter((t) => { const d = daysUntil(t.due); return d !== null && d < 0; }).length;
    const dueToday = open.filter((t) => daysUntil(t.due) === 0).length;
    const parts = [open.length + (open.length === 1 ? " open task" : " open tasks")];
    if (overdue) parts.push(overdue + " overdue");
    if (dueToday) parts.push(dueToday + " due today");
    if (view.type === "today" && !open.length) parts.splice(0, 1, "Nothing due today");
    $("view-sub").textContent = parts.join(" · ");

    const shown = open.concat(pendingHere);
    const top = sortTasks(shown, "urgency")[0] || null;
    renderHero(top, tasks.some((t) => !t.done));
    const rest = sortTasks(shown.filter((t) => t !== top), sortBy);
    const labels = { urgency: "most urgent first", due: "soonest due first", priority: "highest priority first", newest: "newest first" };
    $("list-title").textContent = top ? "Then, " + labels[sortBy] : labels[sortBy].charAt(0).toUpperCase() + labels[sortBy].slice(1);
    document.querySelector("#list-mode .toolbar").hidden = !rest.length && !(showDone && done.length) && !done.length;

    const list = $("list"); list.innerHTML = "";
    rest.forEach((t) => list.appendChild(taskRow(t)));
    if (!rest.length && top) list.appendChild(el("li", "empty-note", "That's the only open task here."));
    if (showDone) done.forEach((t) => list.appendChild(taskRow(t)));
    $("btn-clear-done").hidden = !(showDone && (done.length || pendingHere.length));
    $("show-done").checked = showDone;
    $("sort").value = sortBy;
  }

  // ---------- shopping list ----------
  const G = window.NEXTUP_GROCERY || { aisles: [{ key: "other", name: "Other", sq: "#DEDAD2", ci: "#9C9990" }], phrases: {}, words: {} };
  const AISLES = G.aisles;
  const aisleBy = (k) => AISLES.find((a) => a.key === k) || AISLES[AISLES.length - 1];
  const normGrocery = (s) => String(s || "").toLowerCase().replace(/ł/g, "l").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  const QTY = /^(\d+([.,]\d+)?(x|g|kg|dag|ml|l|szt|pcs)?|x|kg|g|dag|ml|l|szt|pcs|opak|pack|op)$/;
  const EXACT = {}, PREFIX = [], PHRASES = [];
  Object.keys(G.phrases || {}).forEach((ph) => PHRASES.push([normGrocery(ph), G.phrases[ph]]));
  Object.keys(G.words || {}).forEach((aisle) => {
    G.words[aisle].split("|").forEach((w) => {
      const k = normGrocery(w);
      if (!k) return;
      if (k.indexOf(" ") !== -1) { PHRASES.push([k, aisle]); return; }
      if (!EXACT[k]) EXACT[k] = aisle;
      if (k.length >= 4) PREFIX.push([k, aisle]);
    });
  });
  PHRASES.sort((a, b) => b[0].length - a[0].length);
  function matchWord(w) {
    if (EXACT[w]) return EXACT[w];
    let best = null, len = 0;
    PREFIX.forEach(([k, a]) => { if (k.length > len && w.indexOf(k) === 0) { best = a; len = k.length; } });
    return best;
  }
  function classify(name) {
    const n = normGrocery(name);
    if (!n) return "other";
    const memMap = {};
    mem.forEach((m) => { memMap[m.word] = m.aisle; });
    const toks = n.split(" ").filter((w) => !QTY.test(w));
    const core = toks.join(" ");
    if (memMap[n]) return memMap[n];
    if (memMap[core]) return memMap[core];
    for (let i = 0; i < PHRASES.length; i++) if ((" " + core + " ").indexOf(" " + PHRASES[i][0] + " ") !== -1) return PHRASES[i][1];
    for (let i = toks.length - 1; i >= 0; i--) { const a = matchWord(toks[i]); if (a) return a; }
    return "other";
  }
  const pretty = (s) => { const t = s.trim().replace(/\s+/g, " "); return t.charAt(0).toUpperCase() + t.slice(1); };

  function addShopItems(text) {
    const names = String(text || "").split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean);
    if (!names.length) return;
    const openNames = new Set(shop.filter((i) => !i.done).map((i) => normGrocery(i.name)));
    const added = [], skipped = [], fresh = [];
    const now = Date.now();
    names.forEach((nm, k) => {
      const key = normGrocery(nm);
      if (!key || openNames.has(key)) { skipped.push(nm); return; }
      openNames.add(key);
      const basketItem = shop.find((i) => i.done && normGrocery(i.name) === key);
      if (basketItem) { updateShop(basketItem.id, { done: false, doneAt: null }); added.push(basketItem); return; }
      const item = { id: uid("s"), name: pretty(nm), aisle: classify(nm), done: false, doneAt: null, createdAt: now + k };
      fresh.push(item); added.push(item);
    });
    if (fresh.length) { shop = shop.concat(fresh); render(); enqueue({ kind: "upsert", table: "shopping_items", rows: fresh.map(shopToRow) }); }
    if (added.length === 1) toast(added[0].name + " → " + aisleBy(added[0].aisle).name);
    else if (added.length > 1) toast("Added " + added.length + " items");
    else if (skipped.length) toast("Already on your list");
  }
  function updateShop(id, patch) {
    shop = shop.map((x) => (x.id === id ? Object.assign({}, x, patch) : x)); render();
    const row = {};
    if ("name" in patch) row.name = patch.name;
    if ("aisle" in patch) row.aisle = patch.aisle;
    if ("done" in patch) row.done = patch.done;
    if ("doneAt" in patch) row.done_at = toIso(patch.doneAt);
    enqueue({ kind: "update", table: "shopping_items", id, patch: row, local: patch });
  }
  function deleteShop(list) {
    const ids = list.map((i) => i.id);
    shop = shop.filter((x) => ids.indexOf(x.id) === -1); render();
    enqueue({ kind: "delete", table: "shopping_items", ids });
  }
  function restoreShop(list) {
    const ids = new Set(list.map((i) => i.id));
    shop = shop.filter((x) => !ids.has(x.id)).concat(list); render();
    enqueue({ kind: "upsert", table: "shopping_items", rows: list.map(shopToRow) });
  }
  function rememberAisle(name, aisle) {
    const word = normGrocery(name).split(" ").filter((w) => !QTY.test(w)).join(" ");
    if (!word) return;
    const row = { id: userId + ":" + word.slice(0, 180), user_id: userId, word, aisle, updated_at: new Date().toISOString() };
    const i = mem.findIndex((m) => m.id === row.id);
    const obj = memFromRow(row);
    mem = i === -1 ? mem.concat([obj]) : mem.map((m, j) => (j === i ? obj : m));
    enqueue({ kind: "upsert", table: "shopping_memory", rows: [row] });
  }
  function toggleShop(item) {
    const done = !item.done;
    updateShop(item.id, { done, doneAt: done ? Date.now() : null });
  }

  function aisleIcon(a) {
    const s = el("span", "aisle-icon"); s.setAttribute("aria-hidden", "true");
    s.style.setProperty("--c", a.sq); s.style.setProperty("--c2", a.ci);
    return s;
  }
  function shopRow(item) {
    const li = el("li", "shop-item" + (item.done ? " done" : ""));
    const chk = el("button", "check"); chk.type = "button";
    chk.setAttribute("aria-label", item.done ? "Take " + item.name + " out of the basket" : "Put " + item.name + " in the basket");
    chk.innerHTML = ICONS.check;
    chk.addEventListener("click", () => toggleShop(item));
    const nm = el("button", "shop-name", item.name); nm.type = "button";
    nm.setAttribute("aria-label", "Edit " + item.name);
    nm.addEventListener("click", () => openShopEditor(item));
    li.appendChild(chk); li.appendChild(nm);
    return li;
  }
  function renderShopping() {
    const open = shop.filter((i) => !i.done);
    const basket = shop.filter((i) => i.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
    $("view-sub").textContent = open.length + " to buy · " + basket.length + " in basket";
    const groups = $("shop-groups"); groups.innerHTML = "";
    if (!open.length) groups.appendChild(el("p", "next-empty", basket.length ? "Everything's in the basket." : "Your list is empty. Type what you need above."));
    AISLES.forEach((a) => {
      const items = open.filter((i) => (aisleBy(i.aisle).key) === a.key).sort((x, y) => (x.createdAt || 0) - (y.createdAt || 0));
      if (!items.length) return;
      const sec = el("section", "aisle-group");
      const h = el("div", "aisle-head");
      h.appendChild(aisleIcon(a));
      h.appendChild(el("h3", null, a.name));
      h.appendChild(el("span", "aisle-count", String(items.length)));
      sec.appendChild(h);
      const ul = el("ul", "shop-list");
      items.forEach((i) => ul.appendChild(shopRow(i)));
      sec.appendChild(ul);
      groups.appendChild(sec);
    });
    const bk = $("shop-basket"); bk.innerHTML = "";
    if (basket.length) {
      const h = el("div", "basket-head");
      h.appendChild(el("span", null, "IN BASKET · " + basket.length));
      const clr = el("button", "link", "Clear basket"); clr.type = "button";
      clr.addEventListener("click", () => {
        const copies = basket.map((i) => Object.assign({}, i));
        deleteShop(basket);
        toast("Cleared " + copies.length + (copies.length === 1 ? " item" : " items"), () => restoreShop(copies));
      });
      h.appendChild(clr);
      bk.appendChild(h);
      const ul = el("ul", "shop-list basket");
      basket.forEach((i) => ul.appendChild(shopRow(i)));
      bk.appendChild(ul);
    }
  }
  $("shop-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!userId) return;
    addShopItems($("shop-input").value);
    $("shop-input").value = "";
    $("shop-input").focus();
  });

  let editingShop = null;
  function openShopEditor(item) {
    editingShop = item;
    $("si-heading").textContent = item.name;
    $("si-name").value = item.name;
    const box = $("si-aisles"); box.innerHTML = "";
    AISLES.forEach((a, i) => {
      const inp = document.createElement("input"); inp.type = "radio"; inp.name = "si-aisle"; inp.id = "si-aisle-" + i; inp.value = a.key;
      if (aisleBy(item.aisle).key === a.key) inp.checked = true;
      const lab = document.createElement("label"); lab.htmlFor = inp.id;
      lab.appendChild(aisleIcon(a)); lab.appendChild(el("span", null, a.name));
      box.appendChild(inp); box.appendChild(lab);
    });
    openOverlay("shop-overlay", "si-name");
  }
  $("shop-item-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!editingShop) return;
    const name = $("si-name").value.trim();
    if (!name) { $("si-name").focus(); return; }
    const aisle = (document.querySelector('input[name="si-aisle"]:checked') || {}).value || editingShop.aisle;
    const patch = {};
    if (name !== editingShop.name) patch.name = name;
    if (aisle !== editingShop.aisle) patch.aisle = aisle;
    if (Object.keys(patch).length) updateShop(editingShop.id, patch);
    if (aisle !== editingShop.aisle) { rememberAisle(name, aisle); toast("Moved to " + aisleBy(aisle).name + ". I'll remember that."); }
    closeOverlay("shop-overlay"); editingShop = null;
  });
  $("si-cancel").addEventListener("click", () => { closeOverlay("shop-overlay"); editingShop = null; });
  $("si-delete").addEventListener("click", () => {
    if (!editingShop) return;
    const copy = Object.assign({}, editingShop);
    closeOverlay("shop-overlay"); editingShop = null;
    deleteShop([copy]);
    toast("Removed: " + clip(copy.name, 30), () => restoreShop([copy]));
  });

  // ---------- books ----------
  const SHELF_NAME = { to_read: "To read", reading: "Reading", read: "Read" };
  function coverNode(b, size) {
    const box = el("div", "cover" + (size ? " " + size : ""));
    const fallback = () => {
      box.innerHTML = "";
      box.classList.add("gen");
      const pair = PAIRS[Math.abs(hashStr(b.title + b.author)) % PAIRS.length];
      box.style.setProperty("--c", pair.sq); box.style.setProperty("--c2", pair.ci); box.style.setProperty("--ct", inkOn(pair.sq));
      box.appendChild(el("span", "gen-dot"));
      box.appendChild(el("span", "gen-title", b.title));
      if (b.author) box.appendChild(el("span", "gen-author", b.author.toUpperCase()));
    };
    if (b.coverUrl) {
      const img = document.createElement("img");
      img.alt = ""; img.loading = "lazy"; img.decoding = "async"; img.referrerPolicy = "no-referrer";
      img.src = b.coverUrl;
      img.addEventListener("error", fallback);
      img.addEventListener("load", () => { if (img.naturalWidth < 20) fallback(); });
      box.appendChild(img);
    } else fallback();
    return box;
  }
  function hashStr(str) { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return h; }

  function renderBooks() {
    const counts = { to_read: 0, reading: 0, read: 0 };
    books.forEach((b) => { counts[b.status] = (counts[b.status] || 0) + 1; });
    $("view-sub").textContent = counts.to_read + " to read · " + counts.reading + " reading · " + counts.read + " read";
    document.querySelectorAll(".shelf-tabs button").forEach((bt) => {
      const on = bt.dataset.shelf === shelf;
      bt.setAttribute("aria-selected", on ? "true" : "false");
      bt.querySelector("span").textContent = counts[bt.dataset.shelf] || "";
    });
    const grid = $("cover-grid"); grid.innerHTML = "";
    const list = books.filter((b) => b.status === shelf)
      .sort((a, b) => shelf === "read" ? (b.finishedAt || b.createdAt) - (a.finishedAt || a.createdAt) : (a.createdAt || 0) - (b.createdAt || 0));
    list.forEach((b) => {
      const btn = el("button", "cover-btn"); btn.type = "button";
      btn.setAttribute("aria-label", b.title + (b.author ? " by " + b.author : ""));
      btn.title = b.title + (b.author ? " – " + b.author : "");
      btn.appendChild(coverNode(b));
      if (b.notes) {
        const nb = el("span", "note-badge"); nb.setAttribute("aria-hidden", "true");
        nb.innerHTML = '<svg viewBox="0 0 16 16" fill="none"><path d="M3 2.5h10v8l-3 3H3z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M5.5 6h5M5.5 8.5h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
        btn.appendChild(nb);
        btn.setAttribute("aria-label", btn.getAttribute("aria-label") + ", has a note");
      }
      btn.addEventListener("click", () => openBook(b));
      grid.appendChild(btn);
    });
    const add = el("button", "cover-btn add-book"); add.type = "button";
    add.innerHTML = '<span class="add-plus" aria-hidden="true">+</span><span>Add book</span>';
    add.addEventListener("click", openBookAdd);
    grid.appendChild(add);
    if (!list.length && shelf !== "to_read") {
      const p = el("p", "next-empty shelf-empty", shelf === "reading" ? "Nothing on the go. Open a book and move it to Reading." : "Books you finish will collect here.");
      grid.insertBefore(p, grid.firstChild);
    }
  }
  document.querySelectorAll(".shelf-tabs button").forEach((bt) => bt.addEventListener("click", () => { shelf = bt.dataset.shelf; savePrefs(); renderBooks(); }));

  function addBook(data) {
    const b = Object.assign({ id: uid("b"), title: "", author: "", coverUrl: null, status: shelf === "read" ? "read" : shelf, sourceKey: null, createdAt: Date.now(), finishedAt: null }, data);
    if (b.status === "read" && !b.finishedAt) b.finishedAt = Date.now();
    books = books.concat([b]); render();
    enqueue({ kind: "upsert", table: "books", rows: [bookToRow(b)] });
    toast("Added to " + SHELF_NAME[b.status] + ": " + clip(b.title, 30));
  }
  function updateBook(id, patch) {
    books = books.map((x) => (x.id === id ? Object.assign({}, x, patch) : x)); render();
    const row = {};
    if ("status" in patch) row.status = patch.status;
    if ("finishedAt" in patch) row.finished_at = toIso(patch.finishedAt);
    if ("notes" in patch) row.notes = patch.notes;
    enqueue({ kind: "update", table: "books", id, patch: row, local: patch });
  }
  function deleteBook(b) {
    const copy = Object.assign({}, b);
    books = books.filter((x) => x.id !== b.id); render();
    enqueue({ kind: "delete", table: "books", ids: [b.id] });
    toast("Removed: " + clip(b.title, 30), () => { books = books.concat([copy]); render(); enqueue({ kind: "upsert", table: "books", rows: [bookToRow(copy)] }); });
  }

  // Add-book search: Open Library first, Google Books as backup. Needs a connection.
  let lastQuery = "";
  function openBookAdd() {
    $("ba-query").value = ""; $("ba-results").innerHTML = ""; $("ba-manual").hidden = true;
    $("ba-status").textContent = isOffline() ? "You're offline. Searching for covers needs internet, but you can add the book without a cover." : "Search, then tap the right edition to add it with its cover.";
    openOverlay("book-add-overlay", "ba-query");
  }
  async function searchOpenLibrary(q) {
    const url = "https://openlibrary.org/search.json?q=" + encodeURIComponent(q) + "&limit=12&fields=key,title,author_name,cover_i,first_publish_year";
    const res = await fetch(url);
    if (!res.ok) throw new Error("openlibrary " + res.status);
    const data = await res.json();
    return (data.docs || []).map((d) => ({
      title: d.title || "", author: (d.author_name || []).slice(0, 2).join(", "), year: d.first_publish_year || "",
      coverUrl: d.cover_i ? "https://covers.openlibrary.org/b/id/" + d.cover_i + "-L.jpg" : null,
      thumb: d.cover_i ? "https://covers.openlibrary.org/b/id/" + d.cover_i + "-M.jpg" : null,
      sourceKey: "ol:" + (d.key || ""),
    }));
  }
  async function searchGoogle(q) {
    const res = await fetch("https://www.googleapis.com/books/v1/volumes?q=" + encodeURIComponent(q) + "&maxResults=12&printType=books");
    if (!res.ok) throw new Error("google " + res.status);
    const data = await res.json();
    return (data.items || []).map((it) => {
      const v = it.volumeInfo || {};
      const img = v.imageLinks && (v.imageLinks.thumbnail || v.imageLinks.smallThumbnail);
      const https = img ? img.replace(/^http:/, "https:").replace("&edge=curl", "") : null;
      return { title: v.title || "", author: (v.authors || []).slice(0, 2).join(", "), year: (v.publishedDate || "").slice(0, 4),
        coverUrl: https, thumb: https, sourceKey: "gb:" + (it.id || "") };
    });
  }
  async function runBookSearch(q) {
    lastQuery = q;
    const list = $("ba-results"); list.innerHTML = "";
    $("ba-status").textContent = "Searching…";
    $("ba-manual").hidden = false; $("ba-manual").textContent = "Add “" + clip(q, 28) + "” without a cover";
    let results = [];
    try { results = (await searchOpenLibrary(q)).filter((r) => r.title); } catch (e) { console.warn(e); }
    if (results.filter((r) => r.coverUrl).length < 3) {
      try { results = results.concat((await searchGoogle(q)).filter((r) => r.title)); } catch (e) { console.warn(e); }
    }
    if (lastQuery !== q) return;
    results.sort((a, b) => (b.coverUrl ? 1 : 0) - (a.coverUrl ? 1 : 0));
    const seen = new Set();
    results = results.filter((r) => { const k = (r.title + "|" + r.author).toLowerCase() + "|" + (r.coverUrl ? "c" : ""); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 12);
    if (!results.length) {
      $("ba-status").textContent = isOffline() ? "You're offline. Add it without a cover, or search again when you're back online." : "No matches. Try the author's name too, or add it without a cover.";
      return;
    }
    $("ba-status").textContent = "Tap the right edition to add it to " + SHELF_NAME[shelf] + ".";
    results.forEach((r) => {
      const li = el("li");
      const b = el("button", "book-result"); b.type = "button";
      b.appendChild(coverNode({ title: r.title, author: r.author, coverUrl: r.thumb }, "small"));
      const txt = el("span", "br-text");
      txt.appendChild(el("span", "br-title", r.title));
      txt.appendChild(el("span", "br-meta", [r.author, r.year].filter(Boolean).join(" · ") || "Unknown author"));
      b.appendChild(txt);
      b.addEventListener("click", () => {
        closeOverlay("book-add-overlay");
        addBook({ title: r.title, author: r.author, coverUrl: r.coverUrl, sourceKey: r.sourceKey });
      });
      li.appendChild(b); list.appendChild(li);
    });
  }
  $("ba-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const q = $("ba-query").value.trim();
    if (!q) { $("ba-query").focus(); return; }
    runBookSearch(q);
  });
  $("ba-manual").addEventListener("click", () => {
    const q = ($("ba-query").value || lastQuery).trim();
    if (!q) { $("ba-query").focus(); return; }
    closeOverlay("book-add-overlay");
    addBook({ title: pretty(q), author: "" });
  });
  $("ba-query").addEventListener("input", () => {
    const q = $("ba-query").value.trim();
    $("ba-manual").hidden = !q;
    if (q) $("ba-manual").textContent = "Add “" + clip(q, 28) + "” without a cover";
  });
  $("ba-close").addEventListener("click", () => closeOverlay("book-add-overlay"));

  let openBookItem = null;
  function openBook(b) {
    openBookItem = b;
    const cv = $("bk-cover"); cv.innerHTML = ""; cv.appendChild(coverNode(b, "large"));
    $("bk-title").textContent = b.title;
    $("bk-author").textContent = b.author || "Unknown author";
    const added = new Date(b.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    $("bk-dates").textContent = "Added " + added + (b.finishedAt ? " · Finished " + new Date(b.finishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");
    $("bk-shelf-" + b.status).checked = true;
    $("bk-notes").value = b.notes || "";
    $("bk-notes-status").textContent = "Saved automatically.";
    openOverlay("book-overlay", b.notes ? "bk-close" : "bk-notes");
  }
  document.querySelectorAll('input[name="bk-shelf"]').forEach((inp) => inp.addEventListener("change", () => {
    if (!openBookItem || !inp.checked) return;
    saveBookNote();
    const status = inp.value;
    const patch = { status, finishedAt: status === "read" ? (openBookItem.finishedAt || Date.now()) : null };
    updateBook(openBookItem.id, patch);
    openBookItem = Object.assign({}, openBookItem, patch);
    toast("Moved to " + SHELF_NAME[status]);
  }));
  let noteTimer = null;
  function saveBookNote() {
    clearTimeout(noteTimer);
    if (!openBookItem) return;
    const notes = $("bk-notes").value.trim();
    if (notes === (openBookItem.notes || "")) return;
    updateBook(openBookItem.id, { notes });
    openBookItem = Object.assign({}, openBookItem, { notes });
    $("bk-notes-status").textContent = "Saved.";
  }
  $("bk-notes").addEventListener("input", () => {
    $("bk-notes-status").textContent = "Saving…";
    clearTimeout(noteTimer);
    noteTimer = setTimeout(saveBookNote, 900);
  });
  $("bk-notes").addEventListener("blur", saveBookNote);
  $("bk-close").addEventListener("click", () => { saveBookNote(); closeOverlay("book-overlay"); openBookItem = null; });
  $("bk-delete").addEventListener("click", () => {
    if (!openBookItem) return;
    const b = openBookItem;
    clearTimeout(noteTimer);
    openBookItem = null;
    closeOverlay("book-overlay");
    deleteBook(b);
  });

  // ---------- phone: home tiles and drill-in ----------
  const isPhone = () => window.matchMedia("(max-width: 820px)").matches;
  function enterView() {
    if (!document.body.classList.contains("in-view")) {
      document.body.classList.add("in-view");
      try { history.pushState({ nextupView: 1 }, ""); } catch (e) {}
    }
    window.scrollTo(0, 0);
  }
  function leaveView() {
    document.body.classList.remove("in-view");
    render();
    window.scrollTo(0, 0);
  }
  $("btn-back").addEventListener("click", () => {
    if (history.state && history.state.nextupView) history.back(); else leaveView();
  });
  window.addEventListener("popstate", () => { if (document.body.classList.contains("in-view")) leaveView(); });

  // ---------- calendar ----------
  let calMonth = (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); })();
  let selDay = dateStr(0);
  let dragId = null;
  let lastGhosts = new Map();
  const calMatches = (t) => !calCat || (calCat === "none" ? !catById(t.categoryId) : t.categoryId === calCat);
  const byDoneThenUrgency = (arr) => sortTasks(arr.filter(isShown), "urgency").concat(arr.filter((t) => !isShown(t)));

  function makeDraggable(node, id) {
    node.draggable = true;
    node.addEventListener("dragstart", (e) => {
      dragId = id;
      try { e.dataTransfer.setData("text/plain", id); e.dataTransfer.effectAllowed = "move"; } catch (err) {}
      node.classList.add("dragging");
      e.stopPropagation();
    });
    node.addEventListener("dragend", () => { node.classList.remove("dragging"); dragId = null; document.querySelectorAll(".drop").forEach((x) => x.classList.remove("drop")); });
  }
  function makeDropTarget(node, onDrop) {
    node.addEventListener("dragover", (e) => { if (!dragId) return; e.preventDefault(); node.classList.add("drop"); });
    node.addEventListener("dragleave", (e) => { if (!node.contains(e.relatedTarget)) node.classList.remove("drop"); });
    node.addEventListener("drop", (e) => {
      e.preventDefault(); node.classList.remove("drop");
      let id = dragId;
      try { id = e.dataTransfer.getData("text/plain") || id; } catch (err) {}
      dragId = null;
      if (id) onDrop(id);
    });
  }

  function renderCalSelects() {
    const fsel = $("cal-cat"); fsel.innerHTML = "";
    const all = el("option", null, "All categories"); all.value = ""; fsel.appendChild(all);
    cats.forEach((c) => { const o = el("option", null, c.name); o.value = c.id; fsel.appendChild(o); });
    if (tasks.some((t) => !catById(t.categoryId))) { const o = el("option", null, "No category"); o.value = "none"; fsel.appendChild(o); }
    if (calCat && calCat !== "none" && !catById(calCat)) calCat = "";
    fsel.value = calCat;
    $("cal-show-done").checked = showDone;
  }

  function renderCalendar() {
    renderCalSelects();
    const y = calMonth.getFullYear(), m = calMonth.getMonth();
    $("cal-month").textContent = calMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

    const visible = tasks.filter((t) => calMatches(t) && (showDone || isShown(t)));
    const byDay = new Map();
    visible.forEach((t) => { if (t.due && daysUntil(t.due) !== null) { if (!byDay.has(t.due)) byDay.set(t.due, []); byDay.get(t.due).push(t); } });

    const offset = (new Date(y, m, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const weeks = Math.ceil((offset + daysInMonth) / 7);
    const today = dateStr(0);
    const narrow = window.matchMedia("(max-width: 600px)").matches;
    const maxPills = narrow ? 4 : 3;

    const gridStart = ymd(new Date(y, m, 1 - offset)), gridEnd = ymd(new Date(y, m, weeks * 7 - offset));
    const ghosts = new Map();
    visible.forEach((t) => occurrences(t, gridStart, gridEnd).forEach((ds) => { if (!ghosts.has(ds)) ghosts.set(ds, []); ghosts.get(ds).push(t); }));
    lastGhosts = ghosts;
    const grid = $("cal-grid"); grid.innerHTML = "";
    let monthCount = 0;
    for (let i = 0; i < weeks * 7; i++) {
      const d = new Date(y, m, 1 - offset + i);
      const ds = ymd(d);
      const list = byDoneThenUrgency(byDay.get(ds) || []);
      if (d.getMonth() === m) monthCount += list.filter((t) => !t.done).length;
      const cell = el("div", "cell" + (d.getMonth() !== m ? " other" : "") + (ds === today ? " today" : "") + (ds === selDay ? " sel" : "") + (i % 7 >= 5 ? " weekend" : ""));
      const num = el("button", "dnum", String(d.getDate())); num.type = "button";
      num.setAttribute("aria-label", parseYmd(ds).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) + ", " + list.length + (list.length === 1 ? " task" : " tasks"));
      num.setAttribute("aria-pressed", ds === selDay ? "true" : "false");
      cell.appendChild(num);
      list.slice(0, maxPills).forEach((t) => {
        const p = Number(t.priority) || 2;
        const c = catById(t.categoryId);
        const over = !t.done && daysUntil(t.due) < 0;
        const pill = el("button", "pill p" + p + (t.done ? " done" : "") + (over ? " over" : ""));
        pill.type = "button"; pill.title = t.title;
        applyPair(pill, c ? c.color : NO_CAT.sq);
        pill.appendChild(el("span", "dot"));
        pill.appendChild(el("span", "ptext", t.title));
        pill.addEventListener("click", (e) => { e.stopPropagation(); if (narrow) selectDay(ds); else openTaskEditor(t); });
        makeDraggable(pill, t.id);
        cell.appendChild(pill);
      });
      const gl = ghosts.get(ds) || [];
      const room = Math.max(0, maxPills - Math.min(list.length, maxPills));
      gl.slice(0, room).forEach((t) => {
        const c = catById(t.categoryId);
        const g = el("button", "pill ghost"); g.type = "button"; g.title = t.title + " (repeats)";
        applyPair(g, c ? c.color : NO_CAT.sq);
        g.appendChild(el("span", "ptext", "↻ " + t.title));
        g.addEventListener("click", (e) => { e.stopPropagation(); if (narrow) selectDay(ds); else openTaskEditor(t); });
        cell.appendChild(g);
      });
      const hidden = list.length + gl.length - Math.min(list.length, maxPills) - Math.min(gl.length, room);
      if (hidden > 0) cell.appendChild(el("span", "more-n", "+" + hidden + (narrow ? "" : " more")));
      cell.addEventListener("click", () => selectDay(ds));
      makeDropTarget(cell, (id) => placeTask(id, ds));
      grid.appendChild(cell);
    }

    const unscheduled = tasks.filter((t) => !t.done && !t.due && calMatches(t));
    $("view-sub").textContent = monthCount + (monthCount === 1 ? " open task" : " open tasks") + " in " + calMonth.toLocaleDateString("en-GB", { month: "long" }) + " · " + unscheduled.length + " with no date";
    renderDayPanel(byDay, unscheduled);
  }

  function selectDay(ds) {
    selDay = ds;
    const d = parseYmd(ds);
    if (d.getMonth() !== calMonth.getMonth() || d.getFullYear() !== calMonth.getFullYear()) calMonth = new Date(d.getFullYear(), d.getMonth(), 1);
    renderCalendar();
    if (window.matchMedia("(max-width: 1100px)").matches) $("day-panel").scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function renderDayPanel(byDay, unscheduled) {
    const ds = selDay;
    const dd = daysUntil(ds);
    $("dp-heading").textContent = parseYmd(ds).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
    $("dp-sub").textContent = dd === 0 ? "Today" : dd === 1 ? "Tomorrow" : dd === -1 ? "Yesterday" : dd < 0 ? (-dd) + " days ago" : "In " + dd + " days";

    const dayList = byDoneThenUrgency(byDay.get(ds) || []);
    $("dp-count").textContent = dayList.length ? String(dayList.length) : "";
    const ul = $("dp-list"); ul.innerHTML = "";
    const dayGhosts = lastGhosts.get(ds) || [];
    if (!dayList.length && !dayGhosts.length) ul.appendChild(el("li", "hint", "Nothing planned for this day yet."));
    dayList.forEach((t) => { const row = taskRow(t); makeDraggable(row, t.id); ul.appendChild(row); });
    dayGhosts.forEach((t) => {
      const li = el("li", "ghost-row");
      const b = el("button", null); b.type = "button";
      b.appendChild(el("span", "t", "↻ " + t.title));
      b.appendChild(el("span", "when", "REPEATS " + repeatLabel(t.repeat)));
      b.addEventListener("click", () => openTaskEditor(t));
      li.appendChild(b); ul.appendChild(li);
    });

    const us = $("us-list"); us.innerHTML = "";
    const sorted = sortTasks(unscheduled, "urgency");
    $("us-count").textContent = sorted.length ? String(sorted.length) : "";
    if (!sorted.length) us.appendChild(el("li", "hint", "Every open task has a date."));
    const btnLabel = dd === 0 ? "Today" : dd === 1 ? "Tomorrow" : "Add to " + parseYmd(ds).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    sorted.forEach((t) => {
      const p = Number(t.priority) || 2;
      const li = el("li", "mini");
      const c = catById(t.categoryId);
      applyPair(li, c ? c.color : NO_CAT.sq);
      li.appendChild(el("span", "dot"));
      const tb = el("button", "t", t.title); tb.type = "button"; tb.setAttribute("aria-label", "Edit " + t.title);
      tb.addEventListener("click", () => openTaskEditor(t));
      const place = el("button", "place", btnLabel); place.type = "button";
      place.setAttribute("aria-label", "Put " + t.title + " on " + shortDay(ds));
      place.addEventListener("click", () => placeTask(t.id, ds));
      li.appendChild(tb); li.appendChild(place);
      makeDraggable(li, t.id);
      us.appendChild(li);
    });
  }

  makeDropTarget($("us-list"), (id) => placeTask(id, null));
  $("cal-prev").addEventListener("click", () => { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1); renderCalendar(); });
  $("cal-next").addEventListener("click", () => { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1); renderCalendar(); });
  $("cal-today").addEventListener("click", () => selectDay(dateStr(0)));
  $("cal-cat").addEventListener("change", (e) => { calCat = e.target.value; savePrefs(); renderCalendar(); });
  $("cal-show-done").addEventListener("change", (e) => { showDone = e.target.checked; savePrefs(); renderCalendar(); });

  // ---------- list controls ----------
  $("sort").addEventListener("change", (e) => { sortBy = e.target.value; savePrefs(); render(); });
  $("show-done").addEventListener("change", (e) => { showDone = e.target.checked; savePrefs(); render(); });
  $("btn-clear-done").addEventListener("click", () => {
    const done = tasks.filter((t) => t.done && inView(t, view));
    if (!done.length) return;
    const copies = done.map((t) => Object.assign({}, t));
    deleteTasks(done);
    toast("Cleared " + done.length + " done " + (done.length === 1 ? "task" : "tasks"), () => restoreTasks(copies));
  });

  // ---------- overlays ----------
  let lastFocus = null;
  function openOverlay(id, focusId) {
    lastFocus = document.activeElement;
    $(id).classList.add("open");
    setTimeout(() => { const f = $(focusId); if (f) f.focus(); }, 30);
  }
  function closeOverlay(id) {
    if (id === "book-overlay" && typeof saveBookNote === "function") saveBookNote();
    $(id).classList.remove("open");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  document.querySelectorAll(".overlay").forEach((o) => {
    o.addEventListener("click", (e) => { if (e.target === o && o.id !== "pw-overlay") closeOverlay(o.id); });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") document.querySelectorAll(".overlay.open").forEach((o) => { if (o.id !== "pw-overlay") closeOverlay(o.id); });
    if (e.key === "n" && userId && !e.metaKey && !e.ctrlKey && !e.altKey && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !document.querySelector(".overlay.open")) {
      e.preventDefault(); openNewTask();
    }
  });

  // Task editor
  let editing = null;
  let creating = false;
  function openTaskEditor(t, isNew) {
    editing = t; creating = !!isNew;
    $("te-heading").textContent = creating ? "New task" : "Edit task";
    $("te-save").textContent = creating ? "Add task" : "Save";
    $("te-delete").hidden = creating;
    $("te-title").value = t.title || "";
    renderCatSelect($("te-cat"), t.categoryId);
    $("te-pri-" + (Number(t.priority) || 2)).checked = true;
    $("te-due").value = t.due || "";
    $("te-notes").value = t.notes || "";
    setProgressUi(Number(t.progress) || 0);
    const r = parseRepeat(t.repeat);
    $("te-repeat-n").value = String(r ? Math.min(r.n, 12) : 1);
    $("te-repeat-unit").value = r ? r.unit : "";
    setDayPicks(r && r.unit === "week" ? (r.days || (t.due ? [parseYmd(t.due).getDay()] : [])) : []);
    syncRepeatUi();
    openOverlay("task-overlay", "te-title");
    fitNotes();
  }
  // Notes start as a single line and grow with what's typed in them.
  function fitNotes() {
    const ta = $("te-notes");
    ta.style.height = "";
    if (!ta.offsetParent) return;
    const cap = Math.round(window.innerHeight * 0.4);
    const h = Math.min(ta.scrollHeight + 2, cap);
    if (h > ta.offsetHeight) ta.style.height = h + "px";
    ta.style.overflowY = ta.scrollHeight + 2 > cap ? "auto" : "hidden";
  }
  $("te-notes").addEventListener("input", fitNotes);
  function openNewTask() {
    if (!userId) return;
    const onHome = isPhone() && !document.body.classList.contains("in-view");
    if (view.type === "shopping" && !onHome) { $("shop-input").focus(); return; }
    if (view.type === "books" && !onHome) { openBookAdd(); return; }
    let categoryId = null, due = null;
    if (!onHome) {
      if (view.type === "cat" && view.id !== "none") categoryId = view.id;
      if (view.type === "calendar") { due = selDay; if (calCat && calCat !== "none") categoryId = calCat; }
      if (view.type === "today") due = dateStr(0);
    }
    openTaskEditor({ title: "", notes: "", categoryId, priority: 2, due }, true);
  }
  $("btn-add").addEventListener("click", openNewTask);
  $("fab-add").addEventListener("click", openNewTask);
  function setDayPicks(days) {
    document.querySelectorAll("#te-days input").forEach((inp) => { inp.checked = days.indexOf(Number(inp.value)) !== -1; });
  }
  function pickedDays() { return Array.from(document.querySelectorAll("#te-days input:checked")).map((i) => Number(i.value)); }
  function readRepeat() {
    const unit = $("te-repeat-unit").value;
    return buildRepeat(Number($("te-repeat-n").value) || 1, unit, unit === "week" ? pickedDays() : null);
  }
  function syncRepeatUi() {
    const unit = $("te-repeat-unit").value;
    const n = Number($("te-repeat-n").value) || 1;
    $("te-every-word").hidden = !unit;
    $("te-repeat-n").hidden = !unit;
    $("te-days").hidden = unit !== "week";
    Array.from($("te-repeat-unit").options).forEach((o) => { if (o.value) o.textContent = n === 1 ? o.value : o.value + "s"; });
    const r = parseRepeat(readRepeat());
    $("te-repeat-hint").hidden = !r;
    $("te-repeat-hint").textContent = repeatSentence(r);
  }
  $("te-repeat-unit").addEventListener("change", () => {
    const unit = $("te-repeat-unit").value;
    if (unit && !$("te-due").value) $("te-due").value = dateStr(0);
    if (unit === "week" && !pickedDays().length) setDayPicks([parseYmd($("te-due").value || dateStr(0)).getDay()]);
    syncRepeatUi();
  });
  $("te-repeat-n").addEventListener("change", syncRepeatUi);
  document.querySelectorAll("#te-days input").forEach((inp) => inp.addEventListener("change", syncRepeatUi));
  function setProgressUi(v) {
    $("te-progress").value = String(v);
    $("te-progress-out").textContent = v + "%";
    $("te-progress").style.setProperty("--pct", v + "%");
  }
  $("te-progress").addEventListener("input", () => setProgressUi(Number($("te-progress").value) || 0));
  document.querySelectorAll(".quick-dates button").forEach((b) => b.addEventListener("click", () => {
    $("te-due").value = b.dataset.off === "clear" ? "" : dateStr(Number(b.dataset.off));
  }));
  $("task-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!editing) return;
    const title = $("te-title").value.trim();
    if (!title) { $("te-title").focus(); return; }
    const patch = {
      title,
      categoryId: $("te-cat").value || null,
      priority: Number((document.querySelector('input[name="te-pri"]:checked') || {}).value || 2),
      due: $("te-due").value || null,
      notes: $("te-notes").value.trim(),
      repeat: readRepeat(),
      progress: Number($("te-progress").value) || 0,
    };
    if (patch.repeat && !patch.due) patch.due = dateStr(0);
    if (repeatDays(patch.repeat)) patch.due = alignToDays(patch.due, patch.repeat);
    if (creating) {
      addTask(patch);
      toast("Added: " + clip(title, 40));
    } else {
      const changed = Object.keys(patch).some((k) => (editing[k] == null ? null : editing[k]) !== patch[k]);
      if (changed) updateTask(editing.id, patch);
      if (patch.progress === 100 && (Number(editing.progress) || 0) < 100 && !editing.done) {
        const t = Object.assign({}, editing, patch);
        setTimeout(() => toast("100% – " + clip(t.title, 28), () => toggleDone(tasks.find((x) => x.id === t.id) || t), "Mark done"), 50);
      }
    }
    closeOverlay("task-overlay"); editing = null; creating = false;
  });
  $("te-cancel").addEventListener("click", () => { closeOverlay("task-overlay"); editing = null; creating = false; });
  $("te-delete").addEventListener("click", () => {
    if (!editing || creating) return;
    const t = editing; editing = null; closeOverlay("task-overlay"); deleteTask(t);
  });

  // Category editor
  let editingCat = null;
  function buildSwatches(selected) {
    const box = $("ce-colors"); box.innerHTML = "";
    const list = PAIRS.slice();
    if (selected && !PAIRS.some((p) => p.sq.toLowerCase() === selected.toLowerCase())) list.unshift({ name: "Current colour", sq: selected, ci: pairFor(selected).ci });
    list.forEach((p, i) => {
      const inp = document.createElement("input"); inp.type = "radio"; inp.name = "ce-color"; inp.id = "ce-color-" + i; inp.value = p.sq;
      if (selected && p.sq.toLowerCase() === selected.toLowerCase()) inp.checked = true;
      const lab = document.createElement("label"); lab.htmlFor = inp.id;
      lab.style.setProperty("--c", p.sq); lab.style.setProperty("--c2", p.ci);
      lab.title = p.name; lab.setAttribute("aria-label", p.name);
      box.appendChild(inp); box.appendChild(lab);
    });
  }
  function openCatEditor(c) {
    editingCat = c || null;
    $("ce-heading").textContent = c ? "Edit category" : "New category";
    $("ce-name").value = c ? c.name : "";
    const used = new Set(cats.map((x) => x.color));
    buildSwatches(c ? c.color : (COLORS.find((x) => !used.has(x)) || COLORS[cats.length % COLORS.length]));
    $("ce-delete").hidden = !c;
    $("ce-confirm").hidden = true;
    $("ce-save").textContent = c ? "Save" : "Add category";
    openOverlay("cat-overlay", "ce-name");
  }
  $("btn-add-cat").addEventListener("click", () => openCatEditor(null));
  $("btn-edit-cat").addEventListener("click", () => { const c = view.type === "cat" ? catById(view.id) : null; if (c) openCatEditor(c); });
  $("cat-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("ce-name").value.trim();
    if (!name) { $("ce-name").focus(); return; }
    const color = (document.querySelector('input[name="ce-color"]:checked') || {}).value || COLORS[0];
    if (editingCat) {
      saveCategory(Object.assign({}, editingCat, { name, color }));
    } else {
      const pos = cats.reduce((mx, c) => Math.max(mx, c.position), -1) + 1;
      const nc = { id: uid("c"), name, color, position: pos };
      view = { type: "cat", id: nc.id }; savePrefs();
      saveCategory(nc);
    }
    closeOverlay("cat-overlay"); editingCat = null;
  });
  $("ce-cancel").addEventListener("click", () => { closeOverlay("cat-overlay"); editingCat = null; });
  $("ce-delete").addEventListener("click", () => {
    if (!editingCat) return;
    const inCat = tasks.filter((t) => t.categoryId === editingCat.id);
    if (!inCat.length) { removeCategory(false); return; }
    const openN = inCat.filter((t) => !t.done).length;
    $("ce-confirm-text").textContent = "“" + editingCat.name + "” has " + inCat.length + (inCat.length === 1 ? " task" : " tasks") + (openN ? " (" + openN + " still open)" : "") + ". What should happen to them?";
    $("ce-confirm").hidden = false;
  });
  $("ce-del-move").addEventListener("click", () => removeCategory(false));
  $("ce-del-all").addEventListener("click", () => removeCategory(true));
  function removeCategory(withTasks) {
    if (!editingCat) return;
    const c = editingCat;
    view = { type: "all" }; savePrefs();
    closeOverlay("cat-overlay"); editingCat = null;
    deleteCategory(c, withTasks);
    toast(withTasks ? "Deleted “" + clip(c.name, 30) + "” and its tasks" : "Deleted “" + clip(c.name, 30) + "”. Its tasks are now under No category.");
  }

  // ---------- sign-in ----------
  let authMode = "signin";
  function showScreen(which) {
    $("booting").hidden = which !== "booting";
    $("setup-needed").hidden = which !== "setup";
    $("auth").hidden = which !== "auth";
    $("app").hidden = which !== "app";
  }
  function authMsg(text, isErr) {
    const m = $("auth-msg");
    m.hidden = !text; m.textContent = text || ""; m.className = "auth-msg" + (isErr ? " err" : "");
  }
  function setAuthMode(mode) {
    authMode = mode;
    const up = mode === "signup";
    $("auth-title").textContent = up ? "Create your account" : "Sign in";
    $("auth-lead").textContent = up ? "Pick an email and a password. You'll use them on your laptop and your phone." : "Your tasks stay in sync between your laptop and your phone.";
    $("auth-submit").textContent = up ? "Create account" : "Sign in";
    $("auth-switch").textContent = up ? "I already have an account" : "Create an account";
    $("auth-forgot").hidden = up;
    $("auth-pass").autocomplete = up ? "new-password" : "current-password";
    authMsg("");
  }
  $("auth-switch").addEventListener("click", () => setAuthMode(authMode === "signup" ? "signin" : "signup"));
  $("auth-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("auth-email").value.trim();
    const password = $("auth-pass").value;
    if (!email || !/.+@.+\..+/.test(email)) { authMsg("Enter your email address.", true); $("auth-email").focus(); return; }
    if (password.length < 6) { authMsg("Use a password with at least 6 characters.", true); $("auth-pass").focus(); return; }
    const btn = $("auth-submit"); btn.disabled = true;
    try {
      if (authMode === "signup") {
        const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } });
        if (error) authMsg(friendlyAuthError(error), true);
        else if (!data.session) { setAuthMode("signin"); authMsg("Check your inbox and click the confirmation link. Then come back here and sign in."); }
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) authMsg(friendlyAuthError(error), true);
      }
    } finally { btn.disabled = false; }
  });
  $("auth-forgot").addEventListener("click", async () => {
    const email = $("auth-email").value.trim();
    if (!email) { authMsg("Type your email above first, then tap Forgot password.", true); $("auth-email").focus(); return; }
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    authMsg(error ? friendlyAuthError(error) : "If that email has an account, a reset link is on its way. Open it on this device.", !!error);
  });
  function friendlyAuthError(err) {
    const m = (err && err.message) || "";
    if (/invalid login/i.test(m)) return "That email and password don't match. Check them and try again.";
    if (/not confirmed/i.test(m)) return "Confirm your email first: open the link Supabase sent you, then sign in.";
    if (/already registered/i.test(m)) return "That email already has an account. Sign in instead.";
    if (/signups? not allowed|disabled/i.test(m)) return "New accounts are switched off for this app.";
    if (/rate limit/i.test(m)) return "Too many emails sent in a short time. Wait an hour and try again.";
    if (/fetch|network/i.test(m)) return "Can't reach the server. Check your internet connection.";
    return m || "Something went wrong. Try again.";
  }
  $("pw-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const pw = $("pw-new").value;
    if (pw.length < 6) { $("pw-new").focus(); return; }
    const { error } = await sb.auth.updateUser({ password: pw });
    if (error) { toast(friendlyAuthError(error)); return; }
    $("pw-new").value = "";
    closeOverlay("pw-overlay");
    toast("Password updated.");
  });
  $("btn-signout").addEventListener("click", async () => {
    if (outbox.length && !window.confirmSignOut) {
      window.confirmSignOut = true;
      toast(outbox.length + " change(s) haven't synced yet. Tap Sign out again to sign out anyway.");
      setTimeout(() => { window.confirmSignOut = false; }, 6000);
      return;
    }
    LS.del("nextup.lastUser");
    if (userId) { LS.del(cacheKey()); LS.del(outboxKey()); }
    outbox = [];
    try { await sb.auth.signOut(); } catch (e) {}
    applySession(null);
  });

  async function applySession(session) {
    let newId = session && session.user ? session.user.id : null;
    let email = session && session.user ? session.user.email || "" : "";
    const real = !!newId;
    // Offline and Supabase could not confirm the sign-in: keep working from this device's saved copy.
    if (!newId && isOffline()) {
      const last = LS.get("nextup.lastUser", null);
      if (last && last.id) { newId = last.id; email = last.email || ""; }
    }
    if (authKnown && newId === userId) {
      if (real && offlineSession) { offlineSession = false; loadAll(true); subscribe(); }
      flush();
      return;
    }
    authKnown = true;
    userId = newId;
    offlineSession = !!newId && !real;
    if (channel) { sb.removeChannel(channel); channel = null; }
    cats = []; tasks = []; loaded = false; outbox = [];
    if (!userId) { setAuthMode("signin"); showScreen("auth"); return; }
    if (real) LS.set("nextup.lastUser", { id: userId, email });
    outbox = LS.get(outboxKey(), []);
    if (!Array.isArray(outbox)) outbox = [];
    $("acct-email").textContent = email;
    showScreen("app");
    loadLocal();
    render();
    statusLine();
    if (!offlineSession) { await loadAll(loaded); subscribe(); flush(); }
  }

  // Refresh when the app comes back to the foreground (phones pause live updates in the background).
  let lastRefresh = 0;
  function refreshSoon() {
    if (!userId || document.hidden) return;
    if (Date.now() - lastRefresh < 3000) return;
    lastRefresh = Date.now();
    if (offlineSession) { reconnect(); return; }
    flush();
    loadAll(true);
    if (!channel || channel.state === "closed" || channel.state === "errored") subscribe();
  }
  async function reconnect() {
    if (!sb || isOffline()) return;
    try {
      const { data } = await sb.auth.getSession();
      if (data && data.session) applySession(data.session);
    } catch (e) {}
  }
  document.addEventListener("visibilitychange", refreshSoon);
  window.addEventListener("online", () => { lastRefresh = 0; refreshSoon(); });
  window.addEventListener("offline", statusLine);
  setInterval(() => { if (outbox.length && !isOffline()) { if (offlineSession) reconnect(); else flush(); } }, 30000);
  setInterval(() => { if (loaded) render(); }, 5 * 60 * 1000);

  // ---------- boot ----------
  function boot() {
    if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
      navigator.serviceWorker.register("/sw.js").catch((e) => console.warn("Offline support unavailable", e));
    }
    const ok = CFG.supabaseUrl && CFG.supabaseKey && !/YOUR_/.test(CFG.supabaseUrl + CFG.supabaseKey) && window.supabase && window.supabase.createClient;
    if (!ok) { showScreen("setup"); return; }
    sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    sb.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") setTimeout(() => openOverlay("pw-overlay", "pw-new"), 300);
      // Run outside the callback: Supabase asks not to await other calls inside it.
      setTimeout(() => applySession(session), 0);
    });
  }
  boot();
})();
