// ══════════════════════════════════════════════
// MESSAGES — chat with the admin
// ══════════════════════════════════════════════

/* ── WhatsApp-style chat rendering ─────────────────────────────
   Your messages on the right (light blue), theirs on the left (white),
   date chips (Today / Yesterday / 12 Sep 2026), time inside the bubble,
   consecutive messages grouped, and ticks on your messages:
   grey ✓✓ = delivered, blue ✓✓ = read. */
function waChatHtml(msgs, meId, otherUnread, emptyText) {
  msgs = msgs || [];
  if (!msgs.length) {
    return '<div style="margin:auto;background:#FFF8C5;color:#54656F;font-size:12.5px;padding:8px 14px;border-radius:8px;text-align:center;max-width:320px;line-height:1.5;box-shadow:0 1px .5px rgba(11,20,26,.13)">' +
      waEsc(emptyText || 'No messages yet.') + '</div>';
  }
  var mine = function (m) { return Number(m.fromId) === Number(meId); };
  /* the last `otherUnread` of MY messages are not read yet */
  var myIdx = [];
  msgs.forEach(function (m, i) { if (mine(m)) myIdx.push(i); });
  var unreadFrom = otherUnread > 0 ? myIdx[Math.max(0, myIdx.length - otherUnread)] : Infinity;

  var dayKey = function (iso) { var d = new Date(iso); return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate(); };
  var dayLabel = function (iso) {
    var d = new Date(iso), t = new Date(), y = new Date(); y.setDate(t.getDate() - 1);
    if (d.toDateString() === t.toDateString()) return 'Today';
    if (d.toDateString() === y.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  var clock = function (iso) { return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase(); };
  var tick = function (read) {
    return '<svg width="16" height="11" viewBox="0 0 16 11" style="vertical-align:-1px;margin-left:3px" aria-label="' + (read ? 'Read' : 'Delivered') + '">' +
      '<path d="M11.1 1 5 7.1 2.4 4.5 1.3 5.6 5 9.3l7.2-7.2L11.1 1z" fill="' + (read ? '#007AFF' : '#8696A0') + '"/>' +
      '<path d="M14.6 1 8.5 7.1l-.9-.9-1.1 1.1 2 2 7.2-7.2L14.6 1z" fill="' + (read ? '#007AFF' : '#8696A0') + '"/></svg>';
  };

  var html = '', lastDay = null;
  msgs.forEach(function (m, i) {
    var prev = msgs[i - 1];
    var dk = dayKey(m.at);
    if (dk !== lastDay) {
      html += '<div style="display:flex;justify-content:center;margin:12px 0 6px">' +
        '<span style="background:#FFFFFF;color:#54656F;font-size:12px;padding:5px 12px;border-radius:8px;box-shadow:0 1px .5px rgba(11,20,26,.13)">' + dayLabel(m.at) + '</span></div>';
      lastDay = dk;
    }
    var me = mine(m);
    var grouped = prev && dayKey(prev.at) === dk && mine(prev) === me && (new Date(m.at) - new Date(prev.at)) < 5 * 60 * 1000;
    var bg = me ? '#DCEBFF' : '#FFFFFF';
    var tail = grouped ? '' :
      '<svg width="8" height="13" viewBox="0 0 8 13" style="position:absolute;top:0;' + (me ? 'right:-8px' : 'left:-8px;transform:scaleX(-1)') + '">' +
      '<path d="M0 0h8L1.5 7.5C.6 8.5 0 8 0 6.8V0z" fill="' + bg + '"/></svg>';
    html += '<div style="display:flex;justify-content:' + (me ? 'flex-end' : 'flex-start') + ';margin-top:' + (grouped ? 2 : 8) + 'px;padding:0 ' + (me ? '10px 0 0' : '0 0 10px') + '">' +
      '<div style="position:relative;max-width:72%;padding:6px 9px 7px;background:' + bg + ';color:#111B21;font-size:14px;line-height:1.4;' +
        'white-space:pre-wrap;word-break:break-word;border-radius:8px;' + (grouped ? '' : (me ? 'border-top-right-radius:0;' : 'border-top-left-radius:0;')) +
        'box-shadow:0 1px .5px rgba(11,20,26,.13)">' + tail +
        waEsc(m.text) +
        '<span style="float:right;margin:7px 0 -5px 12px;font-size:11px;color:#667781;white-space:nowrap">' + clock(m.at) + (me ? tick(i < unreadFrom) : '') + '</span>' +
      '</div></div>';
  });
  return html;
}

function waEsc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
}

/* chat background like WhatsApp */
var WA_BG = '#EFEAE2';

/* WhatsApp-style composer: white rounded box on a grey bar + round blue
   send button with the paper-plane icon. Enter sends, Shift+Enter = new line,
   the box grows up to 5 lines. */
var WA_SEND_ICON = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M1.101 21.757 23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z"/></svg>';

function waComposerHtml(inputId, btnId, onSend, draft) {
  return '<div style="display:flex;align-items:flex-end;gap:8px;padding:8px 10px;background:#F0F2F5;width:100%;box-sizing:border-box">' +
    '<textarea id="' + inputId + '" rows="1" placeholder="Type a message" ' +
      'style="flex:1;resize:none;border:0;outline:none;border-radius:22px;padding:11px 16px;font:inherit;font-size:14.5px;line-height:1.4;' +
      'background:#FFFFFF;color:#111B21;max-height:120px;overflow-y:auto;box-shadow:0 1px .5px rgba(11,20,26,.08)" ' +
      'oninput="waGrow(this);waBtnState(\'' + inputId + '\',\'' + btnId + '\')" ' +
      'onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();' + onSend + '}">' + waEsc(draft || '') + '</textarea>' +
    '<button id="' + btnId + '" type="button" title="Send" aria-label="Send" onclick="' + onSend + '" ' +
      'style="flex-shrink:0;width:44px;height:44px;border-radius:50%;border:0;display:flex;align-items:center;justify-content:center;' +
      'background:var(--blue,#007AFF);color:#FFFFFF;cursor:pointer;transition:background .15s ease,transform .1s ease,opacity .15s ease;padding:0 0 0 3px" ' +
      'onmousedown="this.style.transform=\'scale(.94)\'" onmouseup="this.style.transform=\'\'" onmouseleave="this.style.transform=\'\'">' +
      WA_SEND_ICON + '</button>' +
  '</div>';
}
function waGrow(el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px'; }
function waBtnState(inputId, btnId) {
  var i = document.getElementById(inputId), b = document.getElementById(btnId);
  if (!i || !b) return;
  var has = !!i.value.trim();
  b.style.opacity = has ? '1' : '.55';
  b.style.cursor = has ? 'pointer' : 'default';
}


/* The employee has one conversation: with the admin. Messages the admin sends
   show here (and as a notification + sidebar badge); the employee can reply.
   New messages arrive through live sync without refreshing. */

/* Who is signed in. Uses the app's current user (CU); if that isn't set
   (some app versions keep it elsewhere) it reads the employee id from the
   login token, so the chat never says "sign in" to a signed-in user. */
function _me() {
  try { if (typeof CU !== 'undefined' && CU && CU.id != null) return CU; } catch (e) { /* ignore */ }
  if (window.CU && window.CU.id != null) return window.CU;
  var empId = null;
  try {
    var tok = (window.OMENT_HTTP_ADAPTER && window.OMENT_HTTP_ADAPTER.token && window.OMENT_HTTP_ADAPTER.token()) ||
              localStorage.getItem('oment_jwt_employee');
    if (tok) {
      var b = tok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      while (b.length % 4) b += '=';
      empId = JSON.parse(atob(b)).empId;
    }
  } catch (e) { /* ignore */ }
  if (empId == null) return null;
  var emp = (DataAPI.raw().employees || []).find(function (e) { return Number(e.id) === Number(empId); });
  return { id: Number(empId), name: emp ? emp.name : '' };
}

var _chatWith = 'admin';                       // 'admin' or a colleague's id

function _adminChat() {
  var me = _me();
  if (!me) return null;
  return (DataAPI.raw().conversations || []).find(function (c) { return c.kind !== 'PEER' && Number(c.withId) === Number(me.id); }) || null;
}
function _peerChat(otherId) {
  var me = _me();
  if (!me) return null;
  return (DataAPI.raw().conversations || []).find(function (c) {
    var ids = (c.participantIds || []).map(Number);
    return c.kind === 'PEER' && ids.indexOf(Number(me.id)) >= 0 && ids.indexOf(Number(otherId)) >= 0;
  }) || null;
}
function _myChat() { return _chatWith === 'admin' ? _adminChat() : _peerChat(_chatWith); }
function _myAllChats() {
  var me = _me(); if (!me) return [];
  return (DataAPI.raw().conversations || []).filter(function (c) {
    return Number(c.withId) === Number(me.id) || (c.participantIds || []).map(Number).indexOf(Number(me.id)) >= 0;
  });
}
/* messages waiting for me in a chat */
function _unreadFor(c) {
  var me = _me(); if (!c || !me) return 0;
  return c.kind === 'PEER' ? ((c.unreadBy || {})[me.id] || 0) : (c.empUnread || 0);
}
/* my messages the other side has not read yet (for the ticks) */
function _otherUnread(c) {
  if (!c) return 0;
  if (c.kind !== 'PEER') return c.unread || 0;
  var me = _me(), other = (c.participantIds || []).find(function (x) { return Number(x) !== Number(me && me.id); });
  return (c.unreadBy || {})[other] || 0;
}
function _colleagues() {
  var me = _me(), D = DataAPI.raw();
  var depts = {}; (D.departments || []).forEach(function (d) { depts[d.id] = d.name; });
  return (D.employees || []).filter(function (e) { return e.active !== false && me && e.id !== me.id; })
    .map(function (e) { return { id: e.id, name: e.name, role: e.role || '', dept: depts[e.deptId] || e.dept || '', color: e.color || e.avatarBg || '#2563EB',
      initials: e.avatarInitials || e.name.split(' ').map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase() }; });
}
var _chatSearch = '';
function openChatWith(who) { _chatWith = who === 'admin' ? 'admin' : Number(who); rChat(); }
function chatSearch(v) { _chatSearch = v || ''; _renderContacts(); }

function _adminName() {
  var a = DataAPI.raw().adminUser;
  return (a && a.name) || 'Admin';
}

var _baseTitle = null;
function updChatBadge() {
  var n = _myAllChats().reduce(function (t, c) { return t + _unreadFor(c); }, 0);
  ['nb-msg', 'bni-msg'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) { el.textContent = n || ''; el.style.display = n > 0 ? 'flex' : 'none'; }
  });
  /* "(1) Oment" on the browser tab, so a new message is visible from other tabs too */
  if (_baseTitle === null) _baseTitle = document.title.replace(/^\(\d+\)\s*/, '');
  document.title = (n > 0 ? '(' + n + ') ' : '') + _baseTitle;
}

