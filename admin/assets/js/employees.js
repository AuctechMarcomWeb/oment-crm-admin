/* ── Employee detail: real attendance calendar ─────────────────────────── */
var _empAttMonth = {};

function empAttShift(id, delta) {
  const [y, m] = _empAttMonth[id].split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  _empAttMonth[id] = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  const el = document.getElementById('ep-att-body');
  if (el) el.innerHTML = _empAttHtml(id);
}

function _hm(secs) { secs = secs || 0; const h = Math.floor(secs / 3600), m = Math.floor(secs % 3600 / 60); return h ? h + 'h ' + m + 'm' : m + 'm'; }
function _clock(iso) { return iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '\u2014'; }

function _empAttHtml(id) {
  const DB = DataAPI.raw();
  const emp = (DB.employees || []).find(x => x.id === id) || {};
  const [y, m] = _empAttMonth[id].split('-').map(Number);
  const today = Utils.isoDate(new Date());
  const joined = emp.joinedAt ? Utils.isoDate(emp.joinedAt) : null;
  const days = new Date(y, m, 0).getDate();
  const firstDow = (new Date(y, m - 1, 1).getDay() + 6) % 7;          // Monday first
  const recs = {};
  (DB.attendance || []).forEach(a => { if (a.employeeId === id && a.date.slice(0, 7) === _empAttMonth[id]) recs[a.date] = a; });
  const leaves = (DB.leaveRequests || []).filter(r => r.employeeId === id && r.status === 'APPROVED');
  const onLeave = iso => leaves.find(r => (r.dates || []).includes(iso) || (r.fromDate <= iso && r.toDate >= iso));
  const C = { present: 0, half: 0, absent: 0, leave: 0, active: 0 };
  const STY = {
    present: 'background:var(--green);color:#fff',
    half:    'background:#A7F3D0;color:#065F46',
    absent:  'background:var(--red-light);color:var(--red);border:1px solid rgba(220,38,38,.25)',
    leave:   'background:var(--amber-light);color:var(--amber);border:1px solid rgba(217,119,6,.25)',
    holiday: 'background:var(--blue-light);color:var(--blue)',
    off:     'background:var(--s2);color:var(--t3)',
    waiting: 'background:var(--surface);color:var(--t2);border:1px dashed var(--b3)',
    none:    'background:transparent;color:var(--t4);border:1px solid var(--b1)'
  };
  let cells = '';
  for (let i = 0; i < firstDow; i++) cells += '<div></div>';
  for (let d = 1; d <= days; d++) {
    const iso = y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    const r = recs[iso];
    let k, tip;
    if (iso > today) { k = 'none'; tip = 'Upcoming'; }
    else if (joined && iso < joined) { k = 'none'; tip = 'Before joining'; }
    else if (r && r.status === 'ON_LEAVE' || !r && onLeave(iso)) { k = 'leave'; tip = 'On leave' + (onLeave(iso) ? ' (' + onLeave(iso).type + ')' : ''); C.leave++; }
    else if (r && r.status === 'HALF_DAY') { k = 'half'; C.half++; }
    else if (r && (r.status === 'PRESENT' || r.firstInAt)) { k = 'present'; C.present++; }
    else if (HRM.holidayOn && HRM.holidayOn(iso)) { k = 'holiday'; tip = 'Holiday: ' + HRM.holidayOn(iso).name; }
    else if (HRM.isWeekOff && HRM.isWeekOff(iso)) { k = 'off'; tip = 'Weekly off'; }
    else if (iso === today) { k = 'waiting'; tip = 'Not logged in yet today'; }
    else { k = 'absent'; tip = 'Absent \u2014 no log-in'; C.absent++; }
    if (r && (k === 'present' || k === 'half')) {
      C.active += r.activeSecs || 0;
      tip = (k === 'half' ? 'Half day' : 'Present') + ' \u00b7 in ' + _clock(r.firstInAt) + ' \u00b7 out ' + (r.lastOutAt ? _clock(r.lastOutAt) : (iso === today ? 'still working' : 'not recorded')) +
        ' \u00b7 worked ' + _hm(r.activeSecs) + ' of ' + _hm(r.sessionSecs) + ' online';
    }
    cells += `<div class="att-day" title="${escAttr(tip)}" style="${STY[k]};${iso === today ? 'outline:2px solid var(--blue);outline-offset:1px;' : ''}">${d}</div>`;
  }
  const label = new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const isCurrent = _empAttMonth[id] === today.slice(0, 7);
  const legend = [['present', 'Present'], ['half', 'Half day'], ['absent', 'Absent'], ['leave', 'Leave'], ['holiday', 'Holiday'], ['off', 'Weekly off']]
    .map(([k, l]) => `<span style="display:inline-flex;align-items:center;gap:5px;font-size:11.5px;color:var(--t3)"><span style="width:11px;height:11px;border-radius:3px;${STY[k]}"></span>${l}</span>`).join('');
  const todayRec = recs[today];
  return `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <button class="btn btn-secondary btn-xs" onclick="empAttShift(${id},-1)" aria-label="Previous month">\u2039</button>
      <div style="font-size:13px;font-weight:600">${label}</div>
      <button class="btn btn-secondary btn-xs" onclick="empAttShift(${id},1)" ${isCurrent ? 'disabled' : ''} aria-label="Next month">\u203a</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;margin-bottom:3px;font-size:10.5px;color:var(--t3);text-align:center">${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(x => `<div>${x}</div>`).join('')}</div>
    <div class="att-calendar">${cells}</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px">${legend}</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:14px">
      ${[['Present', C.present, 'var(--green)'], ['Half days', C.half, 'var(--green)'], ['Absent', C.absent, 'var(--red)'], ['Leave', C.leave, 'var(--amber)']].map(([l, v, c]) =>
        `<div style="text-align:center;padding:8px;background:var(--s2);border-radius:var(--r8)"><div style="font-size:17px;font-weight:700;color:${c}">${v}</div><div style="font-size:11px;color:var(--t3)">${l}</div></div>`).join('')}
    </div>
    <div style="font-size:12px;color:var(--t2);margin-top:10px">Tracked work this month: <strong>${_hm(C.active)}</strong>. Hover a day for log-in, log-out and hours.</div>
    <div style="margin-top:16px"><div style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px">Login / Logout History</div>
      <div style="border:1px solid var(--b1);border-radius:var(--r8);overflow:auto">
        <table class="data-table" style="min-width:640px"><thead><tr><th>Date</th><th>Login</th><th>Logout</th><th>Online</th><th>Active</th><th>Status</th></tr></thead><tbody>
          ${(DB.attendance || []).filter(a => a.employeeId === id).slice().sort((a,b) => String(b.date).localeCompare(String(a.date))).map(a => {
            const open = !!(a.firstInAt && !a.lastOutAt && a.date === today);
            const sessions = Array.isArray(a.sessions) && a.sessions.length ? a.sessions : [{inAt:a.firstInAt,outAt:a.lastOutAt}];
            return `<tr><td>${esc(a.date || '—')}</td><td colspan="2" style="padding:7px 10px">${sessions.map((ss,i)=>`<div style="display:flex;gap:8px;align-items:center;font-family:var(--mono);white-space:nowrap;margin-bottom:${i<sessions.length-1?4:0}px"><span style="font-family:var(--font);font-size:10px;color:var(--t3);min-width:48px">Session ${i+1}</span><span>${ss.inAt?esc(new Date(ss.inAt).toLocaleString('en-IN',{hour12:false})):'—'}</span><span style="color:var(--t3)">→</span><span>${ss.outAt?esc(new Date(ss.outAt).toLocaleString('en-IN',{hour12:false})):(open&&i===sessions.length-1?'<span style="color:var(--green);font-weight:700">Still logged in</span>':'—')}</span></div>`).join('')}</td><td style="font-family:var(--mono)">${_hm(a.sessionSecs)}</td><td style="font-family:var(--mono)">${_hm(a.activeSecs)}</td><td><span class="badge ${open ? 'badge-green' : 'badge-grey'}">${open ? 'Logged in' : esc(a.status || 'Recorded')}</span></td></tr>`;
          }).join('') || '<tr><td colspan="6" style="text-align:center;padding:18px;color:var(--t3)">No records</td></tr>'}
        </tbody></table></div></div>
    ${isCurrent && todayRec ? `<div style="margin-top:10px;padding:10px 12px;background:var(--s2);border-radius:var(--r8);font-size:12.5px;line-height:1.6">
      <strong>Today:</strong> logged in ${_clock(todayRec.firstInAt)}${todayRec.lastOutAt ? ', logged out ' + _clock(todayRec.lastOutAt) : ''} \u00b7
      worked ${_hm(todayRec.activeSecs)} \u00b7 idle ${_hm(todayRec.idleSecs)} \u00b7 online ${_hm(todayRec.sessionSecs)}
      ${todayRec.lastSeenAt && !todayRec.lastOutAt ? '<br><span style="color:var(--t3)">Last activity ' + _clock(todayRec.lastSeenAt) + '</span>' : ''}</div>` : ''}`;
}

