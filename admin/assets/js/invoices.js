/* ============================================================
   INVOICES MODULE — Project-wise Milestone Billing
   ============================================================ */

/* ── Internal state ── */
let _invCurrentProject = null;

/* ── Helpers ── */
function _collectLines(bodyId) {
  const out = [];
  const body = document.getElementById(bodyId);
  if (!body) return out;
  body.querySelectorAll('tr').forEach(function (tr) {
    const ins = tr.querySelectorAll('input');
    const desc = (ins[0] && ins[0].value || '').trim();
    const qty  = parseFloat(ins[1] && ins[1].value) || 0;
    const rate = parseFloat(ins[2] && ins[2].value) || 0;
    if (!desc && !qty && !rate) return;
    out.push({ description: desc || 'Service', hsnSac: '998314', qty: qty, ratePaise: Utils.rupeesToPaise(rate) });
  });
  return out;
}

function _sc(status) {
  return { Paid:'badge-green', Sent:'badge-blue', Overdue:'badge-red', Draft:'badge-grey', 'Partially Paid':'badge-amber' }[status] || 'badge-grey';
}
function _projectInvoices(pid) {
  const p = STATE.projects.find(x => x.id === pid);
  return p ? STATE.invoices.filter(i => i.projectId === pid || i.project === p.name) : [];
}
function _milestoneInvoices(pid, msId) {
  return _projectInvoices(pid).filter(i => i.milestoneId === msId);
}
function _isPastDue(due) {
  return due && due < Utils.isoDate(new Date());
}
function _totalReceived(invs) {
  return invs.reduce((s, i) => {
    if (i.status === 'Paid') return s + (i.amount || 0);
    if (i.status === 'Partially Paid') return s + (i.paidAmount || 0);
    return s;
  }, 0);
}
/* billed = sent to the client (drafts and cancelled invoices are not billed) */
function _totalBilled(invs) {
  return invs.filter(i => i.status !== 'Draft' && i.status !== 'Cancelled').reduce((s, i) => s + (i.amount || 0), 0);
}
function _uninvoicedMilestones() {
  const alerts = [];
  STATE.projects.forEach(p => {
    /* the whole project value is already invoiced (e.g. one invoice for the
       full project) → nothing is pending for its milestones */
    if (typeof _valueLeftToBill === 'function' && p.value > 0 && _valueLeftToBill(p) <= 0) return;
    /* the project was invoiced in full when it was created (automatic invoice) */
    if ((DataAPI.raw().invoices || []).some(i => i.projectId === p.id && i.status !== 'CANCELLED' && i.autoCreated === 'CREATE')) return;
    (p.milestones || []).forEach(m => {
      if (m.status === 'Done' && _milestoneInvoices(p.id, m.id).length === 0) {
        alerts.push({ project: p, milestone: m });
      }
    });
  });
  return alerts;
}
let _invNumCache = null;
function _nextInvNum() {
  return _invNumCache || 'INV/…';
}
function _refreshInvNum() {
  if (!DataAPI || !DataAPI.raw || !DataAPI.raw()) return Promise.resolve(null);
  return DataAPI.peekInvoiceNumber().then(function (n) { _invNumCache = n; return n; });
}
function _projectClientEmail(p) {
  if (p.clientEmail) return p.clientEmail;                 // saved on the project
  const ex = STATE.invoices.find(i => i.projectId === p.id && i.clientEmail);
  return ex ? ex.clientEmail : '';
}

/* ══════════════════════════════════════════════════════════════
   HOME — Project cards + Custom Invoice + Alerts
══════════════════════════════════════════════════════════════ */
function renderInvoices() {
  _invCurrentProject = null;
  const v   = document.getElementById('view-invoices');
  const all = STATE.invoices;

  const totalBilled   = _totalBilled(all);
  const totalReceived = _totalReceived(all);
  const totalPending  = all.filter(i => i.status === 'Sent' || i.status === 'Overdue' || i.status === 'Partially Paid')
                           .reduce((s, i) => s + ((i.amount || 0) - (i.paidAmount || 0)), 0);
  const totalOverdue  = all.filter(i => i.status === 'Overdue').reduce((s, i) => s + (i.amount || 0), 0);
  const collectionPct = totalBilled > 0 ? Math.round((totalReceived / totalBilled) * 100) : 0;
  const overdueCount  = all.filter(i => i.status === 'Overdue').length;
  const alerts        = _uninvoicedMilestones();

  v.innerHTML = `
    <div class="section-header" style="margin-bottom:20px">
      <div>
        <div class="section-title" style="font-size:20px">Books \u2014 Invoices & Payments</div>
        <div class="section-sub">Project-wise billing · ${all.length} invoices across ${STATE.projects.length} projects</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn" style="background:var(--green);color:#fff" onclick="openPaymentPicker()">\uD83D\uDCB0 Record payment</button>
        <button class="btn btn-primary" onclick="openCustomInvoicePanel()">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          Create Custom Invoice
        </button>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
      <div class="stat-card" style="border-left:3px solid var(--t4)">
        <div class="stat-label">Total Billed</div>
        <div class="stat-value" style="font-size:20px;font-family:var(--mono)">${fmtRupee(totalBilled)}</div>
        <div class="stat-sub">${all.filter(i => i.status !== 'Draft' && i.status !== 'Cancelled').length} sent \u00b7 ${all.filter(i => i.status === 'Draft').length} draft${all.some(i => i.status === 'Draft') ? ' (' + fmtRupee(all.filter(i => i.status === 'Draft').reduce((s, i) => s + (i.amount || 0), 0)) + ' not sent yet)' : ''}</div>
      </div>
      <div class="stat-card" style="border-left:3px solid var(--green)">
        <div class="stat-label">Received</div>
        <div class="stat-value green" style="font-size:20px;font-family:var(--mono)">${fmtRupee(totalReceived)}</div>
        <div class="stat-sub">${collectionPct}% collection rate</div>
      </div>
      <div class="stat-card" style="border-left:3px solid var(--amber)">
        <div class="stat-label">Pending</div>
        <div class="stat-value" style="font-size:20px;font-family:var(--mono);color:var(--amber)">${fmtRupee(totalPending)}</div>
        <div class="stat-sub">${all.filter(i => ['Sent', 'Overdue', 'Partially Paid'].includes(i.status)).length} invoice(s) waiting for payment</div>
      </div>
      <div class="stat-card" style="border-left:3px solid var(--red)">
        <div class="stat-label">Overdue</div>
        <div class="stat-value" style="font-size:20px;font-family:var(--mono);color:${overdueCount>0?'var(--red)':'var(--t3)'}">${fmtRupee(totalOverdue)}</div>
        <div class="stat-sub">${overdueCount} invoice${overdueCount!==1?'s':''} overdue</div>
      </div>
    </div>

    ${alerts.length ? `
    <div class="card card-pad" style="margin-bottom:20px;border-left:3px solid var(--green)">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
        <div style="width:8px;height:8px;border-radius:50%;background:var(--green)"></div>
        <div style="font-size:13px;font-weight:700">Milestones Completed — Invoice Pending</div>
        <span style="font-size:11px;background:#ECFDF5;color:var(--green);padding:2px 8px;border-radius:99px;font-weight:600">${alerts.length} milestone${alerts.length>1?'s':''}</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${alerts.map(a => `
          <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:var(--s2);border-radius:var(--r8);flex-wrap:wrap">
            <div style="width:6px;height:6px;border-radius:50%;background:var(--green);flex-shrink:0"></div>
            <div style="flex:1;min-width:160px">
              <div style="font-size:12px;font-weight:600">${a.milestone.title}</div>
              <div style="font-size:11px;color:var(--t3)">${a.project.name} · ${a.project.client} · Completed ${a.milestone.date}</div>
            </div>
            <span style="font-size:10px;background:#ECFDF5;color:var(--green);padding:2px 8px;border-radius:99px;font-weight:600">✓ Done</span>
            <button class="btn btn-sm" style="background:var(--green);color:#fff;font-size:11px;padding:5px 12px"
              onclick="openMilestoneInvoicePanel(${a.project.id}, ${a.milestone.id})">
              Generate Invoice
            </button>
          </div>
        `).join('')}
      </div>
    </div>` : ''}

    ${_recurringSection()}
    ${_allInvoicesTable()}

    <div style="font-size:13px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px">Projects</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:16px;margin-bottom:24px">
      ${STATE.projects.map(p => _projectCard(p)).join('')}
    </div>

  `;
}

