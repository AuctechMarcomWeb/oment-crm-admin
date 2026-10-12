/* ============================================================
   MESSAGES MODULE
   ============================================================ */

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



/* Sidebar badge = real unread count (was a fixed "3" in index.html) */
function updateMsgBadge() {
  const badge = document.getElementById('msg-badge');
  if (!badge) return;
  const n = (STATE.messages || []).reduce((s, m) => s + (m.unread || 0), 0);
  badge.textContent = n;
  badge.style.display = n > 0 ? '' : 'none';
}

/* ── Online status ───────────────────────────────────────────
   "Online" means the employee app is open right now: it sends a heartbeat
   every 15 s, and the server's live board marks someone online if one
   arrived in the last 2 minutes and they haven't logged out. (It used to
   read the day's attendance status, so someone present in the morning
   stayed "online" all day and people who logged in later looked offline.) */
var _onlineMap = {};          // empId -> { online, lastSeenAt, lastOutAt }

function _presence(empId) {
  const live = _onlineMap[empId];
  if (live) return live;
  /* not fetched yet: work it out from today's attendance record */
  const today = Utils.isoDate(new Date());
  const a = (DataAPI.raw().attendance || []).find(x => Number(x.employeeId) === Number(empId) && x.date === today);
  const seen = a && a.lastSeenAt ? Date.parse(a.lastSeenAt) : 0;
  return { online: !!(a && !a.lastOutAt && seen && Date.now() - seen < 2 * 60 * 1000), lastSeenAt: a && a.lastSeenAt, lastOutAt: a && a.lastOutAt };
}
function _isOnline(empId) { return !!_presence(empId).online; }