/* ── Employee detail: real performance ────────────────────────────────── */
function _empPerfHtml(e) {
  const DB = DataAPI.raw();
  const sc = e.scoreDetail || DataAPI.employeeScore(e.id) || {};
  const mine = (DB.deliverables || []).filter(d => (d.assigneeIds || []).includes(e.id));
  const doneAt = d => d.completedAt || ((d.timeline || []).filter(t => t.type === 'approve').pop() || {}).time || null;
  const done = mine.filter(d => d.status === 'DONE').map(d => Object.assign({}, d, { completedAt: doneAt(d) }));
  const inReview = mine.filter(d => d.status === 'IN_REVIEW').length;
  const open = mine.filter(d => d.status === 'TODO' || d.status === 'IN_PROGRESS').length;
  const returned = mine.filter(d => d.approvalState === 'REJECTED' || (d.reworkCount || 0) > 0).length;
  const withDue = done.filter(d => d.dueAt);
  const onTime = withDue.filter(d => !d.completedAt || new Date(d.completedAt) <= new Date(d.dueAt)).length;
  const overdue = mine.filter(d => d.dueAt && d.status !== 'DONE' && Date.parse(d.dueAt) < Date.now()).length;
  const pct = v => Math.round((v || 0) <= 1 ? (v || 0) * 100 : v);

  /* last 6 weeks (Mon–Sun): tracked hours + tasks completed */
  const weeks = [];
  const monday = new Date(); monday.setHours(0, 0, 0, 0); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  for (let w = 5; w >= 0; w--) {
    const from = new Date(monday); from.setDate(from.getDate() - 7 * w);
    const to = new Date(from); to.setDate(to.getDate() + 7);
    const f = Utils.isoDate(from), t = Utils.isoDate(to);
    const secs = (DB.attendance || []).filter(a => a.employeeId === e.id && a.date >= f && a.date < t).reduce((s, a) => s + (a.activeSecs || 0), 0);
    const tasks = done.filter(d => d.completedAt && Utils.isoDate(d.completedAt) >= f && Utils.isoDate(d.completedAt) < t).length;
    weeks.push({ label: from.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), hrs: secs / 3600, tasks });
  }
  const maxH = Math.max(1, ...weeks.map(w => w.hrs));
  const bars = weeks.map(w => `<div class="perf-bar-wrap" title="${w.hrs.toFixed(1)} h tracked \u00b7 ${w.tasks} task(s) completed">
      <div style="font-size:10px;color:var(--t3);margin-bottom:2px">${w.hrs >= 0.05 ? w.hrs.toFixed(1) + 'h' : ''}</div>
      <div class="perf-bar" style="height:${Math.max(2, Math.round(w.hrs / maxH * 72))}px"></div>
      <div class="perf-bar-label">${w.label}${w.tasks ? '<br><span style="color:var(--green)">\u2713' + w.tasks + '</span>' : ''}</div></div>`).join('');

  const box = (l, v, c, hint) => `<div style="text-align:center;padding:10px;background:var(--s2);border-radius:var(--r8)" ${hint ? `title="${escAttr(hint)}"` : ''}><div style="font-size:18px;font-weight:700;color:${c}">${v}</div><div style="font-size:11px;color:var(--t3);margin-top:2px">${l}</div></div>`;
  return `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:10px">
      ${box('Overall score', (sc.sample ? sc.score : 0) + '/100', 'var(--green)', 'Delivery, on-time rate and estimate accuracy combined')}
      ${box('On-time rate', withDue.length ? Math.round(onTime / withDue.length * 100) + '%' : '\u2014', 'var(--blue)', onTime + ' of ' + withDue.length + ' finished tasks with a due date were on time')}
      ${box('Tasks done', done.length + '/' + mine.length, 'var(--t1)', 'Approved tasks out of all tasks ever assigned')}
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px">
      ${box('Open', open, 'var(--t2)')}${box('In review', inReview, 'var(--purple, #7C3AED)')}${box('Returned', returned, returned ? 'var(--red)' : 'var(--t2)', 'Tasks sent back for changes at least once')}${box('Overdue', overdue, overdue ? 'var(--red)' : 'var(--t2)')}
    </div>
    ${sc.sample ? `<div style="font-size:12px;color:var(--t2);margin-bottom:14px;line-height:1.7">Score parts:
      delivery <strong>${sc.delivery == null ? '\u2014' : sc.delivery}</strong> \u00b7
      on time <strong>${sc.onTime == null ? '\u2014' : sc.onTime}</strong> \u00b7
      estimate accuracy <strong>${sc.accuracy == null ? '\u2014' : sc.accuracy}</strong> \u00b7
      attendance <strong>${sc.attendance == null ? '\u2014' : sc.attendance}</strong>${sc.workDays ? ' <span style="color:var(--t3)">(' + sc.presentDays + ' of ' + sc.workDays + ' working days)</span>' : ''}
      ${sc.rejected ? ' \u00b7 <span style="color:var(--red)">\u2212' + Math.min(15, sc.rejected * 3) + ' for ' + sc.rejected + ' return(s)</span>' : ''}
      <div style="color:var(--t3)">\u2014 = no data yet, left out of the score.</div></div>` : `<div style="font-size:12px;color:var(--t3);margin-bottom:14px">No tasks or attendance yet \u2014 the score starts once there is real data.</div>`}
    <div style="font-size:12px;color:var(--t3);margin-bottom:8px">Tracked hours per week (from the employee app) \u00b7 \u2713 = tasks completed that week</div>
    <div class="perf-chart">${bars}</div>`;
}