function _projectCard(p) {
  const invs       = _projectInvoices(p.id);
  const billed     = _totalBilled(invs);
  const received   = _totalReceived(invs);
  const remaining  = billed - received;
  const pct        = billed > 0 ? Math.round((received / billed) * 100) : 0;
  const barColor   = pct >= 80 ? 'var(--green)' : pct >= 40 ? 'var(--amber)' : 'var(--red)';
  const sc         = p.status==='Active'?'badge-green':p.status==='Completed'?'badge-blue':p.status==='Planning'?'badge-amber':'badge-grey';
  const head       = p.headId ? STATE.employees.find(e => e.id === p.headId) : null;
  const msTotal    = (p.milestones||[]).length;
  const msDone     = (p.milestones||[]).filter(m => m.status==='Done').length;
  const hasOverdue = invs.some(i => i.status === 'Overdue');

  return `
  <div class="card card-pad" style="cursor:pointer;transition:.15s${hasOverdue?';border-left:3px solid var(--red)':''}"
    onmouseover="this.style.boxShadow='var(--sh1)'" onmouseout="this.style.boxShadow=''"
    onclick="openProjectBilling(${p.id})">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px;gap:8px">
      <div style="flex:1;min-width:0">
        <div style="font-size:14px;font-weight:700;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p.name)}</div>
        <div style="font-size:11.5px;color:var(--t3)">${esc(p.client)}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        <span class="badge ${sc}">${p.status}</span>
        ${hasOverdue?`<span style="font-size:10px;background:var(--red-light);color:var(--red);padding:2px 7px;border-radius:99px;font-weight:600">⚠ Overdue</span>`:''}
      </div>
    </div>
    ${head?`<div style="display:flex;align-items:center;gap:6px;margin-bottom:12px">
      <div class="avatar" style="background:${head.color};width:18px;height:18px;font-size:7px">${head.avatar}</div>
      <span style="font-size:11.5px;color:var(--t3)">Head: <strong style="color:var(--t1)">${head.name.split(' ')[0]}</strong></span>
    </div>`:'<div style="margin-bottom:12px"></div>'}
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px">
      <div style="background:var(--s2);border-radius:var(--r6);padding:8px 10px">
        <div style="font-size:9.5px;color:var(--t3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:2px">Billed</div>
        <div style="font-size:12.5px;font-weight:700;font-family:var(--mono)">${billed>0?fmtRupee(billed):'—'}</div>
      </div>
      <div style="background:#ECFDF5;border-radius:var(--r6);padding:8px 10px">
        <div style="font-size:9.5px;color:var(--green);text-transform:uppercase;letter-spacing:.4px;margin-bottom:2px">Received</div>
        <div style="font-size:12.5px;font-weight:700;font-family:var(--mono);color:var(--green)">${received>0?fmtRupee(received):'—'}</div>
      </div>
      <div style="background:${remaining>0?'#FFFBEB':'var(--s2)'};border-radius:var(--r6);padding:8px 10px">
        <div style="font-size:9.5px;color:${remaining>0?'var(--amber)':'var(--t3)'};text-transform:uppercase;letter-spacing:.4px;margin-bottom:2px">Remaining</div>
        <div style="font-size:12.5px;font-weight:700;font-family:var(--mono);color:${remaining>0?'var(--amber)':'var(--t3)'}">${remaining>0?fmtRupee(remaining):'—'}</div>
      </div>
    </div>
    ${billed>0?`
    <div style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:11px;color:var(--t3)">Collection</span>
        <span style="font-size:11px;font-weight:600;color:${barColor}">${pct}%</span>
      </div>
      <div class="budget-bar"><div class="budget-fill" style="width:${pct}%;background:${barColor}"></div></div>
    </div>`:''}
    <div style="display:flex;align-items:center;justify-content:space-between">
      <div style="display:flex;gap:10px">
        <span style="font-size:11px;color:var(--t3)"><strong style="color:var(--t1)">${msDone}</strong>/${msTotal} milestones done</span>
        <span style="font-size:11px;color:var(--t3)"><strong style="color:var(--t1)">${invs.length}</strong> invoice${invs.length!==1?'s':''}</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        ${invs.some(_isPayable) ? `<button class="btn btn-xs" style="background:#ECFDF5;color:var(--green);border:1px solid rgba(5,150,105,.25)" onclick="event.stopPropagation();_payFromProject(${p.id})">\uD83D\uDCB0 Record payment</button>` : ''}
        <span style="font-size:11.5px;color:var(--blue);font-weight:500">Open →</span>
      </div>
    </div>
  </div>`;
}

/* ══════════════════════════════════════════════════════════════
   PAYMENTS — record money received from the client
══════════════════════════════════════════════════════════════ */
function _isPayable(inv) {
  return ['DRAFT', 'SENT', 'PARTIALLY_PAID'].includes(inv.canonicalStatus) && inv.balance > 0;
}

function _payFromProject(pid) {
  const payable = _projectInvoices(pid).filter(_isPayable);
  if (payable.length === 1) openRecordPaymentModal(payable[0].id);
  else openProjectBilling(pid);
}

/* Every invoice in one list, with a Record payment button on each unpaid one */
function _allInvoicesTable() {
  const rows = STATE.invoices.slice().sort((a, b) => String(b.issued || '').localeCompare(String(a.issued || '')));
  if (!rows.length) return '';
  return `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <div style="font-size:13px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.5px">All invoices</div>
      <div style="font-size:12px;color:var(--t3)">Client paid? Click <strong>\uD83D\uDCB0 Record payment</strong></div>
    </div>
    <div class="card" style="overflow-x:auto;margin-bottom:24px">
      <table class="data-table" style="min-width:760px">
        <thead><tr><th>Invoice #</th><th>Client / project</th><th>Total</th><th>Received</th><th>Balance</th><th>Status</th><th style="text-align:right">Actions</th></tr></thead>
        <tbody>${rows.map(inv => `<tr>
          <td><span style="font-family:var(--mono);font-size:12px;font-weight:600;cursor:pointer;color:var(--blue)" onclick="openInvoiceDetailModal('${escAttr(String(inv.id))}')">${esc(inv.num)}</span></td>
          <td><div style="font-weight:600">${esc(inv.client || '')}</div><div style="font-size:11px;color:var(--t3)">${esc(inv.project || '')}</div></td>
          <td><strong style="font-family:var(--mono)">${fmtRupee(inv.amount)}</strong></td>
          <td style="font-family:var(--mono);color:var(--green)">${inv.paidAmount ? fmtRupee(inv.paidAmount) : '\u2014'}</td>
          <td style="font-family:var(--mono);color:${inv.balance > 0 ? 'var(--amber)' : 'var(--t3)'}">${inv.balance > 0 ? fmtRupee(inv.balance) : '\u2014'}</td>
          <td><span class="badge ${_sc(inv.status)}">${inv.status}</span></td>
          <td><div style="display:flex;gap:4px;justify-content:flex-end;flex-wrap:wrap">
            ${_isPayable(inv) ? `<button class="btn btn-xs" style="background:var(--green);color:#fff" onclick="openRecordPaymentModal('${escAttr(String(inv.id))}')">\uD83D\uDCB0 Record payment</button>` : ''}
            <button class="btn btn-secondary btn-xs" onclick="openInvoiceDetailModal('${escAttr(String(inv.id))}')">View</button>
            ${window.OmentAPI ? `<button class="btn btn-secondary btn-xs" onclick="downloadInvoicePdf('${escAttr(String(inv.id))}')">PDF</button>` : ''}
          </div></td>
        </tr>`).join('')}</tbody>
      </table>
    </div>`;
}

/* Record payment window: amount, date, method, reference */
function openRecordPaymentModal(id) {
  const inv = STATE.invoices.find(i => String(i.id) === String(id));
  if (!inv) return;
  if (!_isPayable(inv)) { toast('Nothing left to pay on ' + inv.num, 'error'); return; }
  const today = Utils.isoDate(new Date());
  openModal(`Record payment \u2014 ${esc(inv.num)}`, `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px">
      ${[['Total', inv.amount, 'var(--t1)'], ['Received so far', inv.paidAmount || 0, 'var(--green)'], ['Balance due', inv.balance, 'var(--amber)']].map(([l, v, c]) =>
        `<div style="background:var(--s2);border-radius:var(--r8);padding:9px 10px"><div style="font-size:10.5px;color:var(--t3);text-transform:uppercase;letter-spacing:.3px">${l}</div><div style="font-size:15px;font-weight:700;font-family:var(--mono);color:${c}">${fmtRupee(v)}</div></div>`).join('')}
    </div>
    ${inv.canonicalStatus === 'DRAFT' ? '<div style="font-size:12px;color:var(--t3);background:var(--amber-light);padding:8px 10px;border-radius:var(--r8);margin-bottom:12px">This invoice is still a draft \u2014 recording a payment marks it as issued (no email is sent).</div>' : ''}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="form-group"><label class="form-label">Amount received (\u20b9) *</label>
        <input class="form-input" type="number" min="0.01" step="0.01" id="rp-amt" value="${inv.balance}"></div>
      <div class="form-group"><label class="form-label">Date received *</label>
        <input class="form-input" type="date" id="rp-date" value="${today}" max="${today}"></div>
      <div class="form-group"><label class="form-label">Payment method</label>
        <select class="form-select" id="rp-method">${['Bank transfer', 'UPI', 'Cheque', 'Cash', 'Card', 'Other'].map(m => `<option>${m}</option>`).join('')}</select></div>
      <div class="form-group"><label class="form-label">Reference / UTR no.</label>
        <input class="form-input" id="rp-ref" placeholder="optional"></div>
    </div>
    <div class="form-group"><label class="form-label">Note</label>
      <input class="form-input" id="rp-note" placeholder="optional, e.g. advance for phase 2"></div>
    <div class="form-hint">Part payments are fine \u2014 the rest stays as balance due. The client gets a receipt by email if they have an email address.</div>
  `, `
    <button class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
    <button class="btn btn-sm" style="background:var(--green);color:#fff" id="rp-save" onclick="saveRecordedPayment('${escAttr(String(inv.id))}')">\uD83D\uDCB0 Save payment</button>
  `);
}

function saveRecordedPayment(id) {
  const inv = STATE.invoices.find(i => String(i.id) === String(id));
  if (!inv) return;
  const amt = parseFloat(document.getElementById('rp-amt')?.value);
  if (isNaN(amt) || amt <= 0) { toast('Enter the amount received', 'error'); return; }
  if (amt > inv.balance + 0.001) { toast(`That is more than the balance due (${fmtRupee(inv.balance)})`, 'error'); return; }
  const date = document.getElementById('rp-date')?.value || Utils.isoDate(new Date());
  if (date > Utils.isoDate(new Date())) { toast('The date cannot be in the future', 'error'); return; }
  const btn = document.getElementById('rp-save'); if (btn) { btn.disabled = true; btn.textContent = 'Saving\u2026'; }
  DataAPI.recordPayment(id, Utils.rupeesToPaise(amt), {
    date,
    method: document.getElementById('rp-method')?.value || 'Bank transfer',
    reference: (document.getElementById('rp-ref')?.value || '').trim(),
    note: (document.getElementById('rp-note')?.value || '').trim()
  }).then(function (updated) {
    syncState();
    closeModal(); closePanel();
    _refreshInvoiceView();
    if (STATE.currentModule === 'dashboard' && typeof renderDashboard === 'function') renderDashboard();
    const left = Utils.paiseToRupees(updated.totalPaise - updated.paidPaise);
    toast(updated.status === 'PAID' ? `${updated.number} fully paid \u2713` : `${fmtRupee(amt)} recorded \u00B7 ${fmtRupee(left)} still due`, 'success');
  }).catch(function (err) {
    if (btn) { btn.disabled = false; btn.textContent = '\uD83D\uDCB0 Save payment'; }
    toast(err.message, 'error');
  });
}

