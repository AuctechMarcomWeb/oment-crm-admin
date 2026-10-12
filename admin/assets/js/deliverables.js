/* ============================================================
   DELIVERABLE DETAIL MODAL — comprehensive deep-details view
   Shows: full status, rejection reason, progress, assignees,
          related deliverables (Pending / In Review / Rejected / Approved),
          activity timeline, comments, and all inline actions
          (Approve, Reject, Mark Done, Reassign, Assign New Task, Edit, Delete)
   ============================================================ */
function openDeliverableDetail(pid, taskId) {
  const t = STATE.tasks.find(x => x.id === taskId);
  const p = STATE.projects.find(x => x.id === pid);
  if (!t || !p) return;

  const ms = (p.milestones || []).find(m => m.id === t.milestoneId);
  const assigneeIds = t.assignees && t.assignees.length ? t.assignees : (t.assignee ? [t.assignee] : []);
  const assignees = assigneeIds.map(id => STATE.employees.find(e => e.id === id)).filter(Boolean);

  // ----- Status classification -----
  const isApproved   = t.status === 'Done';
  const isInReview   = t.status === 'In Review';
  const isRejected   = !!t.rejectionReason && t.status !== 'Done';
  const isInProgress = t.status === 'In Progress' && !isRejected;

  const stColor = isApproved ? 'var(--green)' : isRejected ? 'var(--red)' : isInReview ? 'var(--blue)' : 'var(--amber)';
  const stBg    = isApproved ? '#ECFDF5'      : isRejected ? '#FEF2F2'    : isInReview ? '#EFF6FF'    : '#FFFBEB';
  const stIcon  = isApproved ? '✅' : isRejected ? '⚠️' : isInReview ? '👁️' : '🔄';
  const stLabel = isApproved ? 'Approved' : isRejected ? 'Rejected — Needs Revision' : isInReview ? 'In Review' : 'In Progress';
  const stHint  = isApproved ? 'This deliverable has been approved and marked complete.' :
                  isRejected ? 'Returned to the assignee for changes. They need to resubmit.' :
                  isInReview ? 'Submitted for approval. Review the work and approve or reject.' :
                  'Work is in progress. Awaiting submission for review.';

  const prColor = t.priority==='High'?'var(--red)':t.priority==='Medium'?'var(--amber)':'var(--t3)';
  const prBg    = t.priority==='High'?'#FEF2F2':t.priority==='Medium'?'#FFFBEB':'var(--s2)';

  // ----- Date / progress -----
  const today  = new Date(); today.setHours(0,0,0,0);
  const dueD   = t.deadline ? new Date(t.deadline) : null;
  if (dueD) dueD.setHours(0,0,0,0);
  const isPast = dueD && dueD < today && !isApproved;
  const daysRem = dueD ? Math.round((dueD - today)/(1000*60*60*24)) : null;
  const deadColor = isApproved ? 'var(--t3)' : isPast ? 'var(--red)' : (daysRem!==null && daysRem<=3) ? 'var(--amber)' : 'var(--t1)';
  const dueExtra  = isApproved ? '' :
                    isPast ? `<span style="font-size:11px;color:var(--red);font-weight:600;margin-left:4px">⚠ ${Math.abs(daysRem)}d overdue</span>` :
                    daysRem===0 ? `<span style="font-size:11px;color:var(--amber);font-weight:600;margin-left:4px">Due today</span>` :
                    daysRem>0 ? `<span style="font-size:11px;color:${daysRem<=3?'var(--amber)':'var(--t3)'};margin-left:4px">${daysRem}d left</span>` : '';
  const pctDone = isApproved ? 100 : isInReview ? 70 : (t.progress || (isRejected ? 40 : 30));

  // ----- Timeline -----
  const timelineHtml = (t.timeline || []).length ? (t.timeline || []).map(ev => {
    const ic = ev.type==='approve'?'✅':ev.type==='reject'?'❌':ev.type==='submit'?'📤':ev.type==='assign'?'👤':'📋';
    const cl = ev.type==='approve'?'var(--green)':ev.type==='reject'?'var(--red)':ev.type==='submit'?'var(--blue)':'var(--t2)';
    return `<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--b1);align-items:flex-start">
      <div style="width:24px;height:24px;border-radius:50%;background:var(--s2);display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0">${ic}</div>
      <div style="flex:1;min-width:0"><div style="font-size:12.5px;color:var(--t1);line-height:1.4">${ev.text}</div><div style="font-size:11px;color:var(--t3);margin-top:2px">${ev.time}</div></div>
    </div>`;
  }).join('') : `<div style="font-size:12px;color:var(--t3);padding:14px;background:var(--s2);border-radius:var(--r8);text-align:center">No activity recorded yet.</div>`;

  // ----- Comments -----
  const commentsHtml = (t.messages || []).length ? (t.messages || []).map(c => {
    const emp = STATE.employees.find(e => e.id === c.from) || { name: c.fromName || 'Admin', avatar: 'AD', color: 'var(--t1)' };
    return `<div style="display:flex;gap:8px;margin-bottom:10px">
      <div class="avatar avatar-sm" style="background:${emp.color};flex-shrink:0">${emp.avatar}</div>
      <div style="flex:1;min-width:0;background:var(--s2);border-radius:var(--r8);padding:8px 10px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:6px;margin-bottom:2px">
          <span style="font-size:12px;font-weight:600;color:var(--t1)">${esc(emp.name)}</span>
          <span style="font-size:10.5px;color:var(--t3);flex-shrink:0">${c.time||''}</span>
        </div>
        <div style="font-size:12.5px;color:var(--t1);line-height:1.45;word-wrap:break-word">${c.text||''}</div>
      </div>
    </div>`;
  }).join('') : `<div style="font-size:12px;color:var(--t3);padding:10px 12px;background:var(--s2);border-radius:var(--r8);text-align:center">No comments yet — be the first to add one.</div>`;

  // ----- Body HTML -----
  const bodyHTML = `
    <!-- 1) STATUS BANNER -->
    <div style="background:${stBg};border:1px solid ${stColor}33;border-radius:var(--r10);padding:12px 14px;margin-bottom:16px;display:flex;align-items:center;gap:12px">
      <div style="width:40px;height:40px;border-radius:var(--r10);background:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">${stIcon}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:14px;font-weight:700;color:${stColor};line-height:1.2">${stLabel}</div>
        <div style="font-size:12px;color:var(--t2);margin-top:2px;line-height:1.4">${stHint}</div>
      </div>
      <span style="font-size:11px;padding:3px 10px;border-radius:99px;background:${prBg};color:${prColor};font-weight:700;flex-shrink:0">${t.priority} Priority</span>
    </div>

    <!-- 2) OVERVIEW STATS GRID -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px" id="ddet-stats-grid">
      <div style="background:var(--s2);border-radius:var(--r8);padding:10px 12px;border:1px solid var(--b1)">
        <div style="font-size:10px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px">Project</div>
        <div style="font-size:12.5px;font-weight:600;color:var(--t1);line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(p.name)}">${esc(p.name)}</div>
        <div style="font-size:10.5px;color:var(--t3);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.client||''}</div>
      </div>
      <div style="background:var(--s2);border-radius:var(--r8);padding:10px 12px;border:1px solid var(--b1)">
        <div style="font-size:10px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px">Milestone</div>
        <div style="font-size:12.5px;font-weight:600;color:var(--t1);line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${ms?ms.title:'—'}">${ms ? '🎯 '+ms.title : '—'}</div>
        <div style="font-size:10.5px;color:var(--t3);margin-top:2px">${ms&&ms.date?ms.date:'No date'}</div>
      </div>
      <div style="background:var(--s2);border-radius:var(--r8);padding:10px 12px;border:1px solid var(--b1)">
        <div style="font-size:10px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px">Due Date</div>
        <div style="font-size:12.5px;font-weight:600;color:${deadColor};line-height:1.3">${t.deadline ? fmtDate(t.deadline) : '—'}</div>
        <div style="margin-top:2px">${dueExtra || '<span style="font-size:10.5px;color:var(--t3)">On track</span>'}</div>
      </div>
      <div style="background:var(--s2);border-radius:var(--r8);padding:10px 12px;border:1px solid var(--b1)">
        <div style="font-size:10px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px">Effort</div>
        <div style="font-size:12.5px;font-weight:600;color:var(--t1);line-height:1.3">${t.hours||'—'} hrs</div>
        <div style="font-size:10.5px;color:var(--t3);margin-top:2px">Estimated</div>
      </div>
    </div>

    <!-- 3) PROGRESS -->
    <div style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px">
        <span style="color:var(--t3);font-weight:500">Completion</span>
        <span style="font-weight:700;font-family:var(--mono);color:${stColor}">${pctDone}%</span>
      </div>
      <div style="height:8px;background:var(--s3);border-radius:99px;overflow:hidden">
        <div style="height:100%;width:${pctDone}%;background:${stColor};border-radius:99px;transition:.4s"></div>
      </div>
    </div>

    <!-- 4) DESCRIPTION -->
    ${t.desc ? `<div style="margin-bottom:16px">
      <div style="font-size:10.5px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">Description</div>
      <div style="font-size:13px;color:var(--t1);line-height:1.6;padding:12px 14px;background:var(--s2);border-radius:var(--r8);border:1px solid var(--b1)">${esc(t.desc)}</div>
    </div>` : ''}

    <!-- 4b) PIECE-RATE PAY (shared/wallet.js) -->
    ${typeof renderPayPanel === 'function' ? renderPayPanel(pid, t) : ''}

    <!-- 5) REJECTION REASON -->
    ${isRejected ? `<div style="margin-bottom:16px;background:#FEF2F2;border:1px solid rgba(220,38,38,.3);border-radius:var(--r10);padding:12px 14px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span style="font-size:16px">⚠️</span>
        <div style="font-size:11px;font-weight:700;color:var(--red);text-transform:uppercase;letter-spacing:.4px">Rejection Reason</div>
      </div>
      <div style="font-size:13px;color:var(--t1);line-height:1.55">${esc(t.rejectionReason)}</div>
    </div>` : ''}

    <!-- 6) ASSIGNEES -->
    <div style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div style="font-size:10.5px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.4px">Assignees (${assignees.length})</div>
        <button onclick="reassignDeliverable(${pid},${taskId})" style="padding:3px 10px;border:1px solid var(--b2);border-radius:var(--r6);background:var(--surface);font-size:11px;cursor:pointer;color:var(--t2);font-family:var(--font);transition:.15s;font-weight:600;display:inline-flex;align-items:center;gap:4px"
          onmouseover="this.style.background='var(--s2)'" onmouseout="this.style.background='var(--surface)'">
          <svg width="11" height="11" fill="none" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="8.5" cy="7" r="4" stroke="currentColor" stroke-width="2"/><line x1="20" y1="8" x2="20" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="23" y1="11" x2="17" y2="11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          Reassign
        </button>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        ${assignees.length ? assignees.map(e => `
          <div style="display:flex;align-items:center;gap:8px;padding:6px 10px 6px 6px;border:1px solid var(--b1);border-radius:99px;background:var(--surface);cursor:pointer;transition:.15s"
            onmouseover="this.style.background='var(--s2)'" onmouseout="this.style.background='var(--surface)'"
            onclick="closeModal();setTimeout(()=>openEmpDetail(${e.id}),200)">
            <div class="avatar avatar-sm" style="background:${e.color}">${e.avatar}</div>
            <div style="line-height:1.2"><div style="font-size:12.5px;font-weight:600">${esc(e.name)}</div><div style="font-size:10.5px;color:var(--t3)">${e.role||e.dept||''}</div></div>
          </div>`).join('') : '<div style="font-size:12px;color:var(--t3);padding:8px 12px;background:var(--s2);border-radius:var(--r8)">No assignees yet — click <strong>Reassign</strong> to add team members.</div>'}
      </div>
    </div>

    <!-- ESTIMATE REQUEST from the employee: accept, reject or answer with a new time -->
    ${_agreementPanel(t)}

    <!-- SUBMITTED WORK + BRIEF FILES (real files, stored on the server) -->
    ${_delivFilesSection(t)}

    <!-- 7) TASKS — work breakdown done by the assignee / created by admin -->
    ${renderSubtaskSection(pid, taskId)}

    <!-- 8) ACTIVITY TIMELINE -->
    <div style="margin-bottom:16px">
      <div style="font-size:10.5px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px">Activity Timeline</div>
      <div style="background:var(--surface);border:1px solid var(--b1);border-radius:var(--r8);padding:4px 12px">
        ${timelineHtml}
      </div>
    </div>

    <!-- 9) COMMENTS -->
    <div style="margin-bottom:8px">
      <div style="font-size:10.5px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px">Comments (${(t.messages||[]).length})</div>
      <div id="ddet-comments-list" style="margin-bottom:10px">${commentsHtml}</div>
      <div style="display:flex;gap:6px;align-items:flex-start">
        <div class="avatar avatar-sm" style="background:var(--t1);flex-shrink:0">RK</div>
        <input id="ddet-new-comment" type="text" placeholder="Write a comment…" class="form-input" style="flex:1;height:34px" onkeypress="if(event.key==='Enter')addCommentToDeliverable(${pid},${taskId})">
        <button class="btn btn-primary btn-sm" style="height:34px" onclick="addCommentToDeliverable(${pid},${taskId})">Post</button>
      </div>
    </div>
  `;

  // ----- Footer with all actions -----
  const approveBtn = isInReview ? `<button class="btn btn-green btn-sm" onclick="approveDeliverable(${pid},${taskId});setTimeout(()=>{closeModal();},150)">✅ Approve</button>` : '';
  const rejectBtn  = isInReview ? `<button class="btn btn-sm" style="background:#FEF2F2;color:var(--red);border:1px solid rgba(220,38,38,.3)" onclick="rejectDeliverable(${pid},${taskId});setTimeout(()=>{closeModal();},150)">✕ Reject</button>` : '';
  const markDoneBtn = (!isInReview && !isApproved) ? `<button class="btn btn-green btn-sm" onclick="quickUpdateDeliverableStatus(${pid},${taskId})">Mark as Done ✅</button>` : '';
  const submitForReviewBtn = (!isInReview && !isApproved && isInProgress) ? `<button class="btn btn-blue btn-sm" onclick="submitForReview(${pid},${taskId})">📤 Submit for Review</button>` : '';

  const footerHTML = `
    <button class="btn btn-secondary btn-sm" onclick="closeModal()">Close</button>
    <button class="btn btn-secondary btn-sm" onclick="deleteDeliverable(${pid},${taskId})" style="color:var(--red)">🗑 Delete</button>
    <div style="flex:1"></div>
    <button class="btn btn-secondary btn-sm" onclick="closeModal();setTimeout(()=>openEditDeliverableModal(${pid},${taskId}),200)">✏️ Edit</button>
    ${submitForReviewBtn}
    ${markDoneBtn}
    ${rejectBtn}
    ${approveBtn}
  `;

  openModal(t.title, bodyHTML, footerHTML);
  // Widen the modal for this detail view
  const mb = document.querySelector('#modal-overlay .modal-box');
  if (mb) mb.classList.add('modal-wide');

  // Inject responsive layout for the stats grid on narrow screens
  const grid = document.getElementById('ddet-stats-grid');
  if (grid && window.innerWidth < 600) {
    grid.style.gridTemplateColumns = 'repeat(2,1fr)';
  }
}

