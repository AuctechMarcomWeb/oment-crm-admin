function openAddMilestoneModal(pid) {
  const p = STATE.projects.find(x => x.id === pid);
  if (!p) return;
  openModal(`Add Milestone — ${esc(p.name)}`, `
    <div class="form-group">
      <label class="form-label">Milestone Title *</label>
      <input class="form-input" id="am-title" placeholder="e.g. Beta Release">
      <div class="form-error" id="am-title-err">Required</div>
    </div>
    <div class="form-group">
      <label class="form-label">Description</label>
      <textarea class="form-textarea" id="am-desc" placeholder="What does this milestone represent?"></textarea>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Target Date *</label>
        <input class="form-input" id="am-date" type="date">
        <div class="form-error" id="am-date-err">Required</div>
      </div>
      <div class="form-group">
        <label class="form-label">Initial Status</label>
        <select class="form-select" id="am-status">
          <option value="Upcoming" selected>Upcoming</option>
          <option value="In Progress">In Progress</option>
          <option value="Done">Done</option>
        </select>
      </div>
    </div>
    ${_msPayFields('am')}
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="addMilestone(${pid})">Add Milestone</button>`);
}

function addMilestone(pid) {
  const p = STATE.projects.find(x => x.id === pid);
  if (!p) return;
  const title = document.getElementById('am-title').value.trim();
  const date  = document.getElementById('am-date').value;
  let bad = false;
  if (!title) { document.getElementById('am-title').classList.add('input-error'); document.getElementById('am-title-err').classList.add('show'); bad = true; }
  if (!date)  { document.getElementById('am-date').classList.add('input-error');  document.getElementById('am-date-err').classList.add('show');  bad = true; }
  if (bad) return;
  /* saved on the server (this form used to add it only on screen) */
  DataAPI.createMilestone(Object.assign({
    projectId: pid,
    title: title,
    description: document.getElementById('am-desc').value.trim(),
    dueDate: date,
    status: Schema.normMilestoneStatus(document.getElementById('am-status').value || 'Upcoming'),
    sortOrder: (p.milestones || []).length + 1
  }, _readMsPay('am'))).then(function () {
    syncState();
    closeModal();
    if (typeof renderProjectTimeline === 'function') renderProjectTimeline(pid);
    if (typeof renderMilestonesTab === 'function' && document.getElementById('ms-list-' + pid)) renderMilestonesTab(pid);
    toast(`Milestone "${title}" added`, 'success');
    if (document.getElementById('milestone-summary-body')) renderMilestoneSummary();
  }).catch(function (err) { toast(err.message, 'error'); });
  return;
  // Sync dashboard milestone widget
  if (document.getElementById('milestone-summary-body')) renderMilestoneSummary();
}

/* ============================================================
   MILESTONES — Full featured with deliverables inside each milestone
   ============================================================ */

// ---------- helpers ----------
function getMilestoneProgress(pid, msId) {
  const delivs = STATE.tasks.filter(t => t.projectId === pid && t.milestoneId === msId);
  if (!delivs.length) return { total:0, done:0, pct:0 };
  const done = delivs.filter(t => t.status === 'Done').length;
  return { total: delivs.length, done, pct: Math.round(done/delivs.length*100) };
}

function isMilestoneComplete(pid, msId) {
  const { total, done } = getMilestoneProgress(pid, msId);
  return total > 0 && done === total;
}

function renderDeliverablesTab(pid) {
  // This now renders the MILESTONES tab
  renderMilestonesTab(pid);
}