/* ══════════════════════════════════════════════════════════════
   PROJECT BILLING VIEW
══════════════════════════════════════════════════════════════ */
function openProjectBilling(pid) {
  _invCurrentProject = pid;
  const p = STATE.projects.find(x => x.id === pid);
  if (!p) return;
  const invs      = _projectInvoices(pid);
  const billed    = _totalBilled(invs);
  const received  = _totalReceived(invs);
  const remaining = billed - received;
  const pending   = invs.filter(i=>i.status==='Sent'||i.status==='Partially Paid').reduce((s,i)=>s+(i.amount-(i.paidAmount||0)),0);
  const overdue   = invs.filter(i=>i.status==='Overdue').reduce((s,i)=>s+i.amount,0);
  const pct       = billed > 0 ? Math.round((received / billed) * 100) : 0;
  const barColor  = pct >= 80 ? 'var(--green)' : pct >= 40 ? 'var(--amber)' : 'var(--red)';
  const head      = p.headId ? STATE.employees.find(e => e.id === p.headId) : null;
  const sc        = p.status==='Active'?'badge-green':p.status==='Completed'?'badge-blue':p.status==='Planning'?'badge-amber':'badge-grey';

  const v = document.getElementById('view-invoices');
  v.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">
      <button class="btn btn-secondary btn-sm" onclick="renderInvoices()" style="display:flex;align-items:center;gap:6px">
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M19 12H5M5 12l7-7M5 12l7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        All Projects
      </button>
      <div style="font-size:12px;color:var(--t3)">Invoices & Billing</div>
    </div>

    <div class="card card-pad" style="margin-bottom:20px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:20px">
        <div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
            <div style="font-size:20px;font-weight:800">${esc(p.name)}</div>
            <span class="badge ${sc}">${p.status}</span>
          </div>
          <div style="font-size:13px;color:var(--t3);margin-bottom:6px">${esc(p.client)}</div>
          ${head?`<div style="display:flex;align-items:center;gap:6px">
            <div class="avatar" style="background:${head.color};width:20px;height:20px;font-size:8px">${head.avatar}</div>
            <span style="font-size:12px;color:var(--t3)">Project Head: <strong style="color:var(--t1)">${head.name}</strong></span>
          </div>`:''}
        </div>
        <button class="btn btn-primary" onclick="openMilestoneInvoicePanel(${pid}, null)">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          New Invoice
        </button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:16px">
        ${[
          ['Project value', fmtRupee(p.value), 'var(--t4)', 'var(--surface)'],
          ['Total Billed',   fmtRupee(billed),   'var(--t4)', 'var(--s2)'],
          ['Left to bill',   fmtRupee(Math.max(0, _valueLeftToBill(p))), 'var(--blue)', '#EFF6FF'],
          ['Received',       fmtRupee(received),  'var(--green)', '#ECFDF5'],
          ['Pending',        fmtRupee(pending),   'var(--amber)', '#FFFBEB'],
          ['Overdue',        fmtRupee(overdue),   overdue>0?'var(--red)':'var(--t4)', overdue>0?'#FEF2F2':'var(--s2)'],
        ].map(([label,val,color,bg])=>`
          <div style="background:${bg};border-radius:var(--r8);padding:12px">
            <div style="font-size:10px;color:${color};text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px">${label}</div>
            <div style="font-size:14px;font-weight:800;font-family:var(--mono);color:${color==='var(--t4)'?'var(--t1)':color}">${val}</div>
          </div>`).join('')}
      </div>
      <div>
        <div style="display:flex;justify-content:space-between;margin-bottom:5px">
          <span style="font-size:12px;color:var(--t3)">Payment collection — ${pct}% of billed amount received</span>
          <span style="font-size:12px;font-weight:700;color:${barColor}">${fmtRupee(received)} / ${fmtRupee(billed)}</span>
        </div>
        <div class="budget-bar" style="height:8px">
          <div class="budget-fill" style="width:${pct}%;background:${barColor};border-radius:99px"></div>
        </div>
        ${remaining>0?`<div style="font-size:11px;color:var(--t3);margin-top:5px">${fmtRupee(remaining)} remaining to be collected</div>`:''}
      </div>
    </div>

    <div style="font-size:13px;font-weight:700;margin-bottom:12px">Milestone Billing</div>
    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:24px">
      ${(p.milestones||[]).length === 0
        ? `<div class="card card-pad" style="text-align:center;color:var(--t3);padding:32px">No milestones defined for this project.</div>`
        : (p.milestones||[]).map(m => _milestoneInvoiceRow(pid, m)).join('')}
    </div>

    <div style="font-size:13px;font-weight:700;margin-bottom:12px">All Invoices (${invs.length})</div>
    ${invs.length === 0
      ? `<div class="card card-pad" style="text-align:center;color:var(--t3);padding:32px">
           <div style="font-size:24px;margin-bottom:8px">🧾</div>
           No invoices yet for this project.
           <div style="margin-top:12px">
             <button class="btn btn-primary btn-sm" onclick="openMilestoneInvoicePanel(${pid},null)">Create First Invoice</button>
           </div>
         </div>`
      : `<div class="card" style="overflow-x:auto">
           <table class="data-table" style="min-width:640px">
             <thead><tr><th>Invoice #</th><th>Milestone</th><th>Amount</th><th>Paid</th><th>Due</th><th>Status</th><th>Actions</th></tr></thead>
             <tbody>${invs.map(inv => _invTableRow(inv, pid)).join('')}</tbody>
           </table>
         </div>`}
  `;
}

function _milestoneInvoiceRow(pid, m) {
  const minvs     = _milestoneInvoices(pid, m.id);
  const mbilled   = _totalBilled(minvs);
  const mreceived = _totalReceived(minvs);
  const msColor   = m.status==='Done'?'var(--green)':m.status==='In Progress'?'var(--blue)':'var(--t3)';
  const msBg      = m.status==='Done'?'#ECFDF5':m.status==='In Progress'?'#EFF6FF':'var(--s2)';
  const btnBg     = m.status==='Done'?'var(--green)':m.status==='In Progress'?'var(--blue)':'var(--s4)';
  const btnColor  = m.status==='Done'||m.status==='In Progress'?'#fff':'var(--t2)';

  return `
  <div class="card" style="overflow:hidden;border-left:3px solid ${msColor}">
    <div style="padding:14px 16px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <div style="flex:1;min-width:200px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px">
            <div style="width:8px;height:8px;border-radius:50%;background:${msColor};flex-shrink:0"></div>
            <div style="font-size:13px;font-weight:700">${esc(m.title)}</div>
            <span style="font-size:10px;padding:2px 8px;border-radius:99px;background:${msBg};color:${msColor};font-weight:600">${m.status}</span>
          </div>
          <div style="font-size:11.5px;color:var(--t3);margin-left:16px">${m.date}${m.desc?` · ${m.desc.slice(0,60)}${m.desc.length>60?'…':''}`:''}</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-shrink:0">
          ${mbilled>0?`
            <div style="text-align:right">
              <div style="font-size:10px;color:var(--t3)">Billed</div>
              <div style="font-size:13px;font-weight:700;font-family:var(--mono)">${fmtRupee(mbilled)}</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:10px;color:var(--green)">Received</div>
              <div style="font-size:13px;font-weight:700;font-family:var(--mono);color:var(--green)">${fmtRupee(mreceived)}</div>
            </div>
          `:'<span style="font-size:11.5px;color:var(--t3)">No invoices yet</span>'}
          <button class="btn btn-sm"
            style="background:${btnBg};color:${btnColor};font-size:11px;padding:5px 12px;flex-shrink:0"
            onclick="openMilestoneInvoicePanel(${pid},${m.id})">
            ${mbilled>0?'+ Add Invoice':'Invoice'}
          </button>
        </div>
      </div>
      ${minvs.length>0?`
      <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--b1);display:flex;flex-direction:column;gap:6px">
        ${minvs.map(inv => `
          <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--s2);border-radius:var(--r6);flex-wrap:wrap">
            <span style="font-family:var(--mono);font-size:11.5px;font-weight:600;min-width:100px">${esc(inv.num)}</span>
            <span style="font-family:var(--mono);font-size:12px;font-weight:700">${fmtRupee(inv.amount)}</span>
            ${inv.paidAmount&&inv.status==='Partially Paid'?`<span style="font-size:11px;color:var(--green)">✓ ${fmtRupee(inv.paidAmount)} paid</span>`:''}
            <span class="badge ${_sc(inv.status)}">${inv.status}</span>
            <span style="font-size:11px;color:var(--t3)">Due ${fmtDate(inv.due)}</span>
            <div style="display:flex;gap:5px;margin-left:auto">
              <button class="btn btn-secondary btn-xs" onclick="openInvoiceDetailModal('${escAttr(String(inv.id))}')">View</button>
              ${inv.status==='Draft'?`<button class="btn btn-blue btn-xs" onclick="sendInvoice('${escAttr(String(inv.id))}')">Send</button>`:''}
              ${(inv.canonicalStatus==='DRAFT'||inv.canonicalStatus==='SENT'||inv.canonicalStatus==='PARTIALLY_PAID')?`<button class="btn btn-xs" style="background:#ECFDF5;color:var(--green);border:1px solid rgba(5,150,105,.2)" onclick="markPaid('${escAttr(String(inv.id))}')">Mark Paid</button>`:''}
            </div>
          </div>`).join('')}
      </div>`:''}
    </div>
  </div>`;
}

function _invTableRow(inv, pid) {
  const p      = STATE.projects.find(x => x.id === pid);
  const ms     = inv.milestoneId && p && p.milestones ? p.milestones.find(m => m.id === inv.milestoneId) : null;
  const isPast = _isPastDue(inv.due) && inv.status !== 'Paid';
  return `<tr>
    <td><span style="font-family:var(--mono);font-size:12px;font-weight:600">${esc(inv.num)}</span></td>
    <td style="font-size:11.5px;color:var(--t3);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${ms?ms.title:'—'}</td>
    <td><strong style="font-family:var(--mono)">${fmtRupee(inv.amount)}</strong></td>
    <td style="font-family:var(--mono);color:var(--green)">${inv.paidAmount?fmtRupee(inv.paidAmount):'—'}</td>
    <td style="color:${isPast?'var(--red)':'var(--t3)'};font-weight:${isPast?'600':'400'}">${fmtDate(inv.due)}${isPast?' ⚠️':''}</td>
    <td><span class="badge ${_sc(inv.status)}">${inv.status}</span></td>
    <td><div style="display:flex;gap:4px">
      <button class="btn btn-secondary btn-xs" onclick="openInvoiceDetailModal('${escAttr(String(inv.id))}')">View</button>
      ${inv.status==='Draft'?`<button class="btn btn-blue btn-xs" onclick="sendInvoice('${escAttr(String(inv.id))}')">Send</button>`:''}
      ${(inv.canonicalStatus==='DRAFT'||inv.canonicalStatus==='SENT'||inv.canonicalStatus==='PARTIALLY_PAID')?`<button class="btn btn-xs" style="background:#ECFDF5;color:var(--green);border:1px solid rgba(5,150,105,.2)" onclick="markPaid('${escAttr(String(inv.id))}')">Mark Paid</button>`:''}
    </div></td>
  </tr>`;
}

/* ══════════════════════════════════════════════════════════════
   MILESTONE INVOICE PANEL
══════════════════════════════════════════════════════════════ */
function openMilestoneInvoicePanel(pid, msId) {
  const p  = STATE.projects.find(x => x.id === pid);
  if (!p) return;
  const ms          = msId ? (p.milestones||[]).find(m => m.id === msId) : null;
  const num         = _nextInvNum();
  const clientEmail = _projectClientEmail(p);
  const firstDesc   = ms ? `${esc(ms.title)} — delivery` : '';
  const autoNotes   = ms
    ? `Payment for milestone: ${esc(ms.title)}\nProject: ${esc(p.name)}\nClient: ${esc(p.client)}${ms.desc?'\nScope: '+ms.desc:''}`
    : '';

  openPanel(ms ? `Invoice — ${esc(ms.title)}` : `New Invoice — ${esc(p.name)}`, `
    <div style="background:var(--s2);border-radius:var(--r10);padding:12px 14px;margin-bottom:16px">
      <div style="font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px">Project</div>
      <div style="font-size:13px;font-weight:700">${esc(p.name)}</div>
      <div style="font-size:12px;color:var(--t3)">${esc(p.client)}</div>
      ${ms?`<div style="margin-top:6px;display:flex;align-items:center;gap:6px">
        <div style="width:6px;height:6px;border-radius:50%;background:${ms.status==='Done'?'var(--green)':ms.status==='In Progress'?'var(--blue)':'var(--t3)'}"></div>
        <span style="font-size:12px;font-weight:600">Milestone: ${esc(ms.title)}</span>
        <span style="font-size:10px;background:${ms.status==='Done'?'#ECFDF5':ms.status==='In Progress'?'#EFF6FF':'var(--s3)'};color:${ms.status==='Done'?'var(--green)':ms.status==='In Progress'?'var(--blue)':'var(--t3)'};padding:1px 7px;border-radius:99px">${ms.status}</span>
      </div>`:''}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
      <div class="form-group">
        <label class="form-label">Invoice #</label>
        <input class="form-input" value="${num}" id="mi-num" readonly style="opacity:0.7;background:var(--s2)">
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select class="form-select" id="mi-status"><option>Draft</option><option>Sent</option></select>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Milestone (billing for)</label>
      <select class="form-select" id="mi-milestone" onchange="_syncMilestoneFields(${pid})">
        <option value="">— General / Not milestone-specific —</option>
        <option value="other">Other (type below)</option>
        ${(p.milestones||[]).map(m => {
          const dot = m.status==='Done'?'✅':m.status==='In Progress'?'🔵':'⚪';
          return `<option value="${m.id}"${msId===m.id?' selected':''}>${dot} ${esc(m.title)} (${m.status})</option>`;
        }).join('')}
      </select>
    </div>

    <div class="form-group" id="mi-other-wrap" style="display:none">
      <label class="form-label">What is this for? *</label>
      <input class="form-input" id="mi-other" placeholder="e.g. Extra revisions, Hosting renewal, Rush delivery" oninput="_miOtherToLine()">
    </div>
    <div class="form-group">
      <label class="form-label">Client Name</label>
      <input class="form-input" id="mi-client" value="${esc(p.client)}">
    </div>
    <div class="form-group">
      <label class="form-label">Client Email</label>
      <input class="form-input" id="mi-email" type="email" value="${clientEmail}">
    </div>

    <div style="font-size:13px;font-weight:600;margin:14px 0 8px">Line Items</div>
    <table class="invoice-line-items">
      <thead><tr><th>Description</th><th>Qty</th><th>Rate (₹)</th><th>Amount</th><th></th></tr></thead>
      <tbody id="mi-line-body">
        <tr>
          <td><input class="form-input" style="padding:5px 8px" id="mi-first-desc" placeholder="Service description" value="${firstDesc}" oninput="calcMiInvoice()"></td>
          <td><input type="number" class="form-input" style="width:50px;padding:5px 6px" value="1" oninput="calcMiInvoice()"></td>
          <td><input type="number" class="form-input" style="padding:5px 8px" value="0" oninput="calcMiInvoice()"></td>
          <td id="mi-la-0" style="font-family:var(--mono);font-size:12px;padding:0 6px">₹0</td>
          <td><span class="remove-line" onclick="removeMiLine(this)">×</span></td>
        </tr>
      </tbody>
    </table>
    <div style="display:flex;gap:8px;margin-bottom:14px">
      <button class="btn btn-secondary btn-sm" onclick="addMiLine()">+ Add Row</button>
      <button class="btn btn-secondary btn-sm" onclick="addMiOtherCharge()">+ Other charge (extra payment)</button>
    </div>

    <div class="invoice-total-box">
      <div class="invoice-total-row"><span>Subtotal</span><span id="mi-sub">₹0</span></div>
      <div class="invoice-total-row"><span>GST (18%)</span><span id="mi-gst">₹0</span></div>
      <div class="invoice-total-row grand"><span>Total</span><span id="mi-total" style="font-family:var(--mono)">₹0</span></div>
    </div>

    <div class="form-row" style="margin-top:14px">
      <div class="form-group">
        <label class="form-label">Due Date</label>
        <input class="form-input" id="mi-due" type="date">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Notes / Terms</label>
      <textarea class="form-textarea" id="mi-notes" placeholder="e.g. Net 30, bank details…">${autoNotes}</textarea>
    </div>
    ${_payNowBlock('mi')}
  `, `
    <button class="btn btn-secondary" onclick="closePanel()">Cancel</button>
    <button class="btn btn-primary" onclick="saveMilestoneInvoice(${pid})">Save Invoice</button>
  `);
}

function _miOtherToLine() {
  const first = document.getElementById('mi-first-desc') || document.querySelector('#mi-line-body tr input');
  const v = document.getElementById('mi-other')?.value || '';
  if (first && (!first.value || first.dataset.fromOther === '1')) { first.value = v; first.dataset.fromOther = '1'; }
}

/* "+ Other charge": an extra line you type yourself (extra work, rush fee …) */
function addMiOtherCharge() {
  if (typeof addMiLine === 'function') addMiLine();
  const rows = document.querySelectorAll('#mi-line-body tr');
  const last = rows[rows.length - 1];
  const inp = last && last.querySelector('input');
  if (inp) { inp.placeholder = 'Other charge \u2014 e.g. Extra revisions'; inp.focus(); }
}

/* Project value not yet invoiced (before GST), after any advance taken */
function _valueLeftToBill(p) {
  const raw = (DataAPI.raw().invoices || []).filter(i => i.projectId === p.id && i.status !== 'CANCELLED');
  const billedSub = raw.reduce((t, i) => t + (i.subtotalPaise || 0), 0);
  return Utils.paiseToRupees(Math.max(0, Math.round(p.value * 100) - billedSub));
}

/* Suggested amount for a milestone invoice: what is left of the project value,
   shared across the billable milestones that are not invoiced yet. */
function _suggestedMilestoneAmount(p, msId) {
  const D = DataAPI.raw();
  const billedMs = new Set((D.invoices || []).filter(i => i.projectId === p.id && i.status !== 'CANCELLED' && i.milestoneId).map(i => i.milestoneId));
  const open = (D.milestones || []).filter(m => m.projectId === p.id && m.billable !== false && !billedMs.has(m.id));
  const left = _valueLeftToBill(p);
  if (!msId) return left;
  return open.length ? Math.round(left / open.length) : left;
}

function _syncMilestoneFields(pid) {
  const wrap = document.getElementById('mi-other-wrap');
  if (wrap) wrap.style.display = document.getElementById('mi-milestone')?.value === 'other' ? 'block' : 'none';
  const p    = STATE.projects.find(x => x.id === pid);
  const msId = parseInt(document.getElementById('mi-milestone')?.value) || null;
  const ms   = msId && p ? (p.milestones||[]).find(m => m.id === msId) : null;
  if (!ms) return;

  const descEl = document.getElementById('mi-first-desc');
  if (descEl && !descEl.value) descEl.value = `${esc(ms.title)} — delivery`;
  /* amount from the project value (only if the rate is still empty) */
  const firstRow = document.querySelector('#mi-line-body tr');
  const rateEl = firstRow ? firstRow.querySelectorAll('input')[2] : null;
  if (rateEl && !(parseFloat(rateEl.value) > 0)) {
    rateEl.value = _suggestedMilestoneAmount(p, msId);
    if (typeof calcMiInvoice === 'function') calcMiInvoice();
  }

  const notesEl = document.getElementById('mi-notes');
  if (notesEl && !notesEl.value) {
    notesEl.value = `Payment for milestone: ${esc(ms.title)}\nProject: ${esc(p.name)}\nClient: ${esc(p.client)}${ms.desc?'\nScope: '+ms.desc:''}`;
  }
}

let _miLineCount = 1;
function addMiLine() {
  const idx = _miLineCount++;
  const tr  = document.createElement('tr');
  tr.innerHTML = `
    <td><input class="form-input" style="padding:5px 8px" placeholder="Description" oninput="calcMiInvoice()"></td>
    <td><input type="number" class="form-input" style="width:50px;padding:5px 6px" value="1" oninput="calcMiInvoice()"></td>
    <td><input type="number" class="form-input" style="padding:5px 8px" value="0" oninput="calcMiInvoice()"></td>
    <td id="mi-la-${idx}" style="font-family:var(--mono);font-size:12px;padding:0 6px">₹0</td>
    <td><span class="remove-line" onclick="removeMiLine(this)">×</span></td>`;
  document.getElementById('mi-line-body').appendChild(tr);
}
function removeMiLine(el) {
  const tbody = document.getElementById('mi-line-body');
  if (tbody.children.length > 1) { el.closest('tr').remove(); calcMiInvoice(); }
}
function calcMiInvoice() {
  let sub = 0;
  document.getElementById('mi-line-body')?.querySelectorAll('tr').forEach(tr => {
    const ins = tr.querySelectorAll('input');
    const amt = (parseFloat(ins[1]?.value)||0) * (parseFloat(ins[2]?.value)||0);
    sub += amt;
    const el = tr.querySelector('[id^="mi-la"]');
    if (el) el.textContent = fmtRupee(amt);
  });
  const gst = Math.round(sub * 0.18), total = sub + gst;
  const s = document.getElementById('mi-sub');   if(s) s.textContent = fmtRupee(sub);
  const g = document.getElementById('mi-gst');   if(g) g.textContent = fmtRupee(gst);
  const t = document.getElementById('mi-total'); if(t) t.textContent = fmtRupee(total);
  return total;
}
/* Warn before billing a milestone twice or billing more than the project value */
function saveMilestoneInvoice(pid, confirmed) {
  if (!confirmed) {
    const msSel0 = document.getElementById('mi-milestone')?.value || '';
    const msId0 = msSel0 && msSel0 !== 'other' ? parseInt(msSel0) : null;
    const D = DataAPI.raw();
    const live = (D.invoices || []).filter(i => i.projectId === pid && i.status !== 'CANCELLED');
    const dup = msId0 ? live.find(i => i.milestoneId === msId0) : null;
    const proj = STATE.projects.find(x => x.id === pid) || {};
    const billedSub = live.reduce((t, i) => t + (i.subtotalPaise || 0), 0);
    const newSub = Utils.rupeesToPaise(_collectLines('mi-line-body').reduce((t, l) => t + (l.qty || 0) * (l.ratePaise || 0) / 100, 0));
    const over = proj.value && billedSub + newSub > Math.round(proj.value * 100);
    if (dup || over) {
      const msg = (dup ? 'This milestone already has invoice ' + dup.number + ' (' + dup.status.toLowerCase().replace('_', ' ') + '). ' : '') +
        (over ? 'With this invoice you would bill ' + Utils.fmtRupee(billedSub + newSub).replace('.00', '') + ' (before GST) against a project value of ' + fmtRupee(proj.value) + '. ' : '') +
        'Create it anyway?';
      showConfirm(msg, function () { saveMilestoneInvoice(pid, true); });
      return;
    }
  }
  const p      = STATE.projects.find(x => x.id === pid);
  const client = document.getElementById('mi-client')?.value?.trim();
  if (!client) { toast('Enter client name', 'error'); return; }
  const total = calcMiInvoice();
  if (total <= 0) { toast('Add at least one line item with amount', 'error'); return; }
  const num  = document.getElementById('mi-num').value;
  const msSel = document.getElementById('mi-milestone')?.value || '';
  const msId = msSel === 'other' ? null : (parseInt(msSel) || null);
  const miOther = (document.getElementById('mi-other')?.value || '').trim();
  if (msSel === 'other' && !miOther) { toast('Type what this invoice is for', 'error'); return; }
  const lines = _collectLines('mi-line-body');
  DataAPI.createInvoice({
    clientName:    client,
    clientEmail:   document.getElementById('mi-email').value,
    clientGstin:   document.getElementById('mi-gstin')?.value || p.clientGstin || '',
    placeOfSupply: p.clientStateCode || '',
    projectId:     pid,
    milestoneId:   msId,
    subject:       msSel === 'other' ? miOther : '',
    lines:         lines,
    dueDate:       document.getElementById('mi-due').value || null,
    status:        Schema.normInvoiceStatus(document.getElementById('mi-status').value),
    notes:         document.getElementById('mi-notes').value
  }).then(function (invoice) {
    return _applyPayNow('mi', invoice).then(function (paid) {
      syncState();
      _refreshInvNum();
      closePanel();
      toast(`Invoice ${invoice.number} saved` + (paid ? (paid.status === 'PAID' ? ' and marked paid' : ' \u00b7 payment recorded') : ''), 'success');
      if (_invCurrentProject) openProjectBilling(_invCurrentProject);
      else renderInvoices();
    });
  }).catch(function (err) { toast(err.message, 'error'); });
}

/* ══════════════════════════════════════════════════════════════
   CUSTOM INVOICE PANEL
══════════════════════════════════════════════════════════════ */
function openCustomInvoicePanel() {
  const num = _nextInvNum();
  openPanel('Create Custom Invoice', `
    <div style="background:linear-gradient(135deg,#EFF6FF,#F0FDF4);border-radius:var(--r10);padding:12px 14px;margin-bottom:16px;border:1px solid var(--b1)">
      <div style="font-size:12px;font-weight:600;color:var(--blue);margin-bottom:2px">Custom Invoice</div>
      <div style="font-size:11.5px;color:var(--t3)">Send to any client personally, not linked to a project</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
      <div class="form-group">
        <label class="form-label">Invoice #</label>
        <input class="form-input" value="${num}" id="ci-num" readonly style="opacity:0.7;background:var(--s2)">
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select class="form-select" id="ci-status"><option>Draft</option><option>Sent</option></select>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group">
        <label class="form-label">Project</label>
        <select class="form-select" id="ci-project" onchange="_ciProjectChanged()">
          <option value="">\u2014 Not linked to a project \u2014</option>
          ${STATE.projects.map(p => `<option value="${p.id}">${esc(p.name)}${p.client ? ' \u00b7 ' + esc(p.client) : ''}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Milestone</label>
        <select class="form-select" id="ci-ms" onchange="_ciMilestoneChanged()">
          <option value="">\u2014 None \u2014</option>
          <option value="other">Other (type below)</option>
        </select>
      </div>
    </div>
    <div class="form-group" id="ci-other-wrap" style="display:none">
      <label class="form-label">What is this invoice for? *</label>
      <input class="form-input" id="ci-other" placeholder="e.g. Extra design changes, Hosting, Maintenance \u2014 June" oninput="_ciOtherToLine()">
      <div class="form-hint">Used as the invoice subject and the first line item.</div>
    </div>
    <div class="form-group">
      <label class="form-label">Client / Recipient Name *</label>
      <input class="form-input" id="ci-client" placeholder="Company or individual name">
    </div>
    <div class="form-group">
      <label class="form-label">Client Email</label>
      <input class="form-input" id="ci-email" type="email" placeholder="billing@client.com">
    </div>
    <div class="form-group">
      <label class="form-label">Subject / Description</label>
      <input class="form-input" id="ci-subject" placeholder="e.g. Consulting services — May 2026">
    </div>
    <div style="font-size:13px;font-weight:600;margin:14px 0 8px">Line Items</div>
    <table class="invoice-line-items">
      <thead><tr><th>Description</th><th>Qty</th><th>Rate (₹)</th><th>Amount</th><th></th></tr></thead>
      <tbody id="ci-line-body">
        <tr>
          <td><input class="form-input" style="padding:5px 8px" placeholder="Service / item" oninput="calcCiInvoice()"></td>
          <td><input type="number" class="form-input" style="width:50px;padding:5px 6px" value="1" oninput="calcCiInvoice()"></td>
          <td><input type="number" class="form-input" style="padding:5px 8px" value="0" oninput="calcCiInvoice()"></td>
          <td id="ci-la-0" style="font-family:var(--mono);font-size:12px;padding:0 6px">₹0</td>
          <td><span class="remove-line" onclick="removeCiLine(this)">×</span></td>
        </tr>
      </tbody>
    </table>
    <button class="btn btn-secondary btn-sm" onclick="addCiLine()" style="margin-bottom:14px">+ Add Row</button>
    <div class="invoice-total-box">
      <div class="invoice-total-row"><span>Subtotal</span><span id="ci-sub">₹0</span></div>
      <div class="invoice-total-row"><span>GST (18%)</span><span id="ci-gst">₹0</span></div>
      <div class="invoice-total-row grand"><span>Total</span><span id="ci-total" style="font-family:var(--mono)">₹0</span></div>
    </div>
    <div class="form-row" style="margin-top:14px">
      <div class="form-group">
        <label class="form-label">Due Date</label>
        <input class="form-input" id="ci-due" type="date">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Notes / Payment Terms</label>
      <textarea class="form-textarea" id="ci-notes" placeholder="Bank details, payment terms…"></textarea>
    </div>
    ${_payNowBlock('ci')}

    <div style="border:1px solid var(--b1);border-radius:var(--r10);padding:12px 14px;margin-top:6px">
      <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
        <input type="checkbox" id="ci-repeat" onchange="document.getElementById('ci-repeat-box').style.display=this.checked?'block':'none';document.getElementById('ci-save').textContent=this.checked?'Save recurring invoice':'Save Invoice'">
        <span><span style="font-weight:600;font-size:13px">\uD83D\uDD01 Repeat this invoice (recurring amount)</span>
        <span style="display:block;font-size:12px;color:var(--t3)">For retainers, monthly fees, AMC, hosting \u2014 a new invoice is made automatically.</span></span>
      </label>
      <div id="ci-repeat-box" style="display:none;margin-top:12px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div class="form-group"><label class="form-label">Repeat every</label>
            <select class="form-select" id="ci-freq"><option value="MONTHLY">Month</option><option value="QUARTERLY">Quarter (3 months)</option><option value="YEARLY">Year</option><option value="WEEKLY">Week</option></select></div>
          <div class="form-group"><label class="form-label">First invoice on</label>
            <input class="form-input" type="date" id="ci-start" value="${Utils.isoDate(new Date())}"></div>
          <div class="form-group"><label class="form-label">Stop after (invoices)</label>
            <input class="form-input" type="number" min="1" id="ci-max" placeholder="Never stop"></div>
          <div class="form-group"><label class="form-label">\u2026or stop on date</label>
            <input class="form-input" type="date" id="ci-end"></div>
          <div class="form-group"><label class="form-label">Payment due after (days)</label>
            <input class="form-input" type="number" min="0" id="ci-duedays" value="15"></div>
          <div class="form-group" style="display:flex;align-items:flex-end">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;padding-bottom:9px">
              <input type="checkbox" id="ci-autosend"> Email it to the client automatically</label></div>
        </div>
        <div class="form-hint">Each invoice is made on its date (checked every morning), numbered in sequence, and shows up in All invoices. If the first date is today, the first invoice is made now.</div>
      </div>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closePanel()">Cancel</button>
    <button class="btn btn-primary" id="ci-save" onclick="saveCustomInvoice()">Save Invoice</button>
  `);
}