/* Quick-mark a deliverable as Done from anywhere */
function quickUpdateDeliverableStatus(pid, taskId) {
  const t = STATE.tasks.find(x => x.id === taskId);
  if (!t) return;
  t.status = 'Done'; t.progress = 100; t.rejectionReason = null;
  if (!t.timeline) t.timeline = [];
  t.timeline.push({ type:'approve', text:'Marked as Done by Admin', time: new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) });
  closeModal();
  toast('Deliverable marked as Done ✅', 'success');
  if (STATE.currentModule === 'project-detail') renderMilestonesTab(pid);
  if (typeof renderMilestoneSummary === 'function') renderMilestoneSummary();
}

/* Submit an In-Progress deliverable for review (admin-side quick action) */
function submitForReview(pid, taskId) {
  const t = STATE.tasks.find(x => x.id === taskId);
  if (!t) return;
  DataAPI.submitDeliverable(taskId, { notes: t.submissionNotes }).then(function () {
    syncState();
    closeModal();
    toast(`"${esc(t.title)}" submitted for review`, 'success');
    if (STATE.currentModule === 'project-detail') renderMilestonesTab(pid);
  }).catch(function (err) { toast(err.message, 'error'); });
}

/* Reassign a deliverable — opens picker, supports multiple assignees */
function reassignDeliverable(pid, taskId) {
  const t = STATE.tasks.find(x => x.id === taskId);
  if (!t) return;
  const current = t.assignees && t.assignees.length ? t.assignees : (t.assignee ? [t.assignee] : []);
  closeModal();
  setTimeout(() => {
    openModal('Reassign Deliverable', `
      <div style="font-size:12.5px;color:var(--t2);margin-bottom:14px;padding:10px 12px;background:var(--s2);border-radius:var(--r8);line-height:1.5">
        Select one or more team members for <strong style="color:var(--t1)">${esc(t.title)}</strong>
      </div>
      <div class="form-group">
        <label class="form-label">Team Members</label>
        <div style="max-height:240px;overflow-y:auto;border:1px solid var(--b1);border-radius:var(--r8);background:var(--surface)">
          ${STATE.employees.map(e => `
            <label style="display:flex;align-items:center;gap:10px;padding:9px 12px;cursor:pointer;transition:.1s;border-bottom:1px solid var(--b1)" onmouseover="this.style.background='var(--s2)'" onmouseout="this.style.background='transparent'">
              <input type="checkbox" value="${e.id}" name="reassign-emp" ${current.includes(e.id)?'checked':''} style="width:15px;height:15px;accent-color:var(--blue);cursor:pointer;flex-shrink:0">
              <div class="avatar" style="background:${e.color};width:28px;height:28px;font-size:11px;font-weight:700;flex-shrink:0">${e.avatar}</div>
              <div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600;color:var(--t1)">${esc(e.name)}</div><div style="font-size:11px;color:var(--t3)">${e.role||''} · ${e.dept||''}</div></div>
            </label>`).join('')}
        </div>
      </div>
    `, `
      <button class="btn btn-secondary btn-sm" onclick="closeModal();setTimeout(()=>openDeliverableDetail(${pid},${taskId}),180)">Cancel</button>
      <button class="btn btn-primary btn-sm" onclick="saveReassign(${pid},${taskId})">Save Assignment</button>
    `);
  }, 200);
}