function _chatTime(iso) {
  if (!iso) return '';
  var d = new Date(iso), now = new Date();
  var same = d.toDateString() === now.toDateString();
  return same
    ? d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

/* Makes sure the Messages view exists (older employee/index.html files
   don't have it) and is the one showing. */
function _chatView() {
  var view = document.getElementById('v-messages');
  if (!view) {
    var host = document.querySelector('.content') || (document.getElementById('v-dashboard') || {}).parentNode;
    if (!host) return null;
    view = document.createElement('div');
    view.className = 'view';
    view.id = 'v-messages';
    view.innerHTML = '<div id="chat-body"></div>';
    host.appendChild(view);
  }
  if (!document.getElementById('chat-body')) view.innerHTML = '<div id="chat-body"></div>';
  return view;
}

function _showChatView() {
  var view = _chatView();
  if (!view) return;
  document.querySelectorAll('.view').forEach(function (v) { if (v !== view) v.classList.remove('on'); });
  view.classList.add('on');
  document.querySelectorAll('.ni').forEach(function (n) { n.classList.toggle('on', n.getAttribute('data-v') === 'messages'); });
  try { cv = 'messages'; } catch (e) { /* ignore */ }
}

function rChat(keepInput) {
  try { _rChat(keepInput); }
  catch (err) {
    var el = document.getElementById('chat-body');
    if (el) el.innerHTML = '<div class="card" style="padding:16px;color:#C62B23;font-size:13px">Messages could not load: ' + esc(err && err.message || String(err)) + '</div>';
    if (window.console) console.error('Messages:', err);
  }
}

function _contactRow(key, name, sub, color, initials, c, on) {
  var u = _unreadFor(c), last = c && c.msgs && c.msgs.length ? c.msgs[c.msgs.length - 1] : null;
  return '<div onclick="openChatWith(\'' + key + '\')" style="display:flex;gap:10px;align-items:center;padding:10px 12px;cursor:pointer;border-bottom:1px solid var(--b);' + (on ? 'background:var(--s2);' : '') + '">' +
    '<div style="width:36px;height:36px;border-radius:50%;background:' + color + ';color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0">' + esc(initials) + '</div>' +
    '<div style="flex:1;min-width:0"><div style="display:flex;justify-content:space-between;gap:6px"><span style="font-weight:' + (u ? 700 : 600) + ';font-size:13.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(name) + '</span>' +
      (last ? '<span style="font-size:10.5px;color:var(--t3);flex-shrink:0">' + _chatTime(last.at) + '</span>' : '') + '</div>' +
      '<div style="display:flex;justify-content:space-between;gap:6px;align-items:center"><span style="font-size:12px;color:var(--t3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(last ? last.text : sub) + '</span>' +
      (u ? '<span style="background:var(--blue,#007AFF);color:#fff;border-radius:99px;font-size:10.5px;font-weight:700;min-width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;padding:0 5px">' + u + '</span>' : '') + '</div></div></div>';
}
function _renderContacts() {
  var box = document.getElementById('chat-contacts'); if (!box) return;
  var q = _chatSearch.trim().toLowerCase();
  var admin = _adminName();
  var rows = [];
  if (!q || admin.toLowerCase().indexOf(q) >= 0)
    rows.push({ t: _adminChat() && _adminChat().msgs && _adminChat().msgs.length ? _adminChat().msgs[_adminChat().msgs.length - 1].at : '', html: _contactRow('admin', admin, 'Admin', '#2563EB', admin.split(' ').map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase(), _adminChat(), _chatWith === 'admin'), pin: 1 });
  _colleagues().filter(function (e) { return !q || (e.name + ' ' + e.dept + ' ' + e.role).toLowerCase().indexOf(q) >= 0; }).forEach(function (e) {
    var c = _peerChat(e.id), last = c && c.msgs && c.msgs.length ? c.msgs[c.msgs.length - 1].at : '';
    rows.push({ t: last, name: e.name, html: _contactRow(e.id, e.name, (e.dept ? e.dept + ' \u00b7 ' : '') + e.role, e.color, e.initials, c, Number(_chatWith) === e.id) });
  });
  rows.sort(function (a, b) { return (b.pin || 0) - (a.pin || 0) || String(b.t).localeCompare(String(a.t)) || String(a.name || '').localeCompare(String(b.name || '')); });
  box.innerHTML = rows.map(function (r) { return r.html; }).join('') || '<div style="padding:16px;font-size:12.5px;color:var(--t3)">Nobody found.</div>';
}

function _rChat(keepInput) {
  _chatView();
  var el = document.getElementById('chat-body');
  if (!el) return;
  var me = _me();
  if (!me) { el.innerHTML = '<div style="padding:20px;color:var(--t3)">Your session has ended \u2014 please sign in again.</div>'; return; }
  var c = _myChat();
  var draft = keepInput ? (document.getElementById('chat-in') || {}).value || '' : '';
  var msgs = c ? c.msgs || [] : [];
  var admin = _adminName();
  var peer = _chatWith === 'admin' ? null : _colleagues().find(function (e) { return e.id === Number(_chatWith); });
  if (_chatWith !== 'admin' && !peer) { _chatWith = 'admin'; c = _adminChat(); msgs = c ? c.msgs || [] : []; }
  var hName = peer ? peer.name : admin, hSub = peer ? ((peer.dept ? peer.dept + ' \u00b7 ' : '') + peer.role) : 'Admin';
  var hColor = peer ? peer.color : '#2563EB', hIni = peer ? peer.initials : admin.split(' ').map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase();

  el.innerHTML =
    '<div class="shd"><div><div class="stitle">Messages</div>' +
    '<div class="ssub">Chat with the admin and anyone in the team</div></div></div>' +
    '<div class="card" id="chat-card" style="padding:0;display:flex;height:70vh;min-height:360px;overflow:hidden;margin-bottom:0">' +
      '<div class="chat-side" style="width:270px;flex-shrink:0;border-right:1px solid var(--b);display:flex;flex-direction:column;min-height:0">' +
        '<div style="padding:10px"><input id="chat-q" placeholder="Search people\u2026" value="' + esc(_chatSearch) + '" oninput="chatSearch(this.value)" ' +
          'style="width:100%;box-sizing:border-box;padding:9px 12px;border-radius:10px;border:1px solid var(--b);font:inherit;font-size:13px;background:var(--s2);color:inherit"></div>' +
        '<div id="chat-contacts" style="flex:1;overflow-y:auto;min-height:0"></div>' +
      '</div>' +
      '<div style="flex:1;min-width:0;display:flex;flex-direction:column">' +
        '<div style="display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid var(--b)">' +
          '<div style="width:34px;height:34px;border-radius:50%;background:' + hColor + ';color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px">' + esc(hIni) + '</div>' +
          '<div><div style="font-weight:600;font-size:13.5px">' + esc(hName) + '</div><div style="font-size:11.5px;color:var(--t3)">' + esc(hSub) + '</div></div>' +
        '</div>' +
        '<div id="chat-list" style="flex:1;overflow-y:auto;padding:10px 14px 14px;display:flex;flex-direction:column;background:' + WA_BG + '">' +
          waChatHtml(msgs, me.id, _otherUnread(c),
            peer ? 'No messages yet. Say hello to ' + peer.name.split(' ')[0] + '.' : 'No messages yet. Messages from ' + admin + ' will appear here, and you can write to them any time.') +
        '</div>' +
        waComposerHtml('chat-in', 'chat-send', 'sendChat()', draft) +
      '</div>' +
    '</div>';
  _renderContacts();

  _fitChat();
  setTimeout(function () { _fitChat(); var l = document.getElementById('chat-list'); if (l) l.scrollTop = l.scrollHeight; }, 80);
  setTimeout(_fitChat, 400);
  var list = document.getElementById('chat-list');
  if (list) list.scrollTop = list.scrollHeight;
  var ci = document.getElementById('chat-in');
  if (ci && ci.value) waGrow(ci);
  waBtnState('chat-in', 'chat-send');
  if (!keepInput) { var inp = document.getElementById('chat-in'); if (inp) inp.focus(); }

  /* opened → mark as read on the server */
  if (c && _unreadFor(c) > 0) {
    if (c.kind === 'PEER') { c.unreadBy = c.unreadBy || {}; c.unreadBy[me.id] = 0; } else c.empUnread = 0;
    DataAPI.markConversationRead(c.id, c.kind === 'PEER' ? me.id : 'EMPLOYEE').catch(function () {});
    _readChatNotifs(c.id);
    _renderContacts();
  }
  updChatBadge();
  _chatSig = _chatSignatureAll();
}

/* the "New message" notifications for this chat are read too */
function _readChatNotifs(convId) {
  (DataAPI.raw().notifications || []).forEach(function (n) {
    if (n.entityType === 'CONVERSATION' && String(n.entityId) === String(convId) && !n.read) {
      n.read = true;
      DataAPI.markNotificationRead(n.id).catch(function () {});
    }
  });
  if (typeof syncUserState === 'function') { syncUserState(); if (typeof updBadges === 'function') updBadges(); }
}

/* Chat card fills exactly the free space down to the bottom of the screen.
   Measured, not guessed: shrink the card, see how much empty room the
   scrolling area still has (page padding, help banner, phone bottom menu
   are all accounted for), then give that room to the card. */
function _chatScroller(el) {
  for (var n = el.parentElement; n && n !== document.body; n = n.parentElement) {
    var oy = getComputedStyle(n).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && n.clientHeight > 0) return n;
  }
  return document.scrollingElement || document.documentElement;
}
function _fitChat() {
  var card = document.getElementById('chat-card');
  if (!card || !card.offsetParent) return;
  var MIN = 360;
  /* The Messages page keeps only a small bottom margin (other pages keep
     extra room at the bottom for scrolling — the chat doesn't need it). */
  var view = document.getElementById('v-messages');
  var bnav = document.getElementById('bnav');
  var bnavH = bnav && bnav.offsetParent !== null && getComputedStyle(bnav).position === 'fixed' ? bnav.offsetHeight : 0;
  if (view) view.style.paddingBottom = (bnavH ? bnavH + 10 : 14) + 'px';
  var sc = _chatScroller(card);
  if (sc.scrollTop) sc.scrollTop = 0;
  card.style.height = MIN + 'px';
  var cardBottom = card.getBoundingClientRect().bottom;
  var limit, padB;
  if (sc === document.scrollingElement || sc === document.documentElement) {
    limit = window.innerHeight; padB = 16;
  } else {
    limit = sc.getBoundingClientRect().bottom;
    padB = parseFloat(getComputedStyle(sc).paddingBottom) || 0;   // the view's own bottom padding
  }
  var free = limit - padB - cardBottom;                  // empty room left under the card
  card.style.height = Math.max(MIN, Math.floor(MIN + free)) + 'px';
}
window.addEventListener('resize', function () { if (_chatOpen && _chatOpen()) _fitChat(); });

