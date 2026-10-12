/* the page in the address bar when the app was opened (kept for after sign-in) */
var OMENT_START_HASH = location.hash;
/* ============================================================
   NAVIGATION
   ============================================================ */
function gotoModule(name, _skipHistory) {
  // Push previous module to history (unless we're going back, or returning to the same module)
  if (!_skipHistory && STATE.currentModule && STATE.currentModule !== name) {
    STATE.moduleHistory.push(STATE.currentModule);
    // Cap history to avoid runaway growth
    if (STATE.moduleHistory.length > 40) STATE.moduleHistory.shift();
  }

  // Close any open launcher
  document.getElementById('app-launcher').classList.remove('open');

  // Hide all views
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const targetView = document.getElementById('view-' + name);
  if (targetView) targetView.classList.add('active');

  const navItem = document.querySelector(`[data-nav="${name}"]`);
  if (navItem) navItem.classList.add('active');

  // Update topbar title
  const titles = { dashboard:'Dashboard', departments:'Departments', employees:'Employees', hrm:'People', profit:'Profitability', payouts:'Payouts', penalties:'Penalties', help:'Help', projects:'Projects', invoices:'Books', messages:'Messages', settings:'Settings', 'project-detail':'Project Detail', calendar:'Calendar', notices:'Notice Board', calling:'Calling', een:'Ask Een AI', analytics:'Analytics' };
  document.getElementById('topbar-title').textContent = titles[name] || name;

  STATE.currentModule = name;
  /* remember the page in the address bar, so a refresh opens the same page */
  try {
    var h = name === 'project-detail' && STATE.currentProject != null ? 'project/' + STATE.currentProject : name;
    if (location.hash !== '#' + h) history.replaceState(null, '', '#' + h);
  } catch (e) {}

  // Close sidebar on mobile after navigation
  if (window.innerWidth <= 768) closeSidebar();

  // Reset transient notice-detail-on-mobile state when leaving the notices module
  if (name !== 'notices') STATE.noticeDetailOpen = false;

  // Render module
  switch(name) {
    case 'dashboard': renderDashboard(); break;
    case 'departments': renderDepartments(); break;
    case 'employees': renderEmployees(); break;
    case 'hrm': renderHrm(); break;
    case 'profit': renderProfit(); break;
    case 'payouts': renderPayouts(); break;
    case 'penalties': renderPenalties(); break;
    case 'help': renderHelp(); break;
    case 'projects': renderProjects(); break;
    case 'invoices': renderInvoices(); break;
    case 'messages': renderMessages(); break;
    case 'calendar': renderCalendar(); break;
    case 'notices': renderNoticesModule(); break;
    case 'calling': renderCalling(); break;
    case 'een': renderEen(); break;
    case 'analytics': renderAnalytics(); break;
    case 'settings': renderSettings(); break;
  }

  closeSidebar();
  updateBackButton();
}

/* ============================================================
   GLOBAL BACK NAVIGATION
   ============================================================ */
function updateBackButton() {
  const btn = document.getElementById('topbar-back');
  if (!btn) return;
  // Show back button if we have history OR we're inside a contextual sub-view
  // (project detail, mobile notice detail, or compose-notice mode).
  const inSubView =
    STATE.currentModule === 'project-detail' ||
    (STATE.currentModule === 'notices' && STATE.noticeDetailOpen) ||
    (STATE.currentModule === 'notices' && typeof noticeCompose !== 'undefined' && noticeCompose.active);
  const canPop = STATE.moduleHistory.length > 0;
  btn.style.display = (inSubView || canPop) ? 'inline-flex' : 'none';
}