let _ciLineCount = 1;
function addCiLine() {
  const idx = _ciLineCount++;
  const tr  = document.createElement('tr');
  tr.innerHTML = `
    <td><input class="form-input" style="padding:5px 8px" placeholder="Description" oninput="calcCiInvoice()"></td>
    <td><input type="number" class="form-input" style="width:50px;padding:5px 6px" value="1" oninput="calcCiInvoice()"></td>
    <td><input type="number" class="form-input" style="padding:5px 8px" value="0" oninput="calcCiInvoice()"></td>
    <td id="ci-la-${idx}" style="font-family:var(--mono);font-size:12px;padding:0 6px">₹0</td>
    <td><span class="remove-line" onclick="removeCiLine(this)">×</span></td>`;
  document.getElementById('ci-line-body').appendChild(tr);
}
function removeCiLine(el) {
  const tbody = document.getElementById('ci-line-body');
  if (tbody.children.length > 1) { el.closest('tr').remove(); calcCiInvoice(); }
}
function calcCiInvoice() {
  let sub = 0;
  document.getElementById('ci-line-body')?.querySelectorAll('tr').forEach(tr => {
    const ins = tr.querySelectorAll('input');
    const amt = (parseFloat(ins[1]?.value)||0) * (parseFloat(ins[2]?.value)||0);
    sub += amt;
    const el = tr.querySelector('[id^="ci-la"]');
    if (el) el.textContent = fmtRupee(amt);
  });
  const gst = Math.round(sub * 0.18), total = sub + gst;
  const s = document.getElementById('ci-sub');   if(s) s.textContent = fmtRupee(sub);
  const g = document.getElementById('ci-gst');   if(g) g.textContent = fmtRupee(gst);
  const t = document.getElementById('ci-total'); if(t) t.textContent = fmtRupee(total);
  return total;
}