function setEmployeeActive(id, active) {
  const e = STATE.employees.find(x => x.id === id);
  const q = active
    ? `Reactivate ${e ? e.name : 'this employee'}? They can sign in again.`
    : `Deactivate ${e ? e.name : 'this employee'}? They are signed out right away and can\u2019t sign in. Their history stays.`;
  showConfirm(q, function () {
    DataAPI.updateEmployee(id, { active: active, canLogin: active }).then(function () {
      syncState(); closePanel();
      if (typeof renderEmployees === 'function') renderEmployees();
      toast(active ? 'Employee reactivated' : 'Employee deactivated', 'success');
    }).catch(function (err) { toast(err.message, 'error'); });
  });
}

/* ============================================================
   EMPLOYEES MODULE
   ============================================================ */
function renderEmployees() {
  // Populate dept filter
  const deptFilter = document.getElementById('emp-dept-filter');
  const depts = [...new Set(STATE.employees.map(e=>e.dept))];
  deptFilter.innerHTML = `<option value="">All Departments</option>${depts.map(d=>`<option>${d}</option>`).join('')}`;
  filterEmployees();
}

function setEmpStatus(el, status) {
  STATE.empStatusFilter = status;
  document.querySelectorAll('#emp-status-pills .status-pill').forEach(p=>p.classList.remove('active'));
  el.classList.add('active');
  filterEmployees();
}

function filterEmployees() {
  const dept = document.getElementById('emp-dept-filter')?.value || '';
  const status = STATE.empStatusFilter;
  const search = document.getElementById('emp-search')?.value?.toLowerCase() || '';
  let filtered = STATE.employees.filter(e =>
    (!dept || e.dept === dept) &&
    (!status || e.status === status) &&
    (!search || e.name.toLowerCase().includes(search))
  );
  const present = filtered.filter(e=>e.status==='Present').length;
  const absent = filtered.filter(e=>e.status==='Absent').length;
  document.getElementById('emp-count-sub').textContent = `${filtered.length} employee${filtered.length!==1?'s':''} found`;
  document.getElementById('emp-stats-pills').innerHTML = `
    <div class="badge badge-grey">Total: ${filtered.length}</div>
    <div class="badge badge-green">Present: ${present}</div>
    <div class="badge badge-red">Absent: ${absent}</div>
  `;
  const grid = document.getElementById('emp-cards-grid');
  if (!filtered.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">👥</div><div class="empty-title">No employees found</div><div class="empty-sub">Try adjusting your filters</div></div>`;
    return;
  }
  grid.innerHTML = filtered.map(e => {
    const statusDot = e.status==='Present'?'green':e.status==='Absent'?'red':'amber';
    const badgeClass = e.status==='Present'?'badge-green':e.status==='Absent'?'badge-red':'badge-amber';
    const barColor = e.score>=90?'var(--green)':e.score>=80?'var(--blue)':'var(--amber)';
    return `<div class="emp-card" onclick="openEmpDetail(${e.id})">
      <div class="emp-card-top">
        <div class="avatar" style="background:${e.color}">${e.avatar}</div>
        <div class="emp-card-info">
          <div class="emp-card-name">${esc(e.name)}</div>
          <div class="emp-card-role">${esc(e.role)}</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
        <span class="badge badge-grey" style="font-size:11px">${esc(e.dept)}</span>
        <span class="badge ${badgeClass}" style="font-size:11px"><span class="status-dot dot-${statusDot}"></span>${e.status}</span>
      </div>
      <div class="emp-card-meta">
        <span>Score: <strong style="color:var(--t1)">${e.score}</strong></span>
        <span>${e.tasks} active tasks</span>
      </div>
      <div class="emp-score-bar"><div class="emp-score-fill" style="width:${e.score}%;background:${barColor}"></div></div>
      <button class="btn btn-secondary btn-sm" style="width:100%;margin-top:10px;justify-content:center">View Details →</button>
    </div>`;
  }).join('');
}

function _empPenaltyHtml(id) {
  const DB = DataAPI.raw();
  const rows = (DB.walletEntries || []).filter(w => Number(w.employeeId) === Number(id) && w.type === 'DEDUCTION' && w.meta && w.meta.penalty)
    .slice().sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const total = rows.reduce((s,w) => s + Math.abs(w.amountPaise || 0), 0);
  const R = p => Utils.fmtRupee(p || 0).replace('.00','');
  if (!rows.length) return '<div class="empty-state"><div class="empty-icon">⚖️</div><div class="empty-title">No penalties</div><div class="empty-sub">No penalty has been applied to this employee.</div></div>';
  return '<div style="background:var(--red-light);border:1px solid rgba(220,38,38,.15);padding:10px 12px;border-radius:var(--r8);margin-bottom:12px"><div style="font-size:10.5px;color:var(--red);text-transform:uppercase;font-weight:700;letter-spacing:.4px">Total deductions</div><div style="font-size:20px;font-weight:700;font-family:var(--mono);color:var(--red);margin-top:2px">−' + R(total) + '</div></div>' +
    rows.map(function(w) {
      const p = w.meta.penalty || {};
      const date = p.date || String(w.createdAt).slice(0,10);
      return '<div style="display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--b1)"><div style="width:30px;height:30px;border-radius:9px;background:var(--red-light);display:flex;align-items:center;justify-content:center">⚠️</div><div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:650">' + esc(p.ruleName || 'Penalty') + '</div><div style="font-size:11.5px;color:var(--t3);margin-top:2px">' + esc(date) + ' · ' + esc(String(p.penaltyDays == null ? '—' : p.penaltyDays)) + ' day' + (Number(p.penaltyDays) === 1 ? '' : 's') + '</div><div style="font-size:12px;color:var(--t2);margin-top:5px">' + esc(w.why || p.reason || '') + '</div></div><div style="font-family:var(--mono);font-weight:700;color:var(--red);white-space:nowrap">−' + R(Math.abs(w.amountPaise)) + '</div></div>';
    }).join('');
}