function sendChat() {
  var inp = document.getElementById('chat-in');
  var btn = document.getElementById('chat-send');
  var text = inp ? inp.value.trim() : '';
  var me = _me();
  if (!text || !me) return;
  if (btn) { btn.disabled = true; btn.style.opacity = '.55'; }
  var c = _myChat();
  var ready = c ? Promise.resolve(c)
    : _chatWith === 'admin' ? DataAPI.startConversation(me.id)
    : DataAPI.startPeerConversation(me.id, _chatWith).then(function (conv) {
        var raw = DataAPI.raw(); raw.conversations = raw.conversations || [];
        if (!raw.conversations.some(function (x) { return String(x.id) === String(conv.id); })) raw.conversations.unshift(conv);
        return conv;
      });
  ready.then(function (conv) {
    return DataAPI.sendMessage(conv.id, me.id, text);
  }).then(function () {
    if (inp) inp.value = '';
    rChat();
  }).catch(function (err) {
    toast(err.message || 'Could not send', 'error');
  }).then(function () {
    if (btn) { btn.disabled = false; }
    waBtnState('chat-in', 'chat-send');
  });
}

/* ── Live chat: check the server every 3 s while the chat is open, every
   10 s otherwise. Only this conversation is fetched, so it is light. If you
   are typing, your text and cursor stay where they are. ── */
