/* ============================================================================
   PENALTIES
   - Admin applies penalties and can freely set penalty days.
   - Employees can appeal a penalty from the employee app.
   - Admin can accept, reject, or change the final penalty amount.
   - All money changes are written through the immutable wallet ledger.
   ============================================================================ */
'use strict';

var PENALTY_RULES = [
  {
    key: 'UNAPPROVED_LEAVE', name: 'Unapproved Leave', icon: '📅',
    note: 'Default suggestion follows the occurrence rule, but the admin can increase or reduce the penalty days before applying it.',
    autoDays: function (employeeId, date) {
      var month = String(date || Utils.isoDate(new Date())).slice(0, 7);
      return penaltyRows().filter(function (x) {
        var p = x.meta && x.meta.penalty;
        return Number(x.employeeId) === Number(employeeId) && p && p.ruleKey === 'UNAPPROVED_LEAVE' &&
          String(p.date || x.createdAt).slice(0, 7) === month;
      }).length + 1;
    }
  },
  {
    key: 'LATE_ARRIVAL', name: 'Late Arrival', icon: '⏰',
    note: 'Late-arrival reference time from the note: 10:16 AM. The admin can set the applicable penalty days.',
    autoDays: function () { return 1; }
  },
  {
    key: 'DELAYED_WORK', name: 'Delayed Work', icon: '⏳',
    note: 'Apply when assigned work is delayed. Enter the applicable penalty days for the incident.',
    autoDays: function () { return 1; }
  },
  {
    key: 'ADVERSE_BEHAVIOUR', name: 'Adverse Behaviour Action', icon: '⚠️',
    note: 'Record the action with a clear reason and the applicable penalty days.',
    autoDays: function () { return 1; }
  }
];