function openEmpDetail(id) {
  const e = STATE.employees.find(x=>x.id===id);
  if (!e) return;
  const statusBadge = e.status==='Present'?'badge-green':e.status==='Absent'?'badge-red':'badge-amber';
  const empTasks = STATE.tasks.filter(t=>t.assignee===id);

  const raw = (DataAPI.raw().employees || []).find(x => x.id === id) || {};
  const inactive = raw.active === false || raw.canLogin === false;
  _empAttMonth[id] = _empAttMonth[id] || Utils.isoDate(new Date()).slice(0, 7);
  const perfHtml = _empPerfHtml(e);
  setTimeout(() => _loadEmpPay(e.id), 0);
  openPanel(e.name, `
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px">
      <div class="avatar avatar-xl" style="background:${e.color}">${e.avatar}</div>
      <div>
        <div style="font-size:18px;font-weight:700">${esc(e.name)}</div>
        <div style="font-size:13px;color:var(--t3);margin-top:2px">${esc(e.role)}</div>
        <div style="margin-top:6px"><span class="badge ${statusBadge}">${e.status}</span>${inactive ? ' <span class="badge badge-red">Deactivated</span>' : ''}</div>
      </div>
    </div>
    <div class="tab-bar">
      <div class="tab-btn active" onclick="switchTab(this,'ep-overview')">Overview</div>
      <div class="tab-btn" onclick="switchTab(this,'ep-tasks')">Tasks</div>
      <div class="tab-btn" onclick="switchTab(this,'ep-perf')">Performance</div>
      <div class="tab-btn" onclick="switchTab(this,'ep-att')">Attendance</div>
      <div class="tab-btn" onclick="switchTab(this,'ep-penalties')">Penalties</div>
    </div>
    <div id="ep-overview" class="tab-pane active">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        ${[['Email',e.email],['Phone',e.phone],['Department',e.dept],['Joined',fmtDate(e.joined)],['Manager',e.manager],['Active Tasks',e.tasks+' tasks']].map(([l,v])=>`<div><div style="font-size:11px;color:var(--t3);margin-bottom:2px;text-transform:uppercase;letter-spacing:0.3px">${l}</div><div style="font-size:13px;font-weight:550;color:var(--t1)">${v}</div></div>`).join('')}
      </div>
    </div>
    <div id="ep-tasks" class="tab-pane">
      ${empTasks.length ? empTasks.map(t=>{
        const sc = t.status==='Done'?'badge-green':t.status==='In Review'?'badge-blue':'badge-amber';
        return `<div style="padding:8px;border:1px solid var(--b1);border-radius:var(--r8);margin-bottom:8px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
            <div style="font-size:13px;font-weight:600">${esc(t.title)}</div>
            <span class="badge ${sc}">${t.status}</span>
          </div>
          <div style="font-size:12px;color:var(--t3)">Due: ${fmtDate(t.deadline)} · ${t.hours}h est.</div>
        </div>`;
      }).join('') : '<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">No tasks assigned</div></div>'}
    </div>
    <div id="ep-perf" class="tab-pane">${perfHtml}<div id="ep-pay" style="margin-top:18px"><div style="font-size:12px;color:var(--t3)">Loading pay\u2026</div></div></div>
    <div id="ep-att" class="tab-pane"><div id="ep-att-body">${_empAttHtml(id)}</div></div>
    <div id="ep-penalties" class="tab-pane">${_empPenaltyHtml(id)}</div>
  `, `
    <button class="btn btn-secondary btn-sm" onclick="openEditEmpModal(${e.id})">Edit Profile</button>
    ${inactive
      ? `<button class="btn btn-secondary btn-sm" onclick="setEmployeeActive(${e.id}, true)">Reactivate</button>`
      : `<button class="btn btn-danger btn-sm" onclick="setEmployeeActive(${e.id}, false)">Deactivate</button>`}
    <button class="btn btn-blue btn-sm" onclick="openAssignTaskToEmp(${e.id})">
      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" style="margin-right:4px;vertical-align:-2px"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      Assign Task
    </button>
  `);
}

/* ============================================================
   DIRECT TASK ASSIGN — from an employee's profile
   ============================================================ */