/* ─── MILESTONES TAB ─────────────────────────────────────────── */
function renderMilestonesTab(pid) {
  const pane = document.getElementById('pd-tasks');
  if (!pane) return;
  const p = STATE.projects.find(x => x.id === pid);
  if (!p) return;
  if (!Array.isArray(p.milestones)) p.milestones = [];
  if (!Array.isArray(p._expandedMs)) p._expandedMs = [];

  const totalMs = p.milestones.length;
  const doneMs  = p.milestones.filter(m => isMilestoneComplete(pid, m.id)).length;
  const overallPct = totalMs ? Math.round(doneMs/totalMs*100) : 0;

  pane.innerHTML = `
    <!-- Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px">
      <div>
        <div style="font-size:15px;font-weight:700">Milestones</div>
        <div style="font-size:12px;color:var(--t3);margin-top:2px">${totalMs} milestone${totalMs!==1?'s':''} · ${doneMs} completed · ${overallPct}% overall</div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="openCreateMilestoneModal(${pid})" style="display:flex;align-items:center;gap:6px">
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        New Milestone
      </button>
    </div>

    <!-- Overall Progress -->
    ${totalMs > 0 ? `
    <div style="margin-bottom:20px;padding:12px 16px;background:var(--surface);border:1px solid var(--b1);border-radius:var(--r12)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <span style="font-size:12px;font-weight:600;color:var(--t2)">Overall Milestone Progress</span>
        <span style="font-size:13px;font-weight:700;color:${overallPct===100?'var(--green)':'var(--blue)'}">${overallPct}%</span>
      </div>
      <div style="height:6px;background:var(--s3);border-radius:99px;overflow:hidden">
        <div style="height:100%;width:${overallPct}%;background:${overallPct===100?'var(--green)':'var(--blue)'};border-radius:99px;transition:.4s"></div>
      </div>
      <div style="display:flex;gap:16px;margin-top:8px;font-size:11px;color:var(--t3)">
        <span>✅ ${doneMs} Done</span>
        <span>🔄 ${totalMs-doneMs} Remaining</span>
        <span>📦 ${STATE.tasks.filter(t=>t.projectId===pid).length} total deliverables</span>
      </div>
    </div>` : ''}

    <!-- Milestone list -->
    <div style="display:flex;flex-direction:column;gap:12px" id="ms-list-${pid}">
      ${totalMs === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">🎯</div>
          <div class="empty-title">No milestones yet</div>
          <div class="empty-sub">Create your first milestone to organise deliverables</div>
        </div>
      ` : p.milestones.map((m, idx) => renderMilestoneCard(pid, m, idx)).join('')}
    </div>
  `;
}

function renderMilestoneCard(pid, m, idx) {
  const p     = STATE.projects.find(x => x.id === pid);
  const prog  = getMilestoneProgress(pid, m.id);
  const done  = isMilestoneComplete(pid, m.id);
  const exp   = (p._expandedMs || []).includes(m.id);
  const today = new Date(); today.setHours(0,0,0,0);
  const msDate = m.date ? new Date(m.date) : null;
  if (msDate) msDate.setHours(0,0,0,0);
  const isOverdue = msDate && msDate < today && !done;
  const delivs = STATE.tasks.filter(t => t.projectId === pid && t.milestoneId === m.id);
  const activeFilter = m._delFilter || 'All';
  const filtered = activeFilter === 'All' ? delivs :
    activeFilter === 'Rejected' ? delivs.filter(t => t.rejectionReason && t.status !== 'Done') :
    activeFilter === 'In Progress' ? delivs.filter(t => t.status === 'In Progress' && !t.rejectionReason) :
    delivs.filter(t => t.status === activeFilter);

  const msStatusColor = done ? 'var(--green)' : isOverdue ? 'var(--red)' : 'var(--blue)';
  const msStatusBg    = done ? '#ECFDF5'      : isOverdue ? '#FEF2F2'    : '#EFF6FF';
  const msStatusLabel = done ? 'Completed'    : isOverdue ? 'Overdue'    : (m.status || 'Upcoming');

  const delStatusCounts = {
    All: delivs.length,
    'In Progress': delivs.filter(t=>t.status==='In Progress' && !t.rejectionReason).length,
    'In Review':   delivs.filter(t=>t.status==='In Review').length,
    'Rejected':    delivs.filter(t=>t.rejectionReason && t.status!=='Done').length,
    'Done':        delivs.filter(t=>t.status==='Done').length,
  };

  return `
  <div class="card" style="overflow:hidden;transition:.15s" id="ms-card-${m.id}">
    <!-- Milestone header bar -->
    <div style="height:3px;background:${msStatusColor};opacity:0.7"></div>
    <div style="padding:14px 16px">
      ${_msPayStrip(pid, m.id)}

      <!-- Top row: title + actions -->
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px">
        <div style="flex:1;min-width:0;cursor:pointer" onclick="toggleMilestone(${pid},${m.id})">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <!-- Expand/collapse chevron -->
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" style="color:var(--t3);transition:.2s;transform:${exp?'rotate(90deg)':'rotate(0deg)'}">
              <polyline points="9 18 15 12 9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span style="font-size:14px;font-weight:700;color:var(--t1)">${esc(m.title)}</span>
            <span style="font-size:10px;padding:2px 8px;border-radius:99px;background:${msStatusBg};color:${msStatusColor};font-weight:700">${msStatusLabel}</span>
            ${done ? '<span style="font-size:16px">✅</span>' : ''}
          </div>
          ${m.desc ? `<div style="font-size:12px;color:var(--t3);margin-top:4px;margin-left:22px;line-height:1.5">${esc(m.desc)}</div>` : ''}
        </div>
        <!-- Right actions -->
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
          <button onclick="openAddDeliverableToMilestone(${pid},${m.id})" 
            style="padding:5px 10px;border:1px solid var(--b1);border-radius:var(--r6);background:var(--blue);color:#fff;font-size:11px;cursor:pointer;font-family:var(--font);transition:.15s;display:flex;align-items:center;gap:4px"
            onmouseover="this.style.background='#1d4ed8'" onmouseout="this.style.background='var(--blue)'">
            <svg width="10" height="10" fill="none" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
            Add Deliverable
          </button>
          <button onclick="editMilestone(${pid},${m.id})"
            style="width:28px;height:28px;border:1px solid var(--b1);border-radius:var(--r6);background:none;font-size:13px;cursor:pointer;color:var(--t2);display:flex;align-items:center;justify-content:center;transition:.15s"
            onmouseover="this.style.background='var(--s2)'" onmouseout="this.style.background='none'" title="Edit milestone">
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
          <button onclick="deleteMilestone(${pid},${m.id})"
            style="width:28px;height:28px;border:1px solid var(--b1);border-radius:var(--r6);background:none;font-size:13px;cursor:pointer;color:var(--red);display:flex;align-items:center;justify-content:center;transition:.15s"
            onmouseover="this.style.background='#FEF2F2'" onmouseout="this.style.background='none'" title="Delete milestone">
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
        </div>
      </div>

      <!-- Meta + Progress -->
      <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:${exp?'14px':'0'}">
        ${m.date ? `<span style="font-size:12px;color:${isOverdue?'var(--red)':'var(--t3)'};display:flex;align-items:center;gap:4px">
          <svg width="11" height="11" fill="none" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.8"/><line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="1.8"/></svg>
          Due: <strong style="color:${isOverdue?'var(--red)':'var(--t2)'}">${m.date}</strong>
        </span>` : ''}
        <span style="font-size:12px;color:var(--t3)">${prog.done}/${prog.total} deliverables done</span>
        <div style="flex:1;min-width:120px;height:5px;background:var(--s3);border-radius:99px;overflow:hidden">
          <div style="height:100%;width:${prog.pct}%;background:${done?'var(--green)':'var(--blue)'};border-radius:99px;transition:.4s"></div>
        </div>
        <span style="font-size:12px;font-weight:700;color:${done?'var(--green)':'var(--blue)'}">${prog.pct}%</span>
      </div>

      <!-- Deliverables section (expanded) -->
      ${exp ? `
      <div style="border-top:1px solid var(--b1);padding-top:14px;margin-top:14px">

        <!-- Filter pills -->
        <div style="display:flex;gap:4px;margin-bottom:12px;padding:3px;background:var(--s2);border-radius:var(--r8);width:fit-content;flex-wrap:wrap">
          ${[
            {f:'All',     col:'var(--t1)'},
            {f:'In Progress', col:'var(--amber)'},
            {f:'In Review',   col:'var(--blue)'},
            {f:'Rejected',    col:'var(--red)'},
            {f:'Done',        col:'var(--green)'}
          ].map(({f,col}) => `
            <button onclick="setMsDelFilter(${pid},${m.id},'${f}')"
              style="padding:4px 10px;border-radius:var(--r6);border:none;font-size:11px;cursor:pointer;font-family:var(--font);transition:.15s;font-weight:${activeFilter===f?'650':'400'};background:${activeFilter===f?'var(--surface)':'transparent'};color:${activeFilter===f?col:'var(--t3)'};box-shadow:${activeFilter===f?'var(--sh0)':'none'};display:inline-flex;align-items:center;gap:4px">
              ${f} <span style="font-size:10px;padding:1px 6px;border-radius:99px;background:${activeFilter===f?(col==='var(--t1)'?'var(--s3)':col):'var(--s3)'};color:${activeFilter===f&&col!=='var(--t1)'?'#fff':'var(--t2)'};font-weight:600;min-width:14px;text-align:center">${delStatusCounts[f]}</span>
            </button>
          `).join('')}
        </div>

        <!-- Deliverable cards -->
        <div style="display:flex;flex-direction:column;gap:10px">
          ${filtered.length === 0 ? `
            <div style="padding:20px;text-align:center;color:var(--t3);font-size:13px;background:var(--s2);border-radius:var(--r8)">
              ${activeFilter !== 'All' ? 'No deliverables with this status' : 'No deliverables yet — click "Add Deliverable" to create one'}
            </div>
          ` : filtered.map(t => renderDeliverableCard(pid, t, m.id)).join('')}
        </div>
      </div>` : ''}
    </div>
  </div>`;
}

function renderDeliverableCard(pid, t, msId) {
  const assigneeIds = t.assignees && t.assignees.length ? t.assignees : (t.assignee ? [t.assignee] : []);
  const assignees   = assigneeIds.map(id => STATE.employees.find(e => e.id === id)).filter(Boolean);
  const isPast      = t.deadline && t.deadline < Utils.isoDate(new Date());
  const isRejected  = t.rejectionReason && t.status !== 'Done';
  const deadColor   = t.status==='Done'?'var(--t3)':isPast?'var(--red)':'var(--amber)';
  const deadLabel   = t.status==='Done'?fmtDate(t.deadline):isPast?'Overdue \u2014 '+fmtDate(t.deadline):'Due '+fmtDate(t.deadline);
  const stColor     = t.status==='Done'?'var(--green)':isRejected?'var(--red)':t.status==='In Review'?'var(--blue)':'var(--amber)';
  const stBg        = t.status==='Done'?'#ECFDF5':isRejected?'#FEF2F2':t.status==='In Review'?'#EFF6FF':'#FFFBEB';
  const stLabel     = isRejected ? 'Rejected' : t.status;
  const prColor     = t.priority==='High'?'var(--red)':t.priority==='Medium'?'var(--amber)':'var(--t3)';
  const prBg        = t.priority==='High'?'#FEF2F2':t.priority==='Medium'?'#FFFBEB':'var(--s2)';
  const pctDone     = t.status==='Done'?100:t.status==='In Review'?70:t.progress||30;

  return `
  <div data-open="openDeliverableDetail(${pid},${t.id})" style="border:1px solid ${isRejected?'rgba(220,38,38,0.25)':'var(--b1)'};border-radius:var(--r10);overflow:hidden;background:var(--surface);transition:.15s"
    onmouseover="this.style.boxShadow='var(--sh1)'" onmouseout="this.style.boxShadow='none'">
    <div style="height:2px;background:${isRejected?'var(--red)':prColor};opacity:${isRejected?1:0.5}"></div>
    <div style="padding:12px 14px">
      <!-- Title + badges -->
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:8px;flex-wrap:wrap">
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:650;line-height:1.3;margin-bottom:3px">${esc(t.title)}</div>
          ${t.desc ? `<div style="font-size:11.5px;color:var(--t3);line-height:1.45;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${esc(t.desc)}</div>` : ''}
        </div>
        <div style="display:flex;align-items:center;gap:5px;flex-shrink:0;flex-wrap:wrap">
          ${typeof poCardBadges === 'function' ? poCardBadges(t) : ''}
          <span style="font-size:10px;padding:2px 7px;border-radius:99px;background:${prBg};color:${prColor};font-weight:600">${t.priority}</span>
          <span style="font-size:10px;padding:2px 7px;border-radius:99px;background:${stBg};color:${stColor};font-weight:600">${stLabel}</span>
        </div>
      </div>
      ${isRejected ? `
        <div style="background:#FEF2F2;border:1px solid rgba(220,38,38,.2);border-radius:var(--r6);padding:6px 10px;margin-bottom:8px;display:flex;gap:6px;align-items:flex-start">
          <span style="font-size:11px;flex-shrink:0">⚠️</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:10px;font-weight:700;color:var(--red);text-transform:uppercase;letter-spacing:.4px;margin-bottom:1px">Rejection Reason</div>
            <div style="font-size:11.5px;color:var(--t1);line-height:1.4;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${esc(t.rejectionReason)}</div>
          </div>
        </div>
      ` : ''}
      <!-- Meta -->
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:10px;flex-wrap:wrap">
        ${assignees.length ? `
          <div style="display:flex;align-items:center;gap:5px">
            <div style="display:flex">
              ${assignees.slice(0,3).map((emp,i)=>`<div class="avatar" style="background:${emp.color};width:20px;height:20px;font-size:8px;font-weight:700;margin-left:${i>0?'-6px':'0'};border:2px solid var(--surface)" title="${esc(emp.name)}">${emp.avatar}</div>`).join('')}
              ${assignees.length>3?`<div style="width:20px;height:20px;border-radius:50%;background:var(--s3);border:2px solid var(--surface);display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:var(--t2);margin-left:-6px">+${assignees.length-3}</div>`:''}
            </div>
            <span style="font-size:11.5px;color:var(--t2);font-weight:500">${assignees.length===1?assignees[0].name:assignees[0].name.split(' ')[0]+' +'+(assignees.length-1)+' more'}</span>
          </div>
        ` : '<span style="font-size:11px;color:var(--t3)">Unassigned</span>'}
        <div style="display:flex;align-items:center;gap:3px">
          <svg width="11" height="11" fill="none" viewBox="0 0 24 24" style="color:${deadColor}"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><polyline points="12 6 12 12 16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          <span style="font-size:11.5px;color:${deadColor};font-weight:${isPast&&t.status!=='Done'?'600':'400'}">${deadLabel}</span>
        </div>
        <div style="display:flex;align-items:center;gap:3px">
          <svg width="11" height="11" fill="none" viewBox="0 0 24 24" style="color:var(--t3)"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.8"/><polyline points="12 6 12 12 16 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          <span style="font-size:11.5px;color:var(--t3)">${t.hours}h</span>
        </div>
        ${(t.subtasks && t.subtasks.length) ? `
          <div style="display:flex;align-items:center;gap:3px" title="${t.subtasks.filter(s=>s.status==='Done').length} of ${t.subtasks.length} tasks done">
            <svg width="11" height="11" fill="none" viewBox="0 0 24 24" style="color:var(--t3)"><path d="M9 11l3 3L22 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            <span style="font-size:11.5px;color:var(--t3)"><strong style="color:var(--t2)">${t.subtasks.filter(s=>s.status==='Done').length}</strong>/${t.subtasks.length} tasks</span>
          </div>
        ` : ''}
      </div>
      <!-- Progress bar -->
      <div style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;margin-bottom:3px">
          <span style="font-size:10px;color:var(--t3)">Progress</span>
          <span style="font-size:10px;font-weight:600;color:${stColor}">${pctDone}%</span>
        </div>
        <div style="height:4px;background:var(--s3);border-radius:99px;overflow:hidden">
          <div style="height:100%;width:${pctDone}%;background:${stColor};border-radius:99px;transition:.4s"></div>
        </div>
      </div>
      <!-- Action buttons -->
      <div style="display:flex;gap:5px;flex-wrap:wrap;padding-top:8px;border-top:1px solid var(--b1);align-items:center">
        <button onclick="openDeliverableDetail(${pid},${t.id})"
          style="padding:5px 11px;border:1px solid var(--blue);border-radius:var(--r6);background:var(--blue);font-size:11px;cursor:pointer;color:#fff;font-family:var(--font);transition:.15s;font-weight:600;display:inline-flex;align-items:center;gap:4px"
          onmouseover="this.style.background='#1d4ed8'" onmouseout="this.style.background='var(--blue)'">
          <svg width="11" height="11" fill="none" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/></svg>
          View Details
        </button>
        ${t.status==='In Review'?`
          <button onclick="approveDeliverable(${pid},${t.id})" 
            style="padding:5px 10px;border:1px solid rgba(5,150,105,.3);border-radius:var(--r6);background:#ECFDF5;font-size:11px;cursor:pointer;color:var(--green);font-family:var(--font);transition:.15s;font-weight:600"
            onmouseover="this.style.background='var(--green-light)'" onmouseout="this.style.background='#ECFDF5'">✅ Approve</button>
          <button onclick="rejectDeliverable(${pid},${t.id})"
            style="padding:5px 10px;border:1px solid rgba(220,38,38,.3);border-radius:var(--r6);background:#FEF2F2;font-size:11px;cursor:pointer;color:var(--red);font-family:var(--font);transition:.15s;font-weight:600"
            onmouseover="this.style.background='var(--red-light)'" onmouseout="this.style.background='#FEF2F2'">✕ Reject</button>
        `:t.status!=='Done'?`
          <button onclick="quickApproveDeliverable(${pid},${t.id})"
            style="padding:5px 10px;border:1px solid var(--b1);border-radius:var(--r6);background:var(--s2);font-size:11px;cursor:pointer;color:var(--t2);font-family:var(--font);transition:.15s"
            onmouseover="this.style.background='var(--s3)'" onmouseout="this.style.background='var(--s2)'">Mark Done</button>
        `:''}
        <button onclick="openEditDeliverableModal(${pid},${t.id})"
          style="padding:5px 10px;border:1px solid var(--b1);border-radius:var(--r6);background:none;font-size:11px;cursor:pointer;color:var(--t2);font-family:var(--font);transition:.15s"
          onmouseover="this.style.background='var(--s2)'" onmouseout="this.style.background='none'">Edit</button>
        <button onclick="deleteDeliverable(${pid},${t.id})"
          style="padding:5px 10px;border:1px solid var(--b1);border-radius:var(--r6);background:none;font-size:11px;cursor:pointer;color:var(--red);font-family:var(--font);margin-left:auto;transition:.15s"
          onmouseover="this.style.background='#FEF2F2'" onmouseout="this.style.background='none'">Delete</button>
      </div>
    </div>
  </div>`;
}

function toggleMilestone(pid, msId) {
  const p = STATE.projects.find(x => x.id === pid);
  if (!p) return;
  if (!Array.isArray(p._expandedMs)) p._expandedMs = [];
  const idx = p._expandedMs.indexOf(msId);
  if (idx >= 0) p._expandedMs.splice(idx, 1);
  else p._expandedMs.push(msId);
  renderMilestonesTab(pid);
}

function setMsDelFilter(pid, msId, filter) {
  const p = STATE.projects.find(x => x.id === pid);
  if (!p) return;
  const m = (p.milestones||[]).find(x => x.id === msId);
  if (m) m._delFilter = filter;
  renderMilestonesTab(pid);
}

function openCreateMilestoneModal(pid) {
  openModal('Create Milestone', `
    <div class="form-group">
      <label class="form-label">Milestone Title *</label>
      <input class="form-input" id="cm-title" placeholder="e.g. Phase 1 — Design Approval">
      <div class="form-error" id="cm-title-err">Required</div>
    </div>
    <div class="form-group">
      <label class="form-label">Description</label>
      <textarea class="form-textarea" id="cm-desc" placeholder="What does this milestone represent?" rows="2"></textarea>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Due Date</label>
        <input class="form-input" id="cm-date" type="date">
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select class="form-select" id="cm-status">
          <option value="Upcoming">Upcoming</option>
          <option value="In Progress">In Progress</option>
          <option value="Done">Done</option>
        </select>
      </div>
    </div>
    ${_msPayFields('cm')}
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="createMilestone(${pid})">Create Milestone</button>`);
}

function createMilestone(pid) {
  const title = document.getElementById('cm-title')?.value?.trim();
  if (!title) { document.getElementById('cm-title').classList.add('input-error'); document.getElementById('cm-title-err').classList.add('show'); return; }
  const p = STATE.projects.find(x => x.id === pid);
  if (!p) return;
  if (!Array.isArray(p.milestones)) p.milestones = [];
  if (!Array.isArray(p._expandedMs)) p._expandedMs = [];
  const dateVal = document.getElementById('cm-date')?.value;
  const sortOrder = (p.milestones || []).length + 1;
  DataAPI.createMilestone({
    projectId: pid,
    title: title,
    description: document.getElementById('cm-desc')?.value?.trim() || '',
    dueDate: dateVal || null,
    status: Schema.normMilestoneStatus(document.getElementById('cm-status')?.value || 'Upcoming'),
    sortOrder: sortOrder,
    ..._readMsPay('cm')
  }).then(function (ms) {
    syncState();
    const proj = STATE.projects.find(x=>x.id===pid);
    if (proj) { if (!Array.isArray(proj._expandedMs)) proj._expandedMs = []; proj._expandedMs.push(ms.id); }
    closeModal();
    renderMilestonesTab(pid);
    toast(`Milestone "${title}" created \u2713`, 'success');
  }).catch(function (err) { toast(err.message, 'error'); });
}

function editMilestone(pid, msId) {
  const p = STATE.projects.find(x => x.id === pid);
  const m = (p?.milestones||[]).find(x => x.id === msId);
  if (!m) return;
  // Convert display date back to yyyy-mm-dd for input
  const toInputDate = (d) => {
    if (!d) return '';
    // Try parse "DD Mon YYYY" or ISO
    const parts = d.split(' ');
    if (parts.length === 3) {
      const months = {Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12};
      const mon = months[parts[1]];
      if (mon) return `${parts[2]}-${String(mon).padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
    }
    return d;
  };
  openModal('Edit Milestone', `
    <div class="form-group">
      <label class="form-label">Title *</label>
      <input class="form-input" id="em-title" value="${esc(m.title)}">
    </div>
    <div class="form-group">
      <label class="form-label">Description</label>
      <textarea class="form-textarea" id="em-desc" rows="2">${m.desc||''}</textarea>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Due Date</label>
        <input class="form-input" id="em-date" type="date" value="${toInputDate(m.date)}">
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select class="form-select" id="em-status">
          <option ${m.status==='Upcoming'?'selected':''}>Upcoming</option>
          <option ${m.status==='In Progress'?'selected':''}>In Progress</option>
          <option ${m.status==='Done'?'selected':''}>Done</option>
        </select>
      </div>
    </div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveMilestone(${pid},${msId})">Save Changes</button>`);
}

