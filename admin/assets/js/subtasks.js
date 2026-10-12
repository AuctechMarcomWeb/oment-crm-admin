/* ============================================================
   SUB-TASKS — work breakdown inside a deliverable
   Employees create tasks under a deliverable to track what they
   actually did and how long it took. Admins can also drop a quick
   task directly into a deliverable (e.g. an urgent client request).
   ============================================================ */

/* Format hours like 2.5 → "2h 30m", 0.5 → "30m", 0 → "—" */
function fmtHours(h) {
  if (h == null || isNaN(h)) return '—';
  if (h === 0) return '0h';
  if (h < 1) return Math.round(h * 60) + 'm';
  const hours = Math.floor(h);
  const mins = Math.round((h - hours) * 60);
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

/* Renders the entire Tasks section inside a deliverable's detail modal */
function renderSubtaskSection(pid, deliverableId) {
  const d = STATE.tasks.find(x => x.id === deliverableId);
  if (!d) return '';
  if (!Array.isArray(d.subtasks)) d.subtasks = [];

  const subs = d.subtasks;
  const filter = d._subFilter || 'All';

  const filtered = filter === 'All' ? subs :
    filter === 'Rejected' ? subs.filter(s => !!s.rejectionReason && s.status !== 'Done') :
    filter === 'In Progress' ? subs.filter(s => s.status === 'In Progress' && !s.rejectionReason) :
    subs.filter(s => s.status === filter);

  const counts = {
    All: subs.length,
    'In Progress': subs.filter(s => s.status === 'In Progress' && !s.rejectionReason).length,
    'In Review':   subs.filter(s => s.status === 'In Review').length,
    'Rejected':    subs.filter(s => !!s.rejectionReason && s.status !== 'Done').length,
    'Done':        subs.filter(s => s.status === 'Done').length,
  };

  const totalSpent = subs.reduce((sum, s) => sum + (parseFloat(s.timeSpent)  || 0), 0);
  const totalEst   = subs.reduce((sum, s) => sum + (parseFloat(s.estimatedTime) || 0), 0);
  const doneCount  = counts['Done'];
  const completionPct = subs.length ? Math.round(doneCount / subs.length * 100) : 0;

  // Empty state
  if (subs.length === 0) {
    return `
      <div style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px">
          <div>
            <div style="font-size:13px;font-weight:700;color:var(--t1);display:flex;align-items:center;gap:6px">📋 Tasks <span style="font-size:10px;font-weight:600;color:var(--t3);background:var(--s3);padding:1px 7px;border-radius:99px">0</span></div>
            <div style="font-size:11px;color:var(--t3);margin-top:2px">Work breakdown — what's done, by whom, how long it took</div>
          </div>
        </div>
        <div style="padding:24px 20px;text-align:center;background:var(--s2);border:1px dashed var(--b2);border-radius:var(--r10)">
          <div style="font-size:28px;margin-bottom:8px">📋</div>
          <div style="font-size:13.5px;font-weight:650;color:var(--t1);margin-bottom:4px">No tasks yet</div>
          <div style="font-size:11.5px;color:var(--t3);line-height:1.55;max-width:380px;margin:0 auto 14px">The assignee can break this deliverable into smaller tasks they'll work on. You can also create a task directly — useful for quick assignments like an urgent client request.</div>
          <button onclick="openCreateSubtaskModal(${pid},${deliverableId})" class="btn btn-blue btn-sm" style="display:inline-flex;align-items:center;gap:5px">
            <svg width="11" height="11" fill="none" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
            Create First Task
          </button>
        </div>
      </div>`;
  }

  return `
    <div style="margin-bottom:16px">
      <!-- Section header -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px">
        <div>
          <div style="font-size:13px;font-weight:700;color:var(--t1);display:flex;align-items:center;gap:6px">📋 Tasks <span style="font-size:10px;font-weight:600;color:var(--t2);background:var(--s3);padding:1px 7px;border-radius:99px">${subs.length}</span></div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">Work breakdown — what's done, by whom, how long it took</div>
        </div>
        <button onclick="openCreateSubtaskModal(${pid},${deliverableId})"
          style="padding:5px 12px;border:1px solid var(--blue);border-radius:var(--r6);background:var(--blue);font-size:11.5px;cursor:pointer;color:#fff;font-family:var(--font);transition:.15s;font-weight:600;display:inline-flex;align-items:center;gap:5px"
          onmouseover="this.style.background='#1d4ed8'" onmouseout="this.style.background='var(--blue)'">
          <svg width="11" height="11" fill="none" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
          Create Task
        </button>
      </div>

      <!-- Stats row -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:10px">
        <div style="background:var(--s2);border:1px solid var(--b1);border-radius:var(--r8);padding:8px 10px">
          <div style="font-size:9.5px;color:var(--t3);text-transform:uppercase;letter-spacing:.3px;font-weight:600">Time Spent</div>
          <div style="font-size:13.5px;font-weight:700;color:var(--t1);margin-top:2px;font-family:var(--mono)">${fmtHours(totalSpent)} <span style="font-size:10px;color:var(--t3);font-weight:500;font-family:var(--font)">/ ${fmtHours(totalEst)} est</span></div>
        </div>
        <div style="background:var(--s2);border:1px solid var(--b1);border-radius:var(--r8);padding:8px 10px">
          <div style="font-size:9.5px;color:var(--t3);text-transform:uppercase;letter-spacing:.3px;font-weight:600">Completed</div>
          <div style="font-size:13.5px;font-weight:700;color:var(--green);margin-top:2px;font-family:var(--mono)">${doneCount}<span style="font-size:10px;color:var(--t3);font-weight:500;font-family:var(--font)"> / ${subs.length}</span></div>
        </div>
        <div style="background:var(--s2);border:1px solid var(--b1);border-radius:var(--r8);padding:8px 10px">
          <div style="font-size:9.5px;color:var(--t3);text-transform:uppercase;letter-spacing:.3px;font-weight:600">Progress</div>
          <div style="font-size:13.5px;font-weight:700;color:${completionPct===100?'var(--green)':'var(--blue)'};margin-top:2px;font-family:var(--mono)">${completionPct}<span style="font-size:10px">%</span></div>
        </div>
      </div>

      <!-- Filter pills -->
      <div style="display:flex;gap:4px;margin-bottom:10px;padding:3px;background:var(--s2);border-radius:var(--r8);width:fit-content;flex-wrap:wrap">
        ${[
          {f:'All',         col:'var(--t1)'},
          {f:'In Progress', col:'var(--amber)'},
          {f:'In Review',   col:'var(--blue)'},
          {f:'Rejected',    col:'var(--red)'},
          {f:'Done',        col:'var(--green)'}
        ].map(({f,col}) => `
          <button onclick="setSubFilter(${pid},${deliverableId},'${f}')"
            style="padding:4px 10px;border-radius:var(--r6);border:none;font-size:11px;cursor:pointer;font-family:var(--font);transition:.15s;font-weight:${filter===f?'650':'400'};background:${filter===f?'var(--surface)':'transparent'};color:${filter===f?col:'var(--t3)'};box-shadow:${filter===f?'var(--sh0)':'none'};display:inline-flex;align-items:center;gap:4px">
            ${f} <span style="font-size:10px;padding:1px 6px;border-radius:99px;background:${filter===f&&col!=='var(--t1)'?col:'var(--s3)'};color:${filter===f&&col!=='var(--t1)'?'#fff':'var(--t2)'};font-weight:600;min-width:14px;text-align:center">${counts[f]}</span>
          </button>
        `).join('')}
      </div>

      <!-- Task cards -->
      <div style="display:flex;flex-direction:column;gap:8px">
        ${filtered.length === 0 ? `
          <div style="padding:14px;text-align:center;color:var(--t3);font-size:12.5px;background:var(--s2);border-radius:var(--r8)">
            No tasks ${filter !== 'All' ? `with status <strong style="color:var(--t2)">${filter}</strong>` : ''}
          </div>
        ` : filtered.map(s => renderSubtaskCard(pid, deliverableId, s)).join('')}
      </div>
    </div>
  `;
}

/* Card UI for a single sub-task */
function renderSubtaskCard(pid, deliverableId, s) {
  const isRejected = !!s.rejectionReason && s.status !== 'Done';
  const approval = String(s.approvalState || '').toUpperCase();
  const isApproved = approval === 'APPROVED' && s.status === 'Done';
  const isReady = approval === 'APPROVED' && s.status !== 'Done';
  const isInReview = approval === 'COMPLETION_PENDING';

  const stColor = isApproved || isReady ? 'var(--green)' : isRejected ? 'var(--red)' : isInReview ? 'var(--blue)' : 'var(--amber)';
  const stBg    = isApproved || isReady ? '#ECFDF5' : isRejected ? '#FEF2F2' : isInReview ? '#EFF6FF' : '#FFFBEB';
  const reworking = isRejected && approval === 'APPROVED';      // sent back after a completion review
  const stLabel = isApproved ? 'Completed \u00b7 Approved' : reworking ? 'Sent back \u00b7 Being reworked' : isRejected ? 'Rejected'
    : isInReview ? 'Completion Review' : isReady ? (s.status === 'In Progress' ? 'Approved \u00b7 In progress' : 'Approved \u00b7 Ready to Start')
    : approval === 'PENDING' ? 'Pending Admin Approval' : s.status;

  const prColor = s.priority==='High'?'var(--red)':s.priority==='Medium'?'var(--amber)':'var(--t3)';

  const creator  = s.createdBy ? STATE.employees.find(e => e.id === s.createdBy) : null;
  const creatorLabel = creator ? creator.name.split(' ')[0] : (s.createdByName || 'Admin');
  const creatorAvatar = creator ? creator.avatar : 'AD';
  const creatorColor  = creator ? creator.color  : 'var(--t1)';
  const assignee = STATE.employees.find(e => e.id === s.assignee);

  const timeOverEst = (s.estimatedTime && s.timeSpent > s.estimatedTime);

  return `
    <div style="border:1px solid ${isRejected?'rgba(220,38,38,.28)':'var(--b1)'};border-radius:var(--r8);background:var(--surface);overflow:hidden;transition:.15s"
      onmouseover="this.style.boxShadow='var(--sh1)'" onmouseout="this.style.boxShadow='none'">
      <div style="height:2px;background:${prColor};opacity:.45"></div>
      <div style="padding:10px 12px">
        <!-- Title + status -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:${s.desc?'4px':'8px'}">
          <div style="flex:1;min-width:0">
            <div style="font-size:12.5px;font-weight:650;color:var(--t1);line-height:1.3">${esc(s.title)}</div>
            ${s.desc ? `<div style="font-size:11px;color:var(--t3);margin-top:3px;line-height:1.45">${esc(s.desc)}</div>` : ''}
          </div>
          <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end">
            <span style="font-size:9.5px;padding:2px 6px;border-radius:99px;background:var(--s2);color:${prColor};font-weight:600">${s.priority||'Medium'}</span>
            <span style="font-size:10px;padding:2px 8px;border-radius:99px;background:${stBg};color:${stColor};font-weight:700">${stLabel}</span>
          </div>
        </div>

        ${isRejected ? `
          <div style="background:#FEF2F2;border:1px solid rgba(220,38,38,.22);border-radius:var(--r6);padding:6px 9px;margin-top:8px;margin-bottom:6px;display:flex;gap:6px;align-items:flex-start">
            <span style="font-size:11px;flex-shrink:0">⚠️</span>
            <div style="flex:1;min-width:0">
              <div style="font-size:9.5px;font-weight:700;color:var(--red);text-transform:uppercase;letter-spacing:.3px;margin-bottom:1px">${reworking ? 'Sent back \u2014 what to fix' : 'Rejection Reason'}</div>
              <div style="font-size:11.5px;color:var(--t1);line-height:1.45">${esc(s.rejectionReason)}</div>
            </div>
          </div>
        ` : ''}

        ${(isInReview || isApproved) && s.submissionNotes ? `
          <div style="background:#EFF6FF;border:1px solid rgba(37,99,235,.2);border-radius:var(--r6);padding:6px 9px;margin-top:8px;margin-bottom:6px">
            <div style="font-size:9.5px;font-weight:700;color:var(--blue);text-transform:uppercase;letter-spacing:.3px;margin-bottom:1px">Employee's note</div>
            <div style="font-size:11.5px;color:var(--t1);line-height:1.45;white-space:pre-line">${esc(s.submissionNotes)}</div>
          </div>` : ''}
        ${(s.submissionFiles || []).length ? `
          <div style="display:flex;flex-wrap:wrap;gap:5px;margin:4px 0 6px">
            ${s.submissionFiles.map(f => `<button onclick="event.stopPropagation();OmentAPI.openFile('${escAttr(String(f.fileId || ''))}','${escAttr(f.name || 'file')}',true).catch(e=>toast(e.message,'error'))"
              style="padding:3px 9px;border:1px solid var(--b1);border-radius:99px;background:var(--s2);font-size:10.5px;cursor:pointer;font-family:var(--font)">\uD83D\uDCCE ${esc(f.name || 'file')}</button>`).join('')}
          </div>` : ''}

        <!-- Meta row -->
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;font-size:10.5px;color:var(--t3);margin-top:6px">
          <div style="display:flex;align-items:center;gap:4px" title="Created by ${creator?creator.name:(s.createdByName||'Admin')}">
            <div class="avatar" style="background:${creatorColor};width:16px;height:16px;font-size:7px;font-weight:700">${creatorAvatar}</div>
            <span>by <strong style="color:var(--t2)">${creatorLabel}</strong>${!creator?' (admin)':''}</span>
          </div>
          ${assignee ? `
            <div style="display:flex;align-items:center;gap:4px" title="Assigned to ${assignee.name}">
              <svg width="10" height="10" fill="none" viewBox="0 0 24 24" style="color:var(--t3)"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/></svg>
              <span>→ <strong style="color:var(--t2)">${assignee.name.split(' ')[0]}</strong></span>
            </div>
          ` : ''}
          ${(s.timeSpent || s.estimatedTime) ? `
            <div style="display:flex;align-items:center;gap:4px" title="${fmtHours(s.timeSpent||0)} spent of ${fmtHours(s.estimatedTime||0)} estimated">
              <svg width="10" height="10" fill="none" viewBox="0 0 24 24" style="color:${timeOverEst?'var(--red)':'var(--t3)'}"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><polyline points="12 6 12 12 16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
              <strong style="color:${timeOverEst?'var(--red)':'var(--t2)'};font-family:var(--mono)">${fmtHours(s.timeSpent||0)}</strong>
              <span style="color:var(--t4)">/ ${fmtHours(s.estimatedTime||0)}</span>
            </div>
          ` : ''}
          ${s.createdAt ? `<span style="color:var(--t4)">· ${fmtDate(s.createdAt)}</span>` : ''}
          ${isApproved && s.completedAt ? `<span style="color:var(--green)">✓ done ${fmtDate(s.completedAt)}</span>` : ''}
        </div>

        <!-- Actions -->
        <div style="display:flex;gap:5px;margin-top:9px;padding-top:9px;border-top:1px solid var(--b1);flex-wrap:wrap;align-items:center">
          ${isInReview ? `
            <button onclick="approveSubtask(${pid},${deliverableId},${s.id})"
              style="padding:4px 10px;border:1px solid rgba(5,150,105,.3);border-radius:var(--r6);background:#ECFDF5;font-size:10.5px;cursor:pointer;color:var(--green);font-family:var(--font);font-weight:600;transition:.15s"
              onmouseover="this.style.background='var(--green-light)'" onmouseout="this.style.background='#ECFDF5'">✅ Approve</button>
            <button onclick="rejectSubtask(${pid},${deliverableId},${s.id})"
              style="padding:4px 10px;border:1px solid rgba(220,38,38,.3);border-radius:var(--r6);background:#FEF2F2;font-size:10.5px;cursor:pointer;color:var(--red);font-family:var(--font);font-weight:600;transition:.15s"
              onmouseover="this.style.background='var(--red-light)'" onmouseout="this.style.background='#FEF2F2'">✕ Reject</button>
          ` : !isApproved && !isReady ? `
            <button onclick="approveSubtask(${pid},${deliverableId},${s.id})"
              style="padding:4px 10px;border:1px solid rgba(5,150,105,.3);border-radius:var(--r6);background:#ECFDF5;font-size:10.5px;cursor:pointer;color:var(--green);font-family:var(--font);font-weight:600;transition:.15s"
              onmouseover="this.style.background='var(--green-light)'" onmouseout="this.style.background='#ECFDF5'">✅ Approve &amp; Ready to Start</button>
          ` : ''}
          <button onclick="reassignSubtask(${pid},${deliverableId},${s.id})"
            style="padding:4px 10px;border:1px solid var(--b1);border-radius:var(--r6);background:none;font-size:10.5px;cursor:pointer;color:var(--t2);font-family:var(--font);transition:.15s"
            onmouseover="this.style.background='var(--s2)'" onmouseout="this.style.background='none'">↻ Reassign</button>
          <button onclick="openCreateSubtaskModal(${pid},${deliverableId},${s.id})"
            style="padding:4px 10px;border:1px solid var(--b1);border-radius:var(--r6);background:none;font-size:10.5px;cursor:pointer;color:var(--t2);font-family:var(--font);transition:.15s"
            onmouseover="this.style.background='var(--s2)'" onmouseout="this.style.background='none'">Edit</button>
          <button onclick="deleteSubtask(${pid},${deliverableId},${s.id})"
            style="padding:4px 10px;border:1px solid var(--b1);border-radius:var(--r6);background:none;font-size:10.5px;cursor:pointer;color:var(--red);font-family:var(--font);margin-left:auto;transition:.15s"
            onmouseover="this.style.background='#FEF2F2'" onmouseout="this.style.background='none'">Delete</button>
        </div>
      </div>
    </div>
  `;
}

/* Filter setter — sticky per deliverable */
function setSubFilter(pid, deliverableId, filter) {
  const d = STATE.tasks.find(x => x.id === deliverableId);
  if (!d) return;
  d._subFilter = filter;
  openDeliverableDetail(pid, deliverableId);
}

/* Create or edit a sub-task. If subtaskId is passed, edit; otherwise create. */
function openCreateSubtaskModal(pid, deliverableId, subtaskId) {
  const d = STATE.tasks.find(x => x.id === deliverableId);
  if (!d) return;
  if (!Array.isArray(d.subtasks)) d.subtasks = [];
  const editing = subtaskId ? d.subtasks.find(s => s.id === subtaskId) : null;
  const defaultAssignee = editing ? editing.assignee : (d.assignee || (d.assignees && d.assignees[0]) || (STATE.employees[0] && STATE.employees[0].id));

  closeModal();
  setTimeout(() => {
    openModal(editing ? 'Edit Task' : 'Create Task', `
      <div style="font-size:12px;color:var(--t2);margin-bottom:14px;padding:10px 12px;background:var(--s2);border-radius:var(--r8);line-height:1.5">
        ${editing ? '<strong>Editing task in</strong>' : '<strong>Adding task to deliverable</strong>'}: <strong style="color:var(--t1)">${d.title}</strong>
      </div>
      <div class="form-group">
        <label class="form-label">Task Title *</label>
        <input class="form-input" id="st-title" placeholder="e.g. Design hero section mockup" value="${editing?editing.title.replace(/"/g,'&quot;'):''}">
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea class="form-textarea" id="st-desc" rows="2" placeholder="Optional details about what's involved">${editing?(editing.desc||''):''}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Assign To *</label>
        <select class="form-select" id="st-assignee">
          ${STATE.employees.map(e => `<option value="${e.id}" ${e.id===defaultAssignee?'selected':''}>${esc(e.name)} — ${e.role||e.dept||''}</option>`).join('')}
        </select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Priority</label>
          <select class="form-select" id="st-priority">
            <option value="High"   ${editing&&editing.priority==='High'?'selected':''}>High</option>
            <option value="Medium" ${(!editing||editing.priority==='Medium')?'selected':''}>Medium</option>
            <option value="Low"    ${editing&&editing.priority==='Low'?'selected':''}>Low</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-select" id="st-status">
            <option value="In Progress" ${(!editing||editing.status==='In Progress')?'selected':''}>In Progress</option>
            <option value="In Review"   ${editing&&editing.status==='In Review'?'selected':''}>In Review</option>
            <option value="Done"        ${editing&&editing.status==='Done'?'selected':''}>Done</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Estimated Hours</label>
          <input class="form-input" id="st-est" type="number" step="0.25" min="0" value="${editing?(editing.estimatedTime||1):1}">
        </div>
        <div class="form-group">
          <label class="form-label">Time Spent (hours)</label>
          <input class="form-input" id="st-spent" type="number" step="0.25" min="0" value="${editing?(editing.timeSpent||0):0}">
        </div>
      </div>
    `, `
      <button class="btn btn-secondary btn-sm" onclick="closeModal();setTimeout(()=>openDeliverableDetail(${pid},${deliverableId}),180)">Cancel</button>
      <button class="btn btn-primary btn-sm" onclick="saveSubtask(${pid},${deliverableId},${subtaskId||'null'})">${editing?'Save Changes':'Create Task'}</button>
    `);
  }, 180);
}

function saveSubtask(pid, deliverableId, subtaskId) {
  const d = STATE.tasks.find(x => x.id === deliverableId);
  if (!d) return;
  if (!Array.isArray(d.subtasks)) d.subtasks = [];

  const title = (document.getElementById('st-title')?.value || '').trim();
  if (!title) { toast('Task title is required', 'error'); return; }

  const desc        = (document.getElementById('st-desc')?.value || '').trim();
  const assignee    = parseInt(document.getElementById('st-assignee')?.value);
  const priority    = document.getElementById('st-priority')?.value || 'Medium';
  const status      = document.getElementById('st-status')?.value || 'In Progress';
  const estimatedTime = parseFloat(document.getElementById('st-est')?.value) || 0;
  const timeSpent     = parseFloat(document.getElementById('st-spent')?.value) || 0;

  const assigneeName = STATE.employees.find(e => e.id === assignee)?.name || '—';
  const todayStr = new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
  const todayISO = Utils.isoDate(new Date());

  if (subtaskId) {
    // Edit existing
    const s = d.subtasks.find(x => x.id === subtaskId);
    if (!s) return;
    const oldAssignee = s.assignee;
    s.title = title;
    s.desc  = desc;
    s.assignee  = assignee;
    s.assignees = [assignee];
    s.priority  = priority;
    const oldStatus = s.status;
    s.status    = status;
    s.estimatedTime = estimatedTime;
    s.timeSpent     = timeSpent;
    if (status === 'Done' && !s.completedAt) s.completedAt = todayISO;
    if (status !== 'Done') s.completedAt = null;
    if (oldStatus !== status && status !== 'In Progress') s.rejectionReason = null;
    if (!s.timeline) s.timeline = [];
    s.timeline.push({ type:'edit', text:`Task updated${oldAssignee!==assignee?' · Reassigned to '+assigneeName:''}${oldStatus!==status?' · Status: '+status:''}`, time: todayStr });
    toast('Task updated', 'success');
  } else {
    // Create new
    const newId = (d.subtasks.reduce((max,s)=>Math.max(max,s.id||0),0) || 0) + 1;
    d.subtasks.push({
      id: newId,
      title, desc,
      assignee, assignees:[assignee],
      createdBy: null,                // null = admin
      createdByName: 'Rajesh Kumar',
      priority, status,
      timeSpent, estimatedTime,
      createdAt: todayISO,
      completedAt: status === 'Done' ? todayISO : null,
      rejectionReason: null,
      timeline: [{ type:'create', text:`Created by Admin · Assigned to ${assigneeName}`, time: todayStr }]
    });
    if (!d.timeline) d.timeline = [];
    d.timeline.push({ type:'assign', text:`Task "${title}" assigned to ${assigneeName}`, time: todayStr });
    STATE.activityFeed.unshift({
      icon:'📋', color:'#EFF6FF',
      text:`New task <strong>"${title}"</strong> assigned to <strong>${assigneeName}</strong> in <strong>${d.title}</strong>`,
      time:'Just now'
    });
    toast('Task created and assigned', 'success');
  }

  closeModal();
  if (STATE.currentModule === 'project-detail') renderMilestonesTab(pid);
  setTimeout(() => openDeliverableDetail(pid, deliverableId), 180);
}

function approveSubtask(pid, deliverableId, subtaskId) {
  const d = STATE.tasks.find(x => x.id === deliverableId);
  if (!d || !d.subtasks) return;
  const s = d.subtasks.find(x => x.id === subtaskId);
  if (!s) return;

  s.status = 'Done';
  s.rejectionReason = null;
  s.completedAt = Utils.isoDate(new Date());
  const todayStr = new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
  if (!s.timeline) s.timeline = [];
  s.timeline.push({ type:'approve', text:'Task approved by Admin', time: todayStr });

  if (!d.timeline) d.timeline = [];
  d.timeline.push({ type:'approve', text:`Task "${esc(s.title)}" approved`, time: todayStr });

  DataAPI.approveSubtask(s.id).then(syncAndRefresh).catch(function (e) { toast(e.message,'error'); });
  toast(`"${esc(s.title)}" approved`, 'success');

  if (STATE.currentModule === 'project-detail') renderMilestonesTab(pid);
  openDeliverableDetail(pid, deliverableId);
}

function rejectSubtask(pid, deliverableId, subtaskId) {
  const d = STATE.tasks.find(x => x.id === deliverableId);
  if (!d || !d.subtasks) return;
  const s = d.subtasks.find(x => x.id === subtaskId);
  if (!s) return;

  const reason = prompt('Reason for rejection (the assignee will see this):');
  if (reason === null) return;

  s.status = 'In Progress';
  s.rejectionReason = reason || 'Please review and resubmit.';
  s.completedAt = null;
  const todayStr = new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
  if (!s.timeline) s.timeline = [];
  s.timeline.push({ type:'reject', text:'Rejected — '+s.rejectionReason, time: todayStr });

  if (!d.timeline) d.timeline = [];
  d.timeline.push({ type:'reject', text:`Task "${esc(s.title)}" returned for revision`, time: todayStr });

  DataAPI.rejectSubtask(s.id, s.rejectionReason).then(syncAndRefresh).catch(function (e) { toast(e.message,'error'); });
  toast(`"${esc(s.title)}" returned for revision`, 'error');

  if (STATE.currentModule === 'project-detail') renderMilestonesTab(pid);
  openDeliverableDetail(pid, deliverableId);
}

function reassignSubtask(pid, deliverableId, subtaskId) {
  const d = STATE.tasks.find(x => x.id === deliverableId);
  if (!d || !d.subtasks) return;
  const s = d.subtasks.find(x => x.id === subtaskId);
  if (!s) return;

  closeModal();
  setTimeout(() => {
    openModal('Reassign Task', `
      <div style="font-size:12px;color:var(--t2);margin-bottom:14px;padding:10px 12px;background:var(--s2);border-radius:var(--r8);line-height:1.5">
        Reassign task: <strong style="color:var(--t1)">${esc(s.title)}</strong>
      </div>
      <div class="form-group">
        <label class="form-label">New Assignee</label>
        <div style="max-height:280px;overflow-y:auto;border:1px solid var(--b1);border-radius:var(--r8);background:var(--surface)">
          ${STATE.employees.map(e => `
            <label style="display:flex;align-items:center;gap:10px;padding:9px 12px;cursor:pointer;transition:.1s;border-bottom:1px solid var(--b1)" onmouseover="this.style.background='var(--s2)'" onmouseout="this.style.background='transparent'">
              <input type="radio" value="${e.id}" name="sub-reassign" ${e.id===s.assignee?'checked':''} style="width:15px;height:15px;accent-color:var(--blue);cursor:pointer;flex-shrink:0">
              <div class="avatar" style="background:${e.color};width:28px;height:28px;font-size:11px;font-weight:700;flex-shrink:0">${e.avatar}</div>
              <div style="flex:1;min-width:0">
                <div style="font-size:13px;font-weight:600;color:var(--t1)">${esc(e.name)}${e.id===s.assignee?' <span style=\"font-size:10px;color:var(--t3);font-weight:500\">(current)</span>':''}</div>
                <div style="font-size:11px;color:var(--t3)">${e.role||''} · ${e.dept||''}</div>
              </div>
            </label>`).join('')}
        </div>
      </div>
    `, `
      <button class="btn btn-secondary btn-sm" onclick="closeModal();setTimeout(()=>openDeliverableDetail(${pid},${deliverableId}),180)">Cancel</button>
      <button class="btn btn-primary btn-sm" onclick="saveReassignSubtask(${pid},${deliverableId},${subtaskId})">Reassign</button>
    `);
  }, 180);
}

function saveReassignSubtask(pid, deliverableId, subtaskId) {
  const d = STATE.tasks.find(x => x.id === deliverableId);
  if (!d || !d.subtasks) return;
  const s = d.subtasks.find(x => x.id === subtaskId);
  if (!s) return;

  const picked = document.querySelector('input[name="sub-reassign"]:checked');
  if (!picked) { toast('Pick someone first', 'error'); return; }
  const newId = parseInt(picked.value);
  if (newId === s.assignee) {
    closeModal();
    setTimeout(() => openDeliverableDetail(pid, deliverableId), 180);
    return;
  }
  const newName = STATE.employees.find(e => e.id === newId)?.name || '—';
  const oldName = STATE.employees.find(e => e.id === s.assignee)?.name || '—';

  s.assignee  = newId;
  s.assignees = [newId];
  const todayStr = new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
  if (!s.timeline) s.timeline = [];
  s.timeline.push({ type:'assign', text:`Reassigned from ${oldName} to ${newName}`, time: todayStr });

  DataAPI.updateSubtask(s.id, { assigneeId: s.assignee }).then(syncAndRefresh).catch(function (e) { toast(e.message,'error'); });
  toast(`Reassigned to ${newName}`, 'success');

  closeModal();
  if (STATE.currentModule === 'project-detail') renderMilestonesTab(pid);
  setTimeout(() => openDeliverableDetail(pid, deliverableId), 180);
}

function deleteSubtask(pid, deliverableId, subtaskId) {
  const d = STATE.tasks.find(x => x.id === deliverableId);
  if (!d || !d.subtasks) return;
  const s = d.subtasks.find(x => x.id === subtaskId);
  if (!s) return;

  showConfirm(`Delete task "${esc(s.title)}"? This cannot be undone.`, () => {
    d.subtasks = d.subtasks.filter(x => x.id !== subtaskId);
    toast('Task deleted', 'success');
    if (STATE.currentModule === 'project-detail') renderMilestonesTab(pid);
    openDeliverableDetail(pid, deliverableId);
  });
}

/* Add a comment to a deliverable from the detail view */
function addCommentToDeliverable(pid, taskId) {
  const t = STATE.tasks.find(x => x.id === taskId);
  if (!t) return;
  const input = document.getElementById('ddet-new-comment');
  if (!input) return;
  const text = (input.value || '').trim();
  if (!text) { toast('Type a comment first', 'error'); return; }
  DataAPI.addDeliverableComment(taskId, STATE.adminUser.id, text)
    .then(syncAndRefresh).catch(function (err) { toast(err.message, 'error'); });
  if (!Array.isArray(t.messages)) t.messages = [];
  t.messages.push({
    from: STATE.adminUser.id,
    fromName: STATE.adminUser.name,
    text,
    time: new Date().toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})
  });
  if (!t.timeline) t.timeline = [];
  t.timeline.push({ type:'comment', text:`Comment added: "${text.length>50?text.slice(0,50)+'…':text}"`, time:'Just now' });
  toast('Comment posted', 'success');
  // Re-render the detail view to show the new comment
  openDeliverableDetail(pid, taskId);
}