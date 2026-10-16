/* ============================================================
   DASHBOARD
   Every card, row and number on this page opens what it is about.
   ============================================================ */
function renderDashboard() {
  _dashStyles();
  renderStatsBar();
  renderActivityFeed();
  renderCriticalAlerts();
  renderProjectsHealth();
  renderDeptOverview();
  renderTopPerformers();
  renderPipelineSnapshot();
  renderMsgPreview();
  renderMilestoneSummary();
  renderRecurringCard();
  if (typeof eenDashboardCard === 'function') eenDashboardCard();
}

/* Hover feedback for everything clickable on the dashboard (added once) */
function _dashStyles() {
  if (document.getElementById('dash-click-css')) return;
  const st = document.createElement('style');
  st.id = 'dash-click-css';
  st.textContent =
    '.dash-click{cursor:pointer;transition:background .15s ease,box-shadow .15s ease,transform .15s ease}' +
    '.dash-click:hover{background:var(--s2)}' +
    '.stat-card.dash-click:hover,.project-health-card.dash-click:hover{box-shadow:0 4px 14px rgba(0,0,0,.08);transform:translateY(-1px)}' +
    '.dash-click:focus-visible{outline:2px solid var(--blue);outline-offset:2px}';
  document.head.appendChild(st);
}

/* Open one task when there is exactly one, otherwise go to the list */
function _openOneOr(list, fallbackModule) {
  if (list.length === 1 && typeof openEntity === 'function') {
    openEntity('DELIVERABLE', list[0].id);
  } else {
    gotoModule(fallbackModule);
  }
}