function saveMilestone(pid, msId) {
  const p = STATE.projects.find(x => x.id === pid);
  const m = (p?.milestones||[]).find(x => x.id === msId);
  if (!m) return;
  m.title  = document.getElementById('em-title')?.value?.trim() || m.title;
  m.desc   = document.getElementById('em-desc')?.value?.trim() || '';
  const dateVal = document.getElementById('em-date')?.value;
  m.date   = dateVal ? fmtDate(dateVal) : m.date;
  m.status = document.getElementById('em-status')?.value || m.status;
  closeModal();
  renderMilestonesTab(pid);
  toast('Milestone updated ✓', 'success');
}

function deleteMilestone(pid, msId) {
  const p = STATE.projects.find(x => x.id === pid);
  const m = (p?.milestones||[]).find(x => x.id === msId);
  if (!m) return;
  showConfirm(`Delete milestone "${esc(m.title)}"? All its deliverables will also be removed.`, () => {
    DataAPI.deleteMilestone(msId).then(function () {
      syncState();
      renderMilestonesTab(pid);
      toast('Milestone deleted', 'success');
    }).catch(function (err) { toast(err.message, 'error'); });
  });
}

function openAddDeliverableToMilestone(pid, msId) {
  const p = STATE.projects.find(x => x.id === pid);
  // Auto-expand the milestone
  if (!Array.isArray(p._expandedMs)) p._expandedMs = [];
  if (!p._expandedMs.includes(msId)) p._expandedMs.push(msId);
  openCreateDeliverableModal(pid, msId);
}