function goBack() {
  // Priority 1: leave compose-notice mode
  if (STATE.currentModule === 'notices' && typeof noticeCompose !== 'undefined' && noticeCompose.active) {
    noticeCompose.active = false;
    renderNoticesModule();
    updateBackButton();
    return;
  }
  // Priority 2: close a mobile notice detail back to the list
  if (STATE.currentModule === 'notices' && STATE.noticeDetailOpen) {
    STATE.noticeDetailOpen = false;
    renderNoticesModule();
    updateBackButton();
    return;
  }
  // Priority 3: leave project detail back to projects list
  if (STATE.currentModule === 'project-detail') {
    gotoModule('projects', true);
    return;
  }
  // Otherwise pop the module history
  if (STATE.moduleHistory.length > 0) {
    const prev = STATE.moduleHistory.pop();
    gotoModule(prev, true);
  } else {
    // Fallback — go home
    gotoModule('dashboard', true);
  }
}

function launcherSearch(q) {
  const cards = document.querySelectorAll('#launcher-grid .app-card');
  cards.forEach(card => {
    const name = card.querySelector('.app-name')?.textContent?.toLowerCase() || '';
    const desc = card.querySelector('.app-desc')?.textContent?.toLowerCase() || '';
    card.style.display = (!q || name.includes(q.toLowerCase()) || desc.includes(q.toLowerCase())) ? '' : 'none';
  });
}

function launchApp(name) {
  closeLauncher();
  gotoModule(name);
}

function openLauncher() {
  document.getElementById('app-launcher').classList.add('open');
  // Reset search
  const si = document.getElementById('launcher-search-input');
  if (si) { si.value = ''; launcherSearch(''); si.focus(); }
  // On mobile: scroll to top
  const box = document.querySelector('.launcher-box');
  if (box) box.scrollTop = 0;
}

function closeLauncher(e) {
  if (!e || e.target === document.getElementById('app-launcher')) {
    document.getElementById('app-launcher').classList.remove('open');
    const si = document.getElementById('launcher-search-input');
    if (si) { si.value = ''; }
  }
}

/* ============================================================
   SIDEBAR MOBILE
   ============================================================ */
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('mobile-overlay').style.display = 'block';
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('mobile-overlay').style.display = 'none';
}

/* ============================================================
   PANEL
   ============================================================ */
function openPanel(title, bodyHTML, footerHTML='') {
  document.getElementById('panel-title').textContent = title;
  document.getElementById('panel-body').innerHTML = bodyHTML;
  document.getElementById('panel-footer').innerHTML = footerHTML;
  document.getElementById('panel-overlay').classList.add('open');
  document.getElementById('slide-panel').classList.add('open');
}

function closePanel() {
  document.getElementById('panel-overlay').classList.remove('open');
  document.getElementById('slide-panel').classList.remove('open');
}

/* ============================================================
   MODAL
   ============================================================ */
function openModal(title, bodyHTML, footerHTML='') {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHTML;
  document.getElementById('modal-footer').innerHTML = footerHTML;
  document.getElementById('modal-overlay').classList.add('open');
}

function closeModal(e) {
  if (!e || e.target === document.getElementById('modal-overlay')) {
    document.getElementById('modal-overlay').classList.remove('open');
    // Reset any width modifiers
    const mb = document.querySelector('#modal-overlay .modal-box');
    if (mb) mb.classList.remove('modal-wide');
  }
}

/* ============================================================
   CONFIRM DIALOG
   ============================================================ */
let _confirmCb = null;
function showConfirm(msg, cb) {
  document.getElementById('confirm-msg').textContent = msg;
  document.getElementById('confirm-overlay').style.display = 'flex';
  _confirmCb = cb;
  document.getElementById('confirm-yes-btn').onclick = () => { closeConfirm(); if(_confirmCb) _confirmCb(); };
}
function closeConfirm() {
  document.getElementById('confirm-overlay').style.display = 'none';
}

/* ============================================================
   TOAST
   ============================================================ */