var _chatSig = null, _chatTick = 0, _chatBusy = false;

function _chatOpen() {
  var v = document.getElementById('v-messages');
  return !!(v && v.classList.contains('on'));
}

function _chatSignatureAll() { return _myAllChats().map(_chatSignature).sort().join('#'); }
function _chatSignature(c) {
  if (!c) return 'none';
  var msgs = c.msgs || [];
  var last = msgs[msgs.length - 1];
  /* unread (admin side) too: when the admin reads, the ticks must turn blue */
  return c.id + '|' + msgs.length + '|' + (last ? last.at : '') + '|' + (c.empUnread || 0) + '|' + (c.unread || 0) + '|' + JSON.stringify(c.unreadBy || {});
}

/* force = check right now (tab came back into view / window got focus) */
function _pollChat(force) {
  if (_chatBusy || !window.DataAPI) return;
  var me = _me();
  if (!me) return;
  _chatTick++;
  /* chat open: every 3 s · other screens: every 6 s · tab in background: every 15 s
     (it keeps checking in the background so the badge is ready when you come back) */
  if (force !== true) {
    if (document.hidden) { if (_chatTick % 5 !== 0) return; }
    else if (!_chatOpen() && _chatTick % 2 !== 0) return;
  }
  /* compare against what this page already shows (not the first server answer) */
  if (_chatSig === null) _chatSig = _chatSignatureAll();
  _chatBusy = true;
  DataAPI.getConversations(me.id).then(function (list) {
    var raw = DataAPI.raw();
    raw.conversations = raw.conversations || [];
    (list || []).forEach(function (fresh) {
      var i = raw.conversations.findIndex(function (c) { return String(c.id) === String(fresh.id); });
      if (i >= 0) raw.conversations[i] = fresh; else raw.conversations.unshift(fresh);
    });
    var sig = _chatSignatureAll();
    if (sig === _chatSig) return;
    _chatSig = sig;
    updChatBadge();
    if (_chatOpen()) {
      var inp = document.getElementById('chat-in');
      var typing = inp && document.activeElement === inp;
      var a = typing ? inp.selectionStart : 0, b = typing ? inp.selectionEnd : 0;
      rChat(true);
      var inp2 = document.getElementById('chat-in');
      if (typing && inp2) { inp2.focus(); try { inp2.setSelectionRange(a, b); } catch (e) {} }
    }
  }).catch(function () { /* offline — try again next tick */ })
    .then(function () { _chatBusy = false; });
}
setInterval(_pollChat, 3000);
/* coming back to this tab or window → check immediately */
document.addEventListener('visibilitychange', function () { if (!document.hidden) _pollChat(true); });
window.addEventListener('focus', function () { _pollChat(true); });