function _statusText(empId) {
  const p = _presence(empId);
  if (p.online) return '\u25CF Online';
  const last = p.lastOutAt || p.lastSeenAt;
  if (!last) return '\u25CB Offline';
  const d = new Date(last);
  const same = d.toDateString() === new Date().toDateString();
  return '\u25CB Offline \u00b7 last seen ' + (same ? '' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ', ') +
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function _refreshOnline() {
  if (!window.OmentAPI || !OmentAPI.attendanceLive) return Promise.resolve(false);
  return OmentAPI.attendanceLive().then(function (rows) {
    const next = {};
    (rows || []).forEach(r => { next[r.employeeId] = { online: !!r.online, lastSeenAt: r.lastSeenAt, lastOutAt: r.lastOutAt }; });
    const changed = JSON.stringify(next) !== JSON.stringify(_onlineMap);
    _onlineMap = next;
    return changed;
  }).catch(function () { return false; });
}

/* redraw only the green dots and the "Online" line — never the message box */
function _paintOnline() {
  if (STATE.currentModule !== 'messages') return;
  renderContacts(_msgContacts());
  const m = STATE.messages.find(x => String(x.id) === String(STATE.currentConversation));
  const st = document.getElementById('chat-status');
  if (m && st) {
    st.textContent = _statusText(m.withId);
    st.style.color = _isOnline(m.withId) ? 'var(--green)' : 'var(--t3)';
  }
}

/* Existing chats first, then every active employee you haven't messaged yet */
function _msgContacts() {
  const convs = (STATE.messages || []).map(m => Object.assign({ key: String(m.id) }, m, { isOnline: _isOnline(m.withId) }));
  const withChat = new Set(convs.map(m => m.withId));
  const others = (DataAPI.raw().employees || [])
    .filter(e => e.active !== false && !withChat.has(e.id))
    .map(e => ({
      key: 'emp:' + e.id, withId: e.id, name: e.name, avatar: e.avatarInitials,
      color: e.color || e.avatarBg, isOnline: _isOnline(e.id),
      unread: 0, preview: 'Start a conversation', time: '', msgs: []
    }));
  return convs.concat(others);
}

function renderMessages() {
  renderContacts(_msgContacts());
  updateMsgBadge();
  _refreshOnline().then(function (changed) { if (changed) _paintOnline(); });
}

var _onlineTick = 0;
setInterval(function () {
  if (STATE.currentModule !== 'messages' || document.hidden) return;
  _onlineTick++;
  if (_onlineTick % 5 !== 0) return;                       // every 15 s
  _refreshOnline().then(function (changed) { if (changed) _paintOnline(); });
}, 3000);

function renderContacts(list) {
  const el = document.getElementById('contacts-list');
  if (!el) return;
  if (!list.length) {
    el.innerHTML = '<div class="empty-state" style="padding:24px 12px"><div class="empty-title">No employees yet</div><div class="empty-sub">Add employees first, then you can message them here.</div></div>';
    return;
  }
  el.innerHTML = list.map(m => `
    <div class="contact-item${String(STATE.currentConversation) === m.key ? ' active' : ''}" data-key="${escAttr(m.key)}" onclick="openContact(this.dataset.key)">
      <div style="position:relative">
        <div class="avatar" style="background:${m.color}">${esc(m.avatar || '')}</div>
        ${m.isOnline ? `<div style="position:absolute;bottom:0;right:0;width:9px;height:9px;border-radius:50%;background:var(--green);border:2px solid var(--surface)"></div>` : ''}
      </div>
      <div class="contact-info">
        <div class="contact-name">${esc(m.name)}</div>
        <div class="contact-preview">${esc(m.preview)}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        <div class="contact-time">${m.time || ''}</div>
        ${m.unread > 0 ? `<div class="unread-badge">${m.unread}</div>` : ''}
      </div>
    </div>`).join('');
}

/* Click on a contact: open the chat, or create it first for a new contact */
function openContact(key) {
  if (key.indexOf('emp:') !== 0) return openConversation(key);
  DataAPI.startConversation(Number(key.slice(4))).then(function (c) {
    syncState();
    openConversation(String(c.id));
  }).catch(function (err) { toast(err.message, 'error'); });
}

function openConversation(id) {
  const m = STATE.messages.find(x => String(x.id) === String(id));
  if (!m) return;
  STATE.currentConversation = String(m.id);

  if (m.unread > 0) {
    m.unread = 0;
    DataAPI.markConversationRead(m.id).catch(function () {});   // saved on the server
  }
  updateMsgBadge();

  if (window.innerWidth <= 768) {
    const cp = document.querySelector('.contacts-panel');
    const ca = document.querySelector('.chat-area');
    if (cp) cp.classList.add('hidden');
    if (ca) ca.classList.add('active');
  }

  document.getElementById('chat-header').innerHTML = `
    <button class="msg-back-btn" onclick="msgGoBack()" title="Back to contacts">
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      Back
    </button>
    <div class="avatar" style="background:${m.color}">${esc(m.avatar || '')}</div>
    <div style="flex:1">
      <div style="font-size:14px;font-weight:650">${esc(m.name)}</div>
      <div id="chat-status" style="font-size:12px;color:${_isOnline(m.withId) ? 'var(--green)' : 'var(--t3)'}">${esc(_statusText(m.withId))}</div>
    </div>`;

  const chatEl = document.getElementById('chat-messages');
  const rawC = (DataAPI.raw().conversations || []).find(c => String(c.id) === String(m.id)) || { msgs: [] };
  const adminId = (DataAPI.raw().adminUser || {}).id;
  chatEl.style.display = 'flex';
  chatEl.style.flexDirection = 'column';
  chatEl.style.gap = '0';
  chatEl.style.background = WA_BG;
  chatEl.innerHTML = waChatHtml(rawC.msgs || [], adminId, rawC.empUnread || 0,
    'No messages yet \u2014 say hello to ' + m.name.split(' ')[0] + '.');
  const bar = document.getElementById('chat-input-bar');
  if (bar.dataset.wa !== '1') {                       // build the WhatsApp composer once
    const draft = (document.getElementById('chat-input') || {}).value || '';
    bar.innerHTML = waComposerHtml('chat-input', 'chat-send', 'sendMessage()', draft);
    bar.dataset.wa = '1';
    bar.style.padding = '0';
    bar.style.borderTop = '0';
    bar.style.background = '#F0F2F5';
  }
  bar.style.display = 'flex';
  waBtnState('chat-input', 'chat-send');
  chatEl.scrollTop = chatEl.scrollHeight;
  const input = document.getElementById('chat-input');
  if (input) input.focus();

  renderContacts(_msgContacts());
}

function msgGoBack() {
  const cp = document.querySelector('.contacts-panel');
  const ca = document.querySelector('.chat-area');
  if (cp) cp.classList.remove('hidden');
  if (ca) ca.classList.remove('active');
  STATE.currentConversation = null;
}

function sendMessage() {
  const input = document.getElementById('chat-input');
  const text = input && input.value ? input.value.trim() : '';
  if (!text || !STATE.currentConversation) return;
  const id = STATE.currentConversation;
  input.disabled = true;
  DataAPI.sendMessage(id, STATE.adminUser.id, text).then(function () {
    syncState();
    input.value = '';
    input.style.height = '';
    waBtnState('chat-input', 'chat-send');
    openConversation(id);
  }).catch(function (err) { toast(err.message, 'error'); })
    .then(function () { input.disabled = false; input.focus(); });
}

function filterContacts(val) {
  const q = String(val || '').toLowerCase();
  renderContacts(_msgContacts().filter(m => m.name.toLowerCase().includes(q)));
}

/* ============================================================
   LIVE MESSAGES — new employee messages show up without a refresh.
   Checks the server every 3 s while Messages is open, every 6 s on
   other screens, every 15 s when this tab is in the background, and
   immediately when you come back to the tab. Only conversations are
   fetched; when something changed, the rest (bell, badge, dashboard)
   is refreshed once. Text you are typing is kept.
   ============================================================ */
var _admMsgSig = null, _admMsgTick = 0, _admMsgBusy = false;

function _admMsgSignature(list) {
  return (list || []).map(function (c) {
    var msgs = c.msgs || [];
    var last = msgs[msgs.length - 1];
    /* empUnread too: when the employee reads, the ticks must turn blue */
    return c.id + ':' + msgs.length + ':' + (last ? last.at : '') + ':' + (c.unread || 0) + ':' + (c.empUnread || 0);
  }).sort().join('|');
}

function _admPollMessages(force) {
  if (_admMsgBusy || !window.DataAPI || !window.OMENT_HTTP_ADAPTER || !OMENT_HTTP_ADAPTER.hasToken()) return;
  _admMsgTick++;
  const onMessages = STATE.currentModule === 'messages';
  if (force !== true) {
    if (document.hidden) { if (_admMsgTick % 5 !== 0) return; }
    else if (!onMessages && _admMsgTick % 2 !== 0) return;
  }
  /* compare against what this page already shows — not against the first
     answer from the server, or a message arriving in between would be missed */
  if (_admMsgSig === null) _admMsgSig = _admMsgSignature(DataAPI.raw().conversations);
  _admMsgBusy = true;
  DataAPI.getConversations().then(function (list) {
    const sig = _admMsgSignature(list);
    if (sig === _admMsgSig) return;
    _admMsgSig = sig;
    /* something new — pull the fresh data once, then redraw what is visible */
    return OMENT_HTTP_ADAPTER.refreshSnapshot().then(function () {
      syncState();
      if (typeof renderNotifications === 'function') renderNotifications();
      updateMsgBadge();
      if (STATE.currentModule === 'dashboard' && typeof renderMsgPreview === 'function') renderMsgPreview();
      if (STATE.currentModule === 'messages') {
        const input = document.getElementById('chat-input');
        const typing = input && document.activeElement === input;
        const a = typing ? input.selectionStart : 0, b = typing ? input.selectionEnd : 0;
        if (STATE.currentConversation) openConversation(STATE.currentConversation);
        else renderContacts(_msgContacts());
        const input2 = document.getElementById('chat-input');
        if (typing && input2) { input2.focus(); try { input2.setSelectionRange(a, b); } catch (e) {} }
      }
      _admMsgSig = _admMsgSignature(DataAPI.raw().conversations);
    });
  }).catch(function () { /* offline — try again next tick */ })
    .then(function () { _admMsgBusy = false; });
}

setInterval(_admPollMessages, 3000);
document.addEventListener('visibilitychange', function () { if (!document.hidden) _admPollMessages(true); });
window.addEventListener('focus', function () { _admPollMessages(true); });