function toast(msg, type='') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${type==='success'?'✓':type==='error'?'✕':'ℹ'}</span> ${msg}`;
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 400);
  }, 3000);
}

/* ============================================================
   TABS
   ============================================================ */
function switchTab(el, paneId) {
  const bar = el.closest('.tab-bar');
  bar.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  const parent = bar.nextElementSibling?.parentElement || bar.parentElement;
  parent.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  document.getElementById(paneId)?.classList.add('active');
}

/* ============================================================
   AVATAR COLOR HELPER
   ============================================================ */
const COLORS = ['#2563EB','#7C3AED','#059669','#D97706','#DC2626','#0891B2','#BE185D','#EA580C'];
function getColor(i) { return COLORS[i % COLORS.length]; }
function initials(name) { return name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase(); }
function avatarEl(name, color, size='') {
  return `<div class="avatar${size?' avatar-'+size:''}" style="background:${color}">${initials(name)}</div>`;
}

/* ============================================================
   FORMAT HELPERS
   ============================================================ */
function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
}
function fmtRupee(n) { return '₹' + Number(n).toLocaleString('en-IN'); }
function urgencyColor(deadline) {
  const days = Math.ceil((new Date(deadline) - new Date()) / 86400000);
  if (days < 0) return 'var(--red)';
  if (days <= 7) return 'var(--amber)';
  return 'var(--green)';
}
function urgencyLabel(deadline) {
  const days = Math.ceil((new Date(deadline) - new Date()) / 86400000);
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Due today';
  if (days <= 7) return `${days}d left`;
  return fmtDate(deadline);
}

/* ============================================================
   SVG RING
   ============================================================ */
function ringEl(pct, size=60) {
  const r = (size/2) - 6;
  const circ = 2 * Math.PI * r;
  const dash = (pct/100) * circ;
  const color = pct >= 70 ? 'var(--green)' : pct >= 40 ? 'var(--amber)' : 'var(--red)';
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--s3)" stroke-width="5"/>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${color}" stroke-width="5"
      stroke-dasharray="${dash} ${circ}" stroke-linecap="round"
      transform="rotate(-90 ${size/2} ${size/2})"/>
    <text x="${size/2}" y="${size/2+4}" text-anchor="middle" font-size="${size/5}px" font-weight="700" fill="${color}" font-family="Geist Mono">${pct}%</text>
  </svg>`;
}

/* ============================================================
   NOTIFICATIONS
   ============================================================ */