function openAssignTaskToEmp(empId) {
  const e = STATE.employees.find(x => x.id === empId);
  if (!e) return;

  // Show only projects the employee can actually be assigned to (not yet finished)
  const activeProjects = STATE.projects.filter(p => p.status !== 'Completed');
  const projOptions = activeProjects.length
    ? activeProjects.map(p => {
        const onTeam = p.team.includes(empId) ? ' ★' : '';
        return `<option value="${p.id}">${esc(p.name)} — ${esc(p.client)}${onTeam}</option>`;
      }).join('')
    : `<option value="" disabled>No active projects available</option>`;

  // Default deadline = 7 days from today
  const def = new Date(); def.setDate(def.getDate() + 7);
  const defStr = Utils.isoDate(def);

  // Get current load for context
  const currentTasks = STATE.tasks.filter(t => t.assignee === empId && t.status !== 'Done').length;
  const loadColor = currentTasks >= 5 ? 'var(--red)' : currentTasks >= 3 ? 'var(--amber)' : 'var(--green)';

  openModal(`Assign Task to ${e.name.split(' ')[0]}`, `
    <!-- Employee summary card -->
    <div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--s2);border-radius:var(--r10);margin-bottom:18px">
      <div class="avatar avatar-lg" style="background:${e.color}">${e.avatar}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:14px;font-weight:650;color:var(--t1)">${esc(e.name)}</div>
        <div style="font-size:11.5px;color:var(--t3);margin-top:1px">${esc(e.role)} · ${esc(e.dept)}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:16px;font-weight:700;color:${loadColor}">${currentTasks}</div>
        <div style="font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:0.4px">Open Tasks</div>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Task Title *</label>
      <input class="form-input" id="at-title" placeholder="e.g. Prepare client presentation deck">
      <div class="form-error" id="at-title-err">Required</div>
    </div>

    <div class="form-group">
      <label class="form-label">Description</label>
      <textarea class="form-textarea" id="at-desc" placeholder="Detailed instructions, deliverables and acceptance criteria…"></textarea>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Project *</label>
        <select class="form-select" id="at-project">
          <option value="">Select a project</option>
          ${projOptions}
        </select>
        <div class="form-error" id="at-project-err">Please select a project</div>
      </div>
      <div class="form-group">
        <label class="form-label">Priority</label>
        <select class="form-select" id="at-priority">
          <option>High</option>
          <option selected>Medium</option>
          <option>Low</option>
        </select>
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Deadline *</label>
        <input class="form-input" id="at-deadline" type="date" value="${defStr}">
      </div>
      <div class="form-group">
        <label class="form-label">Estimated Hours</label>
        <input class="form-input" id="at-hours" type="number" placeholder="8" value="8" min="1">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Task price (\u20B9) \u2014 empty = hourly</label>
        <input class="form-input" id="at-price" type="number" placeholder="e.g. 500" min="0" step="50">
        <div style="font-size:11px;color:var(--t3);margin-top:4px">With a price, the employee sees "you'll earn this much", agrees the estimate, and the wallet is credited on approval.</div>
      </div>
    </div>

    <div class="form-group">
      <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--t2);cursor:pointer">
        <input type="checkbox" id="at-notify" checked style="width:14px;height:14px">
        Notify ${e.name.split(' ')[0]} immediately
      </label>
    </div>

    <div style="font-size:11.5px;color:var(--t3);background:var(--blue-light);padding:8px 10px;border-radius:var(--r8);display:flex;align-items:flex-start;gap:6px;border:1px solid rgba(37,99,235,0.15)">
      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" style="flex-shrink:0;margin-top:1px;color:var(--blue)"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="8" x2="12" y2="8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      <span>If ${e.name.split(' ')[0]} isn't already on this project's team, they'll be added automatically.</span>
    </div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="confirmAssignTaskToEmp(${empId})">Assign Task</button>`);
}

function confirmAssignTaskToEmp(empId) {
  const title = document.getElementById('at-title').value.trim();
  const projectIdRaw = document.getElementById('at-project').value;
  const projectId = parseInt(projectIdRaw, 10);

  let bad = false;
  if (!title) {
    document.getElementById('at-title').classList.add('input-error');
    document.getElementById('at-title-err').classList.add('show');
    bad = true;
  }
  if (!projectIdRaw || isNaN(projectId)) {
    document.getElementById('at-project').classList.add('input-error');
    document.getElementById('at-project-err').classList.add('show');
    bad = true;
  }
  if (bad) return;

  const emp = STATE.employees.find(x => x.id === empId);
  const proj = STATE.projects.find(x => x.id === projectId);
  if (!emp || !proj) { closeModal(); return; }

  const deadline = document.getElementById('at-deadline').value;
  const hours = parseInt(document.getElementById('at-hours').value, 10) || 8;
  const notify = document.getElementById('at-notify').checked;

  const dueIso = new Date((deadline || Utils.isoDate(new Date(Date.now() + 7 * 86400000))) + 'T18:00:00').toISOString();
  DataAPI.createDeliverable({
    projectId: projectId,
    milestoneId: null,
    title: title,
    description: '',
    status: 'TODO',
    priority: _toCanonicalPriority(document.getElementById('at-priority').value),
    assigneeIds: [empId],
    createdById: STATE.adminUser.id,
    origin: 'ADMIN',
    dueAt: dueIso,
    estimateSecs: Schema.TIME.hoursToSecs(hours || 4),
    pricingMode: (parseFloat(document.getElementById('at-price')?.value) > 0) ? 'PIECE' : 'HOURLY',
    pricePaise: Math.round((parseFloat(document.getElementById('at-price')?.value) || 0) * 100)
  }).then(function () {
    syncState();
    if (typeof openEmpProfile === 'function') openEmpProfile(empId);
    if (typeof renderEmployees === 'function') renderEmployees();
  }).catch(function (e) { toast(e.message, 'error'); });
  emp.tasks = (emp.tasks || 0) + 1;

  // Auto-add to project team if not already on it
  let addedToTeam = false;
  if (!proj.team.includes(empId)) {
    proj.team.push(empId);
    addedToTeam = true;
  }

  // Activity feed entry
  STATE.activityFeed.unshift({
    icon: '📋',
    color: '#EFF6FF',
    text: `<strong>New task</strong> "${title}" directly assigned to <strong>${esc(emp.name)}</strong> on ${proj.name}`,
    time: 'Just now'
  });

  // Notification entry (acts as the "notify" side-effect)
  if (notify && STATE.notifications) {
    STATE.notifications.unshift({
      id: Date.now() + 1,
      text: `New task assigned: "${title}"`,
      sub: `From admin · ${proj.name}`,
      read: false
    });
  }

  closeModal();
  toast(
    addedToTeam
      ? `Task assigned · ${emp.name.split(' ')[0]} added to ${proj.name}`
      : `Task "${title}" assigned to ${emp.name.split(' ')[0]}`,
    'success'
  );

  // Re-open the employee profile so the admin immediately sees the updated task list
  openEmpDetail(empId);
  // After re-opening, jump to the Tasks tab to surface the new task
  setTimeout(() => {
    const tasksTab = document.querySelector('#slide-panel .tab-btn:nth-child(2)');
    if (tasksTab) tasksTab.click();
  }, 50);
}