function saveReassign(pid, taskId) {
  const t = STATE.tasks.find(x => x.id === taskId);
  if (!t) return;
  const checked = Array.from(document.querySelectorAll('input[name="reassign-emp"]:checked')).map(cb => parseInt(cb.value));
  if (!checked.length) {
    toast('Select at least one team member', 'error');
    return;
  }
  const oldIds = t.assignees && t.assignees.length ? t.assignees : (t.assignee ? [t.assignee] : []);
  DataAPI.reassignDeliverable(taskId, checked).then(syncAndRefresh)
    .catch(function (err) { toast(err.message, 'error'); });
  // Add timeline entry
  const newNames = checked.map(id => STATE.employees.find(e => e.id === id)?.name).filter(Boolean).join(', ');
  if (!t.timeline) t.timeline = [];
  const isAdd = checked.length > oldIds.length;
  t.timeline.push({
    type: 'assign',
    text: `Reassigned to ${newNames}`,
    time: new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})
  });
  syncState();
  closeModal();
  toast(`Reassigned to ${checked.length} ${checked.length===1?'person':'people'}`, 'success');
  if (STATE.currentModule === 'project-detail') renderMilestonesTab(pid);
  // Reopen detail to show updated assignees
  setTimeout(() => openDeliverableDetail(pid, taskId), 200);
}