function _notifIcon(type, text) {
  const t = String(type || '').toUpperCase(), x = String(text || '').toLowerCase();
  if (t === 'CONVERSATION' || /message/.test(x)) return ['\uD83D\uDCAC', '#EFF6FF'];
  if (t === 'LEAVE') return ['\uD83C\uDF34', '#F5F3FF'];
  if (t === 'REGULARISATION') return ['\uD83D\uDD52', '#FFFBEB'];
  if (t === 'WALLET' || t === 'DISPUTE' || /payout|wallet|payment|credited/.test(x)) return ['\uD83D\uDCB0', '#ECFDF5'];
  if (t === 'NOTICE') return ['\uD83D\uDCE2', '#FFF7ED'];
  if (t === 'MILESTONE') return ['\uD83C\uDFAF', '#FFFBEB'];
  if (/submitted|review/.test(x)) return ['\uD83D\uDC41\uFE0F', '#FFFBEB'];
  if (/approved|done|complete/.test(x)) return ['\u2705', '#ECFDF5'];
  if (/returned|rejected|declined/.test(x)) return ['\u21A9\uFE0F', '#FEF2F2'];
  return ['\uD83D\uDD14', 'var(--s2)'];
}
function _notifAgo(iso) {
  if (!iso) return '';
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + ' min ago';
  if (s < 86400) return Math.floor(s / 3600) + ' h ago';
  if (s < 7 * 86400) return Math.floor(s / 86400) + ' d ago';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/* Bell dropdown: icon per type, bold unread, time ago, "New" / "Earlier" */
function renderNotifications() {
  const raw = {};
  (DataAPI.raw().notifications || []).forEach(n => { raw[String(n.id)] = n; });
  const all = STATE.notifications.slice().sort((a, b) => String((raw[b.id] || {}).createdAt || '').localeCompare(String((raw[a.id] || {}).createdAt || '')));
  const unread = all.filter(n => !n.read).length;
  const badge = document.getElementById('notif-badge');
  if (badge) {
    /* a red count bubble (it used to be a tiny silent dot) */
    badge.style.display = unread > 0 ? 'flex' : 'none';
    badge.textContent = unread > 99 ? '99+' : String(unread);
    Object.assign(badge.style, { minWidth: '18px', height: '18px', padding: '0 5px', borderRadius: '99px', alignItems: 'center',
      justifyContent: 'center', fontSize: '10.5px', fontWeight: '700', color: '#fff', background: 'var(--red,#DC2626)',
      top: '-4px', right: '-4px', width: 'auto', boxShadow: '0 0 0 2px var(--surface,#fff)' });
  }
  if (window.NotifyPop) NotifyPop.update(all.map(n => {
    const r = raw[String(n.id)] || {};
    return { id: n.id, title: n.text, sub: n.sub, unread: !n.read, icon: _notifIcon(r.entityType || n.entityType, n.text)[0] };
  }), function (id) { openNotification(id); });
  const title = document.querySelector('.notif-dropdown-title');
  if (title) title.textContent = unread ? `Notifications \u00b7 ${unread} new` : 'Notifications';
  const list = document.getElementById('notif-list');
  if (!list) return;
  if (!all.length) {
    list.innerHTML = `<div style="padding:28px 16px;text-align:center;color:var(--t3);font-size:13px"><div style="font-size:26px;margin-bottom:6px">\uD83D\uDD14</div>You're all caught up.</div>`;
    return;
  }
  const row = n => {
    const r = raw[String(n.id)] || {};
    const [ic, bg] = _notifIcon(r.entityType || n.entityType, n.text);
    return `<div class="notif-item${n.read ? '' : ' unread'}" onclick="event.stopPropagation();openNotification('${escAttr(String(n.id))}')"
        style="display:flex;gap:10px;align-items:flex-start;padding:11px 14px;cursor:pointer;border-bottom:1px solid var(--b1);${n.read ? '' : 'background:rgba(0,122,255,.05);'}">
      <div style="width:32px;height:32px;border-radius:10px;background:${bg};display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:15px">${ic}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;line-height:1.4;font-weight:${n.read ? 500 : 650};color:var(--t1)">${esc(n.text)}</div>
        ${n.sub ? `<div style="font-size:12px;color:var(--t3);line-height:1.45;margin-top:2px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${esc(n.sub)}</div>` : ''}
        <div style="font-size:11px;color:var(--t4, var(--t3));margin-top:3px">${esc(_notifAgo(r.createdAt) || n.time || '')}</div>
      </div>
      ${n.read ? '' : '<div style="width:8px;height:8px;border-radius:50%;background:var(--blue);margin-top:6px;flex-shrink:0"></div>'}
    </div>`;
  };
  const fresh = all.filter(n => !n.read), old = all.filter(n => n.read).slice(0, 30);
  const head = t => `<div style="padding:8px 14px 4px;font-size:10.5px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--t3)">${t}</div>`;
  list.style.maxHeight = '420px';
  list.style.overflowY = 'auto';
  list.innerHTML = (fresh.length ? head('New') + fresh.map(row).join('') : '') + (old.length ? head('Earlier') + old.map(row).join('') : '');
}
function toggleNotif() {
  document.getElementById('notif-dropdown').classList.toggle('open');
}
function markRead(id) {
  DataAPI.markNotificationRead(id).then(function () {
    syncState(); renderNotifications();
  });
}
function markAllRead() {
  DataAPI.markAllNotificationsRead(STATE.adminUser.id).then(function () {
    syncState(); renderNotifications();
    toast('All notifications marked as read', 'success');
  });
}

// Close notif when clicking outside
document.addEventListener('click', e => {
  if (!e.target.closest('#notif-dropdown') && !e.target.closest('.icon-btn')) {
    document.getElementById('notif-dropdown').classList.remove('open');
  }
});


// Responsive: reset messages panel on window resize
window.addEventListener('resize', function() {
  if (window.innerWidth > 768) {
    const cp = document.querySelector('.contacts-panel');
    const ca = document.querySelector('.chat-area');
    if(cp) cp.classList.remove('hidden');
    if(ca) ca.classList.remove('active');
  }
  // Re-render current module to apply responsive layout
  if (STATE.currentModule === 'analytics') renderAnalytics();
});

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeLauncher();
    closePanel();
    closeModal();
    closeConfirm();
  }
});

// Global search
document.getElementById('global-search').addEventListener('input', e => {
  const val = e.target.value.toLowerCase().trim();
  if (val.length < 3) return;
  const has = (s) => String(s || '').toLowerCase().includes(val);
  if (STATE.employees.some(x => has(x.name) || has(x.role) || has(x.email))) {
    gotoModule('employees');
    setTimeout(() => { const s = document.getElementById('emp-search'); if (s) { s.value = val; filterEmployees(); } }, 100);
    return;
  }
  if (STATE.projects.some(x => has(x.name) || has(x.client)))  { gotoModule('projects');  return; }
  if (STATE.invoices.some(x => has(x.num) || has(x.client)))   { gotoModule('invoices');  return; }
  if (STATE.notices.some(x => has(x.title)))                   { gotoModule('notices');   return; }
  if (STATE.tasks.some(x => has(x.title)))                     { gotoModule('projects');  return; }
});


/* ── After a save/delete the server answers; then redraw what is on screen.
      (Several actions used to redraw before the server replied, so the old
      data stayed visible until a page refresh.) ── */
function refreshView() {
  const m = STATE.currentModule;
  try {
    if (m === 'project-detail' && STATE.currentProject != null) {
      const pid = STATE.currentProject;
      if (!STATE.projects.some(p => p.id === pid)) { gotoModule('projects'); return; }
      const active = document.querySelector('#view-project-detail .tab-pane.active');
      const id = active ? active.id : '';
      if (id === 'pd-tasks' && typeof renderMilestonesTab === 'function') renderMilestonesTab(pid);
      else if (id === 'pd-timeline' && typeof renderProjectTimeline === 'function') renderProjectTimeline(pid);
      else if (typeof openProjectDetail === 'function') openProjectDetail(pid);
      return;
    }
    const fn = { dashboard: 'renderDashboard', departments: 'renderDepartments', employees: 'renderEmployees', hrm: 'renderHrm',
      profit: 'renderProfit', payouts: 'renderPayouts', projects: 'renderProjects', invoices: 'renderInvoices',
      messages: 'renderMessages', calendar: 'renderCalendar', notices: 'renderNoticesModule', analytics: 'renderAnalytics' }[m];
    if (fn && typeof window[fn] === 'function') window[fn]();
  } catch (e) { console.warn('refreshView', e); }
  if (typeof renderNotifications === 'function') renderNotifications();
}
function syncAndRefresh(result) { syncState(); refreshView(); return result; }

/* Whole card is clickable: any element with data-open="…" runs that action
   when you click anywhere on it — except on its own buttons, links and inputs. */
document.addEventListener('click', function (e) {
  const card = e.target.closest('[data-open]');
  if (!card) return;
  const ctl = e.target.closest('button, a, input, select, textarea, label, [onclick]');
  if (ctl && card.contains(ctl) && ctl !== card) return;
  try { new Function(card.getAttribute('data-open'))(); } catch (err) { console.warn(err); }
});
(function () {
  if (document.getElementById('card-click-css')) return;
  const st = document.createElement('style'); st.id = 'card-click-css';
  st.textContent = '[data-open]{cursor:pointer;transition:transform .15s ease,box-shadow .15s ease}' +
    '[data-open]:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.08)}';
  document.head.appendChild(st);
})();

/* new data from the live sync → refresh the bell (count + pop-ups) */
window.addEventListener('storage', function (e) { if (e.key === 'oment_psa_db_v2') setTimeout(renderNotifications, 500); });