function openAddEmpModal() {
  const suggested = '';
  openModal('Add New Employee', `
    <div style="font-size:12.5px;color:var(--t3);margin-bottom:14px;background:var(--blue-light);padding:9px 12px;border-radius:var(--r8)">Every employee gets their own login for the employee app. Notifications go to the email below.</div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Full Name *</label><input class="form-input" id="ae-name" placeholder="Rahul Verma" oninput="aeSuggestUsername()"><div class="form-error" id="ae-name-err">Required</div></div>
      <div class="form-group"><label class="form-label">Email (for notifications) *</label><input class="form-input" id="ae-email" type="email" placeholder="rahul@oment.in"><div class="form-error" id="ae-email-err">Valid email required</div></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Phone *</label><input class="form-input" id="ae-phone" placeholder="+91 98765 00000" type="tel"><div class="form-error" id="ae-phone-err">Required</div></div>
      <div class="form-group"><label class="form-label">Role / Designation *</label><input class="form-input" id="ae-role" placeholder="Senior Developer"><div class="form-error" id="ae-role-err">Required</div></div>
    </div>
    <div class="form-group"><label class="form-label">Address *</label><textarea class="form-textarea" id="ae-address" rows="2" placeholder="House / street, city, state, PIN"></textarea><div class="form-error" id="ae-address-err">Required</div></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Department *</label><select class="form-select" id="ae-dept"><option value="">Select\u2026</option>${STATE.departments.map(d=>`<option>${esc(d.name)}</option>`).join('')}</select></div>
      <div class="form-group"><label class="form-label">Reporting Manager</label><select class="form-select" id="ae-manager"><option value="">Select\u2026</option>${STATE.employees.map(e=>`<option value="${e.id}">${esc(e.name)}</option>`).join('')}</select></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Monthly salary (\u20B9) *</label><input class="form-input" id="ae-salary" type="number" min="0" step="500" placeholder="e.g. 20800" oninput="aeRatePreview()"><div class="form-error" id="ae-salary-err">Required \u2014 drives per-hour costing</div></div>
      <div class="form-group"><label class="form-label">Hours per day</label><input class="form-input" id="ae-hpd" type="number" min="1" max="16" step="0.5" value="8" oninput="aeRatePreview()"><div style="font-size:11px;color:var(--t3);margin-top:4px">Sundays off \u2014 26 working days/month</div></div>
    </div>
    <div id="ae-rate-preview" style="display:none;font-size:12.5px;background:var(--green-light);color:#1E8E3E;padding:9px 12px;border-radius:var(--r8);margin-bottom:14px"></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Starting Date</label><input class="form-input" id="ae-date" type="date" value="${Utils.isoDate(new Date())}"></div>
      <div class="form-group"></div>
    </div>
    <div style="border-top:1px solid var(--b1);margin:4px 0 14px;padding-top:14px">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--t3);margin-bottom:10px">Login credentials (employee app)</div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Username *</label><input class="form-input" id="ae-username" placeholder="rahul.verma" autocomplete="off"><div class="form-error" id="ae-username-err">3\u201330 chars: letters, numbers, dots</div></div>
        <div class="form-group"><label class="form-label">Password *</label>
          <div style="display:flex;gap:8px"><input class="form-input" id="ae-pass" type="text" placeholder="min 6 characters" autocomplete="new-password" style="flex:1"><button class="btn btn-secondary btn-sm" type="button" onclick="document.getElementById('ae-pass').value=Utils.genPassword()">Generate</button></div>
          <div class="form-error" id="ae-pass-err">At least 6 characters</div>
        </div>
      </div>
      <div style="font-size:11.5px;color:var(--t3)">The password is stored hashed, never plain. After creating, a credentials card appears \u2014 share it with the employee once; they should change it on first login.</div>
    </div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="addEmployee()">Create Employee</button>`);
}

function aeSuggestUsername() {
  const u = document.getElementById('ae-username');
  if (!u || u.dataset.touched) return;
  const taken = STATE.employees.map(e => e.username).filter(Boolean);
  u.value = Utils.usernameFrom(document.getElementById('ae-name').value, taken);
}
document.addEventListener('input', function (ev) { if (ev.target && ev.target.id === 'ae-username') ev.target.dataset.touched = '1'; });

function aeRatePreview() {
  const el = document.getElementById('ae-rate-preview');
  if (!el) return;
  const sal = parseFloat(document.getElementById('ae-salary')?.value) || 0;
  const hpd = parseFloat(document.getElementById('ae-hpd')?.value) || 8;
  if (sal <= 0) { el.style.display = 'none'; return; }
  const rate = Utils.hourlyCostFromSalary(Math.round(sal * 100), hpd);
  const hrs = Utils.WORKING_DAYS_PER_MONTH * hpd;
  el.style.display = '';
  el.innerHTML = 'Cost per hour: <b>' + fmtRupee(Math.round(rate / 100)) + '/hr</b> \u2014 \u20B9' + sal.toLocaleString('en-IN') + ' \u00F7 (' + Utils.WORKING_DAYS_PER_MONTH + ' days \u00D7 ' + hpd + 'h = ' + hrs + 'h). Every approved task\u2019s cost is computed from this automatically.';
}

function openEditEmpModal(id) {
  const e = STATE.employees.find(x=>x.id===id);
  if(!e) return;
  openModal(`Edit: ${esc(e.name)}`, `
    <div class="form-row">
      <div class="form-group"><label class="form-label">Full Name</label><input class="form-input" id="ee-name" value="${esc(e.name)}"></div>
      <div class="form-group"><label class="form-label">Email</label><input class="form-input" id="ee-email" value="${esc(e.email)}" type="email"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Phone</label><input class="form-input" id="ee-phone" value="${esc(e.phone)}"></div>
      <div class="form-group"><label class="form-label">Role</label><input class="form-input" id="ee-role" value="${esc(e.role)}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Department</label><select class="form-select" id="ee-dept">${STATE.departments.map(d=>`<option${d.name===e.dept?' selected':''}>${esc(d.name)}</option>`).join('')}</select></div>
      <div class="form-group"><label class="form-label">Status</label><select class="form-select" id="ee-status"><option${e.status==='Present'?' selected':''}>Present</option><option${e.status==='Absent'?' selected':''}>Absent</option><option${e.status==='On Leave'?' selected':''}>On Leave</option></select></div>
    </div>
    <div class="form-group"><label class="form-label">Address</label><textarea class="form-textarea" id="ee-address" rows="2">${esc(e.address||'')}</textarea></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Monthly salary (\u20B9)</label><input class="form-input" id="ee-salary" type="number" min="0" step="500" value="${Math.round((e.monthlySalaryPaise||0)/100)||''}"></div>
      <div class="form-group"><label class="form-label">Hours per day</label><input class="form-input" id="ee-hpd" type="number" min="1" max="16" step="0.5" value="${e.hoursPerDay||8}"><div style="font-size:11px;color:var(--t3);margin-top:4px">Cost/hr re-derives automatically on save</div></div>
    </div>
    <div style="border-top:1px solid var(--b1);padding-top:12px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
      <div style="font-size:12.5px;color:var(--t2)">Login: <b style="font-family:var(--mono)">${esc(e.username||'\u2014')}</b></div>
      <button class="btn btn-secondary btn-sm" type="button" onclick="resetEmpPassword(${id})">Reset password</button>
    </div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveEmpEdit(${id})">Save Changes</button>`);
}

