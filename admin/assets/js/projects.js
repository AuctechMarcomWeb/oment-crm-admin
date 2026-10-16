/* ============================================================
   PROJECTS MODULE
   ============================================================ */
function _projectTotalsHtml() {
  const P = STATE.projects;
  const sum = k => P.reduce((t, p) => t + (Number(p[k]) || 0), 0);
  const value = sum('value'), budget = sum('budget'), received = sum('receivedFromClient'), spent = sum('spent'), paid = sum('paidToTeam');
  const box = (l, v, c, hint) => `<div style="background:var(--surface);border:1px solid var(--b1);border-radius:12px;padding:12px 14px" title="${escAttr(hint)}">
      <div style="font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:.3px">${l}</div>
      <div style="font-size:18px;font-weight:700;font-family:var(--mono);color:${c};margin-top:2px">${fmtRupee(v)}</div></div>`;
  return `<div id="project-totals" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:16px">
    ${box('Total project value', value, 'var(--t1)', 'What clients pay for all projects')}
    ${box('Received from clients', received, 'var(--green)', 'Advances + invoice payments')}
    ${box('Still to collect', Math.max(0, value - received), 'var(--amber)', 'Project value minus what clients have paid')}
    ${box('Budget to spend', budget, 'var(--t1)', 'Internal cost budgets added up')}
    ${box('Spent so far', spent, 'var(--red)', 'Task pay, milestone pay and payments recorded for these projects')}
    ${box('Paid to team', paid, 'var(--blue)', 'Money actually paid out against these projects')}
    ${box('Profit so far', received - spent, received - spent < 0 ? 'var(--red)' : 'var(--green)', 'Received from clients minus spent so far')}
    ${box('Expected profit', value - spent, value - spent < 0 ? 'var(--red)' : 'var(--green)', 'Project value minus spent so far')}
  </div>`;
}

/* advance from the client, filled when creating or editing a project */
function _advanceFields(px, p) {
  const today = Utils.isoDate(new Date());
  return `<div style="border:1px solid var(--b1);border-radius:10px;padding:12px 14px;margin-bottom:14px">
    <div style="font-size:13px;font-weight:600;margin-bottom:2px">\uD83D\uDCB0 Advance from the client <span style="font-weight:400;color:var(--t3)">(optional)</span></div>
    <div style="font-size:11.5px;color:var(--t3);margin-bottom:10px">Money the client has already paid before the work starts. It counts as received for this project.</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="form-group"><label class="form-label">Amount received (\u20b9)</label><input class="form-input" id="${px}-adv" type="number" min="0" step="1" value="${p.advance || ''}" placeholder="0"></div>
      <div class="form-group"><label class="form-label">Date received</label><input class="form-input" id="${px}-advdate" type="date" max="${today}" value="${p.advanceDate || today}"></div>
      <div class="form-group"><label class="form-label">Method</label><select class="form-select" id="${px}-advmethod">${['Bank transfer','UPI','Cheque','Cash','Card','Other'].map(m => `<option${p.advanceMethod === m ? ' selected' : ''}>${m}</option>`).join('')}</select></div>
      <div class="form-group"><label class="form-label">Reference / UTR</label><input class="form-input" id="${px}-advref" value="${escAttr(p.advanceRef || '')}" placeholder="optional"></div>
    </div></div>`;
}
function _readAdvance(px, budgetPaise) {
  const amt = Math.max(0, parseFloat(document.getElementById(px + '-adv')?.value) || 0);
  return {
    advancePaidPaise: Math.min(budgetPaise || Infinity, Utils.rupeesToPaise(amt)),
    advanceDate: amt ? (document.getElementById(px + '-advdate')?.value || Utils.isoDate(new Date())) : null,
    advanceMethod: amt ? (document.getElementById(px + '-advmethod')?.value || '') : '',
    advanceRef: amt ? (document.getElementById(px + '-advref')?.value || '').trim() : ''
  };
}

function renderProjects() {
  const grid = document.getElementById('project-cards-grid');
  if (grid) {
    const old = document.getElementById('project-totals');
    if (old) old.remove();
    grid.insertAdjacentHTML('beforebegin', _projectTotalsHtml());
  }
  grid.innerHTML = STATE.projects.map(p => {
    const sc = p.status==='Active'?'badge-green':p.status==='Completed'?'badge-blue':p.status==='Planning'?'badge-amber':'badge-grey';
    const pc = p.priority==='High'?'badge-red':p.priority==='Medium'?'badge-amber':'badge-grey';
    const teamHTML = p.team.slice(0,4).map(id=>{const e=STATE.employees.find(x=>x.id===id);return e?`<div class="avatar avatar-sm" style="background:${e.color}" title="${esc(e.name)}">${e.avatar}</div>`:''}).join('');
    const budgetPct = p.budget ? Math.round((p.spent/p.budget)*100) : 0;
    const budgetColor = budgetPct>85?'var(--red)':budgetPct>60?'var(--amber)':'var(--green)';
    const head = p.headId ? STATE.employees.find(e=>e.id===p.headId) : null;
    return `<div class="project-card" data-open="openProjectDetail(${p.id})">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:4px">
        <div class="project-card-name">${esc(p.name)}</div>
        <div>${ringEl(p.progress,52)}</div>
      </div>
      <div class="project-card-client">${esc(p.client)}</div>
      ${head ? `<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
        <div class="avatar" style="background:${head.color};width:18px;height:18px;font-size:8px">${head.avatar}</div>
        <span style="font-size:11.5px;color:var(--t3)">Head: <strong style="color:var(--t1)">${head.name}</strong></span>
      </div>` : ''}
      <div class="project-card-meta">
        <span class="badge ${sc}">${p.status}</span>
        <span class="badge ${pc}">${p.priority}</span>
        ${typeof pbCardBadge === 'function' ? pbCardBadge(p.id) : ''}
      </div>
      <div style="font-size:12px;color:var(--t3);margin-bottom:6px">Deadline: <span style="color:${urgencyColor(p.deadline)};font-weight:550">${urgencyLabel(p.deadline)}</span></div>
      <div style="margin-bottom:8px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px">
          <span style="font-size:11.5px;color:var(--t3)">Budget</span>
          <span style="font-size:11.5px;font-weight:600;color:${budgetColor}">${fmtRupee(p.spent)} / ${fmtRupee(p.budget)} budget \u00b7 value ${fmtRupee(p.value)}</span>
        </div>
        <div class="budget-bar"><div class="budget-fill" style="width:${budgetPct}%;background:${budgetColor}"></div></div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div class="avatar-stack">${teamHTML}${p.team.length>4?`<div class="avatar avatar-sm" style="background:var(--s4);color:var(--t2);font-size:9px">+${p.team.length-4}</div>`:''}</div>
        <button class="btn btn-secondary btn-sm" onclick="openProjectDetail(${p.id})">Open →</button>
      </div>
    </div>`;
  }).join('');
}

function projectDescriptionText(value) {
  var s = String(value == null ? '' : value).trim();
  if (!s) return '';
  if (/<[a-z][\s\S]*>/i.test(s)) {
    var box = document.createElement('div');
    box.innerHTML = s;
    s = box.textContent || box.innerText || '';
  }
  return s.replace(/\s+/g, ' ').trim();
}
function projectDescriptionHtml(value) {
  var s = projectDescriptionText(value);
  return s ? esc(s) : '<span style="color:var(--t4);font-style:italic">No description added.</span>';
}

