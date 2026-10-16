/* ============================================================================
   PAY STATEMENT  (Payouts → Pay team)
   ----------------------------------------------------------------------------
   What each person earned between two dates, worked out automatically from
   data that already exists — nothing new is stored:

   SALARY (employees with a monthly salary)
     • Paid days = days present + APPROVED paid leave (casual, sick, earned,
       comp-off). A half day = 1/2 day; a half-day leave pays 1/2 plus the
       other half if the person worked it.
     • Not paid: absent without approved leave, Loss-of-Pay leave, and leave
       still waiting for approval (it becomes paid once approved).
     • Daily rate = monthly salary ÷ the working days in that month (week-offs
       and holidays from HR settings are not working days), so someone paid
       every working day gets the full salary.
     • Days before the joining date, future days and today (if not logged in
       yet) are not counted.

   HOURLY (no salary, only a cost-per-hour rate)
     • Hours on duty (attendance) × hourly rate.

   ON TOP OF SALARY / HOURLY — from the pay ledger, by the date of the entry
     • Task pay      = fixed-price task credits − late-slab cuts + dispute credits
     • Milestone pay = milestone pay credited to the person
     • Bonus / adjustments (positive or negative)
     • Penalties     = penalty deductions by penalty date, minus anything given
                       back on appeal
     • Paid          = payments recorded in the period (undone payments excluded)

   Net earned = salary (or hourly) + task + milestone + bonus − penalties
   Balance    = net earned − paid in the period
   ============================================================================ */
'use strict';

var PS = {
  preset: 'this_month', from: '', to: '',
  empId: '', deptId: '', basis: '', inactive: false,
  data: null, rows: null
};