/* ── Top stats: 8 clickable cards with the numbers that matter ───────── */
function renderStatsBar() {
  const DB = DataAPI.raw();
  const today = Utils.isoDate(new Date());
  const emps = (DB.employees || []).filter(e => e.active !== false);
  const att = {}; (DB.attendance || []).forEach(a => { if (a.date === today) att[a.employeeId] = a; });
  const onLeave = id => (DB.leaveRequests || []).some(r => r.employeeId === id && r.status === 'APPROVED' && r.fromDate <= today && r.toDate >= today);
  const live = id => { const a = att[id]; return !!(a && a.firstInAt && !a.lastOutAt); };   // logged in (duty), not logged out
  const present = emps.filter(e => att[e.id] && att[e.id].firstInAt).length;
  const leave = emps.filter(e => !(att[e.id] && att[e.id].firstInAt) && onLeave(e.id)).length;
  const absent = emps.length - present - leave;
  const working = emps.filter(e => live(e.id)).length;

  const projects = DB.projects || [];
  const activeP = projects.filter(p => p.status === 'ACTIVE').length;
  const doneP = projects.filter(p => p.status === 'COMPLETED').length;
  const planP = projects.filter(p => p.status === 'PLANNING' || p.status === 'ON_HOLD').length;

  const open = (DB.deliverables || []).filter(d => d.status !== 'DONE');
  const overdue = open.filter(d => d.dueAt && Date.parse(d.dueAt) < Date.now()).length;
  const review = open.filter(d => d.status === 'IN_REVIEW').length + (DB.deliverables || []).filter(d => d.approvalState === 'PENDING').length;
  const leaveReq = (DB.leaveRequests || []).filter(r => r.status === 'PENDING').length;
  const estReq = open.filter(d => d.agreement && (d.agreement.state === 'COUNTERED' || d.agreement.state === 'FLAGGED')).length;
  const waiting = review + leaveReq + estReq;

  /* money from clients — same rules as the Projects page:
     received = invoice payments + advances taken on projects
     to collect = what is left of every project's value + unpaid invoices that
                  are not linked to a project */
  const month = today.slice(0, 7);
  const lastDayPrev = Utils.isoDate(new Date(new Date().getFullYear(), new Date().getMonth(), 0));
  let got = 0;
  projects.forEach(p => { got += Utils.clientReceivedPaise(p, DB.invoices) - Utils.clientReceivedPaise(p, DB.invoices, lastDayPrev); });
  (DB.invoices || []).filter(i => !i.projectId).forEach(i => (i.payments || []).forEach(x => { if (String(x.date).slice(0, 7) === month) got += x.amountPaise || 0; }));
  got = Math.max(0, got);
  const liveInv = (DB.invoices || []).filter(i => i.status !== 'CANCELLED');
  const unpaid = liveInv.filter(i => !['DRAFT', 'PAID'].includes(i.status) && (i.totalPaise - (i.paidPaise || 0)) > 0);
  const lateInv = unpaid.filter(i => i.dueDate && i.dueDate < today).length;
  let due = 0, notInvoiced = 0;
  projects.forEach(p => {
    const value = p.contractValuePaise || p.budgetPaise || 0;
    const pInv = liveInv.filter(i => i.projectId === p.id);
    const received = Utils.clientReceivedPaise(p, DB.invoices);
    const billed = pInv.filter(i => i.status !== 'DRAFT').reduce((t, i) => t + (i.totalPaise || 0), 0);
    due += Math.max(0, value - received);
    notInvoiced += Math.max(0, value - Math.max(billed, p.advancePaidPaise || 0));
  });
  unpaid.filter(i => !i.projectId).forEach(i => { due += i.totalPaise - (i.paidPaise || 0); });
  const R = p => Utils.fmtRupee(p).replace('.00', '');

  const chip = (t, c) => `<span style="display:inline-flex;align-items:center;gap:4px;font-size:11.5px;color:var(--t2)"><span style="width:7px;height:7px;border-radius:50%;background:${c}"></span>${t}</span>`;
  const card = (o) => `<div class="dstat dash-click" tabindex="0" onclick="${o.go}" title="${escAttr(o.hint || '')}">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
        <div class="dstat-label">${o.label}</div>
        <div class="dstat-ico" style="background:${o.soft};color:${o.color}">${o.icon}</div>
      </div>
      <div class="dstat-value" style="color:${o.vcolor || 'var(--t1)'}">${o.value}</div>
      <div class="dstat-sub">${o.sub}</div>
    </div>`;
  const el = document.getElementById('stats-bar');
  el.className = 'dstats';
  el.innerHTML = [
    card({ label: 'Team today', icon: '\uD83D\uDC65', color: '#2563EB', soft: '#EFF6FF', value: present + '<span class="dstat-of"> / ' + emps.length + ' present</span>',
      sub: chip(present + ' present', 'var(--green)') + ' ' + chip(absent + ' absent', 'var(--red)') + ' ' + chip(leave + ' on leave', '#7C3AED'),
      go: "HR_TAB='today';gotoModule('hrm')", hint: 'Open People' }),
    card({ label: 'Active projects', icon: '\uD83D\uDCC1', color: '#2563EB', soft: '#EFF6FF', value: activeP,
      sub: chip(doneP + ' completed', 'var(--green)') + ' ' + chip(planP + ' planned / on hold', 'var(--amber)'), go: "gotoModule('projects')", hint: 'Open Projects' }),
    card({ label: 'Completed projects', icon: '\uD83C\uDFC1', color: '#059669', soft: '#ECFDF5', value: doneP,
      sub: projects.length ? Math.round(doneP / projects.length * 100) + '% of all ' + projects.length + ' projects' : 'no projects yet', go: "gotoModule('projects')", hint: 'Open Projects' }),
    card({ label: 'Open tasks', icon: '\uD83D\uDCCB', color: '#D97706', soft: '#FFFBEB', value: open.length,
      sub: overdue ? chip(overdue + ' past deadline', 'var(--red)') : 'none past deadline', go: '_dashOpenOverdueWork()', hint: 'Open the work' }),
    card({ label: 'Waiting for you', icon: '\u23F3', color: waiting ? '#DC2626' : '#6B7280', soft: waiting ? '#FEF2F2' : 'var(--s2)', value: waiting, vcolor: waiting ? 'var(--red)' : 'var(--t2)',
      sub: [review ? review + ' reviews' : '', leaveReq ? leaveReq + ' leave' : '', estReq ? estReq + ' time requests' : ''].filter(Boolean).join(' \u00b7 ') || 'all caught up',
      go: leaveReq && !review && !estReq ? "openEntity('LEAVE')" : estReq && !review ? "gotoModule('payouts');poSetTab('agreements')" : '_dashOpenPending()', hint: 'Approvals waiting' }),
    card({ label: 'Received this month', icon: '\u20B9', color: '#059669', soft: '#ECFDF5', value: R(got), vcolor: 'var(--green)',
      sub: 'advances + invoice payments in ' + new Date().toLocaleDateString('en-IN', { month: 'long' }), go: "gotoModule('invoices')", hint: 'Open Books' }),
    card({ label: 'To collect', icon: '\uD83E\uDDFE', color: '#7C3AED', soft: '#F5F3FF', value: R(due), vcolor: due ? 'var(--amber)' : 'var(--t2)',
      sub: (unpaid.length ? unpaid.length + ' unpaid invoice' + (unpaid.length === 1 ? '' : 's') : 'no unpaid invoices') +
        (notInvoiced ? ' \u00b7 ' + R(notInvoiced) + ' not invoiced yet' : '') +
        (lateInv ? ' \u00b7 <span style="color:var(--red)">' + lateInv + ' overdue</span>' : ''), go: "gotoModule('projects')", hint: 'Project value still to be paid by clients' })
  ].join('');
}

function _dashOpenPending() {
  const inReview = STATE.tasks.filter(t => t.canonicalStatus === 'IN_REVIEW');
  _openOneOr(inReview, 'projects');
}

/* ── Live feed ────────────────────────────────────────────── */
function renderActivityFeed() {
  const el = document.getElementById('activity-feed');
  if (!STATE.activityFeed.length) {
    el.innerHTML = '<div class="empty-state" style="padding:18px"><div class="empty-sub">Nothing has happened yet. New tasks, approvals and payments will show up here.</div></div>';
    return;
  }
  const cnt = document.getElementById('activity-count'); if (cnt) cnt.textContent = STATE.activityFeed.length + ' events';
  el.innerHTML = STATE.activityFeed.map((a, i) => `
    <div class="activity-item dash-click" tabindex="0" onclick="openActivity(${i})" title="Open">
      <div class="activity-icon" style="background:${a.color}">${a.icon}</div>
      <div style="flex:1">
        <div class="activity-text">${a.text}</div>
        <div class="activity-time">${a.time}</div>
      </div>
    </div>
  `).join('');
}