/* ── "Payment already received?" — fill it while creating the invoice ── */
function _payNowBlock(px) {
  const today = Utils.isoDate(new Date());
  return `
    <div style="border:1px solid var(--b1);border-radius:var(--r10);padding:12px 14px;margin-top:10px">
      <div style="font-size:13px;font-weight:600;margin-bottom:8px">\uD83D\uDCB0 Payment received?</div>
      <select class="form-select" id="${px}-paynow" onchange="document.getElementById('${px}-paybox').style.display=this.value==='none'?'none':'grid';if(this.value==='full'){document.getElementById('${px}-payamt').value='';}">
        <option value="none">Not yet \u2014 the client will pay later</option>
        <option value="full">Yes, the full amount</option>
        <option value="part">Yes, part of it</option>
      </select>
      <div id="${px}-paybox" style="display:none;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px">
        <div class="form-group"><label class="form-label">Amount received (\u20b9)</label>
          <input class="form-input" type="number" min="0.01" step="0.01" id="${px}-payamt" placeholder="Full amount if empty"></div>
        <div class="form-group"><label class="form-label">Date received</label>
          <input class="form-input" type="date" id="${px}-paydate" value="${today}" max="${today}"></div>
        <div class="form-group"><label class="form-label">Method</label>
          <select class="form-select" id="${px}-paymethod">${['Bank transfer','UPI','Cheque','Cash','Card','Other'].map(m => `<option>${m}</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label">Reference / UTR</label>
          <input class="form-input" id="${px}-payref" placeholder="optional"></div>
      </div>
    </div>`;
}

/* after the invoice is saved: record the payment typed in the block */
function _applyPayNow(px, invoice) {
  const mode = document.getElementById(px + '-paynow')?.value || 'none';
  if (mode === 'none') return Promise.resolve(null);
  const total = invoice.totalPaise - (invoice.paidPaise || 0);
  const typed = parseFloat(document.getElementById(px + '-payamt')?.value);
  const amountPaise = mode === 'full' || isNaN(typed) || typed <= 0 ? total : Math.min(total, Utils.rupeesToPaise(typed));
  return DataAPI.recordPayment(invoice.id, amountPaise, {
    date: document.getElementById(px + '-paydate')?.value || Utils.isoDate(new Date()),
    method: document.getElementById(px + '-paymethod')?.value || 'Bank transfer',
    reference: (document.getElementById(px + '-payref')?.value || '').trim()
  });
}

function _ciProjectChanged() {
  const pid = Number(document.getElementById('ci-project')?.value) || null;
  const msSel = document.getElementById('ci-ms');
  const p = pid ? STATE.projects.find(x => x.id === pid) : null;
  if (msSel) {
    msSel.innerHTML = '<option value="">\u2014 None \u2014</option>' +
      (p ? (p.milestones || []).map(m => `<option value="${m.id}">${esc(m.title)}${m.status === 'Done' ? ' \u2713' : ''}</option>`).join('') : '') +
      '<option value="other">Other (type below)</option>';
  }
  if (p) {
    const c = document.getElementById('ci-client'); if (c && !c.value) c.value = p.client || '';
    const e = document.getElementById('ci-email'); if (e && !e.value) e.value = _projectClientEmail(p) || '';
  }
  _ciMilestoneChanged();
}
function _ciMilestoneChanged() {
  const v = document.getElementById('ci-ms')?.value || '';
  const wrap = document.getElementById('ci-other-wrap');
  if (wrap) wrap.style.display = v === 'other' ? 'block' : 'none';
  if (v && v !== 'other') {
    const pid = Number(document.getElementById('ci-project')?.value) || null;
    const p = STATE.projects.find(x => x.id === pid);
    const m = p && (p.milestones || []).find(x => String(x.id) === v);
    const first = document.querySelector('#ci-line-body tr input');
    if (m && first && !first.value) first.value = m.title;
  }
}
function _ciOtherToLine() {
  const first = document.querySelector('#ci-line-body tr input');
  const other = document.getElementById('ci-other')?.value || '';
  if (first && (!first.value || first.dataset.fromOther === '1')) { first.value = other; first.dataset.fromOther = '1'; }
}

function saveCustomInvoice() {
  const client = document.getElementById('ci-client')?.value?.trim();
  if (!client) { toast('Enter client name', 'error'); return; }
  const total = calcCiInvoice();
  if (total <= 0) { toast('Add at least one line item', 'error'); return; }
  const msVal = document.getElementById('ci-ms')?.value || '';
  const other = (document.getElementById('ci-other')?.value || '').trim();
  if (msVal === 'other' && !other) { toast('Type what this invoice is for', 'error'); return; }
  const projectId = Number(document.getElementById('ci-project')?.value) || null;
  const milestoneId = msVal && msVal !== 'other' ? Number(msVal) : null;
  const subject = msVal === 'other' ? other : (document.getElementById('ci-subject')?.value || '').trim();
  const base = {
    clientName:    client,
    clientEmail:   (document.getElementById('ci-email')?.value || '').trim(),
    clientGstin:   document.getElementById('ci-gstin')?.value || '',
    placeOfSupply: document.getElementById('ci-pos')?.value || '',
    projectId, subject,
    lines:         _collectLines('ci-line-body'),
    notes:         document.getElementById('ci-notes')?.value || ''
  };

  /* recurring plan */
  if (document.getElementById('ci-repeat')?.checked) {
    const autoSend = !!document.getElementById('ci-autosend')?.checked;
    if (autoSend && !base.clientEmail) { toast('Add the client email to send invoices automatically', 'error'); return; }
    DataAPI.createRecurringInvoice(Object.assign({}, base, {
      name: subject || client,
      frequency: document.getElementById('ci-freq')?.value || 'MONTHLY',
      startDate: document.getElementById('ci-start')?.value || Utils.isoDate(new Date()),
      endDate: document.getElementById('ci-end')?.value || null,
      maxCount: parseInt(document.getElementById('ci-max')?.value, 10) || null,
      dueInDays: parseInt(document.getElementById('ci-duedays')?.value, 10),
      autoSend
    })).then(function (plan) {
      const made = plan.created || [];
      const sends = made.filter(m => m.autoSend).map(m => DataAPI.sendInvoice(m.invoiceId).catch(() => null));
      return Promise.all(sends).then(function () {
        syncState(); _refreshInvNum(); closePanel(); renderInvoices();
        toast(made.length ? `Recurring invoice set up \u2014 ${made.map(m => m.number).join(', ')} made${sends.length ? ' and emailed' : ''}` : `Recurring invoice set up \u2014 first one on ${fmtDate(plan.nextDate)}`, 'success');
      });
    }).catch(function (err) { toast(err.message, 'error'); });
    return;
  }

  DataAPI.createInvoice(Object.assign({}, base, {
    milestoneId,
    dueDate:       document.getElementById('ci-due')?.value || null,
    status:        Schema.normInvoiceStatus(document.getElementById('ci-status')?.value || 'Draft')
  })).then(function (invoice) {
    return _applyPayNow('ci', invoice).then(function (paid) {
      syncState(); _refreshInvNum(); closePanel(); renderInvoices();
      toast(`Invoice ${invoice.number} created` + (paid ? (paid.status === 'PAID' ? ' and marked paid' : ' \u00b7 payment recorded') : ''), 'success');
    });
  }).catch(function (err) { toast(err.message, 'error'); });
}

/* ══════════════════════════════════════════════════════════════
   RECURRING INVOICES
══════════════════════════════════════════════════════════════ */
const _FREQ_LABEL = { WEEKLY: 'Weekly', MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', YEARLY: 'Yearly' };

function _recurringSection() {
  const plans = (DataAPI.raw().recurringInvoices || []);
  if (!plans.length) return '';
  const amt = p => {
    const sub = (p.lines || []).reduce((s, l) => s + Math.round((Number(l.qty) || 0) * (Number(l.ratePaise) || 0)), 0);
    return Utils.paiseToRupees(sub);
  };
  const badge = st => st === 'ACTIVE' ? 'badge-green' : st === 'PAUSED' ? 'badge-amber' : 'badge-grey';
  return `
    <div style="font-size:13px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px">\uD83D\uDD01 Recurring invoices</div>
    <div class="card" style="overflow-x:auto;margin-bottom:24px">
      <table class="data-table" style="min-width:760px">
        <thead><tr><th>Plan</th><th>Client</th><th>Amount (before GST)</th><th>Repeats</th><th>Next invoice</th><th>Made</th><th>Status</th><th style="text-align:right">Actions</th></tr></thead>
        <tbody>${plans.map(p => `<tr>
          <td><div style="font-weight:600">${esc(p.name || p.subject || p.clientName)}</div>${p.autoSend ? '<div style="font-size:11px;color:var(--t3)">emailed automatically</div>' : ''}</td>
          <td>${esc(p.clientName)}</td>
          <td style="font-family:var(--mono);font-weight:600">${fmtRupee(amt(p))}</td>
          <td>${_FREQ_LABEL[p.frequency] || p.frequency}</td>
          <td>${p.status === 'COMPLETED' ? '\u2014' : fmtDate(p.nextDate)}</td>
          <td>${p.count || 0}${p.maxCount ? ' / ' + p.maxCount : ''}</td>
          <td><span class="badge ${badge(p.status)}">${p.status === 'ACTIVE' ? 'Active' : p.status === 'PAUSED' ? 'Paused' : 'Finished'}</span></td>
          <td><div style="display:flex;gap:4px;justify-content:flex-end">
            ${p.status === 'ACTIVE' ? `<button class="btn btn-secondary btn-xs" onclick="toggleRecurring('${escAttr(p.id)}', false)">Pause</button>` : ''}
            ${p.status === 'PAUSED' ? `<button class="btn btn-secondary btn-xs" onclick="toggleRecurring('${escAttr(p.id)}', true)">Resume</button>` : ''}
            <button class="btn btn-secondary btn-xs" style="color:var(--red)" onclick="deleteRecurring('${escAttr(p.id)}')">Delete</button>
          </div></td>
        </tr>`).join('')}</tbody>
      </table>
    </div>`;
}

function toggleRecurring(id, active) {
  DataAPI.updateRecurringInvoice(id, { active: active }).then(function () {
    syncState(); renderInvoices();
    toast(active ? 'Recurring invoice resumed' : 'Recurring invoice paused', 'success');
  }).catch(function (err) { toast(err.message, 'error'); });
}

function deleteRecurring(id) {
  showConfirm('Delete this recurring plan? Invoices already made are kept; no new ones will be made.', function () {
    DataAPI.deleteRecurringInvoice(id).then(function () {
      syncState(); renderInvoices(); toast('Recurring plan deleted', 'success');
    }).catch(function (err) { toast(err.message, 'error'); });
  });
}

/* Header "Record payment": pick the invoice first */
function openPaymentPicker() {
  const payable = STATE.invoices.filter(_isPayable);
  if (!payable.length) { toast('There are no unpaid invoices', 'error'); return; }
  if (payable.length === 1) { openRecordPaymentModal(payable[0].id); return; }
  openModal('Record payment \u2014 which invoice?', `
    <div style="font-size:12.5px;color:var(--t3);margin-bottom:10px">Pick the invoice the client paid.</div>
    ${payable.map(inv => `
      <div onclick="closeModal();setTimeout(()=>openRecordPaymentModal('${escAttr(String(inv.id))}'),150)" style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--b1);border-radius:var(--r8);margin-bottom:6px;cursor:pointer" onmouseover="this.style.background='var(--s2)'" onmouseout="this.style.background=''">
        <div style="flex:1;min-width:0"><div style="font-weight:600;font-size:13px">${esc(inv.num)} \u00b7 ${esc(inv.client || '')}</div>
          <div style="font-size:11.5px;color:var(--t3)">${esc(inv.project || '')} \u00b7 ${inv.status}</div></div>
        <div style="text-align:right"><div style="font-family:var(--mono);font-weight:700;color:var(--amber)">${fmtRupee(inv.balance)}</div><div style="font-size:10.5px;color:var(--t3)">due</div></div>
      </div>`).join('')}
  `, `<button class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>`);
}

function _deadSaveCustomInvoice() {
  const num = '', client = '';
  const _unused = ({
    id:          Date.now(),
    num,
    client,
    clientEmail: '',
    project:     '',
    projectId:   null,
    milestoneId: null,
    amount:      total,
    date:        Utils.isoDate(new Date()),
    due:         document.getElementById('ci-due').value || '2026-06-30',
    status:      document.getElementById('ci-status').value,
    notes:       document.getElementById('ci-notes').value,
    timeline:    [],
  });
  closePanel();
  renderInvoices();
  toast(`Custom invoice ${num} saved`, 'success');
}

/* ══════════════════════════════════════════════════════════════
   INVOICE DETAIL MODAL
══════════════════════════════════════════════════════════════ */
function openInvoiceDetailModal(id) {
  const inv = STATE.invoices.find(i => String(i.id) === String(id));
  if (!inv) return;
  const sc       = _sc(inv.status);
  const proj     = STATE.projects.find(p => p.id === inv.projectId || p.name === inv.project);
  const ms       = inv.milestoneId && proj?.milestones?.find(m => m.id === inv.milestoneId);
  const isPast   = _isPastDue(inv.due) && inv.status !== 'Paid';
  const timeline = inv.timeline || [];

  openModal(inv.num, `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px;gap:12px">
      <div>
        <div style="font-size:18px;font-weight:700;font-family:var(--mono)">${esc(inv.num)}</div>
        <div style="font-size:12px;color:var(--t3);margin-top:2px">Issued ${fmtDate(inv.date)}</div>
      </div>
      <span class="badge ${sc}" style="font-size:12px;padding:4px 10px">${inv.status}</span>
    </div>
    <div style="background:var(--s2);border-radius:var(--r12);padding:16px;text-align:center;margin-bottom:16px">
      <div style="font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">Invoice Amount</div>
      <div style="font-size:28px;font-weight:800;font-family:var(--mono)">${fmtRupee(inv.amount)}</div>
      ${inv.paidAmount?`<div style="font-size:12px;color:var(--green);margin-top:3px">✓ ${fmtRupee(inv.paidAmount)} received${inv.paidAmount<inv.amount?` · ${fmtRupee(inv.amount-inv.paidAmount)} remaining`:''}</div>`:''}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
      ${[['Client',inv.client],['Email',inv.clientEmail||'—'],
         ['Project',proj?proj.name:(inv.project||'—')],['Milestone',ms?ms.title:'—'],
         ['Due Date',`<span style="color:${isPast?'var(--red)':'inherit'};font-weight:${isPast?'600':'400'}">${fmtDate(inv.due)}${isPast?' (Overdue)':''}</span>`],
         ['Status',`<span class="badge ${sc}">${inv.status}</span>`]]
        .map(([l,v])=>`<div style="padding:8px 10px;background:var(--s2);border-radius:var(--r6)">
          <div style="font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.3px;margin-bottom:2px">${l}</div>
          <div style="font-size:12.5px;font-weight:600">${v}</div>
        </div>`).join('')}
    </div>
    ${inv.notes?`<div style="margin-bottom:14px;padding:10px;background:var(--s2);border-radius:var(--r8)">
      <div style="font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.3px;margin-bottom:4px">Notes</div>
      <div style="font-size:12.5px;color:var(--t2);line-height:1.5;white-space:pre-line">${esc(inv.notes)}</div>
    </div>`:''}
    ${timeline.length?`<div>
      <div style="font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.3px;margin-bottom:8px">History</div>
      ${timeline.map(e=>`<div style="display:flex;gap:8px;margin-bottom:6px">
        <div style="width:6px;height:6px;border-radius:50%;background:var(--${e.tone==='grey'?'t3':e.tone||'green'});margin-top:4px;flex-shrink:0"></div>
        <div><div style="font-size:12px;font-weight:500">${esc(e.text)}</div><div style="font-size:11px;color:var(--t3)">${e.time}</div></div>
      </div>`).join('')}
    </div>`:''}
    ${(inv.canonicalStatus==='DRAFT'||inv.canonicalStatus==='SENT'||inv.canonicalStatus==='PARTIALLY_PAID')?`
    <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--b1)">
      <div style="font-size:12px;font-weight:600;margin-bottom:8px">Record a payment <span style="font-weight:400;color:var(--t3)">\u00b7 balance ${fmtRupee(inv.balance)}</span></div>
      ${inv.canonicalStatus==='DRAFT'?'<div style="font-size:11.5px;color:var(--t3);margin:-4px 0 8px">This invoice is still a draft. Recording a payment marks it as issued (no email is sent).</div>':''}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div><label class="form-label">Amount (\u20b9)</label><input class="form-input" type="number" min="0.01" step="0.01" id="partial-amt" value="${inv.balance}"></div>
        <div><label class="form-label">Date received</label><input class="form-input" type="date" id="pay-date" value="${Utils.isoDate(new Date())}" max="${Utils.isoDate(new Date())}"></div>
        <div><label class="form-label">Method</label><select class="form-select" id="pay-method">${['Bank transfer','UPI','Cheque','Cash','Card','Other'].map(m=>`<option>${m}</option>`).join('')}</select></div>
        <div><label class="form-label">Reference / UTR</label><input class="form-input" id="pay-ref" placeholder="optional"></div>
      </div>
      <div style="display:flex;justify-content:flex-end;margin-top:10px"><button class="btn btn-primary btn-sm" id="pay-btn" onclick="recordPartialPayment('${escAttr(String(id))}')">Record payment</button></div>
    </div>`:''}
  `, `
    ${inv.status==='Draft'?`<button class="btn btn-blue btn-sm" onclick="sendInvoice('${escAttr(String(id))}');closeModal()">Send Invoice</button>`:''}
    ${(inv.canonicalStatus==='DRAFT'||inv.canonicalStatus==='SENT'||inv.canonicalStatus==='PARTIALLY_PAID')?`<button class="btn btn-sm" style="background:var(--green);color:#fff" onclick="markPaid('${escAttr(String(id))}')">Mark as Paid</button>`:''}
    ${window.OmentAPI?`<button class="btn btn-secondary btn-sm" onclick="downloadInvoicePdf('${escAttr(String(id))}')">Download PDF</button>`:''}
    ${inv.canonicalStatus==='DRAFT'?`<button class="btn btn-secondary btn-sm" onclick="deleteInvoice('${escAttr(String(id))}')">Delete draft</button>`:''}
    ${(inv.canonicalStatus==='SENT'||inv.canonicalStatus==='OVERDUE')&&!inv.paidAmount?`<button class="btn btn-danger btn-sm" onclick="cancelInvoiceUI('${escAttr(String(id))}')">Cancel invoice</button>`:''}
  `);
}

function cancelInvoiceUI(id) {
  const inv = STATE.invoices.find(i => String(i.id) === String(id));
  if (!inv) return;
  const reason = window.prompt(`Why are you cancelling ${inv.num}? (the client is told)`, '');
  if (reason === null) return;
  DataAPI.cancelInvoice(id, reason.trim()).then(function () {
    syncState(); closeModal(); closePanel(); _refreshInvoiceView();
    toast(`${inv.num} cancelled`, 'success');
  }).catch(function (err) { toast(err.message, 'error'); });
}

function downloadInvoicePdf(id) {
  const inv = STATE.invoices.find(i => String(i.id) === String(id));
  toast('Preparing PDF\u2026');
  OmentAPI.downloadInvoicePdf(id, 'Invoice-' + String((inv && inv.num) || id).replace(/[^\w.-]/g, '_') + '.pdf')
    .catch(function (err) { toast('Could not download: ' + err.message, 'error'); });
}

/* ══════════════════════════════════════════════════════════════
   ACTIONS
══════════════════════════════════════════════════════════════ */
/* Send: check / type the client email, then email the invoice with its PDF.
   (It used to fail silently when the invoice had no client email.) */
function sendInvoice(id) {
  const inv = STATE.invoices.find(i => String(i.id) === String(id));
  if (!inv) return;
  const raw = (DataAPI.raw().invoices || []).find(x => String(x.id) === String(id)) || {};
  closeModal();
  setTimeout(function () {
    openModal(`Send ${esc(inv.num)}`, `
      <div style="font-size:13px;color:var(--t2);margin-bottom:12px">${esc(inv.client || '')} \u00b7 <strong style="font-family:var(--mono)">${fmtRupee(inv.amount)}</strong></div>
      <div class="form-group"><label class="form-label">Client email *</label>
        <input class="form-input" type="email" id="si-email" value="${escAttr(raw.clientEmail || ((STATE.projects.find(x => x.id === raw.projectId) || {}).clientEmail) || '')}" placeholder="billing@client.com"></div>
      <div class="form-hint" id="si-hint">The invoice is emailed with the PDF attached. The client also gets a receipt when you record a payment.</div>
    `, `<button class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary btn-sm" id="si-btn" onclick="_doSendInvoice('${escAttr(String(id))}')">Send invoice</button>`);
    if (window.OmentAPI && OmentAPI.emailSettings) {
      OmentAPI.emailSettings().then(function (cfg) {
        const h = document.getElementById('si-hint');
        if (h && !(cfg.smtp && cfg.smtp.configured)) h.innerHTML = '\u26A0\uFE0F Email is not set up on the server yet (SMTP in the backend <code>.env</code>). The invoice will be marked as sent, but no email goes out until SMTP is set.';
      }).catch(function () {});
    }
  }, 120);
}