function saveEmpEdit(id) {
  const e = STATE.employees.find(x=>x.id===id);
  if (!e) return;
  const name = document.getElementById('ee-name').value.trim();
  if (!name) { toast('Name is required', 'error'); return; }
  const deptName = document.getElementById('ee-dept').value;
  const dept = STATE.departments.find(function (d) { return d.name === deptName; });
  const statusMap = { 'Present':'PRESENT', 'Absent':'ABSENT', 'On Leave':'ON_LEAVE', 'Half Day':'HALF_DAY' };
  DataAPI.updateEmployee(id, {
    name: name,
    email: document.getElementById('ee-email').value.trim(),
    phone: document.getElementById('ee-phone').value.trim(),
    role: document.getElementById('ee-role').value.trim(),
    address: (document.getElementById('ee-address')?.value || '').trim(),
    monthlySalaryPaise: Math.round((parseFloat(document.getElementById('ee-salary')?.value) || 0) * 100),
    hoursPerDay: parseFloat(document.getElementById('ee-hpd')?.value) || 8,
    deptId: dept ? dept.id : null,
    attendanceStatus: statusMap[document.getElementById('ee-status').value] || 'PRESENT',
    avatarInitials: initials(name)
  }).then(function () {
    syncState();
    closeModal();
    closePanel();
    renderEmployees();
    toast(`${esc(name)}'s profile updated`, 'success');
  }).catch(function (err) { toast(err.message, 'error'); });
}

function addEmployee() {
  const g = id => document.getElementById(id);
  const val = id => (g(id)?.value || '').trim();
  const name = val('ae-name'), email = val('ae-email'), role = val('ae-role');
  const phone = val('ae-phone'), address = val('ae-address');
  const username = val('ae-username').toLowerCase(), pass = g('ae-pass')?.value || '';
  let valid = true;
  const need = (id, ok) => { if (!ok) { g(id)?.classList.add('input-error'); g(id + '-err')?.classList.add('show'); valid = false; } };
  need('ae-name', !!name); need('ae-email', email.includes('@')); need('ae-role', !!role);
  need('ae-phone', !!phone); need('ae-address', !!address);
  need('ae-username', /^[a-z0-9._-]{3,30}$/.test(username)); need('ae-pass', pass.length >= 6);
  const salary = parseFloat(val('ae-salary')) || 0;
  need('ae-salary', salary > 0);
  if (!valid) return;
  const dept = g('ae-dept').value || STATE.departments[0]?.name || 'General';
  const color = getColor(STATE.employees.length);
  DataAPI.createEmployee({
    name, role, email, phone, address, username, password: pass,
    monthlySalaryPaise: Math.round(salary * 100),
    hoursPerDay: parseFloat(val('ae-hpd')) || 8,
    deptId: (STATE.departments.find(d => d.name === dept) || {}).id,
    avatarBg: color, avatarFg: '#ffffff', color: color,
    joinedAt: g('ae-date').value || Utils.isoDate(new Date())
  }).then(function (emp) {
    syncState(); closeModal(); renderEmployees();
    openModal('\u2713 ' + esc(emp.name) + ' created', `
      <div style="font-size:13px;color:var(--t2);margin-bottom:14px">Share these once with ${esc(emp.name.split(' ')[0])}. They sign in to the <b>employee app</b> with:</div>
      <div style="background:var(--s2);border-radius:var(--r10);padding:16px;font-family:var(--mono);font-size:15px;line-height:2">
        <div>Username: <b>${esc(emp.username)}</b></div>
        <div>Password: <b>${esc(pass)}</b></div>
      </div>
      <div style="font-size:12px;color:var(--t3);margin-top:12px">This is the only time the password is shown \u2014 it\u2019s stored hashed. Notifications will go to <b>${esc(emp.email)}</b>.</div>
      <div style="font-size:12px;background:var(--green-light);color:#1E8E3E;padding:8px 12px;border-radius:var(--r8);margin-top:10px">Costing is live: <b>${fmtRupee(Math.round((emp.costPerHourPaise||0)/100))}/hr</b> (from \u20B9${(Math.round((emp.monthlySalaryPaise||0)/100)).toLocaleString('en-IN')}/month). When their tasks are approved you\u2019ll see exactly what each one cost.</div>
    `, `<button class="btn btn-secondary" onclick="navigator.clipboard&&navigator.clipboard.writeText('Username: ${esc(emp.username)}\\nPassword: ${esc(pass)}');toast('Copied','success')">Copy</button><button class="btn btn-primary" onclick="closeModal()">Done</button>`);
  }).catch(function (e) {
    if (e.code === 'DUPLICATE') { g('ae-username')?.classList.add('input-error'); }
    toast(e.message, 'error');
  });
}


function resetEmpPassword(id) {
  const e = STATE.employees.find(x => x.id === id);
  if (!e) return;
  const pass = Utils.genPassword();
  DataAPI.updateEmployee(id, { password: pass }).then(function () {
    syncState();
    openModal('Password reset \u2014 ' + esc(e.name), `
      <div style="background:var(--s2);border-radius:var(--r10);padding:16px;font-family:var(--mono);font-size:15px;line-height:2">
        <div>Username: <b>${esc(e.username)}</b></div>
        <div>New password: <b>${esc(pass)}</b></div>
      </div>
      <div style="font-size:12px;color:var(--t3);margin-top:12px">Shown once. Old password stops working immediately.</div>
    `, `<button class="btn btn-primary" onclick="closeModal()">Done</button>`);
  }).catch(function (err) { toast(err.message, 'error'); });
}