function psIso(d) { return Utils.isoDate(d); }
function psR(p) { return Utils.fmtRupee(Math.round(p || 0)).replace('.00', ''); }
function psDays(n) { n = Math.round(n * 100) / 100; return (n % 1 ? n.toFixed(1).replace(/\.0$/, '') : String(n)); }
function psHrs(secs) { return (Math.round((secs || 0) / 360) / 10) + 'h'; }
function psFmt(iso) { return iso ? new Date(iso + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'; }

function psRange(key) {
  var t = new Date(), y = t.getFullYear(), m = t.getMonth();
  if (key === 'last_month') return { from: psIso(new Date(y, m - 1, 1)), to: psIso(new Date(y, m, 0)) };
  if (key === 'last_7') { var a = new Date(t); a.setDate(a.getDate() - 6); return { from: psIso(a), to: psIso(t) }; }
  if (key === 'this_week') { var w = new Date(t); w.setDate(w.getDate() - ((w.getDay() + 6) % 7)); return { from: psIso(w), to: psIso(t) }; }
  if (key === 'this_year') return { from: y + '-01-01', to: psIso(t) };
  if (key === 'fy') { var fy = m >= 3 ? y : y - 1; return { from: fy + '-04-01', to: psIso(t) }; }
  return { from: psIso(new Date(y, m, 1)), to: psIso(new Date(y, m + 1, 0)) };   // this month
}
if (!PS.from) { var _r0 = psRange(PS.preset); PS.from = _r0.from; PS.to = _r0.to; }

/* week-offs, holidays and leave come from the HR module (works in both modes) */
function psLoad() {
  var DB = DataAPI.raw();
  var H = typeof HRM !== 'undefined' ? HRM : null;
  var safe = function (p, fb) { return p && p.then ? p.catch(function () { return fb; }) : Promise.resolve(fb); };
  return Promise.all([
    H ? safe(H.getPolicy(), DB.hrPolicy || null) : Promise.resolve(DB.hrPolicy || null),
    H ? safe(H.getHolidays(), DB.holidays || []) : Promise.resolve(DB.holidays || []),
    H ? safe(H.getLeaveRequests({}), DB.leaveRequests || []) : Promise.resolve(DB.leaveRequests || [])
  ]).then(function (r) {
    PS.data = { policy: r[0] || { weekOff: [0, 6], fullDaySecs: 8 * 3600 }, holidays: r[1] || [], leaves: r[2] || [] };
    return PS.data;
  });
}

/* ── the calculation for one employee ─────────────────────────────────── */
function psCompute(e, from, to, ctx) {
  var DB = DataAPI.raw();
  var today = psIso(new Date());
  var weekOff = (ctx.policy && ctx.policy.weekOff) || [0, 6];
  var hol = {}; (ctx.holidays || []).forEach(function (h) { if (!h.optional) hol[h.date] = h.name || 'Holiday'; });
  var isWork = function (iso) { return weekOff.indexOf(new Date(iso + 'T12:00:00').getDay()) < 0 && !hol[iso]; };

  /* working days of a whole calendar month (cached) */
  var wdCache = {};
  var monthWD = function (ym) {
    if (wdCache[ym] != null) return wdCache[ym];
    var y = +ym.slice(0, 4), m = +ym.slice(5, 7) - 1, n = new Date(y, m + 1, 0).getDate(), c = 0;
    for (var d = 1; d <= n; d++) if (isWork(psIso(new Date(y, m, d, 12)))) c++;
    return (wdCache[ym] = c || 1);
  };

  var salary = Number(e.monthlySalaryPaise) || 0;
  var hourly = Number(e.costPerHourPaise) || (salary ? Utils.hourlyCostFromSalary(salary, e.hoursPerDay || 8) : 0);
  var basis = salary > 0 ? 'SALARY' : hourly > 0 ? 'HOURLY' : 'TASK';

  var att = {}; (DB.attendance || []).forEach(function (a) { if (Number(a.employeeId) === Number(e.id)) att[a.date] = a; });
  var LT = (typeof HRM !== 'undefined' && HRM.LEAVE_TYPES) || {};
  var leaveName = function (t) { return (LT[t] && LT[t].label) || ({ CL: 'Casual leave', SL: 'Sick leave', EL: 'Earned leave', COMP: 'Comp off', LOP: 'Loss of pay' })[t] || 'Leave'; };
  var leavePaid = function (t) { return t === 'LOP' ? false : (LT[t] ? LT[t].paid !== false : true); };
  var pending = {};
  (ctx.leaves || []).forEach(function (l) {
    if (Number(l.employeeId) !== Number(e.id) || l.status !== 'PENDING') return;
    (Array.isArray(l.dates) && l.dates.length ? l.dates : [l.fromDate]).forEach(function (dt) { pending[dt] = l; });
  });

  var joined = e.joinedAt ? String(e.joinedAt).slice(0, 10) : '';
  var start = joined && joined > from ? joined : from;
  var end = to < today ? to : today;

  /* Pay = days present x daily rate (a half day counts as 1/2).
     Days not present (absent or on leave) are simply not paid.
     Penalties you apply are deducted separately. */
  var s = {
    workingDays: 0, weekOffs: 0, holidays: 0, present: 0, halfDays: 0, onLeave: 0, absent: 0,
    paidLeave: 0, unpaidLeave: 0, pendingLeave: 0, daysPaid: 0, fullSalary: 0, salaryEarned: 0, dutySecs: 0, timerSecs: 0, hourlyEarned: 0, days: [], months: {}
  };

  if (start <= end) {
    var d = new Date(start + 'T12:00:00'), stop = new Date(end + 'T12:00:00'), guard = 0;
    while (d <= stop && guard++ < 800) {
      var iso = psIso(d), ym = iso.slice(0, 7);
      d.setDate(d.getDate() + 1);
      var a = att[iso];
      if (a) s.dutySecs += Number(a.activeSecs) || 0;
      if (!isWork(iso)) {
        if (hol[iso]) { s.holidays++; s.days.push({ date: iso, code: 'H', label: hol[iso] }); }
        else { s.weekOffs++; s.days.push({ date: iso, code: 'W', label: 'Week off' }); }
        continue;
      }
      var rate = salary ? salary / monthWD(ym) : 0;
      if (!s.months[ym]) s.months[ym] = { workingDays: monthWD(ym), rate: rate, counted: 0 };
      var worked = a && (a.status === 'PRESENT' || (Number(a.activeSecs) || 0) > 0 || a.firstInAt);
      var code, label, paid = 0;
      if (a && a.status === 'ON_LEAVE') {                       // approved full-day leave
        s.onLeave++;
        if (leavePaid(a.leaveType)) { s.paidLeave++; paid = 1; code = 'PL'; label = leaveName(a.leaveType) + ' (approved) — paid'; }
        else { s.unpaidLeave++; code = 'L'; label = leaveName(a.leaveType) + ' — not paid'; }
      } else if (a && a.status === 'HALF_DAY' && a.leaveType) {  // approved half-day leave
        s.halfDays++;
        var lp = leavePaid(a.leaveType), workedHalf = (Number(a.activeSecs) || 0) > 0 || !!a.firstInAt;
        if (lp) { s.paidLeave += 0.5; paid += 0.5; } else { s.unpaidLeave += 0.5; }
        if (workedHalf) { s.present += 0.5; paid += 0.5; }
        code = 'HD'; label = 'Half-day ' + leaveName(a.leaveType).toLowerCase() + (lp ? ' (paid)' : ' (not paid)') + (workedHalf ? ' + worked half' : ' + other half absent');
      } else if (a && a.status === 'HALF_DAY') { s.halfDays++; paid = 0.5; code = 'HD'; label = 'Half day (short hours)'; }
      else if (worked && a.status !== 'ABSENT') { s.present++; paid = 1; code = 'P'; label = 'Present'; }
      else if (iso === today) { s.days.push({ date: iso, code: '', label: 'Today — not logged in yet (not counted)', paid: 0, rate: rate }); continue; }
      else if (pending[iso]) { s.pendingLeave++; s.absent++; code = 'WL'; label = leaveName(pending[iso].type) + ' waiting for your approval — not paid until approved'; }
      else { s.absent++; code = 'A'; label = 'Absent (no approved leave) — not paid'; }
      s.workingDays++;
      s.months[ym].counted++;
      s.daysPaid += paid;
      s.fullSalary += rate; s.salaryEarned += paid * rate;
      s.days.push({ date: iso, code: code, label: label, paid: paid, rate: rate, hours: a ? Number(a.activeSecs) || 0 : 0 });
    }
  }

  (DB.timeEntries || []).forEach(function (t) {
    if (Number(t.employeeId) !== Number(e.id) || !t.startedAt) return;
    var day = String(t.startedAt).slice(0, 10);
    if (day < from || day > to) return;
    var endT = t.endedAt ? new Date(t.endedAt) : new Date();
    s.timerSecs += Math.max(0, Math.floor((endT - new Date(t.startedAt)) / 1000));
  });
  if (basis === 'HOURLY') s.hourlyEarned = s.dutySecs / 3600 * hourly;

  /* ── ledger in the period ── */
  var W = DB.walletEntries || [];
  var payoutIds = {}; W.forEach(function (w) { if (w.type === 'PAYOUT') payoutIds[w.id] = 1; });
  var dateOf = function (w) {
    var m = w.meta || {};
    return String((m.penalty && m.penalty.date) || m.date || w.createdAt || '').slice(0, 10);
  };
  var L = { task: 0, milestone: 0, bonus: 0, penalties: 0, penaltyBack: 0, paid: 0, items: [] };
  W.forEach(function (w) {
    if (Number(w.employeeId) !== Number(e.id)) return;
    var m = w.meta || {};
    if (m.system || m.cancels || (w.type === 'BONUS' && m.direct)) return;      // old payment-as-earnings lines cancel out
    var day = dateOf(w);
    if (!day || day < from || day > to) return;
    var amt = Number(w.amountPaise) || 0, kind = '';
    if (w.type === 'PAYOUT') { L.paid += -amt; kind = 'paid'; }
    else if (m.reversalOf && payoutIds[m.reversalOf]) { L.paid -= amt; kind = 'paid'; }
    else if (w.type === 'TASK_CREDIT' || w.type === 'SLAB_ADJUSTMENT' || w.type === 'DISPUTE_CREDIT') { L.task += amt; kind = 'task'; }
    else if (w.type === 'BONUS' && /^milestone pay/i.test(String(w.why || ''))) { L.milestone += amt; kind = 'milestone'; }
    else if (w.type === 'DEDUCTION') { L.penalties += -amt; kind = 'penalty'; }
    else if (m.appealAdjustment || m.penaltyAppealId) { L.penaltyBack += amt; kind = 'penalty'; }
    else { L.bonus += amt; kind = 'bonus'; }
    var dl = w.deliverableId != null ? (DB.deliverables || []).find(function (x) { return x.id === w.deliverableId; }) : null;
    var ms = dl && dl.milestoneId != null ? (DB.milestones || []).find(function (x) { return x.id === dl.milestoneId; }) : null;
    var pj = (DB.projects || []).find(function (x) { return x.id === (w.projectId != null ? w.projectId : dl && dl.projectId); });
    L.items.push({ date: day, kind: kind, type: w.type, amount: amt, why: w.why || '', task: dl ? dl.title : '', milestone: ms ? ms.title : '', project: pj ? pj.name : '' });
  });
  L.items.sort(function (a, b) { return b.date.localeCompare(a.date); });

  var base = basis === 'SALARY' ? s.salaryEarned : basis === 'HOURLY' ? s.hourlyEarned : 0;
  var netPenalty = Math.max(0, L.penalties - L.penaltyBack);
  var net = base + L.task + L.milestone + L.bonus - netPenalty;
  return {
    e: e, basis: basis, salary: salary, hourly: hourly, from: start, to: end, s: s, L: L,
    base: Math.round(base), netPenalty: Math.round(netPenalty), net: Math.round(net),
    paid: Math.round(L.paid), balance: Math.round(net - L.paid)
  };
}

/* ── UI ───────────────────────────────────────────────────────────────── */
function psRender() {
  var host = document.getElementById('ps-wrap');
  if (!host) return;
  host.innerHTML = '<div class="card card-pad" style="margin-bottom:16px;color:var(--t3);font-size:13px">Working out the pay statement…</div>';
  psLoad().then(function (ctx) { psDraw(host, ctx); })
    .catch(function (err) { host.innerHTML = '<div class="card card-pad" style="margin-bottom:16px;color:var(--red);font-size:13px">Could not build the pay statement: ' + esc(err.message || '') + '</div>'; });
}

function psSetPreset(key) {
  PS.preset = key;
  if (key !== 'custom') { var r = psRange(key); PS.from = r.from; PS.to = r.to; }
  psRender();
}
function psSetDate(which, val) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(val || '')) return;
  PS[which] = val; PS.preset = 'custom';
  if (PS.from > PS.to) { if (which === 'from') PS.to = PS.from; else PS.from = PS.to; }
  psRender();
}
function psSet(key, val) { PS[key] = val; psRender(); }

