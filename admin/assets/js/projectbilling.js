/* ============================================================================
   PROJECT BILLING — fixed amount or recurring (retainer)
   ----------------------------------------------------------------------------
   Fixed     : one project price (the existing behaviour, nothing changes).
   Recurring : the client pays an amount every week / month / quarter / year
               for a contract period (from → to).
               • A recurring-invoice plan is created for the project, so the
                 server makes each invoice automatically on its date (Books →
                 Recurring) and, if chosen, emails it to the client.
               • "Renew automatically": when the contract period ends, a new
                 period of the same length starts by itself and invoices keep
                 coming. Without it, invoicing stops on the end date.
               • Project value = amount × invoices in one contract period.
   Stored on the project (no new collection):
     billingType: 'FIXED' | 'RECURRING'
     recurring: { amountPaise, frequency, startDate, endDate, autoRenew,
                  autoSend, dueInDays, planId }
   ============================================================================ */
'use strict';

var PB_FREQ = {
  WEEKLY:    { label: 'Weekly',    every: 'week',    perMonth: 52 / 12 },
  MONTHLY:   { label: 'Monthly',   every: 'month',   perMonth: 1 },
  QUARTERLY: { label: 'Quarterly', every: 'quarter', perMonth: 1 / 3 },
  YEARLY:    { label: 'Yearly',    every: 'year',    perMonth: 1 / 12 }
};