/* ── Files on a deliverable: what the employee submitted + the brief ───── */
function _fileRow(f) {
  const kind = (f.kind || f.type || 'doc').toLowerCase();
  const icon = kind === 'pdf' ? '\uD83D\uDCC4' : kind === 'img' ? '\uD83D\uDDBC\uFE0F' : kind === 'zip' ? '\uD83D\uDDDC\uFE0F' : kind === 'xls' ? '\uD83D\uDCCA' : '\uD83D\uDCC3';
  const id = f.fileId ? escAttr(String(f.fileId)) : '';
  const nm = escAttr(f.name || 'file');
  return `<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--b1);border-radius:var(--r8);background:var(--surface);margin-bottom:6px">
    <span style="font-size:18px">${icon}</span>
    <div style="flex:1;min-width:0">
      <div style="font-size:12.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(f.name || 'file')}</div>
      <div style="font-size:11px;color:var(--t3)">${esc(f.sizeLabel || f.size || '')}${f.uploadedAt ? ' \u00b7 ' + esc(new Date(f.uploadedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })) : ''}</div>
    </div>
    ${f.fileId
      ? `<button class="btn btn-secondary btn-xs" onclick="openStoredFile('${id}','${nm}',0)">View</button>
         <button class="btn btn-secondary btn-xs" onclick="openStoredFile('${id}','${nm}',1)">Download</button>`
      : '<span style="font-size:11px;color:var(--t3)">added before uploads were connected</span>'}
  </div>`;
}