/* ── Critical alerts (whole row clickable) ────────────────── */
function renderCriticalAlerts() {
  const overdueInvoices = STATE.invoices.filter(i => i.status === 'Overdue');
  const pendingReview = STATE.tasks.filter(t => t.canonicalStatus === 'IN_REVIEW');
  const overdueWork = STATE.tasks.filter(t =>
    t.canonicalStatus !== 'DONE' && t.deadline && t.deadline < Utils.isoDate(new Date()));
  const activeIds = new Set((DataAPI.raw().employees || []).filter(e => e.active !== false).map(e => e.id));
  const noActivity = STATE.employees.filter(e => activeIds.has(e.id) && e.status === 'Absent');

  let html = '';
  if (overdueInvoices.length) {
    const open = overdueInvoices.length === 1 ? `openEntity('INVOICE', ${JSON.stringify(overdueInvoices[0].id)})` : `gotoModule('invoices')`;
    html += `<div class="alert-item dash-click" tabindex="0" style="background:var(--red-light)" onclick="${escAttr(open)}">
      <div class="alert-icon" style="background:var(--red-light)">⚠️</div>
      <div class="alert-body">
        <div class="alert-title" style="color:var(--red)">${overdueInvoices.length} Overdue Invoice${overdueInvoices.length>1?'s':''}</div>
        <div class="alert-sub">${overdueInvoices.length === 1 ? esc(overdueInvoices[0].num + ' \u00b7 ' + overdueInvoices[0].client) : 'Payment collection pending'}</div>
      </div>
      <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();${escAttr(open)}">View</button>
    </div>`;
  }
  if (pendingReview.length) {
    html += `<div class="alert-item dash-click" tabindex="0" style="background:var(--amber-light)" onclick="_dashOpenPending()">
      <div class="alert-icon" style="background:var(--amber-light)">\u23F3</div>
      <div class="alert-body">
        <div class="alert-title" style="color:var(--amber)">${pendingReview.length} Deliverable${pendingReview.length===1?'':'s'} Awaiting Your Review</div>
        <div class="alert-sub">${pendingReview.length === 1 ? esc(pendingReview[0].title || 'Open it to approve or return') : 'Team is blocked until you approve or return these'}</div>
      </div>
      <button class="btn btn-sm" style="background:var(--amber);color:white" onclick="event.stopPropagation();_dashOpenPending()">Review</button>
    </div>`;
  }
  if (overdueWork.length) {
    html += `<div class="alert-item dash-click" tabindex="0" style="background:var(--red-light)" onclick="_dashOpenOverdueWork()">
      <div class="alert-icon" style="background:var(--red-light)">\uD83D\uDCC5</div>
      <div class="alert-body">
        <div class="alert-title" style="color:var(--red)">${overdueWork.length} Deliverable${overdueWork.length===1?'':'s'} Past Deadline</div>
        <div class="alert-sub">${overdueWork.length === 1 ? esc(overdueWork[0].title || 'Client commitment at risk') : 'Client commitments at risk'}</div>
      </div>
      <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();_dashOpenOverdueWork()">View</button>
    </div>`;
  }
  const estReq = (DataAPI.raw().deliverables || []).filter(d => d.status !== 'DONE' && d.agreement && (d.agreement.state === 'COUNTERED' || d.agreement.state === 'FLAGGED'));
  if (estReq.length) {
    const open = estReq.length === 1 ? `openDeliverableDetail(${estReq[0].projectId},${estReq[0].id})` : `gotoModule('payouts');poSetTab('agreements')`;
    html += `<div class="alert-item dash-click" tabindex="0" style="background:var(--amber-light)" onclick="${open}">
      <div class="alert-icon" style="background:var(--amber-light)">\u23F1</div>
      <div class="alert-body">
        <div class="alert-title" style="color:var(--amber)">${estReq.length} Request${estReq.length === 1 ? '' : 's'} for more time</div>
        <div class="alert-sub">${estReq.length === 1 ? esc(estReq[0].title) : 'Employees asked to change the agreed time'} \u2014 accept or reject</div>
      </div>
      <button class="btn btn-sm" style="background:var(--amber);color:white" onclick="event.stopPropagation();${open}">Decide</button>
    </div>`;
  }
  if (noActivity.length) {
    html += `<div class="alert-item dash-click" tabindex="0" onclick="gotoModule('hrm')">
      <div class="alert-icon" style="background:var(--s3)">👤</div>
      <div class="alert-body">
        <div class="alert-title">${noActivity.length} Employee${noActivity.length>1?'s':''} Absent Today</div>
        <div class="alert-sub">${esc(noActivity.slice(0, 3).map(e => e.name.split(' ')[0]).join(', '))}${noActivity.length > 3 ? ' +' + (noActivity.length - 3) : ''}</div>
      </div>
      <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();gotoModule('hrm')">View</button>
    </div>`;
  }
  const ac = document.getElementById('alerts-count');
  const nAlerts = (html.match(/class="alert-item/g) || []).length;
  if (ac) { ac.style.display = nAlerts ? 'inline-flex' : 'none'; ac.textContent = nAlerts; ac.style.background = '#FEF2F2'; ac.style.color = 'var(--red)'; }
  renderTeamNow();
  document.getElementById('critical-alerts').innerHTML = html || `
    <div class="empty-state">
      <div style="font-size:32px">✅</div>
      <div class="empty-title" style="color:var(--green)">All systems good</div>
      <div class="empty-sub">No critical alerts right now</div>
    </div>`;
}

function _dashOpenOverdueWork() {
  const overdueWork = STATE.tasks.filter(t =>
    t.canonicalStatus !== 'DONE' && t.deadline && t.deadline < Utils.isoDate(new Date()));
  _openOneOr(overdueWork, 'projects');
}

function _injectMargins() {
  if (typeof Profit === 'undefined') return;
  Profit.getPortfolio().then(function (pf) {
    pf.projects.forEach(function (p) {
      var el = document.getElementById('ph-margin-' + p.projectId);
      if (!el) return;
      var pct = p.projectedMarginPct;
      var col = pct == null ? 'var(--t3)'
        : pct < 0 ? 'var(--red)'
        : pct < p.targetMarginPct * 0.5 ? 'var(--red)'
        : pct < p.targetMarginPct ? 'var(--amber)' : 'var(--green)';
      el.innerHTML = '<span style="font-size:10px;color:var(--t3)">margin</span> ' +
        '<span style="font-weight:700;color:' + col + '">' +
        (pct == null ? '\u2014' : pct + '%') + '</span>';
      el.style.cursor = 'pointer';
      el.title = 'Open profitability';
      el.onclick = function (ev) { ev.stopPropagation(); gotoModule('profit'); pfOpenProject(p.projectId); };
    });
  }).catch(function () {});
}

/* ── Project cards ────────────────────────────────────────── */
function renderProjectsHealth() {
  const cards = STATE.projects.map(p => {
    const teamHTML = p.team.slice(0,3).map(id => {
      const e = STATE.employees.find(emp=>emp.id===id);
      if (!e) return '';
      return `<div class="avatar avatar-sm" style="background:${e.color}" title="${escAttr(e.name)}" onclick="event.stopPropagation();gotoModule('employees');setTimeout(()=>openEmpDetail(${e.id}),80)">${e.avatar}</div>`;
    }).join('') + (p.team.length>3 ? `<div class="avatar avatar-sm" style="background:var(--s4);color:var(--t2);font-size:9px">+${p.team.length-3}</div>` : '');
    const uc = urgencyColor(p.deadline);
    const headEmp = p.headId ? STATE.employees.find(e=>e.id===p.headId) : null;
    return `<div class="project-health-card dash-click" tabindex="0" onclick="openProjectDetail(${p.id})" title="Open ${escAttr(p.name)}">
      <div class="project-name">${esc(p.name)}</div>
      <div class="project-client">${esc(p.client)}</div>
      <div class="ring-wrap">${ringEl(p.progress, 72)}</div>
      ${headEmp ? `<div style="display:flex;align-items:center;gap:5px;margin-bottom:2px">
        <div class="avatar" style="background:${headEmp.color};width:16px;height:16px;font-size:7px">${headEmp.avatar}</div>
        <span style="font-size:10.5px;color:var(--t3)"><strong style="color:var(--t1)">${esc(headEmp.name.split(' ')[0])}</strong></span>
      </div>` : `<div style="font-size:11.5px;color:var(--t3)">${esc(p.dept)}</div>`}
      <div class="deadline-badge" style="background:${uc}20;color:${uc}">${urgencyLabel(p.deadline)}</div>
      <div id="ph-margin-${p.id}" style="font-size:11.5px;margin:6px 0 2px;font-family:var(--mono)">
        <span style="color:var(--t4)">margin \u2026</span></div>
      <div class="avatar-stack">${teamHTML}</div>
      <button class="btn btn-secondary btn-sm" style="width:100%;margin-top:8px;justify-content:center" onclick="event.stopPropagation();openProjectDetail(${p.id})">View →</button>
    </div>`;
  }).join('');
  document.getElementById('projects-health').innerHTML = cards + `
    <div class="project-health-card add-card dash-click" tabindex="0" onclick="openAddProjectModal()">
      <div style="font-size:24px">＋</div>
      <div style="font-size:13px;font-weight:550">Add Project</div>
    </div>`;
  _injectMargins();
}

/* ── Departments ──────────────────────────────────────────── */
function renderDeptOverview() {
  const el = document.getElementById('dept-overview');
  if (!STATE.departments.length) {
    el.innerHTML = '<div class="empty-state dash-click" style="padding:14px" onclick="gotoModule(\'departments\')"><div class="empty-sub">No departments yet \u2014 click to add one.</div></div>';
    return;
  }
  el.innerHTML = STATE.departments.map(d => {
    const empCount = STATE.employees.filter(e=>e.dept===d.name).length;
    const dot = d.score>=90?'green':d.score>=75?'amber':'red';
    return `<div class="dept-row dash-click" tabindex="0" onclick="gotoModule('departments')" title="Open departments">
      <div style="width:10px;height:10px;border-radius:50%;background:${d.color};flex-shrink:0"></div>
      <div class="dept-name">${esc(d.name)}</div>
      <div class="dept-meta">${empCount} emp · ${d.activeTasks} tasks</div>
      <span class="status-dot dot-${dot}"></span>
      <span class="link-btn" onclick="event.stopPropagation();gotoModule('departments')">Manage</span>
    </div>`;
  }).join('');
}

/* ── Top performers ───────────────────────────────────────── */
function renderTopPerformers() {
  const activeIds = new Set((DataAPI.raw().employees || []).filter(e => e.active !== false).map(e => e.id));
  const sorted = STATE.employees.filter(e => activeIds.has(e.id)).sort((a,b)=>b.score-a.score).slice(0,5);
  const el = document.getElementById('top-performers');
  if (!sorted.length) {
    el.innerHTML = '<div class="empty-state" style="padding:14px"><div class="empty-sub">Scores appear once employees have tasks.</div></div>';
    return;
  }
  el.innerHTML = sorted.map((e,i) => {
    const barColor = e.score>=90?'var(--green)':e.score>=80?'var(--blue)':'var(--amber)';
    return `<div class="performer-row dash-click" tabindex="0" onclick="gotoModule('employees');setTimeout(()=>openEmpDetail(${e.id}),80)" title="Open ${escAttr(e.name)}">
      <div class="performer-rank">${i+1}</div>
      <div class="avatar avatar-sm" style="background:${e.color}">${e.avatar}</div>
      <div class="performer-name">${esc(e.name.split(' ')[0])}</div>
      <div class="score-bar-wrap"><div class="score-bar-fill" style="width:${e.score}%;background:${barColor}"></div></div>
      <div class="score-val">${e.score}</div>
    </div>`;
  }).join('');
}

function renderPipelineSnapshot() {
  const el = document.getElementById('unbilled-snapshot');
  const valEl = document.getElementById('unbilled-value');
  if (!el) return;

  const DB = DataAPI.raw();
  const rows = [];
  DB.milestones.forEach(function (m) {
    if (m.status !== 'DONE' || !m.billable) return;
    const billed = DB.invoices.some(function (i) {
      return i.milestoneId === m.id && i.status !== 'CANCELLED';
    });
    if (billed) return;
    const p = DB.projects.find(function (x) { return x.id === m.projectId; });
    if (!p) return;
    const billableCount = DB.milestones.filter(function (x) {
      return x.projectId === p.id && x.billable;
    }).length || 1;
    rows.push({
      milestoneId: m.id,
      projectId: p.id,
      milestone: m.title,
      project: p.name,
      client: p.clientName,
      valuePaise: Math.round((p.contractValuePaise || p.budgetPaise || 0) / billableCount)
    });
  });

  rows.sort(function (a, b) { return b.valuePaise - a.valuePaise; });
  const totalPaise = rows.reduce(function (s, r) { return s + r.valuePaise; }, 0);

  if (!rows.length) {
    el.innerHTML = '<div class="dash-click" onclick="gotoModule(\'invoices\')" style="padding:14px 0;text-align:center;color:var(--t3);font-size:12.5px;border-radius:var(--r8)">' +
      '\u2705 Everything delivered has been invoiced.</div>';
    if (valEl) { valEl.textContent = '\u20B90'; valEl.style.color = 'var(--green)'; }
    return;
  }

  el.innerHTML = rows.slice(0, 5).map(function (r) {
    return '<div class="dash-click" tabindex="0" title="Open this milestone to invoice it" onclick="jumpToMilestone(' + r.projectId + ',' + r.milestoneId + ')" ' +
        'style="display:flex;align-items:center;gap:9px;padding:8px 6px;border-bottom:1px solid var(--b1);border-radius:var(--r6)">' +
      '<span class="status-dot" style="background:var(--amber)"></span>' +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-size:12.5px;font-weight:600;color:var(--t1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
          esc(r.milestone) + '</div>' +
        '<div style="font-size:11px;color:var(--t3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
          esc(r.client) + '</div>' +
      '</div>' +
      '<span style="font-size:12px;font-weight:700;font-family:var(--mono);color:var(--amber);flex-shrink:0">' +
        Utils.fmtRupee(r.valuePaise).replace('.00', '') + '</span>' +
    '</div>';
  }).join('') +
  (rows.length > 5 ? '<div class="dash-click" onclick="gotoModule(\'invoices\')" style="font-size:11px;color:var(--t3);padding:8px 6px 0">+' + (rows.length - 5) + ' more \u2192</div>' : '');

  if (valEl) { valEl.textContent = Utils.fmtRupee(totalPaise).replace('.00', ''); valEl.style.color = ''; }
}

/* ── Messages preview ─────────────────────────────────────── */
function renderMsgPreview() {
  const el = document.getElementById('msg-preview');
  if (!STATE.messages.length) {
    el.innerHTML = '<div class="empty-state dash-click" style="padding:14px" onclick="gotoModule(\'messages\')"><div class="empty-sub">No conversations yet \u2014 click to message someone.</div></div>';
    return;
  }
  el.innerHTML = STATE.messages.slice(0,3).map(m => `
    <div class="msg-preview-item dash-click" tabindex="0" onclick="openMsgFromDashboard('${escAttr(String(m.id))}')">
      <div class="avatar" style="background:${m.color}">${esc(m.avatar || '')}</div>
      <div class="msg-preview-body">
        <div class="msg-preview-name">${esc(m.name)}</div>
        <div class="msg-preview-text">${esc(m.preview)}</div>
      </div>
      <div class="msg-preview-meta">
        <div class="msg-preview-time">${m.time}</div>
        ${m.unread>0 ? `<div class="unread-dot"></div>` : ''}
      </div>
    </div>
  `).join('');
}


/* ============================================================
   DASHBOARD — MILESTONE SUMMARY WIDGET
   ============================================================ */
function renderMilestoneSummary() {
  const body = document.getElementById('milestone-summary-body');
  const sub  = document.getElementById('ms-summary-sub');
  if (!body) return;

  let totalMs = 0, doneMs = 0, inProgressMs = 0, overdueMs = 0;
  const today = new Date(); today.setHours(0,0,0,0);

  STATE.projects.forEach(p => {
    if (!Array.isArray(p.milestones)) return;
    p.milestones.forEach(m => {
      totalMs++;
      const prog = getMilestoneProgress(p.id, m.id);
      const done = prog.total > 0 && prog.done === prog.total;
      const msDate = m.date ? new Date(m.date) : null;
      if (msDate) msDate.setHours(0,0,0,0);
      const isOverdue = msDate && msDate < today && !done;
      if (done) doneMs++;
      else if (isOverdue) overdueMs++;
      else if (m.status === 'In Progress') inProgressMs++;
    });
  });

  if (sub) sub.textContent = `${totalMs} milestones · ${doneMs} done · ${overdueMs} overdue`;

  const projectRows = STATE.projects.map(p => {
    if (!Array.isArray(p.milestones) || p.milestones.length === 0) return '';
    const ms = p.milestones;
    const doneCnt = ms.filter(m => isMilestoneComplete(p.id, m.id)).length;
    const pct = Math.round(doneCnt / ms.length * 100);
    const pColor = p.status==='Completed'?'var(--green)':p.status==='Active'?'var(--blue)':'var(--amber)';

    const nextMs = ms.find(m => !isMilestoneComplete(p.id, m.id));

    const pills = ms.map(m => {
      const prog = getMilestoneProgress(p.id, m.id);
      const done = prog.total > 0 && prog.done === prog.total;
      const msDate = m.date ? new Date(m.date) : null;
      if (msDate) msDate.setHours(0,0,0,0);
      const overdue = msDate && msDate < today && !done;
      const bg = done ? 'var(--green-light)' : overdue ? 'var(--red-light)' : m.status==='In Progress' ? 'var(--blue-light)' : 'var(--s2)';
      const color = done ? 'var(--green)' : overdue ? 'var(--red)' : m.status==='In Progress' ? 'var(--blue)' : 'var(--t3)';
      const border = done ? 'rgba(5,150,105,.15)' : overdue ? 'rgba(220,38,38,.15)' : m.status==='In Progress' ? 'rgba(37,99,235,.15)' : 'var(--b1)';
      const icon = done ? '✅' : overdue ? '⚠' : m.status==='In Progress' ? '🔄' : '○';
      const shortTitle = m.title.length > 20 ? m.title.slice(0,19)+'…' : m.title;
      return `<div onclick="event.stopPropagation();jumpToMilestone(${p.id},${m.id})" title="${escAttr(m.title)} — ${done?'Done':overdue?'Overdue':m.status}"
        style="display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:99px;font-size:10.5px;font-weight:600;background:${bg};color:${color};cursor:pointer;border:1px solid ${border};transition:.15s;white-space:nowrap" onmouseover="this.style.opacity='.72'" onmouseout="this.style.opacity='1'">
        ${icon} ${esc(shortTitle)}
      </div>`;
    }).join('');

    return `
    <div class="dash-click" onclick="jumpToMilestone(${p.id},null)" style="padding:12px 8px;border-bottom:1px solid var(--b1);border-radius:var(--r8)" title="Open ${escAttr(p.name)} milestones">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:8px">
        <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0">
          <div style="width:8px;height:8px;border-radius:50%;background:${pColor};flex-shrink:0"></div>
          <span style="font-size:13.5px;font-weight:650;color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px">${esc(p.name)}</span>
          <span style="font-size:11px;color:var(--t3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p.client)}</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-shrink:0">
          <span style="font-size:11.5px;color:var(--t3)">${doneCnt}/${ms.length}</span>
          <div style="width:72px;height:5px;background:var(--s3);border-radius:99px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${pct===100?'var(--green)':'var(--blue)'};border-radius:99px;transition:.4s"></div>
          </div>
          <span style="font-size:12px;font-weight:700;font-family:var(--mono);color:${pct===100?'var(--green)':'var(--blue)'};min-width:32px">${pct}%</span>
          <button onclick="event.stopPropagation();jumpToMilestone(${p.id},null)" class="btn btn-secondary btn-xs">Open →</button>
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:5px;padding-left:18px">${pills}</div>
      ${nextMs ? `<div style="font-size:11.5px;color:var(--t3);margin-top:6px;padding-left:18px;display:flex;align-items:center;gap:4px">
        <svg width="10" height="10" fill="none" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
        Next: <strong style="color:var(--t2)">${esc(nextMs.title)}</strong>${nextMs.date ? ` · Due <strong style="color:${new Date(nextMs.date)<today?'var(--red)':'var(--t2)'}">${nextMs.date}</strong>` : ''}
      </div>` : ''}
    </div>`;
  }).filter(Boolean).join('');

  const summaryStats = `
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">
    ${[['Total','🎯',totalMs,'var(--t2)','var(--s2)'],['Completed','✅',doneMs,'var(--green)','var(--green-light)'],['In Progress','🔄',inProgressMs,'var(--blue)','var(--blue-light)'],['Overdue','⚠️',overdueMs,'var(--red)','var(--red-light)']].map(([label,icon,val,color,bg]) =>
    `<div class="dash-click" style="text-align:center;padding:10px 8px;border-radius:var(--r8);background:${bg}" onclick="gotoModule('projects')" title="Open projects">
      <div style="font-size:18px;margin-bottom:2px">${icon}</div>
      <div style="font-size:20px;font-weight:700;color:${color};font-family:var(--mono);line-height:1">${val}</div>
      <div style="font-size:10.5px;color:var(--t3);margin-top:3px;text-transform:uppercase;letter-spacing:0.3px">${label}</div>
    </div>`).join('')}
  </div>`;

  body.innerHTML = summaryStats + (projectRows || `<div class="empty-state dash-click" onclick="gotoModule('projects')"><div class="empty-icon">🎯</div><div class="empty-title">No milestones yet</div><div class="empty-sub">Open a project to add milestones</div></div>`);
}

/* Jump to a project's milestones tab, optionally expand a specific milestone */
function jumpToMilestone(pid, msId) {
  STATE.currentProject = pid;
  const p = STATE.projects.find(x => x.id === pid);
  if (!p) return;
  if (msId !== null) {
    if (!Array.isArray(p._expandedMs)) p._expandedMs = [];
    if (!p._expandedMs.includes(msId)) p._expandedMs.push(msId);
  }
  gotoModule('project-detail');
  document.getElementById('pd-title').textContent = p.name;
  document.getElementById('pd-client').textContent = p.client;
  setTimeout(() => {
    const tabs = document.querySelectorAll('#view-project-detail .tab-btn');
    if (tabs && tabs[1]) {
      tabs.forEach(t => t.classList.remove('active'));
      tabs[1].classList.add('active');
      document.querySelectorAll('#view-project-detail .tab-pane').forEach(pn => pn.classList.remove('active'));
      const msPane = document.getElementById('pd-tasks');
      if (msPane) msPane.classList.add('active');
    }
    renderMilestonesTab(pid);
    if (msId !== null) {
      setTimeout(() => {
        const card = document.getElementById('ms-card-' + msId);
        if (card && card.scrollIntoView) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, 50);
}

/* Enter / Space on a focused dashboard item works like a click */
document.addEventListener('keydown', function (ev) {
  if ((ev.key === 'Enter' || ev.key === ' ') && ev.target && ev.target.classList && ev.target.classList.contains('dash-click')) {
    ev.preventDefault();
    ev.target.click();
  }
});


/* ── Recurring billing: retainers / monthly fees at a glance ─────────── */
function renderRecurringCard() {
  const plans = (DataAPI.raw().recurringInvoices || []);
  let host = document.getElementById('recurring-card');
  if (!host) {
    const bar = document.getElementById('stats-bar');
    if (!bar) return;
    host = document.createElement('div');
    host.id = 'recurring-card';
    host.style.margin = '0 0 20px';
    bar.parentNode.insertBefore(host, bar.nextSibling);
  }
  if (!plans.length) {
    host.innerHTML = `<div class="card card-pad dash-click" onclick="gotoModule('invoices');setTimeout(openCustomInvoicePanel,200)" style="display:flex;align-items:center;gap:12px">
      <div style="font-size:22px">\uD83D\uDD01</div>
      <div style="flex:1"><div style="font-weight:650;font-size:14px">Recurring billing</div>
        <div style="font-size:12.5px;color:var(--t3)">No recurring invoices yet. Set one up for retainers, monthly fees or AMC \u2014 invoices are made automatically.</div></div>
      <span class="link-btn">Set up \u2192</span></div>`;
    return;
  }
  const perMonth = { WEEKLY: 52 / 12, MONTHLY: 1, QUARTERLY: 1 / 3, YEARLY: 1 / 12 };
  const amount = p => (p.lines || []).reduce((s, l) => s + Math.round((Number(l.qty) || 0) * (Number(l.ratePaise) || 0)), 0);
  const active = plans.filter(p => p.status === 'ACTIVE');
  const mrr = active.reduce((s, p) => s + amount(p) * (perMonth[p.frequency] || 0), 0);
  const upcoming = active.slice().sort((a, b) => String(a.nextDate).localeCompare(String(b.nextDate))).slice(0, 4);
  const made = (DataAPI.raw().invoices || []).filter(i => i.recurringId);
  const due = made.filter(i => !['PAID', 'CANCELLED', 'DRAFT'].includes(i.status)).reduce((s, i) => s + (i.totalPaise - (i.paidPaise || 0)), 0);
  const r = p => Utils.fmtRupee(Math.round(p)).replace('.00', '');
  const lab = { WEEKLY: 'weekly', MONTHLY: 'monthly', QUARTERLY: 'quarterly', YEARLY: 'yearly' };
  host.innerHTML = `<div class="card card-pad">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <div style="font-weight:650;font-size:14px">\uD83D\uDD01 Recurring billing</div>
      <span class="link-btn" onclick="gotoModule('invoices')">Open Books \u2192</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:12px">
      ${[['Monthly recurring', r(mrr), 'var(--green)'], ['Active plans', active.length + ' of ' + plans.length, 'var(--t1)'], ['Invoices made', made.length, 'var(--blue)'], ['Unpaid from these', r(due), due ? 'var(--amber)' : 'var(--t2)']].map(([l, v, c]) =>
        `<div style="background:var(--s2);border-radius:var(--r8);padding:10px 12px"><div style="font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:.3px">${l}</div><div style="font-size:17px;font-weight:700;font-family:var(--mono);color:${c}">${v}</div></div>`).join('')}
    </div>
    ${upcoming.length ? `<div style="font-size:11px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">Next invoices</div>
      ${upcoming.map(p => `<div class="dash-click" onclick="gotoModule('invoices')" style="display:flex;align-items:center;gap:10px;padding:7px 6px;border-radius:var(--r6);font-size:13px">
        <span style="font-family:var(--mono);color:var(--t3);min-width:92px">${esc(fmtDate(p.nextDate))}</span>
        <span style="flex:1;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.name || p.clientName)}</span>
        <span style="color:var(--t3)">${lab[p.frequency] || ''}</span>
        <span style="font-family:var(--mono);font-weight:600">${r(amount(p))}</span></div>`).join('')}` : ''}
    ${(function () {
      const soon = typeof pbUpcomingRenewals === 'function' ? pbUpcomingRenewals() : [];
      if (!soon.length) return '';
      return `<div style="font-size:11px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.4px;margin:12px 0 6px">Contracts ending in the next 30 days</div>` +
        soon.map(i => `<div class="dash-click" onclick="openProjectDetail(${i.p.id})" style="display:flex;align-items:center;gap:10px;padding:7px 6px;border-radius:var(--r6);font-size:13px">
          <span style="font-family:var(--mono);color:var(--t3);min-width:92px">${esc(fmtDate(i.term.to))}</span>
          <span style="flex:1;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(i.p.name)}</span>
          <span class="badge ${i.r.autoRenew ? 'badge-green' : 'badge-amber'}">${i.r.autoRenew ? 'renews automatically' : 'ends \u2014 renew?'}</span>
          <span style="font-family:var(--mono);font-weight:600">${r(i.r.amountPaise)}</span></div>`).join('');
    })()}
  </div>`;
}


/* ── Right column under the alerts: who is doing what right now ───────── */
function renderTeamNow() {
  const el = document.getElementById('team-now');
  if (!el) return;
  const DB = DataAPI.raw();
  const today = Utils.isoDate(new Date());
  const att = {}; (DB.attendance || []).forEach(a => { if (a.date === today) att[a.employeeId] = a; });
  const timers = {}; (DB.timeEntries || []).forEach(t => { if (!t.endedAt) timers[t.employeeId] = t; });
  const rows = (DB.employees || []).filter(e => e.active !== false).map(e => {
    const a = att[e.id];
    /* present = pressed "Log in" and not logged out yet (the app may be closed) */
    const onDuty = !!(a && a.firstInAt && !a.lastOutAt);
    const leave = (DB.leaveRequests || []).some(r => r.employeeId === e.id && r.status === 'APPROVED' && r.fromDate <= today && r.toDate >= today);
    const t = timers[e.id];
    const task = t && onDuty ? (DB.deliverables || []).find(d => d.id === t.deliverableId) : null;
    const since = a && a.firstInAt ? new Date(a.firstInAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '';
    const st = onDuty && task ? ['Working', 'var(--green)', task.title]
      : onDuty ? ['Present', 'var(--blue)', 'logged in at ' + since]
      : a && a.firstInAt ? ['Logged out', 'var(--t3)', 'left at ' + new Date(a.lastOutAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })]
      : leave ? ['On leave', '#7C3AED', 'approved leave'] : ['Not in', 'var(--red)', 'not logged in yet'];
    const s = STATE.employees.find(x => x.id === e.id) || {};
    return { e, s, st, order: ['Working', 'Present', 'Logged out', 'On leave', 'Not in'].indexOf(st[0]) };
  }).sort((x, y) => x.order - y.order);
  if (!rows.length) { el.innerHTML = ''; return; }
  el.innerHTML = `<div style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.4px;margin:14px 0 6px">Team right now</div>` +
    rows.map(r => `<div class="dash-click" onclick="gotoModule('employees');setTimeout(()=>openEmpDetail(${r.e.id}),80)" style="display:flex;align-items:center;gap:9px;padding:7px 6px;border-radius:8px">
      <div class="avatar avatar-sm" style="background:${r.s.color || '#2563EB'}">${esc(r.s.avatar || r.e.name[0])}</div>
      <div style="flex:1;min-width:0"><div style="font-size:12.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.e.name)}</div>
        <div style="font-size:11px;color:var(--t3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.st[2])}</div></div>
      <span style="font-size:11px;font-weight:600;color:${r.st[1]};white-space:nowrap">\u25CF ${r.st[0]}</span>
    </div>`).join('');
}

/* dashboard look: stat cards, fixed-height feed and alerts */
(function () {
  if (document.getElementById('dash-v2-css')) return;
  const st = document.createElement('style'); st.id = 'dash-v2-css';
  st.textContent =
    '.dstats{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin-bottom:20px}' +
    '.dstat{background:var(--surface);border:1px solid var(--b1);border-radius:16px;padding:14px 16px;min-height:112px;display:flex;flex-direction:column;gap:6px;box-shadow:0 1px 2px rgba(0,0,0,.03)}' +
    '.dstat:hover{box-shadow:0 8px 24px rgba(0,0,0,.08);transform:translateY(-2px)}' +
    '.dstat-label{font-size:12px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.4px}' +
    '.dstat-ico{width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;flex-shrink:0}' +
    '.dstat-value{font-size:26px;font-weight:700;font-family:var(--mono);line-height:1.1}' +
    '.dstat-of{font-size:13px;color:var(--t3);font-weight:500;font-family:inherit}' +
    '.dstat-sub{font-size:12px;color:var(--t3);display:flex;flex-wrap:wrap;gap:4px 10px;line-height:1.4}' +
    '.dash-row-fixed{align-items:stretch}' +
    '.dash-fixed{display:flex;flex-direction:column;height:460px;min-height:0}' +
    '.dash-scroll{flex:1;min-height:0;overflow-y:auto;margin-right:-6px;padding-right:6px;overscroll-behavior:contain}' +
    '@media (max-width:900px){.dash-fixed{height:auto;max-height:520px}}';
  document.head.appendChild(st);
})();