function pbRaw(id) { return (DataAPI.raw().projects || []).find(function (x) { return x.id === Number(id); }) || null; }
function pbR(p) { return Utils.fmtRupee(Math.round(p || 0)).replace('.00', ''); }
function pbDate(iso) { return iso ? new Date(iso + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'; }
function pbAddDays(iso, n) { var d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return Utils.isoDate(d); }

/* next invoice date — same rule as the server (keeps the day of the start date) */
function pbNext(iso, freq, anchorDay) {
  var d = new Date(iso + 'T12:00:00');
  if (freq === 'WEEKLY') { d.setDate(d.getDate() + 7); return Utils.isoDate(d); }
  var months = freq === 'MONTHLY' ? 1 : freq === 'QUARTERLY' ? 3 : 12;
  var y = d.getFullYear(), m = d.getMonth() + months;
  y += Math.floor(m / 12); m = ((m % 12) + 12) % 12;
  var last = new Date(y, m + 1, 0).getDate();
  return Utils.isoDate(new Date(y, m, Math.min(anchorDay || d.getDate(), last), 12));
}
/* how many invoices fall inside one contract period */
function pbCount(start, end, freq) {
  if (!start || !end || end < start) return 0;
  var n = 0, d = start, anchor = Number(start.slice(8, 10)), guard = 0;
  while (d <= end && guard++ < 600) { n++; d = pbNext(d, freq, anchor); }
  return n;
}
/* the contract period running today (rolls forward when it renews itself) */
function pbTerm(r) {
  if (!r || !r.startDate || !r.endDate) return null;
  var len = Math.round((new Date(r.endDate + 'T12:00:00') - new Date(r.startDate + 'T12:00:00')) / 86400000) + 1;
  var from = r.startDate, to = r.endDate, renewals = 0, today = Utils.isoDate(new Date());
  if (r.autoRenew && len > 0) {
    var guard = 0;
    while (to < today && guard++ < 500) { from = pbAddDays(to, 1); to = pbAddDays(from, len - 1); renewals++; }
  }
  return { from: from, to: to, days: len, renewals: renewals, ended: !r.autoRenew && r.endDate < today };
}

/* ── form ─────────────────────────────────────────────────────────────── */
function _billingFields(px, raw) {
  raw = raw || {};
  var rec = raw.recurring || {};
  var isRec = raw.billingType === 'RECURRING';
  var today = Utils.isoDate(new Date());
  var start = rec.startDate || today;
  var end = rec.endDate || pbAddDays(Utils.isoDate(new Date(new Date(start + 'T12:00:00').setFullYear(new Date(start + 'T12:00:00').getFullYear() + 1))), -1);
  var radio = function (val, title, sub) {
    var on = (val === 'RECURRING') === isRec;
    return '<label style="flex:1;min-width:200px;display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border:1.5px solid ' + (on ? 'var(--blue)' : 'var(--b1)') + ';border-radius:10px;cursor:pointer;background:' + (on ? 'var(--blue-light)' : 'transparent') + '" id="' + px + '-bt-' + val + '">' +
      '<input type="radio" name="' + px + '-btype" value="' + val + '"' + (on ? ' checked' : '') + ' onchange="pbToggle(\'' + px + '\')" style="margin-top:3px">' +
      '<span><span style="font-weight:650;font-size:13px">' + title + '</span><span style="display:block;font-size:11.5px;color:var(--t3);margin-top:2px">' + sub + '</span></span></label>';
  };
  return '<div style="border:1px solid var(--b1);border-radius:10px;padding:12px 14px;margin-bottom:14px">' +
    '<div style="font-size:13px;font-weight:600;margin-bottom:8px">💳 How is this project billed?</div>' +
    '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:4px">' +
      radio('FIXED', 'Fixed amount', 'One price for the whole project') +
      radio('RECURRING', 'Recurring', 'Retainer / monthly fee — invoiced every period') +
    '</div>' +
    '<div id="' + px + '-rec-box" style="display:' + (isRec ? 'block' : 'none') + ';margin-top:10px">' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
        '<div class="form-group"><label class="form-label">Amount per invoice (₹) *</label><input class="form-input" id="' + px + '-rec-amt" type="number" min="1" step="1" value="' + (rec.amountPaise ? Math.round(rec.amountPaise / 100) : '') + '" placeholder="e.g. 50000" oninput="pbPreview(\'' + px + '\')"><div class="form-hint">Before GST — GST is added on each invoice.</div></div>' +
        '<div class="form-group"><label class="form-label">Bill every</label><select class="form-select" id="' + px + '-rec-freq" onchange="pbPreview(\'' + px + '\')">' +
          Object.keys(PB_FREQ).map(function (k) { return '<option value="' + k + '"' + ((rec.frequency || 'MONTHLY') === k ? ' selected' : '') + '>' + PB_FREQ[k].label + '</option>'; }).join('') + '</select></div>' +
        '<div class="form-group"><label class="form-label">Contract from *</label><input class="form-input" id="' + px + '-rec-from" type="date" value="' + start + '" onchange="pbPreview(\'' + px + '\')"><div class="form-hint">The first invoice is made on this date.</div></div>' +
        '<div class="form-group"><label class="form-label">Contract to *</label><input class="form-input" id="' + px + '-rec-to" type="date" value="' + end + '" onchange="pbPreview(\'' + px + '\')"></div>' +
        '<div class="form-group"><label class="form-label">Invoice due in (days)</label><input class="form-input" id="' + px + '-rec-due" type="number" min="0" step="1" value="' + (rec.dueInDays != null ? rec.dueInDays : 15) + '"></div>' +
      '</div>' +
      '<label style="display:flex;gap:8px;align-items:flex-start;font-size:12.5px;margin-bottom:6px;cursor:pointer"><input type="checkbox" id="' + px + '-rec-renew"' + (rec.autoRenew !== false ? ' checked' : '') + ' onchange="pbPreview(\'' + px + '\')" style="margin-top:2px"><span><b>Renew automatically</b> when the contract ends — a new period of the same length starts and invoices keep coming.</span></label>' +
      '<label style="display:flex;gap:8px;align-items:flex-start;font-size:12.5px;cursor:pointer"><input type="checkbox" id="' + px + '-rec-send"' + (rec.autoSend ? ' checked' : '') + ' style="margin-top:2px"><span><b>Email each invoice to the client</b> automatically (needs the client email above).</span></label>' +
      '<div id="' + px + '-rec-preview" style="margin-top:10px;font-size:12.5px;background:var(--green-light);color:#1E7A3E;padding:9px 12px;border-radius:var(--r8)"></div>' +
    '</div></div>';
}

function pbToggle(px) {
  var rec = (document.querySelector('input[name="' + px + '-btype"]:checked') || {}).value === 'RECURRING';
  var box = document.getElementById(px + '-rec-box'); if (box) box.style.display = rec ? 'block' : 'none';
  ['FIXED', 'RECURRING'].forEach(function (k) {
    var l = document.getElementById(px + '-bt-' + k); if (!l) return;
    var on = (k === 'RECURRING') === rec;
    l.style.borderColor = on ? 'var(--blue)' : 'var(--b1)'; l.style.background = on ? 'var(--blue-light)' : 'transparent';
  });
  var val = document.getElementById(px + '-value');
  if (val) { val.readOnly = rec; val.style.opacity = rec ? '.7' : ''; val.title = rec ? 'Worked out from the recurring amount' : ''; }
  ['autocreate', 'autodone'].forEach(function (k) {                // one-off auto invoices would double-bill a retainer
    var cb = document.getElementById(px + '-' + k); if (!cb) return;
    if (rec) { cb.dataset.was = cb.checked ? '1' : ''; cb.checked = false; cb.disabled = true; }
    else if (cb.disabled) { cb.disabled = false; cb.checked = cb.dataset.was === '1'; }
  });
  if (rec) pbPreview(px);
}

function pbPreview(px) {
  var b = _readBilling(px, true);
  var el = document.getElementById(px + '-rec-preview');
  if (!el || b.type !== 'RECURRING') return;
  var val = document.getElementById(px + '-value');
  if (b.error) { el.style.background = 'var(--amber-light)'; el.style.color = 'var(--amber)'; el.textContent = b.error; return; }
  el.style.background = 'var(--green-light)'; el.style.color = '#1E7A3E';
  if (val) val.value = Math.round(b.contractValuePaise / 100);
  var f = PB_FREQ[b.frequency];
  el.innerHTML = '<b>' + pbR(b.amountPaise) + ' every ' + f.every + '</b> · ' + b.count + ' invoice' + (b.count === 1 ? '' : 's') + ' from ' + pbDate(b.startDate) + ' to ' + pbDate(b.endDate) +
    ' = <b>' + pbR(b.contractValuePaise) + '</b> project value (+ GST).<br>' +
    (b.autoRenew ? 'Renews automatically on ' + pbDate(pbAddDays(b.endDate, 1)) + ' for the same length again \u2014 invoices keep coming until you turn renewal off.' : 'Invoices stop after ' + pbDate(b.endDate) + '.');
}

/* read + check the form. quiet = no toasts (live preview) */
function _readBilling(px, quiet) {
  var type = (document.querySelector('input[name="' + px + '-btype"]:checked') || {}).value === 'RECURRING' ? 'RECURRING' : 'FIXED';
  if (type === 'FIXED') return { type: 'FIXED' };
  var v = function (id) { return (document.getElementById(px + '-rec-' + id) || {}).value || ''; };
  var amt = Math.round((parseFloat(v('amt')) || 0) * 100), freq = PB_FREQ[v('freq')] ? v('freq') : 'MONTHLY';
  var from = v('from'), to = v('to');
  var b = {
    type: 'RECURRING', amountPaise: amt, frequency: freq, startDate: from, endDate: to,
    autoRenew: !!(document.getElementById(px + '-rec-renew') || {}).checked,
    autoSend: !!(document.getElementById(px + '-rec-send') || {}).checked,
    dueInDays: Math.max(0, parseInt(v('due'), 10) || 0)
  };
  if (amt <= 0) b.error = 'Enter the amount per invoice';
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) b.error = 'Choose the contract start date';
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(to)) b.error = 'Choose the contract end date';
  else if (to < from) b.error = 'The contract end date is before the start date';
  b.count = b.error ? 0 : pbCount(from, to, freq);
  if (!b.error && !b.count) b.error = 'The contract period is shorter than one billing period';
  b.contractValuePaise = amt * b.count;
  if (b.autoSend && !b.error) {
    var em = (document.getElementById(px + '-cemail') || {}).value || '';
    if (!em.trim()) b.error = 'Add the client email to send invoices automatically';
  }
  if (b.error && !quiet) toast(b.error, 'error');
  return b;
}

