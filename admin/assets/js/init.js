var _bootStarted = false;

function _bootOverlay() {
  var el = document.getElementById('boot-overlay');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'boot-overlay';
  el.style.cssText =
    'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;' +
    'justify-content:center;background:var(--bg,#F4F3EF);padding:24px';
  document.body.appendChild(el);
  return el;
}

function _hideBoot() {
  var el = document.getElementById('boot-overlay');
  if (el && el.parentNode) el.parentNode.removeChild(el);
}

function showBootLoading() {
  _bootOverlay().innerHTML =
    '<div style="display:flex;flex-direction:column;align-items:center;gap:12px;color:var(--t3,#9B9899)">' +
      '<div style="width:28px;height:28px;border:3px solid var(--s3,#E8E5DF);' +
        'border-top-color:var(--t1,#18171A);border-radius:50%;animation:bootspin .7s linear infinite"></div>' +
      '<div style="font-size:13px">Loading workspace\u2026</div>' +
    '</div>' +
    '<style>@keyframes bootspin{to{transform:rotate(360deg)}}</style>';
}

function showBootError(msg) {
  _bootOverlay().innerHTML =
    '<div style="max-width:420px;text-align:center;padding:28px;background:var(--surface,#fff);' +
      'border:1px solid var(--b1,rgba(0,0,0,.07));border-radius:16px">' +
      '<div style="font-size:32px;margin-bottom:10px">\u26A0\uFE0F</div>' +
      '<div style="font-size:15px;font-weight:700;margin-bottom:6px">Couldn\'t load your workspace</div>' +
      '<div style="font-size:13px;color:var(--t3,#9B9899);line-height:1.55;margin-bottom:16px">' +
        esc(msg) + '</div>' +
      '<button class="btn btn-primary btn-sm" onclick="location.reload()">Try again</button>' +
    '</div>';
}

function init() {
  if (_bootStarted) return;           
  _bootStarted = true;

  showBootLoading();

  DataAPI.init()
    .then(function () {
      if (typeof HRM !== 'undefined') HRM.init();
      if (typeof Profit !== 'undefined') Profit.init();
      if (typeof Wallet !== 'undefined') Wallet.init();
      if (typeof eenApplySettings === 'function') eenApplySettings();
      syncState();
      if (typeof _refreshInvNum === 'function') _refreshInvNum();

      var admin = STATE.adminUser || {};
      var sa = document.getElementById('sidebar-avatar');
      var ta = document.getElementById('topbar-avatar');
      if (sa) sa.textContent = admin.avatarInitials || 'AD';
      if (ta) ta.textContent = admin.avatarInitials || 'AD';
      var sn = document.getElementById('sidebar-name');
      if (sn) sn.textContent = admin.name || 'Admin';

      if (typeof mountView === 'function') mountView('dashboard');
      renderNotifications();
      /* open the page you were on before the refresh (address bar #page) */
      var want = decodeURIComponent(((typeof OMENT_START_HASH === 'string' && OMENT_START_HASH) || location.hash || '').slice(1));
      var pm = /^project\/(\d+)$/.exec(want);
      if (pm && STATE.projects.some(function (p) { return p.id === Number(pm[1]); }) && typeof openProjectDetail === 'function') openProjectDetail(Number(pm[1]));
      else if (want && document.getElementById('view-' + want) && want !== 'project-detail') gotoModule(want, true);
      else gotoModule('dashboard', true);
      STATE.moduleHistory = [];
      updateBackButton();

      if (typeof injectGuide === 'function') injectGuide('dashboard');
      _hideBoot();
    })
    .catch(function (err) {
      console.error('Boot failed:', err);
      showBootError((err && err.message) || 'Something went wrong while loading your data.');
    });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

window.addEventListener('storage', function (e) {
  if (e.key !== 'oment_psa_db_v2') return;
  DataAPI.init().then(function () {
    syncState();
    renderNotifications();
    var m = STATE.currentModule;
    if (!m || m === 'project-detail') return;
    /* don't redraw under an open window/panel or while typing */
    var busy = (document.getElementById('modal-overlay') || {}).classList && document.getElementById('modal-overlay').classList.contains('open');
    busy = busy || ((document.getElementById('slide-panel') || {}).classList && document.getElementById('slide-panel').classList.contains('open'));
    var ae = document.activeElement;
    busy = busy || (ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName));
    if (busy) return;
    /* redraw in place and keep the scroll position (it used to jump to the top) */
    var sc = document.getElementById('content');
    var y = sc ? sc.scrollTop : 0;
    if (typeof refreshView === 'function') refreshView(); else gotoModule(m, true);
    var keep = function () { if (sc && Math.abs(sc.scrollTop - y) > 2) sc.scrollTop = y; };
    keep(); setTimeout(keep, 60); setTimeout(keep, 400); setTimeout(keep, 1200);
  });
});