/* ── Employee pay: task earnings, bonuses, payouts, balance (wallet) ─── */
function _loadEmpPay(id) {
  const el = document.getElementById('ep-pay');
  if (!el || typeof Wallet === 'undefined' || !Wallet.getWallet) { if (el) el.innerHTML = ''; return; }
  Wallet.getWallet(id).then(function (w) {
    const r = p => Utils.fmtRupee(p || 0).replace('.00', '');
    const entries = (w.entries || []).filter(x => !(x.meta && (x.meta.system || (x.type === 'BONUS' && x.meta.direct)))).slice().sort((a, b) => String(b.at || b.createdAt || '').localeCompare(String(a.at || a.createdAt || ''))).slice(0, 8);
    const sum = t => (w.entries || []).filter(x => t.includes(x.type)).reduce((s, x) => s + (x.amountPaise || 0), 0);
    const earned = sum(['TASK_CREDIT', 'DISPUTE_CREDIT']), bonus = sum(['BONUS', 'ADJUSTMENT']), paid = -sum(['PAYOUT']), deductions = w.deductionsPaise != null ? w.deductionsPaise : -sum(['DEDUCTION']);
    const balance = w.balancePaise != null ? w.balancePaise : earned + bonus - deductions - paid;
    const box = (l, v, c) => `<div style="text-align:center;padding:10px;background:var(--s2);border-radius:var(--r8)"><div style="font-size:16px;font-weight:700;font-family:var(--mono);color:${c}">${v}</div><div style="font-size:11px;color:var(--t3);margin-top:2px">${l}</div></div>`;
    el.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div style="font-size:13px;font-weight:700">\uD83D\uDCB0 Pay</div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-xs" style="background:var(--green);color:#fff" onclick="openEmpPaymentModal(${id})">\uD83D\uDCB8 Record payment</button>
          <button class="btn btn-secondary btn-xs" onclick="poPayHistory(${id})">History</button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px">
        ${(function () { const m = typeof poMoneyOf === 'function' ? poMoneyOf(id) : { earned: earned + bonus - deductions, paid: paid, remaining: balance };
          return box('Earned', r(m.earned + deductions), 'var(--green)') + box('Deductions', r(deductions), 'var(--red)') + box('Paid', r(m.paid), 'var(--blue)') +
            box(m.remaining < 0 ? 'Paid in advance' : 'Still to pay', r(Math.abs(m.remaining)), m.remaining > 0 ? 'var(--amber)' : 'var(--t2)'); })()}
      </div>
      ${entries.length ? `<div style="border:1px solid var(--b1);border-radius:var(--r8);overflow:hidden">${entries.map(x => `
        <div style="display:flex;gap:10px;align-items:center;padding:8px 10px;border-bottom:1px solid var(--b1);font-size:12.5px">
          <div style="flex:1;min-width:0"><div style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(x.why || x.type)}</div>
            <div style="font-size:11px;color:var(--t3)">${esc(String(x.type).replace(/_/g, ' ').toLowerCase())}${(x.at || x.createdAt) ? ' \u00b7 ' + new Date(x.at || x.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}</div></div>
          <div style="font-family:var(--mono);font-weight:700;color:${x.amountPaise < 0 ? 'var(--t2)' : 'var(--green)'}">${x.amountPaise < 0 ? '\u2212' : '+'}${r(Math.abs(x.amountPaise))}</div>
        </div>`).join('')}</div>` : '<div style="font-size:12px;color:var(--t3)">No pay entries yet. Piece-rate tasks add money here when approved; bonuses and payouts are added from Payouts.</div>'}`;
  }).catch(function (err) { el.innerHTML = '<div style="font-size:12px;color:var(--t3)">Pay not available: ' + esc(err.message) + '</div>'; });
}


/* ── Record money sent to an employee (from their balance, or directly) ── */
function openEmpPaymentModal(empId) {
  const e = STATE.employees.find(x => x.id === empId);
  if (!e) return;
  const today = Utils.isoDate(new Date());
  const m = typeof poMoneyOf === 'function' ? poMoneyOf(empId) : { earned: 0, paid: 0, remaining: 0 };
  const owed = Math.max(0, m.remaining);
  const R = p => Utils.fmtRupee(p).replace('.00', '');
  openModal('Record payment \u2014 ' + esc(e.name), `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px">
      ${[['Earned', m.earned, 'var(--t1)'], ['Paid so far', m.paid, 'var(--blue)'], [m.remaining < 0 ? 'Paid in advance' : 'Still to pay', Math.abs(m.remaining), m.remaining > 0 ? 'var(--amber)' : 'var(--t2)']].map(([l, v, c]) =>
        `<div style="background:var(--s2);border-radius:10px;padding:9px 11px"><div style="font-size:10.5px;color:var(--t3);text-transform:uppercase;letter-spacing:.3px">${l}</div><div style="font-size:16px;font-weight:700;font-family:var(--mono);color:${c}">${R(v)}</div></div>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="form-group"><label class="form-label">Amount paid (\u20b9) *</label><input class="form-input" type="number" min="1" step="1" id="ep-amt" value="${owed ? Utils.paiseToRupees(owed) : ''}" oninput="_epAdvanceHint(${owed})"></div>
      <div class="form-group"><label class="form-label">Date paid</label><input class="form-input" type="date" id="ep-date" value="${today}" max="${today}"></div>
      <div class="form-group"><label class="form-label">Method</label><select class="form-select" id="ep-method">${['Bank transfer','UPI','Cash','Cheque','Other'].map(x => `<option>${x}</option>`).join('')}</select></div>
      <div class="form-group"><label class="form-label">Reference / UTR</label><input class="form-input" id="ep-ref" placeholder="optional"></div>
    </div>
    <div class="form-group"><label class="form-label">Project (optional)</label>
      <select class="form-select" id="ep-proj"><option value="">\u2014 Not for a specific project \u2014</option>${STATE.projects.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></div>
    <div class="form-group"><label class="form-label">Note</label><input class="form-input" id="ep-note" placeholder="e.g. September salary, part payment"></div>
    <div class="form-hint" id="ep-hint">This reduces "Still to pay". It is never added to what they earned.</div>
  `, `<button class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
      <button class="btn btn-sm" style="background:var(--green);color:#fff" id="ep-save" onclick="saveEmpPayment(${empId})">Save payment</button>`);
}
function _epAdvanceHint(owed) {
  const v = Utils.rupeesToPaise(parseFloat(document.getElementById('ep-amt')?.value) || 0);
  const h = document.getElementById('ep-hint'); if (!h) return;
  h.innerHTML = v > owed ? '\u26A0\uFE0F ' + Utils.fmtRupee(v - owed).replace('.00', '') + ' more than what is owed \u2014 it will show as an <strong>advance</strong>.'
    : 'This reduces "Still to pay". It is never added to what they earned.';
}

function saveEmpPayment(empId) {
  const amt = parseFloat(document.getElementById('ep-amt')?.value);
  if (isNaN(amt) || amt <= 0) { toast('Enter the amount paid', 'error'); return; }
  const btn = document.getElementById('ep-save'); if (btn) { btn.disabled = true; btn.textContent = 'Saving\u2026'; }
  Wallet.recordEmployeePayment(empId, {
    amountPaise: Utils.rupeesToPaise(amt),
    date: document.getElementById('ep-date')?.value,
    method: document.getElementById('ep-method')?.value,
    reference: (document.getElementById('ep-ref')?.value || '').trim(),
    projectId: document.getElementById('ep-proj')?.value || null,
    note: (document.getElementById('ep-note')?.value || '').trim()
  }).then(function () {
    syncState(); closeModal();
    _loadEmpPay(empId);
    if (STATE.currentModule === 'payouts' && typeof renderPayouts === 'function') renderPayouts();
    toast('Payment recorded \u2713', 'success');
  }).catch(function (err) {
    if (btn) { btn.disabled = false; btn.textContent = 'Save payment'; }
    toast(err.message, 'error');
  });
}