/* ── save: keep the project and its recurring-invoice plan in step ─────── */
function pbApply(projectId, b) {
  var p = pbRaw(projectId);
  if (!p) return Promise.resolve();
  var old = p.recurring || null;
  var plan = old && old.planId ? (DataAPI.raw().recurringInvoices || []).find(function (x) { return String(x.id) === String(old.planId); }) : null;

  if (!b || b.type !== 'RECURRING') {
    var patchF = { billingType: 'FIXED' };
    if (plan && plan.status === 'ACTIVE') return DataAPI.updateRecurringInvoice(plan.id, { active: false })
      .then(function () { return DataAPI.updateProject(projectId, patchF); })
      .then(function () { toast('Recurring invoices for this project are paused (now fixed amount)', 'success'); });
    return p.billingType === 'RECURRING' ? DataAPI.updateProject(projectId, patchF) : Promise.resolve();
  }

  var label = PB_FREQ[b.frequency].label.toLowerCase();
  var lines = [{ description: p.name + ' — ' + label + ' fee', hsnSac: '998314', qty: 1, ratePaise: b.amountPaise }];
  var common = {
    name: p.name, clientName: p.clientName, clientEmail: p.clientEmail || '', clientGstin: p.clientGstin || '',
    placeOfSupply: p.clientStateCode || '', subject: p.name, lines: lines, frequency: b.frequency,
    endDate: b.autoRenew ? null : b.endDate, dueInDays: b.dueInDays, autoSend: b.autoSend
  };
  var rec = { amountPaise: b.amountPaise, frequency: b.frequency, startDate: b.startDate, endDate: b.endDate,
    autoRenew: b.autoRenew, autoSend: b.autoSend, dueInDays: b.dueInDays, planId: plan ? plan.id : null };

  var step;
  if (plan && plan.status !== 'COMPLETED') {
    var patch = Object.assign({}, common, { active: true });
    if (!plan.count && b.startDate !== plan.startDate) patch.nextDate = b.startDate;   // nothing invoiced yet → move the first date
    step = DataAPI.updateRecurringInvoice(plan.id, patch).then(function () { return []; });
  } else {
    step = DataAPI.createRecurringInvoice(Object.assign({}, common, { projectId: p.id, startDate: b.startDate }))
      .then(function (np) { rec.planId = np.id; return np.created || []; });
  }
  return step.then(function (made) {
    var sends = (made || []).filter(function (m) { return m.autoSend; }).map(function (m) { return DataAPI.sendInvoice(m.invoiceId).catch(function () { return null; }); });
    return Promise.all(sends).then(function () {
      return DataAPI.updateProject(projectId, { billingType: 'RECURRING', recurring: rec, autoInvoiceOnCreate: false, autoInvoiceOnComplete: false });
    }).then(function () {
      if (made && made.length) toast('First invoice made: ' + made.map(function (m) { return m.number; }).join(', ') + (sends.length ? ' and emailed' : ''), 'success');
    });
  });
}

