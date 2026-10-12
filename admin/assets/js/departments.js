/* ============================================================
   DEPARTMENTS MODULE
   ============================================================ */
function renderDepartments() {
  const grid = document.getElementById('dept-cards');
  if (!STATE.departments.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🏢</div><div class="empty-title">No departments yet</div><div class="empty-sub">Create your first department to get started</div></div>`;
    return;
  }
  grid.innerHTML = STATE.departments.map(d => {
    const emps = STATE.employees.filter(e=>e.dept===d.name);
    const avatarsHTML = emps.slice(0,4).map(e=>`<div class="avatar avatar-sm" style="background:${e.color}" title="${esc(e.name)}">${e.avatar}</div>`).join('') + (emps.length>4?`<div class="avatar avatar-sm" style="background:var(--s4);color:var(--t2);font-size:9px">+${emps.length-4}</div>`:'');
    const scoreColor = d.score>=90?'var(--green)':d.score>=75?'var(--blue)':'var(--amber)';
    return `<div class="card card-pad" data-open="openDeptTeamPanel(${d.id})">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
        <div style="width:40px;height:40px;border-radius:var(--r10);background:${d.color}20;display:flex;align-items:center;justify-content:center;font-size:20px">🏢</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:16px;font-weight:700;color:var(--t1)">${esc(d.name)}</div>
          <div style="font-size:12px;color:var(--t3)">${emps.length} employee${emps.length!==1?'s':''}</div>
        </div>
        <button class="btn btn-sm" style="background:${d.color};color:white;border:none;flex-shrink:0" onclick="openAddEmpToDept('${esc(d.name)}')">
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
          Add
        </button>
      </div>
      <div style="font-size:12.5px;color:var(--t2);margin-bottom:12px">${esc(d.desc)}</div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:12px;flex-wrap:wrap">
        ${avatarsHTML}
        ${emps.length===0?'<span style="font-size:12px;color:var(--t4);font-style:italic">No employees yet</span>':''}
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <span style="font-size:12px;color:var(--t3)">Head: <strong style="color:var(--t1)">${esc(d.head)}</strong></span>
        <span style="font-size:12px;color:var(--t3)">${d.activeTasks} tasks</span>
      </div>
      <div style="margin-bottom:12px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
          <span style="font-size:11.5px;color:var(--t3)">Performance</span>
          <span style="font-size:12px;font-weight:700;color:${scoreColor}">${d.score}/100</span>
        </div>
        <div style="height:4px;background:var(--s3);border-radius:2px"><div style="height:100%;width:${d.score}%;background:${scoreColor};border-radius:2px"></div></div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary btn-sm" style="flex:1;justify-content:center" onclick="openDeptTeamPanel(${d.id})">
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="1.8"/><path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          View Team
        </button>
        <button class="btn btn-primary btn-sm" style="flex:1;justify-content:center" onclick="openEditDeptPanel(${d.id})">Manage</button>
      </div>
    </div>`;
  }).join('');
}

function openCreateDeptPanel() {
  const colors = ['#2563EB','#7C3AED','#059669','#D97706','#DC2626','#0891B2','#BE185D','#EA580C'];
  openPanel('Create New Department', `
    <div class="form-group">
      <label class="form-label">Department Name *</label>
      <input class="form-input" id="dept-name" placeholder="e.g. Marketing">
      <div class="form-error" id="dept-name-err">Please enter a department name</div>
    </div>
    <div class="form-group">
      <label class="form-label">Department Head *</label>
      <select class="form-select" id="dept-head">
        <option value="">Select employee</option>
        ${STATE.employees.map(e=>`<option value="${e.id}">${esc(e.name)}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Description</label>
      <textarea class="form-textarea" id="dept-desc" placeholder="Brief description of this department's role…"></textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Color Tag</label>
      <div class="color-tags" id="color-tags">
        ${colors.map((c,i)=>`<div class="color-tag${i===0?' selected':''}" style="background:${c}" data-color="${c}" onclick="selectColor(this)"></div>`).join('')}
      </div>
    </div>
  `, `<button class="btn btn-secondary" onclick="closePanel()">Cancel</button><button class="btn btn-primary" onclick="saveDept()">Save Department</button>`);
}

function selectColor(el) {
  document.querySelectorAll('.color-tag').forEach(c=>c.classList.remove('selected'));
  el.classList.add('selected');
}

function saveDept() {
  const name = document.getElementById('dept-name')?.value?.trim();
  if (!name) { document.getElementById('dept-name').classList.add('input-error'); document.getElementById('dept-name-err').classList.add('show'); return; }
  const headId = parseInt(document.getElementById('dept-head').value);
  const head = STATE.employees.find(e=>e.id===headId);
  const desc = document.getElementById('dept-desc').value;
  const color = document.querySelector('.color-tag.selected')?.dataset.color || '#2563EB';
  DataAPI.createDepartment({ name: name, headId: headId, description: desc, color: color })
    .then(syncAndRefresh).catch(function (e) { toast(e.message, 'error'); });
  closePanel();
  renderDepartments();
  toast(`Department "${name}" created`, 'success');
  // Update activity
  STATE.activityFeed.unshift({ icon:'🏢', color:'#EFF6FF', text:`<strong>New department</strong> "${name}" created`, time:'Just now' });
}

function openEditDeptPanel(id) {
  const d = STATE.departments.find(x=>x.id===id);
  if (!d) return;
  const emps = STATE.employees.filter(e=>e.dept===d.name);
  openPanel(`Manage: ${esc(d.name)}`, `
    <div class="form-group"><label class="form-label">Department Name</label><input class="form-input" id="edit-dept-name" value="${esc(d.name)}"></div>
    <div class="form-group"><label class="form-label">Department Head</label><select class="form-select" id="edit-dept-head">${STATE.employees.map(e=>`<option value="${e.id}"${e.id===d.headId?' selected':''}>${esc(e.name)}</option>`).join('')}</select></div>
    <div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="edit-dept-desc">${esc(d.desc)}</textarea></div>
    <div class="divider"></div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <div style="font-size:13px;font-weight:650;color:var(--t1)">Team Members <span style="font-size:11px;font-weight:400;color:var(--t3);margin-left:4px">${emps.length} people</span></div>
      <button class="btn btn-primary btn-sm" onclick="openAddEmpToDept('${esc(d.name)}')">
        <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
        Add Employee
      </button>
    </div>
    ${emps.length ? emps.map(e=>`
      <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--b1)">
        <div class="avatar avatar-sm" style="background:${e.color}">${e.avatar}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:550;color:var(--t1)">${esc(e.name)}</div>
          <div style="font-size:11.5px;color:var(--t3)">${esc(e.role)}</div>
        </div>
        <span style="font-size:10.5px;padding:2px 7px;border-radius:999px;background:${e.status==='Present'?'var(--green-light)':e.status==='Absent'?'var(--red-light)':'var(--amber-light)'};color:${e.status==='Present'?'var(--green)':e.status==='Absent'?'var(--red)':'var(--amber)'}">${e.status}</span>
      </div>`).join('') : `<div style="text-align:center;padding:16px 0;color:var(--t3);font-size:13px">No employees in this department yet</div>`}
    <div class="divider"></div>
    <div style="display:flex;gap:16px">
      <div><div style="font-size:24px;font-weight:700;color:var(--t1)">${emps.length}</div><div style="font-size:12px;color:var(--t3)">Employees</div></div>
      <div><div style="font-size:24px;font-weight:700;color:var(--t1)">${d.activeTasks}</div><div style="font-size:12px;color:var(--t3)">Active Tasks</div></div>
      <div><div style="font-size:24px;font-weight:700;color:var(--green)">${d.score}</div><div style="font-size:12px;color:var(--t3)">Score</div></div>
    </div>
  `, `<button class="btn btn-danger btn-sm" onclick="showConfirm('Delete this department?', ()=>{deleteDept(${id})})">Delete</button><div style="flex:1"></div><button class="btn btn-secondary" onclick="closePanel()">Cancel</button><button class="btn btn-primary" onclick="updateDept(${id})">Save Changes</button>`);
}

function updateDept(id) {
  const d = STATE.departments.find(x=>x.id===id);
  if (!d) return;
  const name = document.getElementById('edit-dept-name').value.trim();
  if (!name) { toast('Department name is required', 'error'); return; }
  DataAPI.updateDepartment(id, {
    name: name,
    headId: parseInt(document.getElementById('edit-dept-head').value) || null,
    description: document.getElementById('edit-dept-desc').value
  }).then(function () {
    syncState();
    closePanel();
    renderDepartments();
    toast('Department updated', 'success');
  }).catch(function (err) { toast(err.message, 'error'); });
}

function deleteDept(id) {
  DataAPI.deleteDepartment(id).then(syncAndRefresh).catch(function (e) { toast(e.message, 'error'); });
  closePanel();
  renderDepartments();
  toast('Department deleted', 'error');
}

/* ── Department Team Panel ── */
function openDeptTeamPanel(deptId) {
  const d = STATE.departments.find(x=>x.id===deptId);
  if (!d) return;

  function memberRow(e) {
    const sc = e.status==='Present'?'var(--green)':e.status==='Absent'?'var(--red)':'var(--amber)';
    const sb = e.status==='Present'?'var(--green-light)':e.status==='Absent'?'var(--red-light)':'var(--amber-light)';
    return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--b1)">
      <div class="avatar" style="background:${e.color};flex-shrink:0">${e.avatar}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600;color:var(--t1)">${esc(e.name)}</div>
        <div style="font-size:11.5px;color:var(--t3)">${esc(e.role)}</div>
      </div>
      <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
        <span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;background:${sb};color:${sc}">${e.status}</span>
        <button class="icon-btn" style="width:28px;height:28px;border-radius:var(--r6)" title="Edit" onclick="closePanel();openEditEmpModal(${e.id})">
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <button class="icon-btn" style="width:28px;height:28px;border-radius:var(--r6);color:var(--red)" title="Remove" onclick="removeEmpFromDept(${e.id},'${esc(d.name)}',${deptId})">
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8.5" cy="7" r="4" stroke="currentColor" stroke-width="1.8"/><line x1="23" y1="11" x2="17" y2="11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        </button>
      </div>
    </div>`;
  }

  function buildMembersTab() {
    const emps = STATE.employees.filter(e=>e.dept===d.name);
    return emps.length
      ? emps.map(memberRow).join('')
      : `<div class="empty-state" style="padding:32px 0"><div class="empty-icon">👥</div><div class="empty-title">No members yet</div><div class="empty-sub">Use "Add Existing" to pick from your team</div></div>`;
  }

  function buildPickerTab(query='') {
    const already = new Set(STATE.employees.filter(e=>e.dept===d.name).map(e=>e.id));
    const pool = STATE.employees.filter(e =>
      e.dept !== d.name &&
      (!query || e.name.toLowerCase().includes(query.toLowerCase()) || e.role.toLowerCase().includes(query.toLowerCase()) || (e.dept||'').toLowerCase().includes(query.toLowerCase()))
    );
    if (!pool.length) return `<div class="empty-state" style="padding:32px 0"><div class="empty-icon">🔍</div><div class="empty-title">${query?'No results found':'Everyone is already here!'}</div></div>`;

    // Group by current dept
    const grouped = {};
    pool.forEach(e => { const g = e.dept||'Unassigned'; if(!grouped[g]) grouped[g]=[]; grouped[g].push(e); });

    return Object.entries(grouped).map(([grp, members]) => `
      <div style="font-size:10.5px;font-weight:600;color:var(--t4);text-transform:uppercase;letter-spacing:0.5px;padding:10px 0 4px">${grp}</div>
      ${members.map(e => {
        const checked = document.getElementById('picker-chk-'+e.id)?.checked || false;
        return `<label style="display:flex;align-items:center;gap:12px;padding:10px 8px;border-radius:var(--r8);cursor:pointer;transition:background .12s" onmouseover="this.style.background='var(--s2)'" onmouseout="this.style.background='transparent'">
          <input type="checkbox" id="picker-chk-${e.id}" value="${e.id}" style="width:18px;height:18px;accent-color:var(--blue);cursor:pointer;flex-shrink:0" onchange="updatePickerCount()">
          <div class="avatar avatar-sm" style="background:${e.color};flex-shrink:0">${e.avatar}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:550;color:var(--t1)">${esc(e.name)}</div>
            <div style="font-size:11.5px;color:var(--t3)">${esc(e.role)} · ${e.dept||'Unassigned'}</div>
          </div>
          <svg width="14" height="14" id="picker-tick-${e.id}" fill="none" viewBox="0 0 24 24" style="display:none;color:var(--blue);flex-shrink:0"><polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </label>`;
      }).join('')}
    `).join('');
  }

  const panelBody = `
    <!-- Tab bar -->
    <div style="display:flex;border-bottom:1px solid var(--b1);margin-bottom:16px">
      <div id="dtp-tab-members" onclick="deptPanelTab('members',${deptId})" style="padding:8px 16px;font-size:13px;font-weight:550;color:var(--t1);border-bottom:2px solid var(--t1);cursor:pointer;margin-bottom:-1px">
        Members <span id="dtp-members-count" style="font-size:11px;background:var(--s3);color:var(--t2);padding:1px 6px;border-radius:999px;margin-left:4px">${STATE.employees.filter(e=>e.dept===d.name).length}</span>
      </div>
      <div id="dtp-tab-picker" onclick="deptPanelTab('picker',${deptId})" style="padding:8px 16px;font-size:13px;font-weight:500;color:var(--t3);border-bottom:2px solid transparent;cursor:pointer;margin-bottom:-1px">
        Add Existing
        <span style="font-size:11px;background:var(--blue-light);color:var(--blue);padding:1px 6px;border-radius:999px;margin-left:4px">${STATE.employees.filter(e=>e.dept!==d.name).length} available</span>
      </div>
    </div>

    <!-- Members tab -->
    <div id="dtp-pane-members">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div style="font-size:12px;color:var(--t3)">Head: <strong style="color:var(--t1)">${esc(d.head)}</strong></div>
        <button class="btn btn-sm" style="background:var(--s2);color:var(--t2);border:1px solid var(--b2)" onclick="openAddEmpToDept('${esc(d.name)}')">
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
          New Employee
        </button>
      </div>
      <div id="dept-team-list">${buildMembersTab()}</div>
    </div>

    <!-- Picker tab (hidden by default) -->
    <div id="dtp-pane-picker" style="display:none">
      <div style="position:relative;margin-bottom:12px">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--t4)"><circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/><path d="m21 21-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        <input id="dtp-search" type="text" placeholder="Search by name, role, department…"
          style="width:100%;height:38px;background:var(--s2);border:1px solid var(--b1);border-radius:var(--r8);padding:0 12px 0 34px;font-size:13px;color:var(--t1);outline:none;font-family:var(--font);box-sizing:border-box"
          oninput="deptPickerSearch(${deptId})" onfocus="this.style.borderColor='var(--blue)'" onblur="this.style.borderColor='var(--b1)'">
      </div>
      <!-- Selected chips strip -->
      <div id="dtp-chips" style="display:flex;flex-wrap:wrap;gap:6px;min-height:0;margin-bottom:4px"></div>
      <div id="dtp-picker-list" style="max-height:340px;overflow-y:auto">${buildPickerTab()}</div>
    </div>
  `;

  const panelFooter = `
    <button class="btn btn-secondary" onclick="closePanel()">Close</button>
    <div id="dtp-add-btn-wrap" style="display:none;flex:1;display:none">
      <button class="btn btn-primary" style="width:100%" id="dtp-add-btn" onclick="confirmAddExistingToDept(${deptId})">
        Add Selected to ${esc(d.name)}
      </button>
    </div>
    <button class="btn btn-primary" id="dtp-manage-btn" onclick="openEditDeptPanel(${deptId})">Edit Dept</button>
  `;

  openPanel(`${esc(d.name)} — Team`, panelBody, panelFooter);

  // Store current deptId for picker helpers
  window._pickerDeptId = deptId;
}

/* helpers for dept team panel tabs */
function deptPanelTab(tab, deptId) {
  const d = STATE.departments.find(x=>x.id===deptId);
  const memTab = document.getElementById('dtp-tab-members');
  const picTab = document.getElementById('dtp-tab-picker');
  const memPane = document.getElementById('dtp-pane-members');
  const picPane = document.getElementById('dtp-pane-picker');
  const addBtnWrap = document.getElementById('dtp-add-btn-wrap');
  const manageBtn = document.getElementById('dtp-manage-btn');
  if (!memTab) return;
  if (tab === 'members') {
    memTab.style.cssText = 'padding:8px 16px;font-size:13px;font-weight:550;color:var(--t1);border-bottom:2px solid var(--t1);cursor:pointer;margin-bottom:-1px';
    picTab.style.cssText = 'padding:8px 16px;font-size:13px;font-weight:500;color:var(--t3);border-bottom:2px solid transparent;cursor:pointer;margin-bottom:-1px';
    memPane.style.display = '';
    picPane.style.display = 'none';
    if (addBtnWrap) addBtnWrap.style.display = 'none';
    if (manageBtn) manageBtn.style.display = '';
  } else {
    picTab.style.cssText = 'padding:8px 16px;font-size:13px;font-weight:550;color:var(--t1);border-bottom:2px solid var(--t1);cursor:pointer;margin-bottom:-1px';
    memTab.style.cssText = 'padding:8px 16px;font-size:13px;font-weight:500;color:var(--t3);border-bottom:2px solid transparent;cursor:pointer;margin-bottom:-1px';
    memPane.style.display = 'none';
    picPane.style.display = '';
    updatePickerCount();
    if (manageBtn) manageBtn.style.display = 'none';
  }
}

function deptPickerSearch(deptId) {
  const d = STATE.departments.find(x=>x.id===deptId);
  if (!d) return;
  const q = document.getElementById('dtp-search')?.value || '';
  const pool = STATE.employees.filter(e =>
    e.dept !== d.name &&
    (!q || e.name.toLowerCase().includes(q.toLowerCase()) || e.role.toLowerCase().includes(q.toLowerCase()) || (e.dept||'').toLowerCase().includes(q.toLowerCase()))
  );
  const listEl = document.getElementById('dtp-picker-list');
  if (!listEl) return;
  if (!pool.length) { listEl.innerHTML = `<div class="empty-state" style="padding:32px 0"><div class="empty-icon">🔍</div><div class="empty-title">No results for "${q}"</div></div>`; return; }
  const grouped = {};
  pool.forEach(e => { const g = e.dept||'Unassigned'; if(!grouped[g]) grouped[g]=[]; grouped[g].push(e); });
  listEl.innerHTML = Object.entries(grouped).map(([grp, members]) => `
    <div style="font-size:10.5px;font-weight:600;color:var(--t4);text-transform:uppercase;letter-spacing:0.5px;padding:10px 0 4px">${grp}</div>
    ${members.map(e => `
      <label style="display:flex;align-items:center;gap:12px;padding:10px 8px;border-radius:var(--r8);cursor:pointer;transition:background .12s" onmouseover="this.style.background='var(--s2)'" onmouseout="this.style.background='transparent'">
        <input type="checkbox" id="picker-chk-${e.id}" value="${e.id}" style="width:18px;height:18px;accent-color:var(--blue);cursor:pointer;flex-shrink:0" onchange="updatePickerCount()">
        <div class="avatar avatar-sm" style="background:${e.color};flex-shrink:0">${e.avatar}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:550;color:var(--t1)">${esc(e.name)}</div>
          <div style="font-size:11.5px;color:var(--t3)">${esc(e.role)} · ${e.dept||'Unassigned'}</div>
        </div>
      </label>`).join('')}
  `).join('');
  updatePickerCount();
}

function updatePickerCount() {
  const checked = [...document.querySelectorAll('[id^="picker-chk-"]:checked')];
  const chipsEl = document.getElementById('dtp-chips');
  const addBtnWrap = document.getElementById('dtp-add-btn-wrap');
  const addBtn = document.getElementById('dtp-add-btn');
  if (!chipsEl) return;

  // Render avatar chips for selected
  chipsEl.innerHTML = checked.map(chk => {
    const emp = STATE.employees.find(e=>e.id==chk.value);
    if (!emp) return '';
    return `<div style="display:flex;align-items:center;gap:5px;background:var(--blue-light);border:1px solid var(--blue);border-radius:999px;padding:3px 10px 3px 4px">
      <div class="avatar" style="background:${emp.color};width:20px;height:20px;font-size:8px;flex-shrink:0">${emp.avatar}</div>
      <span style="font-size:12px;font-weight:550;color:var(--blue)">${emp.name.split(' ')[0]}</span>
      <span onclick="uncheckPicker(${emp.id})" style="margin-left:2px;cursor:pointer;color:var(--blue);font-size:14px;line-height:1">&times;</span>
    </div>`;
  }).join('');
  chipsEl.style.marginBottom = checked.length ? '10px' : '0';

  // Show/hide add button
  if (addBtnWrap) {
    addBtnWrap.style.display = checked.length ? 'flex' : 'none';
    addBtnWrap.style.flex = checked.length ? '1' : '';
  }
  if (addBtn) {
    const d = STATE.departments.find(x=>x.id===window._pickerDeptId);
    addBtn.textContent = checked.length > 1
      ? `Add ${checked.length} people to ${d?.name}`
      : checked.length === 1
        ? `Add ${STATE.employees.find(e=>e.id==checked[0].value)?.name?.split(' ')[0]} to ${d?.name}`
        : '';
  }
}

function uncheckPicker(empId) {
  const chk = document.getElementById('picker-chk-'+empId);
  if (chk) { chk.checked = false; updatePickerCount(); }
}

function confirmAddExistingToDept(deptId) {
  const d = STATE.departments.find(x=>x.id===deptId);
  if (!d) return;
  const checked = [...document.querySelectorAll('[id^="picker-chk-"]:checked')];
  if (!checked.length) return;
  const names = [];
  checked.forEach(chk => {
    const emp = STATE.employees.find(e=>e.id==chk.value);
    if (emp) { emp.dept = d.name; names.push(emp.name); }
  });
  Promise.all(checked.map(function (chk) {
    return DataAPI.updateEmployee(parseInt(chk.value), { deptId: d.id });
  })).then(syncAndRefresh).catch(function (err) { toast(err.message, 'error'); });
  // Refresh members tab
  const teamListEl = document.getElementById('dept-team-list');
  if (teamListEl) {
    const emps = STATE.employees.filter(e=>e.dept===d.name);
    teamListEl.innerHTML = emps.map(e => {
      const sc = e.status==='Present'?'var(--green)':e.status==='Absent'?'var(--red)':'var(--amber)';
      const sb = e.status==='Present'?'var(--green-light)':e.status==='Absent'?'var(--red-light)':'var(--amber-light)';
      return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--b1)">
        <div class="avatar" style="background:${e.color};flex-shrink:0">${e.avatar}</div>
        <div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600;color:var(--t1)">${esc(e.name)}</div><div style="font-size:11.5px;color:var(--t3)">${esc(e.role)}</div></div>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
          <span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;background:${sb};color:${sc}">${e.status}</span>
          <button class="icon-btn" style="width:28px;height:28px;border-radius:var(--r6)" onclick="closePanel();openEditEmpModal(${e.id})"><svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="1.8"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="1.8"/></svg></button>
          <button class="icon-btn" style="width:28px;height:28px;border-radius:var(--r6);color:var(--red)" onclick="removeEmpFromDept(${e.id},'${esc(d.name)}',${deptId})"><svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="1.8"/><circle cx="8.5" cy="7" r="4" stroke="currentColor" stroke-width="1.8"/><line x1="23" y1="11" x2="17" y2="11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
        </div>
      </div>`;
    }).join('');
  }
  // Update member count badge
  const countEl = document.getElementById('dtp-members-count');
  if (countEl) countEl.textContent = STATE.employees.filter(e=>e.dept===d.name).length;
  // Switch back to members tab
  deptPanelTab('members', deptId);
  renderDepartments();
  toast(names.length === 1 ? `${names[0]} added to ${esc(d.name)}` : `${names.length} people added to ${esc(d.name)}`, 'success');
}

