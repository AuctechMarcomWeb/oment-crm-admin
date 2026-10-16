var PO_TAB = 'overview';
var PO_FILTER = { employeeId: '', type: '', month: '' };

function poRupee(paise) { return Utils.fmtRupee(paise || 0).replace('.00', ''); }
function poTime(secs) { return Schema.TIME.fmtShort(secs || 0); }
function poAgo(iso) {
  if (!iso) return '';
  var m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return m + ' min';
  var h = Math.round(m / 60); if (h < 24) return h + 'h';
  return Math.round(h / 24) + 'd';
}
function poEmpChip(e) {
  if (!e) return '<span style="color:var(--t3)">\u2014</span>';
  return '<span style="display:inline-flex;align-items:center;gap:6px"><span class="avatar" style="background:' + (e.avatarBg || e.color || 'var(--s3)') + ';color:' + (e.avatarFg || '#fff') + ';width:22px;height:22px;font-size:9px">' + (e.avatarInitials || e.avatar || '?') + '</span>' + esc(e.name) + '</span>';
}
function poEmp(id) { return (DataAPI.raw().employees || []).find(function (e) { return e.id === Number(id); }); }

function renderPayouts() {
  var v = document.getElementById('view-payouts');
  if (!v) return;
  if (typeof Wallet === 'undefined') { v.innerHTML = '<div class="empty-state"><div class="empty-title">Wallet module didn’t load</div></div>'; return; }

  Wallet.getCompanySummary().then(function (sum) {
    var tabs = [['overview', 'Overview'], ['payteam', 'Pay team'], ['agreements', 'Agreements', sum.pendingAgreement], ['blocked', 'Blocked', sum.blockedTasks],
      ['disputes', 'Disputes', sum.openDisputes], ['ledger', 'Ledger'], ['people', 'People'], ['policy', 'Policy'], ['outbox', 'Outbox', sum.outboxQueued]];
    v.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;flex-wrap:wrap;gap:12px">' +
        '<div><div class="section-title" style="font-size:20px">Payouts</div>' +
        '<div class="section-sub">Task-based pay: who is owed what, why, and where work is stuck</div></div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-secondary btn-sm" onclick="poAddEntry()">+ Bonus / Payout</button>' +
        '<button class="btn btn-secondary btn-sm" onclick="poExport()">Export CSV</button></div></div>' +
      '<div class="tab-bar" style="margin-bottom:18px;overflow-x:auto">' +
        tabs.map(function (t) {
          return '<button class="tab-btn' + (PO_TAB === t[0] ? ' active' : '') + '" onclick="poSetTab(\'' + t[0] + '\')">' + t[1] +
            (t[2] ? ' <span class="nav-badge" style="position:static;margin-left:5px">' + t[2] + '</span>' : '') + '</button>';
        }).join('') +
      '</div><div id="po-pane"></div>';
    poRenderPane(sum);
  }).catch(function (e) { v.innerHTML = '<div class="empty-state"><div class="empty-title">' + esc(e.message) + '</div></div>'; });
}
function poSetTab(t) { PO_TAB = t; renderPayouts(); }

function poRenderPane(sum) {
  var pane = document.getElementById('po-pane');
  if (!pane) return;
  pane.innerHTML = '<div style="padding:30px;text-align:center;color:var(--t3);font-size:13px">Loading\u2026</div>';
  if (PO_TAB === 'overview')   return poOverview(pane, sum);
  if (PO_TAB === 'payteam') return poPayTeam(pane);
  if (PO_TAB === 'agreements') return poAgreements(pane);
  if (PO_TAB === 'blocked')    return poBlocked(pane);
  if (PO_TAB === 'disputes')   return poDisputes(pane);
  if (PO_TAB === 'ledger')     return poLedger(pane);
  if (PO_TAB === 'people')     return poPeople(pane, sum);
  if (PO_TAB === 'policy')     return poPolicy(pane);
  if (PO_TAB === 'outbox')     return poOutbox(pane);
}

/* ══════════════════════════ OVERVIEW ══════════════════════════ */
function poOverview(pane, sum) {
  var h = '<div class="stats-bar">' +
    (sum.liabilityPaise >= 0
      ? poStat('Still to pay the team', poRupee(sum.liabilityPaise), 'earned \u2212 paid', sum.liabilityPaise > 0 ? 'amber' : '')
      : poStat('Paid in advance', poRupee(-sum.liabilityPaise), 'paid more than earned \u2014 check Pay team \u2192 History', 'red')) +
    poStat('Open work value', poRupee(sum.committedPaise), sum.openTasks + ' tasks \u00b7 if all delivered on time') +
    poStat('Saved via slabs', poRupee(Math.abs(sum.slabPaise)), 'price reduced on late delivery', 'green') +
    poStat('This month', poRupee(sum.thisMonthPaise), 'credits + adjustments') +
  '</div>';

  var attention = [];
  if (sum.blockedTasks) attention.push(['\uD83D\uDED1', sum.blockedTasks + ' people are blocked \u2014 their time isn’t counting for anyone', 'blocked', 'var(--red)']);
  if (sum.pendingAgreement) attention.push(['\u23F1', sum.pendingAgreement + ' tasks have no agreed estimate \u2014 work can’t start until they do', 'agreements', 'var(--amber)']);
  if (sum.openDisputes) attention.push(['\u2696\uFE0F', sum.openDisputes + ' dispute pending (' + poRupee(sum.openDisputePaise) + ') \u2014 the later the reply, the more trust erodes', 'disputes', 'var(--amber)']);
  if (sum.outboxQueued) attention.push(['\u2709\uFE0F', sum.outboxQueued + ' emails queued \u2014 they’ll send once the backend is connected', 'outbox', 'var(--t3)']);
  h += '<div class="card card-pad" style="margin-bottom:16px"><div class="section-header"><div class="section-title">Needs attention</div></div>';
  if (!attention.length) h += '<div style="font-size:13px;color:var(--t3);padding:8px 0">\u2713 All clear \u2014 no blocks, disputes or pending agreements.</div>';
  attention.forEach(function (a) {
    h += '<div onclick="poSetTab(\'' + a[2] + '\')" style="display:flex;gap:10px;align-items:center;padding:10px 12px;border:1px solid var(--b1);border-left:3px solid ' + a[3] + ';border-radius:var(--r8);margin-bottom:8px;cursor:pointer;font-size:13px" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'transparent\'"><span>' + a[0] + '</span><span style="flex:1">' + esc(a[1]) + '</span><span style="color:var(--t3)">\u2192</span></div>';
  });
  h += '</div>';

  /* By project */
  h += '<div class="card card-pad" style="margin-bottom:16px"><div class="section-header"><div><div class="section-title">By project</div><div class="section-sub">Where fixed-price task money is going</div></div></div>';
  if (!sum.byProject.length) h += '<div style="font-size:13px;color:var(--t3);padding:8px 0">No project has a priced task yet. Choose "Fixed price" when creating a deliverable.</div>';
  else {
    h += '<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Project</th><th>Tasks</th><th style="text-align:right">Committed</th><th style="text-align:right">Paid out (settled)</th><th style="text-align:right">Slab saved</th></tr></thead><tbody>';
    sum.byProject.forEach(function (p) {
      h += '<tr><td><div style="font-weight:600">' + esc(p.name) + '</div><div style="font-size:11px;color:var(--t3)">' + esc(p.client) + '</div></td><td>' + p.settled + '/' + p.tasks + ' settled</td>' +
        '<td style="text-align:right;font-family:var(--mono)">' + poRupee(p.committedPaise) + '</td><td style="text-align:right;font-family:var(--mono)">' + poRupee(p.paidPaise) + '</td><td style="text-align:right;font-family:var(--mono);color:var(--green)">' + poRupee(p.slabPaise) + '</td></tr>';
    });
    h += '</tbody></table></div>';
  }
  h += '</div>';

  h += '<div class="card card-pad" style="background:var(--blue-light);border-color:rgba(37,99,235,.15)"><div class="section-title" style="font-size:13px;margin-bottom:8px">How this system works</div>' +
    '<div style="font-size:12.5px;color:var(--t2);line-height:1.7">' +
    '<b>A price schedule, not a deduction.</b> The task price is for on-time delivery; every extra full hour is one slab down (default 6%), with a 65% floor. The word "fine" appears nowhere in the ledger \u2014 that legal framing is deliberate.<br>' +
    '<b>Agreement first.</b> The employee accepts the estimate or proposes their own \u2014 the timer won’t run without an agreement. Small tasks (see Policy) are auto-agreed.<br>' +
    '<b>Only timer time counts.</b> Review wait, blocked time, leave \u2014 none of it is charged. You get an immediate signal when someone is blocked.<br>' +
    '<b>Credit on approval, not on submission.</b> The clock keeps running on rejected work with no extra pay \u2014 so rushing sloppy work is its own penalty.<br>' +
    '<b>The ledger is immutable.</b> Mistakes are fixed with a Bonus/Adjustment entry, never an edit. Employees can dispute, and you must reply with a note.</div></div>';
  pane.innerHTML = h;
}
function poStat(label, value, sub, tone) {
  return '<div class="stat-card"><div class="stat-label">' + label + '</div><div class="stat-value ' + (tone || '') + '" style="font-size:22px;font-family:var(--mono)">' + value + '</div><div class="stat-sub">' + sub + '</div></div>';
}