function penaltyRows() {
  return (DataAPI.raw().walletEntries || []).filter(function (w) {
    return w.type === 'DEDUCTION' && w.meta && w.meta.penalty;
  });
}
function penaltyRule(key) { return PENALTY_RULES.find(function (r) { return r.key === key; }) || PENALTY_RULES[0]; }
function penaltyEmployee(id) { return (DataAPI.raw().employees || []).find(function (e) { return Number(e.id) === Number(id); }); }
function penaltyDailyRate(emp) {
  if (!emp) return 0;
  var monthly = Number(emp.monthlySalaryPaise || 0);
  if (monthly > 0) return Math.round(monthly / 26);
  var hourly = Number(emp.costPerHourPaise || 0);
  return hourly > 0 ? hourly * 8 : 0;
}
function penaltyRupee(paise) { return Utils.fmtRupee(Math.max(0, Number(paise) || 0)).replace('.00', ''); }
function penaltyDateTime(date) {
  var d = new Date(String(date || '') + 'T00:00:00');
  return isNaN(d.getTime()) ? String(date || '—') : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function penaltyAttendanceFor(empId, date) {
  return (DataAPI.raw().attendance || []).find(function (a) { return Number(a.employeeId) === Number(empId) && a.date === date; }) || null;
}
function penaltyEffectiveAmount(w) {
  var appeal = (DataAPI.raw().disputes || []).find(function (x) { return x.kind === 'PENALTY_APPEAL' && x.entryId === w.id; });
  if (appeal && appeal.status !== 'OPEN' && appeal.finalPenaltyPaise != null) return Math.max(0, Number(appeal.finalPenaltyPaise) || 0);
  return Math.abs(Number(w.amountPaise) || 0);
}

function renderPenalties() {
  var v = document.getElementById('view-penalties');
  if (!v) return;
  var DB = DataAPI.raw();
  var emps = (DB.employees || []).filter(function (e) { return e.active !== false; });
  var rows = penaltyRows().slice().sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });

  v.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:18px">' +
      '<div><div class="section-title" style="font-size:20px">Penalties</div>' +
      '<div class="section-sub">Apply penalties, review employee appeals, and keep every payout adjustment in the ledger.</div></div>' +
      '<button class="btn btn-primary" onclick="openApplyPenaltyModal()">+ Apply Penalty</button>' +
    '</div>' +
    '<div class="grid-3" style="margin-bottom:18px">' + PENALTY_RULES.map(function (r) {
      return '<div class="card card-pad" style="border-left:3px solid var(--red)">' +
        '<div style="display:flex;align-items:center;gap:9px;margin-bottom:8px"><span style="font-size:20px">' + r.icon + '</span><div style="font-size:14px;font-weight:700">' + esc(r.name) + '</div></div>' +
        '<div style="font-size:12px;color:var(--t2);line-height:1.55">' + esc(r.note) + '</div></div>';
    }).join('') + '</div>' +
    '<div id="penalty-appeals-wrap" class="card card-pad" style="margin-bottom:18px"><div style="color:var(--t3);font-size:13px">Loading appeals…</div></div>' +
    '<div class="card card-pad">' +
      '<div class="section-header"><div><div class="section-title">Penalty History</div><div class="section-sub">Every penalty remains in the wallet ledger. Appeal decisions are added as correcting ledger entries.</div></div>' +
      '<div style="font-size:12px;color:var(--t3)">' + rows.length + ' record' + (rows.length === 1 ? '' : 's') + '</div></div>' +
      (rows.length ?
        '<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Date</th><th>Employee</th><th>Penalty</th><th>Days</th><th>Deduction</th><th>Reason</th><th>Appeal</th><th>Recorded</th></tr></thead><tbody>' +
        rows.map(function (w) {
          var p = w.meta.penalty || {};
          var e = penaltyEmployee(w.employeeId);
          var appeal = (DataAPI.raw().disputes || []).find(function (x) { return x.kind === 'PENALTY_APPEAL' && x.entryId === w.id; });
          var status = appeal ? appeal.status : 'NONE';
          var badge = status === 'OPEN' ? 'badge-amber' : status === 'ACCEPTED' ? 'badge-green' : status === 'REJECTED' ? 'badge-grey' : 'badge-grey';
          return '<tr>' +
            '<td style="white-space:nowrap">' + esc(penaltyDateTime(p.date || String(w.createdAt).slice(0, 10))) + '</td>' +
            '<td><b>' + esc(e ? e.name : ('Employee #' + w.employeeId)) + '</b></td>' +
            '<td><span class="badge badge-red">' + esc(p.ruleName || 'Penalty') + '</span></td>' +
            '<td style="font-family:var(--mono);font-weight:600">' + esc(String(p.penaltyDays == null ? '—' : p.penaltyDays)) + '</td>' +
            '<td style="text-align:right;font-family:var(--mono);font-weight:700;color:var(--red)">−' + penaltyRupee(penaltyEffectiveAmount(w)) + '</td>' +
            '<td style="max-width:280px;color:var(--t2)">' + esc(w.why || '') + '</td>' +
            '<td><span class="badge ' + badge + '">' + esc(status === 'NONE' ? 'No appeal' : status) + '</span></td>' +
            '<td style="white-space:nowrap;color:var(--t3);font-size:11.5px">' + esc(new Date(w.createdAt).toLocaleString('en-IN')) + '</td>' +
          '</tr>';
        }).join('') + '</tbody></table></div>' :
        '<div class="empty-state"><div class="empty-icon">⚖️</div><div class="empty-title">No penalties applied</div><div class="empty-sub">When a penalty is recorded, it will appear here and in the employee payout history.</div></div>') +
    '</div>';

  renderPenaltyAppeals();
}