function psDraw(host, ctx) {
  var DB = DataAPI.raw();
  var depts = DB.departments || [];
  var emps = (DB.employees || []).filter(function (e) {
    return (PS.inactive || e.active !== false) &&
      (!PS.empId || String(e.id) === String(PS.empId)) &&
      (!PS.deptId || String(e.deptId) === String(PS.deptId));
  });
  var rows = emps.map(function (e) { return psCompute(e, PS.from, PS.to, ctx); })
    .filter(function (r) { return !PS.basis || r.basis === PS.basis; });
  PS.rows = rows;

  var tot = rows.reduce(function (t, r) {
    t.base += r.base; t.task += r.L.task; t.ms += r.L.milestone; t.bonus += r.L.bonus;
    t.pen += r.netPenalty; t.net += r.net; t.paid += r.paid; t.bal += r.balance;
    return t;
  }, { base: 0, task: 0, ms: 0, bonus: 0, pen: 0, net: 0, paid: 0, bal: 0 });

  var presets = [['this_month', 'This month'], ['last_month', 'Last month'], ['this_week', 'This week'], ['last_7', 'Last 7 days'], ['fy', 'This financial year'], ['custom', 'Custom']];
  var sel = 'class="form-select" style="width:auto;min-width:150px"';
  var h = '<div class="card card-pad" style="margin-bottom:16px">' +
    '<div class="section-header" style="margin-bottom:12px;flex-wrap:wrap;gap:10px"><div><div class="section-title">Pay statement</div>' +
    '<div class="section-sub">What each person earned between two dates — salary for the days present, plus task, milestone and bonus pay, minus penalties</div></div>' +
    '<div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn btn-secondary btn-sm" onclick="psHowItWorks()">How it’s calculated</button>' +
    '<button class="btn btn-secondary btn-sm" onclick="psExport()">Export CSV</button></div></div>' +

    '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">' + presets.map(function (p) {
      return '<button class="btn btn-xs ' + (PS.preset === p[0] ? 'btn-primary' : 'btn-secondary') + '" onclick="psSetPreset(\'' + p[0] + '\')">' + p[1] + '</button>';
    }).join('') + '</div>' +

    '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;margin-bottom:14px">' +
      '<div><div class="form-label" style="margin-bottom:4px">From</div><input class="form-input" type="date" value="' + PS.from + '" onchange="psSetDate(\'from\',this.value)" style="width:185px"></div>' +
      '<div><div class="form-label" style="margin-bottom:4px">To</div><input class="form-input" type="date" value="' + PS.to + '" onchange="psSetDate(\'to\',this.value)" style="width:185px"></div>' +
      '<div><div class="form-label" style="margin-bottom:4px">Employee</div><select ' + sel + ' onchange="psSet(\'empId\',this.value)"><option value="">Everyone</option>' +
        (DB.employees || []).filter(function (e) { return PS.inactive || e.active !== false; }).map(function (e) { return '<option value="' + e.id + '"' + (String(PS.empId) === String(e.id) ? ' selected' : '') + '>' + esc(e.name) + '</option>'; }).join('') + '</select></div>' +
      '<div><div class="form-label" style="margin-bottom:4px">Department</div><select ' + sel + ' onchange="psSet(\'deptId\',this.value)"><option value="">All departments</option>' +
        depts.map(function (d) { return '<option value="' + d.id + '"' + (String(PS.deptId) === String(d.id) ? ' selected' : '') + '>' + esc(d.name) + '</option>'; }).join('') + '</select></div>' +
      '<div><div class="form-label" style="margin-bottom:4px">Pay type</div><select ' + sel + ' onchange="psSet(\'basis\',this.value)">' +
        [['', 'All pay types'], ['SALARY', 'Monthly salary'], ['HOURLY', 'Hourly'], ['TASK', 'Task / milestone only']].map(function (b) { return '<option value="' + b[0] + '"' + (PS.basis === b[0] ? ' selected' : '') + '>' + b[1] + '</option>'; }).join('') + '</select></div>' +
      '<label style="display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--t2);padding-bottom:9px;cursor:pointer"><input type="checkbox" ' + (PS.inactive ? 'checked' : '') + ' onchange="psSet(\'inactive\',this.checked)"> Include deactivated</label>' +
    '</div>' +

    '<div style="font-size:12px;color:var(--t3);margin-bottom:12px">' + psFmt(PS.from) + ' – ' + psFmt(PS.to) +
      (PS.to > psIso(new Date()) ? ' · attendance counted up to today' : '') + ' · ' + rows.length + ' ' + (rows.length === 1 ? 'person' : 'people') + '</div>' +

    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(128px,1fr));gap:10px;margin-bottom:14px">' +
      [['Net earned', tot.net, 'var(--t1)', 'salary + task + bonus − penalties'],
       ['Salary / hourly', tot.base, 'var(--t1)', 'for the days present'],
       ['Task + milestone', tot.task + tot.ms, 'var(--green)', 'credited in this period'],
       ['Bonus / adjustments', tot.bonus, tot.bonus < 0 ? 'var(--red)' : 'var(--t1)', 'manual entries'],
       ['Penalties', -tot.pen, tot.pen ? 'var(--red)' : 'var(--t2)', 'after appeals'],
       ['Paid in period', tot.paid, 'var(--blue)', 'payments recorded'],
       ['Still to pay', tot.bal, tot.bal > 0 ? 'var(--amber)' : 'var(--green)', 'net earned − paid']
      ].map(function (x) {
        return '<div style="background:var(--s2);border-radius:var(--r8);padding:10px 12px"><div style="font-size:10.5px;color:var(--t3);text-transform:uppercase;letter-spacing:.4px;font-weight:600">' + x[0] + '</div>' +
          '<div style="font-size:17px;font-weight:700;font-family:var(--mono);color:' + x[2] + ';white-space:nowrap">' + (x[1] <= -1 ? '−' : '') + psR(Math.abs(x[1])) + '</div><div style="font-size:11px;color:var(--t3)">' + x[3] + '</div></div>';
      }).join('') + '</div>';

  if (!rows.length) {
    h += '<div class="empty-state"><div class="empty-icon">📅</div><div class="empty-title">Nobody matches these filters</div></div></div>';
    host.innerHTML = h; return;
  }

  var th = function (t, right) { return '<th' + (right ? ' style="text-align:right"' : '') + '>' + t + '</th>'; };
  h += '<div style="overflow-x:auto"><table class="data-table" style="min-width:1080px"><thead><tr>' +
    th('Employee') + th('Pay basis') + th('Working days', 1) + th('Present', 1) + th('Paid leave', 1) + th('Half days', 1) + th('Absent', 1) + th('Days paid', 1) +
    th('Hours', 1) + th('Salary / hourly', 1) + th('Task + milestone', 1) + th('Bonus', 1) + th('Penalties', 1) + th('Net earned', 1) + th('Paid', 1) + th('Balance', 1) + th('') +
    '</tr></thead><tbody>' + rows.map(function (r) {
      var s = r.s, mono = 'text-align:right;font-family:var(--mono)';
      var basisTxt = r.basis === 'SALARY' ? psR(r.salary) + '/month<div style="font-size:11px;color:var(--t3)">' + psR(r.hourly) + '/hr</div>'
        : r.basis === 'HOURLY' ? psR(r.hourly) + '/hour<div style="font-size:11px;color:var(--t3)">hourly</div>'
        : '<span style="color:var(--t3)">Task / milestone only</span>';
      return '<tr>' +
        '<td>' + (typeof poEmpChip === 'function' ? poEmpChip(r.e) : esc(r.e.name)) + (r.e.active === false ? '<div style="font-size:10.5px;color:var(--red)">deactivated</div>' : '') + '</td>' +
        '<td style="font-family:var(--mono);font-size:12.5px;white-space:nowrap">' + basisTxt + '</td>' +
        '<td style="' + mono + '">' + s.workingDays + '</td>' +
        '<td style="' + mono + ';color:var(--green)">' + s.present + '</td>' +
        '<td style="' + mono + ';color:var(--green)">' + psDays(s.paidLeave) + '</td>' +
        '<td style="' + mono + '">' + s.halfDays + '</td>' +
        '<td style="' + mono + ';color:' + (s.absent + s.unpaidLeave ? 'var(--red)' : 'var(--t3)') + '">' + psDays(s.absent + s.unpaidLeave) + (s.pendingLeave ? '<div style="font-size:10.5px;color:var(--amber)">' + s.pendingLeave + ' leave to approve</div>' : '') + (s.unpaidLeave ? '<div style="font-size:10.5px;color:var(--t3)">' + psDays(s.unpaidLeave) + ' loss-of-pay leave</div>' : '') + '</td>' +
        '<td style="' + mono + ';font-weight:700">' + psDays(s.daysPaid) + '</td>' +
        '<td style="' + mono + '">' + psHrs(s.dutySecs) + '</td>' +
        '<td style="' + mono + '">' + psR(r.base) + (r.basis === 'SALARY' ? '<div style="font-size:10.5px;color:var(--t3);white-space:nowrap">' + psDays(s.daysPaid) + ' days</div>' : '') + '</td>' +
        '<td style="' + mono + ';color:var(--green)">' + psR(r.L.task + r.L.milestone) + '</td>' +
        '<td style="' + mono + '">' + (r.L.bonus < 0 ? '−' : '') + psR(Math.abs(r.L.bonus)) + '</td>' +
        '<td style="' + mono + ';color:' + (r.netPenalty ? 'var(--red)' : 'var(--t3)') + '">' + (r.netPenalty ? '−' + psR(r.netPenalty) : '—') + '</td>' +
        '<td style="' + mono + ';font-weight:700">' + (r.net < 0 ? '−' : '') + psR(Math.abs(r.net)) + '</td>' +
        '<td style="' + mono + ';color:var(--blue)">' + psR(r.paid) + '</td>' +
        '<td style="' + mono + ';font-weight:700;color:' + (r.balance > 0 ? 'var(--amber)' : r.balance < 0 ? 'var(--red)' : 'var(--green)') + '">' + (r.balance < 0 ? 'adv ' + psR(-r.balance) : psR(r.balance)) + '</td>' +
        '<td><div style="display:flex;gap:6px;justify-content:flex-end">' +
          '<button class="btn btn-secondary btn-xs" onclick="psDetail(' + r.e.id + ')">Details</button>' +
          (r.balance > 0 ? '<button class="btn btn-xs" style="background:var(--green);color:#fff" onclick="psPay(' + r.e.id + ')">Pay</button>' : '') +
        '</div></td></tr>';
    }).join('') + '</tbody></table></div>' +
    '<div style="font-size:12px;color:var(--t3);margin-top:10px">Salary is paid for the days present and for approved paid leave (casual, sick, earned, comp-off). A half day = 1/2 day. Absent days without approved leave, Loss-of-Pay leave and leave not yet approved are not paid. Penalties you apply are deducted on top. Daily rate = monthly salary \u00f7 the working days in that month.</div>' +
    '</div>';
  host.innerHTML = h;
}

