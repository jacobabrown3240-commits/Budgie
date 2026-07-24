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
      log: []
    };
  }
  function row(name, planned, icon) {
    return { id: uid(), name: name, planned: planned, actual: null, icon: icon || null };
  }
  function uid() { return Math.random().toString(36).slice(2, 9); }

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
  if (!state.selected) state.selected = monthKey(new Date());
  if (!state.months[state.selected]) state.months[state.selected] = defaultMonth();

  var currentView = "plan";

  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (e) { /* storage full / private mode — ignore */ }
  }
  function month() {
    if (!state.months[state.selected]) state.months[state.selected] = defaultMonth();
    return state.months[state.selected];
  }

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
      return;
    }

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
      return '<option value="' + r.id + '">' + rowIcon(r, "expense") + "  " + esc(r.name) + "</option>";
    }).join("");
    sel.innerHTML = opts;
    if (state.lastLogCat && m.expenses.some(function (r) { return r.id === state.lastLogCat; })) {
      sel.value = state.lastLogCat;
    }

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
      return '<div class="logrow" data-eid="' + e.id + '">' +
          '<span class="logrow-ico">' + svgIcon(icon) + '</span>' +
          '<div class="logrow-main">' +
            '<span class="logrow-label">' + label + '</span>' +
            '<span class="logrow-sub">' + subline + '</span>' +
          '</div>' +
          '<span class="logrow-amt">' + money(e.amount) + '</span>' +
          '<button class="del" data-delentry="1" aria-label="Delete entry">&times;</button>' +
        '</div>';
    }).join("");
  }

  function addLogEntry() {
    var m = month();
    var sel = document.getElementById("logCat");
    var amtInput = document.getElementById("logAmount");
    var noteInput = document.getElementById("logNote");
    var catId = sel.value;
    var amount = parseFloat(String(amtInput.value).replace(/[^0-9.]/g, ""));
    if (!catId || !amount || amount <= 0) { toast("Enter an amount and pick a category."); return; }
    monthLog(m).push({ id: uid(), catId: catId, amount: amount, note: noteInput.value.trim(), ts: Date.now() });
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
    return '' +
      '<div class="row" data-type="' + type + '" data-i="' + i + '">' +
        iconBadgeBtn(r, type, color) +
        '<span class="name" style="opacity:.95">' + esc(r.name) +
          '<span style="display:block;font-size:11px;color:var(--muted)">' + sub + '</span>' +
        '</span>' +
        amountCell +
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
      else if (action === "import") document.getElementById("importFile").click();
      else if (action === "clearMonth") clearMonth();
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
    ["plan", "actual", "compare", "history", "log"].forEach(function (v) {
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
    if (!state.months[state.selected]) state.months[state.selected] = defaultMonth();
    save(); render();
  }

  // Delegated input handling (name + amount edits)
  document.getElementById("content").addEventListener("input", function (e) {
    var input = e.target;
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
    // Add a log entry
    if (e.target.closest("#logAddBtn")) { addLogEntry(); return; }
    // Delete a log entry
    var delEntry = e.target.closest("[data-delentry]");
    if (delEntry) {
      var eid = delEntry.closest(".logrow").dataset.eid;
      var lg = monthLog(month());
      for (var li = 0; li < lg.length; li++) {
        if (lg[li].id === eid) { lg.splice(li, 1); break; }
      }
      save(); render();
      return;
    }
    // Tapping a tracked (read-only) actual jumps to the Log
    if (e.target.closest("[data-gotolog]")) { switchView("log"); return; }
    // Jump to a month from history
    var go = e.target.closest("[data-gomonth]");
    if (go) {
      state.selected = go.dataset.gomonth;
      if (!state.months[state.selected]) state.months[state.selected] = defaultMonth();
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

  function openIconPicker(type, index) {
    pickTarget = { type: type, index: index };
    iconSheet.hidden = false;
  }
  iconSheet.addEventListener("click", function (e) {
    if (e.target === iconSheet || e.target.closest(".sheet-close")) { iconSheet.hidden = true; return; }
    var opt = e.target.closest("[data-icon]");
    if (!opt || !pickTarget) return;
    var list = pickTarget.type === "income" ? month().income : month().expenses;
    var rec = list[pickTarget.index];
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

  /* ---------- Boot ---------- */
  // Fill static chrome icons (tab bar, sidebar) from the icon set.
  Array.prototype.forEach.call(document.querySelectorAll("[data-ic]"), function (el) {
    el.innerHTML = svgIcon(el.dataset.ic);
  });
  render();

  // Re-render on theme change so SVG colors update.
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", render);
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
