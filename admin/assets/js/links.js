/* ============================================================
   LINKS — click anything on the dashboard / bell and land on it
   ============================================================ */

/* type: DELIVERABLE | SUBTASK | MILESTONE | PROJECT | INVOICE | EMPLOYEE |
         LEAVE | REGULARISATION | WALLET | DISPUTE | NOTICE | CONVERSATION */
function openEntity(type, id) {
  const DB = DataAPI.raw();
  const same = (a, b) => String(a) === String(b);
  switch (String(type || '').toUpperCase()) {
    case 'SUBTASK': {
      const s = (DB.subtasks || []).find(x => same(x.id, id));
      if (s) return openEntity('DELIVERABLE', s.deliverableId);
      break;
    }
    case 'DELIVERABLE': {
      const d = (DB.deliverables || []).find(x => same(x.id, id));
      if (!d) break;
      openProjectDetail(d.projectId);
      setTimeout(() => openDeliverableDetail(d.projectId, d.id), 120);
      return true;
    }
    case 'MILESTONE': {
      const m = (DB.milestones || []).find(x => same(x.id, id));
      if (!m) break;
      jumpToMilestone(m.projectId, m.id);
      return true;
    }
    case 'PROJECT':
      if ((DB.projects || []).some(p => same(p.id, id))) { openProjectDetail(Number(id)); return true; }
      break;
    case 'INVOICE': {
      const i = (DB.invoices || []).find(x => same(x.id, id));
      if (!i) break;
      gotoModule('invoices');
      setTimeout(() => openInvoiceDetailModal(i.id), 80);
      return true;
    }
    case 'EMPLOYEE':
      gotoModule('employees');
      setTimeout(() => openEmpDetail(Number(id)), 80);
      return true;
    case 'CONVERSATION':
      gotoModule('messages');
      setTimeout(() => openConversation(String(id)), 80);
      return true;
    /* straight to the tab where it can be approved */
    case 'LEAVE': case 'REGULARISATION':
      if (typeof HR_TAB !== 'undefined') HR_TAB = 'leave';
      if (typeof HR_LEAVE_FILTER !== 'undefined') HR_LEAVE_FILTER = 'PENDING';
      gotoModule('hrm');
      setTimeout(function () {
        const box = document.querySelector('#view-hrm .card');
        if (box && box.scrollIntoView) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
      return true;
    case 'WALLET': case 'DISPUTE':
      if (typeof PO_TAB !== 'undefined') PO_TAB = type === 'DISPUTE' ? 'disputes' : 'overview';
      gotoModule('payouts'); return true;
    case 'PENALTY': case 'PENALTY_APPEAL':
      gotoModule('penalties'); return true;
    case 'NOTICE': gotoModule('notices'); return true;
  }
  return false;
}

/* Bell notification: mark as read, close the dropdown, open what it is about */
function openNotification(id) {
  const n = STATE.notifications.find(x => String(x.id) === String(id));
  document.getElementById('notif-dropdown')?.classList.remove('open');
  if (n && !n.read) {
    DataAPI.markNotificationRead(n.id).then(function () { syncState(); renderNotifications(); }).catch(function () {});
  }
  if (!n) return;
  if (!openEntity(n.entityType, n.entityId)) {
    const t = (n.text + ' ' + n.sub).toLowerCase();
    if (/leave|regularis/.test(t)) gotoModule('hrm');
    else if (/wallet|payout|dispute|estimate/.test(t)) gotoModule('payouts');
    else if (/invoice|payment/.test(t)) gotoModule('invoices');
    else if (/notice/.test(t)) gotoModule('notices');
  }
}

/* Live feed item → the thing it mentions.
   Looks at the quoted text ("Task name") and the bold text (<strong>…</strong>)
   and finds the matching invoice, task, milestone, project or person. */
function openActivity(index) {
  const a = STATE.activityFeed[index];
  if (!a) return;
  const DB = DataAPI.raw();
  const html = String(a.text || '');
  const plain = new DOMParser().parseFromString(html, 'text/html').documentElement.textContent;

  /* page-level events first */
  if (/\bleave\b|regularis|attendance correction/i.test(plain)) return openEntity('LEAVE');
  if (/\bnotice\b/i.test(plain)) return openEntity('NOTICE');
  if (/\bmessage\b/i.test(plain)) { gotoModule('messages'); return; }
  if (/payout|wallet|bonus|milestone pay|dispute|estimate agreed|credited/i.test(plain)) return openEntity('WALLET');
  if (/recurring/i.test(plain)) { gotoModule('invoices'); return; }
  if (/employee (added|created|deactivated|reactivated)|joined the team/i.test(plain)) {
    const m = /<strong>([\s\S]*?)<\/strong>/.exec(html);
    const nm = m ? m[1].replace(/<[^>]*>/g, '').trim() : '';
    const emp = (DB.employees || []).find(x => x.name === nm);
    if (emp) return openEntity('EMPLOYEE', emp.id);
    gotoModule('employees'); return;
  }

  const inv = /INV\/[\w\/-]+/.exec(plain);
  if (inv) {
    const i = (DB.invoices || []).find(x => x.number === inv[0]);
    if (i) return openEntity('INVOICE', i.id);
  }

  const cands = [];
  plain.replace(/"([^"]+)"|“([^”]+)”/g, (_, x, y) => { cands.push((x || y).trim()); return _; });
  html.replace(/<strong>([\s\S]*?)<\/strong>/g, (_, x) => {
    cands.push(new DOMParser().parseFromString(x, 'text/html').documentElement.textContent.replace(/^["“]|["”]$/g, '').trim());
    return _;
  });

  const kinds = /milestone/i.test(plain) ? ['MILESTONE', 'DELIVERABLE', 'PROJECT', 'EMPLOYEE']
              : /project/i.test(plain) ? ['PROJECT', 'MILESTONE', 'DELIVERABLE', 'EMPLOYEE']
              : /added to the team|joined/i.test(plain) ? ['EMPLOYEE', 'DELIVERABLE', 'PROJECT', 'MILESTONE']
              : ['DELIVERABLE', 'MILESTONE', 'PROJECT', 'EMPLOYEE'];
  const lists = { DELIVERABLE: [DB.deliverables, 'title'], MILESTONE: [DB.milestones, 'title'], PROJECT: [DB.projects, 'name'], EMPLOYEE: [DB.employees, 'name'] };
  for (const c of cands) {
    for (const k of kinds) {
      const hit = (lists[k][0] || []).filter(x => String(x[lists[k][1]] || '').toLowerCase() === c.toLowerCase()).pop();
      if (hit) return openEntity(k, hit.id);
    }
  }
  if (/invoice|payment/i.test(plain)) return gotoModule('invoices');
  if (/notice/i.test(plain)) return gotoModule('notices');
  if (/settings/i.test(plain)) return gotoModule('settings');
  if (/leave|attendance/i.test(plain)) return gotoModule('hrm');
  toast('Nothing to open for this item', 'error');
}

function openMsgFromDashboard(id) { openEntity('CONVERSATION', id); }

/* Sidebar name / top-right avatar → My account */
function openMyProfile() {
  gotoModule('settings');
  setTimeout(() => setSettingsTab('account'), 30);
}