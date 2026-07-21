/* ============================================================
   Budgie — a phone-first monthly budget planner & tracker.
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
      ]
    };
  }
  function row(name, planned) {
    return { id: uid(), name: name, planned: planned, actual: null };
  }
  function uid() { return Math.random().toString(36).slice(2, 9); }

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
    var expenseActual = m.expenses.reduce(function (t, r) { return t + actualOr(r); }, 0);
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
    var aExp = m.expenses.reduce(function (t, r) { return t + actualOr(r); }, 0);
    var pLeft = pIncome - pExp;
    var aLeft = aIncome - aExp;
    var diff = aLeft - pLeft;

    var incomeSub = deltaLabel(aIncome - pIncome, true);
    var spentSub = deltaLabel(aExp - pExp, false);

    document.getElementById("compareSummary").innerHTML =
      statDelta("Income vs plan", money(aIncome), incomeSub) +
      statDelta("Spending vs plan", money(aExp), spentSub) +
      statAccent(diff >= 0 ? "Better by" : "Worse by", signedMoney(diff));

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
    return { text: signedMoney(delta), cls: good ? "good" : "over" };
  }

  /* ---------- Compare: overview chart (income / spending / net) ---------- */
  function renderCompareChart(m) {
    var pIncome = sum(m.income, "planned");
    var aIncome = m.income.reduce(function (t, r) { return t + actualOr(r); }, 0);
    var pExp = sum(m.expenses, "planned");
    var aExp = m.expenses.reduce(function (t, r) { return t + actualOr(r); }, 0);

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
      return (Number(r.planned) || 0) > 0 || actualOr(r) > 0;
    });
    var el = document.getElementById("compareTable");
    if (!rows.length) { el.innerHTML = emptyMsg("No spending yet this month."); return; }

    var max = Math.max.apply(null, rows.map(function (r) {
      return Math.max(Number(r.planned) || 0, actualOr(r));
    }).concat([1]));

    el.innerHTML = rows.map(function (r) {
      var p = Number(r.planned) || 0;
      var a = actualOr(r);
      var delta = a - p;
      var dcls = Math.round(delta) === 0 ? "good" : (delta <= 0 ? "good" : "over");
      var dtext = Math.round(delta) === 0 ? "on plan" : signedMoney(delta);
      return '' +
        '<div class="cmp-row">' +
          '<div class="cmp-top">' +
            '<span class="cmp-name">' + esc(r.name) + '</span>' +
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

  /* ---------- Donut chart ---------- */
  function renderDonut(el, list, field, total) {
    var items = list
      .map(function (r, i) { return { name: r.name, val: Number(r[field]) || 0, i: i }; })
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
      head.push({ name: "Other", val: restVal, i: -1 });
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
        '<span class="leg-name">' + esc(x.name) + '</span>' +
        '<span class="leg-val">' + money(x.val) + '</span>' +
        '<span class="leg-pct">' + p + '%</span>' +
      '</div>';
    }).join("") + '</div>';

    el.innerHTML = '<div class="donut-wrap">' + svg + legend + '</div>';
  }

  /* ---------- Row templates ---------- */
  function editRow(r, type, i, field) {
    var color = type === "expense" ? css(SERIES[i % SERIES.length]) : css("--good-fill");
    return '' +
      '<div class="row" data-type="' + type + '" data-i="' + i + '">' +
        '<span class="dot" style="background:' + color + '"></span>' +
        '<input class="name" value="' + esc(r.name) + '" data-field="name" placeholder="Name" />' +
        '<span class="amount-field"><span class="cur">$</span>' +
        '<input class="amount" inputmode="decimal" data-field="' + field + '" value="' + amtVal(r[field]) + '" placeholder="0" /></span>' +
        '<button class="del" data-del="1" aria-label="Delete">&times;</button>' +
      '</div>';
  }
  function actualRow(r, type, i) {
    var color = type === "expense" ? css(SERIES[i % SERIES.length]) : css("--good-fill");
    var planned = Number(r.planned) || 0;
    return '' +
      '<div class="row" data-type="' + type + '" data-i="' + i + '">' +
        '<span class="dot" style="background:' + color + '"></span>' +
        '<span class="name" style="opacity:.95">' + esc(r.name) +
          '<span style="display:block;font-size:11px;color:var(--muted)">planned ' + money(planned) + '</span>' +
        '</span>' +
        '<span class="amount-field"><span class="cur">$</span>' +
        '<input class="amount" inputmode="decimal" data-field="actual" value="' + amtVal(r.actual) + '" placeholder="' + planned + '" /></span>' +
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
  // Tab switching
  document.getElementById("tabbar").addEventListener("click", function (e) {
    var btn = e.target.closest(".tab");
    if (!btn) return;
    currentView = btn.dataset.view;
    document.querySelectorAll(".tab").forEach(function (t) { t.classList.toggle("is-active", t === btn); });
    ["plan", "actual", "compare"].forEach(function (v) {
      document.getElementById("view-" + v).hidden = v !== currentView;
    });
    document.getElementById("content").scrollTop = 0;
    window.scrollTo(0, 0);
  });

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
    var expenseActual = m.expenses.reduce(function (t, r) { return t + actualOr(r); }, 0);
    var left = incomeActual - expenseActual;
    document.getElementById("actualSummary").innerHTML =
      stat("Actual income", money(incomeActual)) + stat("Actual spent", money(expenseActual)) +
      statAccent(left >= 0 ? "Saved" : "Shortfall", signedMoney(left));
    document.getElementById("actualIncomeTotal").textContent = money(incomeActual);
    document.getElementById("actualExpenseTotal").textContent = money(expenseActual);
  }

  /* ---------- Menu sheet ---------- */
  var sheet = document.getElementById("menuSheet");
  document.getElementById("menuBtn").addEventListener("click", function () { sheet.hidden = false; });
  sheet.addEventListener("click", function (e) {
    if (e.target === sheet || e.target.closest(".sheet-close")) { sheet.hidden = true; return; }
    var item = e.target.closest("[data-action]");
    if (!item) return;
    var action = item.dataset.action;
    sheet.hidden = true;
    if (action === "copyPrev") copyPrevious();
    else if (action === "export") exportData();
    else if (action === "import") document.getElementById("importFile").click();
    else if (action === "clearMonth") clearMonth();
  });

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
    a.download = "budgie-backup-" + monthKey(new Date()) + ".json";
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
        } else { toast("That file doesn't look like a Budgie backup."); }
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