function openProjectDetail(id) {
  // Push current module to history (so back button works)
  if (STATE.currentModule && STATE.currentModule !== 'project-detail') {
    STATE.moduleHistory.push(STATE.currentModule);
    if (STATE.moduleHistory.length > 40) STATE.moduleHistory.shift();
  }
  STATE.currentProject = id;
  const p = STATE.projects.find(x=>x.id===id);
  if (!p) return;

  // Switch to project-detail view
  if (typeof mountView === 'function') mountView('project-detail');
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('view-project-detail').classList.add('active');
  document.getElementById('topbar-title').textContent = p.name;
  STATE.currentModule = 'project-detail';
  if (typeof updateBackButton === 'function') updateBackButton();

  // Reset tabs
  document.querySelectorAll('#view-project-detail .tab-btn').forEach((b,i)=>{b.classList.toggle('active',i===0);});
  document.querySelectorAll('#view-project-detail .tab-pane').forEach((p,i)=>{p.classList.toggle('active',i===0);});

  // Badges
  const sc = p.status==='Active'?'badge-green':p.status==='Completed'?'badge-blue':p.status==='Planning'?'badge-amber':'badge-grey';
  const pc = p.priority==='High'?'badge-red':p.priority==='Medium'?'badge-amber':'badge-grey';
  document.getElementById('pd-title').textContent = p.name;
  document.getElementById('pd-client').textContent = p.client;
  const headInHeader = p.headId ? STATE.employees.find(e=>e.id===p.headId) : null;
  document.getElementById('pd-badges').innerHTML = `
    ${headInHeader ? `<div style="display:flex;align-items:center;gap:6px;margin-right:4px">
      <div class="avatar" style="background:${headInHeader.color};width:24px;height:24px;font-size:9px" title="Project Head: ${headInHeader.name}">${headInHeader.avatar}</div>
      <span style="font-size:12px;color:var(--t3)">Head: <strong style="color:var(--t1)">${headInHeader.name.split(' ')[0]}</strong></span>
    </div>` : ''}
    <span class="badge ${sc}">${p.status}</span>
    <span class="badge ${pc}">${p.priority}</span>
    <button class="btn btn-secondary btn-sm" onclick="openEditProjectModal(${p.id})">✏️ Edit</button>
  `;

  // Overview tab
  const teamMembers = p.team.map(id=>STATE.employees.find(e=>e.id===id)).filter(Boolean);
  const head = p.headId ? STATE.employees.find(e=>e.id===p.headId) : null;
  document.getElementById('pd-overview').innerHTML = `
    <div class="grid-2" style="margin-bottom:20px">
      <div class="card card-pad" style="display:flex;flex-direction:column;align-items:center;gap:8px">
        ${ringEl(p.progress,100)}
        <div style="font-size:13px;color:var(--t3)">Overall Progress</div>
      </div>
      <div class="card card-pad">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          ${[['Deadline',`<span style="color:${urgencyColor(p.deadline)};font-weight:600">${urgencyLabel(p.deadline)}</span>`],['Department',p.dept],['Team Size',p.team.length+' members'],['Status',`<span class="badge ${sc}">${p.status}</span>`]].map(([l,v])=>`<div><div style="font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:0.3px;margin-bottom:3px">${l}</div><div style="font-size:13px;font-weight:550">${v}</div></div>`).join('')}
        </div>
      </div>
    </div>
    ${head ? `
    <div class="card card-pad" style="margin-bottom:20px">
      <div style="font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:0.5px;font-weight:600;margin-bottom:12px">Project Head</div>
      <div style="display:flex;align-items:center;gap:14px">
        <div class="avatar" style="background:${head.color};width:48px;height:48px;font-size:16px;font-weight:700;flex-shrink:0">${head.avatar}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:15px;font-weight:700;color:var(--t1)">${head.name}</div>
          <div style="font-size:12.5px;color:var(--t3);margin-bottom:4px">${head.role} · ${head.dept}</div>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <span style="font-size:11.5px;color:var(--t3)">✉️ ${head.email}</span>
            ${head.phone ? `<span style="font-size:11.5px;color:var(--t3)">📞 ${head.phone}</span>` : ''}
          </div>
        </div>
        <div style="flex-shrink:0;text-align:right">
          <div style="font-size:11px;color:var(--t3);margin-bottom:3px">Score</div>
          <div style="font-size:20px;font-weight:700;color:${head.score>=90?'var(--green)':head.score>=75?'var(--blue)':'var(--amber)'}">${head.score}</div>
          <div style="font-size:10px;color:var(--t4)">/100</div>
        </div>
      </div>
    </div>` : `
    <div class="card card-pad" style="margin-bottom:20px;border:2px dashed var(--b2)">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:13px;font-weight:600;color:var(--t2)">No Project Head assigned</div>
          <div style="font-size:12px;color:var(--t3);margin-top:2px">Assign a project head for accountability</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="openEditProjectModal(${p.id})">Assign Head</button>
      </div>
    </div>`}
    ${typeof pbOverviewCard === 'function' ? pbOverviewCard(p.id) : ''}
    <div class="card card-pad">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div style="font-size:13px;font-weight:600">Description</div>
        <button class="btn btn-secondary btn-sm" onclick="openEditProjectModal(${p.id})">✏️ Edit Project</button>
      </div>
      <div style="font-size:13px;color:var(--t2);line-height:1.6">${projectDescriptionHtml(p.desc)}</div>
    </div>`;

  // Deliverables tab
  renderDeliverablesTab(id);

  // Team tab — WhatsApp group style
  renderProjectTeamTab(id);

  // Timeline tab
  renderProjectTimeline(id);

  // Finance tab
  const budgetPct = p.budget ? Math.round((p.spent/p.budget)*100) : 0;
  const budgetColor = budgetPct>85?'var(--red)':budgetPct>60?'var(--amber)':'var(--green)';
  const profit = p.value - p.spent;              // value minus what has been spent so far
  const plannedProfit = p.value - p.budget;     // value minus the whole budget
  const projInvoices = STATE.invoices.filter(i=>i.project===p.name);
  document.getElementById('pd-finance').innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:20px">
      ${[
         /* client side */
         ['Total project value',fmtRupee(p.value),'var(--t1)','What the client pays for the whole project'],
         ['Received from client',fmtRupee(p.receivedFromClient||0),'var(--green)','Advance + paid invoices'],
         ['Still to collect',fmtRupee(Math.max(0,p.value-(p.receivedFromClient||0))),'var(--amber)','Project value not paid yet'],
         /* team side */
         ['Budget to spend',fmtRupee(p.budget),'var(--t1)','Your cost budget for this project'],
         ['Spent on team',fmtRupee(p.spent),budgetColor,'Task pay earned (after time cuts), milestone pay and direct payments'],
         [(p.budget-p.spent)<0?'Over budget by':'Budget left',fmtRupee(Math.abs(p.budget-p.spent)),(p.budget-p.spent)<0?'var(--red)':'var(--t2)','Budget minus spent on team'],
         ['Paid to team',fmtRupee(p.paidToTeam||0),'var(--blue)','Money actually paid out (Record payment)'],
         ['Still to pay team',fmtRupee(Math.max(0,p.spent-(p.paidToTeam||0))),Math.max(0,p.spent-(p.paidToTeam||0))?'var(--amber)':'var(--t2)','Earned by the team, not paid out yet'],
         /* result */
         ['Profit',fmtRupee(profit),profit<0?'var(--red)':'var(--green)','Project value minus spent on team'],
         ['Planned profit',fmtRupee(plannedProfit),plannedProfit<0?'var(--red)':'var(--green)','Project value minus the whole budget'],
         ['Cash in hand',fmtRupee((p.receivedFromClient||0)-(p.paidToTeam||0)),((p.receivedFromClient||0)-(p.paidToTeam||0))<0?'var(--red)':'var(--t1)','Received from client minus paid to team']].map(([l,v,c,h])=>`<div class="card card-pad" style="text-align:center" title="${escAttr(h||'')}"><div style="font-size:20px;font-weight:700;color:${c};font-family:var(--mono)">${v}</div><div style="font-size:12px;color:var(--t3);margin-top:4px">${l}</div>${h?`<div style="font-size:10.5px;color:var(--t4,var(--t3));margin-top:3px;line-height:1.35">${h}</div>`:''}</div>`).join('')}
    </div>
    <div class="card card-pad" style="margin-bottom:16px">
      <div style="font-size:13px;font-weight:600;margin-bottom:10px">Budget Utilization</div>
      <div style="height:8px;background:var(--s3);border-radius:4px"><div style="height:100%;width:${budgetPct}%;background:${budgetColor};border-radius:4px"></div></div>
      <div style="font-size:12px;color:var(--t3);margin-top:6px">${budgetPct}% of budget used</div>
    </div>
    <div class="card card-pad">
      <div style="font-size:13px;font-weight:600;margin-bottom:10px">Linked Invoices</div>
      ${projInvoices.length ? projInvoices.map(i=>{
        const sc = i.status==='Paid'?'badge-green':i.status==='Overdue'?'badge-red':i.status==='Sent'?'badge-blue':'badge-grey';
        return `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--b1)"><div><div style="font-size:13px;font-weight:550">${esc(i.num)}</div><div style="font-size:12px;color:var(--t3)">${fmtDate(i.date)}</div></div><div style="display:flex;align-items:center;gap:8px"><span style="font-size:13px;font-weight:600;font-family:var(--mono)">${fmtRupee(i.amount)}</span><span class="badge ${sc}">${i.status}</span></div></div>`;
      }).join('') : `<div style="font-size:13px;color:var(--t3);text-align:center;padding:16px">No invoices linked</div>`}
    </div>`;
}

/* ============================================================
   PROJECT TEAM — WhatsApp Group Style
   ============================================================ */
function renderProjectTeamTab(pid) {
  const pane = document.getElementById('pd-team');
  if (!pane) return;
  const p = STATE.projects.find(x => x.id === pid);
  if (!p) return;
  const teamMembers = p.team.map(id => STATE.employees.find(e => e.id === id)).filter(Boolean);
  const notInTeam   = STATE.employees.filter(e => !p.team.includes(e.id));

  pane.innerHTML = `
    <!-- Header row -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
      <div>
        <div style="font-size:15px;font-weight:700">${esc(p.name)} — Team</div>
        <div style="font-size:12px;color:var(--t3);margin-top:2px">${teamMembers.length} member${teamMembers.length!==1?'s':''}</div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="toggleAddMemberPanel(${pid})" style="display:flex;align-items:center;gap:6px">
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="2"/><line x1="19" y1="8" x2="19" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="16" y1="11" x2="22" y2="11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        Add Member
      </button>
    </div>

    <!-- Avatar strip (WhatsApp group style) -->
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:14px 16px;background:var(--s2);border-radius:var(--r12);margin-bottom:16px;min-height:56px">
      ${teamMembers.map(e => {
        const dot = e.status==='Present'?'var(--green)':e.status==='Absent'?'var(--red)':'var(--amber)';
        return `<div title="${esc(e.name)} — ${e.status}" style="position:relative;cursor:pointer" onclick="openEmpDetail(${e.id})">
          <div class="avatar" style="background:${e.color};width:44px;height:44px;font-size:14px;border:2.5px solid var(--surface);box-shadow:0 1px 4px rgba(0,0,0,.1)">${e.avatar}</div>
          <div style="position:absolute;bottom:0;right:0;width:12px;height:12px;border-radius:50%;background:${dot};border:2px solid var(--surface)"></div>
        </div>`;
      }).join('')}
      <div onclick="toggleAddMemberPanel(${pid})" title="Add member"
        style="width:44px;height:44px;border-radius:50%;background:var(--surface);border:2px dashed var(--b2);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:.15s;flex-shrink:0"
        onmouseover="this.style.borderColor='var(--t1)';this.style.background='var(--s3)'"
        onmouseout="this.style.borderColor='var(--b2)';this.style.background='var(--surface)'">
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </div>
      ${teamMembers.length===0?`<div style="font-size:12px;color:var(--t3)">No members yet — click + to add</div>`:''}
    </div>

    <!-- Member cards -->
    <div style="display:flex;flex-direction:column;gap:8px">
      ${teamMembers.map(e => {
        const dot   = e.status==='Present'?'var(--green)':e.status==='Absent'?'var(--red)':'var(--amber)';
        const sbg   = e.status==='Present'?'#ECFDF5':e.status==='Absent'?'#FEF2F2':'#FFFBEB';
        const ptasks= STATE.tasks.filter(t=>t.assignee===e.id&&t.projectId===pid).length;
        const sc    = e.score>=90?'var(--green)':e.score>=80?'var(--blue)':'var(--amber)';
        return `
        <div class="card" style="padding:12px 14px;display:flex;align-items:center;gap:12px;transition:.15s"
          onmouseover="this.style.background='var(--s2)'" onmouseout="this.style.background='var(--surface)'">
          <div style="position:relative;flex-shrink:0">
            <div class="avatar" style="background:${e.color};width:42px;height:42px;font-size:14px">${e.avatar}</div>
            <div style="position:absolute;bottom:0;right:0;width:11px;height:11px;border-radius:50%;background:${dot};border:2px solid var(--surface)"></div>
          </div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap">
              <span style="font-size:13px;font-weight:650">${esc(e.name)}</span>
              <span style="font-size:10px;padding:2px 8px;border-radius:99px;background:${sbg};color:${dot};font-weight:600">${e.status}</span>
            </div>
            <div style="font-size:12px;color:var(--t3);margin-top:2px">${esc(e.role)} · ${esc(e.dept)}</div>
            <div style="font-size:11px;color:var(--t2);margin-top:4px">
              ${ptasks} task${ptasks!==1?'s':''} on this project &nbsp;·&nbsp; Score: <strong style="color:${sc}">${e.score}</strong>
            </div>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0">
            <button onclick="openEmpDetail(${e.id})"
              style="padding:5px 10px;border:1px solid var(--b1);border-radius:var(--r6);background:none;font-size:11px;cursor:pointer;color:var(--t2);transition:.15s"
              onmouseover="this.style.background='var(--s2)'" onmouseout="this.style.background='none'">View</button>
            <button onclick="removeFromProject(${pid},${e.id})"
              style="padding:5px 10px;border:1px solid var(--b1);border-radius:var(--r6);background:none;font-size:11px;cursor:pointer;color:var(--red);transition:.15s"
              onmouseover="this.style.background='#FEF2F2'" onmouseout="this.style.background='none'">Remove</button>
          </div>
        </div>`;
      }).join('')}
      ${teamMembers.length===0?`
        <div class="empty-state">
          <div class="empty-icon">👥</div>
          <div class="empty-title">No team members</div>
          <div class="empty-sub">Add members to get started</div>
        </div>`:''}
    </div>

    <!-- Add Member Panel (slides in inline) -->
    <div id="amp-${pid}" style="display:none;margin-top:16px">
      <div class="card" style="overflow:hidden">
        <!-- Panel header -->
        <div style="padding:12px 16px;border-bottom:1px solid var(--b1);background:var(--s2);display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="font-size:13px;font-weight:650">Add Members</div>
            <div style="font-size:11px;color:var(--t3);margin-top:1px">${notInTeam.length} available</div>
          </div>
          <button onclick="toggleAddMemberPanel(${pid})"
            style="background:none;border:none;cursor:pointer;color:var(--t3);padding:4px;border-radius:var(--r4);line-height:1;transition:.15s"
            onmouseover="this.style.color='var(--t1)'" onmouseout="this.style.color='var(--t3)'">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
        </div>
        <!-- Search -->
        <div style="padding:10px 14px;border-bottom:1px solid var(--b1)">
          <div style="position:relative">
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--t3)"><circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/><line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            <input id="ams-${pid}" type="text" placeholder="Search by name or department…"
              oninput="filterAMP(${pid},this.value)"
              style="width:100%;box-sizing:border-box;padding:8px 10px 8px 30px;border:1px solid var(--b1);border-radius:var(--r6);font-size:12px;background:var(--s2);outline:none;font-family:var(--font);transition:.15s"
              onfocus="this.style.borderColor='var(--t1)';this.style.background='var(--surface)'"
              onblur="this.style.borderColor='var(--b1)';this.style.background='var(--s2)'">
          </div>
        </div>
        <!-- Employee rows -->
        <div id="aml-${pid}" style="max-height:300px;overflow-y:auto">
          ${notInTeam.length===0?`
            <div style="padding:24px;text-align:center;color:var(--t3);font-size:13px">All employees are in this project already</div>
          `:notInTeam.map(e => {
            const dot = e.status==='Present'?'var(--green)':e.status==='Absent'?'var(--red)':'var(--amber)';
            const sc  = e.score>=90?'var(--green)':e.score>=80?'var(--blue)':'var(--amber)';
            return `
            <div class="amp-row" data-name="${e.name.toLowerCase()}" data-dept="${e.dept.toLowerCase()}"
              onclick="addToProject(${pid},${e.id})"
              style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--b1);cursor:pointer;transition:.15s"
              onmouseover="this.style.background='var(--s2)'" onmouseout="this.style.background='none'">
              <div style="position:relative;flex-shrink:0">
                <div class="avatar avatar-sm" style="background:${e.color};width:38px;height:38px;font-size:13px">${e.avatar}</div>
                <div style="position:absolute;bottom:0;right:0;width:10px;height:10px;border-radius:50%;background:${dot};border:2px solid var(--surface)"></div>
              </div>
              <div style="flex:1;min-width:0">
                <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(e.name)}</div>
                <div style="font-size:11px;color:var(--t3)">${esc(e.role)} · ${esc(e.dept)}</div>
              </div>
              <div style="text-align:right;flex-shrink:0;margin-right:4px">
                <div style="font-size:13px;font-weight:700;color:${sc}">${e.score}</div>
                <div style="font-size:10px;color:var(--t3)">score</div>
              </div>
              <div style="width:28px;height:28px;border-radius:50%;background:var(--s2);border:1px solid var(--b1);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:.15s"
                onmouseover="this.parentElement.style.background='var(--s3)'" onmouseout="">
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

function toggleAddMemberPanel(pid) {
  const panel = document.getElementById('amp-'+pid);
  if (!panel) return;
  const isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : 'block';
  if (!isOpen) {
    setTimeout(() => {
      const inp = document.getElementById('ams-'+pid);
      if (inp) inp.focus();
      panel.scrollIntoView({ behavior:'smooth', block:'nearest' });
    }, 50);
  }
}

function filterAMP(pid, q) {
  document.querySelectorAll('#aml-'+pid+' .amp-row').forEach(row => {
    const match = !q || row.dataset.name.includes(q.toLowerCase()) || row.dataset.dept.includes(q.toLowerCase());
    row.style.display = match ? '' : 'none';
  });
}

function addToProject(pid, empId) {
  const p = STATE.projects.find(x => x.id === pid);
  const e = STATE.employees.find(x => x.id === empId);
  if (!p || !e) return;
  if (p.team.includes(empId)) { toast(e.name+' is already in this project', 'error'); return; }
  p.team.push(empId);
  DataAPI.addProjectMember(p.id, e.id).then(syncAndRefresh).catch(function (err) { toast(err.message, 'error'); });
  toast(e.name+' added to project ✓', 'success');
  renderProjectTeamTab(pid);
}

function removeFromProject(pid, empId) {
  const p = STATE.projects.find(x => x.id === pid);
  const e = STATE.employees.find(x => x.id === empId);
  if (!p || !e) return;
  showConfirm('Remove '+esc(e.name)+' from '+esc(p.name)+'?', () => {
    p.team = p.team.filter(id => id !== empId);
    DataAPI.removeProjectMember(p.id, e.id).then(syncAndRefresh).catch(function (err) { toast(err.message, 'error'); });
    toast(e.name+' removed from project', 'success');
    renderProjectTeamTab(pid);
  });
}

function openAddProjectModal() {
  openModal('Add New Project', `
    <div class="form-row">
      <div class="form-group"><label class="form-label">Project Name *</label><input class="form-input" id="ap-name" placeholder="e.g. E-commerce Platform"><div class="form-error" id="ap-name-err">Required</div></div>
      <div class="form-group"><label class="form-label">Client Name *</label><input class="form-input" id="ap-client" placeholder="Client company"><div class="form-error" id="ap-client-err">Required</div></div>
    </div>
    ${_clientFields('ap', {})}
    ${typeof _billingFields === 'function' ? _billingFields('ap', {}) : ''}
    <div class="form-row">
      <div class="form-group"><label class="form-label">Status</label><select class="form-select" id="ap-status"><option>Planning</option><option>Active</option><option>On Hold</option></select></div>
      <div class="form-group"><label class="form-label">Priority</label><select class="form-select" id="ap-priority"><option>High</option><option>Medium</option><option>Low</option></select></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Department</label><select class="form-select" id="ap-dept">${STATE.departments.map(d=>`<option>${esc(d.name)}</option>`).join('')}</select></div>
      <div class="form-group"><label class="form-label">Deadline</label><input class="form-input" id="ap-deadline" type="date"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Project Head</label><select class="form-select" id="ap-head"><option value="">— Select Project Head —</option>${STATE.employees.map(e=>`<option value="${e.id}">${esc(e.name)} (${esc(e.role)})</option>`).join('')}</select></div>
      <div class="form-group"><label class="form-label">Total project value (\u20b9) *</label><input class="form-input" id="ap-value" type="number" min="0" placeholder="What the client pays, e.g. 1500000"><div class="form-hint">Invoices are made from this.</div></div>
      <div class="form-group"><label class="form-label">Budget to spend (\u20b9)</label><input class="form-input" id="ap-budget" type="number" min="0" placeholder="Salaries + expenses, e.g. 1000000"><div class="form-hint">Your internal cost budget.</div></div>
    </div>
    ${_advanceFields('ap', {})}
    <div class="form-group">
      <label class="form-label">Team Members</label>
      ${buildTeamPicker('ap', [])}
    </div>
    <div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="ap-desc" placeholder="Project overview…"></textarea></div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="addProject()">Create Project</button>`);
}

function addProject() {
  const name = document.getElementById('ap-name')?.value?.trim();
  const client = document.getElementById('ap-client')?.value?.trim();
  if (!name) { document.getElementById('ap-name').classList.add('input-error'); document.getElementById('ap-name-err').classList.add('show'); return; }
  if (!client) { document.getElementById('ap-client').classList.add('input-error'); document.getElementById('ap-client-err').classList.add('show'); return; }
  const team = getPickerSelected('ap');
  const headId = parseInt(document.getElementById('ap-head').value) || null;
  if (!_clientEmailOk('ap')) return;
  const billing = typeof _readBilling === 'function' ? _readBilling('ap') : { type: 'FIXED' };
  if (billing.error) return;
  const value = billing.type === 'RECURRING' ? billing.contractValuePaise / 100 : (parseFloat(document.getElementById('ap-value').value) || 0);
  if (value <= 0) { toast('Enter the total project value (what the client pays)', 'error'); document.getElementById('ap-value').focus(); return; }
  const budget = parseFloat(document.getElementById('ap-budget').value) || 0;
  if (budget > value) { toast('Note: the budget to spend is more than the project value \u2014 this project will make a loss', 'error'); }
  const adv = parseFloat(document.getElementById('ap-adv')?.value) || 0;
  if (adv > value) { toast('The advance cannot be more than the project value', 'error'); return; }
  if (headId && !team.includes(headId)) team.unshift(headId);
  const deptName = document.getElementById('ap-dept').value;
  const dept = STATE.departments.find(function (d) { return d.name === deptName; });
  DataAPI.createProject({
    name: name, clientName: client, ..._readClient('ap'),
    status: Schema.normProjectStatus(document.getElementById('ap-status').value),
    priority: Schema.normPriority(document.getElementById('ap-priority').value),
    deptId: dept ? dept.id : null,
    headId: headId,
    memberIds: team,
    startDate: Utils.isoDate(new Date()),
    deadline: document.getElementById('ap-deadline').value || Utils.isoDate(Utils.daysFromNow(90)),
    contractValuePaise: Utils.rupeesToPaise(value),
    budgetPaise: Utils.rupeesToPaise(budget),
    spentPaise: 0,
    ..._readAdvance('ap', Utils.rupeesToPaise(value)),
    description: document.getElementById('ap-desc').value
  }).then(function (proj) {
    syncState();
    return billing.type === 'RECURRING' && typeof pbApply === 'function' ? pbApply(proj.id, billing) : null;
  }).then(function () {
    syncState();
    closeModal();
    renderProjects();
    toast(`Project "${esc(name)}" created` + (billing.type === 'RECURRING' ? ' \u2014 recurring invoices set up' : ''), 'success');
  }).catch(function (err) { syncState(); toast(err.message, 'error'); });
}

function openEditProjectModal(id) {
  const p = STATE.projects.find(x=>x.id===id);
  if (!p) return;
  openModal('Edit Project', `
    <div class="form-row">
      <div class="form-group"><label class="form-label">Project Name *</label><input class="form-input" id="ep-name" value="${esc(p.name)}"></div>
      <div class="form-group"><label class="form-label">Client Name *</label><input class="form-input" id="ep-client" value="${esc(p.client)}"></div>
    </div>
    ${_clientFields('ep', p)}
    ${typeof _billingFields === 'function' ? _billingFields('ep', DataAPI.raw().projects.find(x => x.id === id) || {}) : ''}
    <div class="form-row">
      <div class="form-group"><label class="form-label">Status</label><select class="form-select" id="ep-status"><option${p.status==='Planning'?' selected':''}>Planning</option><option${p.status==='Active'?' selected':''}>Active</option><option${p.status==='On Hold'?' selected':''}>On Hold</option><option${p.status==='Completed'?' selected':''}>Completed</option></select></div>
      <div class="form-group"><label class="form-label">Priority</label><select class="form-select" id="ep-priority"><option${p.priority==='High'?' selected':''}>High</option><option${p.priority==='Medium'?' selected':''}>Medium</option><option${p.priority==='Low'?' selected':''}>Low</option></select></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Department</label><select class="form-select" id="ep-dept">${STATE.departments.map(d=>`<option${d.name===p.dept?' selected':''}>${esc(d.name)}</option>`).join('')}</select></div>
      <div class="form-group"><label class="form-label">Deadline</label><input class="form-input" id="ep-deadline" type="date" value="${p.deadline}"></div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Project Head</label>
        <select class="form-select" id="ep-head">
          <option value="">— None —</option>
          ${STATE.employees.map(e=>`<option value="${e.id}"${e.id===p.headId?' selected':''}>${esc(e.name)} (${esc(e.role)})</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Total project value (\u20b9)</label><input class="form-input" id="ep-value" type="number" min="0" value="${p.value}"><div class="form-hint">What the client pays \u2014 invoices are made from this.</div></div>
      <div class="form-group"><label class="form-label">Budget to spend (\u20b9)</label><input class="form-input" id="ep-budget" type="number" min="0" value="${p.budget}"><div class="form-hint">Salaries + expenses.</div></div>
    </div>
    <div class="form-group"><label class="form-label">Progress (%)</label>
      <div style="display:flex;align-items:center;gap:12px">
        <input style="flex:1" id="ep-progress" type="range" min="0" max="100" value="${p.progress}" oninput="document.getElementById('ep-progress-val').textContent=this.value+'%'">
        <span id="ep-progress-val" style="font-size:13px;font-weight:700;color:var(--blue);min-width:36px">${p.progress}%</span>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Team Members</label>
      ${buildTeamPicker('ep', p.team)}
    </div>
    ${_advanceFields('ep', p)}
    <div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="ep-desc">${esc(projectDescriptionText(p.desc))}</textarea></div>
  `, `<button class="btn btn-danger btn-sm" onclick="deleteProject(${id})">Delete</button><div style="flex:1"></div><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveEditProject(${id})">Save Changes</button>`);
  if (typeof pbToggle === 'function') pbToggle('ep');
}

function saveEditProject(id) {
  const p = STATE.projects.find(x=>x.id===id);
  if (!p) return;
  const name = document.getElementById('ep-name').value.trim();
  const client = document.getElementById('ep-client').value.trim();
  if (!name || !client) { toast('Name and client are required', 'error'); return; }
  const team = getPickerSelected('ep');
  const headId = parseInt(document.getElementById('ep-head').value) || null;
  if (headId && !team.includes(headId)) team.unshift(headId);
  const deptName = document.getElementById('ep-dept').value;
  const dept = STATE.departments.find(function (d) { return d.name === deptName; });
  const billing = typeof _readBilling === 'function' ? _readBilling('ep') : { type: 'FIXED' };
  if (billing.error) return;
  const valueRs = billing.type === 'RECURRING' ? billing.contractValuePaise / 100 : (parseFloat(document.getElementById('ep-value').value) || p.value);
  const wasRaw = DataAPI.raw().projects.find(x => x.id === id) || {};
  const billingChanged = billing.type === 'RECURRING' || wasRaw.billingType === 'RECURRING';
  DataAPI.updateProject(id, {
    name: name, clientName: client, ..._readClient('ep'),
    status: Schema.normProjectStatus(document.getElementById('ep-status').value),
    priority: Schema.normPriority(document.getElementById('ep-priority').value),
    deptId: dept ? dept.id : null,
    headId: headId,
    memberIds: team,
    deadline: document.getElementById('ep-deadline').value,
    contractValuePaise: Utils.rupeesToPaise(valueRs),
    budgetPaise: Utils.rupeesToPaise(parseFloat(document.getElementById('ep-budget').value) || 0),
    ..._readAdvance('ep', Utils.rupeesToPaise(valueRs)),
    description: document.getElementById('ep-desc').value
  }).then(function (r) {
    syncState();
    return billingChanged && typeof pbApply === 'function' ? pbApply(id, billing) : r;
  }).then(function () {
    syncAndRefresh();
    if (STATE.currentModule === 'project-detail' && STATE.currentProject === id) openProjectDetail(id);
  }).catch(function (err) { syncState(); toast(err.message, 'error'); });
  closeModal();
  renderProjects();
  if (STATE.currentModule === 'project-detail' && STATE.currentProject === id) openProjectDetail(id);
  toast(`Project "${name}" updated`, 'success');
}

/* ── WhatsApp-style Team Picker ── */
function buildTeamPicker(prefix, selected=[]) {
  const grouped = {};
  STATE.employees.forEach(e => {
    const g = e.dept || 'Other';
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(e);
  });

  const rows = Object.entries(grouped).map(([dept, members]) => `
    <div style="padding:6px 12px 2px;font-size:10px;font-weight:700;color:var(--t4);text-transform:uppercase;letter-spacing:0.6px;background:var(--s2);border-top:1px solid var(--b1)">${dept}</div>
    ${members.map(e => {
      const chk = selected.includes(e.id) ? 'checked' : '';
      return `<label id="${prefix}-row-${e.id}" style="display:flex;align-items:center;gap:12px;padding:9px 14px;cursor:pointer;transition:background .12s;${chk?'background:var(--blue-light)':''}">
        <div class="avatar avatar-sm" style="background:${e.color};flex-shrink:0">${e.avatar}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:550;color:var(--t1)">${esc(e.name)}</div>
          <div style="font-size:11.5px;color:var(--t3)">${esc(e.role)}</div>
        </div>
        <div id="${prefix}-tick-${e.id}" style="width:22px;height:22px;border-radius:50%;background:${chk?'var(--blue)':'var(--s3)'};border:${chk?'none':'1.5px solid var(--b2)'};display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s;pointer-events:none">
          ${chk?`<svg width="11" height="11" fill="none" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`:''}
        </div>
        <input type="checkbox" id="${prefix}-chk-${e.id}" value="${e.id}" ${chk} onchange="teamPickerToggle('${prefix}',${e.id})" style="display:none">
      </label>`;
    }).join('')}
  `).join('');

  const initialChips = selected.map(id => {
    const e = STATE.employees.find(x=>x.id===id);
    return e ? `<div id="${prefix}-chip-${e.id}" style="display:flex;align-items:center;gap:5px;background:var(--blue-light);border:1px solid var(--blue);border-radius:999px;padding:3px 10px 3px 4px">
      <div class="avatar" style="background:${e.color};width:18px;height:18px;font-size:8px">${e.avatar}</div>
      <span style="font-size:12px;font-weight:550;color:var(--blue)">${e.name.split(' ')[0]}</span>
      <span onclick="uncheckTeamPicker('${prefix}',${e.id})" style="cursor:pointer;color:var(--blue);font-size:14px;line-height:1;margin-left:1px">&times;</span>
    </div>` : '';
  }).join('');

  return `
    <div style="border:1px solid var(--b1);border-radius:var(--r10);overflow:hidden;background:var(--surface)">
      <div style="padding:8px 12px;border-bottom:1px solid var(--b1);position:relative">
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" style="position:absolute;left:22px;top:50%;transform:translateY(-50%);color:var(--t4)"><circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/><path d="m21 21-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        <input id="${prefix}-team-search" type="text" placeholder="Search members…" oninput="teamPickerSearch('${prefix}',this.value)"
          style="width:100%;padding:0 8px 0 28px;height:32px;border:none;background:transparent;font-size:13px;color:var(--t1);outline:none;font-family:var(--font);box-sizing:border-box">
      </div>
      <div id="${prefix}-team-list" style="max-height:200px;overflow-y:auto">${rows}</div>
    </div>
    <div id="${prefix}-chips" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:${selected.length?'8px':'0'};min-height:0">${initialChips}</div>
    <div id="${prefix}-count" style="font-size:11.5px;color:var(--t3);margin-top:4px">${selected.length?`<span style="color:var(--blue);font-weight:600">${selected.length}</span> member${selected.length>1?'s':''} selected`:''}</div>
  `;
}

function teamPickerToggle(prefix, empId) {
  const chk = document.getElementById(`${prefix}-chk-${empId}`);
  if (!chk) return;
  // checkbox state is already updated by the label click — just reflect it in UI

  const e = STATE.employees.find(x=>x.id===empId);
  const tick = document.getElementById(`${prefix}-tick-${empId}`);
  const row = document.getElementById(`${prefix}-row-${empId}`);
  const chips = document.getElementById(`${prefix}-chips`);
  const countEl = document.getElementById(`${prefix}-count`);

  if (chk.checked) {
    tick.style.background = 'var(--blue)'; tick.style.border = 'none';
    tick.innerHTML = `<svg width="11" height="11" fill="none" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    row.style.background = 'var(--blue-light)';
    if (!document.getElementById(`${prefix}-chip-${empId}`)) {
      const chip = document.createElement('div');
      chip.id = `${prefix}-chip-${empId}`;
      chip.style.cssText = 'display:flex;align-items:center;gap:5px;background:var(--blue-light);border:1px solid var(--blue);border-radius:999px;padding:3px 10px 3px 4px';
      chip.innerHTML = `<div class="avatar" style="background:${e.color};width:18px;height:18px;font-size:8px">${e.avatar}</div><span style="font-size:12px;font-weight:550;color:var(--blue)">${e.name.split(' ')[0]}</span><span onclick="uncheckTeamPicker('${prefix}',${empId})" style="cursor:pointer;color:var(--blue);font-size:14px;line-height:1;margin-left:1px">&times;</span>`;
      chips.appendChild(chip);
    }
    chips.style.marginTop = '8px';
  } else {
    tick.style.background = 'var(--s3)'; tick.style.border = '1.5px solid var(--b2)'; tick.innerHTML = '';
    row.style.background = 'transparent';
    const chip = document.getElementById(`${prefix}-chip-${empId}`);
    if (chip) chip.remove();
  }
  const total = getPickerSelected(prefix).length;
  countEl.innerHTML = total ? `<span style="color:var(--blue);font-weight:600">${total}</span> member${total>1?'s':''} selected` : '';
  chips.style.marginTop = total ? '8px' : '0';
}

function uncheckTeamPicker(prefix, empId) {
  const chk = document.getElementById(`${prefix}-chk-${empId}`);
  if (chk) { chk.checked = false; chk.dispatchEvent(new Event('change')); }
}

function teamPickerSearch(prefix, q) {
  const list = document.getElementById(`${prefix}-team-list`);
  if (!list) return;
  const lower = q.toLowerCase();
  list.querySelectorAll('label[id^="'+prefix+'-row-"]').forEach(row => {
    const name = row.querySelector('div > div:first-child')?.textContent || '';
    const role = row.querySelector('div > div:last-child')?.textContent || '';
    row.style.display = (!q || name.toLowerCase().includes(lower) || role.toLowerCase().includes(lower)) ? '' : 'none';
  });
  // Show/hide dept headers
  list.querySelectorAll('div[style*="text-transform:uppercase"]').forEach(header => {
    let next = header.nextElementSibling;
    let anyVisible = false;
    while (next && !next.style.textTransform) { if (next.style.display !== 'none') anyVisible = true; next = next.nextElementSibling; }
    header.style.display = anyVisible ? '' : 'none';
  });
}

function getPickerSelected(prefix) {
  return [...document.querySelectorAll(`[id^="${prefix}-chk-"]:checked`)].map(c=>parseInt(c.value)).filter(Boolean);
}

function deleteProject(id) {
  const p = STATE.projects.find(x=>x.id===id);
  closeModal();
  DataAPI.deleteProject(id).then(function () {
    syncState();
    if (STATE.currentModule === 'project-detail') gotoModule('projects'); else refreshView();
    if (typeof renderDashboard === 'function' && STATE.currentModule === 'dashboard') renderDashboard();
    toast(`Project "${p?.name || ''}" deleted`, 'success');
  }).catch(function (e) { toast(e.message, 'error'); });
}

/* ============================================================
   PROJECT TIMELINE
   ============================================================ */
function renderProjectTimeline(pid) {
  const pane = document.getElementById('pd-timeline');
  if (!pane) return;
  const p = STATE.projects.find(x => x.id === pid);
  if (!p) return;

  const today = new Date();
  today.setHours(0,0,0,0);

  // ---- Build milestones list ----
  const items = [];

  // 1. Project start (always done since it has already begun)
  items.push({
    kind: 'start',
    title: 'Project Kickoff',
    desc: `Project officially started for ${esc(p.client)}.`,
    date: p.startDate,
    iconType: 'start',
    status: 'done',
  });

  // 2. Custom milestones from project data (with priority over derived ones)
  (p.milestones || []).forEach(m => {
    const due = new Date(m.date);
    due.setHours(0,0,0,0);
    let status = (m.status || '').toLowerCase();
    if (status === 'in progress') status = 'in-progress';
    if (!status || status === 'upcoming') {
      status = due < today ? 'overdue' : 'upcoming';
    }
    items.push({
      kind: 'milestone',
      title: m.title,
      desc: m.desc || '',
      date: m.date,
      iconType: status === 'done' ? 'check' : (status === 'in-progress' ? 'progress' : (status === 'overdue' ? 'alert' : 'flag')),
      status,
    });
  });

  // 3. Project tasks woven in as smaller events
  const projTasks = STATE.tasks.filter(t => t.projectId === pid);
  projTasks.forEach(t => {
    const due = new Date(t.deadline);
    due.setHours(0,0,0,0);
    let status;
    if (t.status === 'Done') status = 'done';
    else if (t.status === 'In Review') status = 'in-progress';
    else if (due < today) status = 'overdue';
    else if (t.status === 'In Progress') status = 'in-progress';
    else status = 'upcoming';
    const assignee = STATE.employees.find(e => e.id === t.assignee);
    items.push({
      kind: 'task',
      title: t.title,
      desc: (assignee ? `Assigned to ${assignee.name}` : 'Unassigned')
        + ` · ${t.hours}h estimated`,
      date: t.deadline,
      iconType: 'task',
      status,
      taskStatus: t.status,
      priority: t.priority,
      assignee,
    });
  });

  // 4. Project deadline as the final entry (skip if a custom milestone already lands exactly on it)
  const deadlineDate = new Date(p.deadline);
  const hasMilestoneOnDeadline = items.some(it => {
    if (it.kind !== 'milestone') return false;
    return new Date(it.date).getTime() === deadlineDate.getTime();
  });
  if (!hasMilestoneOnDeadline) {
    let endStatus;
    if (p.status === 'Completed') endStatus = 'done';
    else if (deadlineDate < today) endStatus = 'overdue';
    else endStatus = 'upcoming';
    items.push({
      kind: 'end',
      title: 'Project Deadline',
      desc: p.status === 'Completed'
        ? 'Project delivered and closed.'
        : 'Final delivery target for the project.',
      date: p.deadline,
      iconType: 'finish',
      status: endStatus,
    });
  }

  // ---- Sort by date ----
  items.sort((a, b) => new Date(a.date) - new Date(b.date));

  // ---- Progress bar with "today" marker ----
  const startMs = new Date(p.startDate).getTime();
  const endMs   = new Date(p.deadline).getTime();
  const todayMs = today.getTime();
  let timePct;
  if (todayMs <= startMs) timePct = 0;
  else if (todayMs >= endMs) timePct = 100;
  else timePct = Math.round(((todayMs - startMs) / (endMs - startMs)) * 100);

  const totalDays = Math.max(1, Math.round((endMs - startMs) / 86400000));
  const daysLeft = Math.ceil((endMs - todayMs) / 86400000);
  const daysElapsed = Math.max(0, Math.min(totalDays, totalDays - daysLeft));
  const remainingLabel = p.status === 'Completed'
    ? 'Delivered'
    : (daysLeft < 0 ? `${Math.abs(daysLeft)} days overdue` : (daysLeft === 0 ? 'Due today' : `${daysLeft} days remaining`));
  const remainingColor = p.status === 'Completed'
    ? 'var(--green)'
    : (daysLeft < 0 ? 'var(--red)' : (daysLeft <= 14 ? 'var(--amber)' : 'var(--t1)'));

  // ---- Decide where to insert "Today" row inside the timeline list ----
  let todayInsertIdx = items.findIndex(it => new Date(it.date) > today);
  if (todayInsertIdx === -1) todayInsertIdx = items.length; // all in past

  // ---- Build HTML ----
  const iconSvg = (type) => {
    switch (type) {
      case 'check':    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
      case 'progress': return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>';
      case 'alert':    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="12" y1="8" x2="12" y2="13"/><line x1="12" y1="17" x2="12" y2="17"/></svg>';
      case 'start':    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
      case 'finish':   return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22V4M4 4h13l-2 4 2 4H4"/></svg>';
      case 'task':     return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>';
      default:         return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="22" x2="4" y2="15"/><path d="M4 15a5 5 0 0 1 7 0 5 5 0 0 0 7 0V4a5 5 0 0 1-7 0 5 5 0 0 0-7 0z"/></svg>';
    }
  };

  const statusBadge = (status, taskStatus) => {
    if (taskStatus) {
      const sc = taskStatus==='Done' ? 'badge-green'
              : taskStatus==='In Review' ? 'badge-blue'
              : (status === 'overdue' ? 'badge-red' : 'badge-amber');
      return `<span class="badge ${sc}">${taskStatus}</span>`;
    }
    const map = { 'done':['badge-green','Completed'], 'in-progress':['badge-amber','In Progress'], 'overdue':['badge-red','Overdue'], 'upcoming':['badge-grey','Upcoming'] };
    const [cls, label] = map[status] || ['badge-grey','—'];
    return `<span class="badge ${cls}">${label}</span>`;
  };

  const kindPill = (kind) => {
    if (kind === 'task') return `<span style="font-size:10px;color:var(--t3);background:var(--s3);padding:2px 7px;border-radius:999px;font-weight:600;text-transform:uppercase;letter-spacing:0.4px">Task</span>`;
    if (kind === 'start') return `<span style="font-size:10px;color:var(--blue);background:var(--blue-light);padding:2px 7px;border-radius:999px;font-weight:600;text-transform:uppercase;letter-spacing:0.4px">Start</span>`;
    if (kind === 'end')   return `<span style="font-size:10px;color:var(--t1);background:var(--s3);padding:2px 7px;border-radius:999px;font-weight:600;text-transform:uppercase;letter-spacing:0.4px">Deadline</span>`;
    return `<span style="font-size:10px;color:var(--t2);background:var(--s2);padding:2px 7px;border-radius:999px;font-weight:600;text-transform:uppercase;letter-spacing:0.4px">Milestone</span>`;
  };

  const itemHtml = (it) => {
    const assigneeBlock = it.assignee
      ? `<div style="display:flex;align-items:center;gap:6px;margin-top:8px;font-size:11.5px;color:var(--t3)"><div class="avatar avatar-sm" style="background:${it.assignee.color};width:20px;height:20px;font-size:9.5px">${it.assignee.avatar}</div>${it.assignee.name}</div>`
      : '';
    return `<div class="timeline-item ${it.status}">
      <div class="timeline-dot">${iconSvg(it.iconType)}</div>
      <div class="timeline-card">
        <div class="timeline-title">
          ${it.title}
          ${kindPill(it.kind)}
          ${statusBadge(it.status, it.taskStatus)}
        </div>
        <div class="timeline-date">${fmtDate(it.date)}</div>
        ${it.desc ? `<div class="timeline-desc">${it.desc}</div>` : ''}
        ${assigneeBlock}
      </div>
    </div>`;
  };

  // Stats summary
  const doneCount = items.filter(it => it.status === 'done').length;
  const overdueCount = items.filter(it => it.status === 'overdue').length;
  const upcomingCount = items.filter(it => it.status === 'upcoming' || it.status === 'in-progress').length;

  const timelineHtml = items.map((it, idx) => {
    let html = '';
    if (idx === todayInsertIdx && p.status !== 'Completed') {
      html += `<div class="timeline-today-row"><span class="timeline-today-pill">Today · ${fmtDate(new Date())}</span><div class="timeline-today-line"></div></div>`;
    }
    html += itemHtml(it);
    return html;
  }).join('') + (todayInsertIdx === items.length && p.status !== 'Completed'
      ? `<div class="timeline-today-row"><span class="timeline-today-pill">Today · ${fmtDate(new Date())}</span><div class="timeline-today-line"></div></div>`
      : '');

  pane.innerHTML = `
    <!-- Progress overview card -->
    <div class="timeline-progress-card">
      <div class="timeline-progress-meta">
        <div>
          <div style="font-size:13px;font-weight:650;color:var(--t1)">${esc(p.name)}</div>
          <div style="font-size:11.5px;color:var(--t3);margin-top:2px">${fmtDate(p.startDate)} → ${fmtDate(p.deadline)} · ${totalDays} days total</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:15px;font-weight:700;color:${remainingColor}">${remainingLabel}</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">${timePct}% of timeline · ${p.progress}% complete</div>
        </div>
      </div>
      <div class="timeline-progress-bar">
        <div class="timeline-progress-fill" style="width:${p.progress}%"></div>
        ${p.status !== 'Completed' ? `<div class="timeline-today-marker" style="left:${timePct}%"></div>` : ''}
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px">
        <div style="text-align:center;padding:8px;background:var(--green-light);border-radius:var(--r8)">
          <div style="font-size:16px;font-weight:700;color:var(--green)">${doneCount}</div>
          <div style="font-size:10.5px;color:var(--t3);text-transform:uppercase;letter-spacing:0.4px;margin-top:2px">Completed</div>
        </div>
        <div style="text-align:center;padding:8px;background:var(--amber-light);border-radius:var(--r8)">
          <div style="font-size:16px;font-weight:700;color:var(--amber)">${upcomingCount}</div>
          <div style="font-size:10.5px;color:var(--t3);text-transform:uppercase;letter-spacing:0.4px;margin-top:2px">In Flight</div>
        </div>
        <div style="text-align:center;padding:8px;background:${overdueCount?'var(--red-light)':'var(--s2)'};border-radius:var(--r8)">
          <div style="font-size:16px;font-weight:700;color:${overdueCount?'var(--red)':'var(--t3)'}">${overdueCount}</div>
          <div style="font-size:10.5px;color:var(--t3);text-transform:uppercase;letter-spacing:0.4px;margin-top:2px">Overdue</div>
        </div>
      </div>
    </div>

    <!-- Vertical timeline -->
    <div class="timeline-wrap">
      <div class="timeline">${timelineHtml}</div>
    </div>

    ${p.status !== 'Completed' ? `<div style="margin-top:18px;display:flex;justify-content:center">
      <button class="btn btn-secondary btn-sm" onclick="openAddMilestoneModal(${pid})">
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        Add Milestone
      </button>
    </div>` : ''}
  `;
}

/* Add a new milestone to a project */


/* client contact + billing details (used for invoices and invoice emails) */
function _clientFields(px, p) {
  p = p || {};
  return `<div style="border:1px solid var(--b1);border-radius:10px;padding:12px 14px;margin-bottom:14px">
    <div style="font-size:13px;font-weight:600;margin-bottom:2px">\uD83D\uDC64 Client details</div>
    <div style="font-size:11.5px;color:var(--t3);margin-bottom:10px">Invoices for this project are emailed to this address and use these details.</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="form-group"><label class="form-label">Client email</label><input class="form-input" id="${px}-cemail" type="email" value="${escAttr(p.clientEmail || '')}" placeholder="billing@client.com"><div class="form-error" id="${px}-cemail-err">Enter a valid email</div></div>
      <div class="form-group"><label class="form-label">Client phone</label><input class="form-input" id="${px}-cphone" type="tel" value="${escAttr(p.clientPhone || '')}" placeholder="+91 98xxxxxxx"></div>
      <div class="form-group"><label class="form-label">Client GSTIN</label><input class="form-input" id="${px}-cgstin" maxlength="15" value="${escAttr(p.clientGstin || '')}" placeholder="optional, 15 characters"></div>
      <div class="form-group"><label class="form-label">Client state code</label><input class="form-input" id="${px}-cstate" maxlength="2" value="${escAttr(p.clientStateCode || '')}" placeholder="e.g. 09 for UP"><div class="form-hint">Same state as you \u2192 CGST + SGST, else IGST.</div></div>
    </div>
    <div style="margin:4px 0 12px;padding:10px 12px;background:var(--s2);border-radius:10px">
      <div style="font-size:12.5px;font-weight:600;margin-bottom:6px">\uD83E\uDDFE Automatic invoices</div>
      <label style="display:flex;gap:8px;align-items:flex-start;font-size:12.5px;margin-bottom:6px;cursor:pointer">
        <input type="checkbox" id="${px}-autocreate" ${p.autoInvoiceOnCreate ? 'checked' : ''} style="margin-top:2px">
        <span>Invoice the full project value as soon as the project is created</span></label>
      <label style="display:flex;gap:8px;align-items:flex-start;font-size:12.5px;cursor:pointer">
        <input type="checkbox" id="${px}-autodone" ${p.autoInvoiceOnComplete === false ? '' : 'checked'} style="margin-top:2px">
        <span>When the project is completed, invoice whatever is still not billed</span></label>
      <div style="font-size:11px;color:var(--t3);margin-top:6px">With a client email they are emailed with the PDF automatically; without one they wait as drafts. An advance is taken off automatically.</div>
    </div>
    <div class="form-group" style="margin-bottom:0"><label class="form-label">Client address</label><input class="form-input" id="${px}-caddr" value="${escAttr(p.clientAddress || '')}" placeholder="optional \u2014 shown on the invoice"></div>
  </div>`;
}
function _readClient(px) {
  const v = id => (document.getElementById(px + '-' + id)?.value || '').trim();
  let gst = v('cgstin').toUpperCase(), st = v('cstate');
  if (!st && /^\d{2}/.test(gst)) st = gst.slice(0, 2);          // GSTIN starts with the state code
  return { clientEmail: v('cemail'), clientPhone: v('cphone'), clientGstin: gst, clientStateCode: st, clientAddress: v('caddr'),
    autoInvoiceOnCreate: !!document.getElementById(px + '-autocreate')?.checked,
    autoInvoiceOnComplete: !!document.getElementById(px + '-autodone')?.checked };
}
function _clientEmailOk(px) {
  const e = (document.getElementById(px + '-cemail')?.value || '').trim();
  const bad = !!e && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  document.getElementById(px + '-cemail-err')?.classList.toggle('show', bad);
  return !bad;
}