function _doSendInvoice(id) {
  const email = (document.getElementById('si-email')?.value || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast('Enter a valid client email', 'error'); return; }
  const btn = document.getElementById('si-btn'); if (btn) { btn.disabled = true; btn.textContent = 'Sending\u2026'; }
  const raw = (DataAPI.raw().invoices || []).find(x => String(x.id) === String(id)) || {};
  const proj = raw.projectId ? (DataAPI.raw().projects || []).find(x => x.id === raw.projectId) : null;
  const save = (raw.clientEmail === email ? Promise.resolve() : DataAPI.updateInvoice(id, { clientEmail: email }))
    .then(function () { if (proj && !proj.clientEmail) return DataAPI.updateProject(proj.id, { clientEmail: email }); });
  save.then(function () { return DataAPI.sendInvoice(id); }).then(function () {
    syncState(); closeModal(); closePanel(); _refreshInvoiceView();
    toast(`Invoice emailed to ${email} (PDF attached)`, 'success');
  }).catch(function (err) {
    if (btn) { btn.disabled = false; btn.textContent = 'Send invoice'; }
    toast(err.message, 'error');
  });
}

function markPaid(id) {
  const inv = STATE.invoices.find(i => String(i.id) === String(id));
  if (!inv) return;
  if (!(inv.balance > 0)) { toast('Nothing left to pay on this invoice', 'error'); return; }
  showConfirm(`Mark ${inv.num} as fully paid? This records ${fmtRupee(inv.balance)} received today${inv.canonicalStatus==='DRAFT'?' and marks the draft as issued':''}. To enter a different date, method or amount, open the invoice and use "Record a payment".`, function () {
    DataAPI.recordPayment(id, Utils.rupeesToPaise(inv.balance), { date: Utils.isoDate(new Date()), method: 'Bank transfer' }).then(function () {
      syncState();
      closePanel(); closeModal();
      _refreshInvoiceView();
      toast(`${inv.num} marked as paid \u2713`, 'success');
    }).catch(function (err) { toast(err.message, 'error'); });
  });
}