function quickApproveDeliverable(pid, taskId) {
  const t = STATE.tasks.find(x=>x.id===taskId);
  if (!t) return;
  t.status = 'Done'; t.progress = 100;
  if (!t.timeline) t.timeline = [];
  t.timeline.push({ type:'approve', text:'Marked done by Admin', time:'Just now' });
  DataAPI.approveDeliverable(t.id).then(syncAndRefresh).catch(function (e) { toast(e.message,'error'); });
  toast(`"${esc(t.title)}" marked done ✓`, 'success');
  renderMilestonesTab(pid);
  // Check if milestone is now complete
  if (t.milestoneId) {
    const proj = STATE.projects.find(x=>x.id===pid);
    const ms = (proj?.milestones||[]).find(m=>m.id===t.milestoneId);
    if (ms && isMilestoneComplete(pid, t.milestoneId)) {
      setTimeout(()=>toast(`🎉 Milestone "${esc(ms.title)}" is now complete!`,'success'),600);
    }
  }
}

function setDelFilter(pid, filter) {
  const p = STATE.projects.find(x => x.id === pid);
  if (p) p._delFilter = filter;
  renderMilestonesTab(pid);
}

function openCreateTaskModal(projectId) { openCreateDeliverableModal(projectId, null); }

function openCreateDeliverableModal(projectId, milestoneId) {
  const p = STATE.projects.find(x => x.id === projectId);
  const milestones = p?.milestones || [];
  openModal('Add Deliverable', `
    <div class="form-group">
      <label class="form-label">Title *</label>
      <input class="form-input" id="ct-title" placeholder="e.g. Implement payment gateway">
      <div class="form-error" id="ct-title-err">Required</div>
    </div>
    <div class="form-group">
      <label class="form-label">Description / Instructions</label>
      <textarea class="form-textarea" id="ct-desc" placeholder="Detailed instructions for the employee\u2026" rows="3"></textarea>
    </div>

    <!-- Milestone picker -->
    ${milestones.length ? `
    <div class="form-group">
      <label class="form-label">Milestone *</label>
      <select class="form-select" id="ct-milestone">
        <option value="">— Select Milestone —</option>
        ${milestones.map(m=>`<option value="${m.id}" ${m.id===milestoneId?'selected':''}>${esc(m.title)}</option>`).join('')}
      </select>
      <div class="form-error" id="ct-milestone-err">Select a milestone</div>
    </div>` : `<div style="padding:10px 12px;background:var(--amber-light);border-radius:var(--r8);font-size:12px;color:var(--amber);margin-bottom:16px">
      ⚠️ No milestones yet. <button onclick="closeModal();openCreateMilestoneModal(${projectId})" style="background:none;border:none;cursor:pointer;color:var(--amber);font-weight:700;font-family:var(--font);text-decoration:underline">Create a milestone first</button>
    </div>`}

    <!-- Assign Section -->
    <div class="form-group">
      <label class="form-label">Assign To *</label>
      <div style="display:flex;gap:6px;margin-bottom:8px;padding:4px;background:var(--s2);border-radius:var(--r8);width:fit-content">
        <button id="assign-tab-emp" onclick="switchAssignTab('emp')"
          style="padding:5px 12px;border-radius:var(--r6);border:none;font-size:12px;cursor:pointer;font-family:var(--font);font-weight:650;background:var(--surface);color:var(--t1);box-shadow:var(--sh0);transition:.15s">
          \u{1F464} Employees
        </button>
        <button id="assign-tab-dept" onclick="switchAssignTab('dept')"
          style="padding:5px 12px;border-radius:var(--r6);border:none;font-size:12px;cursor:pointer;font-family:var(--font);font-weight:400;background:transparent;color:var(--t3);transition:.15s">
          \u{1F3E2} Department
        </button>
      </div>
      <div class="form-error" id="ct-assignee-err" style="margin-bottom:6px">Select at least one employee or department</div>

      <!-- Employee multi-select panel -->
      <div id="assign-panel-emp">
        <div style="position:relative;margin-bottom:8px">
          <input class="form-input" id="emp-search-assign" placeholder="Search employees\u2026" oninput="filterAssignEmpList(this.value)" style="padding-left:32px">
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" style="position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--t4)"><circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/><line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </div>
        <div id="emp-assign-list" style="max-height:180px;overflow-y:auto;border:1px solid var(--b1);border-radius:var(--r8);background:var(--surface)">
          ${STATE.employees.map(e=>`
            <label style="display:flex;align-items:center;gap:10px;padding:9px 12px;cursor:pointer;transition:.1s;border-bottom:1px solid var(--b1)" onmouseover="this.style.background='var(--s2)'" onmouseout="this.style.background='transparent'">
              <input type="checkbox" value="${e.id}" name="ct-assignees" onchange="updateAssigneeChips()" style="width:15px;height:15px;accent-color:var(--blue);cursor:pointer;flex-shrink:0">
              <div class="avatar" style="background:${e.color};width:26px;height:26px;font-size:10px;font-weight:700;flex-shrink:0">${e.avatar}</div>
              <div style="flex:1;min-width:0">
                <div style="font-size:13px;font-weight:600;color:var(--t1)">${esc(e.name)}</div>
                <div style="font-size:11px;color:var(--t3)">${esc(e.dept)}</div>
              </div>
            </label>`).join('')}
        </div>
      </div>
      <!-- Department panel -->
      <div id="assign-panel-dept" style="display:none">
        <div style="border:1px solid var(--b1);border-radius:var(--r8);overflow:hidden">
          ${STATE.departments.map(d=>`
            <label style="display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--b1);border-radius:4px;transition:.15s;background:var(--surface)" onmouseover="this.style.background='var(--s2)'" onmouseout="this.style.background='var(--surface)'">
              <input type="checkbox" name="ct-dept" value="${esc(d.name)}" onchange="onDeptCheck(this)" style="width:15px;height:15px;accent-color:var(--blue);cursor:pointer;flex-shrink:0">
              <div style="width:10px;height:10px;border-radius:50%;background:${d.color};flex-shrink:0"></div>
              <div style="flex:1"><div style="font-size:13px;font-weight:600">${esc(d.name)}</div><div style="font-size:11px;color:var(--t3)">${STATE.employees.filter(e=>e.dept===d.name).length} members</div></div>
            </label>`).join('')}
        </div>
      </div>
      <div id="ct-assignee-chips" style="display:flex;flex-wrap:wrap;gap:5px;margin-top:8px"></div>
    </div>

    <div class="form-row">
      <div class="form-group"><label class="form-label">Priority</label><select class="form-select" id="ct-priority"><option>High</option><option selected>Medium</option><option>Low</option></select></div>
      <div class="form-group"><label class="form-label">Status</label><select class="form-select" id="ct-status"><option>In Progress</option><option>In Review</option><option>Done</option></select></div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Deadline *</label>
        <input class="form-input" id="ct-deadline" type="date">
        <div class="form-error" id="ct-deadline-err">Required</div>
      </div>
      <div class="form-group"><label class="form-label">Est. Hours</label><input class="form-input" id="ct-hours" type="number" value="4" min="0.5" step="0.5"></div>
    </div>
    <!-- Piece-rate (shared/wallet.js) -->
    <div class="form-row">
      <div class="form-group"><label class="form-label">Pricing</label>
        <select class="form-select" id="ct-pricing" onchange="document.getElementById('ct-price-wrap').style.display=this.value==='PIECE'?'':'none'">
          <option value="PIECE" selected>Fixed price + late slab</option>
          <option value="HOURLY">Hourly (employee rate)</option>
        </select></div>
      <div class="form-group" id="ct-price-wrap"><label class="form-label">Task price (₹) *</label><input class="form-input" id="ct-price" type="number" min="0" step="50" placeholder="e.g. 500">
        <div style="font-size:11px;color:var(--t3);margin-top:4px">Est. hours = agreed time. The employee accepts it, then the timer runs. Every extra full hour −${(DataAPI.raw().payPolicy||{}).slabCutPct||6}%, floor ${(DataAPI.raw().payPolicy||{}).floorPct||65}%.</div></div>
    </div>
    <div class="form-group">
      <label class="form-label">Instruction Files</label>
      <label style="display:flex;align-items:center;gap:8px;padding:10px 14px;border:1.5px dashed var(--b2);border-radius:var(--r8);cursor:pointer;transition:.15s" onmouseover="this.style.borderColor='var(--t1)'" onmouseout="this.style.borderColor='var(--b2)'">
        <input type="file" multiple style="display:none" onchange="handleDelivFiles(this)">
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" style="color:var(--t3)"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><polyline points="17 8 12 3 7 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        <span style="font-size:12px;color:var(--t3)">Click to upload instruction files</span>
      </label>
      <div id="ct-files-preview" style="display:flex;flex-wrap:wrap;gap:5px;margin-top:6px"></div>
    </div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="createDeliverable(${projectId},${milestoneId||'null'})">Add Deliverable</button>`);
  window._assignTab = 'emp';
  window._ctFiles = [];
}