/* ── display ─────────────────────────────────────────────────────────── */
function pbInfo(id) {
  var p = pbRaw(id);
  if (!p || p.billingType !== 'RECURRING' || !p.recurring) return null;
  var r = p.recurring;
  var plan = r.planId ? (DataAPI.raw().recurringInvoices || []).find(function (x) { return String(x.id) === String(r.planId); }) : null;
  var invs = (DataAPI.raw().invoices || []).filter(function (i) { return plan && i.recurringId === plan.id; });
  var billed = invs.filter(function (i) { return i.status !== 'CANCELLED'; }).reduce(function (s, i) { return s + (i.totalPaise || 0); }, 0);
  var unpaid = invs.filter(function (i) { return ['PAID', 'CANCELLED', 'DRAFT'].indexOf(i.status) < 0; }).reduce(function (s, i) { return s + (i.totalPaise - (i.paidPaise || 0)); }, 0);
  var term = pbTerm(r);
  var active = !!(plan && plan.status === 'ACTIVE');
  return { p: p, r: r, plan: plan, invoices: invs, billed: billed, unpaid: unpaid, term: term, active: active,
    perMonth: r.amountPaise * (PB_FREQ[r.frequency] || PB_FREQ.MONTHLY).perMonth,
    status: !plan ? 'NO_PLAN' : plan.status === 'COMPLETED' || (term && term.ended) ? 'ENDED' : plan.status === 'PAUSED' ? 'PAUSED' : 'ACTIVE' };
}

function pbCardBadge(id) {
  var i = pbInfo(id);
  if (!i) return '<span class="badge badge-grey" title="One price for the whole project">Fixed</span>';
  var f = PB_FREQ[i.r.frequency] || PB_FREQ.MONTHLY;
  var tone = i.status === 'ACTIVE' ? 'badge-blue' : i.status === 'PAUSED' ? 'badge-amber' : 'badge-grey';
  return '<span class="badge ' + tone + '" title="Recurring — ' + escAttr(pbR(i.r.amountPaise)) + ' every ' + f.every + '">🔁 ' + f.label + ' ' + pbR(i.r.amountPaise) + '</span>';
}

