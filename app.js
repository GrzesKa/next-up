/* Next Up – tasks by priority, synced through Supabase. */
(() => {
  "use strict";

  // ---------- constants ----------
  const CFG = window.NEXTUP_CONFIG || {};
  const COLORS = ["#69A831", "#3B82C4", "#D0603F", "#8E5BC4", "#C49A1F", "#2FA39A", "#C43B7E", "#6B7A8F"];
  const PRI = { 3: "High", 2: "Medium", 1: "Low" };
  const DEFAULT_CATS = [
    { name: "School", color: "#3B82C4" },
    { name: "Personal projects", color: "#69A831" },
    { name: "Personal", color: "#D0603F" },
  ];
  const ICONS = {
    all: '<svg class="icon" viewBox="0 0 16 16" fill="none"><path d="M2.5 4h11M2.5 8h11M2.5 12h7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    today: '<svg class="icon" viewBox="0 0 16 16" fill="none"><rect x="2.5" y="3.5" width="11" height="10" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    cal: '<svg class="icon" viewBox="0 0 16 16" fill="none"><rect x="2.5" y="3.5" width="11" height="10" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M2.5 6.5h11" stroke="currentColor" stroke-width="1.5"/><circle cx="5.5" cy="9.3" r=".9" fill="currentColor"/><circle cx="8" cy="9.3" r=".9" fill="currentColor"/><circle cx="10.5" cy="9.3" r=".9" fill="currentColor"/><circle cx="5.5" cy="11.6" r=".9" fill="currentColor"/></svg>',
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
  let loaded = false;
  let seeding = false;
  const prefs = loadPrefs();
  let view = prefs.view || { type: "all" };
  let sortBy = prefs.sortBy || "urgency";
  let showDone = !!prefs.showDone;
  let calCat = prefs.calCat || "";

  function loadPrefs() { try { return JSON.parse(localStorage.getItem("nextup.prefs") || "{}"); } catch (e) { return {}; } }
  function savePrefs() { try { localStorage.setItem("nextup.prefs", JSON.stringify({ view, sortBy, showDone, calCat })); } catch (e) {} }

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
    };
  }
  function taskToRow(t) {
    return {
      id: t.id, user_id: userId, title: t.title, notes: t.notes || "", category_id: t.categoryId || null,
      priority: Number(t.priority) || 2, due: t.due || null, done: !!t.done, done_at: toIso(t.doneAt), created_at: toIso(t.createdAt),
    };
  }
  function patchToRow(p) {
    const map = { title: "title", notes: "notes", categoryId: "category_id", priority: "priority", due: "due", done: "done" };
    const out = {};
    Object.keys(p).forEach((k) => {
      if (k === "doneAt") out.done_at = toIso(p.doneAt);
      else if (map[k]) out[map[k]] = p[k] === undefined ? null : p[k];
    });
    return out;
  }
  const catFromRow = (r) => ({ id: r.id, name: r.name || "", color: r.color || COLORS[0], position: Number(r.position) || 0 });
  const catToRow = (c) => ({ id: c.id, user_id: userId, name: c.name, color: c.color, position: c.position || 0 });
  const sortCats = () => { cats = cats.slice().sort((a, b) => a.position - b.position || a.name.localeCompare(b.name)); };

  // ---------- status & toast ----------
  function setStatus(kind, text) {
    $("status").className = "status" + (kind ? " " + kind : "");
    $("status-text").textContent = text;
  }
  let toastTimer = null, toastUndo = null;
  function toast(text, undo) {
    $("toast-text").textContent = text;
    toastUndo = undo || null;
    $("toast-undo").hidden = !undo;
    $("toast").classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $("toast").classList.remove("show"); toastUndo = null; }, undo ? 6000 : 4500);
  }
  $("toast-undo").addEventListener("click", () => {
    const fn = toastUndo; toastUndo = null; $("toast").classList.remove("show");
    if (fn) fn();
  });

  // ---------- data access ----------
  async function run(query, failMsg) {
    let res;
    try { res = await query; } catch (e) { res = { error: e }; }
    if (res && res.error) {
      console.error(res.error);
      toast(failMsg || (navigator.onLine === false ? "You're offline, so that change wasn't saved." : "Couldn't save that change. Try again in a moment."));
      loadAll(true);
      return false;
    }
    return true;
  }

  async function loadAll(quiet) {
    if (!userId) return;
    if (!quiet && !loaded) setStatus("", "Loading your tasks…");
    const [c, t] = await Promise.all([
      sb.from("categories").select("*").order("position", { ascending: true }),
      sb.from("tasks").select("*").order("created_at", { ascending: true }),
    ]);
    if (c.error || t.error) {
      console.error(c.error || t.error);
      setStatus("warn", navigator.onLine === false ? "You're offline. Showing what was last loaded." : "Couldn't reach your tasks. Check your connection and reopen the app.");
      if (!loaded) { loaded = true; render(); }
      return;
    }
    cats = c.data.map(catFromRow); sortCats();
    tasks = t.data.map(taskFromRow);
    loaded = true;
    if (!cats.length && !tasks.length && !seeding) await seedDefaults();
    setStatus("ok", "Synced across your devices");
    render();
  }

  async function seedDefaults() {
    seeding = true;
    const rows = DEFAULT_CATS.map((c, i) => ({ id: uid("c"), name: c.name, color: c.color, position: i }));
    cats = rows.slice();
    render();
    await run(sb.from("categories").insert(rows.map(catToRow)), "Couldn't create the starter categories. Add your own with + New category.");
  }

  function subscribe() {
    if (channel) { sb.removeChannel(channel); channel = null; }
    channel = sb.channel("nextup-" + userId)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, (p) => applyChange("task", p))
      .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, (p) => applyChange("cat", p))
      .subscribe((status) => {
        if (status === "SUBSCRIBED" && loaded) setStatus("ok", "Synced across your devices");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setStatus("warn", "Live updates paused. Your changes still save; reopen the app to refresh.");
      });
  }

  function applyChange(kind, p) {
    if (!loaded) return;
    const isTask = kind === "task";
    let arr = isTask ? tasks : cats;
    if (p.eventType === "DELETE") {
      const id = p.old && p.old.id;
      if (!id) return;
      arr = arr.filter((x) => x.id !== id);
    } else {
      const row = p.new || {};
      if (row.user_id && row.user_id !== userId) return;
      const obj = isTask ? taskFromRow(row) : catFromRow(row);
      const i = arr.findIndex((x) => x.id === obj.id);
      arr = i === -1 ? arr.concat([obj]) : arr.map((x, j) => (j === i ? obj : x));
    }
    if (isTask) tasks = arr; else { cats = arr; sortCats(); }
    render();
  }

  // ---------- task & category actions ----------
  function addTask(data) {
    const t = Object.assign({ id: uid("t"), notes: "", categoryId: null, priority: 2, due: null, done: false, doneAt: null, createdAt: Date.now() }, data);
    tasks = tasks.concat([t]); render();
    return run(sb.from("tasks").insert(taskToRow(t)));
  }
  function updateTask(id, patch) {
    tasks = tasks.map((x) => (x.id === id ? Object.assign({}, x, patch) : x)); render();
    return run(sb.from("tasks").update(patchToRow(patch)).eq("id", id));
  }
  function restoreTasks(list) {
    const ids = new Set(list.map((t) => t.id));
    tasks = tasks.filter((x) => !ids.has(x.id)).concat(list); render();
    return run(sb.from("tasks").upsert(list.map(taskToRow)));
  }
  function deleteTasks(list) {
    const ids = list.map((t) => t.id);
    tasks = tasks.filter((x) => ids.indexOf(x.id) === -1); render();
    return run(sb.from("tasks").delete().in("id", ids));
  }
  function toggleDone(t) {
    const done = !t.done;
    updateTask(t.id, { done, doneAt: done ? Date.now() : null });
    if (done) toast("Done: " + clip(t.title, 40), () => updateTask(t.id, { done: false, doneAt: null }));
  }
  function deleteTask(t) {
    const copy = Object.assign({}, t);
    deleteTasks([t]);
    toast("Deleted: " + clip(t.title, 40), () => restoreTasks([copy]));
  }
  function saveCategory(c) {
    const i = cats.findIndex((x) => x.id === c.id);
    cats = i === -1 ? cats.concat([c]) : cats.map((x) => (x.id === c.id ? c : x));
    sortCats(); render();
    return run(sb.from("categories").upsert(catToRow(c)));
  }
  async function deleteCategory(c, withTasks) {
    const inCat = tasks.filter((t) => t.categoryId === c.id);
    cats = cats.filter((x) => x.id !== c.id);
    if (withTasks) tasks = tasks.filter((t) => t.categoryId !== c.id);
    else tasks = tasks.map((t) => (t.categoryId === c.id ? Object.assign({}, t, { categoryId: null }) : t));
    render();
    if (inCat.length) {
      const ok = withTasks
        ? await run(sb.from("tasks").delete().eq("category_id", c.id))
        : await run(sb.from("tasks").update({ category_id: null }).eq("category_id", c.id));
      if (!ok) return;
    }
    await run(sb.from("categories").delete().eq("id", c.id));
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
    ];
    const nv = $("nav-views"); nv.innerHTML = "";
    views.forEach((it) => nv.appendChild(navButton(it.v, it.name, it.icon, null, it.count, it.alert)));
    const nc = $("nav-cats"); nc.innerHTML = "";
    cats.forEach((c) => nc.appendChild(navButton({ type: "cat", id: c.id }, c.name, null, c.color, open.filter((t) => t.categoryId === c.id).length)));
    const orphan = open.filter((t) => !catById(t.categoryId)).length;
    if (orphan > 0) nc.appendChild(navButton({ type: "cat", id: "none" }, "No category", null, "var(--muted)", orphan));
  }
  function navButton(v, name, icon, color, count, alert) {
    const b = el("button", "nav-item"); b.type = "button";
    const active = view.type === v.type && (v.type !== "cat" || view.id === v.id);
    b.setAttribute("aria-current", active ? "true" : "false");
    if (icon) b.insertAdjacentHTML("beforeend", icon);
    if (color) { const d = el("span", "dot"); d.style.background = color; b.appendChild(d); }
    b.appendChild(el("span", "name", name));
    if (count) b.appendChild(el("span", "count" + (alert ? " alert" : ""), String(count)));
    b.addEventListener("click", () => { view = v; savePrefs(); render(); if (isPhone()) enterView(); });
    return b;
  }
  function renderCatSelect(sel, value) {
    sel.innerHTML = "";
    const none = el("option", null, "No category"); none.value = ""; sel.appendChild(none);
    cats.forEach((c) => { const o = el("option", null, c.name); o.value = c.id; sel.appendChild(o); });
    sel.value = value && catById(value) ? value : "";
  }
  function metaChips(t, opts) {
    const m = el("div", "meta");
    const c = catById(t.categoryId);
    if (c && !(opts && opts.hideCat)) {
      const ch = el("span", "chip"); const d = el("span", "dot"); d.style.background = c.color || COLORS[0];
      ch.appendChild(d); ch.appendChild(document.createTextNode(c.name)); m.appendChild(ch);
    }
    const di = dueInfo(t.due);
    if (di) m.appendChild(el("span", "chip " + di.cls, di.text));
    const p = Number(t.priority) || 2;
    const pc = el("span", "chip pri p" + p); pc.appendChild(el("span", "pdot p" + p)); pc.appendChild(document.createTextNode(PRI[p])); m.appendChild(pc);
    if (t.notes && opts && opts.noteFlag) m.appendChild(el("span", "chip", "Notes"));
    return m;
  }
  function taskRow(t) {
    const p = Number(t.priority) || 2;
    const li = el("li", "task p" + p + (t.done ? " done" : ""));
    const chk = el("button", "check"); chk.type = "button";
    chk.setAttribute("aria-label", t.done ? "Mark as not done" : "Mark done");
    chk.innerHTML = ICONS.check;
    chk.addEventListener("click", () => toggleDone(t));
    const body = el("button", "t-body"); body.type = "button";
    body.setAttribute("aria-label", "Edit " + t.title);
    body.appendChild(el("div", "t-title", t.title));
    body.appendChild(metaChips(t, { hideCat: view.type === "cat", noteFlag: true }));
    body.addEventListener("click", () => openTaskEditor(t));
    const more = el("button", "icon-btn"); more.type = "button"; more.setAttribute("aria-label", "Edit task"); more.innerHTML = ICONS.edit;
    more.addEventListener("click", () => openTaskEditor(t));
    li.appendChild(chk); li.appendChild(body); li.appendChild(more);
    return li;
  }

  // ---------- render: list views ----------
  function nextCard(top) {
    const p = Number(top.priority) || 2;
    const card = el("div", "next-card p" + p);
    const chk = el("button", "check"); chk.type = "button";
    chk.setAttribute("aria-label", "Mark done"); chk.innerHTML = ICONS.check;
    chk.addEventListener("click", () => toggleDone(top));
    const body = el("button", "t-body"); body.type = "button";
    body.setAttribute("aria-label", "Edit " + top.title);
    const lab = el("div", "label", "Do this next"); lab.appendChild(el("span", "why", whyUrgent(top)));
    body.appendChild(lab);
    body.appendChild(el("div", "t-title", top.title));
    body.appendChild(metaChips(top, { hideCat: view.type === "cat", noteFlag: true }));
    body.addEventListener("click", () => openTaskEditor(top));
    const more = el("button", "icon-btn"); more.type = "button"; more.setAttribute("aria-label", "Edit task"); more.innerHTML = ICONS.edit;
    more.addEventListener("click", () => openTaskEditor(top));
    card.appendChild(chk); card.appendChild(body); card.appendChild(more);
    return card;
  }
  function renderHero(top, anyOpen) {
    const wrap = $("hero-wrap"); wrap.innerHTML = "";
    if (top) { wrap.appendChild(nextCard(top)); return; }
    wrap.appendChild(el("p", "next-empty", anyOpen ? "Nothing open here. Nice work." : "No open tasks yet. Tap + Add task to create one."));
  }
  function renderHomeNext() {
    const box = $("home-next"); box.innerHTML = "";
    if (!loaded) return;
    const top = sortTasks(tasks.filter((t) => !t.done), "urgency")[0];
    if (top) box.appendChild(nextCard(top));
  }

  function render() {
    if (!userId) return;
    if (view.type === "cat" && view.id !== "none" && !catById(view.id) && cats.length) view = { type: "all" };
    renderNav();
    renderHomeNext();

    const c = view.type === "cat" ? catById(view.id) : null;
    const isCal = view.type === "calendar";
    $("view-title").textContent = isCal ? "Calendar" : view.type === "today" ? "Today" : view.type === "week" ? "Next 7 days" : view.type === "cat" ? (c ? c.name : "No category") : "All tasks";
    $("btn-edit-cat").hidden = !c;
    $("list-mode").hidden = isCal;
    $("cal-mode").hidden = !isCal;
    $("main").classList.toggle("wide", isCal);

    if (!loaded) { $("list").innerHTML = '<li class="loading">Loading your tasks…</li>'; return; }
    if (isCal) { renderCalendar(); return; }

    const scoped = tasks.filter((t) => inView(t, view));
    const open = scoped.filter((t) => !t.done);
    const done = scoped.filter((t) => t.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
    const overdue = open.filter((t) => { const d = daysUntil(t.due); return d !== null && d < 0; }).length;
    const dueToday = open.filter((t) => daysUntil(t.due) === 0).length;
    const parts = [open.length + (open.length === 1 ? " open task" : " open tasks")];
    if (overdue) parts.push(overdue + " overdue");
    if (dueToday) parts.push(dueToday + " due today");
    if (view.type === "today" && !open.length) parts.splice(0, 1, "Nothing due today");
    $("view-sub").textContent = parts.join(" · ");

    const top = sortTasks(open, "urgency")[0] || null;
    renderHero(top, tasks.some((t) => !t.done));
    const rest = sortTasks(open.filter((t) => t !== top), sortBy);
    const labels = { urgency: "most urgent first", due: "soonest due first", priority: "highest priority first", newest: "newest first" };
    $("list-title").textContent = top ? "Then, " + labels[sortBy] : labels[sortBy].charAt(0).toUpperCase() + labels[sortBy].slice(1);
    document.querySelector("#list-mode .toolbar").hidden = !rest.length && !(showDone && done.length) && !done.length;

    const list = $("list"); list.innerHTML = "";
    rest.forEach((t) => list.appendChild(taskRow(t)));
    if (!rest.length && top) list.appendChild(el("li", "empty-note", "That's the only open task here."));
    if (showDone) done.forEach((t) => list.appendChild(taskRow(t)));
    $("btn-clear-done").hidden = !(showDone && done.length);
    $("show-done").checked = showDone;
    $("sort").value = sortBy;
  }

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
  const calMatches = (t) => !calCat || (calCat === "none" ? !catById(t.categoryId) : t.categoryId === calCat);
  const byDoneThenUrgency = (arr) => sortTasks(arr.filter((t) => !t.done), "urgency").concat(arr.filter((t) => t.done));

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

    const visible = tasks.filter((t) => calMatches(t) && (showDone || !t.done));
    const byDay = new Map();
    visible.forEach((t) => { if (t.due && daysUntil(t.due) !== null) { if (!byDay.has(t.due)) byDay.set(t.due, []); byDay.get(t.due).push(t); } });

    const offset = (new Date(y, m, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const weeks = Math.ceil((offset + daysInMonth) / 7);
    const today = dateStr(0);
    const narrow = window.matchMedia("(max-width: 600px)").matches;
    const maxPills = narrow ? 4 : 3;

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
        pill.style.setProperty("--c", c ? c.color : "var(--muted)");
        if (c) { const dot = el("span", "dot"); dot.style.background = c.color; pill.appendChild(dot); }
        pill.appendChild(el("span", "ptext", t.title));
        pill.addEventListener("click", (e) => { e.stopPropagation(); if (narrow) selectDay(ds); else openTaskEditor(t); });
        makeDraggable(pill, t.id);
        cell.appendChild(pill);
      });
      if (list.length > maxPills) cell.appendChild(el("span", "more-n", "+" + (list.length - maxPills) + (narrow ? "" : " more")));
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
    if (!dayList.length) ul.appendChild(el("li", "hint", "Nothing planned for this day yet."));
    dayList.forEach((t) => { const row = taskRow(t); makeDraggable(row, t.id); ul.appendChild(row); });

    const us = $("us-list"); us.innerHTML = "";
    const sorted = sortTasks(unscheduled, "urgency");
    $("us-count").textContent = sorted.length ? String(sorted.length) : "";
    if (!sorted.length) us.appendChild(el("li", "hint", "Every open task has a date."));
    const btnLabel = dd === 0 ? "Today" : dd === 1 ? "Tomorrow" : "Add to " + parseYmd(ds).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    sorted.forEach((t) => {
      const p = Number(t.priority) || 2;
      const li = el("li", "mini p" + p);
      const c = catById(t.categoryId);
      if (c) { const dot = el("span", "dot"); dot.style.background = c.color; li.appendChild(dot); }
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
    openOverlay("task-overlay", "te-title");
  }
  function openNewTask() {
    if (!userId) return;
    const onHome = isPhone() && !document.body.classList.contains("in-view");
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
    };
    if (creating) {
      addTask(patch);
      toast("Added: " + clip(title, 40));
    } else {
      const changed = Object.keys(patch).some((k) => (editing[k] == null ? null : editing[k]) !== patch[k]);
      if (changed) updateTask(editing.id, patch);
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
    COLORS.forEach((col, i) => {
      const inp = document.createElement("input"); inp.type = "radio"; inp.name = "ce-color"; inp.id = "ce-color-" + i; inp.value = col;
      if (col === selected) inp.checked = true;
      const lab = document.createElement("label"); lab.htmlFor = inp.id; lab.style.background = col;
      lab.title = "Colour " + (i + 1); lab.setAttribute("aria-label", "Colour " + (i + 1));
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
  $("btn-signout").addEventListener("click", async () => { await sb.auth.signOut(); });

  async function applySession(session) {
    const newId = session && session.user ? session.user.id : null;
    if (authKnown && newId === userId) return;
    authKnown = true;
    userId = newId;
    if (channel) { sb.removeChannel(channel); channel = null; }
    cats = []; tasks = []; loaded = false;
    if (!userId) { setAuthMode("signin"); showScreen("auth"); return; }
    $("acct-email").textContent = session.user.email || "";
    showScreen("app");
    render();
    await loadAll();
    subscribe();
  }

  // Refresh when the app comes back to the foreground (phones pause live updates in the background).
  let lastRefresh = 0;
  function refreshSoon() {
    if (!userId || document.hidden) return;
    if (Date.now() - lastRefresh < 3000) return;
    lastRefresh = Date.now();
    loadAll(true);
    if (!channel || channel.state === "closed" || channel.state === "errored") subscribe();
  }
  document.addEventListener("visibilitychange", refreshSoon);
  window.addEventListener("online", refreshSoon);
  window.addEventListener("offline", () => { if (userId) setStatus("warn", "You're offline. Changes won't save until you're back online."); });
  setInterval(() => { if (loaded) render(); }, 5 * 60 * 1000);

  // ---------- boot ----------
  function boot() {
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