function switchAssignTab(tab) {
  window._assignTab = tab;
  const empPanel  = document.getElementById('assign-panel-emp');
  const deptPanel = document.getElementById('assign-panel-dept');
  if (empPanel)  empPanel.style.display  = tab==='emp'  ? '' : 'none';
  if (deptPanel) deptPanel.style.display = tab==='dept' ? '' : 'none';
  const empBtn  = document.getElementById('assign-tab-emp');
  const deptBtn = document.getElementById('assign-tab-dept');
  if (empBtn)  { empBtn.style.fontWeight  = tab==='emp'  ? '650' : '400'; empBtn.style.background  = tab==='emp'  ? 'var(--surface)' : 'transparent'; empBtn.style.color  = tab==='emp'  ? 'var(--t1)' : 'var(--t3)'; empBtn.style.boxShadow  = tab==='emp'  ? 'var(--sh0)' : 'none'; }
  if (deptBtn) { deptBtn.style.fontWeight = tab==='dept' ? '650' : '400'; deptBtn.style.background = tab==='dept' ? 'var(--surface)' : 'transparent'; deptBtn.style.color = tab==='dept' ? 'var(--t1)' : 'var(--t3)'; deptBtn.style.boxShadow = tab==='dept' ? 'var(--sh0)' : 'none'; }
  updateAssigneeChips();
}

function filterAssignEmpList(q) {
  const rows = document.querySelectorAll('#emp-assign-list label');
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(q.toLowerCase()) ? 'flex' : 'none';
  });
}

function onDeptCheck(input) {
  const label = input.closest('label');
  if (label) { label.style.borderColor = input.checked ? 'var(--blue)' : 'var(--b1)'; label.style.background = input.checked ? 'var(--blue-light)' : 'var(--surface)'; }
  updateAssigneeChips();
}

function updateAssigneeChips() {
  const chips = document.getElementById('ct-assignee-chips');
  if (!chips) return;
  const tab = window._assignTab || 'emp';
  let selected = [];
  if (tab === 'emp') {
    document.querySelectorAll('#emp-assign-list input[name="ct-assignees"]:checked').forEach(cb => {
      const emp = STATE.employees.find(e=>e.id===parseInt(cb.value));
      if (emp) selected.push({ id:emp.id, name:emp.name, color:emp.color, avatar:emp.avatar });
    });
  } else {
    document.querySelectorAll('input[name="ct-dept"]:checked').forEach(cb => {
      const emps = STATE.employees.filter(e=>e.dept===cb.value);
      selected.push({ isDept:true, dept:cb.value, count:emps.length });
    });
  }
  if (!selected.length) { chips.innerHTML=''; return; }
  chips.innerHTML = selected.map(s => s.isDept ? `
    <div style="display:flex;align-items:center;gap:5px;padding:4px 8px;background:var(--blue-light);border:1px solid rgba(37,99,235,.2);border-radius:99px;font-size:11px;color:var(--blue);font-weight:600">
      \uD83C\uDFE2 ${s.dept} <span style="opacity:.7">(${s.count})</span>
    </div>` : `
    <div style="display:flex;align-items:center;gap:5px;padding:4px 8px;background:var(--s2);border:1px solid var(--b1);border-radius:99px;font-size:11px;color:var(--t1);font-weight:500">
      <div class="avatar" style="background:${s.color};width:16px;height:16px;font-size:7px;font-weight:700">${s.avatar}</div>
      ${s.name.split(' ')[0]}
    </div>`).join('');
}