/* Employee ko dept se hatao — DataAPI ke through */
function removeEmpFromDept(empId, deptName, deptId) {
  const emp = STATE.employees.find(e=>e.id===empId);
  if (!emp) return;
  showConfirm(`Remove ${esc(emp.name)} from ${deptName}?`, () => {
    emp.dept = '';
    DataAPI.updateEmployee(empId, { deptId: null }).then(syncAndRefresh)
      .catch(function (err) { toast(err.message, 'error'); });
    // Refresh the panel list live
    const listEl = document.getElementById('dept-team-list');
    if (listEl) {
      const d = STATE.departments.find(x=>x.id===deptId);
      if (d) {
        const emps = STATE.employees.filter(e=>e.dept===d.name);
        listEl.innerHTML = emps.length
          ? emps.map(e => {
              const sc = e.status==='Present'?'var(--green)':e.status==='Absent'?'var(--red)':'var(--amber)';
              const sb = e.status==='Present'?'var(--green-light)':e.status==='Absent'?'var(--red-light)':'var(--amber-light)';
              return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--b1)">
                <div class="avatar" style="background:${e.color};flex-shrink:0">${e.avatar}</div>
                <div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600;color:var(--t1)">${esc(e.name)}</div><div style="font-size:11.5px;color:var(--t3)">${esc(e.role)}</div></div>
                <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
                  <span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;background:${sb};color:${sc}">${e.status}</span>
                  <button class="icon-btn" style="width:28px;height:28px;border-radius:var(--r6)" onclick="closePanel();openEditEmpModal(${e.id})"><svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
                  <button class="icon-btn" style="width:28px;height:28px;border-radius:var(--r6);color:var(--red)" onclick="removeEmpFromDept(${e.id},'${esc(d.name)}',${deptId})"><svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8.5" cy="7" r="4" stroke="currentColor" stroke-width="1.8"/><line x1="23" y1="11" x2="17" y2="11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
                </div>
              </div>`;
            }).join('')
          : `<div class="empty-state" style="padding:24px 0"><div class="empty-icon">👥</div><div class="empty-title">No employees yet</div></div>`;
        // Update panel title
        const titleEl = document.querySelector('.panel-title');
        if (titleEl) titleEl.textContent = `${esc(d.name)} — Team (${emps.length})`;
      }
    }
    renderDepartments();
    toast(`${esc(emp.name)} removed from ${deptName}`, 'success');
  });
}

/* ── Add Employee directly to a specific department ── */
function openAddEmpToDept(deptName) {
  // Close any open panel first so modal shows on top
  closePanel();
  openModal('Add Employee to ' + deptName, `
    <div style="display:flex;align-items:center;justify-content:center;margin-bottom:20px">
      <div class="avatar avatar-xl" style="background:var(--s3);color:var(--t3)">?</div>
    </div>
    <div style="background:var(--blue-light);border-radius:var(--r8);padding:8px 12px;margin-bottom:16px;display:flex;align-items:center;gap:8px">
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" stroke="var(--blue)" stroke-width="1.8"/><polyline points="13 2 13 9 20 9" stroke="var(--blue)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <span style="font-size:12.5px;color:var(--blue);font-weight:550">Will be added to <strong>${deptName}</strong> department</span>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Full Name *</label><input class="form-input" id="ade-name" placeholder="e.g. Rahul Verma"><div class="form-error" id="ade-name-err">Required</div></div>
      <div class="form-group"><label class="form-label">Email *</label><input class="form-input" id="ade-email" type="email" placeholder="rahul@oment.in"><div class="form-error" id="ade-email-err">Valid email required</div></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Phone</label><input class="form-input" id="ade-phone" placeholder="+91 98765 00000" type="tel"></div>
      <div class="form-group"><label class="form-label">Role / Designation *</label><input class="form-input" id="ade-role" placeholder="e.g. Senior Developer"><div class="form-error" id="ade-role-err">Required</div></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Reporting Manager</label><select class="form-select" id="ade-manager"><option value="">Select…</option>${STATE.employees.filter(e=>e.dept===deptName).map(e=>`<option value="${e.id}">${esc(e.name)}</option>`).join('')}${STATE.employees.filter(e=>e.dept!==deptName).length?`<optgroup label="Other Departments">${STATE.employees.filter(e=>e.dept!==deptName).map(e=>`<option value="${e.id}">${esc(e.name)} (${esc(e.dept)})</option>`).join('')}</optgroup>`:''}
      </select></div>
      <div class="form-group"><label class="form-label">Starting Date</label><input class="form-input" id="ade-date" type="date" value="${Utils.isoDate(new Date())}"></div>
    </div>
  `,
  `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="addEmployeeToDept('${deptName}')">
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="1.8"/><circle cx="8.5" cy="7" r="4" stroke="currentColor" stroke-width="1.8"/><line x1="20" y1="8" x2="20" y2="14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="23" y1="11" x2="17" y2="11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
    Add to ${deptName}
  </button>`);
}

function addEmployeeToDept(deptName) {
  const name  = document.getElementById('ade-name')?.value?.trim();
  const email = document.getElementById('ade-email')?.value?.trim();
  const role  = document.getElementById('ade-role')?.value?.trim();
  let valid = true;
  if (!name)  { document.getElementById('ade-name').classList.add('input-error');  document.getElementById('ade-name-err').classList.add('show');  valid=false; }
  if (!email || !email.includes('@')) { document.getElementById('ade-email').classList.add('input-error'); document.getElementById('ade-email-err').classList.add('show'); valid=false; }
  if (!role)  { document.getElementById('ade-role').classList.add('input-error');  document.getElementById('ade-role-err').classList.add('show');  valid=false; }
  if (!valid) return;
  const managerId = document.getElementById('ade-manager')?.value;
  const manager = STATE.employees.find(e=>e.id==managerId);
  const newEmp = {
    id: Date.now(), name, role, dept: deptName, email,
    phone: document.getElementById('ade-phone')?.value || '',
    status: 'Present', score: 75, tasks: 0,
    joined: document.getElementById('ade-date')?.value || Utils.isoDate(new Date()),
    manager: manager?.name || 'Rajesh Kumar',
    avatar: initials(name),
    color: getColor(STATE.employees.length)
  };
  DataAPI.createEmployee({
    name: newEmp.name, role: newEmp.role, email: newEmp.email, phone: newEmp.phone,
    deptId: (STATE.departments.find(function (x) { return x.name === newEmp.dept; }) || {}).id,
    avatarBg: newEmp.color, avatarFg: '#ffffff', color: newEmp.color,
    joinedAt: Utils.isoDate(new Date())
  }).then(syncAndRefresh).catch(function (e) { toast(e.message, 'error'); });
  closeModal();
  renderDepartments();
  if (STATE.currentModule === 'employees') renderEmployees();
  toast(`${name} added to ${deptName}`, 'success');
  STATE.activityFeed.unshift({ icon:'👤', color:'#EFF6FF', text:`<strong>${name}</strong> (${role}) joined <strong>${deptName}</strong>`, time:'Just now' });
}