function recordPartialPayment(id) {
  const inv = STATE.invoices.find(i => String(i.id) === String(id));
  const amt = parseFloat(document.getElementById('partial-amt')?.value);
  if (!inv) return;
  if (isNaN(amt) || amt <= 0) { toast('Enter the amount received', 'error'); return; }
  if (amt > inv.balance + 0.001) { toast(`That is more than the balance due (${fmtRupee(inv.balance)})`, 'error'); return; }
  const meta = {
    date: document.getElementById('pay-date')?.value || Utils.isoDate(new Date()),
    method: document.getElementById('pay-method')?.value || 'Bank transfer',
    reference: (document.getElementById('pay-ref')?.value || '').trim()
  };
  const btn = document.getElementById('pay-btn'); if (btn) { btn.disabled = true; btn.textContent = 'Saving\u2026'; }
  DataAPI.recordPayment(id, Utils.rupeesToPaise(amt), meta).then(function (updated) {
    syncState();
    closeModal(); closePanel();
    _refreshInvoiceView();
    const remaining = Utils.paiseToRupees(updated.totalPaise - updated.paidPaise);
    toast(updated.status === 'PAID'
      ? `${updated.number} fully paid \u2713`
      : `${fmtRupee(amt)} recorded \u00B7 ${fmtRupee(remaining)} remaining`, 'success');
  }).catch(function (err) {
    if (btn) { btn.disabled = false; btn.textContent = 'Record payment'; }
    toast(err.message, 'error');
  });
}

function deleteInvoice(id) {
  const inv = STATE.invoices.find(i => String(i.id) === String(id));
  if (!inv) return;
  showConfirm(`Delete draft ${inv.num}? This cannot be undone.`, () => {
    DataAPI.deleteInvoice(id).then(function () {
      syncState();
      closeModal(); closePanel();
      _refreshInvoiceView();
      toast('Draft deleted', 'success');
    }).catch(function (e) { toast(e.message, 'error'); });
  });
}

function _refreshInvoiceView() {
  if (_invCurrentProject) openProjectBilling(_invCurrentProject);
  else renderInvoices();
}

// Legacy aliases
function filterInvoices() { renderInvoices(); }
function openGenerateInvoicePanel() { openCustomInvoicePanel(); }
function openInvoiceDetail(id) { openInvoiceDetailModal(id); }