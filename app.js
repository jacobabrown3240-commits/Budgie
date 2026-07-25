/* ============================================================
   Kakeibo — a phone-first monthly budget planner & tracker.
   All data lives in localStorage on the device. No accounts.
   ============================================================ */
(function () {
  "use strict";

  var STORAGE_KEY = "budgie.v1";
  var SERIES = ["--s1","--s2","--s3","--s4","--s5","--s6","--s7","--s8"];

  /* ---------- Defaults for a fresh month ---------- */
  function defaultMonth() {
    return {
      income: [
        row("Paycheck", 0),
        row("Other income", 0)
      ],
      expenses: [
        row("Rent / Mortgage", 0),
        row("Groceries", 0),
        row("Transport", 0),
        row("Utilities", 0),
        row("Dining out", 0),
        row("Subscriptions", 0),
        row("Savings", 0),
        row("Other", 0)
      ],
      log: [],
      reflection: { wentWell: "", improve: "" }
    };
  }
  function row(name, planned, icon) {
    return { id: uid(), name: name, planned: planned, actual: null, icon: icon || null, group: null };
  }
  function uid() { return Math.random().toString(36).slice(2, 9); }

  /* ---------- Kakeibo groups (Needs / Wants / Culture / Extra) ---------- */
  var GROUPS = [
    { key: "needs",   label: "Needs",   sub: "Survival",   color: "--s1" },
    { key: "wants",   label: "Wants",   sub: "Optional",   color: "--s2" },
    { key: "culture", label: "Culture", sub: "Enrichment", color: "--s3" },
    { key: "extra",   label: "Extra",   sub: "Unexpected", color: "--s7" }
  ];
  var GROUP_MAP = {};
  GROUPS.forEach(function (g) { GROUP_MAP[g.key] = g; });
  var GROUP_RULES = [
    [/rent|mortgage|housing|grocer|food|util|electric|water|gas|fuel|transport|car|bus|train|insur|health|medical|meds|pharmacy|phone|internet|wifi|debt|loan|childcare|daycare/i, "needs"],
    [/book|movie|cinema|concert|museum|music|educat|school|tuition|course|class|hobby|gym|fitness|sport/i, "culture"],
    [/dining|restaurant|coffee|cafe|shop|clothe|subscri|stream|netflix|spotify|beauty|salon|game|entertain|bar|drinks|takeout|lunch|dinner/i, "wants"],
    [/gift|donat|charity|repair|emergency|misc|other|pet|travel|vacation|flight|hotel/i, "extra"]
  ];
  function groupFor(name) {
    var n = String(name || "");
    for (var i = 0; i < GROUP_RULES.length; i++) if (GROUP_RULES[i][0].test(n)) return GROUP_RULES[i][1];
    return "needs";
  }
  function rowGroup(r) { return (r.group && GROUP_MAP[r.group]) ? r.group : groupFor(r.name); }

  /* ---------- Icons (clean monochrome line set) ---------- */
  // 24x24 viewBox, stroked with currentColor. Keys are stable identifiers used
  // in storage; the name auto-maps to one, and a row can override it.
  var ICON_PATHS = {
    home:      '<path d="M3.5 10.5 12 4l8.5 6.5"/><path d="M5.5 9.5V20h13V9.5"/>',
    cart:      '<circle cx="9" cy="20" r="1.4"/><circle cx="17.5" cy="20" r="1.4"/><path d="M2.5 3.5H5l2.2 11a1.3 1.3 0 0 0 1.3 1h8.2a1.3 1.3 0 0 0 1.3-1L20.5 7H6"/>',
    car:       '<path d="M4.5 11 6 7.2A2 2 0 0 1 7.9 6h8.2a2 2 0 0 1 1.9 1.2L19.5 11"/><rect x="3.5" y="11" width="17" height="5.5" rx="1.5"/><circle cx="7.5" cy="16.5" r="1.3"/><circle cx="16.5" cy="16.5" r="1.3"/>',
    fuel:      '<path d="M6.5 20V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v14"/><path d="M4.5 20h12"/><path d="M8.5 9.5h4"/><path d="M14.5 8.5l3 2.5V16a1.8 1.8 0 0 0 3.6 0V9.5L18.5 6.9"/>',
    bolt:      '<path d="M13 2.5 5 13.5h6l-1 8 8-11h-6l1-8z"/>',
    wifi:      '<path d="M4.5 12a10.5 10.5 0 0 1 15 0"/><path d="M8 15.5a5.5 5.5 0 0 1 8 0"/><path d="M12 19h.01"/>',
    phone:     '<rect x="7" y="2.5" width="10" height="19" rx="2.4"/><path d="M10.5 18.5h3"/>',
    cup:       '<path d="M4.5 8.5h12v4.5a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z"/><path d="M16.5 9.5h2a2 2 0 0 1 0 5.5h-2"/><path d="M7.5 3.5v2M11 3.5v2"/>',
    food:      '<path d="M6.5 3v8M4 3v3.5A2.5 2.5 0 0 0 6.5 9M9 3v6M6.5 11v10"/><path d="M16.5 3c-1.6 0-2.7 2.6-2.7 5.6 0 2.4 1.1 3.4 2.7 3.4v9"/>',
    tv:        '<rect x="3" y="5.5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17.5v3.5"/><path d="M10.5 9.5 15 12l-4.5 2.5z"/>',
    bank:      '<path d="M3.5 9.5 12 4l8.5 5.5"/><path d="M4.5 9.5h15"/><path d="M6.5 9.5v8M10 9.5v8M14 9.5v8M17.5 9.5v8"/><path d="M4 20.5h16"/>',
    dumbbell:  '<path d="M6.5 8.5v7M4 6.5v11M17.5 8.5v7M20 6.5v11M8.5 12h7"/>',
    health:    '<rect x="4" y="4" width="16" height="16" rx="4.5"/><path d="M12 8.5v7M8.5 12h7"/>',
    film:      '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M3.5 9.5h17M3.5 14.5h17M8 5.5v13M16 5.5v13"/>',
    game:      '<rect x="2.5" y="8" width="19" height="8" rx="4"/><path d="M7 11v2M6 12h2"/><path d="M15.5 11.5h.01M17.5 13.5h.01"/>',
    bag:       '<path d="M6.5 8h11l-1 12.5h-9z"/><path d="M9 8V6.2a3 3 0 0 1 6 0V8"/>',
    shield:    '<path d="M12 3.2 19 6v5.2c0 4.4-3 7.9-7 9.6-4-1.7-7-5.2-7-9.6V6z"/>',
    education: '<path d="M12 4 2.5 8.5 12 13l9.5-4.5z"/><path d="M6.5 10.5V15c0 1.4 2.5 2.8 5.5 2.8s5.5-1.4 5.5-2.8v-4.5"/><path d="M21.5 8.5v5"/>',
    pet:       '<circle cx="7" cy="9.5" r="1.5"/><circle cx="12" cy="7.5" r="1.5"/><circle cx="17" cy="9.5" r="1.5"/><path d="M12 12.5c-2.6 0-4.5 1.9-4.5 3.8A2.7 2.7 0 0 0 10 19c1 0 1.2-.4 2-.4s1 .4 2 .4a2.7 2.7 0 0 0 2.5-2.7c0-1.9-1.9-3.8-4.5-3.8z"/>',
    plane:     '<path d="M21 3 3 10.5l6.5 2.2L12 21l3.2-6.3z"/><path d="M21 3 9.5 12.7"/>',
    baby:      '<circle cx="12" cy="12" r="8.5"/><path d="M9 10.5h.01M15 10.5h.01M9 14.5c1.2 1.1 4.8 1.1 6 0"/>',
    card:      '<rect x="2.5" y="5.5" width="19" height="13" rx="2.2"/><path d="M2.5 10h19M6 15h4"/>',
    gift:      '<rect x="3.5" y="8.5" width="17" height="4" rx="1"/><path d="M5.5 12.5V20h13v-7.5M12 8.5V20"/><path d="M12 8.5C11 6 9.2 4.6 7.9 5.5 6.6 6.4 8.5 8.5 12 8.5zM12 8.5c1-2.5 2.8-3.9 4.1-3 1.3.9-.6 3-4.1 3z"/>',
    beauty:    '<path d="M9.5 8.5 8 4.5l3.4-1.4 1.5 4"/><rect x="8.5" y="8.5" width="4.5" height="3.5" rx=".8"/><rect x="9" y="12" width="3.5" height="9" rx="1"/>',
    broom:     '<path d="M14 3 8.5 11.5"/><path d="M4 20c1-3 3-5 6-6l3.5 3.5c-1 3-3 5-6 6z"/><path d="M9.5 14.5 6 21M12 16 9 21M14 15 12 21"/>',
    receipt:   '<path d="M6 2.5h12v19l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4z"/><path d="M9 7h6M9 11h6M9 15h4"/>',
    briefcase: '<rect x="3" y="7.5" width="18" height="12.5" rx="2"/><path d="M8.5 7.5V5.8a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.7M3 12.5h18"/>',
    cash:      '<rect x="2.5" y="6.5" width="19" height="11" rx="2"/><circle cx="12" cy="12" r="2.4"/><path d="M5.5 9.5v5M18.5 9.5v5"/>',
    chart:     '<path d="M4 4v16h16"/><path d="M7.5 14.5 11 11l3 2 4.5-5.5"/>',
    store:     '<path d="M4.5 9 5.5 5h13l1 4"/><path d="M4.5 9a2.4 2.4 0 0 0 4.9 0 2.4 2.4 0 0 0 4.9 0 2.4 2.4 0 0 0 4.9 0"/><path d="M6 10.5V20h12v-9.5"/>',
    star:      '<path d="M12 3.5 14.3 9l6 .5-4.5 3.9 1.4 5.9L12 16.2 6.8 19.3l1.4-5.9L3.7 9.5l6-.5z"/>',
    wallet:    '<rect x="3" y="6" width="18" height="12.5" rx="2.4"/><path d="M3 10h13a2 2 0 0 1 0 4H3"/><path d="M16.5 12h.01"/>',
    tag:       '<path d="M3.5 12.5V4.5a1 1 0 0 1 1-1h8l8.5 8.5-8.5 8.5z"/><circle cx="8" cy="8" r="1.4"/>',
    /* app chrome */
    grid:      '<rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/>',
    check:     '<circle cx="12" cy="12" r="8.5"/><path d="M8 12l3 3 5-6"/>',
    compare:   '<path d="M7 5 3.5 8.5 7 12"/><path d="M3.5 8.5H16"/><path d="M17 12l3.5 3.5L17 19.5"/><path d="M20.5 15.5H8"/>',
    history:   '<path d="M3.6 12a8.5 8.5 0 1 0 2.5-6"/><path d="M3.5 4.5V9.5H8.5"/><path d="M12 7.5V12l3 2"/>',
    copy:      '<rect x="8.5" y="8.5" width="11" height="11" rx="2.2"/><path d="M15.5 8.5V6a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2.5"/>',
    download:  '<path d="M12 3.5v11M8 10.5l4 4 4-4"/><path d="M4.5 20h15"/>',
    upload:    '<path d="M12 14.5v-11M8 7.5l4-4 4 4"/><path d="M4.5 20h15"/>',
    trash:     '<path d="M4.5 6.5h15M9 6.5V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v1.5M6.5 6.5 7.5 20a1.5 1.5 0 0 0 1.5 1.4h6a1.5 1.5 0 0 0 1.5-1.4l1-13.5M10 10.5v6M14 10.5v6"/>',
    settings:  '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M4.2 7l2.6 1.5M17.2 15.5 19.8 17M4.2 17l2.6-1.5M17.2 8.5 19.8 7M2.5 12h3M18.5 12h3"/>',
    lock:      '<rect x="4.5" y="10.5" width="15" height="10" rx="2.2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
    trending:  '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    backspace: '<path d="M9 5.5 3.5 12 9 18.5h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2z"/><path d="M12.5 9.5l4 5M16.5 9.5l-4 5"/>',
    logo:      '<path d="M5 20V11M12 20V4M19 20v-6"/>'
  };
  function svgIcon(key, extra) {
    var p = ICON_PATHS[key] || ICON_PATHS.tag;
    return '<svg class="ic' + (extra ? ' ' + extra : '') + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      p + '</svg>';
  }

  var EXPENSE_RULES = [
    [/rent|mortgage|housing|apartment|landlord|hoa/i, "home"],
    [/grocer|food|supermarket|market/i, "cart"],
    [/gas|fuel|petrol/i, "fuel"],
    [/transport|car|auto|uber|lyft|bus|train|subway|metro|commut|parking|toll/i, "car"],
    [/util|electric|water|power|heat|sewage/i, "bolt"],
    [/internet|wifi|broadband/i, "wifi"],
    [/phone|mobile|cell/i, "phone"],
    [/coffee|cafe/i, "cup"],
    [/dining|restaurant|eat|takeout|lunch|dinner|drinks|bar/i, "food"],
    [/subscri|netflix|spotify|stream|hulu|disney|prime/i, "tv"],
    [/sav|invest|401|ira|emergency/i, "bank"],
    [/gym|fitness|workout|sport/i, "dumbbell"],
    [/health|medical|doctor|dentist|pharmacy|meds|medic/i, "health"],
    [/entertain|movie|cinema|concert|hobby/i, "film"],
    [/game|gaming/i, "game"],
    [/shop|clothe|apparel|amazon|retail/i, "bag"],
    [/insur/i, "shield"],
    [/educat|school|tuition|book|course|student|class/i, "education"],
    [/pet|dog|cat|vet/i, "pet"],
    [/travel|vacation|flight|hotel|trip|airbnb/i, "plane"],
    [/kid|child|baby|daycare|childcare|diaper/i, "baby"],
    [/debt|loan|credit|repay/i, "card"],
    [/gift|present|donat|charity|tithe/i, "gift"],
    [/beauty|hair|salon|cosmet|nails/i, "beauty"],
    [/laundry|clean/i, "broom"],
    [/tax/i, "receipt"]
  ];
  var INCOME_RULES = [
    [/paycheck|salary|wage|job|employ|payroll/i, "briefcase"],
    [/side|gig|freelance|contract|1099|consult/i, "chart"],
    [/bonus/i, "star"],
    [/interest|dividend|invest|capital|stock|crypto/i, "chart"],
    [/gift/i, "gift"],
    [/refund|rebate|tax/i, "receipt"],
    [/rent|rental/i, "home"],
    [/business|sales|shop/i, "store"]
  ];
  var ICON_CHOICES = [
    "home","cart","car","fuel","bolt","wifi","phone","cup",
    "food","tv","bank","dumbbell","health","film","game","bag",
    "shield","education","pet","plane","baby","card","gift","beauty",
    "broom","receipt","briefcase","chart","store","star","cash","tag"
  ];
  function iconFor(name, type) {
    var rules = type === "income" ? INCOME_RULES : EXPENSE_RULES;
    var n = String(name || "");
    for (var i = 0; i < rules.length; i++) if (rules[i][0].test(n)) return rules[i][1];
    return type === "income" ? "cash" : "tag";
  }
  // Returns a valid icon key. Older data may hold a custom key; unknown values
  // (e.g. a legacy emoji) fall back to name-based detection.
  function rowIcon(r, type) {
    return (r.icon && ICON_PATHS[r.icon]) ? r.icon : iconFor(r.name, type);
  }

  /* ---------- State ---------- */
  var state = load();
  if (!state.months) state.months = {};
  if (!state.settings) state.settings = {};
  if (!state.settings.theme) state.settings.theme = "dark"; // dark by default
  if (typeof state.settings.pin === "undefined") state.settings.pin = null;
  if (!state.forecast) state.forecast = { debit: 0, card: 0, apr: 22, monthly: 0, useNet: true, horizon: 12 };
  if (!state.selected) state.selected = monthKey(new Date());
  ensureMonth(state.selected);

  var currentView = "plan";

  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (e) { /* storage full / private mode — ignore */ }
  }
  // Create a month if missing: seed a fresh month from the most recent prior
  // month's plan (names/amounts/icons/groups, actuals cleared) so recurring
  // budgets carry forward automatically. Falls back to the default template.
  function ensureMonth(key) {
    if (state.months[key]) { normalizeMonth(state.months[key]); return state.months[key]; }
    var prevKey = mostRecentBefore(key);
    if (prevKey) {
      var prev = state.months[prevKey];
      state.months[key] = {
        income: prev.income.map(function (r) { return carry(r); }),
        expenses: prev.expenses.map(function (r) { return carry(r); }),
        log: [],
        reflection: { wentWell: "", improve: "" }
      };
    } else {
      state.months[key] = defaultMonth();
    }
    return state.months[key];
  }
  function carry(r) {
    return { id: uid(), name: r.name, planned: r.planned, actual: null, icon: r.icon || null, group: r.group || null };
  }
  function mostRecentBefore(key) {
    var keys = Object.keys(state.months).filter(function (k) { return k < key; }).sort();
    return keys.length ? keys[keys.length - 1] : null;
  }
  function normalizeMonth(m) {
    if (!m.log) m.log = [];
    if (!m.reflection) m.reflection = { wentWell: "", improve: "" };
  }
  function month() { return ensureMonth(state.selected); }

  /* ---------- Date helpers ---------- */
  function monthKey(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
  }
  function keyToDate(key) {
    var p = key.split("-");
    return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, 1);
  }
  function monthName(key) {
    var d = keyToDate(key);
    return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }
  function shiftMonth(key, delta) {
    var d = keyToDate(key);
    d.setMonth(d.getMonth() + delta);
    return monthKey(d);
  }

  /* ---------- Money helpers ---------- */
  function money(n) {
    n = Number(n) || 0;
    return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
  function signedMoney(n) {
    var s = n < 0 ? "-" : "+";
    return s + money(Math.abs(n));
  }
  function sum(list, field) {
    return list.reduce(function (t, r) { return t + (Number(r[field]) || 0); }, 0);
  }
  function actualOr(r, fallbackField) {
    return r.actual == null || r.actual === "" ? (fallbackField ? Number(r[fallbackField]) || 0 : 0) : Number(r.actual);
  }

  /* ---------- Transaction log (running totals per category) ---------- */
  function monthLog(m) { if (!m.log) m.log = []; return m.log; }
  function loggedEntries(m, catId) {
    return monthLog(m).filter(function (e) { return e.catId === catId; });
  }
  function loggedTotal(m, catId) {
    return loggedEntries(m, catId).reduce(function (t, e) { return t + (Number(e.amount) || 0); }, 0);
  }
  // A category is "tracked" once it has at least one logged entry — its actual
  // then comes from the sum of those entries instead of a typed-in number.
  function isTracked(m, r) {
    return monthLog(m).some(function (e) { return e.catId === r.id; });
  }
  function expenseActualOf(m, r) {
    return isTracked(m, r) ? loggedTotal(m, r.id) : actualOr(r);
  }
  function sumExpenseActual(m) {
    return m.expenses.reduce(function (t, r) { return t + expenseActualOf(m, r); }, 0);
  }
  function css(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  }

  /* ============================================================
     RENDERING
     ============================================================ */
  function render() {
    document.getElementById("monthText").textContent = monthName(state.selected);
    renderPlan();
    renderActual();
    renderCompare();
    renderHistory();
    renderLog();
    renderForecast();
  }

  /* ============================================================
     FORECAST — project cash, card debt and net worth forward
     ============================================================ */
  function planNet() {
    var m = month();
    return sum(m.income, "planned") - sum(m.expenses, "planned");
  }
  function computeProjection() {
    var f = state.forecast;
    var monthly = f.useNet ? planNet() : (Number(f.monthly) || 0);
    var debit = Number(f.debit) || 0;
    var card = Number(f.card) || 0;
    var apr = Number(f.apr) || 0;
    var H = f.horizon || 12;
    var pts = [{ i: 0, debit: debit, card: card, net: debit - card }];
    var debtFree = card <= 0 ? 0 : null;
    for (var i = 1; i <= H; i++) {
      if (card > 0) card += card * (apr / 1200);      // monthly interest
      var avail = monthly;
      if (avail > 0 && card > 0) {                     // pay down the card first
        var applied = Math.min(avail, card);
        card -= applied; avail -= applied;
      }
      debit += avail;                                  // remainder builds cash (or draws it down)
      if (card < 0) card = 0;
      if (debtFree === null && card <= 0) debtFree = i;
      pts.push({ i: i, debit: debit, card: card, net: debit - card });
    }
    return { pts: pts, monthly: monthly, debtFree: debtFree, H: H };
  }

  function renderForecast() {
    var f = state.forecast;
    // Inputs (rebuilt on full render; safe because editing triggers only output refresh)
    setVal("fcDebit", f.debit);
    setVal("fcCard", f.card);
    setVal("fcApr", f.apr);
    setVal("fcMonthly", f.useNet ? "" : f.monthly);
    var planBtn = document.getElementById("fcUsePlan");
    planBtn.textContent = "Use plan net (" + signedMoney(Math.round(planNet())) + ")";
    planBtn.classList.toggle("on", !!f.useNet);
    document.getElementById("fcHorizon").innerHTML = [6, 12, 24].map(function (h) {
      return '<button class="seg-btn' + (f.horizon === h ? " on" : "") + '" data-horizon="' + h + '">' + h + " mo</button>";
    }).join("");
    renderForecastOutputs();
  }
  function setVal(id, v) {
    var el = document.getElementById(id);
    if (!el || document.activeElement === el) return; // don't clobber while typing
    el.value = (v == null || v === "" || Number(v) === 0) ? "" : String(v);
  }
  function renderForecastOutputs() {
    var pr = computeProjection();
    var now = pr.pts[0].net;
    var end = pr.pts[pr.H].net;
    var dfText = pr.debtFree === 0 ? "No card debt" : (pr.debtFree != null ? "in " + pr.debtFree + " mo" : "Not on track");
    document.getElementById("forecastSummary").innerHTML =
      stat("Net worth now", signedMoney(Math.round(now))) +
      stat("Debt-free", dfText) +
      statAccentNet("In " + pr.H + " months", signedMoney(Math.round(end)), (end - now >= 0 ? "+" : "") + money(Math.round(end - now)) + " vs now", end >= 0);

    document.getElementById("forecastLegend").innerHTML =
      '<span class="key"><i style="background:' + css("--good-fill") + '"></i>Net worth</span>' +
      '<span class="key"><i style="background:' + css("--actual") + '"></i>Card debt</span>';

    var note = document.getElementById("forecastNote");
    if (pr.debtFree === null && (Number(state.forecast.card) || 0) > 0) {
      note.className = "fc-note warn";
      note.textContent = "⚠ Your monthly contribution doesn't cover the card's interest, so the debt keeps growing. Increase it to make progress.";
    } else if (pr.debtFree && pr.debtFree > 0) {
      note.className = "fc-note";
      note.textContent = "At this rate your card is paid off around " + monthName(shiftMonth(state.selected, pr.debtFree)) + ".";
    } else {
      note.className = "fc-note";
      note.textContent = "";
    }
    renderForecastChart(pr);
  }

  function renderForecastChart(pr) {
    var el = document.getElementById("forecastChart");
    var pts = pr.pts;
    var nets = pts.map(function (p) { return p.net; });
    var cards = pts.map(function (p) { return p.card; });
    var maxV = Math.max.apply(null, nets.concat(cards).concat([0]));
    var minV = Math.min.apply(null, nets.concat([0]));
    if (maxV === minV) { maxV += 1; minV -= 1; }
    var span = maxV - minV;
    var W = 320, H = 170, padL = 6, padR = 46, padT = 14, padB = 22;
    var innerW = W - padL - padR, innerH = H - padT - padB;
    var n = pts.length;
    var x = function (i) { return padL + innerW * i / (n - 1); };
    var y = function (v) { return padT + innerH * (1 - (v - minV) / span); };
    var grid = css("--hairline"), muted = css("--muted");
    var netCol = css("--good-fill"), cardCol = css("--actual");
    var zeroY = y(0);

    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Net worth projection">';
    s += '<line x1="' + padL + '" y1="' + zeroY + '" x2="' + (padL + innerW) + '" y2="' + zeroY + '" stroke="' + grid + '" stroke-width="1"/>';
    s += '<text x="' + (padL + innerW + 6) + '" y="' + (zeroY + 4) + '" font-size="10" fill="' + muted + '">$0</text>';

    // debt-free marker
    if (pr.debtFree && pr.debtFree > 0) {
      var dx = x(pr.debtFree);
      s += '<line x1="' + dx + '" y1="' + padT + '" x2="' + dx + '" y2="' + (padT + innerH) + '" stroke="' + grid + '" stroke-width="1" stroke-dasharray="3 3"/>';
      s += '<text x="' + dx + '" y="' + (padT - 3) + '" font-size="9.5" text-anchor="middle" fill="' + muted + '">debt-free</text>';
    }
    function line(vals, col, w) {
      var d = vals.map(function (v, i) { return (i ? "L" : "M") + x(i) + " " + y(v); }).join(" ");
      return '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="' + w + '" stroke-linejoin="round" stroke-linecap="round"/>';
    }
    s += line(cards, cardCol, 1.8);
    s += line(nets, netCol, 2.4);
    // endpoint labels
    s += '<circle cx="' + x(n - 1) + '" cy="' + y(nets[n - 1]) + '" r="3.5" fill="' + netCol + '"/>';
    s += '<text x="' + x(n - 1) + '" y="' + (y(nets[n - 1]) - 8) + '" font-size="10.5" font-weight="700" text-anchor="end" fill="' + netCol + '">' + signedMoney(Math.round(nets[n - 1])) + '</text>';
    // x labels (start & end)
    s += '<text x="' + padL + '" y="' + (H - 6) + '" font-size="9.5" fill="' + muted + '">now</text>';
    s += '<text x="' + (padL + innerW) + '" y="' + (H - 6) + '" font-size="9.5" text-anchor="end" fill="' + muted + '">' + pr.H + ' mo</text>';
    s += "</svg>";
    el.innerHTML = s;
  }

  /* ---------- PLAN ---------- */
  function renderPlan() {
    var m = month();
    var income = sum(m.income, "planned");
    var expenses = sum(m.expenses, "planned");
    var left = income - expenses;

    document.getElementById("planSummary").innerHTML =
      stat("Planned income", money(income)) +
      stat("Planned expenses", money(expenses)) +
      statAccent(left >= 0 ? "Left to save" : "Over budget", signedMoney(left));

    document.getElementById("planIncomeTotal").textContent = money(income);
    document.getElementById("planExpenseTotal").textContent = money(expenses);
    document.getElementById("planIncomeList").innerHTML = m.income.map(function (r, i) { return editRow(r, "income", i, "planned"); }).join("");
    document.getElementById("planExpenseList").innerHTML = m.expenses.map(function (r, i) { return editRow(r, "expense", i, "planned"); }).join("");

    document.getElementById("planChartSub").textContent = money(expenses) + " planned";
    renderDonut(document.getElementById("planChart"), m.expenses, "planned", expenses);
    renderPlanTypes(m);
  }

  /* ---------- ACTUAL ---------- */
  function renderActual() {
    var m = month();
    var incomeActual = m.income.reduce(function (t, r) { return t + actualOr(r); }, 0);
    var expenseActual = sumExpenseActual(m);
    var left = incomeActual - expenseActual;

    document.getElementById("actualSummary").innerHTML =
      stat("Actual income", money(incomeActual)) +
      stat("Actual spent", money(expenseActual)) +
      statAccent(left >= 0 ? "Saved" : "Shortfall", signedMoney(left));

    document.getElementById("actualIncomeTotal").textContent = money(incomeActual);
    document.getElementById("actualExpenseTotal").textContent = money(expenseActual);
    document.getElementById("actualIncomeList").innerHTML = m.income.map(function (r, i) { return actualRow(r, "income", i); }).join("");
    document.getElementById("actualExpenseList").innerHTML = m.expenses.map(function (r, i) { return actualRow(r, "expense", i); }).join("");
  }

  /* ---------- COMPARE ---------- */
  function renderCompare() {
    var m = month();
    var pIncome = sum(m.income, "planned");
    var aIncome = m.income.reduce(function (t, r) { return t + actualOr(r); }, 0);
    var pExp = sum(m.expenses, "planned");
    var aExp = sumExpenseActual(m);
    var pLeft = pIncome - pExp;
    var aLeft = aIncome - aExp;
    var diff = aLeft - pLeft;

    var incomeSub = deltaLabel(aIncome - pIncome, true);
    var spentSub = deltaLabel(aExp - pExp, false);

    document.getElementById("compareSummary").innerHTML =
      statDelta("Income", money(aIncome), incomeSub) +
      statDelta("Spending", money(aExp), spentSub) +
      statAccentNet(aLeft >= 0 ? "Net saved" : "Net shortfall", signedMoney(aLeft), planCompareText(aLeft, pLeft), aLeft >= 0);

    document.getElementById("compareRecap").innerHTML = recapText(aIncome, aExp, pIncome, pExp);

    // Legend
    document.getElementById("compareLegend").innerHTML =
      '<span class="key"><i style="background:' + css("--planned") + '"></i>Planned</span>' +
      '<span class="key"><i style="background:' + css("--actual") + '"></i>Actual</span>';

    renderCompareChart(m);
    renderCompareTable(m);
    renderReflection(m, aIncome, aExp);
  }

  function deltaLabel(delta, higherIsGood) {
    if (Math.round(delta) === 0) return { text: "on plan", cls: "good" };
    var good = higherIsGood ? delta > 0 : delta < 0;
    return { text: signedMoney(delta) + " vs plan", cls: good ? "good" : "over" };
  }
  // "$271 under plan" / "$50 over plan" / "exactly on plan" for the net card.
  function planCompareText(actualNet, plannedNet) {
    var d = Math.round(actualNet - plannedNet);
    if (d === 0) return "exactly on plan";
    if (d > 0) return money(d) + " over plan";
    return money(-d) + " under plan";
  }
  // One plain-English sentence describing the month vs the plan.
  function recapText(aInc, aExp, pInc, pExp) {
    var aNet = aInc - aExp, pNet = pInc - pExp;
    var diff = Math.round(aNet - pNet);
    if (aNet < 0) return "You spent " + money(-aNet) + " more than you earned this month.";
    if (diff === 0) return "You saved " + money(aNet) + " — right on your plan.";
    if (diff > 0) return "You saved " + money(aNet) + " — " + money(diff) + " more than you planned. 🎉";
    return "You saved " + money(aNet) + " — " + money(-diff) + " short of the " + money(pNet) + " you planned to save.";
  }

  /* ---------- Compare: overview chart (income / spending / net) ---------- */
  function renderCompareChart(m) {
    var pIncome = sum(m.income, "planned");
    var aIncome = m.income.reduce(function (t, r) { return t + actualOr(r); }, 0);
    var pExp = sum(m.expenses, "planned");
    var aExp = sumExpenseActual(m);

    var groups = [
      { label: "Income", planned: pIncome, actual: aIncome },
      { label: "Spending", planned: pExp, actual: aExp }
    ];
    var max = Math.max(1, pIncome, aIncome, pExp, aExp);

    var el = document.getElementById("compareChart");
    if (max <= 1) { el.innerHTML = emptyMsg("Add plan and actual amounts to compare."); return; }

    var W = 320, rowH = 58, padL = 4, padR = 4, barH = 15, gap = 6, labelReserve = 62;
    var chartW = W - padL - padR - labelReserve;
    var H = groups.length * rowH + 10;
    var planned = css("--planned"), actual = css("--actual"), muted = css("--muted"), ink = css("--ink-2");
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Planned vs actual overview">';

    groups.forEach(function (g, gi) {
      var y = gi * rowH + 6;
      s += '<text x="' + padL + '" y="' + y + '" font-size="12" font-weight="600" fill="' + ink + '">' + g.label + '</text>';
      var pw = chartW * (g.planned / max);
      var aw = chartW * (g.actual / max);
      var yP = y + 8, yA = yP + barH + gap;
      s += bar(padL, yP, pw, barH, planned);
      s += valLabel(padL + pw, yP + barH / 2, money(g.planned), muted);
      s += bar(padL, yA, aw, barH, actual);
      s += valLabel(padL + aw, yA + barH / 2, money(g.actual), muted);
    });
    s += "</svg>";
    el.innerHTML = s;
  }

  function bar(x, y, w, h, color) {
    w = Math.max(w, 0);
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="4" fill="' + color + '"/>';
  }
  function valLabel(x, y, text, color) {
    return '<text x="' + (x + 6) + '" y="' + (y + 4) + '" font-size="11" fill="' + color + '" font-variant-numeric="tabular-nums">' + text + '</text>';
  }

  /* ---------- Compare: per-category table with dual bars ---------- */
  function renderCompareTable(m) {
    var rows = m.expenses.filter(function (r) {
      return (Number(r.planned) || 0) > 0 || expenseActualOf(m, r) > 0;
    });
    var el = document.getElementById("compareTable");
    if (!rows.length) { el.innerHTML = emptyMsg("No spending yet this month."); return; }

    var max = Math.max.apply(null, rows.map(function (r) {
      return Math.max(Number(r.planned) || 0, expenseActualOf(m, r));
    }).concat([1]));

    el.innerHTML = rows.map(function (r) {
      var p = Number(r.planned) || 0;
      var a = expenseActualOf(m, r);
      var delta = Math.round(a - p);
      var dcls, dtext;
      if (delta === 0) { dcls = "good"; dtext = "on plan"; }
      else if (delta > 0) { dcls = "over"; dtext = money(delta) + " over"; }
      else { dcls = "good"; dtext = money(-delta) + " under"; }
      // vs last month
      var prev = prevMonthActual(r.name);
      var vsLast = "";
      if (prev != null) {
        var d2 = Math.round(a - prev);
        if (d2 === 0) vsLast = '<span class="cmp-vs">— same as last month</span>';
        else vsLast = '<span class="cmp-vs ' + (d2 > 0 ? "up" : "down") + '">' + (d2 > 0 ? "▲ " : "▼ ") + money(Math.abs(d2)) + ' vs last mo</span>';
      }
      return '' +
        '<div class="cmp-row">' +
          '<div class="cmp-top">' +
            '<span class="cmp-name"><span class="cmp-ico">' + svgIcon(rowIcon(r, "expense")) + '</span>' + esc(r.name) + '</span>' +
            '<span class="cmp-delta ' + dcls + '">' + dtext + '</span>' +
          '</div>' +
          '<div class="cmp-bars">' +
            '<div class="cmp-bar-track"><div class="cmp-bar-fill p" style="width:' + pct(p, max) + '%"></div></div>' +
            '<div class="cmp-bar-track"><div class="cmp-bar-fill a" style="width:' + pct(a, max) + '%"></div></div>' +
          '</div>' +
          '<div class="cmp-nums"><span>Planned ' + money(p) + '</span><span>Actual ' + money(a) + '</span></div>' +
          vsLast +
        '</div>';
    }).join("");
  }
  function pct(v, max) { return Math.max(0, Math.min(100, (v / max) * 100)); }

  /* ============================================================
     HISTORY
     ============================================================ */
  function monthTotals(m) {
    var pIncome = sum(m.income, "planned");
    var pExp = sum(m.expenses, "planned");
    var aIncome = m.income.reduce(function (t, r) { return t + actualOr(r); }, 0);
    var aExp = sumExpenseActual(m);
    var hasActual = monthLog(m).length > 0 || m.income.concat(m.expenses).some(function (r) {
      return r.actual != null && r.actual !== "";
    });
    // "Effective" = what really happened if logged, otherwise the plan.
    var income = hasActual ? aIncome : pIncome;
    var spent = hasActual ? aExp : pExp;
    return { pIncome: pIncome, pExp: pExp, aIncome: aIncome, aExp: aExp,
             hasActual: hasActual, income: income, spent: spent, net: income - spent };
  }
  function hasData(m) {
    var t = monthTotals(m);
    return t.pIncome > 0 || t.pExp > 0 || t.aIncome > 0 || t.aExp > 0;
  }

  function renderHistory() {
    var keys = Object.keys(state.months).filter(function (k) { return hasData(state.months[k]); });
    keys.sort(); // ascending by "YYYY-MM"

    var sumEl = document.getElementById("historySummary");
    var chartEl = document.getElementById("historyChart");
    var listEl = document.getElementById("historyList");
    var subEl = document.getElementById("historyTrendSub");

    if (!keys.length) {
      sumEl.innerHTML = "";
      subEl.textContent = "";
      chartEl.innerHTML = emptyMsg("Once you plan and track a month, your history builds here.");
      listEl.innerHTML = "";
      document.getElementById("catTrendCard").hidden = true;
      return;
    }
    renderCatTrend(keys);

    var logged = keys.filter(function (k) { return monthTotals(state.months[k]).hasActual; });
    var totalSaved = logged.reduce(function (t, k) { return t + monthTotals(state.months[k]).net; }, 0);
    var avg = logged.length ? totalSaved / logged.length : 0;

    sumEl.innerHTML =
      stat("Months tracked", String(keys.length)) +
      stat("Total saved", signedMoney(totalSaved)) +
      statAccent("Avg / month", signedMoney(Math.round(avg)));

    subEl.textContent = logged.length ? logged.length + " month" + (logged.length > 1 ? "s" : "") + " logged" : "planned only";
    renderTrend(chartEl, keys);

    // Month list, most recent first.
    var desc = keys.slice().reverse();
    listEl.innerHTML = desc.map(function (k) {
      var t = monthTotals(state.months[k]);
      var cls = t.net >= 0 ? "good" : "over";
      var tag = t.hasActual ? "" : '<span class="hist-tag">planned</span>';
      var barMax = Math.max(t.income, t.spent, 1);
      return '' +
        '<button class="hist-row" data-gomonth="' + k + '">' +
          '<div class="hist-main">' +
            '<div class="hist-top">' +
              '<span class="hist-month">' + monthName(k) + tag + '</span>' +
              '<span class="hist-net ' + cls + '">' + signedMoney(t.net) + '</span>' +
            '</div>' +
            '<div class="hist-bars">' +
              '<div class="hist-bar-track"><div class="hist-bar in" style="width:' + pct(t.income, barMax) + '%"></div></div>' +
              '<div class="hist-bar-track"><div class="hist-bar out" style="width:' + pct(t.spent, barMax) + '%"></div></div>' +
            '</div>' +
            '<div class="hist-nums"><span>In ' + money(t.income) + '</span><span>Out ' + money(t.spent) + '</span></div>' +
          '</div>' +
          '<span class="hist-chev">&#8250;</span>' +
        '</button>';
    }).join("");
  }

  // Net-savings-over-time line chart (single series, zero baseline).
  function renderTrend(el, keys) {
    var pts = keys.map(function (k) { return { k: k, net: monthTotals(state.months[k]).net }; });
    if (pts.length < 2) {
      // A single month: show its net as a simple figure rather than a 1-point line.
      var only = pts[0];
      el.innerHTML = '<div class="trend-single ' + (only.net >= 0 ? "good" : "over") + '">' +
        signedMoney(only.net) + '<span>net in ' + monthName(only.k) + '</span></div>';
      return;
    }

    var W = 320, H = 150, padL = 8, padR = 44, padT = 12, padB = 22;
    var innerW = W - padL - padR, innerH = H - padT - padB;
    var vals = pts.map(function (p) { return p.net; });
    var maxV = Math.max.apply(null, vals.concat([0]));
    var minV = Math.min.apply(null, vals.concat([0]));
    if (maxV === minV) { maxV += 1; minV -= 1; }
    var span = maxV - minV;
    var x = function (i) { return padL + (pts.length === 1 ? innerW / 2 : innerW * i / (pts.length - 1)); };
    var y = function (v) { return padT + innerH * (1 - (v - minV) / span); };

    var ink = css("--ink-2"), muted = css("--muted"), grid = css("--hairline");
    var lineCol = css("--brand"), good = css("--good-fill"), over = css("--over");
    var zeroY = y(0);

    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Net savings by month">';
    // zero baseline
    s += '<line x1="' + padL + '" y1="' + zeroY + '" x2="' + (padL + innerW) + '" y2="' + zeroY + '" stroke="' + grid + '" stroke-width="1"/>';
    s += '<text x="' + (padL + innerW + 6) + '" y="' + (zeroY + 4) + '" font-size="10" fill="' + muted + '">$0</text>';

    // line path
    var d = pts.map(function (p, i) { return (i === 0 ? "M" : "L") + x(i) + " " + y(p.net); }).join(" ");
    s += '<path d="' + d + '" fill="none" stroke="' + lineCol + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';

    // markers + x labels
    pts.forEach(function (p, i) {
      var col = p.net >= 0 ? good : over;
      s += '<circle cx="' + x(i) + '" cy="' + y(p.net) + '" r="4" fill="' + col + '" stroke="' + css("--surface") + '" stroke-width="1.5"/>';
      // label only the endpoints to avoid clutter
      if (i === 0 || i === pts.length - 1) {
        var lbl = keyToDate(p.k).toLocaleDateString(undefined, { month: "short" });
        var anchor = i === 0 ? "start" : "end";
        s += '<text x="' + x(i) + '" y="' + (H - 6) + '" font-size="10" text-anchor="' + anchor + '" fill="' + muted + '">' + lbl + '</text>';
      }
    });
    // value label on the latest point
    var last = pts[pts.length - 1];
    s += '<text x="' + (x(pts.length - 1)) + '" y="' + (y(last.net) - 9) + '" font-size="11" font-weight="700" text-anchor="end" fill="' + (last.net >= 0 ? good : over) + '">' + signedMoney(last.net) + '</text>';
    s += "</svg>";
    el.innerHTML = s;
  }

  /* ============================================================
     LOG (running tracker for variable expenses)
     ============================================================ */
  function renderLog() {
    var m = month();
    var log = monthLog(m);
    var entries = log.slice().sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });

    // Category <select> — remember the last-used category.
    var sel = document.getElementById("logCat");
    var opts = m.expenses.map(function (r) {
      return '<option value="' + r.id + '">' + esc(r.name) + "</option>";
    }).join("");
    sel.innerHTML = opts;
    if (state.lastLogCat && m.expenses.some(function (r) { return r.id === state.lastLogCat; })) {
      sel.value = state.lastLogCat;
    }
    var dateEl = document.getElementById("logDate");
    if (!dateEl.value) dateEl.value = isoToday();

    // Summary strip.
    var total = entries.reduce(function (t, e) { return t + (Number(e.amount) || 0); }, 0);
    var trackedCats = m.expenses.filter(function (r) { return isTracked(m, r); });
    document.getElementById("logSummary").innerHTML =
      stat("Entries", String(entries.length)) +
      stat("Categories", String(trackedCats.length)) +
      statAccent("Logged", money(total));

    // Per-category totals (the running "add up to topics" view).
    var totalsEl = document.getElementById("logTotals");
    if (!trackedCats.length) {
      totalsEl.innerHTML = emptyMsg("Log a purchase above and it adds up here — and fills in that category's actual.");
    } else {
      totalsEl.innerHTML = trackedCats.map(function (r) {
        var t = loggedTotal(m, r.id);
        var p = Number(r.planned) || 0;
        var n = loggedEntries(m, r.id).length;
        var over = p > 0 && t > p;
        var remain = p > 0 ? (over ? money(t - p) + " over" : money(p - t) + " left") : "no budget set";
        return '<div class="logtot">' +
            iconChip(rowIcon(r, "expense"), rowColor("expense", m.expenses.indexOf(r))) +
            '<div class="logtot-main">' +
              '<div class="logtot-top"><span class="logtot-name">' + esc(r.name) + '</span>' +
                '<span class="logtot-val">' + money(t) + '</span></div>' +
              '<div class="logtot-sub"><span>' + n + ' item' + (n === 1 ? '' : 's') +
                (p > 0 ? ' · planned ' + money(p) : '') + '</span>' +
                '<span class="' + (over ? 'over' : 'muted2') + '">' + remain + '</span></div>' +
            '</div>' +
          '</div>';
      }).join("");
    }

    // Entry list (most recent first).
    var listEl = document.getElementById("logList");
    document.getElementById("logCount").textContent = entries.length ? money(total) : "";
    if (!entries.length) {
      listEl.innerHTML = emptyMsg("No entries yet this month.");
      return;
    }
    listEl.innerHTML = entries.map(function (e) {
      var cat = m.expenses.filter(function (r) { return r.id === e.catId; })[0];
      var icon = cat ? rowIcon(cat, "expense") : "tag";
      var catName = cat ? cat.name : "(deleted category)";
      var d = e.ts ? new Date(e.ts) : null;
      var dateStr = d ? d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";
      var label = e.note ? esc(e.note) : esc(catName);
      var subline = (e.note ? esc(catName) + " · " : "") + dateStr;
      return '<div class="logrow" data-eid="' + e.id + '" data-editentry="' + e.id + '">' +
          '<span class="logrow-ico">' + svgIcon(icon) + '</span>' +
          '<div class="logrow-main">' +
            '<span class="logrow-label">' + label + '</span>' +
            '<span class="logrow-sub">' + subline + '</span>' +
          '</div>' +
          '<span class="logrow-amt">' + money(e.amount) + '</span>' +
        '</div>';
    }).join("");
  }

  function addLogEntry() {
    var m = month();
    var sel = document.getElementById("logCat");
    var amtInput = document.getElementById("logAmount");
    var noteInput = document.getElementById("logNote");
    var dateInput = document.getElementById("logDate");
    var catId = sel.value;
    var amount = parseFloat(String(amtInput.value).replace(/[^0-9.]/g, ""));
    if (!catId || !amount || amount <= 0) { toast("Enter an amount and pick a category."); return; }
    monthLog(m).push({ id: uid(), catId: catId, amount: amount, note: noteInput.value.trim(), ts: tsFromDate(dateInput.value) });
    state.lastLogCat = catId;
    amtInput.value = "";
    noteInput.value = "";
    save();
    render();
    amtInput.focus();
  }

  /* ---------- Donut chart ---------- */
  function renderDonut(el, list, field, total) {
    var items = list
      .map(function (r, i) { return { name: r.name, val: Number(r[field]) || 0, i: i, icon: rowIcon(r, "expense") }; })
      .filter(function (x) { return x.val > 0; })
      .sort(function (a, b) { return b.val - a.val; });

    if (!items.length || total <= 0) {
      el.innerHTML = emptyMsg("Add expense amounts to see the breakdown.");
      return;
    }

    // Fold beyond 7 slots into "Other" (reserve slot 8 for Other).
    var shown = items;
    if (items.length > 8) {
      var head = items.slice(0, 7);
      var restVal = items.slice(7).reduce(function (t, x) { return t + x.val; }, 0);
      head.push({ name: "Other", val: restVal, i: -1, icon: "tag" });
      shown = head;
    }

    var cx = 90, cy = 90, r = 72, sw = 26;
    var circ = 2 * Math.PI * r;
    var offset = 0;
    var arcs = "";
    shown.forEach(function (x, idx) {
      var frac = x.val / total;
      var len = frac * circ;
      var color = css(SERIES[idx % SERIES.length]);
      // 2px surface gap between segments
      var gapPx = 2;
      arcs += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" ' +
              'stroke="' + color + '" stroke-width="' + sw + '" ' +
              'stroke-dasharray="' + Math.max(len - gapPx, 0.001) + ' ' + (circ - Math.max(len - gapPx, 0.001)) + '" ' +
              'stroke-dashoffset="' + (-offset) + '" transform="rotate(-90 ' + cx + ' ' + cy + ')"/>';
      offset += len;
    });

    var svg =
      '<svg viewBox="0 0 180 180" role="img" aria-label="Expense breakdown">' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + css("--surface-2") + '" stroke-width="' + sw + '"/>' +
        arcs +
        '<text x="' + cx + '" y="' + (cy - 4) + '" text-anchor="middle" class="donut-center-val">' + money(total) + '</text>' +
        '<text x="' + cx + '" y="' + (cy + 14) + '" text-anchor="middle" class="donut-center-lbl">total</text>' +
      '</svg>';

    var legend = '<div class="leg-list">' + shown.map(function (x, idx) {
      var color = css(SERIES[idx % SERIES.length]);
      var p = Math.round((x.val / total) * 100);
      return '<div class="leg-item">' +
        '<span class="swatch" style="background:' + color + '"></span>' +
        '<span class="leg-ico">' + svgIcon(x.icon || "tag") + '</span>' +
        '<span class="leg-name">' + esc(x.name) + '</span>' +
        '<span class="leg-val">' + money(x.val) + '</span>' +
        '<span class="leg-pct">' + p + '%</span>' +
      '</div>';
    }).join("") + '</div>';

    el.innerHTML = '<div class="donut-wrap">' + svg + legend + '</div>';
  }

  /* ---------- Row templates ---------- */
  function rowColor(type, i) {
    return type === "expense" ? css(SERIES[i % SERIES.length]) : css("--good-fill");
  }
  // Tappable icon badge tinted with the category's color (keeps color identity
  // and adds a recognisable icon). Tapping opens the icon picker.
  function iconBadgeBtn(r, type, color) {
    return '<button class="ico-badge" data-iconpick="1" style="--bc:' + color + '" aria-label="Change icon">' + svgIcon(rowIcon(r, type)) + '</button>';
  }
  function iconChip(iconKey, color) {
    return '<span class="ico-chip" style="--bc:' + color + '">' + svgIcon(iconKey) + '</span>';
  }
  function editRow(r, type, i, field) {
    var color = rowColor(type, i);
    return '' +
      '<div class="row" data-type="' + type + '" data-i="' + i + '">' +
        '<span class="drag-handle" data-drag="1" aria-label="Drag to reorder" title="Drag to reorder">&#8942;&#8942;</span>' +
        iconBadgeBtn(r, type, color) +
        '<input class="name" value="' + esc(r.name) + '" data-field="name" placeholder="Name" />' +
        '<span class="amount-field"><span class="cur">$</span>' +
        '<input class="amount" inputmode="decimal" data-field="' + field + '" value="' + amtVal(r[field]) + '" placeholder="0" /></span>' +
        '<button class="del" data-del="1" aria-label="Delete">&times;</button>' +
      '</div>';
  }
  function actualRow(r, type, i) {
    var color = rowColor(type, i);
    var planned = Number(r.planned) || 0;
    var m = month();
    var tracked = type === "expense" && isTracked(m, r);
    var amountCell;
    var sub = 'planned ' + money(planned);
    if (tracked) {
      var n = loggedEntries(m, r.id).length;
      sub = 'from Log · ' + n + ' item' + (n === 1 ? '' : 's');
      amountCell =
        '<span class="amount-field readonly" data-gotolog="1"><span class="cur">$</span>' +
        '<span class="amount ro">' + Math.round(loggedTotal(m, r.id)).toLocaleString() + '</span></span>';
    } else {
      amountCell =
        '<span class="amount-field"><span class="cur">$</span>' +
        '<input class="amount" inputmode="decimal" data-field="actual" value="' + amtVal(r.actual) + '" placeholder="' + planned + '" /></span>';
    }
    var quick = type === "expense"
      ? '<button class="quick-log" data-quicklog="' + r.id + '" aria-label="Log a purchase">+</button>'
      : '';
    return '' +
      '<div class="row" data-type="' + type + '" data-i="' + i + '">' +
        iconBadgeBtn(r, type, color) +
        '<span class="name" style="opacity:.95">' + esc(r.name) +
          '<span style="display:block;font-size:11px;color:var(--muted)">' + sub + '</span>' +
        '</span>' +
        amountCell + quick +
      '</div>';
  }
  function amtVal(v) { return v == null || v === "" ? "" : String(v); }

  /* ---------- Stat card templates ---------- */
  function stat(label, value) {
    return '<div class="stat"><span class="stat-label">' + label + '</span><span class="stat-value">' + value + '</span></div>';
  }
  function statAccent(label, value) {
    return '<div class="stat accent"><span class="stat-label">' + label + '</span><span class="stat-value">' + value + '</span></div>';
  }
  function statAccentNet(label, value, sub, positive) {
    return '<div class="stat accent' + (positive ? '' : ' neg') + '">' +
      '<span class="stat-label">' + label + '</span>' +
      '<span class="stat-value">' + value + '</span>' +
      '<span class="stat-accent-sub">' + sub + '</span></div>';
  }
  function statDelta(label, value, delta) {
    return '<div class="stat"><span class="stat-label">' + label + '</span><span class="stat-value">' + value +
      '</span><span class="stat-sub ' + delta.cls + '">' + delta.text + '</span></div>';
  }

  function emptyMsg(t) { return '<div class="empty">' + t + '</div>'; }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ============================================================
     EVENTS
     ============================================================ */
  // Sidebar drawer: open, close, navigate, and run menu actions.
  var navDrawer = document.getElementById("navDrawer");
  document.getElementById("navBtn").addEventListener("click", function () { openDrawer(); });
  function openDrawer() { navDrawer.hidden = false; }
  function closeDrawer() { navDrawer.hidden = true; }
  navDrawer.addEventListener("click", function (e) {
    // Tap the backdrop (outside the panel) closes.
    if (e.target === navDrawer) { closeDrawer(); return; }
    var nav = e.target.closest("[data-view]");
    if (nav) { switchView(nav.dataset.view); closeDrawer(); return; }
    var act = e.target.closest("[data-action]");
    if (act) {
      var action = act.dataset.action;
      closeDrawer();
      if (action === "copyPrev") copyPrevious();
      else if (action === "export") exportData();
      else if (action === "exportCsv") exportCsv();
      else if (action === "import") document.getElementById("importFile").click();
      else if (action === "clearMonth") clearMonth();
      else if (action === "settings") openSettings();
    }
  });
  // Primary views live on the bottom bar.
  document.getElementById("tabbar").addEventListener("click", function (e) {
    var btn = e.target.closest(".tab");
    if (btn) switchView(btn.dataset.view);
  });
  function switchView(view) {
    currentView = view;
    document.querySelectorAll("[data-view]").forEach(function (t) {
      t.classList.toggle("is-active", t.dataset.view === view);
    });
    ["plan", "actual", "compare", "history", "log", "forecast"].forEach(function (v) {
      document.getElementById("view-" + v).hidden = v !== view;
    });
    document.getElementById("content").scrollTop = 0;
    window.scrollTo(0, 0);
  }

  // Month navigation
  document.getElementById("prevMonth").addEventListener("click", function () { changeMonth(-1); });
  document.getElementById("nextMonth").addEventListener("click", function () { changeMonth(1); });
  function changeMonth(delta) {
    state.selected = shiftMonth(state.selected, delta);
    ensureMonth(state.selected);
    save(); render();
  }

  // Delegated input handling (name + amount edits)
  document.getElementById("content").addEventListener("input", function (e) {
    var input = e.target;
    // Monthly reflection notes
    if (input.id === "reflectWell") { month().reflection.wentWell = input.value; save(); return; }
    if (input.id === "reflectImprove") { month().reflection.improve = input.value; save(); return; }
    // Forecast inputs
    if (input.id === "fcDebit" || input.id === "fcCard" || input.id === "fcApr" || input.id === "fcMonthly") {
      var num = parseFloat(String(input.value).replace(/[^0-9.]/g, ""));
      if (isNaN(num)) num = 0;
      if (input.id === "fcDebit") state.forecast.debit = num;
      else if (input.id === "fcCard") state.forecast.card = num;
      else if (input.id === "fcApr") state.forecast.apr = num;
      else { state.forecast.monthly = num; state.forecast.useNet = false; document.getElementById("fcUsePlan").classList.remove("on"); }
      save(); renderForecastOutputs();
      return;
    }
    if (!input.classList.contains("name") && !input.classList.contains("amount")) return;
    var rowEl = input.closest(".row");
    if (!rowEl) return;
    var type = rowEl.dataset.type;
    var i = parseInt(rowEl.dataset.i, 10);
    var list = type === "income" ? month().income : month().expenses;
    var rec = list[i];
    if (!rec) return;
    var field = input.dataset.field;
    if (field === "name") {
      rec.name = input.value;
    } else {
      var v = input.value.replace(/[^0-9.]/g, "");
      rec[field] = v === "" ? (field === "actual" ? null : 0) : parseFloat(v);
    }
    save();
    scheduleSummaryRefresh();
  });

  // Delete + add rows (click)
  document.getElementById("content").addEventListener("click", function (e) {
    // Icon picker
    var pick = e.target.closest("[data-iconpick]");
    if (pick) {
      var pr = pick.closest(".row");
      openIconPicker(pr.dataset.type, parseInt(pr.dataset.i, 10));
      return;
    }
    // Add a log entry (main form)
    if (e.target.closest("#logAddBtn")) { addLogEntry(); return; }
    // Forecast: horizon + use-plan-net
    var hz = e.target.closest("[data-horizon]");
    if (hz) { state.forecast.horizon = parseInt(hz.dataset.horizon, 10); save(); renderForecast(); return; }
    if (e.target.closest("#fcUsePlan")) {
      state.forecast.useNet = !state.forecast.useNet;
      save(); renderForecast();
      return;
    }
    // Quick-log a purchase straight from an Actual expense row
    var quick = e.target.closest("[data-quicklog]");
    if (quick) { openEntrySheet("add", { catId: quick.dataset.quicklog }); return; }
    // Tap a log entry to edit it
    var editEntry = e.target.closest("[data-editentry]");
    if (editEntry) { openEntrySheet("edit", { id: editEntry.dataset.editentry }); return; }
    // Tapping a tracked (read-only) actual jumps to the Log
    if (e.target.closest("[data-gotolog]")) { switchView("log"); return; }
    // Jump to a month from history
    var go = e.target.closest("[data-gomonth]");
    if (go) {
      state.selected = go.dataset.gomonth;
      ensureMonth(state.selected);
      save();
      switchView("compare");
      render();
      return;
    }
    var del = e.target.closest("[data-del]");
    if (del) {
      var rowEl = del.closest(".row");
      var type = rowEl.dataset.type;
      var i = parseInt(rowEl.dataset.i, 10);
      var list = type === "income" ? month().income : month().expenses;
      list.splice(i, 1);
      save(); render();
      return;
    }
    var add = e.target.closest("[data-add]");
    if (add) {
      var t = add.dataset.add;
      if (t === "income") month().income.push(row("New income", 0));
      else month().expenses.push(row("New category", 0));
      save(); render();
    }
  });

  // Enter key in the Log quick-add fields submits the entry.
  document.getElementById("content").addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;
    if (e.target.id === "logAmount" || e.target.id === "logNote") {
      e.preventDefault();
      addLogEntry();
    }
  });

  // Drag-to-reorder for the Plan lists. Dragging by the handle moves the row's
  // DOM node live; on release we rebuild the underlying array from DOM order.
  var drag = null;
  var contentEl = document.getElementById("content");
  contentEl.addEventListener("pointerdown", function (e) {
    var handle = e.target.closest(".drag-handle");
    if (!handle) return;
    var rowEl = handle.closest(".row");
    var listEl = rowEl.parentElement;
    e.preventDefault();
    try { handle.setPointerCapture(e.pointerId); } catch (err) {}
    drag = { row: rowEl, list: listEl, id: e.pointerId, handle: handle };
    rowEl.classList.add("dragging");
    document.body.classList.add("is-dragging");
  });
  contentEl.addEventListener("pointermove", function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    e.preventDefault();
    var y = e.clientY;
    var siblings = Array.prototype.slice.call(drag.list.querySelectorAll(".row:not(.dragging)"));
    var before = null;
    for (var i = 0; i < siblings.length; i++) {
      var box = siblings[i].getBoundingClientRect();
      if (y < box.top + box.height / 2) { before = siblings[i]; break; }
    }
    if (before) drag.list.insertBefore(drag.row, before);
    else drag.list.appendChild(drag.row);
  });
  function endDrag(e) {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    var listEl = drag.list;
    var type = drag.row.dataset.type;
    var order = Array.prototype.slice.call(listEl.querySelectorAll(".row"))
      .map(function (r) { return parseInt(r.dataset.i, 10); });
    var arr = type === "income" ? month().income : month().expenses;
    var reordered = order.map(function (idx) { return arr[idx]; });
    if (type === "income") month().income = reordered;
    else month().expenses = reordered;
    drag.row.classList.remove("dragging");
    document.body.classList.remove("is-dragging");
    drag = null;
    save();
    render();
  }
  contentEl.addEventListener("pointerup", endDrag);
  contentEl.addEventListener("pointercancel", endDrag);

  // Light refresh of summaries/charts while typing (debounced) without
  // rebuilding inputs (which would lose focus).
  var refreshTimer = null;
  function scheduleSummaryRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(function () {
      if (currentView === "plan") {
        var m = month();
        var income = sum(m.income, "planned"), expenses = sum(m.expenses, "planned"), left = income - expenses;
        document.getElementById("planSummary").innerHTML =
          stat("Planned income", money(income)) + stat("Planned expenses", money(expenses)) +
          statAccent(left >= 0 ? "Left to save" : "Over budget", signedMoney(left));
        document.getElementById("planIncomeTotal").textContent = money(income);
        document.getElementById("planExpenseTotal").textContent = money(expenses);
        document.getElementById("planChartSub").textContent = money(expenses) + " planned";
        renderDonut(document.getElementById("planChart"), m.expenses, "planned", expenses);
      } else if (currentView === "actual") {
        renderActual2();
      }
    }, 350);
  }
  // Refresh actual summary without rebuilding the input list
  function renderActual2() {
    var m = month();
    var incomeActual = m.income.reduce(function (t, r) { return t + actualOr(r); }, 0);
    var expenseActual = sumExpenseActual(m);
    var left = incomeActual - expenseActual;
    document.getElementById("actualSummary").innerHTML =
      stat("Actual income", money(incomeActual)) + stat("Actual spent", money(expenseActual)) +
      statAccent(left >= 0 ? "Saved" : "Shortfall", signedMoney(left));
    document.getElementById("actualIncomeTotal").textContent = money(incomeActual);
    document.getElementById("actualExpenseTotal").textContent = money(expenseActual);
  }

  /* ---------- Icon picker sheet ---------- */
  var iconSheet = document.getElementById("iconSheet");
  var iconGrid = document.getElementById("iconGrid");
  var pickTarget = null; // { type, index }

  // Build the grid once (an "Auto" reset chip + the icon choices).
  iconGrid.innerHTML =
    '<button class="icon-opt icon-auto" data-icon="__auto__" title="Auto from name">Aa</button>' +
    ICON_CHOICES.map(function (ic) {
      return '<button class="icon-opt" data-icon="' + ic + '">' + svgIcon(ic) + '</button>';
    }).join("");

  function currentPickRec() {
    if (!pickTarget) return null;
    var list = pickTarget.type === "income" ? month().income : month().expenses;
    return list[pickTarget.index] || null;
  }
  function renderGroupPick() {
    var rec = currentPickRec();
    var showGroup = pickTarget && pickTarget.type === "expense" && rec;
    document.getElementById("groupPick").hidden = !showGroup;
    document.getElementById("groupPickTitle").hidden = !showGroup;
    if (!showGroup) return;
    var active = rowGroup(rec);
    document.getElementById("groupPick").innerHTML = GROUPS.map(function (g) {
      return '<button class="seg-btn' + (g.key === active ? " on" : "") + '" data-group="' + g.key + '">' + g.label + "</button>";
    }).join("");
  }
  function openIconPicker(type, index) {
    pickTarget = { type: type, index: index };
    renderGroupPick();
    iconSheet.hidden = false;
  }
  iconSheet.addEventListener("click", function (e) {
    if (e.target === iconSheet || e.target.closest(".sheet-close")) { iconSheet.hidden = true; return; }
    var grp = e.target.closest("[data-group]");
    if (grp) {
      var recg = currentPickRec();
      if (recg) { recg.group = grp.dataset.group; save(); render(); renderGroupPick(); }
      return;
    }
    var opt = e.target.closest("[data-icon]");
    if (!opt || !pickTarget) return;
    var rec = currentPickRec();
    if (rec) {
      var chosen = opt.dataset.icon;
      rec.icon = chosen === "__auto__" ? null : chosen;
      save(); render();
    }
    iconSheet.hidden = true;
  });

  /* ---------- Menu actions (wired from the sidebar) ---------- */
  function copyPrevious() {
    var prevKey = shiftMonth(state.selected, -1);
    var prev = state.months[prevKey];
    if (!prev) { toast("No previous month to copy from."); return; }
    month().income = prev.income.map(function (r) { return row(r.name, r.planned); });
    month().expenses = prev.expenses.map(function (r) { return row(r.name, r.planned); });
    save(); render();
    toast("Copied plan from " + monthName(prevKey) + ".");
  }

  function clearMonth() {
    state.months[state.selected] = defaultMonth();
    save(); render();
    toast("Month reset.");
  }

  function exportData() {
    var blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "kakeibo-backup-" + monthKey(new Date()) + ".json";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  document.getElementById("importFile").addEventListener("change", function (e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        if (data && data.months) {
          state = data;
          if (!state.selected || !state.months[state.selected]) state.selected = monthKey(new Date());
          save(); render();
          toast("Backup imported.");
        } else { toast("That file doesn't look like a Kakeibo backup."); }
      } catch (err) { toast("Could not read that file."); }
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  /* ---------- Toast ---------- */
  var toastTimer = null;
  function toast(msg) {
    var t = document.getElementById("toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "toast";
      t.style.cssText = "position:fixed;left:50%;bottom:calc(90px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);background:#0b0b0b;color:#fff;padding:10px 16px;border-radius:12px;font-size:13.5px;z-index:60;max-width:90%;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.3);opacity:0;transition:opacity .2s;";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    requestAnimationFrame(function () { t.style.opacity = "1"; });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.style.opacity = "0"; }, 2200);
  }

  /* ============================================================
     SETTINGS · PIN LOCK · CSV · REFLECTION · GROUPS · ENTRY EDIT
     ============================================================ */

  /* ---------- PIN lock ---------- */
  function hashPin(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) { h = ((h << 5) + h) + s.charCodeAt(i); h |= 0; }
    return "h" + (h >>> 0);
  }
  var lockMode = "verify", lockEntry = "", lockFirst = "", lockStage = 0;
  function maybeLock() { if (state.settings.pin) showLock("verify"); }
  function showLock(mode) {
    lockMode = mode; lockEntry = ""; lockFirst = "";
    lockStage = mode === "verify" ? 0 : 1;
    document.getElementById("lockScreen").hidden = false;
    renderLockPad();
    refreshLock();
  }
  function hideLock() { document.getElementById("lockScreen").hidden = true; }
  function renderLockPad() {
    var keys = ["1","2","3","4","5","6","7","8","9","","0","del"];
    document.getElementById("lockPad").innerHTML = keys.map(function (k) {
      if (k === "") return "<span></span>";
      if (k === "del") return '<button class="lock-key ghost" data-k="del" aria-label="Delete">' + svgIcon("backspace") + "</button>";
      return '<button class="lock-key" data-k="' + k + '">' + k + "</button>";
    }).join("");
  }
  function refreshLock() {
    document.getElementById("lockTitle").textContent =
      lockMode === "verify" ? "Enter PIN" : (lockStage === 1 ? "Create a PIN" : "Confirm PIN");
    var dots = "";
    for (var i = 0; i < 4; i++) dots += '<span class="lock-dot' + (i < lockEntry.length ? " on" : "") + '"></span>';
    document.getElementById("lockDots").innerHTML = dots;
  }
  function shakeLock() {
    var el = document.querySelector("#lockScreen .lock-inner");
    if (!el) return;
    el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake");
  }
  function onPinComplete() {
    if (lockMode === "verify") {
      if (hashPin(lockEntry) === state.settings.pin) { hideLock(); }
      else { shakeLock(); lockEntry = ""; refreshLock(); document.getElementById("lockTitle").textContent = "Wrong PIN"; }
      return;
    }
    if (lockStage === 1) { lockFirst = lockEntry; lockEntry = ""; lockStage = 2; refreshLock(); return; }
    if (lockEntry === lockFirst) {
      state.settings.pin = hashPin(lockEntry); save(); hideLock(); toast("PIN set.");
      renderLockControls();
    } else {
      shakeLock(); lockEntry = ""; lockFirst = ""; lockStage = 1; refreshLock();
      document.getElementById("lockTitle").textContent = "Didn't match — retry";
    }
  }
  document.getElementById("lockPad").addEventListener("click", function (e) {
    var b = e.target.closest("[data-k]"); if (!b) return;
    var k = b.dataset.k;
    if (k === "del") { lockEntry = lockEntry.slice(0, -1); refreshLock(); return; }
    if (lockEntry.length >= 4) return;
    lockEntry += k; refreshLock();
    if (lockEntry.length === 4) setTimeout(onPinComplete, 130);
  });

  /* ---------- Settings sheet ---------- */
  var settingsSheet = document.getElementById("settingsSheet");
  function openSettings() { renderThemePick(); renderLockControls(); settingsSheet.hidden = false; }
  function renderThemePick() {
    var opts = [["auto", "Auto"], ["light", "Light"], ["dark", "Dark"]];
    document.getElementById("themePick").innerHTML = opts.map(function (o) {
      return '<button class="seg-btn' + (state.settings.theme === o[0] ? " on" : "") + '" data-settheme="' + o[0] + '">' + o[1] + "</button>";
    }).join("");
  }
  function renderLockControls() {
    var el = document.getElementById("lockControls");
    if (state.settings.pin) {
      el.innerHTML = '<button class="sheet-item" data-lock="change">Change PIN</button>' +
                     '<button class="sheet-item danger" data-lock="remove">Remove PIN</button>';
    } else {
      el.innerHTML = '<button class="sheet-item" data-lock="set">Set a PIN</button>' +
                     '<p class="reflect-note">A passcode to open the app on this device. It is a casual lock, not encryption.</p>';
    }
  }
  settingsSheet.addEventListener("click", function (e) {
    if (e.target === settingsSheet || e.target.closest(".sheet-close")) { settingsSheet.hidden = true; return; }
    var th = e.target.closest("[data-settheme]");
    if (th) { setTheme(th.dataset.settheme); renderThemePick(); return; }
    var lk = e.target.closest("[data-lock]");
    if (lk) {
      var a = lk.dataset.lock;
      if (a === "set" || a === "change") { settingsSheet.hidden = true; showLock(a === "set" ? "set" : "change"); }
      else if (a === "remove") { state.settings.pin = null; save(); renderLockControls(); toast("PIN removed."); }
    }
  });

  /* ---------- CSV export ---------- */
  function downloadBlob(content, filename, type) {
    var blob = new Blob([content], { type: type });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }
  function csvCell(v) { v = String(v == null ? "" : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function exportCsv() {
    var m = month();
    var rows = [["Type", "Category", "Group", "Planned", "Actual"]];
    m.income.forEach(function (r) { rows.push(["Income", r.name, "", Number(r.planned) || 0, actualOr(r)]); });
    m.expenses.forEach(function (r) { rows.push(["Expense", r.name, GROUP_MAP[rowGroup(r)].label, Number(r.planned) || 0, expenseActualOf(m, r)]); });
    rows.push([]);
    rows.push(["Log date", "Category", "Amount", "Note", ""]);
    monthLog(m).slice().sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); }).forEach(function (en) {
      var cat = m.expenses.filter(function (r) { return r.id === en.catId; })[0];
      rows.push([en.ts ? new Date(en.ts).toISOString().slice(0, 10) : "", cat ? cat.name : "", en.amount, en.note || "", ""]);
    });
    var csv = rows.map(function (r) { return r.map(csvCell).join(","); }).join("\n");
    downloadBlob(csv, "kakeibo-" + state.selected + ".csv", "text/csv");
  }

  /* ---------- Kakeibo "by type" breakdown ---------- */
  function renderPlanTypes(m) {
    var el = document.getElementById("planTypes");
    var totals = { needs: 0, wants: 0, culture: 0, extra: 0 };
    m.expenses.forEach(function (r) { totals[rowGroup(r)] += Number(r.planned) || 0; });
    var sum = totals.needs + totals.wants + totals.culture + totals.extra;
    if (sum <= 0) { el.innerHTML = emptyMsg("Set expense amounts to see your Needs / Wants / Culture / Extra split."); return; }
    var bar = '<div class="type-bar">' + GROUPS.map(function (g) {
      var v = totals[g.key]; if (v <= 0) return "";
      return '<span style="width:' + (v / sum * 100) + '%;background:' + css(g.color) + '"></span>';
    }).join("") + "</div>";
    var legend = GROUPS.map(function (g) {
      var v = totals[g.key];
      return '<div class="type-row">' +
        '<span class="type-dot" style="background:' + css(g.color) + '"></span>' +
        '<span class="type-name">' + g.label + '<span class="type-sub"> · ' + g.sub + '</span></span>' +
        '<span class="type-val">' + money(v) + '</span>' +
        '<span class="type-pct">' + Math.round(v / sum * 100) + '%</span>' +
      '</div>';
    }).join("");
    el.innerHTML = bar + '<div class="type-legend">' + legend + '</div>';
  }

  /* ---------- Monthly reflection ---------- */
  function renderReflection(m, aIncome, aExp) {
    var net = aIncome - aExp;
    document.getElementById("reflectionSummary").innerHTML =
      '<span>Had <b>' + money(aIncome) + '</b></span>' +
      '<span>Spent <b>' + money(aExp) + '</b></span>' +
      '<span class="' + (net >= 0 ? "good" : "over") + '">Saved <b>' + signedMoney(net) + '</b></span>';
    document.getElementById("reflectWell").value = m.reflection.wentWell || "";
    document.getElementById("reflectImprove").value = m.reflection.improve || "";
  }

  /* ---------- Category trend (History) ---------- */
  function allCategoryNames() {
    var names = {}, order = [];
    Object.keys(state.months).forEach(function (k) {
      state.months[k].expenses.forEach(function (r) {
        if (!names[r.name]) { names[r.name] = true; order.push(r.name); }
      });
    });
    return order;
  }
  function renderCatTrend(keys) {
    var sel = document.getElementById("catTrendSel");
    var names = allCategoryNames();
    var card = document.getElementById("catTrendCard");
    if (!names.length || keys.length < 1) { card.hidden = true; return; }
    card.hidden = false;
    sel.innerHTML = names.map(function (n) { return '<option value="' + esc(n) + '">' + esc(n) + "</option>"; }).join("");
    if (state.catTrend && names.indexOf(state.catTrend) >= 0) sel.value = state.catTrend;
    else state.catTrend = sel.value;
    var target = sel.value;
    var pts = keys.map(function (k) {
      var m = state.months[k];
      var r = m.expenses.filter(function (x) { return x.name === target; })[0];
      return { k: k, val: r ? expenseActualOf(m, r) : 0 };
    });
    renderBars(document.getElementById("catTrendChart"), pts, css("--actual"));
  }
  function renderBars(el, pts, color) {
    if (!pts.length) { el.innerHTML = emptyMsg("No data yet."); return; }
    var max = Math.max.apply(null, pts.map(function (p) { return p.val; }).concat([1]));
    var W = 320, H = 130, padB = 22, padT = 16, n = pts.length;
    var gap = 8, bw = (W - gap * (n - 1)) / n, muted = css("--muted");
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="By month">';
    pts.forEach(function (p, i) {
      var x = i * (bw + gap);
      var h = (H - padB - padT) * (p.val / max);
      var y = H - padB - h;
      s += '<rect x="' + x + '" y="' + y + '" width="' + bw + '" height="' + Math.max(h, 1) + '" rx="4" fill="' + color + '"/>';
      if (p.val > 0) s += '<text x="' + (x + bw / 2) + '" y="' + (y - 5) + '" font-size="9.5" text-anchor="middle" fill="' + muted + '">' + money(p.val) + '</text>';
      s += '<text x="' + (x + bw / 2) + '" y="' + (H - 7) + '" font-size="9.5" text-anchor="middle" fill="' + muted + '">' + keyToDate(p.k).toLocaleDateString(undefined, { month: "short" }) + '</text>';
    });
    s += "</svg>";
    el.innerHTML = s;
  }
  document.getElementById("catTrendSel").addEventListener("change", function () {
    state.catTrend = this.value; save();
    var keys = Object.keys(state.months).filter(function (k) { return hasData(state.months[k]); }).sort();
    renderCatTrend(keys);
  });

  /* ---------- Previous-month actual for a category (vs last month) ---------- */
  function prevMonthActual(catName) {
    var prevKey = mostRecentBefore(state.selected);
    if (!prevKey) return null;
    var pm = state.months[prevKey];
    var r = pm.expenses.filter(function (x) { return x.name === catName; })[0];
    return r ? expenseActualOf(pm, r) : null;
  }

  /* ---------- Log entry add/edit sheet ---------- */
  var entrySheet = document.getElementById("entrySheet");
  var entryEditId = null;
  function fillEntryCats() {
    var m = month();
    document.getElementById("entryCat").innerHTML = m.expenses.map(function (r) {
      return '<option value="' + r.id + '">' + esc(r.name) + "</option>";
    }).join("");
  }
  function isoToday() { return new Date().toISOString().slice(0, 10); }
  function tsFromDate(str) {
    if (!str) return Date.now();
    var p = str.split("-");
    return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10), 12, 0, 0).getTime();
  }
  function openEntrySheet(mode, opts) {
    fillEntryCats();
    document.getElementById("entryTitle").textContent = mode === "edit" ? "Edit entry" : "Add a purchase";
    document.getElementById("entryDelete").hidden = mode !== "edit";
    if (mode === "edit") {
      entryEditId = opts.id;
      var e = monthLog(month()).filter(function (x) { return x.id === opts.id; })[0];
      if (!e) return;
      document.getElementById("entryCat").value = e.catId;
      document.getElementById("entryAmount").value = e.amount;
      document.getElementById("entryNote").value = e.note || "";
      document.getElementById("entryDate").value = e.ts ? new Date(e.ts).toISOString().slice(0, 10) : isoToday();
    } else {
      entryEditId = null;
      if (opts && opts.catId) document.getElementById("entryCat").value = opts.catId;
      document.getElementById("entryAmount").value = "";
      document.getElementById("entryNote").value = "";
      document.getElementById("entryDate").value = isoToday();
    }
    entrySheet.hidden = false;
    setTimeout(function () { document.getElementById("entryAmount").focus(); }, 60);
  }
  entrySheet.addEventListener("click", function (e) {
    if (e.target === entrySheet || e.target.closest(".sheet-close")) { entrySheet.hidden = true; return; }
    if (e.target.closest("#entrySave")) { saveEntry(); return; }
    if (e.target.closest("#entryDelete")) {
      var lg = monthLog(month());
      for (var i = 0; i < lg.length; i++) if (lg[i].id === entryEditId) { lg.splice(i, 1); break; }
      save(); entrySheet.hidden = true; render();
      return;
    }
  });
  function saveEntry() {
    var m = month();
    var catId = document.getElementById("entryCat").value;
    var amount = parseFloat(String(document.getElementById("entryAmount").value).replace(/[^0-9.]/g, ""));
    var note = document.getElementById("entryNote").value.trim();
    var ts = tsFromDate(document.getElementById("entryDate").value);
    if (!catId || !amount || amount <= 0) { toast("Enter an amount and category."); return; }
    if (entryEditId) {
      var e = monthLog(m).filter(function (x) { return x.id === entryEditId; })[0];
      if (e) { e.catId = catId; e.amount = amount; e.note = note; e.ts = ts; }
    } else {
      monthLog(m).push({ id: uid(), catId: catId, amount: amount, note: note, ts: ts });
      state.lastLogCat = catId;
    }
    save(); entrySheet.hidden = true; render();
  }

  /* ---------- Theme ---------- */
  function resolveTheme() {
    var t = state.settings.theme;
    if (t === "light" || t === "dark") return t;
    return (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
  }
  function applyTheme() {
    var resolved = resolveTheme();
    document.documentElement.setAttribute("data-theme", resolved);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", resolved === "dark" ? "#0a0c10" : "#eceef3");
  }
  function setTheme(t) {
    state.settings.theme = t;
    save(); applyTheme(); render();
  }

  /* ---------- Boot ---------- */
  applyTheme();
  // Fill static chrome icons (tab bar, sidebar) from the icon set.
  Array.prototype.forEach.call(document.querySelectorAll("[data-ic]"), function (el) {
    el.innerHTML = svgIcon(el.dataset.ic);
  });
  maybeLock();
  render();

  // Re-render / re-theme when the OS scheme changes (matters for "auto").
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
      applyTheme(); render();
    });
  }

  // Register service worker for offline use, and auto-refresh when a newer
  // version takes over (backs up the worker's own client.navigate()).
  if ("serviceWorker" in navigator) {
    var swReloaded = false;
    var hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (swReloaded || !hadController) return; // don't reload on first install
      swReloaded = true;
      window.location.reload();
    });
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").then(function (reg) {
        reg.update();
      }).catch(function () {});
    });
  }
})();