function handleDelivFiles(input) {
  window._ctFiles = window._ctFiles || [];
  const picked = Array.from((input && input.files) || []);
  const paint = (uploading) => {
    const preview = document.getElementById('ct-files-preview');
    if (!preview) return;
    preview.innerHTML = window._ctFiles.map((f, i) => `
      <div style="display:flex;align-items:center;gap:6px;padding:4px 8px;background:var(--s2);border:1px solid var(--b1);border-radius:var(--r6);font-size:11px">
        <span style="font-weight:600;color:var(--t2)">${esc(f.name)}</span>
        <button onclick="window._ctFiles.splice(${i},1);handleDelivFiles({files:[]})" style="background:none;border:none;cursor:pointer;color:var(--t3);font-size:13px;line-height:1;padding:0">\xd7</button>
      </div>`).join('') + (uploading ? `<div style="font-size:11px;color:var(--t3);padding:4px 2px">Uploading ${uploading}\u2026</div>` : '');
  };
  if (!picked.length) { paint(0); return; }
  if (!window.OmentAPI || !OmentAPI.uploadFile) { toast('File uploads need the backend server', 'error'); return; }
  const big = picked.filter(f => f.size > 50 * 1024 * 1024);
  if (big.length) toast(big.length + ' file(s) over 50 MB skipped', 'error');
  const list = picked.filter(f => f.size <= 50 * 1024 * 1024);
  paint(list.length);
  let chain = Promise.resolve();
  list.forEach(f => {
    chain = chain.then(() => OmentAPI.uploadFile(f).then(r => {
      const ext = f.name.split('.').pop().toLowerCase();
      const kind = ext === 'pdf' ? 'pdf' : ['xls','xlsx','csv'].includes(ext) ? 'xls' : ['png','jpg','jpeg','gif','webp'].includes(ext) ? 'img' : ext === 'zip' ? 'zip' : 'doc';
      window._ctFiles.push({ name: r.name || f.name, sizeLabel: f.size > 1048576 ? (f.size / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(f.size / 1024)) + ' KB', kind, fileId: r.fileId, mime: r.mime, sizeBytes: r.sizeBytes, uploadedAt: r.uploadedAt });
    }));
  });
  chain.then(() => paint(0)).catch(err => { paint(0); toast('Upload failed: ' + err.message, 'error'); });
}

function createDeliverable(projectId, milestoneId) {
  const title   = document.getElementById('ct-title')?.value?.trim();
  const deadline = document.getElementById('ct-deadline')?.value;
  let valid = true;

  if (!title)    { document.getElementById('ct-title').classList.add('input-error'); document.getElementById('ct-title-err').classList.add('show'); valid=false; }
  if (!deadline) { document.getElementById('ct-deadline').classList.add('input-error'); document.getElementById('ct-deadline-err').classList.add('show'); valid=false; }

  // Milestone required if project has milestones
  const p = STATE.projects.find(x=>x.id===projectId);
  const msPicker = document.getElementById('ct-milestone');
  let resolvedMsId = milestoneId;
  if (msPicker) {
    resolvedMsId = parseInt(msPicker.value) || null;
    if (!resolvedMsId) { document.getElementById('ct-milestone-err').classList.add('show'); valid=false; }
  }

  // Collect assignees
  const tab = window._assignTab || 'emp';
  let assigneeIds = [];
  let deptName = null;
  if (tab === 'emp') {
    document.querySelectorAll('#emp-assign-list input[name="ct-assignees"]:checked').forEach(cb => assigneeIds.push(parseInt(cb.value)));
  } else {
    document.querySelectorAll('input[name="ct-dept"]:checked').forEach(cb => {
      deptName = cb.value;
      STATE.employees.filter(e=>e.dept===cb.value).forEach(e => assigneeIds.push(e.id));
    });
  }
  if (!assigneeIds.length) { document.getElementById('ct-assignee-err').classList.add('show'); valid=false; }
  if (document.getElementById('ct-pricing')?.value === 'PIECE' && !(parseFloat(document.getElementById('ct-price')?.value) > 0)) {
    document.getElementById('ct-price')?.classList.add('input-error'); toast('A task price is required for fixed-price work', 'error'); valid=false;
  }
  if (!valid) return;

  const assignees = assigneeIds.map(id => STATE.employees.find(e=>e.id===id)).filter(Boolean);
  const task = {
    id: Date.now(), projectId,
    milestoneId: resolvedMsId,
    title,
    desc: document.getElementById('ct-desc')?.value?.trim() || '',
    assignee: assigneeIds[0],
    assignees: assigneeIds,
    dept: deptName,
    status: document.getElementById('ct-status')?.value || 'In Progress',
    priority: document.getElementById('ct-priority')?.value || 'Medium',
    deadline,
    hours: parseFloat(document.getElementById('ct-hours')?.value) || 4,
    progress: 0,
    files: window._ctFiles || [],
    submissionFiles: [], submissionNotes: '',
    rejectionReason: null,
    messages: [], timeline: [
      { type:'assign', text:`Assigned to ${assignees.map(e=>e.name).join(', ')||'team'}`, time:'Just now' }
    ]
  };

  DataAPI.createDeliverable({
    projectId: projectId,
    milestoneId: resolvedMsId,
    title: task.title,
    description: task.desc,
    status: _toCanonicalTaskStatus(task.status),
    priority: _toCanonicalPriority(task.priority),
    assigneeIds: assigneeIds,
    createdById: STATE.adminUser.id,
    origin: 'ADMIN',
    dueAt: new Date(task.deadline).toISOString(),
    estimateSecs: Schema.TIME.hoursToSecs(task.hours),
    briefFiles: task.files,
    pricingMode: document.getElementById('ct-pricing')?.value || 'HOURLY',
    pricePaise: Math.round((parseFloat(document.getElementById('ct-price')?.value) || 0) * 100)
  }).then(function () {
    window._ctFiles = [];
    syncState();
    finishCreateDeliverable(projectId, resolvedMsId, title);
  }).catch(function (err) { toast(err.message, 'error'); });
  return;
}

function finishCreateDeliverable(projectId, resolvedMsId, title) {
  const p = STATE.projects.find(x=>x.id===projectId);
  closeModal();
  // Switch to milestones tab and expand the milestone
  if (!Array.isArray(p._expandedMs)) p._expandedMs = [];
  if (resolvedMsId && !p._expandedMs.includes(resolvedMsId)) p._expandedMs.push(resolvedMsId);
  const tabBtns = document.querySelectorAll('#view-project-detail .tab-btn');
  const tabPanes = document.querySelectorAll('#view-project-detail .tab-pane');
  tabBtns.forEach(b => b.classList.toggle('active', b.textContent.trim()==='Milestones'));
  tabPanes.forEach(p2 => p2.classList.toggle('active', p2.id==='pd-tasks'));
  renderMilestonesTab(projectId);
  toast(`"${title}" added to milestone \u2713`, 'success');
}

// Alias for backward compat
function createTask(projectId) { createDeliverable(projectId, null); }