/* ── hooks into the existing app ── */
(function () {
  /* nav('messages') renders the chat */
  var _nav = window.nav;
  if (typeof _nav === 'function') {
    window.nav = function (name, el) {
      if (name === 'messages') _chatView();          // create the view first if index.html lacks it
      _nav(name, el);
      if (name === 'messages') { _showChatView(); rChat(); }
    };
  }
  /* backup: the sidebar item always opens the chat, even if nav() was replaced */
  document.addEventListener('click', function (e) {
    var item = e.target && e.target.closest ? e.target.closest('[data-v="messages"]') : null;
    if (!item) return;
    setTimeout(function () {
      var view = document.getElementById('v-messages');
      if (!view || !view.classList.contains('on') || !document.querySelector('#chat-body > *')) { _showChatView(); rChat(); }
    }, 0);
  });

  /* sidebar badges include unread chat */
  var _upd = window.updBadges;
  if (typeof _upd === 'function') {
    window.updBadges = function () { _upd.apply(this, arguments); updChatBadge(); };
  }
  /* clicking a "New message" notification opens the chat */
  var _h = window.hNotif;
  if (typeof _h === 'function') {
    window.hNotif = function (id) {
      var raw = (DataAPI.raw().notifications || []).find(function (n) { return String(n.id) === String(id); });
      if (raw && raw.entityType === 'CONVERSATION') {
        /* open the right chat: the admin, or the colleague who wrote */
        var conv = (DataAPI.raw().conversations || []).find(function (c) { return String(c.id) === String(raw.entityId); });
        var meNow = _me();
        if (conv && conv.kind === 'PEER' && meNow) _chatWith = Number((conv.participantIds || []).find(function (x) { return Number(x) !== Number(meNow.id); }));
        else _chatWith = 'admin';
        DataAPI.markNotificationRead(id).catch(function () {}).then(function () {
          nav('messages', document.querySelector('[data-v=messages]'));
        });
        return;
      }
      _h(id);
    };
  }
  /* live sync brought new data → refresh badge and an open chat */
  window.addEventListener('storage', function (e) {
    if (e.key !== 'oment_psa_db_v2') return;
    setTimeout(function () {
      updChatBadge();
      if (typeof cv !== 'undefined' && cv === 'messages') {
        var ae = document.activeElement;
        rChat(ae && ae.id === 'chat-in');
      }
    }, 400);
  });
})();

(function () {
  if (document.getElementById('chat-peer-css')) return;
  var st = document.createElement('style'); st.id = 'chat-peer-css';
  st.textContent = '@media (max-width:640px){#chat-card{flex-direction:column!important}#chat-card .chat-side{width:auto!important;max-height:38%;border-right:0!important;border-bottom:1px solid var(--b)}}';
  document.head.appendChild(st);
})();