function _delivFilesSection(t) {
  const sub = (t.submissionFiles || []).filter(Boolean);
  const brief = (t.files || []).filter(Boolean);
  if (!sub.length && !brief.length && !t.submissionNotes) return '';
  return `<div style="margin-bottom:16px">
    ${sub.length || t.submissionNotes ? `
      <div style="font-size:10.5px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px">Submitted work (${sub.length} file${sub.length === 1 ? '' : 's'})</div>
      ${sub.map(_fileRow).join('')}
      ${t.submissionNotes ? `<div style="font-size:12.5px;color:var(--t2);background:var(--s2);padding:10px 12px;border-radius:var(--r8);margin-top:4px;white-space:pre-wrap"><strong>Note from the employee:</strong> ${esc(t.submissionNotes)}</div>` : ''}` : ''}
    ${brief.length ? `
      <div style="font-size:10.5px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.4px;margin:12px 0 8px">Brief files (${brief.length})</div>
      ${brief.map(_fileRow).join('')}` : ''}
  </div>`;
}

function openStoredFile(fileId, name, download) {
  if (!window.OmentAPI || !OmentAPI.openFile) { toast('File storage needs the backend server', 'error'); return; }
  OmentAPI.openFile(fileId, name, !!download).catch(function (err) { toast(err.message || 'Could not open the file', 'error'); });
}


