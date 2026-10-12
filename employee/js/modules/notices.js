// ══════════════════════════════════════════════
// NOTICES — company notices sent to this employee
// ══════════════════════════════════════════════
/* Opening a notice marks it as read, so the admin sees who has read it. */

var _curNotice = null;

function _noticeMe() { return (typeof _me === 'function') ? _me() : (typeof CU !== 'undefined' ? CU : null); }

function _myNotices() {
  var me = _noticeMe(); if (!me) return [];
  return (DataAPI.raw().notices || []).filter(function (n) {
    return String(n.status).toUpperCase() === 'SENT' &&
      ((n.readBy || []).indexOf(me.id) >= 0 || (n.notReadBy || []).indexOf(me.id) >= 0);
  }).sort(function (a, b) { return String(b.sentAt || b.date || '').localeCompare(String(a.sentAt || a.date || '')); });
}

function _isUnreadNotice(n) { var me = _noticeMe(); return !!(me && (n.notReadBy || []).indexOf(me.id) >= 0); }

function updNoticeBadge() {
  var n = _myNotices().filter(_isUnreadNotice).length;
  var el = document.getElementById('nb-notice');
  if (el) { el.textContent = n || ''; el.style.display = n > 0 ? 'flex' : 'none'; }
}

function _nDate(n) {
  var d = n.sentAt || n.date;
  return d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
}

function rNotices() {
  var el = document.getElementById('notice-body'); if (!el) return;
  var list = _myNotices();
  if (_curNotice && !list.some(function (n) { return String(n.id) === String(_curNotice); })) _curNotice = null;
  var cur = _curNotice ? list.find(function (n) { return String(n.id) === String(_curNotice); }) : null;

  var html = '<div class="shd"><div><div class="stitle">Notices</div><div class="ssub">Announcements from your company</div></div></div>';
  if (!list.length) {
    html += '<div class="card" style="padding:28px;text-align:center;color:var(--t3);font-size:13px">No notices yet. New announcements will appear here.</div>';
    el.innerHTML = html; updNoticeBadge(); return;
  }
  html += '<div style="display:grid;grid-template-columns:minmax(220px,320px) 1fr;gap:14px" class="notice-grid">';
  html += '<div class="card" style="padding:0;overflow:hidden">' + list.map(function (n) {
    var on = cur && String(cur.id) === String(n.id), unread = _isUnreadNotice(n);
    return '<div onclick="openNotice(\'' + escJs(String(n.id)) + '\')" style="padding:12px 14px;border-bottom:1px solid var(--b);cursor:pointer;' + (on ? 'background:var(--s2);' : '') + '">' +
      '<div style="display:flex;align-items:center;gap:6px">' + (unread ? '<span style="width:8px;height:8px;border-radius:50%;background:var(--blue);flex-shrink:0"></span>' : '') +
      '<div style="font-weight:' + (unread ? 700 : 600) + ';font-size:13.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(n.title) + '</div></div>' +
      '<div style="font-size:11.5px;color:var(--t3);margin-top:2px">' + _nDate(n) + (n.priority && n.priority !== 'Normal' ? ' \u00b7 <span style="color:var(--red);font-weight:600">' + esc(n.priority) + '</span>' : '') + '</div></div>';
  }).join('') + '</div>';
  html += '<div class="card" style="padding:18px 20px;min-height:220px">' + (cur
    ? '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:6px">' +
        '<div style="font-size:18px;font-weight:700;line-height:1.3">' + esc(cur.title) + '</div>' +
        '<button class="btn btn-ghost btn-sm" onclick="downloadNotice(\'' + escJs(String(cur.id)) + '\')">\u2B07 PDF</button></div>' +
      '<div style="font-size:12px;color:var(--t3);margin-bottom:14px">' + _nDate(cur) + '</div>' +
      '<div style="font-size:14px;line-height:1.65;color:var(--t1)">' + (Utils.sanitizeHtml ? Utils.sanitizeHtml(cur.content || '') : esc(cur.content || '')) + '</div>' +
      ((cur.attachments || []).length ? '<div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--b)">' +
        '<div style="font-size:12px;font-weight:600;color:var(--t3);margin-bottom:8px">Attachments (' + cur.attachments.length + ')</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:8px">' + cur.attachments.map(function (a) {
          var nm = typeof a === 'string' ? a : (a && a.name) || 'file', fid = a && a.fileId ? a.fileId : '';
          return '<button class="btn btn-ghost btn-sm" onclick="noticeAttachment(\'' + escJs(fid) + '\',\'' + escJs(nm) + '\')">\uD83D\uDCCE ' + esc(nm) +
            (a && a.sizeLabel ? ' <span style="color:var(--t3);font-weight:400">' + esc(a.sizeLabel) + '</span>' : '') + '</button>';
        }).join('') + '</div></div>' : '')
    : '<div style="color:var(--t3);font-size:13px;padding:30px 0;text-align:center">Pick a notice to read it.</div>') + '</div>';
  html += '</div>';
  el.innerHTML = html;
  updNoticeBadge();
}