function approveDeliverable(pid, taskId) {
  const t = STATE.tasks.find(x=>x.id===taskId);
  if (!t) return;
  const wasIncomplete = t.milestoneId ? !isMilestoneComplete(pid, t.milestoneId) : false;
  DataAPI.approveDeliverable(taskId).then(function (fresh) {
    syncState();
    var st = fresh && fresh.settlement;
    var cs = fresh && fresh.costSnapshot;
    var costLine = '';
    if (cs && cs.costPaise > 0) {
      costLine = ' \u00b7 cost ' + Utils.fmtRupee(cs.costPaise).replace('.00','');
      if (cs.mode === 'HOURLY' && cs.ratePaise) costLine += ' (' + Schema.TIME.fmtShort(cs.secs) + ' \u00d7 ' + Utils.fmtRupee(cs.ratePaise).replace('.00','') + '/hr)';
    }
    toast((st ? `"${esc(t.title)}" approved \u2713 ${Utils.fmtRupee(st.finalPaise).replace('.00','')} credited` + (st.cutPaise ? ` (slab \u2212${Utils.fmtRupee(st.cutPaise).replace('.00','')})` : '') : `"${esc(t.title)}" approved \u2713`) + costLine, 'success');
    renderMilestonesTab(pid);
    if (wasIncomplete && t.milestoneId && isMilestoneComplete(pid, t.milestoneId)) {
      const proj = STATE.projects.find(x=>x.id===pid);
      const ms = (proj?.milestones||[]).find(m=>m.id===t.milestoneId);
      if (ms) setTimeout(()=>toast(`\uD83C\uDF89 Milestone "${esc(ms.title)}" is now complete!`,'success'),600);
    }
  }).catch(function (err) { toast(err.message, 'error'); });
}

function rejectDeliverable(pid, taskId) {
  const t = STATE.tasks.find(x=>x.id===taskId);
  if (!t) return;
  openModal('Return for revision',
    `<div style="font-size:13px;color:var(--t2);margin-bottom:12px">
       <strong>${esc(t.title)}</strong>
     </div>
     <div class="form-group">
       <label class="form-label">What needs to change? *</label>
       <textarea class="form-textarea" id="rej-reason" rows="4"
         placeholder="Be specific about what needs to change — the employee sees exactly this"></textarea>
       <div class="form-error" id="rej-reason-err">A reason is required</div>
     </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
     <button class="btn btn-danger" onclick="confirmRejectDeliverable(${pid},${taskId})">Return for revision</button>`);
}

function confirmRejectDeliverable(pid, taskId) {
  const t = STATE.tasks.find(x=>x.id===taskId);
  if (!t) return;
  const reason = document.getElementById('rej-reason')?.value?.trim();
  if (!reason) { document.getElementById('rej-reason-err').classList.add('show'); return; }
  DataAPI.rejectDeliverable(taskId, reason).then(function () {
    syncState();
    closeModal();
    toast('Returned for revision', 'success');
    renderMilestonesTab(pid);
  }).catch(function (err) { toast(err.message, 'error'); });
}

function _legacyRejectDeliverable(pid, taskId) {
  const t = STATE.tasks.find(x=>x.id===taskId);
  if (!t) return;
  const reason = '';
  t.status = 'In Progress';
  t.rejectionReason = reason || 'Please review and resubmit.';
  if (!t.timeline) t.timeline = [];
  t.timeline.push({ type:'reject', text:'Rejected \u2014 '+t.rejectionReason, time:'Just now' });
  STATE.activityFeed.unshift({ icon:'\u2715', color:'#FEF2F2', text:`Deliverable <strong>"${esc(t.title)}"</strong> returned for revision`, time:'Just now' });
  toast(`"${esc(t.title)}" returned for revision`, 'error');
  renderMilestonesTab(pid);
}

function openEditDeliverableModal(pid, taskId) {
  const t = STATE.tasks.find(x=>x.id===taskId);
  if (!t) return;
  const currentAssigneeIds = t.assignees && t.assignees.length ? t.assignees : (t.assignee ? [t.assignee] : []);
  const p = STATE.projects.find(x=>x.id===pid);
  openModal('Edit Deliverable', `
    <div class="form-group"><label class="form-label">Title</label><input class="form-input" id="ed-title" value="${esc(t.title)}"></div>
    <div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="ed-desc" rows="3">${t.desc||''}</textarea></div>
    ${p?.milestones?.length ? `
    <div class="form-group"><label class="form-label">Milestone</label>
      <select class="form-select" id="ed-milestone">
        <option value="">— None —</option>
        ${(p.milestones||[]).map(m=>`<option value="${m.id}" ${m.id===t.milestoneId?'selected':''}>${esc(m.title)}</option>`).join('')}
      </select>
    </div>` : ''}
    <div class="form-group">
      <label class="form-label">Assignees</label>
      <div id="ed-emp-list" style="max-height:180px;overflow-y:auto;border:1px solid var(--b1);border-radius:var(--r8);background:var(--surface)">
        ${STATE.employees.map(e => `
          <label style="display:flex;align-items:center;gap:10px;padding:9px 12px;cursor:pointer;transition:.1s;border-bottom:1px solid var(--b1)" onmouseover="this.style.background='var(--s2)'" onmouseout="this.style.background='transparent'">
            <input type="checkbox" value="${e.id}" name="ed-assignees" ${currentAssigneeIds.includes(e.id)?'checked':''} style="width:15px;height:15px;accent-color:var(--blue);cursor:pointer;flex-shrink:0">
            <div class="avatar" style="background:${e.color};width:26px;height:26px;font-size:10px;font-weight:700;flex-shrink:0">${e.avatar}</div>
            <div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600;color:var(--t1)">${esc(e.name)}</div><div style="font-size:11px;color:var(--t3)">${esc(e.dept)}</div></div>
          </label>`).join('')}
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Priority</label><select class="form-select" id="ed-priority"><option ${t.priority==='High'?'selected':''}>High</option><option ${t.priority==='Medium'?'selected':''}>Medium</option><option ${t.priority==='Low'?'selected':''}>Low</option></select></div>
      <div class="form-group"><label class="form-label">Status</label><select class="form-select" id="ed-status"><option ${t.status==='In Progress'?'selected':''}>In Progress</option><option ${t.status==='In Review'?'selected':''}>In Review</option><option ${t.status==='Done'?'selected':''}>Done</option></select></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Deadline</label><input class="form-input" id="ed-deadline" type="date" value="${t.deadline||''}"></div>
      <div class="form-group"><label class="form-label">Progress %</label><input class="form-input" id="ed-progress" type="number" value="${t.progress||0}" min="0" max="100"></div>
    </div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveEditDeliverable(${pid},${taskId})">Save Changes</button>`);
}

function saveEditDeliverable(pid, taskId) {
  const t = STATE.tasks.find(x=>x.id===taskId);
  if (!t) return;
  const checked = document.querySelectorAll('input[name="ed-assignees"]:checked');
  const msPicker = document.getElementById('ed-milestone');
  const patchBody = {
    title: document.getElementById('ed-title')?.value?.trim() || t.title,
    description: document.getElementById('ed-desc')?.value?.trim() || '',
    priority: _toCanonicalPriority(document.getElementById('ed-priority')?.value || t.priority),
    status: _toCanonicalTaskStatus(document.getElementById('ed-status')?.value || t.status),
    progressPct: parseInt(document.getElementById('ed-progress')?.value) || t.progress
  };
  const dl = document.getElementById('ed-deadline')?.value;
  if (dl) patchBody.dueAt = new Date(dl).toISOString();
  if (checked.length) patchBody.assigneeIds = Array.from(checked).map(cb=>parseInt(cb.value));
  if (msPicker) patchBody.milestoneId = parseInt(msPicker.value) || null;
  DataAPI.updateDeliverable(taskId, patchBody).then(syncAndRefresh)
    .catch(function (err) { toast(err.message, 'error'); });
  closeModal();
  toast('Deliverable updated \u2713', 'success');
  renderMilestonesTab(pid);
}

function deleteDeliverable(pid, taskId) {
  const t = STATE.tasks.find(x=>x.id===taskId);
  if (!t) return;
  showConfirm('Delete "'+esc(t.title)+'"? This cannot be undone.', () => {
    DataAPI.deleteDeliverable(taskId).then(syncAndRefresh).catch(function (e) { toast(e.message,'error'); });
    toast('Deliverable deleted', 'success');
    renderMilestonesTab(pid);
  });
}