/* ── Estimate requests: the employee asked for more time (or flagged the
      estimate as unrealistic). The admin decides here. ───────────────── */
function _agreementPanel(t) {
  const raw = (DataAPI.raw().deliverables || []).find(d => d.id === t.id);
  const a = raw && raw.agreement;
  if (!a || (a.state !== 'COUNTERED' && a.state !== 'FLAGGED')) return '';
  const hrs = s => { s = Number(s) || 0; const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60); return h + 'h' + (m ? ' ' + m + 'm' : ''); };
  const who = (raw.assigneeIds || []).map(id => (STATE.employees.find(e => e.id === id) || {}).name).filter(Boolean).join(', ') || 'The employee';
  const flagged = a.state === 'FLAGGED';
  return `<div style="border:1px solid ${flagged ? 'rgba(220,38,38,.3)' : 'rgba(217,119,6,.35)'};background:${flagged ? '#FEF2F2' : '#FFFBEB'};border-radius:12px;padding:14px 16px;margin-bottom:16px">
    <div style="font-size:11px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:${flagged ? 'var(--red)' : 'var(--amber)'};margin-bottom:6px">
      ${flagged ? '\uD83D\uDEA9 Estimate flagged as unrealistic' : '\u23F1 Request for more time'} \u2014 waiting for you</div>
    <div style="font-size:14px;line-height:1.55;color:var(--t1)">
      ${flagged
        ? `<strong>${esc(who)}</strong> says the estimate of <strong>${hrs(a.adminSecs || raw.estimateSecs)}</strong> is not realistic.`
        : `<strong>${esc(who)}</strong> asks for <strong>${hrs(a.employeeSecs)}</strong> instead of your <strong>${hrs(a.adminSecs || raw.estimateSecs)}</strong>.`}
    </div>
    ${(a.note || a.flagReason) ? `<div style="font-size:13px;color:var(--t2);margin-top:6px;background:rgba(255,255,255,.7);padding:8px 10px;border-radius:8px"><strong>Reason:</strong> ${esc(a.note || a.flagReason)}</div>` : ''}
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
      ${a.state === 'COUNTERED' ? `<button class="btn btn-sm" style="background:var(--green);color:#fff" onclick="delivAcceptEstimate(${raw.id})">\u2713 Accept ${hrs(a.employeeSecs)}</button>` : ''}
      <button class="btn btn-secondary btn-sm" onclick="delivKeepEstimate(${raw.id})">\u2715 Reject \u2014 keep ${hrs(a.adminSecs || raw.estimateSecs)}</button>
      <button class="btn btn-secondary btn-sm" onclick="closeModal();setTimeout(function(){poCounter(${raw.id})},150)">Propose another time</button>
    </div>
  </div>`;
}

function _reopenDeliv(id) {
  const d = (DataAPI.raw().deliverables || []).find(x => x.id === id);
  syncState(); refreshView();
  if (d) openDeliverableDetail(d.projectId, d.id);
}
function delivAcceptEstimate(id) {
  Wallet.acceptProposal(id).then(function () { toast('New time accepted \u2014 the employee can start', 'success'); _reopenDeliv(id); })
    .catch(function (e) { toast(e.message, 'error'); });
}
function delivKeepEstimate(id) {
  const d = (DataAPI.raw().deliverables || []).find(x => x.id === id);
  if (!d || !d.agreement) return;
  const secs = d.agreement.adminSecs || d.estimateSecs;
  const note = window.prompt('Reason for keeping the original time (the employee sees this):', 'The original estimate stays.');
  if (note === null) return;
  Wallet.counterEstimate(id, secs, note || 'The original estimate stays.')
    .then(function () { toast('Sent \u2014 the employee can accept the original time', 'success'); _reopenDeliv(id); })
    .catch(function (e) { toast(e.message, 'error'); });
}