/* one person — day by day, every rupee explained */
function psDetail(empId) {
  var r = (PS.rows || []).find(function (x) { return x.e.id === empId; });
  if (!r) return;
  var s = r.s, L = r.L;
  var line = function (label, val, color, sub) {
    return '<div style="display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid var(--b1);font-size:13px"><span>' + label +
      (sub ? '<div style="font-size:11.5px;color:var(--t3)">' + sub + '</div>' : '') + '</span><span style="font-family:var(--mono);font-weight:650;color:' + (color || 'var(--t1)') + ';white-space:nowrap">' + val + '</span></div>';
  };
  var months = Object.keys(s.months).sort().map(function (ym) {
    var m = s.months[ym];
    return new Date(ym + '-15T12:00:00').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) + ': ' + psR(r.salary) + ' ÷ ' + m.workingDays + ' working days = <b>' + psR(m.rate) + '/day</b>';
  }).join('<br>');

  var h = '<div style="font-size:12.5px;color:var(--t3);margin-bottom:12px">' + psFmt(PS.from) + ' – ' + psFmt(PS.to) +
    (r.from !== PS.from ? ' · counted from ' + psFmt(r.from) + ' (joining date)' : '') + '</div>';

  h += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px;margin-bottom:14px">' +
    [['Working days', s.workingDays], ['Present', psDays(s.present)], ['Paid leave', psDays(s.paidLeave)], ['Half days', s.halfDays], ['Absent', s.absent], ['Days paid', psDays(s.daysPaid)], ['Hours on duty', psHrs(s.dutySecs)], ['Timer hours', psHrs(s.timerSecs)]]
      .map(function (x) { return '<div style="background:var(--s2);border-radius:var(--r8);padding:8px 10px"><div style="font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.3px">' + x[0] + '</div><div style="font-size:15px;font-weight:700;font-family:var(--mono)">' + x[1] + '</div></div>'; }).join('') + '</div>';

  h += '<div style="font-size:12px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px">Calculation</div>';
  if (r.basis === 'SALARY') {
    h += '<div style="font-size:12px;color:var(--t2);background:var(--s2);border-radius:var(--r8);padding:8px 10px;margin-bottom:6px;line-height:1.6">Daily rate — ' + months + '</div>';
    h += line('Salary earned', psR(r.base), 'var(--t1)', psDays(s.daysPaid) + ' days paid = ' + psDays(s.present) + ' present + ' + psDays(s.paidLeave) + ' approved paid leave (half days count \u00bd)');
    h += line('Not paid', psR(Math.max(0, s.fullSalary - s.salaryEarned)), 'var(--t3)', [s.absent ? s.absent + ' absent without approved leave' : '', s.unpaidLeave ? psDays(s.unpaidLeave) + ' loss-of-pay leave' : '', s.pendingLeave ? s.pendingLeave + ' waiting for your approval' : ''].filter(Boolean).join(' \u00b7 ') || 'nothing \u2014 every working day was paid');
  } else if (r.basis === 'HOURLY') {
    h += line('Hourly pay', psR(r.base), 'var(--t1)', psHrs(s.dutySecs) + ' on duty × ' + psR(r.hourly) + '/hour');
  } else {
    h += line('Salary', '—', 'var(--t3)', 'No monthly salary or hourly rate set — paid by task / milestone only');
  }
  h += line('Task pay', psR(L.task), 'var(--green)', 'fixed-price tasks approved in this period (after late-slab)');
  h += line('Milestone pay', psR(L.milestone), 'var(--green)');
  h += line('Bonus / adjustments', (L.bonus < 0 ? '−' : '') + psR(Math.abs(L.bonus)));
  h += line('Penalties', r.netPenalty ? '−' + psR(r.netPenalty) : '—', r.netPenalty ? 'var(--red)' : 'var(--t3)',
    L.penaltyBack ? psR(L.penalties) + ' applied − ' + psR(L.penaltyBack) + ' given back on appeal' : '');
  h += line('<b>Net earned</b>', (r.net < 0 ? '−' : '') + psR(Math.abs(r.net)));
  h += line('Paid in this period', psR(r.paid), 'var(--blue)');
  h += line('<b>Still to pay for this period</b>', r.balance < 0 ? 'advance ' + psR(-r.balance) : psR(r.balance), r.balance > 0 ? 'var(--amber)' : 'var(--green)');

  if (L.items.length) {
    var tone = { task: 'var(--green)', milestone: 'var(--green)', bonus: 'var(--t1)', penalty: 'var(--red)', paid: 'var(--blue)' };
    var lab = { task: 'Task', milestone: 'Milestone', bonus: 'Bonus', penalty: 'Penalty', paid: 'Payment' };
    h += '<div style="font-size:12px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.4px;margin:16px 0 6px">Task, milestone, bonus, penalty & payments</div>' +
      '<div style="overflow-x:auto"><table class="data-table"><thead><tr><th>Date</th><th>Type</th><th>Task / milestone / project</th><th>Why</th><th style="text-align:right">Amount</th></tr></thead><tbody>' +
      L.items.map(function (x) {
        var where = [x.task, x.milestone, x.project].filter(Boolean).join(' · ');
        return '<tr><td style="white-space:nowrap;font-size:12px">' + psFmt(x.date) + '</td><td><span class="badge badge-grey">' + lab[x.kind] + '</span></td>' +
          '<td style="font-size:12.5px">' + esc(where || '—') + '</td><td style="font-size:12px;color:var(--t2);max-width:260px">' + esc(x.why) + '</td>' +
          '<td style="text-align:right;font-family:var(--mono);font-weight:600;color:' + tone[x.kind] + ';white-space:nowrap">' + (x.kind === 'paid' ? 'paid ' + psR(Math.abs(x.amount)) : (x.amount < 0 ? '−' : '+') + psR(Math.abs(x.amount))) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  var codeTone = { P: 'var(--green)', PL: 'var(--green)', A: 'var(--red)', L: 'var(--red)', WL: 'var(--amber)', HD: 'var(--amber)', W: 'var(--t4)', H: '#7C3AED' };
  h += '<div style="font-size:12px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.4px;margin:16px 0 6px">Day by day</div>' +
    '<div style="max-height:320px;overflow-y:auto;border:1px solid var(--b1);border-radius:var(--r8)"><table class="data-table"><thead><tr><th>Date</th><th>Attendance</th><th style="text-align:right">Day paid</th><th style="text-align:right">Hours</th>' + (r.basis === 'SALARY' ? '<th style="text-align:right">Earned</th>' : '') + '</tr></thead><tbody>' +
    s.days.slice().reverse().map(function (d) {
      var c = codeTone[d.code] || (d.paid ? 'var(--green)' : 'var(--t2)');
      return '<tr><td style="white-space:nowrap;font-size:12px">' + new Date(d.date + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) + '</td>' +
        '<td style="font-size:12.5px;color:' + c + '">' + esc(d.label) + '</td>' +
        '<td style="text-align:right;font-family:var(--mono)">' + (d.paid ? psDays(d.paid) : '') + '</td>' +
        '<td style="text-align:right;font-family:var(--mono);color:var(--t3)">' + (d.hours ? psHrs(d.hours) : '') + '</td>' +
        (r.basis === 'SALARY' ? '<td style="text-align:right;font-family:var(--mono)">' + (d.paid && d.rate ? psR(d.paid * d.rate) : '') + '</td>' : '') + '</tr>';
    }).join('') + '</tbody></table></div>';

  openModal('Pay statement — ' + r.e.name, h,
    '<button class="btn btn-secondary btn-sm" onclick="closeModal()">Close</button>' +
    (r.balance > 0 ? '<button class="btn btn-sm" style="background:var(--green);color:#fff" onclick="closeModal();setTimeout(function(){psPay(' + empId + ')},150)">💸 Pay ' + psR(r.balance) + '</button>' : ''));
  var mb = document.querySelector('#modal-overlay .modal-box'); if (mb) mb.classList.add('modal-wide');
}

/* record a payment for the period — opens the normal payment form, filled in */
function psPay(empId) {
  var r = (PS.rows || []).find(function (x) { return x.e.id === empId; });
  if (!r || typeof openEmpPaymentModal !== 'function') return;
  openEmpPaymentModal(empId);
  setTimeout(function () {
    var amt = document.getElementById('ep-amt'), note = document.getElementById('ep-note');
    if (amt && r.balance > 0) amt.value = Utils.paiseToRupees(r.balance);
    if (note) note.value = 'Pay ' + psFmt(PS.from) + ' – ' + psFmt(PS.to);
    if (typeof _epAdvanceHint === 'function') { try { _epAdvanceHint(Math.max(0, poMoneyOf(empId).remaining)); } catch (e) { /* hint only */ } }
  }, 60);
}

function psHowItWorks() {
  openModal('How the pay statement is calculated',
    '<div style="font-size:13px;line-height:1.7;color:var(--t2)">' +
    '<b>What is paid.</b> Days present, plus <u>approved</u> casual, sick, earned or comp-off leave. A half day counts as \u00bd day (a half-day leave pays \u00bd, and the other half if the person worked it).<br>' +
    '<b>What is not paid.</b> Absent without approved leave, Loss-of-Pay leave, and leave still waiting for approval (approve it and that day becomes paid).<br>' +
    '<b>Daily rate.</b> Monthly salary \u00f7 the working days in that month. Week-offs and holidays come from HR settings and are not working days, so a person present every working day gets the full salary.<br>' +
    '<b>Example.</b> Salary \u20b926,000, the month has 26 working days \u2192 \u20b91,000 a day. Present 7 days + 2 approved sick/casual leave days \u2192 9 days paid = \u20b99,000.<br>' +
    '<b>Penalties.</b> Only penalties you apply are deducted (by penalty date). If an appeal gives money back, the final amount is used.<br>' +
    '<b>Hourly people</b> (no salary, only an hourly rate): hours on duty \u00d7 hourly rate.<br>' +
    '<b>Task, milestone, bonus.</b> Everything credited to the person in the period is added. Payments recorded in the period are shown as "Paid".<br>' +
    '<b>Not counted.</b> Days before the joining date, future days, and today if the person has not logged in yet.</div>',
    '<button class="btn btn-primary btn-sm" onclick="closeModal()">Got it</button>');
}

function psExport() {
  var rows = PS.rows || [];
  if (!rows.length) { toast('Nothing to export', 'error'); return; }
  var head = ['Employee', 'Department', 'Pay basis', 'Monthly salary', 'Hourly rate', 'From', 'To', 'Working days', 'Present', 'Paid leave', 'Half days', 'Absent', 'Loss-of-pay leave', 'Leave to approve',
    'Days paid', 'Hours on duty', 'Salary/hourly earned', 'Task pay', 'Milestone pay', 'Bonus/adjustments', 'Penalties', 'Net earned', 'Paid', 'Balance'];
  var dn = function (id) { var d = (DataAPI.raw().departments || []).find(function (x) { return x.id === id; }); return d ? d.name : ''; };
  var rs = function (p) { return (Math.round(p || 0) / 100).toFixed(2); };
  var csv = [head].concat(rows.map(function (r) {
    var s = r.s;
    return [r.e.name, dn(r.e.deptId), r.basis, rs(r.salary), rs(r.hourly), PS.from, PS.to, s.workingDays, s.present, s.paidLeave, s.halfDays, s.absent, s.unpaidLeave, s.pendingLeave,
      s.daysPaid, (s.dutySecs / 3600).toFixed(1), rs(r.base), rs(r.L.task), rs(r.L.milestone), rs(r.L.bonus), rs(r.netPenalty), rs(r.net), rs(r.paid), rs(r.balance)];
  })).map(function (row) { return row.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
  var a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'pay-statement-' + PS.from + '-to-' + PS.to + '.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  toast('Pay statement exported', 'success');
}