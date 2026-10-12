/* ============================================================
   ANALYTICS MODULE — Detailed, Clean, Top-Notch
   ============================================================ */
function renderAnalytics() {
  const v = document.getElementById('view-analytics');
  v.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">
      <div>
        <div class="section-title" style="font-size:20px">Analytics</div>
        <div class="section-sub">Business intelligence — last 6 months</div>
      </div>
      <div style="display:flex;gap:8px">
        <select class="form-select" style="width:auto;padding:6px 10px;font-size:12px" id="an-period" onchange="renderAnalytics()">
          <option value="6">Last 6 months</option>
          <option value="12">Last 12 months</option>
          <option value="3">Last 3 months</option>
        </select>
        <button class="btn btn-secondary btn-sm" onclick="toast('Export started — check downloads','success')">
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Export
        </button>
      </div>
    </div>

    <!-- ── SECTION 1: Top KPI Strip ── -->
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:24px" id="an-kpi-strip"></div>

    <!-- ── SECTION 2: Revenue + Invoice ── -->
    <div style="display:grid;grid-template-columns:1.6fr 1fr;gap:20px;margin-bottom:20px">
      <div class="card card-pad" id="an-revenue-chart"></div>
      <div class="card card-pad" id="an-invoice-breakdown"></div>
    </div>

    <!-- ── SECTION 3: Projects ── -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">
      <div class="card card-pad" id="an-project-health"></div>
      <div class="card card-pad" id="an-milestone-status"></div>
    </div>

    <!-- ── SECTION 4: Team + Delivery ── -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin-bottom:20px">
      <div class="card card-pad" id="an-dept-perf"></div>
      <div class="card card-pad" id="an-leaderboard"></div>
      <div class="card card-pad" id="an-delivery-funnel"></div>
    </div>

    <!-- ── SECTION 5: Activity Heatmap + Attendance ── -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">
      <div class="card card-pad" id="an-attendance"></div>
      <div class="card card-pad" id="an-activity-log"></div>
    </div>
  `;

  _anKpiStrip();
  _anRevenueChart();
  _anInvoiceBreakdown();
  _anProjectHealth();
  _anMilestoneStatus();
  _anDeptPerf();
  _anLeaderboard();
  _anDeliveryFunnel();
  _anAttendance();
  _anActivityLog();
}

/* ════════════════════════════════════
   KPI STRIP
════════════════════════════════════ */
function _anKpiStrip() {
  const invs       = STATE.invoices;
  const totalBilled   = invs.reduce((s,i) => s + (i.amount||0), 0);
  const totalReceived = invs.reduce((s,i) => s + (i.status==='Paid'?i.amount:i.status==='Partially Paid'?(i.paidAmount||0):0), 0);
  const overdueAmt    = invs.filter(i=>i.status==='Overdue').reduce((s,i)=>s+i.amount,0);
  const activeProj    = STATE.projects.filter(p=>p.status==='Active').length;
  const allDel        = STATE.tasks;
  const doneDel       = allDel.filter(t => t.canonicalStatus === 'DONE');
  const todayIso      = Utils.isoDate(new Date());
  const lateDel       = allDel.filter(t => t.canonicalStatus !== 'DONE' && t.deadline && t.deadline < todayIso);
  const onTimePct     = allDel.length ? Math.round((allDel.length - lateDel.length) / allDel.length * 100) : 100;
  const presentToday  = STATE.employees.filter(e=>e.status==='Present').length;
  const totalEmp      = STATE.employees.length;
  const collectionPct = totalBilled > 0 ? Math.round(totalReceived/totalBilled*100) : 0;

  const kpis = [
    { label:'Total Revenue', value:fmtRupee(totalBilled), sub:`${collectionPct}% collected`, color:'var(--blue)', icon:'₹', trend:'+18%', up:true },
    { label:'Outstanding', value:fmtRupee(totalBilled-totalReceived), sub:`${invs.filter(i=>i.status!=='Paid'&&i.status!=='Draft').length} invoices pending`, color:'var(--amber)', icon:'⏳', trend: overdueAmt>0?`${fmtRupee(overdueAmt)} overdue`:'No overdue', up:false },
    { label:'Active Projects', value:activeProj, sub:`of ${STATE.projects.length} total`, color:'var(--green)', icon:'📁', trend:`${STATE.projects.filter(p=>p.status==='Completed').length} completed`, up:true },
    { label:'On-time Delivery', value:`${onTimePct}%`, sub:`${doneDel.length} of ${allDel.length} deliverables done`, color:'#7C3AED', icon:'\u23F1\uFE0F', trend: lateDel.length ? `${lateDel.length} running late` : 'Nothing overdue', up: lateDel.length === 0 },
    { label:'Team Present', value:`${presentToday}/${totalEmp}`, sub:`${Math.round(presentToday/totalEmp*100)}% attendance`, color:'var(--green)', icon:'👥', trend:`${STATE.employees.filter(e=>e.status==='On Leave').length} on leave`, up:true },
  ];

  document.getElementById('an-kpi-strip').innerHTML = kpis.map(k => `
    <div class="stat-card" style="border-left:3px solid ${k.color}">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:6px">
        <div style="font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.5px">${k.label}</div>
        <div style="font-size:16px">${k.icon}</div>
      </div>
      <div style="font-size:22px;font-weight:800;font-family:var(--mono);color:${k.color};line-height:1.1;margin-bottom:4px">${k.value}</div>
      <div style="font-size:11px;color:var(--t3);margin-bottom:4px">${k.sub}</div>
      <div style="font-size:10px;font-weight:600;color:${k.up?'var(--green)':'var(--amber)'}">${k.up?'↑':'→'} ${k.trend}</div>
    </div>`).join('');
}

/* ════════════════════════════════════
   REVENUE CHART (bar)
════════════════════════════════════ */
/* Real invoices se monthly buckets */
function _anRevenueBuckets(monthsBack) {
  const now = new Date(), buckets = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: dt.getFullYear() + '-' + dt.getMonth(),
      label: dt.toLocaleDateString('en-IN', { month: 'short' }),
      billedPaise: 0, receivedPaise: 0
    });
  }
  const DB = DataAPI.raw();
  DB.invoices.forEach(function (inv) {
    if (inv.status === 'CANCELLED' || inv.status === 'DRAFT') return;
    const dt = new Date(inv.issueDate);
    if (isNaN(dt)) return;
    const b = buckets.find(function (x) { return x.key === dt.getFullYear() + '-' + dt.getMonth(); });
    if (!b) return;
    b.billedPaise += inv.totalPaise;
    b.receivedPaise += inv.paidPaise;
  });
  return buckets;
}

function _anRevenueChart() {
  const monthsBack = parseInt(document.getElementById('an-period')?.value) || 6;
  const _series = _anRevenueBuckets(monthsBack);
  const months = _series.map(b => b.label);
  const revData = _series.map(b => Math.round(Utils.paiseToRupees(b.billedPaise)));
  const maxR    = Math.max(...revData);
  const total   = revData.reduce((a,b)=>a+b,0);
  const avg     = Math.round(total / revData.length);
  const growth  = Math.round((revData[revData.length-1] - revData[0]) / revData[0] * 100);

  document.getElementById('an-revenue-chart').innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:4px">
      <div>
        <div style="font-size:14px;font-weight:700">Monthly Revenue</div>
        <div style="font-size:11px;color:var(--t3)">Billed amount per month</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:20px;font-weight:800;font-family:var(--mono)">₹${(total/100000).toFixed(1)}L</div>
        <div style="font-size:11px;color:var(--green);font-weight:600">↑ ${growth}% over period</div>
      </div>
    </div>

    <!-- Mini stat row -->
    <div style="display:flex;gap:16px;margin-bottom:16px;padding:10px;background:var(--s2);border-radius:var(--r8)">
      <div><div style="font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.4px">Total</div><div style="font-size:13px;font-weight:700;font-family:var(--mono)">₹${(total/100000).toFixed(1)}L</div></div>
      <div><div style="font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.4px">Monthly Avg</div><div style="font-size:13px;font-weight:700;font-family:var(--mono)">₹${(avg/100000).toFixed(1)}L</div></div>
      <div><div style="font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.4px">Peak</div><div style="font-size:13px;font-weight:700;font-family:var(--mono)">₹${(maxR/100000).toFixed(0)}L</div></div>
      <div><div style="font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.4px">Growth</div><div style="font-size:13px;font-weight:700;color:var(--green)">+${growth}%</div></div>
    </div>

    <!-- Bar chart -->
    <div style="display:flex;align-items:flex-end;gap:10px;height:160px;padding-bottom:28px;position:relative">
      <!-- Avg line -->
      <div style="position:absolute;left:0;right:0;bottom:${(avg/maxR)*140+28}px;border-top:1.5px dashed var(--b2);z-index:0">
        <span style="position:absolute;right:0;top:-16px;font-size:9px;color:var(--t3)">avg</span>
      </div>
      ${revData.map((r,i) => {
        const isLast = i === revData.length - 1;
        const isPeak = r === maxR;
        const h = Math.max(8, Math.round((r/maxR)*140));
        return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:0;position:relative;z-index:1">
          ${isPeak?`<div style="font-size:9px;color:var(--blue);font-weight:700;margin-bottom:2px">Peak</div>`:'<div style="font-size:9px;margin-bottom:2px"> </div>'}
          <div style="font-size:9px;font-family:var(--mono);color:var(--t2);margin-bottom:3px">₹${(r/100000).toFixed(0)}L</div>
          <div style="width:100%;height:${h}px;background:${isLast?'var(--blue)':isPeak?'#3B82F6':'var(--blue-light)'};border-radius:var(--r6) var(--r6) 0 0;transition:.2s;cursor:pointer"
            onmouseover="this.style.background='var(--blue)';this.style.transform='scaleY(1.04)'"
            onmouseout="this.style.background='${isLast?'var(--blue)':isPeak?'#3B82F6':'var(--blue-light)'}';this.style.transform='scaleY(1)'">
          </div>
          <div style="font-size:10px;color:var(--t3);font-weight:500;margin-top:4px">${months[i]}</div>
        </div>`;
      }).join('')}
    </div>`;
}

/* ════════════════════════════════════
   INVOICE BREAKDOWN
════════════════════════════════════ */
function _anInvoiceBreakdown() {
  const invs = STATE.invoices;
  const stats = {
    Paid:          { count:0, amt:0, color:'var(--green)', bg:'#ECFDF5' },
    Sent:          { count:0, amt:0, color:'var(--blue)',  bg:'#EFF6FF' },
    Draft:         { count:0, amt:0, color:'var(--t3)',    bg:'var(--s2)' },
    Overdue:       { count:0, amt:0, color:'var(--red)',   bg:'#FEF2F2' },
    'Partially Paid': { count:0, amt:0, color:'var(--amber)', bg:'#FFFBEB' },
  };
  invs.forEach(i => {
    if (stats[i.status]) {
      stats[i.status].count++;
      stats[i.status].amt += i.amount || 0;
    }
  });
  const totalAmt = invs.reduce((s,i)=>s+(i.amount||0),0);
  const collPct  = totalAmt > 0 ? Math.round((stats['Paid'].amt + (invs.filter(i=>i.status==='Partially Paid').reduce((s,i)=>s+(i.paidAmount||0),0))) / totalAmt * 100) : 0;

  document.getElementById('an-invoice-breakdown').innerHTML = `
    <div style="font-size:14px;font-weight:700;margin-bottom:4px">Invoice Overview</div>
    <div style="font-size:11px;color:var(--t3);margin-bottom:14px">${invs.length} invoices · ${collPct}% collected</div>

    <!-- Collection arc (simple progress) -->
    <div style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;margin-bottom:5px">
        <span style="font-size:11px;color:var(--t3)">Collection rate</span>
        <span style="font-size:12px;font-weight:700;color:${collPct>=70?'var(--green)':collPct>=40?'var(--amber)':'var(--red)'}">${collPct}%</span>
      </div>
      <div style="height:10px;background:var(--s2);border-radius:99px;overflow:hidden">
        <div style="height:100%;width:${collPct}%;background:${collPct>=70?'var(--green)':collPct>=40?'var(--amber)':'var(--red)'};border-radius:99px;transition:width .5s"></div>
      </div>
    </div>

    <!-- Status breakdown -->
    <div style="display:flex;flex-direction:column;gap:8px">
      ${Object.entries(stats).map(([status, d]) => {
        const pct = totalAmt > 0 ? Math.round(d.amt/totalAmt*100) : 0;
        return `<div style="padding:10px 12px;background:${d.bg};border-radius:var(--r8);display:flex;align-items:center;gap:10px">
          <div style="width:8px;height:8px;border-radius:50%;background:${d.color};flex-shrink:0"></div>
          <div style="flex:1">
            <div style="font-size:12px;font-weight:600">${status}</div>
            <div style="font-size:10px;color:${d.color}">${d.count} invoice${d.count!==1?'s':''}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:12px;font-weight:700;font-family:var(--mono)">${fmtRupee(d.amt)}</div>
            <div style="font-size:10px;color:var(--t3)">${pct}%</div>
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

/* ════════════════════════════════════
   PROJECT HEALTH
════════════════════════════════════ */
function _anProjectHealth() {
  const projs = STATE.projects;

  document.getElementById('an-project-health').innerHTML = `
    <div style="font-size:14px;font-weight:700;margin-bottom:4px">Project Health</div>
    <div style="font-size:11px;color:var(--t3);margin-bottom:14px">${projs.length} projects · budget utilization</div>

    <!-- Status pills -->
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px">
      ${[['Active','var(--blue)'],['Planning','#7C3AED'],['Completed','var(--green)'],['On Hold','var(--amber)']].map(([s,c])=>{
        const count = projs.filter(p=>p.status===s).length;
        return `<div style="display:flex;align-items:center;gap:5px;padding:4px 10px;border-radius:99px;background:var(--s2);font-size:11px;font-weight:600">
          <span style="width:7px;height:7px;border-radius:50%;background:${c}"></span>${s} <span style="color:var(--t3)">${count}</span></div>`;
      }).join('')}
    </div>

    <!-- Project budget bars -->
    <div style="display:flex;flex-direction:column;gap:10px">
      ${projs.map(p => {
        const pct  = p.budget > 0 ? Math.min(100, Math.round((p.spent||0)/p.budget*100)) : 0;
        const col  = pct > 90 ? 'var(--red)' : pct > 70 ? 'var(--amber)' : 'var(--green)';
        const sc   = p.status==='Active'?'badge-green':p.status==='Completed'?'badge-blue':p.status==='Planning'?'badge-amber':'badge-grey';
        const msDone  = (p.milestones||[]).filter(m=>m.status==='Done').length;
        const msTotal = (p.milestones||[]).length;
        return `<div style="padding:10px 12px;border:1px solid var(--b1);border-radius:var(--r8)">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
            <div>
              <div style="font-size:12px;font-weight:600">${esc(p.name)}</div>
              <div style="font-size:10.5px;color:var(--t3)">${esc(p.client)} · ${msDone}/${msTotal} milestones</div>
            </div>
            <div style="display:flex;align-items:center;gap:6px">
              <span class="badge ${sc}" style="font-size:9px">${p.status}</span>
              <span style="font-size:11px;font-weight:700;font-family:var(--mono);color:${col}">${pct}%</span>
            </div>
          </div>
          <div style="height:5px;background:var(--s2);border-radius:99px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${col};border-radius:99px;transition:width .4s"></div>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:4px">
            <span style="font-size:10px;color:var(--t3)">Spent: <strong style="color:var(--t2)">${fmtRupee(p.spent||0)}</strong></span>
            <span style="font-size:10px;color:var(--t3)">Budget: <strong style="color:var(--t2)">${fmtRupee(p.budget)}</strong></span>
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

/* ════════════════════════════════════
   MILESTONE STATUS
════════════════════════════════════ */
function _anMilestoneStatus() {
  const allMs   = STATE.projects.flatMap(p => (p.milestones||[]).map(m => ({...m, projName:p.name, projId:p.id})));
  const done    = allMs.filter(m=>m.status==='Done').length;
  const inProg  = allMs.filter(m=>m.status==='In Progress').length;
  const todo    = allMs.filter(m=>m.status==='To Do').length;
  const total   = allMs.length;
  const donePct = total > 0 ? Math.round(done/total*100) : 0;

  // Count uninvoiced done milestones
  const uninvoiced = allMs.filter(m => {
    if (m.status !== 'Done') return false;
    return !STATE.invoices.find(i => i.milestoneId === m.id);
  });

  document.getElementById('an-milestone-status').innerHTML = `
    <div style="font-size:14px;font-weight:700;margin-bottom:4px">Milestone Tracker</div>
    <div style="font-size:11px;color:var(--t3);margin-bottom:14px">${total} milestones across ${STATE.projects.length} projects</div>

    <!-- Big donut-like stat -->
    <div style="display:flex;align-items:center;gap:20px;margin-bottom:16px">
      <div style="position:relative;width:80px;height:80px;flex-shrink:0">
        <svg viewBox="0 0 80 80" width="80" height="80">
          <circle cx="40" cy="40" r="30" fill="none" stroke="var(--s2)" stroke-width="10"/>
          <circle cx="40" cy="40" r="30" fill="none" stroke="var(--green)" stroke-width="10"
            stroke-dasharray="${2*Math.PI*30}" stroke-dashoffset="${2*Math.PI*30*(1-donePct/100)}"
            stroke-linecap="round" transform="rotate(-90 40 40)" style="transition:stroke-dashoffset .6s"/>
        </svg>
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;font-family:var(--mono)">${donePct}%</div>
      </div>
      <div>
        <div style="font-size:11px;color:var(--t3);margin-bottom:4px">Overall completion</div>
        <div style="display:flex;flex-direction:column;gap:4px">
          ${[['Done',done,'var(--green)','#ECFDF5'],['In Progress',inProg,'var(--blue)','#EFF6FF'],['To Do',todo,'var(--t3)','var(--s2)']].map(([l,c,col,bg])=>`
          <div style="display:flex;align-items:center;gap:6px">
            <span style="width:6px;height:6px;border-radius:50%;background:${col}"></span>
            <span style="font-size:11px;color:var(--t2)">${l}</span>
            <span style="font-size:11px;font-weight:700;font-family:var(--mono);margin-left:auto">${c}</span>
          </div>`).join('')}
        </div>
      </div>
    </div>

    <!-- Uninvoiced alert -->
    ${uninvoiced.length > 0 ? `
    <div style="padding:10px 12px;background:#ECFDF5;border-radius:var(--r8);border-left:3px solid var(--green);margin-bottom:14px">
      <div style="font-size:11.5px;font-weight:600;color:var(--green);margin-bottom:2px">💰 ${uninvoiced.length} milestone${uninvoiced.length>1?'s':''} not yet invoiced</div>
      <div style="font-size:10.5px;color:var(--t3)">Completed but no invoice generated</div>
    </div>` : ''}

    <!-- Per-project milestone progress -->
    <div style="display:flex;flex-direction:column;gap:8px">
      ${STATE.projects.map(p => {
        const ms    = p.milestones || [];
        const d     = ms.filter(m=>m.status==='Done').length;
        const pct   = ms.length > 0 ? Math.round(d/ms.length*100) : 0;
        const col   = pct===100?'var(--green)':pct>50?'var(--blue)':'var(--t3)';
        return `<div>
          <div style="display:flex;justify-content:space-between;margin-bottom:3px">
            <span style="font-size:11.5px;font-weight:500">${esc(p.name)}</span>
            <span style="font-size:11px;font-family:var(--mono);color:${col};font-weight:600">${d}/${ms.length}</span>
          </div>
          <div style="height:5px;background:var(--s2);border-radius:99px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${col};border-radius:99px;transition:width .4s"></div>
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

/* ════════════════════════════════════
   DEPARTMENT PERFORMANCE
════════════════════════════════════ */
function _anDeptPerf() {
  document.getElementById('an-dept-perf').innerHTML = `
    <div style="font-size:14px;font-weight:700;margin-bottom:4px">Department Performance</div>
    <div style="font-size:11px;color:var(--t3);margin-bottom:14px">Average score per department</div>
    <div style="display:flex;flex-direction:column;gap:10px">
      ${STATE.departments.map(d => {
        const emps     = STATE.employees.filter(e => e.dept === d.name);
        const avgScore = emps.length ? Math.round(emps.reduce((s,e)=>s+e.score,0)/emps.length) : 0;
        const present  = emps.filter(e=>e.status==='Present').length;
        const col      = avgScore >= 85 ? 'var(--green)' : avgScore >= 70 ? 'var(--amber)' : 'var(--red)';
        const bg       = avgScore >= 85 ? '#ECFDF5' : avgScore >= 70 ? '#FFFBEB' : '#FEF2F2';
        return `<div style="padding:10px 12px;background:${bg};border-radius:var(--r8)">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
            <div>
              <div style="font-size:12px;font-weight:600">${esc(d.name)}</div>
              <div style="font-size:10.5px;color:var(--t3)">${emps.length} members · ${present} present</div>
            </div>
            <div style="font-size:20px;font-weight:800;font-family:var(--mono);color:${col}">${avgScore}</div>
          </div>
          <div style="height:5px;background:rgba(0,0,0,0.06);border-radius:99px;overflow:hidden">
            <div style="height:100%;width:${avgScore}%;background:${col};border-radius:99px"></div>
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

/* ════════════════════════════════════
   EMPLOYEE LEADERBOARD
════════════════════════════════════ */
function _anLeaderboard() {
  const sorted = [...STATE.employees].sort((a,b) => b.score - a.score).slice(0, 8);
  const medals = ['🥇','🥈','🥉'];

  document.getElementById('an-leaderboard').innerHTML = `
    <div style="font-size:14px;font-weight:700;margin-bottom:4px">Top Performers</div>
    <div style="font-size:11px;color:var(--t3);margin-bottom:14px">Ranked by performance score</div>
    <div style="display:flex;flex-direction:column;gap:6px">
      ${sorted.map((e, i) => {
        const col = e.score >= 90 ? 'var(--green)' : e.score >= 75 ? 'var(--blue)' : 'var(--t3)';
        return `<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:var(--r8);background:${i<3?'var(--s2)':'transparent'};transition:.15s"
          onmouseover="this.style.background='var(--s2)'" onmouseout="this.style.background='${i<3?'var(--s2)':'transparent'}'">
          <div style="font-size:14px;width:20px;text-align:center">${medals[i] || `<span style="font-size:11px;color:var(--t3);font-weight:600">${i+1}</span>`}</div>
          <div class="avatar" style="background:${e.color};width:28px;height:28px;font-size:10px;flex-shrink:0">${e.avatar}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(e.name)}</div>
            <div style="font-size:10px;color:var(--t3)">${esc(e.dept)}</div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-size:14px;font-weight:800;font-family:var(--mono);color:${col}">${e.score}</div>
            <div style="font-size:9px;color:var(--t3)">${e.status}</div>
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

/* ════════════════════════════════════
   LEAD FUNNEL
════════════════════════════════════ */
function _anDeliveryFunnel() {
  const el = document.getElementById('an-delivery-funnel');
  if (!el) return;

  const stages = [
    { key:'TODO',        label:'Not started', color:'#9B9899' },
    { key:'IN_PROGRESS', label:'In progress', color:'#2563EB' },
    { key:'IN_REVIEW',   label:'Awaiting review', color:'#7C3AED' },
    { key:'REJECTED',    label:'Returned', color:'#DC2626' },
    { key:'DONE',        label:'Delivered', color:'#059669' }
  ];

  const all = STATE.tasks;
  const counts = stages.map(s => all.filter(t => t.canonicalStatus === s.key).length);
  const maxCount = Math.max(...counts, 1);
  const todayIso = Utils.isoDate(new Date());

  const done = all.filter(t => t.canonicalStatus === 'DONE');
  const late = all.filter(t => t.canonicalStatus !== 'DONE' && t.deadline && t.deadline < todayIso);
  const returned = all.filter(t => t.approvalState === 'REJECTED').length;
  const firstPassPct = (done.length + returned) > 0
    ? Math.round(done.length / (done.length + returned) * 100) : 100;

  const estRows = done.filter(t => t.hours > 0 && t.loggedHours > 0);
  const avgOverrun = estRows.length
    ? Math.round(estRows.reduce((s, t) => s + (t.loggedHours / t.hours - 1) * 100, 0) / estRows.length)
    : 0;

  el.innerHTML = `
    <div style="font-size:14px;font-weight:700;margin-bottom:4px">Delivery Funnel</div>
    <div style="font-size:11px;color:var(--t3);margin-bottom:14px">${all.length} deliverables · ${firstPassPct}% approved first time</div>

    <div style="display:flex;gap:10px;margin-bottom:14px">
      <div style="flex:1;padding:8px;background:#ECFDF5;border-radius:var(--r8);text-align:center">
        <div style="font-size:9px;color:var(--green);text-transform:uppercase;letter-spacing:.4px">Delivered</div>
        <div style="font-size:18px;font-weight:800;color:var(--green)">${done.length}</div>
      </div>
      <div style="flex:1;padding:8px;background:${late.length ? '#FEF2F2' : 'var(--s2)'};border-radius:var(--r8);text-align:center">
        <div style="font-size:9px;color:${late.length ? 'var(--red)' : 'var(--t3)'};text-transform:uppercase;letter-spacing:.4px">Late</div>
        <div style="font-size:18px;font-weight:800;color:${late.length ? 'var(--red)' : 'var(--t3)'}">${late.length}</div>
      </div>
      <div style="flex:1;padding:8px;background:#EFF6FF;border-radius:var(--r8);text-align:center">
        <div style="font-size:9px;color:var(--blue);text-transform:uppercase;letter-spacing:.4px">Est. drift</div>
        <div style="font-size:13px;font-weight:800;color:var(--blue);font-family:var(--mono)">${avgOverrun >= 0 ? '+' : ''}${avgOverrun}%</div>
      </div>
    </div>

    ${stages.map((s, i) => {
      const c = counts[i];
      const pct = Math.round(c / maxCount * 100);
      return `<div style="margin-bottom:9px">
        <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:3px">
          <span style="color:var(--t2)">${s.label}</span>
          <span style="font-weight:700;font-family:var(--mono);color:${s.color}">${c}</span>
        </div>
        <div style="height:6px;background:var(--s2);border-radius:99px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${s.color};border-radius:99px;transition:width .4s"></div>
        </div>
      </div>`;
    }).join('')}

    ${counts[2] > 0 ? `<div style="margin-top:12px;padding:9px 11px;background:#F5F3FF;border-radius:var(--r8);font-size:11.5px;color:#5B21B6">
      <strong>${counts[2]}</strong> deliverable${counts[2] === 1 ? '' : 's'} waiting on your review — team is blocked.
    </div>` : ''}
  `;
}

/* ════════════════════════════════════
   ATTENDANCE
════════════════════════════════════ */
function _anAttendance() {
  const emps       = STATE.employees;
  const present    = emps.filter(e=>e.status==='Present').length;
  const absent     = emps.filter(e=>e.status==='Absent').length;
  const onLeave    = emps.filter(e=>e.status==='On Leave').length;
  const total      = emps.length;
  const pct        = Math.round(present/total*100);

  // Dept-wise breakdown
  const depts = [...new Set(emps.map(e=>e.dept))];

  document.getElementById('an-attendance').innerHTML = `
    <div style="font-size:14px;font-weight:700;margin-bottom:4px">Today's Attendance</div>
    <div style="font-size:11px;color:var(--t3);margin-bottom:16px">${total} employees total</div>

    <!-- Big attendance number -->
    <div style="display:flex;align-items:center;gap:20px;margin-bottom:16px">
      <div style="position:relative;width:80px;height:80px;flex-shrink:0">
        <svg viewBox="0 0 80 80" width="80" height="80">
          <circle cx="40" cy="40" r="30" fill="none" stroke="var(--s2)" stroke-width="10"/>
          <circle cx="40" cy="40" r="30" fill="none" stroke="${pct>=80?'var(--green)':pct>=60?'var(--amber)':'var(--red)'}" stroke-width="10"
            stroke-dasharray="${2*Math.PI*30}" stroke-dashoffset="${2*Math.PI*30*(1-pct/100)}"
            stroke-linecap="round" transform="rotate(-90 40 40)"/>
        </svg>
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;font-family:var(--mono)">${pct}%</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="width:8px;height:8px;border-radius:50%;background:var(--green)"></span>
          <span style="font-size:12px;color:var(--t2)">Present</span>
          <span style="font-size:14px;font-weight:700;font-family:var(--mono);margin-left:auto">${present}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="width:8px;height:8px;border-radius:50%;background:var(--red)"></span>
          <span style="font-size:12px;color:var(--t2)">Absent</span>
          <span style="font-size:14px;font-weight:700;font-family:var(--mono);margin-left:auto">${absent}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="width:8px;height:8px;border-radius:50%;background:var(--amber)"></span>
          <span style="font-size:12px;color:var(--t2)">On Leave</span>
          <span style="font-size:14px;font-weight:700;font-family:var(--mono);margin-left:auto">${onLeave}</span>
        </div>
      </div>
    </div>

    <!-- Dept-wise -->
    <div style="font-size:11px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px">By Department</div>
    <div style="display:flex;flex-direction:column;gap:7px">
      ${depts.map(dept => {
        const de = emps.filter(e=>e.dept===dept);
        const dp = de.filter(e=>e.status==='Present').length;
        const dpct = de.length > 0 ? Math.round(dp/de.length*100) : 0;
        const col = dpct >= 80 ? 'var(--green)' : dpct >= 60 ? 'var(--amber)' : 'var(--red)';
        return `<div>
          <div style="display:flex;justify-content:space-between;margin-bottom:3px">
            <span style="font-size:11px;color:var(--t2)">${dept}</span>
            <span style="font-size:11px;font-family:var(--mono);color:${col};font-weight:600">${dp}/${de.length}</span>
          </div>
          <div style="height:5px;background:var(--s2);border-radius:99px;overflow:hidden">
            <div style="height:100%;width:${dpct}%;background:${col};border-radius:99px"></div>
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

/* ════════════════════════════════════
   ACTIVITY LOG
════════════════════════════════════ */
function _anActivityLog() {
  const feed = (STATE.activityFeed || []).slice(0, 12);

  const typeIcon = {
    task:     { icon:'✅', col:'var(--green)', bg:'#ECFDF5' },
    invoice:  { icon:'🧾', col:'var(--blue)',  bg:'#EFF6FF' },
    project:  { icon:'📁', col:'#7C3AED',      bg:'#F5F3FF' },
    lead:     { icon:'🎯', col:'var(--amber)', bg:'#FFFBEB' },
    employee: { icon:'👤', col:'var(--t2)',    bg:'var(--s2)' },
    message:  { icon:'💬', col:'var(--blue)',  bg:'#EFF6FF' },
  };

  document.getElementById('an-activity-log').innerHTML = `
    <div style="font-size:14px;font-weight:700;margin-bottom:4px">Recent Activity</div>
    <div style="font-size:11px;color:var(--t3);margin-bottom:14px">Live platform events</div>
    <div style="display:flex;flex-direction:column;gap:6px;max-height:360px;overflow-y:auto">
      ${feed.length ? feed.map(a => {
        const t = typeIcon[a.type] || typeIcon.task;
        return `<div style="display:flex;align-items:flex-start;gap:10px;padding:8px 10px;border-radius:var(--r8);background:var(--s2)">
          <div style="width:28px;height:28px;border-radius:var(--r6);background:${t.bg};display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0">${t.icon}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:500;line-height:1.4">${a.text || a.msg || 'Activity recorded'}</div>
            <div style="font-size:10px;color:var(--t3);margin-top:2px">${a.time || ''}</div>
          </div>
        </div>`;
      }).join('') : `<div style="text-align:center;padding:32px;color:var(--t3)"><div style="font-size:24px;margin-bottom:8px">📋</div>No recent activity</div>`}
    </div>`;
}