function renderPenaltyAppeals() {
  var el = document.getElementById('penalty-appeals-wrap');
  if (!el) return;
  Wallet.getPenaltyAppeals().then(function (rows) {
    var open = rows.filter(function (x) { return x.status === 'OPEN'; });
    var closed = rows.filter(function (x) { return x.status !== 'OPEN'; });
    var h = '<div class="section-header"><div><div class="section-title">Employee Penalty Appeals</div><div class="section-sub">Employees can appeal a penalty with a written reason. You can reject it, accept it, or set any final deduction amount.</div></div>' +
      '<div style="font-size:12px;color:' + (open.length ? 'var(--amber)' : 'var(--t3)') + '">' + open.length + ' open</div></div>';
    if (!open.length) h += '<div style="padding:14px 0;color:var(--t3);font-size:13px">No open penalty appeals.</div>';
    open.forEach(function (x) {
      h += '<div style="border:1px solid var(--b1);border-left:3px solid var(--amber);border-radius:var(--r8);padding:14px;margin-bottom:10px">' +
        '<div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:8px">' +
          '<div><div style="font-weight:700">' + esc(x.employeeName || ('Employee #' + x.employeeId)) + ' · ' + esc(x.penaltyRuleName || 'Penalty') + '</div>' +
          '<div style="font-size:11.5px;color:var(--t3);margin-top:3px">Penalty date: ' + esc(x.penaltyDate || '—') + ' · Current deduction: <b>' + penaltyRupee(x.currentPenaltyPaise || x.originalPenaltyPaise || x.amountPaise) + '</b></div></div>' +
          '<span class="badge badge-amber">OPEN APPEAL</span></div>' +
        '<div style="background:var(--amber-light);padding:10px 12px;border-radius:var(--r8);font-size:13px;margin-bottom:10px"><b>Employee reason:</b><br>' + esc(x.reason || '') + '</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
          '<button class="btn btn-primary btn-sm" onclick="resolvePenaltyAppealModal(\'' + x.id + '\',\'ACCEPT\')">✓ Accept Appeal</button>' +
          '<button class="btn btn-secondary btn-sm" onclick="resolvePenaltyAppealModal(\'' + x.id + '\',\'CHANGE\')">Change Penalty Amount</button>' +
          '<button class="btn btn-secondary btn-sm" onclick="resolvePenaltyAppealModal(\'' + x.id + '\',\'REJECT\')">Reject Appeal</button>' +
        '</div>' +
      '</div>';
    });
    if (closed.length) {
      h += '<div style="margin-top:14px;font-size:12px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.4px">Resolved Appeals</div>';
      h += '<div class="data-table-wrap" style="margin-top:8px"><table class="data-table"><thead><tr><th>Employee</th><th>Penalty</th><th>Original</th><th>Final</th><th>Status</th><th>Admin response</th></tr></thead><tbody>';
      h += closed.map(function (x) {
        return '<tr><td>' + esc(x.employeeName || ('Employee #' + x.employeeId)) + '</td><td>' + esc(x.penaltyRuleName || 'Penalty') + '</td>' +
          '<td>' + penaltyRupee(x.originalPenaltyPaise || x.amountPaise) + '</td><td>' + penaltyRupee(x.finalPenaltyPaise == null ? x.originalPenaltyPaise : x.finalPenaltyPaise) + '</td>' +
          '<td><span class="badge ' + (x.status === 'ACCEPTED' ? 'badge-green' : 'badge-grey') + '">' + esc(x.status) + '</span></td>' +
          '<td style="font-size:12px;color:var(--t2)">' + esc(x.resolutionNote || '') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    }
    el.innerHTML = h;
  }).catch(function (err) { el.innerHTML = '<div style="color:var(--red);font-size:13px">Could not load appeals: ' + esc(err.message || 'Unknown error') + '</div>'; });
}

function resolvePenaltyAppealModal(id, action) {
  var rowsPromise = Wallet.getPenaltyAppeals();
  rowsPromise.then(function (rows) {
    var x = rows.find(function (r) { return r.id === id; });
    if (!x) return toast('Appeal not found', 'error');
    var current = Number(x.currentPenaltyPaise || x.originalPenaltyPaise || x.amountPaise || 0) / 100;
    var body = '<div style="background:var(--s2);padding:10px 12px;border-radius:var(--r8);font-size:12px;margin-bottom:12px">' +
      '<b>' + esc(x.employeeName) + '</b> · ' + esc(x.penaltyRuleName) + '<br>Current deduction: <b>' + penaltyRupee(x.currentPenaltyPaise || x.originalPenaltyPaise) + '</b><br><span style="color:var(--t2)">Employee appeal: ' + esc(x.reason) + '</span></div>';
    if (action === 'CHANGE') body += '<div class="form-group"><label class="form-label">Final Penalty Amount (₹)</label><input class="form-input" id="pa-final-amt" type="number" min="0" step="1" value="' + current + '"><div style="font-size:11px;color:var(--t3);margin-top:4px">Enter 0 to remove the penalty, a smaller amount to reduce it, or a larger amount to increase it.</div></div>';
    else if (action === 'ACCEPT') body += '<div style="font-size:13px;line-height:1.55;margin-bottom:12px">Accepting the appeal will <b>remove the current penalty completely</b>. If you want a different amount, use “Change Penalty Amount”.</div>';
    else body += '<div style="font-size:13px;line-height:1.55;margin-bottom:12px">Rejecting the appeal leaves the current penalty amount unchanged.</div>';
    body += '<div class="form-group"><label class="form-label">Admin Response *</label><textarea class="form-textarea" id="pa-note" rows="3" placeholder="Explain the decision to the employee…"></textarea></div>';
    openModal(action === 'ACCEPT' ? 'Accept Penalty Appeal' : action === 'REJECT' ? 'Reject Penalty Appeal' : 'Change Penalty Amount', body,
      '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="savePenaltyAppeal(\'' + id + '\',\'' + action + '\')">Save Decision</button>');
  }).catch(function (err) { toast(err.message || 'Could not load appeal', 'error'); });
}

function savePenaltyAppeal(id, action) {
  var note = String((document.getElementById('pa-note') || {}).value || '').trim();
  if (!note) return toast('Admin response is required', 'error');
  var opts = { action: action, note: note };
  if (action === 'CHANGE') {
    var amount = parseFloat((document.getElementById('pa-final-amt') || {}).value);
    if (!isFinite(amount) || amount < 0) return toast('Enter a valid final penalty amount', 'error');
    opts.finalPenaltyPaise = Math.round(amount * 100);
  }
  Wallet.resolvePenaltyAppeal(id, opts).then(function () {
    closeModal();
    syncState();
    renderPenalties();
    if (typeof renderPayouts === 'function') renderPayouts();
    toast(action === 'REJECT' ? 'Appeal rejected' : 'Penalty updated and payout recalculated', 'success');
  }).catch(function (err) { toast(err.message || 'Could not resolve appeal', 'error'); });
}

function openApplyPenaltyModal() {
  var DB = DataAPI.raw();
  var emps = (DB.employees || []).filter(function (e) { return e.active !== false; });
  if (!emps.length) return toast('No active employees found', 'error');
  var today = Utils.isoDate(new Date());
  openModal('Apply Penalty',
    '<div style="background:var(--amber-light);padding:10px 12px;border-radius:var(--r8);font-size:12px;color:var(--amber);margin-bottom:14px">The penalty is recorded in the employee payout ledger. The employee receives an email and can appeal it from the employee app.</div>' +
    '<div class="form-row"><div class="form-group"><label class="form-label">Employee *</label><select class="form-select" id="pen-emp" onchange="penaltyFormChanged()">' + emps.map(function (e) { return '<option value="' + e.id + '">' + esc(e.name) + '</option>'; }).join('') + '</select></div>' +
    '<div class="form-group"><label class="form-label">Penalty *</label><select class="form-select" id="pen-rule" onchange="penaltyFormChanged(true)">' + PENALTY_RULES.map(function (r) { return '<option value="' + r.key + '">' + r.icon + ' ' + esc(r.name) + '</option>'; }).join('') + '</select></div></div>' +
    '<div class="form-row"><div class="form-group"><label class="form-label">Penalty Date *</label><input class="form-input" id="pen-date" type="date" value="' + today + '" max="' + today + '" onchange="penaltyFormChanged()"></div>' +
    '<div class="form-group"><label class="form-label">Penalty Days *</label><input class="form-input" id="pen-days" type="number" min="0.5" step="0.5" value="1" oninput="penaltyFormChanged()"><div id="pen-rule-hint" style="font-size:11px;color:var(--t3);margin-top:4px"></div></div></div>' +
    '<div id="pen-att-note" style="font-size:12px;color:var(--t2);background:var(--s2);padding:9px 11px;border-radius:var(--r8);margin-bottom:12px"></div>' +
    '<div class="form-group"><label class="form-label">Reason / Remarks *</label><textarea class="form-textarea" id="pen-reason" rows="3" placeholder="Explain exactly why this penalty is being applied…"></textarea></div>' +
    '<div id="pen-amount-preview" style="background:var(--s2);padding:11px 12px;border-radius:var(--r8);margin-bottom:4px"></div>',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" id="pen-save" onclick="applyPenalty()">Apply Penalty</button>'
  );
  penaltyFormChanged(true);
}

function penaltyFormChanged(seedDays) {
  var empId = Number((document.getElementById('pen-emp') || {}).value);
  var key = (document.getElementById('pen-rule') || {}).value;
  var date = (document.getElementById('pen-date') || {}).value;
  var daysEl = document.getElementById('pen-days');
  var hint = document.getElementById('pen-rule-hint');
  var attNote = document.getElementById('pen-att-note');
  var preview = document.getElementById('pen-amount-preview');
  if (!key || !empId) return;
  var rule = penaltyRule(key), emp = penaltyEmployee(empId);
  if (seedDays && daysEl) daysEl.value = rule.autoDays(empId, date);
  if (key === 'UNAPPROVED_LEAVE' && hint) hint.textContent = 'Suggested occurrence: ' + rule.autoDays(empId, date) + ' day(s). You can increase or reduce the number before applying.';
  else if (hint) hint.textContent = rule.note;
  if (attNote) {
    if (key === 'LATE_ARRIVAL') {
      var a = penaltyAttendanceFor(empId, date);
      attNote.innerHTML = a && a.firstInAt ? 'Attendance: <b>' + new Date(a.firstInAt).toLocaleString('en-IN') + '</b>. Late-arrival reference: <b>10:16 AM</b>.' : 'No login record is available for this date. You can still record the penalty manually.';
    } else if (key === 'UNAPPROVED_LEAVE') attNote.textContent = 'Unapproved Leave: choose the applicable number of penalty days. The field is editable.';
    else attNote.textContent = rule.note;
  }
  var days = Math.max(0, Number(daysEl && daysEl.value) || 0), daily = penaltyDailyRate(emp), amount = Math.round(days * daily);
  if (preview) preview.innerHTML = '<div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><span>Daily salary basis: <b>' + penaltyRupee(daily) + '</b> · ' + days + ' day' + (days === 1 ? '' : 's') + '</span><strong style="font-size:16px;color:var(--red)">Deduction: −' + penaltyRupee(amount) + '</strong></div>' + (daily ? '<div style="font-size:11px;color:var(--t3);margin-top:4px">Daily basis = monthly salary ÷ 26 working days.</div>' : '<div style="font-size:11px;color:var(--red);margin-top:4px">No salary rate is configured for this employee.</div>');
}

function applyPenalty() {
  var empId = Number((document.getElementById('pen-emp') || {}).value);
  var key = (document.getElementById('pen-rule') || {}).value;
  var date = (document.getElementById('pen-date') || {}).value;
  var days = Math.max(0, Number((document.getElementById('pen-days') || {}).value) || 0);
  var reason = String((document.getElementById('pen-reason') || {}).value || '').trim();
  var emp = penaltyEmployee(empId), rule = penaltyRule(key);
  if (!emp) return toast('Select an employee', 'error');
  if (!date) return toast('Select the penalty date', 'error');
  if (!days) return toast('Penalty days must be greater than 0', 'error');
  if (!reason) return toast('Reason / remarks are required', 'error');
  var daily = penaltyDailyRate(emp), amount = Math.round(days * daily);
  if (!daily) return toast('Monthly salary is not configured for this employee', 'error');
  if (!amount) return toast('Calculated deduction is 0', 'error');
  var btn = document.getElementById('pen-save');
  if (btn) { btn.disabled = true; btn.textContent = 'Applying…'; }
  Wallet.applyPenalty(empId, { ruleKey: rule.key, ruleName: rule.name, date: date, penaltyDays: days, dailyRatePaise: daily, amountPaise: amount, reason: reason })
    .then(function () { syncState(); closeModal(); renderPenalties(); if (typeof renderPayouts === 'function') renderPayouts(); toast('Penalty applied. Payout updated and email queued.', 'success'); })
    .catch(function (err) { if (btn) { btn.disabled = false; btn.textContent = 'Apply Penalty'; } toast(err.message || 'Could not apply penalty', 'error'); });
}