/* ══════════════════════════ AGREEMENTS ══════════════════════════ */
function poAgreements(pane) {
  var DB = DataAPI.raw();
  var rows = DB.deliverables.filter(function (d) { return d.pricingMode === 'PIECE' && d.status !== 'DONE' && d.agreement && d.agreement.state !== 'AGREED'; });
  var order = { FLAGGED: 0, COUNTERED: 1, PENDING: 2, NONE: 3 };
  rows.sort(function (a, b) { return (order[a.agreement.state] || 9) - (order[b.agreement.state] || 9); });
  if (!rows.length) { pane.innerHTML = '<div class="empty-state"><div class="empty-icon">\u2713</div><div class="empty-title">All estimates are agreed</div><div class="empty-sub">When you create a priced task the employee must accept it \u2014 it will show here.</div></div>'; return; }

  var h = '<div style="font-size:12.5px;color:var(--t3);margin-bottom:12px">Until there is an agreement, the employee’s timer won’t run. <b>Past data is below</b> \u2014 negotiate from it, not from guesswork.</div>';
  Promise.all(rows.map(function (d) { return Wallet.getEstimateHint(d.id).catch(function () { return null; }); })).then(function (hints) {
    rows.forEach(function (d, i) {
      var a = d.agreement, hint = hints[i] || {};
      var emps = (d.assigneeIds || []).map(poEmp).filter(Boolean);
      var tone = a.state === 'FLAGGED' ? 'var(--red)' : a.state === 'COUNTERED' ? 'var(--blue)' : 'var(--amber)';
      var label = a.state === 'FLAGGED' ? 'Flagged unrealistic' : a.state === 'COUNTERED' ? 'Employee proposed' : 'Waiting for employee';
      h += '<div class="card card-pad" style="margin-bottom:12px;border-left:3px solid ' + tone + '">';
      h += '<div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-start;margin-bottom:10px"><div style="flex:1;min-width:200px">' +
        '<div style="font-weight:650;font-size:14px">' + esc(d.title) + ' <span class="badge badge-green" style="font-family:var(--mono)">' + poRupee(d.pricePaise) + '</span></div>' +
        '<div style="font-size:12px;color:var(--t3);margin-top:3px">' + esc((DB.projects.find(function (p) { return p.id === d.projectId; }) || {}).name || '') + ' \u00b7 ' + emps.map(poEmpChip).join(' ') + '</div></div>' +
        '<span class="badge" style="background:' + tone + '20;color:' + tone + '">' + label + '</span></div>';
      h += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:10px">';
      h += '<div style="background:var(--s2);border-radius:var(--r8);padding:10px 12px"><div style="font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.4px">Your estimate</div><div style="font-size:16px;font-weight:700;font-family:var(--mono)">' + poTime(a.adminSecs) + '</div></div>';
      if (a.state === 'COUNTERED') h += '<div style="background:var(--blue-light);border-radius:var(--r8);padding:10px 12px"><div style="font-size:10px;color:var(--blue);text-transform:uppercase;letter-spacing:.4px">Employee’s</div><div style="font-size:16px;font-weight:700;font-family:var(--mono);color:var(--blue)">' + poTime(a.employeeSecs) + '</div></div>';
      if (hint.person) h += '<div style="background:var(--s2);border-radius:var(--r8);padding:10px 12px"><div style="font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.4px">This person’s similar tasks</div><div style="font-size:13px;font-weight:600">' + hint.person.count + ' tasks \u00b7 avg ' + poTime(hint.person.avgLoggedSecs) + '</div><div style="font-size:11px;color:var(--t3)">' + Math.round(hint.person.avgRatio * 100) + '% of estimate</div></div>';
      if (hint.team) h += '<div style="background:var(--s2);border-radius:var(--r8);padding:10px 12px"><div style="font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.4px">Team’s similar tasks</div><div style="font-size:13px;font-weight:600">' + hint.team.count + ' tasks \u00b7 avg ' + poTime(hint.team.avgLoggedSecs) + '</div><div style="font-size:11px;color:var(--t3)">' + Math.round(hint.team.avgRatio * 100) + '% of estimate</div></div>';
      h += '</div>';
      if (a.state === 'COUNTERED' && a.note) h += '<div style="font-size:12.5px;color:var(--t2);background:var(--blue-light);padding:8px 12px;border-radius:var(--r8);margin-bottom:10px"><b>Employee:</b> ' + esc(a.note) + '</div>';
      if (a.state === 'FLAGGED') h += '<div style="font-size:12.5px;color:var(--t2);background:var(--red-light);padding:8px 12px;border-radius:var(--r8);margin-bottom:10px"><b>Flag:</b> ' + esc(a.flagReason) + '</div>';
      h += '<div style="display:flex;gap:8px;flex-wrap:wrap">';
      if (a.state === 'COUNTERED') h += '<button class="btn btn-primary btn-sm" onclick="poAcceptProposal(' + d.id + ')">\u2713 ' + 'Accept ' + poTime(a.employeeSecs) + '</button>';
      h += '<button class="btn btn-secondary btn-sm" onclick="poCounter(' + d.id + ')">Propose a new estimate</button>';
      h += '<button class="btn btn-secondary btn-sm" onclick="openDeliverableDetail(' + d.projectId + ',' + d.id + ')">Open task</button>';
      h += '</div></div>';
    });
    pane.innerHTML = h;
  });
}
function poAcceptProposal(id) {
  Wallet.acceptProposal(id).then(function () { syncState(); toast('Estimate agreed \u2713 the employee can start', 'success'); renderPayouts(); })
    .catch(function (e) { toast(e.message, 'error'); });
}
function poCounter(id) {
  var d = DataAPI.raw().deliverables.find(function (x) { return x.id === id; }); if (!d) return;
  var cur = Math.round((d.agreement.employeeSecs || d.agreement.adminSecs || d.estimateSecs) / 360) / 10;
  openModal('New estimate',
    '<div style="font-size:13px;color:var(--t2);margin-bottom:12px"><b>' + esc(d.title) + '</b> \u00b7 ' + poRupee(d.pricePaise) + '</div>' +
    '<div class="form-row"><div class="form-group"><label class="form-label">Hours</label><input class="form-input" id="po-ct-hrs" type="number" step="0.5" min="0.5" value="' + cur + '"></div></div>' +
    '<div class="form-group"><label class="form-label">One line \u2014 the employee sees exactly this</label><textarea class="form-textarea" id="po-ct-note" rows="2" placeholder="e.g. the last 3 similar tasks took 1.3h, setting 1.5h"></textarea></div>',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="poCounterSave(' + id + ')">Send</button>');
}
function poCounterSave(id) {
  var hrs = parseFloat(document.getElementById('po-ct-hrs').value) || 0, note = document.getElementById('po-ct-note').value;
  Wallet.counterEstimate(id, Math.round(hrs * 3600), note).then(function () { closeModal(); syncState(); toast('Sent to the employee', 'success'); if (STATE.currentModule === 'payouts') renderPayouts(); else refreshView(); })
    .catch(function (e) { toast(e.message, 'error'); });
}

/* ══════════════════════════ BLOCKED ══════════════════════════ */
function poBlocked(pane) {
  Wallet.getBlocked().then(function (rows) {
    if (!rows.length) { pane.innerHTML = '<div class="empty-state"><div class="empty-icon">\u2713</div><div class="empty-title">Nobody is blocked</div><div class="empty-sub">When an employee taps "I’m blocked" it shows here \u2014 with the reason and how long.</div></div>'; return; }
    var h = '<div style="font-size:12.5px;color:var(--t3);margin-bottom:12px">Blocked time doesn’t count toward the employee’s slab \u2014 but it is <b>your</b> bottleneck. The faster you unblock, the less waste.</div>';
    rows.forEach(function (r) {
      var e = poEmp(r.byId);
      var hrs = r.waitingSecs / 3600;
      var tone = hrs >= 4 ? 'var(--red)' : 'var(--amber)';
      h += '<div class="card card-pad" style="margin-bottom:12px;border-left:3px solid ' + tone + '">' +
        '<div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-start"><div style="flex:1;min-width:200px">' +
        '<div style="font-weight:650;font-size:14px">' + esc(r.title) + (r.pricingMode === 'PIECE' ? ' <span class="badge badge-green" style="font-family:var(--mono)">' + poRupee(r.pricePaise) + '</span>' : '') + '</div>' +
        '<div style="font-size:12px;color:var(--t3);margin:3px 0 8px">' + esc(r.project) + ' \u00b7 ' + poEmpChip(e) + '</div>' +
        '<div style="font-size:13px;background:var(--red-light);padding:8px 12px;border-radius:var(--r8);color:var(--t1)"><b>Needs:</b> ' + esc(r.reason) + '</div></div>' +
        '<div style="text-align:right"><div style="font-size:20px;font-weight:700;font-family:var(--mono);color:' + tone + '">' + poAgo(r.since) + '</div><div style="font-size:11px;color:var(--t3)">waiting</div></div></div>' +
        '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button class="btn btn-primary btn-sm" onclick="poUnblock(' + r.id + ')">\u2713 Resolve \u2014 unblock</button>' +
        '<button class="btn btn-secondary btn-sm" onclick="openDeliverableDetail(' + r.projectId + ',' + r.id + ')">Open task</button></div></div>';
    });
    pane.innerHTML = h;
  });
}
function poUnblock(id) {
  openModal('Unblock',
    '<div class="form-group"><label class="form-label">What did you do? (the employee sees this)</label><textarea class="form-textarea" id="po-ub-note" rows="2" placeholder="e.g. sent the API keys / granted access"></textarea></div>',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="poUnblockSave(' + id + ')">Unblock</button>');
}
function poUnblockSave(id) {
  Wallet.unblock(id, STATE.adminUser.id, document.getElementById('po-ub-note').value).then(function () { closeModal(); syncState(); toast('Unblocked \u2014 the employee has been notified', 'success'); renderPayouts(); })
    .catch(function (e) { toast(e.message, 'error'); });
}

/* ══════════════════════════ DISPUTES ══════════════════════════ */
function poDisputes(pane) {
  Wallet.getDisputes().then(function (rows) {
    var open = rows.filter(function (x) { return x.status === 'OPEN'; }), closed = rows.filter(function (x) { return x.status !== 'OPEN'; });
    var h = '';
    if (!open.length) h += '<div class="empty-state" style="margin-bottom:16px"><div class="empty-icon">\u2713</div><div class="empty-title">No open disputes</div><div class="empty-sub">When an employee taps "Dispute" on a wallet entry it appears here. A reply note is required.</div></div>';
    open.forEach(function (x) {
      var e = poEmp(x.employeeId);
      h += '<div class="card card-pad" style="margin-bottom:12px;border-left:3px solid var(--amber)">' +
        '<div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:8px"><div><div style="font-weight:650">' + esc(x.taskTitle || 'Manual entry') + ' \u00b7 <span style="font-family:var(--mono)">' + poRupee(Math.abs(x.amountPaise)) + '</span></div>' +
        '<div style="font-size:12px;color:var(--t3);margin-top:3px">' + poEmpChip(e) + ' \u00b7 ' + poAgo(x.createdAt) + ' ago</div></div></div>' +
        '<div style="font-size:13px;background:var(--amber-light);padding:8px 12px;border-radius:var(--r8);margin-bottom:10px"><b>Employee:</b> ' + esc(x.reason) + '</div>' +
        '<div class="form-group" style="margin-bottom:8px"><textarea class="form-textarea" id="po-dr-' + x.id + '" rows="2" placeholder="Your reply \u2014 the employee sees exactly this (required)"></textarea></div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button class="btn btn-primary btn-sm" onclick="poResolve(\'' + x.id + '\',true)">\u2713 Accept \u2014 credit ' + poRupee(Math.abs(x.amountPaise)) + ' credit</button>' +
        '<button class="btn btn-secondary btn-sm" onclick="poResolvePartial(\'' + x.id + '\')">Partial credit</button>' +
        '<button class="btn btn-secondary btn-sm" onclick="poResolve(\'' + x.id + '\',false)">Decline \u2014 the entry was correct</button></div></div>';
    });
    if (closed.length) {
      h += '<div class="card card-pad"><div class="section-title" style="font-size:13px;margin-bottom:10px">Resolved</div><div class="data-table-wrap"><table class="data-table"><thead><tr><th>Employee</th><th>Task</th><th>Reason</th><th>Result</th></tr></thead><tbody>';
      closed.forEach(function (x) {
        h += '<tr><td>' + esc(x.employeeName) + '</td><td>' + esc(x.taskTitle || '\u2014') + '</td><td style="font-size:12px">' + esc(x.reason) + '<div style="color:var(--t3)">Admin: ' + esc(x.resolutionNote) + '</div></td><td>' + (x.status === 'ACCEPTED' ? '<span class="badge badge-green">+' + poRupee(x.creditedPaise) + '</span>' : '<span class="badge badge-grey">Not accepted</span>') + '</td></tr>';
      });
      h += '</tbody></table></div></div>';
    }
    pane.innerHTML = h;
  });
}
function poResolve(id, accept, creditPaise) {
  var note = (document.getElementById('po-dr-' + id) || {}).value || (window._poPartialNote || '');
  Wallet.resolveDispute(id, { accept: accept, note: note, creditPaise: creditPaise }).then(function () { closeModal(); syncState(); toast(accept ? 'Credit added' : 'Dispute closed', 'success'); renderPayouts(); })
    .catch(function (e) { toast(e.message, 'error'); });
}
function poResolvePartial(id) {
  var note = (document.getElementById('po-dr-' + id) || {}).value || '';
  openModal('Partial credit',
    '<div class="form-group"><label class="form-label">Credit amount (\u20B9)</label><input class="form-input" id="po-pc-amt" type="number" min="1" step="1"></div>' +
    '<div class="form-group"><label class="form-label">Note (the employee sees this)</label><textarea class="form-textarea" id="po-pc-note" rows="2">' + esc(note) + '</textarea></div>',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="poResolvePartialSave(\'' + id + '\')">Give credit</button>');
}
function poResolvePartialSave(id) {
  var amt = parseFloat(document.getElementById('po-pc-amt').value) || 0, note = document.getElementById('po-pc-note').value;
  Wallet.resolveDispute(id, { accept: true, note: note, creditPaise: Math.round(amt * 100) }).then(function () { closeModal(); syncState(); toast('Partial credit added', 'success'); renderPayouts(); })
    .catch(function (e) { toast(e.message, 'error'); });
}

/* ══════════════════════════ LEDGER ══════════════════════════ */
function poLedger(pane) {
  var DB = DataAPI.raw();
  Wallet.getLedger(PO_FILTER).then(function (rows) {
    var months = {}; DB.walletEntries.forEach(function (w) { months[w.createdAt.slice(0, 7)] = 1; });
    var h = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">' +
      '<select class="form-select" style="width:auto" onchange="PO_FILTER.employeeId=this.value;renderPayouts()"><option value="">Everyone</option>' + DB.employees.map(function (e) { return '<option value="' + e.id + '"' + (String(PO_FILTER.employeeId) === String(e.id) ? ' selected' : '') + '>' + esc(e.name) + '</option>'; }).join('') + '</select>' +
      '<select class="form-select" style="width:auto" onchange="PO_FILTER.type=this.value;renderPayouts()"><option value="">All types</option>' + Object.keys(Wallet.ENTRY_TYPES).map(function (t) { return '<option value="' + t + '"' + (PO_FILTER.type === t ? ' selected' : '') + '>' + Wallet.ENTRY_TYPES[t].label + '</option>'; }).join('') + '</select>' +
      '<select class="form-select" style="width:auto" onchange="PO_FILTER.month=this.value;renderPayouts()"><option value="">All months</option>' + Object.keys(months).sort().reverse().map(function (m) { return '<option value="' + m + '"' + (PO_FILTER.month === m ? ' selected' : '') + '>' + m + '</option>'; }).join('') + '</select></div>';
    if (!rows.length) { h += '<div class="empty-state"><div class="empty-icon">\uD83D\uDCB0</div><div class="empty-title">The ledger is empty</div><div class="empty-sub">Approve a priced task and entries appear here \u2014 credit and slab separately, each with a reason.</div></div>'; pane.innerHTML = h; return; }
    var total = rows.reduce(function (s, w) { return s + w.amountPaise; }, 0);
    h += '<div class="card card-pad"><div class="section-header"><div class="section-title">' + rows.length + ' entries</div><div style="font-family:var(--mono);font-weight:700">' + (total >= 0 ? '+' : '\u2212') + poRupee(Math.abs(total)) + '</div></div>';
    h += '<div class="data-table-wrap"><table class="data-table"><thead><tr><th>When</th><th>Who</th><th>Type</th><th>Task</th><th>Why</th><th style="text-align:right">Amount</th></tr></thead><tbody>';
    rows.forEach(function (w) {
      var pos = w.amountPaise > 0;
      h += '<tr><td style="white-space:nowrap;font-size:12px;color:var(--t3)">' + fmtDate(w.createdAt) + '</td><td>' + esc(w.employeeName) + '</td><td><span class="badge ' + (w.type === 'SLAB_ADJUSTMENT' ? 'badge-red' : w.type === 'PAYOUT' ? 'badge-grey' : 'badge-green') + '">' + Wallet.ENTRY_TYPES[w.type].label + '</span>' + (w.disputeStatus ? '<div style="font-size:10.5px;color:var(--amber);margin-top:2px">dispute ' + w.disputeStatus.toLowerCase() + '</div>' : '') + '</td>' +
        '<td style="font-size:12.5px">' + esc(w.taskTitle || '\u2014') + '</td><td style="font-size:12px;color:var(--t2);max-width:320px">' + esc(w.why) + '</td>' +
        '<td style="text-align:right;font-family:var(--mono);font-weight:600;color:' + (pos ? 'var(--green)' : 'var(--red)') + ';white-space:nowrap">' + (pos ? '+' : '\u2212') + poRupee(Math.abs(w.amountPaise)) + '</td></tr>';
    });
    h += '</tbody></table></div></div>';
    pane.innerHTML = h;
  });
}

/* ══════════════════════════ PEOPLE ══════════════════════════ */
function poPeople(pane, sum) {
  Wallet.getEstimateBehaviour().then(function (beh) {
    var behById = {}; beh.forEach(function (b) { behById[b.id] = b; });
    var h = '<div style="font-size:12.5px;color:var(--t3);margin-bottom:12px">Low on-time % = tight estimates or a slow person. Very low ratio (<60%) = padded estimates \u2014 check both when negotiating.</div>';
    h += '<div class="card card-pad"><div class="data-table-wrap"><table class="data-table"><thead><tr><th>Employee</th><th style="text-align:right">Earned</th><th style="text-align:right">Slab</th><th style="text-align:right">Paid out</th><th style="text-align:right">Balance</th><th>Tasks</th><th>On-time</th><th>Logged/est</th><th>Rework</th><th></th></tr></thead><tbody>';
    sum.byEmployee.forEach(function (e) {
      var b = behById[e.id] || {};
      var onPct = e.tasksDone ? Math.round(e.onTime / e.tasksDone * 100) : null;
      var ratioTone = b.sandbagging ? 'var(--amber)' : (e.avgRatio != null && e.avgRatio > 1.25) ? 'var(--red)' : 'var(--t2)';
      h += '<tr><td>' + poEmpChip(poEmp(e.id)) + (e.openDisputes ? '<div style="font-size:10.5px;color:var(--amber)">' + e.openDisputes + ' dispute open</div>' : '') + '</td>' +
        '<td style="text-align:right;font-family:var(--mono)">' + poRupee(e.earnedPaise) + '</td><td style="text-align:right;font-family:var(--mono);color:var(--red)">' + (e.slabPaise ? '\u2212' + poRupee(Math.abs(e.slabPaise)) : '\u2014') + '</td>' +
        '<td style="text-align:right;font-family:var(--mono)">' + poRupee(e.paidOutPaise) + '</td><td style="text-align:right;font-family:var(--mono);font-weight:700">' + poRupee(e.balancePaise) + '</td>' +
        '<td>' + e.tasksDone + ' done \u00b7 ' + e.openTasks + ' open</td><td>' + (onPct == null ? '\u2014' : '<span style="color:' + (onPct >= 80 ? 'var(--green)' : onPct >= 50 ? 'var(--amber)' : 'var(--red)') + ';font-weight:600">' + onPct + '%</span>') + '</td>' +
        '<td style="color:' + ratioTone + '">' + (b.avgRatio != null ? Math.round(b.avgRatio * 100) + '%' + (b.sandbagging ? ' \u26A0' : '') : '\u2014') + '</td><td>' + (e.reworks || 0) + '</td>' +
        '<td><button class="btn btn-secondary btn-sm" onclick="poAddEntry(' + e.id + ')">Payout / bonus</button></td></tr>';
    });
    h += '</tbody></table></div></div>';
    pane.innerHTML = h;
  });
}
function poAddEntry(empId) {
  var DB = DataAPI.raw();
  openModal('Bonus / Payout / Adjustment',
    '<div class="form-group"><label class="form-label">Employee</label><select class="form-select" id="po-ae-emp">' + DB.employees.map(function (e) { return '<option value="' + e.id + '"' + (e.id === empId ? ' selected' : '') + '>' + esc(e.name) + '</option>'; }).join('') + '</select></div>' +
    '<div class="form-row"><div class="form-group"><label class="form-label">Type</label><select class="form-select" id="po-ae-type"><option value="PAYOUT">Payout (money paid)</option><option value="BONUS">Bonus</option><option value="ADJUSTMENT">Adjustment (+/\u2212)</option></select></div>' +
    '<div class="form-group"><label class="form-label">Amount (\u20B9)</label><input class="form-input" id="po-ae-amt" type="number" step="1"></div></div>' +
    '<div class="form-group"><label class="form-label">Why? (every ledger entry has a reason)</label><textarea class="form-textarea" id="po-ae-why" rows="2" placeholder="e.g. September payout, UPI ref 4412"></textarea></div>',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="poAddEntrySave()">Add entry</button>');
}
function poAddEntrySave() {
  var emp = document.getElementById('po-ae-emp').value, type = document.getElementById('po-ae-type').value;
  var amt = parseFloat(document.getElementById('po-ae-amt').value) || 0, why = document.getElementById('po-ae-why').value;
  Wallet.addEntry(emp, type, Math.round(amt * 100), why).then(function () { closeModal(); syncState(); toast('Entry added', 'success'); renderPayouts(); })
    .catch(function (e) { toast(e.message, 'error'); });
}

/* ══════════════════════════ POLICY ══════════════════════════ */
function poPolicy(pane) {
  Wallet.getPolicy().then(function (p) {
    var ex = 50000, cut = Math.round(ex * p.slabCutPct / 100);
    var h = '<div class="card card-pad" style="max-width:720px">' +
      '<div class="section-title" style="margin-bottom:4px">Pay policy</div><div class="section-sub" style="margin-bottom:16px">These defaults apply to new tasks. Task-level slabs can be edited separately.</div>' +
      '<div class="form-row"><div class="form-group"><label class="form-label">Slab step (hours)</label><input class="form-input" id="pp-step" type="number" step="0.5" min="0.25" value="' + (p.slabStepSecs / 3600) + '"><div style="font-size:11px;color:var(--t3);margin-top:4px">Each block of this much extra time = one slab</div></div>' +
      '<div class="form-group"><label class="form-label">Slab cut (%)</label><input class="form-input" id="pp-cut" type="number" step="1" min="0" max="50" value="' + p.slabCutPct + '"><div style="font-size:11px;color:var(--t3);margin-top:4px">\u20B9500 task \u2192 each slab \u2212' + poRupee(cut) + '</div></div></div>' +
      '<div class="form-row"><div class="form-group"><label class="form-label">Floor (%)</label><input class="form-input" id="pp-floor" type="number" step="5" min="0" max="100" value="' + p.floorPct + '"><div style="font-size:11px;color:var(--t3);margin-top:4px">The price never goes below this \u2014 for legal and fairness reasons</div></div>' +
      '<div class="form-group"><label class="form-label">Grace (minutes)</label><input class="form-input" id="pp-grace" type="number" step="5" min="0" value="' + Math.round(p.graceSecs / 60) + '"><div style="font-size:11px;color:var(--t3);margin-top:4px">Free time after the estimate</div></div></div>' +
      '<div class="form-row"><div class="form-group"><label class="form-label">WIP limit</label><input class="form-input" id="pp-wip" type="number" step="1" min="1" value="' + p.wipLimit + '"><div style="font-size:11px;color:var(--t3);margin-top:4px">Active tasks per person at one time</div></div>' +
      '<div class="form-group"><label class="form-label">Auto-agree: price below (\u20B9)</label><input class="form-input" id="pp-auto-p" type="number" step="50" min="0" value="' + (p.autoAgreeBelowPaise / 100) + '"><div style="font-size:11px;color:var(--t3);margin-top:4px">No negotiation on small tasks \u2014 agreed immediately</div></div></div>' +
      '<div class="form-row"><div class="form-group"><label class="form-label">Auto-agree: estimate below (hours)</label><input class="form-input" id="pp-auto-s" type="number" step="0.5" min="0" value="' + (p.autoAgreeBelowSecs / 3600) + '"></div>' +
      '<div class="form-group"><label class="form-label">Flag window (minutes)</label><input class="form-input" id="pp-flag" type="number" step="5" min="0" value="' + Math.round(p.flagWindowSecs / 60) + '"><div style="font-size:11px;color:var(--t3);margin-top:4px">Minutes to flag an auto-agreed task</div></div></div>' +
      '<div class="form-row"><div class="form-group"><label class="form-label">Sandbagging ratio</label><input class="form-input" id="pp-sb" type="number" step="0.05" min="0.1" max="1" value="' + p.sandbagRatio + '"><div style="font-size:11px;color:var(--t3);margin-top:4px">Logged/estimate consistently below this = signal</div></div>' +
      '<div class="form-group"><label class="form-label">\u2026over at least this many tasks</label><input class="form-input" id="pp-sbn" type="number" step="1" min="2" value="' + p.sandbagMinTasks + '"></div></div>' +
      '<div class="form-group"><label style="display:flex;gap:8px;align-items:center;font-size:13px"><input type="checkbox" id="pp-email" ' + (p.emailOnCredit ? 'checked' : '') + '> Queue an email on credit (the backend will send it)</label></div>' +
      '<div class="form-group" style="background:var(--s2);border-radius:var(--r8);padding:12px"><label style="display:flex;gap:8px;align-items:flex-start;font-size:13px"><input type="checkbox" id="pp-showmoney" ' + (p.showMoneyToEmployees ? 'checked' : '') + ' style="margin-top:2px"> <span><b>Show money to employees</b><br><span style="font-size:12px;color:var(--t3)">Off (default): only you see prices, wallets and slabs \u2014 employees still get the agreed-time flow, blocked button and focus queue, just without amounts. On: employees see their task price, live slab preview and wallet.</span></span></label></div>' +
      '<div style="background:var(--amber-light);padding:10px 12px;border-radius:var(--r8);font-size:12px;color:var(--amber);margin-bottom:14px">Legal note: for employees (not contractors), salary deductions are regulated under the Payment of Wages Act. This system uses "price schedule" framing, not "fines" \u2014 confirm with a labour-law professional before launch.</div>' +
      '<button class="btn btn-primary" onclick="poSavePolicy()">Save policy</button></div>';
    pane.innerHTML = h;
  });
}
function poSavePolicy() {
  var g = function (id) { return document.getElementById(id); };
  Wallet.updatePolicy({
    slabStepSecs: Math.round((parseFloat(g('pp-step').value) || 1) * 3600), slabCutPct: parseFloat(g('pp-cut').value) || 0,
    floorPct: parseFloat(g('pp-floor').value) || 0, graceSecs: Math.round((parseFloat(g('pp-grace').value) || 0) * 60),
    wipLimit: parseInt(g('pp-wip').value, 10) || 2, autoAgreeBelowPaise: Math.round((parseFloat(g('pp-auto-p').value) || 0) * 100),
    autoAgreeBelowSecs: Math.round((parseFloat(g('pp-auto-s').value) || 0) * 3600), flagWindowSecs: Math.round((parseFloat(g('pp-flag').value) || 0) * 60),
    sandbagRatio: parseFloat(g('pp-sb').value) || 0.6, sandbagMinTasks: parseInt(g('pp-sbn').value, 10) || 4, emailOnCredit: g('pp-email').checked,
    showMoneyToEmployees: g('pp-showmoney').checked
  }).then(function () { toast('Policy saved', 'success'); renderPayouts(); }).catch(function (e) { toast(e.message, 'error'); });
}

/* ══════════════════════════ OUTBOX ══════════════════════════ */
function poOutbox(pane) {
  Wallet.getOutbox().then(function (rows) {
    var h = '<div style="font-size:12.5px;color:var(--t3);margin-bottom:12px">Automated emails \u2014 credit, slab, payout. Queued for now; they’ll go out via SMTP once the backend is connected (nothing changes in the frontend, it reads the same queue).</div>';
    if (!rows.length) { pane.innerHTML = h + '<div class="empty-state"><div class="empty-icon">\u2709\uFE0F</div><div class="empty-title">Outbox is empty</div><div class="empty-sub">Approve a priced task \u2014 the email will queue here.</div></div>'; return; }
    h += '<div class="card card-pad"><div class="data-table-wrap"><table class="data-table"><thead><tr><th>When</th><th>To</th><th>Subject</th><th>Status</th></tr></thead><tbody>';
    rows.forEach(function (m) {
      h += '<tr style="cursor:pointer" onclick="poShowMail(\'' + m.id + '\')"><td style="font-size:12px;white-space:nowrap;color:var(--t3)">' + fmtDate(m.createdAt) + '</td><td>' + esc(m.to) + '</td><td>' + esc(m.subject) + '</td><td><span class="badge ' + (m.status === 'QUEUED' ? 'badge-amber' : 'badge-green') + '">' + m.status + '</span></td></tr>';
    });
    pane.innerHTML = h + '</tbody></table></div></div>';
  });
}
function poShowMail(id) {
  var m = (DataAPI.raw().outbox || []).find(function (x) { return x.id === id; }); if (!m) return;
  openModal(m.subject, '<div style="font-size:12px;color:var(--t3);margin-bottom:8px">To: ' + esc(m.to) + '</div><pre style="white-space:pre-wrap;font-family:var(--font);font-size:13px;line-height:1.6;background:var(--s2);padding:12px;border-radius:var(--r8)">' + esc(m.body) + '</pre>',
    '<button class="btn btn-secondary" onclick="closeModal()">Close</button>');
}

/* ══════════════════════════ EXPORT ══════════════════════════ */
function poExport() {
  Wallet.getLedger({}).then(function (rows) {
    var csv = ['Date,Employee,Type,Task,Project,Amount (INR),Why'].concat(rows.map(function (w) {
      return [w.createdAt.slice(0, 10), w.employeeName, w.type, w.taskTitle || '', w.project || '', (w.amountPaise / 100).toFixed(2), w.why].map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(',');
    })).join('\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'oment-wallet-ledger.csv'; a.click();
    toast('Ledger exported', 'success');
  });
}


/* ══════════════════════════ TASK-LEVEL PANEL (deliverable detail modal) ══════════════════════════ */
function _hourlyCostCard(t) {
  var d = DataAPI.raw().deliverables.find(function (x) { return x.id === t.id; }) || {};
  var cs = d.costSnapshot;
  if (cs && cs.costPaise > 0) {
    return '<div style="background:var(--green-light);border-radius:var(--r8);padding:10px 12px;font-size:12.5px;color:#1E8E3E"><b>This task cost ' + Utils.fmtRupee(cs.costPaise).replace('.00','') + '</b>' +
      (cs.mode === 'HOURLY' && cs.ratePaise ? ' \u2014 ' + Schema.TIME.fmtShort(cs.secs) + ' \u00d7 ' + Utils.fmtRupee(cs.ratePaise).replace('.00','') + '/hr (from salary)' : ' \u2014 settled piece price') + '. Snapshot frozen at approval.</div>';
  }
  var rates = (d.assigneeIds || []).map(function (aid) {
    var e = DataAPI.raw().employees.find(function (x) { return x.id === aid; });
    return e ? (e.costPerHourPaise || 0) : 0;
  });
  var avg = rates.length ? Math.round(rates.reduce(function (a, b) { return a + b; }, 0) / rates.length) : 0;
  var secs = d.loggedSecs || 0;
  if (!avg) return '<div style="font-size:12.5px;color:var(--t3)">Hourly task \u2014 no salary set for the assignee, so cost can\u2019t be computed. Add their monthly salary in Employees \u2192 Edit.</div>';
  return '<div style="font-size:12.5px;color:var(--t2);background:var(--s2);border-radius:var(--r8);padding:10px 12px">Hourly task \u00b7 rate <b>' + Utils.fmtRupee(avg).replace('.00','') + '/hr</b> (auto from salary) \u00b7 logged ' + Schema.TIME.fmtShort(secs) + ' \u2192 cost so far <b>' + Utils.fmtRupee(Math.round(secs / 3600 * avg)).replace('.00','') + '</b>. Frozen as a snapshot on approval.</div>';
}

function renderPayPanel(pid, t) {
  var d = DataAPI.raw().deliverables.find(function (x) { return x.id === t.id; });
  if (!d || typeof Wallet === 'undefined') return '';
  var h = '<div style="margin-bottom:16px;border:1px solid var(--b1);border-radius:var(--r10);padding:12px 14px;background:var(--surface)">';
  h += '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px"><div style="font-size:10.5px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.4px">\uD83D\uDCB0 Pay</div>' +
    (d.status !== 'DONE' ? '<button class="btn btn-secondary btn-sm" onclick="poEditPricing(' + pid + ',' + d.id + ')">' + (d.pricingMode === 'PIECE' ? 'Edit price' : 'Set fixed price') + '</button>' : '') + '</div>';

  if (d.blocked) {
    h += '<div style="background:var(--red-light);border:1px solid rgba(220,38,38,.25);border-radius:var(--r8);padding:9px 12px;margin-bottom:10px;font-size:12.5px"><b style="color:var(--red)">\uD83D\uDED1 Blocked ' + poAgo(d.blocked.since) + ' ago:</b> ' + esc(d.blocked.reason) +
      '<div style="margin-top:8px"><button class="btn btn-primary btn-sm" onclick="closeModal();setTimeout(function(){poUnblock(' + d.id + ')},150)">Unblock</button></div></div>';
  }
  if (d.pricingMode !== 'PIECE') {
    h += _hourlyCostCard(t);
    return h + '</div>';
  }
  var a = d.agreement || { state: 'NONE' };
  var s = d.settlement;
  h += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-bottom:10px">';
  h += '<div style="background:var(--s2);border-radius:var(--r8);padding:8px 10px"><div style="font-size:10px;color:var(--t3);text-transform:uppercase">Price</div><div style="font-family:var(--mono);font-weight:700;font-size:15px">' + poRupee(d.pricePaise) + '</div></div>';
  h += '<div style="background:var(--s2);border-radius:var(--r8);padding:8px 10px"><div style="font-size:10px;color:var(--t3);text-transform:uppercase">Agreed time</div><div style="font-family:var(--mono);font-weight:700;font-size:15px">' + poTime(d.estimateSecs) + '</div></div>';
  h += '<div style="background:var(--s2);border-radius:var(--r8);padding:8px 10px"><div style="font-size:10px;color:var(--t3);text-transform:uppercase">Logged</div><div style="font-family:var(--mono);font-weight:700;font-size:15px;color:' + (d.loggedSecs > d.estimateSecs ? 'var(--red)' : 'var(--t1)') + '">' + poTime(d.loggedSecs) + '</div></div>';
  h += '<div style="background:var(--s2);border-radius:var(--r8);padding:8px 10px"><div style="font-size:10px;color:var(--t3);text-transform:uppercase">Slab</div><div style="font-size:12px;font-weight:600">\u2212' + (d.slab || {}).cutPct + '% / ' + poTime((d.slab || {}).stepSecs) + '<div style="font-size:10.5px;color:var(--t3);font-weight:400">floor ' + (d.slab || {}).floorPct + '%</div></div></div>';
  h += '</div>';

  if (s) {
    h += '<div style="background:var(--green-light);border-radius:var(--r8);padding:9px 12px;font-size:12.5px"><b>Settled: ' + poRupee(s.finalPaise) + '</b>' + (s.cutPaise ? ' <span style="color:var(--red)">(\u2212' + poRupee(s.cutPaise) + ' slab)</span>' : '') + '<div style="color:var(--t2);margin-top:3px">' + esc(s.why) + '</div></div>';
  } else {
    var tone = a.state === 'AGREED' ? 'var(--green)' : a.state === 'FLAGGED' ? 'var(--red)' : a.state === 'COUNTERED' ? 'var(--blue)' : 'var(--amber)';
    var label = (Wallet.AGREEMENT[a.state] || {}).label || a.state;
    h += '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:12.5px"><span class="badge" style="background:' + tone + '20;color:' + tone + '">' + label + (a.auto ? ' (auto)' : '') + '</span>';
    if (a.state === 'COUNTERED') h += '<span>Employee: <b>' + poTime(a.employeeSecs) + '</b> \u2014 ' + esc(a.note) + '</span><button class="btn btn-primary btn-sm" onclick="poAcceptProposal(' + d.id + ');setTimeout(closeModal,150)">Accept</button><button class="btn btn-secondary btn-sm" onclick="closeModal();setTimeout(function(){poCounter(' + d.id + ')},150)">Counter</button>';
    else if (a.state === 'FLAGGED') h += '<span>' + esc(a.flagReason) + '</span><button class="btn btn-secondary btn-sm" onclick="closeModal();setTimeout(function(){poCounter(' + d.id + ')},150)">New estimate</button>';
    else if (a.state === 'PENDING') h += '<span style="color:var(--t3)">The employee hasn’t accepted yet \u2014 the timer won’t run</span>';
    else if (a.state === 'AGREED' && d.status !== 'DONE') {
      var pv = Wallet.slabPreview(d);
      h += '<span style="color:var(--t2)">Currently ' + poRupee(pv.currentPaise) + (pv.secsToNext != null ? ' \u00b7 next slab in ' + poTime(pv.secsToNext) : ' \u00b7 at floor') + '</span>';
    }
    h += '</div>';
    if (d.status === 'IN_REVIEW') {
      var prev = Wallet.computeSettlement(d);
      h += '<div style="margin-top:8px;font-size:12px;color:var(--t2);background:var(--amber-light);padding:8px 12px;border-radius:var(--r8)">On approval: <b>' + poRupee(prev.finalPaise) + '</b> credit' + (prev.cutPaise ? ' (\u2212' + poRupee(prev.cutPaise) + ' slab)' : '') + '. ' + esc(prev.why) + '</div>';
    }
  }
  if (d.reworkCount) h += '<div style="font-size:11.5px;color:var(--t3);margin-top:6px">\u21BB ' + d.reworkCount + ' time(s) sent back</div>';
  return h + '</div>';
}

function poEditPricing(pid, id) {
  var d = DataAPI.raw().deliverables.find(function (x) { return x.id === id; }); if (!d) return;
  var slab = d.slab || Wallet.slabFromPolicy();
  openModal('Task price',
    '<div style="font-size:13px;color:var(--t2);margin-bottom:12px"><b>' + esc(d.title) + '</b></div>' +
    '<div class="form-group"><label class="form-label">Pricing</label><select class="form-select" id="pe-mode"><option value="HOURLY"' + (d.pricingMode !== 'PIECE' ? ' selected' : '') + '>Hourly (cost from employee rate)</option><option value="PIECE"' + (d.pricingMode === 'PIECE' ? ' selected' : '') + '>Fixed price (task price, late slab)</option></select></div>' +
    '<div class="form-row"><div class="form-group"><label class="form-label">Price (\u20B9)</label><input class="form-input" id="pe-price" type="number" min="0" step="50" value="' + (d.pricePaise / 100) + '"></div>' +
    '<div class="form-group"><label class="form-label">Agreed time (hours)</label><input class="form-input" id="pe-hrs" type="number" min="0.25" step="0.25" value="' + (Math.round(d.estimateSecs / 360) / 10) + '"></div></div>' +
    '<div class="form-row"><div class="form-group"><label class="form-label">Slab cut (%)</label><input class="form-input" id="pe-cut" type="number" min="0" max="50" value="' + slab.cutPct + '"></div>' +
    '<div class="form-group"><label class="form-label">Floor (%)</label><input class="form-input" id="pe-floor" type="number" min="0" max="100" value="' + slab.floorPct + '"></div></div>' +
    '<div style="font-size:11.5px;color:var(--t3)">Changing the estimate means the employee must accept it again.</div>',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="poEditPricingSave(' + pid + ',' + id + ')">Save</button>');
}
function poEditPricingSave(pid, id) {
  var d = DataAPI.raw().deliverables.find(function (x) { return x.id === id; }); if (!d) return;
  var mode = document.getElementById('pe-mode').value, price = Math.round((parseFloat(document.getElementById('pe-price').value) || 0) * 100);
  var secs = Math.round((parseFloat(document.getElementById('pe-hrs').value) || 0) * 3600);
  var cut = parseFloat(document.getElementById('pe-cut').value) || 0, floor = parseFloat(document.getElementById('pe-floor').value) || 0;
  var estChanged = secs !== d.estimateSecs;
  Wallet.setPricing(id, { pricingMode: mode, pricePaise: price, slab: { cutPct: cut, floorPct: floor } }).then(function () {
    if (estChanged && mode === 'PIECE') return Wallet.counterEstimate(id, secs, 'The admin updated the estimate');
    if (estChanged) return DataAPI.updateDeliverable(id, { estimateSecs: secs });
  }).then(function () { closeModal(); syncState(); toast('Price saved', 'success'); if (typeof renderMilestonesTab === 'function') renderMilestonesTab(pid); })
    .catch(function (e) { toast(e.message, 'error'); });
}

function poCardBadges(t) {
  if (!t) return '';
  var h = '';
  if (t.pricingMode === 'PIECE') {
    h += '<span style="font-size:10px;padding:2px 7px;border-radius:99px;background:var(--green-light);color:var(--green);font-weight:700;font-family:var(--mono)">' + poRupee(t.settlement ? t.settlement.finalPaise : t.pricePaise) + '</span>';
    var a = t.agreement || {};
    if (!t.settlement && a.state && a.state !== 'AGREED') {
      var tone = a.state === 'FLAGGED' ? 'var(--red)' : a.state === 'COUNTERED' ? 'var(--blue)' : 'var(--amber)';
      h += '<span style="font-size:10px;padding:2px 7px;border-radius:99px;background:' + tone + '20;color:' + tone + ';font-weight:600" title="Estimate not yet agreed">' + (a.state === 'COUNTERED' ? 'Proposal' : a.state === 'FLAGGED' ? 'Flagged' : 'Not agreed') + '</span>';
    }
  }
  if (t.blocked) h += '<span style="font-size:10px;padding:2px 7px;border-radius:99px;background:var(--red-light);color:var(--red);font-weight:700" title="' + esc(t.blocked.reason) + '">\uD83D\uDED1 Blocked</span>';
  return h;
}


/* ══════════════════════════ PAY TEAM ══════════════════════════
   One line per employee: earned, paid, still to pay — record a payment or
   see / undo the history. Everything comes from the pay ledger. */
function poMoneyOf(empId) {
  var W = (DataAPI.raw().walletEntries || []).filter(function (w) {
    return w.employeeId === empId && !((w.type === 'BONUS' && w.meta && w.meta.direct) || (w.meta && w.meta.cancels));   // old payment-as-earnings lines cancel out
  });
  var payoutIds = {}; W.forEach(function (w) { if (w.type === 'PAYOUT') payoutIds[w.id] = 1; });
  var earned = 0, paid = 0, last = null;
  W.forEach(function (w) {
    if (w.type === 'PAYOUT') { paid += -w.amountPaise; if (!last || w.createdAt > last) last = w.createdAt; }
    else if (w.meta && w.meta.reversalOf && payoutIds[w.meta.reversalOf]) paid -= w.amountPaise;
    else earned += w.amountPaise;
  });
  return { earned: earned, paid: paid, remaining: earned - paid, last: last };
}

function poPayTeam(pane) {
  var DB = DataAPI.raw();
  var emps = (DB.employees || []).filter(function (e) { return e.active !== false; });
  var rows = emps.map(function (e) { return { e: e, m: poMoneyOf(e.id) }; });
  var tot = rows.reduce(function (t, r) { t.earned += r.m.earned; t.paid += r.m.paid; t.remaining += r.m.remaining; return t; }, { earned: 0, paid: 0, remaining: 0 });
  var box = function (l, v, c, sub) {
    return '<div class="card card-pad" style="padding:14px 16px"><div style="font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:.4px;font-weight:600">' + l + '</div>' +
      '<div style="font-size:22px;font-weight:700;font-family:var(--mono);color:' + c + ';margin-top:2px">' + poRupee(v) + '</div><div style="font-size:12px;color:var(--t3)">' + sub + '</div></div>';
  };
  var h = '<div id="ps-wrap"></div>' +
    '<div class="section-title" style="margin:6px 0 10px">All-time balance <span style="font-size:12px;font-weight:400;color:var(--t3)">\u2014 task, milestone and bonus pay in the ledger, since the start</span></div>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:14px">' +
    box('Earned by the team', tot.earned, 'var(--t1)', 'task pay, milestone pay, bonuses, direct payments') +
    box('Paid', tot.paid, 'var(--blue)', 'money you recorded as paid') +
    box('Still to pay', tot.remaining, tot.remaining > 0 ? 'var(--amber)' : 'var(--green)', tot.remaining > 0 ? 'owed to the team right now' : 'everyone is paid up') +
  '</div>';
  h += '<div class="card" style="overflow-x:auto"><table class="data-table" style="min-width:720px"><thead><tr>' +
    '<th>Employee</th><th style="text-align:right">Earned</th><th style="text-align:right">Paid</th><th style="text-align:right">Still to pay</th><th>Last payment</th><th style="text-align:right">Actions</th></tr></thead><tbody>' +
    rows.map(function (r) {
      var e = r.e, m = r.m;
      return '<tr><td>' + poEmpChip(poEmp(e.id)) + '</td>' +
        '<td style="text-align:right;font-family:var(--mono)">' + poRupee(m.earned) + '</td>' +
        '<td style="text-align:right;font-family:var(--mono);color:var(--blue)">' + poRupee(m.paid) + '</td>' +
        '<td style="text-align:right;font-family:var(--mono);font-weight:700;color:' + (m.remaining > 0 ? 'var(--amber)' : m.remaining < 0 ? 'var(--red)' : 'var(--green)') + '">' +
          (m.remaining < 0 ? 'advance ' + poRupee(-m.remaining) : poRupee(m.remaining)) + '</td>' +
        '<td style="font-size:12px;color:var(--t3)">' + (m.last ? new Date(m.last).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '\u2014') + '</td>' +
        '<td><div style="display:flex;gap:6px;justify-content:flex-end">' +
          '<button class="btn btn-xs" style="background:var(--green);color:#fff" onclick="openEmpPaymentModal(' + e.id + ')">\uD83D\uDCB8 Record payment</button>' +
          '<button class="btn btn-secondary btn-xs" onclick="poPayHistory(' + e.id + ')">History</button></div></td></tr>';
    }).join('') + '</tbody></table></div>' +
    '<div style="font-size:12px;color:var(--t3);margin-top:10px">"Still to pay" = earned \u2212 paid. A negative figure means you paid in advance. Recorded a payment by mistake? Open History \u2192 Undo.</div>';
  pane.innerHTML = h;
  if (typeof psRender === 'function') psRender();
}

function poPayHistory(empId) {
  var DB = DataAPI.raw();
  var e = (DB.employees || []).find(function (x) { return x.id === empId; }) || { name: 'Employee' };
  var W = (DB.walletEntries || []).filter(function (w) { return w.employeeId === empId; })
    .sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
  var undone = {}; W.forEach(function (w) { if (w.meta && (w.meta.reversalOf || w.meta.cancels)) undone[w.meta.reversalOf || w.meta.cancels] = 1; });
  /* hide the old automatic "payment as earnings" lines and their corrections — they cancel out */
  W = W.filter(function (w) { return !(w.meta && (w.meta.system || (w.type === 'BONUS' && w.meta.direct))); });
  var m = poMoneyOf(empId);
  var proj = function (id) { var p = (DB.projects || []).find(function (x) { return x.id === id; }); return p ? p.name : ''; };
  var row = function (w) {
    var pay = w.type === 'PAYOUT', meta = w.meta || {};
    var date = meta.date ? new Date(meta.date + 'T12:00:00') : new Date(w.createdAt);
    return '<div style="display:flex;gap:10px;align-items:flex-start;padding:10px 4px;border-bottom:1px solid var(--b1);' + (undone[w.id] ? 'opacity:.5;' : '') + '">' +
      '<div style="width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:' + (pay ? '#EFF6FF' : w.amountPaise < 0 ? '#FEF2F2' : '#ECFDF5') + '">' + (pay ? '\uD83D\uDCB8' : w.amountPaise < 0 ? '\u2212' : '+') + '</div>' +
      '<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600">' + esc(w.why || w.type) + (undone[w.id] ? ' <span class="badge badge-grey">undone</span>' : '') + '</div>' +
        '<div style="font-size:11.5px;color:var(--t3)">' + date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) +
          (meta.method ? ' \u00b7 ' + esc(meta.method) : '') + (meta.reference ? ' \u00b7 ref ' + esc(meta.reference) : '') +
          (w.projectId ? ' \u00b7 ' + esc(proj(w.projectId)) : '') + '</div></div>' +
      '<div style="text-align:right"><div style="font-family:var(--mono);font-weight:700;color:' + (pay ? 'var(--blue)' : w.amountPaise < 0 ? 'var(--red)' : 'var(--green)') + '">' +
        (pay ? 'paid ' + poRupee(-w.amountPaise) : (w.amountPaise < 0 ? '\u2212' : '+') + poRupee(Math.abs(w.amountPaise))) + '</div>' +
        (!undone[w.id] && !(meta.reversalOf || meta.cancels || meta.system) && ['PAYOUT', 'BONUS', 'ADJUSTMENT'].indexOf(w.type) >= 0
          ? '<button class="btn btn-secondary btn-xs" style="margin-top:4px" onclick="poUndoPayment(\'' + escJs(String(w.id)) + '\',' + empId + ')">Undo</button>' : '') +
      '</div></div>';
  };
  openModal('Pay history \u2014 ' + esc(e.name),
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px">' +
      [['Earned', m.earned, 'var(--t1)'], ['Paid', m.paid, 'var(--blue)'], ['Still to pay', m.remaining, m.remaining > 0 ? 'var(--amber)' : 'var(--green)']].map(function (x) {
        return '<div style="background:var(--s2);border-radius:10px;padding:10px 12px"><div style="font-size:11px;color:var(--t3);text-transform:uppercase">' + x[0] + '</div><div style="font-size:17px;font-weight:700;font-family:var(--mono);color:' + x[2] + '">' + poRupee(x[1]) + '</div></div>';
      }).join('') + '</div>' +
    (W.length ? '<div style="max-height:52vh;overflow-y:auto">' + W.map(row).join('') + '</div>' : '<div style="color:var(--t3);font-size:13px;padding:14px 0">Nothing yet.</div>'),
    '<button class="btn btn-secondary btn-sm" onclick="closeModal()">Close</button>' +
    '<button class="btn btn-sm" style="background:var(--green);color:#fff" onclick="closeModal();setTimeout(function(){openEmpPaymentModal(' + empId + ')},150)">\uD83D\uDCB8 Record payment</button>');
}

function poUndoPayment(entryId, empId) {
  var reason = window.prompt('Why are you undoing this? (kept in the history)', 'Recorded by mistake');
  if (reason === null) return;
  Wallet.reversePayment(entryId, reason).then(function () {
    syncState(); toast('Undone \u2014 totals corrected', 'success');
    poPayHistory(empId);
    if (STATE.currentModule === 'payouts') renderPayouts();
  }).catch(function (err) { toast(err.message, 'error'); });
}