function pbOverviewCard(id) {
  var p = pbRaw(id);
  if (!p) return '';
  var i = pbInfo(id);
  if (!i) {
    return '<div class="card card-pad" style="margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">' +
      '<div><div style="font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:.5px;font-weight:600;margin-bottom:4px">Billing</div>' +
      '<div style="font-size:14px;font-weight:650">Fixed amount · ' + pbR(p.contractValuePaise || p.budgetPaise || 0) + '</div>' +
      '<div style="font-size:12px;color:var(--t3)">One price for the whole project. Need a monthly retainer instead? Edit the project and choose Recurring.</div></div>' +
      '<button class="btn btn-secondary btn-sm" onclick="openEditProjectModal(' + id + ')">Change billing</button></div>';
  }
  var f = PB_FREQ[i.r.frequency] || PB_FREQ.MONTHLY;
  var st = { ACTIVE: ['Active', 'badge-green'], PAUSED: ['Paused', 'badge-amber'], ENDED: ['Ended', 'badge-grey'], NO_PLAN: ['Not set up', 'badge-red'] }[i.status];
  var box = function (l, v, c, sub) {
    return '<div style="background:var(--s2);border-radius:var(--r8);padding:10px 12px"><div style="font-size:10.5px;color:var(--t3);text-transform:uppercase;letter-spacing:.4px;font-weight:600">' + l + '</div>' +
      '<div style="font-size:16px;font-weight:700;font-family:var(--mono);color:' + (c || 'var(--t1)') + '">' + v + '</div>' + (sub ? '<div style="font-size:11px;color:var(--t3)">' + sub + '</div>' : '') + '</div>';
  };
  var t = i.term;
  return '<div class="card card-pad" style="margin-bottom:20px">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px">' +
      '<div><div style="font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:.5px;font-weight:600;margin-bottom:4px">Billing</div>' +
      '<div style="font-size:14px;font-weight:650">🔁 Recurring — ' + pbR(i.r.amountPaise) + ' every ' + f.every + ' <span class="badge ' + st[1] + '">' + st[0] + '</span></div></div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
        (i.plan && i.status === 'ACTIVE' ? '<button class="btn btn-secondary btn-sm" onclick="pbSetActive(' + id + ',false)">Pause invoices</button>' : '') +
        (i.plan && i.status === 'PAUSED' ? '<button class="btn btn-secondary btn-sm" onclick="pbSetActive(' + id + ',true)">Resume invoices</button>' : '') +
        '<button class="btn btn-secondary btn-sm" onclick="openEditProjectModal(' + id + ')">Edit billing</button>' +
        '<button class="btn btn-secondary btn-sm" onclick="gotoModule(\'invoices\')">Invoices →</button></div></div>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-bottom:10px">' +
      box('Contract period', t ? pbDate(t.from) + ' – ' + pbDate(t.to) : '—', 'var(--t1)', i.r.autoRenew ? 'renews automatically' + (t && t.renewals ? ' · renewed ' + t.renewals + '×' : '') : 'ends on the end date') +
      box('Next invoice', i.active && i.plan.nextDate ? pbDate(i.plan.nextDate) : '—', 'var(--blue)', i.active ? 'made automatically' : 'not scheduled') +
      box('Per month', pbR(i.perMonth), 'var(--green)', 'recurring revenue') +
      box('Invoices made', String(i.invoices.length), 'var(--t1)', pbR(i.billed) + ' billed (incl. GST)') +
      box('Unpaid', pbR(i.unpaid), i.unpaid ? 'var(--amber)' : 'var(--t2)', 'sent, not yet paid') +
    '</div>' +
    '<div style="font-size:12px;color:var(--t3)">' + (i.r.autoSend ? 'Each invoice is emailed to ' + esc(i.p.clientEmail || 'the client') + ' automatically. ' : 'Invoices are made as drafts — send them from Invoices. ') +
      'Due ' + (i.r.dueInDays != null ? i.r.dueInDays : 15) + ' days after the invoice date.</div>' +
  '</div>';
}

function pbSetActive(id, on) {
  var i = pbInfo(id); if (!i || !i.plan) return;
  DataAPI.updateRecurringInvoice(i.plan.id, { active: on }).then(function () {
    syncState(); toast(on ? 'Recurring invoices resumed' : 'Recurring invoices paused', 'success');
    if (STATE.currentModule === 'project-detail') openProjectDetail(id); else refreshView();
  }).catch(function (err) { toast(err.message, 'error'); });
}

/* Dashboard: recurring projects whose contract ends / renews within 30 days */
function pbUpcomingRenewals() {
  var today = Utils.isoDate(new Date()), soon = pbAddDays(today, 30);
  return (DataAPI.raw().projects || []).map(function (p) { return pbInfo(p.id); })
    .filter(function (i) { return i && i.term && i.status !== 'ENDED' && i.term.to >= today && i.term.to <= soon; })
    .sort(function (a, b) { return a.term.to.localeCompare(b.term.to); });
}