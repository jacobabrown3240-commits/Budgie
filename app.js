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

  /* ---------- Icons ---------- */
  // Auto-pick an emoji from the category name so the obvious things get an
  // icon without any setup. A row can override this via the icon picker.
  var EXPENSE_RULES = [
    [/rent|mortgage|housing|apartment|landlord|hoa/i, "🏠"],       // 🏠
    [/grocer|food|supermarket|market/i, "🛒"],                     // 🛒
    [/gas|fuel|petrol/i, "⛽"],                                          // ⛽
    [/transport|car|auto|uber|lyft|bus|train|subway|metro|commut|parking|toll/i, "🚗"], // 🚗
    [/util|electric|water|power|heat|sewage/i, "💡"],              // 💡
    [/internet|wifi|broadband/i, "🌐"],                            // 🌐
    [/phone|mobile|cell/i, "📱"],                                  // 📱
    [/coffee|cafe/i, "☕"],                                              // ☕
    [/dining|restaurant|eat|takeout|lunch|dinner|drinks|bar/i, "🍽️"], // 🍽️
    [/subscri|netflix|spotify|stream|hulu|disney|prime/i, "📺"],   // 📺
    [/sav|invest|401|ira|emergency/i, "🏦"],                       // 🏦
    [/gym|fitness|workout|sport/i, "🏋️"],                     // 🏋️
    [/health|medical|doctor|dentist|pharmacy|meds|medic/i, "🩺"],  // 🩺
    [/entertain|movie|cinema|concert|hobby/i, "🎬"],               // 🎬
    [/game|gaming/i, "🎮"],                                        // 🎮
    [/shop|clothe|apparel|amazon|retail/i, "🛍️"],            // 🛍️
    [/insur/i, "🛡️"],                                        // 🛡️
    [/educat|school|tuition|book|course|student|class/i, "🎓"],    // 🎓
    [/pet|dog|cat|vet/i, "🐾"],                                    // 🐾
    [/travel|vacation|flight|hotel|trip|airbnb/i, "✈️"],           // ✈️
    [/kid|child|baby|daycare|childcare|diaper/i, "🧸"],            // 🧸
    [/debt|loan|credit|repay/i, "💳"],                             // 💳
    [/gift|present|donat|charity|tithe/i, "🎁"],                   // 🎁
    [/beauty|hair|salon|cosmet|nails/i, "💄"],                     // 💄
    [/laundry|clean/i, "🧹"],                                      // 🧹
    [/tax/i, "🧾"]                                                 // 🧾
  ];
  var INCOME_RULES = [
    [/paycheck|salary|wage|job|employ|payroll/i, "💼"],            // 💼
    [/side|gig|freelance|contract|1099|consult/i, "🧑‍💻"], // 🧑‍💻
    [/bonus/i, "🎉"],                                              // 🎉
    [/interest|dividend|invest|capital|stock|crypto/i, "📈"],      // 📈
    [/gift/i, "🎁"],                                               // 🎁
    [/refund|rebate|tax/i, "🧾"],                                  // 🧾
    [/rent|rental/i, "🏠"],                                        // 🏠
    [/business|sales|shop/i, "🏪"]                                 // 🏪
  ];
  var ICON_CHOICES = [
    "🏠","🛒","🚗","⛽","💡","🌐","📱","🍽️",
    "☕","📺","🏦","🏋️","🩺","🎬","🎮","🛍️",
    "🛡️","🎓","🐾","✈️","🧸","💳","🎁","💄",
    "🧹","🧾","💼","🧑‍💻","📈","🎉","💵","💸"
  ];
  function iconFor(name, type) {
    var rules = type === "income" ? INCOME_RULES : EXPENSE_RULES;
    var n = String(name || "");
    for (var i = 0; i < rules.length; i++) if (rules[i][0].test(n)) return rules[i][1];
    return type === "income" ? "💵" : "💸"; // 💵 / 💸
  }
  function rowIcon(r, type) { return r.icon ? r.icon : iconFor(r.name, type); }

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
            '<span class="cmp-name"><span class="cmp-ico">' + rowIcon(r, "expense") + '</span>' + esc(r.name) + '</span>' +
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
      var icon = cat ? rowIcon(cat, "expense") : "🏷️";
      var catName = cat ? cat.name : "(deleted category)";
      var d = e.ts ? new Date(e.ts) : null;
      var dateStr = d ? d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";
      var label = e.note ? esc(e.note) : esc(catName);
      var subline = (e.note ? esc(catName) + " · " : "") + dateStr;
      return '<div class="logrow" data-eid="' + e.id + '">' +
          '<span class="logrow-ico">' + icon + '</span>' +
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
      head.push({ name: "Other", val: restVal, i: -1, icon: "🗂️" });
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
        '<span class="leg-ico">' + (x.icon || "") + '</span>' +
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
  // Tappable emoji badge tinted with the category's color (keeps color identity
  // and adds a recognisable icon). Tapping opens the icon picker.
  function iconBadgeBtn(r, type, color) {
    return '<button class="ico-badge" data-iconpick="1" style="--bc:' + color + '" aria-label="Change icon">' + rowIcon(r, type) + '</button>';
  }
  function iconChip(icon, color) {
    return '<span class="ico-chip" style="--bc:' + color + '">' + icon + '</span>';
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

  // Build the grid once (an "Auto" reset chip + the emoji choices).
  iconGrid.innerHTML =
    '<button class="icon-opt icon-auto" data-icon="__auto__" title="Auto from name">Aa</button>' +
    ICON_CHOICES.map(function (ic) {
      return '<button class="icon-opt" data-icon="' + ic + '">' + ic + '</button>';
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
  render();

  // Re-render on theme change so SVG colors update.
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", render);
  }

  // Register service worker for offline use.
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }
})();