/* ══════════════════════════════════════════════════════════════
   MILESTONE PAY — fixed amount for the allotted hours; each extra hour
   cuts a % you set (never below the minimum %). Shared between the
   people who worked on it, by their logged time, and credited to their
   wallets from here.
══════════════════════════════════════════════════════════════ */
function _msPayFields(px, m) {
  m = m || {};
  return `
    <div style="border:1px solid var(--b1);border-radius:var(--r10);padding:12px 14px;margin-top:6px">
      <div style="font-size:13px;font-weight:600;margin-bottom:2px">\uD83D\uDCB0 Milestone pay for the team <span style="font-weight:400;color:var(--t3)">(optional)</span></div>
      <div style="font-size:11.5px;color:var(--t3);margin-bottom:10px">If the work takes longer than the allotted hours, the pay drops by your % for every extra hour.</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="form-group"><label class="form-label">Amount (\u20b9)</label>
          <input class="form-input" type="number" min="0" step="1" id="${px}-pay" value="${m.payPaise ? m.payPaise / 100 : ''}" placeholder="e.g. 20000"></div>
        <div class="form-group"><label class="form-label">Allotted hours</label>
          <input class="form-input" type="number" min="0" step="0.5" id="${px}-payhrs" value="${m.payHours || ''}" placeholder="e.g. 40"></div>
        <div class="form-group"><label class="form-label">Cut per extra hour (%)</label>
          <input class="form-input" type="number" min="0" max="100" step="0.5" id="${px}-paycut" value="${m.payCutPct == null ? 10 : m.payCutPct}"></div>
        <div class="form-group"><label class="form-label">Never pay less than (%)</label>
          <input class="form-input" type="number" min="0" max="100" step="1" id="${px}-payfloor" value="${m.payFloorPct == null ? 50 : m.payFloorPct}"></div>
      </div>
    </div>`;
}

function _readMsPay(px) {
  const amt = parseFloat(document.getElementById(px + '-pay')?.value);
  return {
    payPaise: isNaN(amt) || amt <= 0 ? 0 : Math.round(amt * 100),
    payHours: parseFloat(document.getElementById(px + '-payhrs')?.value) || 0,
    payCutPct: Math.max(0, Math.min(100, parseFloat(document.getElementById(px + '-paycut')?.value) || 0)),
    payFloorPct: Math.max(0, Math.min(100, parseFloat(document.getElementById(px + '-payfloor')?.value) || 0))
  };
}

/* same formula as the server (shared/data.js msPayCalc) */
function _msPayCalc(raw) {
  const D = DataAPI.raw();
  const ds = (D.deliverables || []).filter(d => d.milestoneId === raw.id);
  const per = {}; let taken = 0;
  ds.forEach(d => { const secs = d.loggedSecs || 0, a = d.assigneeIds || []; taken += secs; a.forEach(id => { per[id] = (per[id] || 0) + (a.length ? secs / a.length : 0); }); });
  const allowed = (Number(raw.payHours) || 0) * 3600;
  const overHours = allowed ? Math.max(0, taken - allowed) / 3600 : 0;
  const floor = Math.max(0, Math.min(100, Number(raw.payFloorPct == null ? 50 : raw.payFloorPct)));
  const cutPct = Math.round(Math.min(100 - floor, overHours * (Number(raw.payCutPct) || 0)) * 10) / 10;
  const finalPaise = Math.round((raw.payPaise || 0) * (100 - cutPct) / 100);
  const ids = Object.keys(per).map(Number), sum = ids.reduce((t, id) => t + per[id], 0);
  return { allowed, taken, overHours: Math.round(overHours * 10) / 10, cutPct, finalPaise,
    shares: ids.map(id => ({ id, secs: per[id], amountPaise: sum ? Math.round(finalPaise * per[id] / sum) : Math.round(finalPaise / ids.length) })) };
}

function _msPayStrip(pid, msId) {
  const raw = (DataAPI.raw().milestones || []).find(x => x.id === msId);
  if (!raw) return '';
  const priced = (DataAPI.raw().deliverables || []).some(d => d.milestoneId === msId && d.pricingMode === 'PIECE');
  if (priced && !raw.paySettledAt) return `<div style="font-size:11.5px;color:var(--t3);margin-bottom:8px">\uD83D\uDCB0 Pay for this milestone comes from its task prices${raw.amountPaise ? ' (milestone amount ' + Utils.fmtRupee(raw.amountPaise).replace('.00', '') + ', shared by its tasks)' : ''}.</div>`;
  if (!raw.payPaise) return `<div style="margin-bottom:8px"><span class="link-btn" style="font-size:11.5px" onclick="event.stopPropagation();openMsPayModal(${pid},${msId})">\uFF0B Set milestone pay</span></div>`;
  const c = raw.paySettledAt && raw.paySettlement ? Object.assign({}, raw.paySettlement, { allowed: raw.paySettlement.allowedSecs, taken: raw.paySettlement.takenSecs }) : _msPayCalc(raw);
  const h = s => Math.round((s || 0) / 360) / 10 + ' h';
  const r = p => Utils.fmtRupee(p || 0).replace('.00', '');
  return `<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:8px 10px;margin-bottom:10px;border-radius:var(--r8);background:${raw.paySettledAt ? '#ECFDF5' : c.cutPct ? '#FFFBEB' : 'var(--s2)'};font-size:12px">
    <span>\uD83D\uDCB0 <strong>${r(raw.payPaise)}</strong> for ${raw.payHours || 0} h</span>
    <span style="color:var(--t3)">\u00b7 taken ${h(c.taken)}</span>
    ${c.cutPct ? `<span style="color:var(--amber);font-weight:600">\u00b7 ${c.overHours} h over \u2192 \u2212${c.cutPct}%</span>` : ''}
    <span>\u00b7 pay <strong style="color:var(--green)">${r(c.finalPaise)}</strong></span>
    <span style="flex:1"></span>
    ${raw.paySettledAt
      ? `<span style="color:var(--green);font-weight:600">\u2713 Credited ${new Date(raw.paySettledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>`
      : `<button class="btn btn-secondary btn-xs" onclick="event.stopPropagation();openMsPayModal(${pid},${msId})">Edit pay</button>
         <button class="btn btn-xs" style="background:var(--green);color:#fff" onclick="event.stopPropagation();creditMsPay(${pid},${msId})">Credit to team</button>`}
  </div>`;
}

function openMsPayModal(pid, msId) {
  const raw = (DataAPI.raw().milestones || []).find(x => x.id === msId);
  if (!raw) return;
  openModal('Milestone pay \u2014 ' + esc(raw.title), _msPayFields('mp', raw),
    `<button class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary btn-sm" onclick="saveMsPay(${pid},${msId})">Save</button>`);
}

function saveMsPay(pid, msId) {
  DataAPI.updateMilestone(msId, _readMsPay('mp')).then(function () {
    syncState(); closeModal(); renderMilestonesTab(pid); toast('Milestone pay saved', 'success');
  }).catch(function (err) { toast(err.message, 'error'); });
}

function creditMsPay(pid, msId) {
  const raw = (DataAPI.raw().milestones || []).find(x => x.id === msId);
  if (!raw) return;
  const c = _msPayCalc(raw);
  if (!c.shares.length) { toast('Nobody has logged time on this milestone yet', 'error'); return; }
  const r = p => Utils.fmtRupee(p || 0).replace('.00', '');
  const who = c.shares.map(s => {
    const e = STATE.employees.find(x => x.id === s.id);
    return (e ? e.name : 'Employee') + ' ' + r(s.amountPaise);
  }).join(', ');
  showConfirm(`Credit ${r(c.finalPaise)} for "${raw.title}"${c.cutPct ? ' (' + c.cutPct + '% less for ' + c.overHours + ' extra hours)' : ''}? ${who}. It is added to their wallets.`, function () {
    DataAPI.creditMilestonePay(msId).then(function () {
      syncState(); renderMilestonesTab(pid); toast('Milestone pay credited \u2713', 'success');
    }).catch(function (err) { toast(err.message, 'error'); });
  });
}