function openNotice(id) {
  _curNotice = id;
  var n = (DataAPI.raw().notices || []).find(function (x) { return String(x.id) === String(id); });
  var me = _noticeMe();
  if (n && me && _isUnreadNotice(n)) {
    n.notReadBy = (n.notReadBy || []).filter(function (x) { return x !== me.id; });
    n.readBy = (n.readBy || []).concat(me.id);
    DataAPI.markNoticeRead(n.id, me.id).catch(function () {});
    (DataAPI.raw().notifications || []).forEach(function (x) {
      if (x.entityType === 'NOTICE' && String(x.entityId) === String(n.id) && !x.read) { x.read = true; DataAPI.markNotificationRead(x.id).catch(function () {}); }
    });
  }
  rNotices();
}

function noticeAttachment(fileId, name) {
  if (!fileId) { toast('"' + name + '" was attached before uploads were connected \u2014 ask the admin to attach it again', 'err'); return; }
  if (!window.OmentAPI || !OmentAPI.openFile) { toast('Files need the backend server', 'err'); return; }
  OmentAPI.openFile(fileId, name, true).then(function () { toast('Downloaded', 'ok'); }).catch(function (e) { toast(e.message || 'Could not open the file', 'err'); });
}

function downloadNotice(id) {
  var n = (DataAPI.raw().notices || []).find(function (x) { return String(x.id) === String(id); });
  if (!window.OmentAPI || !OmentAPI.downloadPath) { toast('PDF needs the backend server', 'err'); return; }
  OmentAPI.downloadPath('/notices/' + encodeURIComponent(id) + '/pdf', 'Notice-' + String((n && n.title) || id).replace(/[^\w.-]+/g, '_').slice(0, 60) + '.pdf')
    .then(function () { toast('Notice downloaded', 'ok'); })
    .catch(function (err) { toast(err.message || 'Could not download', 'err'); });
}

(function () {
  var _nav = window.nav;
  if (typeof _nav === 'function') {
    window.nav = function (name, el) {
      if (name === 'notices' && !document.getElementById('v-notices')) {
        var host = document.querySelector('.content'); var v = document.createElement('div');
        v.className = 'view'; v.id = 'v-notices'; v.innerHTML = '<div id="notice-body"></div>'; if (host) host.appendChild(v);
      }
      _nav(name, el);
      if (name === 'notices') {
        document.querySelectorAll('.view').forEach(function (x) { x.classList.toggle('on', x.id === 'v-notices'); });
        document.querySelectorAll('.ni').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-v') === 'notices'); });
        rNotices();
      }
    };
  }
  var _upd = window.updBadges;
  if (typeof _upd === 'function') window.updBadges = function () { _upd.apply(this, arguments); updNoticeBadge(); };
  var _h = window.hNotif;
  if (typeof _h === 'function') {
    window.hNotif = function (id) {
      var raw = (DataAPI.raw().notifications || []).find(function (n) { return String(n.id) === String(id); });
      if (raw && raw.entityType === 'NOTICE') {
        _curNotice = raw.entityId;
        nav('notices', document.querySelector('[data-v=notices]'));
        openNotice(raw.entityId);
        return;
      }
      _h(id);
    };
  }
  window.addEventListener('storage', function (e) {
    if (e.key !== 'oment_psa_db_v2') return;
    setTimeout(function () {
      updNoticeBadge();
      var v = document.getElementById('v-notices');
      if (v && v.classList.contains('on')) rNotices();
    }, 400);
  });
  setTimeout(updNoticeBadge, 3000);
})();