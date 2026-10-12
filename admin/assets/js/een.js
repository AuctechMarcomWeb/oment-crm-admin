
// var EEN_CHAT = [];        // [{role:'user'|'model', text, sources, degraded}]
// var EEN_BUSY = false;
// var EEN_SIGNALS = null;

// var EEN_SETTINGS_KEY = 'oment_een_settings';

// function eenLoadSettings() {
//   var d = { mode: 'mock', model: 'gemini-2.5-flash', apiKey: '', proxyUrl: window.OMENT_API_BASE ? window.OMENT_API_BASE + '/een/chat' : '/api/een',
//             employeeMessages: false, morningBrief: true, enabledRules: {} };
//   try {
//     var raw = localStorage.getItem(EEN_SETTINGS_KEY);
//     if (raw) Object.assign(d, JSON.parse(raw));
//   } catch (e) {}
//   return d;
// }
// function eenSaveSettings(s) {
//   try { localStorage.setItem(EEN_SETTINGS_KEY, JSON.stringify(s)); } catch (e) {}
//   EenBrain.configure({ mode: s.mode, model: s.model, apiKey: s.apiKey, proxyUrl: s.proxyUrl });
// }

// function eenApplySettings() {
//   var s = eenLoadSettings();
//   EenBrain.configure({ mode: s.mode, model: s.model, apiKey: s.apiKey, proxyUrl: s.proxyUrl });
//   return s;
// }

// /* ══════════════════════════ RENDER ══════════════════════════ */
// function renderEen() {
//   var v = document.getElementById('view-een');
//   if (!v) return;
//   var s = eenApplySettings();
//   var st = EenBrain.status();

//   v.innerHTML =
//     '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px">' +
//       '<div>' +
//         '<div class="section-title" style="font-size:20px">Een</div>' +
//         '<div class="section-sub">Your operations assistant \u2014 ask a question or check the list below</div>' +
//       '</div>' +
//       '<div style="display:flex;gap:8px;align-items:center">' +
//         eenModeBadge(st) +
//         '<button class="btn btn-secondary btn-sm" onclick="eenOpenSettings()">Settings</button>' +
//       '</div>' +
//     '</div>' +

//     (st.warning ?
//       '<div style="padding:11px 15px;background:#FEF2F2;border-radius:var(--r10);margin-bottom:16px;' +
//         'font-size:12.5px;color:#991B1B"><strong>\u26A0 Heads up:</strong> ' + esc(st.warning) + '</div>' : '') +

//     '<div id="een-layout" style="display:grid;grid-template-columns:minmax(280px,360px) 1fr;gap:18px;align-items:start">' +
//       '<div id="een-signals-panel"></div>' +
//       '<div id="een-chat-panel"></div>' +
//     '</div>' +

//     '<style>@media(max-width:900px){#een-layout{grid-template-columns:1fr!important}}</style>';

//   eenRenderSignals();
//   eenRenderChat();
// }

// function eenModeBadge(st) {
//   var map = {
//     mock:   ['Bina AI', 'var(--t2)', 'var(--s2)'],
//     direct: ['AI (local key)', 'var(--amber)', '#FFFBEB'],
//     proxy:  ['AI on', 'var(--green)', '#ECFDF5']
//   };
//   var m = map[st.mode] || map.mock;
//   return '<span style="font-size:11px;font-weight:600;padding:4px 11px;border-radius:99px;' +
//     'background:' + m[2] + ';color:' + m[1] + '">' + m[0] + '</span>';
// }

// /* ══════════════════════════ SIGNALS INBOX ══════════════════════════ */
// function eenRenderSignals() {
//   var el = document.getElementById('een-signals-panel');
//   if (!el) return;
//   el.innerHTML = '<div class="card card-pad"><div style="color:var(--t3);font-size:13px">Looking into it\u2026</div></div>';

//   var s = eenLoadSettings();
//   EenSignals.scanForAdmin(s.enabledRules).then(function (g) {
//     EEN_SIGNALS = g;

//     if (!g.count) {
//       el.innerHTML =
//         '<div class="card card-pad">' +
//           '<div class="empty-teach" style="padding:26px 12px">' +
//             '<div class="empty-teach-icon">\u2705</div>' +
//             '<div class="empty-teach-title">All clear</div>' +
//             '<div class="empty-teach-body">Nothing needs attention right now. ' +
//               'Missed deadlines, stuck work and unpaid invoices will show here.</div>' +
//           '</div>' +
//         '</div>';
//       return;
//     }

//     var groups = [
//       ['Urgent', g.urgent, 'var(--red)', '#FEF2F2'],
//       ['Keep an eye on', g.watch, 'var(--amber)', '#FFFBEB'],
//       ['Bas jaankari', g.fyi, 'var(--t3)', 'var(--s2)']
//     ].filter(function (x) { return x[1].length; });

//     el.innerHTML =
//       '<div class="card" style="position:sticky;top:12px">' +
//         '<div style="padding:13px 15px;border-bottom:1px solid var(--b1);display:flex;' +
//           'align-items:center;justify-content:space-between">' +
//           '<div>' +
//             '<div style="font-size:13.5px;font-weight:700">Needs your attention</div>' +
//             '<div style="font-size:11.5px;color:var(--t3)">' + g.count + ' cheezein mili</div>' +
//           '</div>' +
//           '<button class="btn btn-primary btn-sm" onclick="eenAskBrief()">Full brief</button>' +
//         '</div>' +
//         '<div style="max-height:620px;overflow-y:auto">' +
//           groups.map(function (grp) {
//             return '<div style="padding:9px 15px 3px;font-size:10.5px;font-weight:700;' +
//               'text-transform:uppercase;letter-spacing:.5px;color:' + grp[2] + ';background:' + grp[3] + '">' +
//               grp[0] + ' \u00b7 ' + grp[1].length + '</div>' +
//               grp[1].map(function (sg) { return eenSignalRow(sg, grp[2]); }).join('');
//           }).join('') +
//         '</div>' +
//       '</div>';
//   }).catch(function (e) {
//     el.innerHTML = '<div class="card card-pad"><div style="color:var(--red);font-size:13px">' +
//       esc(e.message || 'Signals didn’t load') + '</div></div>';
//   });
// }

// function eenSignalRow(sg, color) {
//   return '<div style="padding:11px 15px;border-bottom:1px solid var(--b1);cursor:pointer" ' +
//     'onclick="eenAskAbout(\'' + escJs(sg.id) + '\')" role="button" tabindex="0">' +
//     '<div style="display:flex;gap:9px">' +
//       '<div style="width:4px;border-radius:99px;background:' + color + ';flex-shrink:0"></div>' +
//       '<div style="flex:1;min-width:0">' +
//         '<div style="font-size:12.5px;font-weight:600;line-height:1.45;margin-bottom:3px">' +
//           esc(sg.headline) + '</div>' +
//         '<div style="font-size:11.5px;color:var(--t3);line-height:1.5">' + esc(sg.why) + '</div>' +
//         (sg.action ? '<button class="btn btn-secondary btn-sm" style="margin-top:7px;font-size:11px;height:26px" ' +
//           'onclick="event.stopPropagation();eenGoTo(' + escJs(JSON.stringify(sg.action)) + ')">View \u2192</button>' : '') +
//       '</div>' +
//     '</div>' +
//   '</div>';
// }

// function eenGoTo(actionJson) {
//   var a = typeof actionJson === 'string' ? JSON.parse(actionJson) : actionJson;
//   if (!a || !a.module) return;
//   gotoModule(a.module);
//   if (a.module === 'hrm' && a.tab) setTimeout(function () { hrSetTab(a.tab); }, 120);
//   if (a.module === 'profit' && a.projectId) setTimeout(function () { pfOpenProject(a.projectId); }, 120);
//   if (a.module === 'profit' && a.tab) setTimeout(function () { pfSetTab(a.tab); }, 120);
// }

// function eenAskAbout(signalId) {
//   if (!EEN_SIGNALS) return;
//   var sg = EEN_SIGNALS.all.find(function (x) { return x.id === signalId; });
//   if (!sg) return;
//   eenSend('Tell me more about this and what I should do: ' + sg.headline);
// }

// /* ══════════════════════════ CHAT ══════════════════════════ */
// function eenRenderChat() {
//   var el = document.getElementById('een-chat-panel');
//   if (!el) return;

//   var suggestions = [
//     'Give me today’s brief',
//     'Who is absent today?',
//     'Which invoices are unpaid?',
//     'What is overdue?',
//     'Who is free?',
//     'Which project is losing money?',
//     'Top performers'
//   ];

//   el.innerHTML =
//     '<div class="card" style="display:flex;flex-direction:column;height:660px">' +

//       '<div id="een-messages" style="flex:1;overflow-y:auto;padding:18px">' +
//         (EEN_CHAT.length ? EEN_CHAT.map(eenBubble).join('') : eenEmptyChat(suggestions)) +
//         (EEN_BUSY ? eenThinking() : '') +
//       '</div>' +

//       '<div style="border-top:1px solid var(--b1);padding:12px 14px">' +
//         '<div style="display:flex;gap:8px">' +
//           '<input class="form-input" id="een-input" style="flex:1" ' +
//             'placeholder="Ask anything\u2026" aria-label="Ask Een" ' +
//             'onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();eenSubmit()}">' +
//           '<button class="btn btn-primary" onclick="eenSubmit()" ' + (EEN_BUSY ? 'disabled' : '') + '>' +
//             (EEN_BUSY ? 'Wait\u2026' : 'Poochho') + '</button>' +
//         '</div>' +
//         (EEN_CHAT.length ?
//           '<button class="btn btn-secondary btn-sm" style="margin-top:9px;font-size:11.5px;height:28px" ' +
//             'onclick="eenClearChat()">Start a new chat</button>' : '') +
//       '</div>' +
//     '</div>';

//   eenScrollDown();
// }

// function eenEmptyChat(suggestions) {
//   return '<div style="text-align:center;padding:30px 16px">' +
//     '<div style="font-size:32px;margin-bottom:12px">\uD83D\uDCAC</div>' +
//     '<div style="font-size:15px;font-weight:700;margin-bottom:6px">Ask anything</div>' +
//     '<div style="font-size:12.5px;color:var(--t3);line-height:1.6;max-width:340px;margin:0 auto 18px">' +
//       'I answer only from your own data \u2014 projects, money, team, invoices. ' +
//       'If I don’t know, I’ll say so.</div>' +
//     '<div style="display:flex;flex-wrap:wrap;gap:7px;justify-content:center;max-width:420px;margin:0 auto">' +
//       suggestions.map(function (s) {
//         return '<button class="btn btn-secondary btn-sm" style="font-size:12px" ' +
//           'onclick="eenSend(' + escJs(JSON.stringify(s)) + ')">' + esc(s) + '</button>';
//       }).join('') +
//     '</div></div>';
// }

// function eenThinking() {
//   return '<div style="display:flex;gap:10px;padding:10px 0;align-items:center">' +
//     '<div class="avatar avatar-sm" style="background:var(--t1);color:#fff">E</div>' +
//     '<div style="font-size:12.5px;color:var(--t3)">Checking your data\u2026</div>' +
//   '</div>';
// }

// function eenBubble(m) {
//   if (m.role === 'user') {
//     return '<div style="display:flex;justify-content:flex-end;margin-bottom:16px">' +
//       '<div style="max-width:78%;background:var(--t1);color:#fff;padding:10px 14px;' +
//         'border-radius:var(--r12) var(--r12) var(--r4) var(--r12);font-size:13.5px;line-height:1.6">' +
//         esc(m.text) + '</div></div>';
//   }

//   var srcLabels = {
//     get_company_snapshot: 'Company snapshot',
//     get_attention_signals: 'Needs your attention',
//     get_project_money: 'Profitability',
//     get_work_status: 'Deliverables',
//     get_team_capacity: 'Team capacity',
//     get_people_today: 'Today’s attendance',
//     get_leave_requests: 'Leave requests',
//     get_invoices: 'Invoices'
//   };

//   return '<div style="display:flex;gap:10px;margin-bottom:16px">' +
//     '<div class="avatar avatar-sm" style="background:var(--t1);color:#fff;flex-shrink:0">E</div>' +
//     '<div style="flex:1;min-width:0">' +
//       (m.degraded ?
//         '<div style="font-size:11px;color:var(--amber);background:#FFFBEB;padding:5px 9px;' +
//           'border-radius:var(--r6);margin-bottom:7px;display:inline-block">' +
//           esc(m.degradedReason || 'AI didn’t run \u2014 this answer is built directly from your data') + '</div>' : '') +
//       '<div style="font-size:13.5px;line-height:1.7;color:var(--t1);white-space:pre-wrap">' +
//         eenFormat(m.text) + '</div>' +
//       (m.sources && m.sources.length ?
//         '<div style="margin-top:9px;display:flex;gap:5px;flex-wrap:wrap;align-items:center">' +
//           '<span style="font-size:10.5px;color:var(--t4)">Sources:</span>' +
//           m.sources.map(function (s) {
//             return '<span style="font-size:10px;padding:2px 8px;border-radius:99px;' +
//               'background:var(--s2);color:var(--t3)">' + esc(srcLabels[s] || s) + '</span>';
//           }).join('') +
//         '</div>' : '') +
//     '</div></div>';
// }

// /* **bold** support, everything else escaped */
// function eenFormat(text) {
//   return esc(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
// }

// function eenScrollDown() {
//   var m = document.getElementById('een-messages');
//   if (m) m.scrollTop = m.scrollHeight;
// }

// function eenSubmit() {
//   var inp = document.getElementById('een-input');
//   if (!inp) return;
//   var q = inp.value.trim();
//   if (!q) return;
//   inp.value = '';
//   eenSend(q);
// }

// function eenSend(question) {
//   if (EEN_BUSY) return;
//   if (typeof question === 'string' && question.charAt(0) === '"') {
//     try { question = JSON.parse(question); } catch (e) {}
//   }

//   EEN_CHAT.push({ role: 'user', text: question });
//   EEN_BUSY = true;
//   eenRenderChat();

//   var history = EEN_CHAT.slice(-7, -1).map(function (m) {
//     return { role: m.role, text: m.text };
//   });

//   EenBrain.ask(question, history).then(function (r) {
//     EEN_CHAT.push({
//       role: 'model', text: r.text, sources: r.sources,
//       degraded: r.degraded, degradedReason: r.degradedReason
//     });
//   }).catch(function (e) {
//     EEN_CHAT.push({
//       role: 'model',
//       text: 'Couldn’t answer. ' + (e.message || ''),
//       degraded: true,
//       degradedReason: 'Something went wrong'
//     });
//   }).then(function () {
//     EEN_BUSY = false;
//     eenRenderChat();
//   });
// }

// function eenAskBrief() {
//   if (EEN_BUSY) return;
//   EEN_CHAT.push({ role: 'user', text: 'Give me today’s full brief' });
//   EEN_BUSY = true;
//   eenRenderChat();

//   EenBrain.morningBrief().then(function (r) {
//     EEN_CHAT.push({ role: 'model', text: r.text, sources: r.sources,
//                     degraded: r.degraded, degradedReason: r.degradedReason });
//   }).catch(function (e) {
//     EEN_CHAT.push({ role: 'model', text: 'Couldn’t build the brief. ' + (e.message || ''), degraded: true });
//   }).then(function () {
//     EEN_BUSY = false;
//     eenRenderChat();
//   });
// }

// function eenClearChat() { EEN_CHAT = []; eenRenderChat(); }

// /* ══════════════════════════ SETTINGS ══════════════════════════ */
// function eenOpenSettings() {
//   var s = eenLoadSettings();
//   var rules = EenSignals.RULES;

//   openPanel('Een settings',
//     '<div class="form-group">' +
//       '<label class="form-label">How AI runs</label>' +
//       '<select class="form-select" id="een-mode" onchange="eenModeChanged()">' +
//         '<option value="mock"' + (s.mode === 'mock' ? ' selected' : '') + '>No AI \u2014 answers straight from data</option>' +
//         '<option value="proxy"' + (s.mode === 'proxy' ? ' selected' : '') + '>AI via server (safe, production)</option>' +
//         '<option value="direct"' + (s.mode === 'direct' ? ' selected' : '') + '>AI via browser key (testing only)</option>' +
//       '</select>' +
//       '<div class="form-hint">Een works in "No AI" mode too \u2014 the answers are simpler, ' +
//         'but always accurate. The signals list is the same in both modes.</div>' +
//     '</div>' +

//     '<div id="een-proxy-fields" style="display:' + (s.mode === 'proxy' ? 'block' : 'none') + '">' +
//       '<div class="form-group">' +
//         '<label class="form-label">Proxy URL</label>' +
//         '<input class="form-input" id="een-proxy" value="' + escAttr(s.proxyUrl) + '" ' +
//           'placeholder="https://your-app.vercel.app/api/een">' +
//         '<div class="form-hint">The API key stays on the server, not in the browser. ' +
//           'Set <code>GEMINI_API_KEY</code> in the backend <code>.env</code>; the proxy URL is <code>' + escAttr((window.OMENT_API_BASE || '') + '/een/chat') + '</code>.</div>' +
//       '</div>' +
//     '</div>' +

//     '<div id="een-direct-fields" style="display:' + (s.mode === 'direct' ? 'block' : 'none') + '">' +
//       '<div style="padding:11px 14px;background:#FEF2F2;border-radius:var(--r8);margin-bottom:13px;' +
//         'font-size:12.5px;color:#991B1B;line-height:1.6">' +
//         '<strong>For local testing only.</strong> Put a key in the browser on a live site and ' +
//         'anyone can open DevTools and take it \u2014 draining your quota, or running up a bill if billing is on ' +
//         'bill bana dega.</div>' +
//       '<div class="form-group">' +
//         '<label class="form-label">Gemini API key</label>' +
//         '<input class="form-input" id="een-key" type="password" value="' + escAttr(s.apiKey) + '" ' +
//           'placeholder="AIza\u2026">' +
//         '<div class="form-hint">Free key: available from Google AI Studio in 5 minutes.</div>' +
//       '</div>' +
//     '</div>' +

//     '<div class="form-group">' +
//       '<label class="form-label">Model</label>' +
//       '<select class="form-select" id="een-model">' +
//         '<option value="gemini-2.5-flash"' + (s.model === 'gemini-2.5-flash' ? ' selected' : '') + '>Gemini 2.5 Flash</option>' +
//         '<option value="gemini-2.5-flash-lite"' + (s.model === 'gemini-2.5-flash-lite' ? ' selected' : '') + '>Gemini 2.5 Flash-Lite (higher limit)</option>' +
//       '</select>' +
//     '</div>' +

//     '<div style="border-top:1px solid var(--b1);margin:18px 0;padding-top:16px">' +
//       '<div style="font-size:13px;font-weight:700;margin-bottom:10px">Messages to employees</div>' +
//       '<label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;margin-bottom:9px">' +
//         '<input type="checkbox" id="een-emp-msg" ' + (s.employeeMessages ? 'checked' : '') + ' style="margin-top:3px">' +
//         '<span>' +
//           '<span style="font-weight:600;font-size:13px">Let Een message employees directly</span>' +
//           '<span style="display:block;font-size:12px;color:var(--t3);line-height:1.6;margin-top:2px">' +
//             'When off, Een asks you first. <strong>Keep it off at the start</strong> \u2014 ' +
//             'one wrong message breaks trust in the whole feature. Turn it on after a month of watching.</span>' +
//         '</span>' +
//       '</label>' +
//     '</div>' +

//     '<div style="border-top:1px solid var(--b1);margin:18px 0;padding-top:16px">' +
//       '<div style="font-size:13px;font-weight:700;margin-bottom:4px">What to watch</div>' +
//       '<div style="font-size:12px;color:var(--t3);margin-bottom:12px">Switch off anything you don’t want.</div>' +
//       Object.keys(rules).map(function (k) {
//         var on = s.enabledRules[k] !== false;
//         return '<label style="display:flex;align-items:center;gap:9px;padding:6px 0;cursor:pointer">' +
//           '<input type="checkbox" class="een-rule" data-rule="' + k + '" ' + (on ? 'checked' : '') + '>' +
//           '<span style="font-size:12.5px;flex:1">' + esc(rules[k].label) + '</span>' +
//           '<span style="font-size:10px;color:var(--t4);text-transform:uppercase">' +
//             (rules[k].audience === 'BOTH' ? 'dono' : rules[k].audience === 'ADMIN' ? 'aap' : 'employee') + '</span>' +
//         '</label>';
//       }).join('') +
//     '</div>',

//     '<button class="btn btn-secondary" onclick="closePanel()">Cancel</button>' +
//     '<button class="btn btn-primary" onclick="eenSaveSettingsForm()">Save</button>');
// }

// function eenModeChanged() {
//   var m = document.getElementById('een-mode').value;
//   document.getElementById('een-proxy-fields').style.display = m === 'proxy' ? 'block' : 'none';
//   document.getElementById('een-direct-fields').style.display = m === 'direct' ? 'block' : 'none';
// }

// function eenSaveSettingsForm() {
//   var s = eenLoadSettings();
//   s.mode = document.getElementById('een-mode').value;
//   s.model = document.getElementById('een-model').value;
//   var px = document.getElementById('een-proxy');
//   var ky = document.getElementById('een-key');
//   if (px) s.proxyUrl = px.value.trim();
//   if (ky) s.apiKey = ky.value.trim();
//   s.employeeMessages = !!document.getElementById('een-emp-msg').checked;

//   s.enabledRules = {};
//   document.querySelectorAll('.een-rule').forEach(function (cb) {
//     s.enabledRules[cb.dataset.rule] = cb.checked;
//   });

//   if (s.mode === 'proxy' && !s.proxyUrl) { toast('Proxy URL bharo', 'error'); return; }
//   if (s.mode === 'direct' && !s.apiKey) { toast('API key bharo', 'error'); return; }

//   eenSaveSettings(s);
//   closePanel();
//   renderEen();
//   toast('Een settings saved', 'success');
// }

// /* ══════════════════════════ PROACTIVE ══════════════════════════ */
// function eenDashboardCard() {
//   var el = document.getElementById('een-dash-card');
//   if (!el) return;
//   var s = eenLoadSettings();

//   EenSignals.scanForAdmin(s.enabledRules).then(function (g) {
//     if (!g.count) {
//       el.innerHTML = '<div style="font-size:12.5px;color:var(--t3);padding:8px 0">' +
//         '\u2705 Nothing needs attention right now.</div>';
//       return;
//     }
//     var top = g.urgent[0] || g.watch[0] || g.all[0];
//     el.innerHTML =
//       '<div style="display:flex;gap:10px;align-items:flex-start;padding:4px 0 10px">' +
//         '<div class="avatar avatar-sm" style="background:var(--t1);color:#fff;flex-shrink:0">E</div>' +
//         '<div style="flex:1;min-width:0">' +
//           '<div style="font-size:13px;font-weight:600;line-height:1.5;margin-bottom:3px">' +
//             esc(top.headline) + '</div>' +
//           '<div style="font-size:11.5px;color:var(--t3);line-height:1.5">' + esc(top.why) + '</div>' +
//         '</div>' +
//       '</div>' +
//       '<div style="display:flex;gap:8px;align-items:center">' +
//         '<button class="btn btn-primary btn-sm" onclick="gotoModule(\'een\')">' +
//           '' + (g.count - 1) + ' more</button>' +
//       '</div>';
//   });
// }

// function eenPushEmployeeNudges() {
//   var s = eenLoadSettings();
//   if (!s.employeeMessages) return Promise.resolve({ sent: 0, reason: 'Setting is off' });

//   var DB = DataAPI.raw();
//   var sentToday = 0;
//   var todayIso = Utils.isoDate(new Date());

//   return Promise.all(DB.employees.map(function (e) {
//     var already = DB.notifications.some(function (n) {
//       return n.recipientId === e.id && n.kind === 'EEN' &&
//              Utils.isoDate(n.createdAt) === todayIso;
//     });
//     if (already) return null;

//     return EenBrain.employeeNudge(e.id).then(function (nudge) {
//       if (!nudge) return null;
//       DB.notifications.unshift({
//         id: Utils.newId('n'),
//         recipientId: e.id,
//         kind: 'EEN',
//         title: nudge.text,
//         body: 'Why you’re seeing this: ' + nudge.why,      
//         entityType: nudge.action && nudge.action.deliverableId ? 'DELIVERABLE' : null,
//         entityId: nudge.action ? nudge.action.deliverableId : null,
//         read: false,
//         createdAt: new Date().toISOString()
//       });
//       sentToday++;
//       return nudge;
//     }).catch(function () { return null; });
//   })).then(function () {
//     DataAPI.touch();
//     DataAPI.flush();
//     return { sent: sentToday };
//   });
// }


var EEN_CHAT = [];        // [{role:'user'|'model', text, sources, degraded}]
var EEN_BUSY = false;
var EEN_SIGNALS = null;

var EEN_SETTINGS_KEY = 'oment_een_settings';

function eenLoadSettings() {
  var d = { mode: 'mock', model: 'gemini-2.5-flash', apiKey: '', proxyUrl: window.OMENT_API_BASE ? window.OMENT_API_BASE + '/een/chat' : '/api/een',
            employeeMessages: false, morningBrief: true, enabledRules: {} };
  try {
    var raw = localStorage.getItem(EEN_SETTINGS_KEY);
    if (raw) Object.assign(d, JSON.parse(raw));
  } catch (e) {}
  return d;
}
function eenSaveSettings(s) {
  try { localStorage.setItem(EEN_SETTINGS_KEY, JSON.stringify(s)); } catch (e) {}
  EenBrain.configure({ mode: s.mode, model: s.model, apiKey: s.apiKey, proxyUrl: s.proxyUrl });
}

function eenApplySettings() {
  var s = eenLoadSettings();
  EenBrain.configure({ mode: s.mode, model: s.model, apiKey: s.apiKey, proxyUrl: s.proxyUrl });
  return s;
}

/* ══════════════════════════ RENDER ══════════════════════════ */
function renderEen() {
  var v = document.getElementById('view-een');
  if (!v) return;
  var s = eenApplySettings();
  var st = EenBrain.status();

  v.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px">' +
      '<div>' +
        '<div class="section-title" style="font-size:20px">Een</div>' +
        '<div class="section-sub">Your operations assistant \u2014 ask a question or check the list below</div>' +
      '</div>' +
      '<div style="display:flex;gap:8px;align-items:center">' +
        eenModeBadge(st) +
        '<button class="btn btn-secondary btn-sm" onclick="eenOpenSettings()">Settings</button>' +
      '</div>' +
    '</div>' +

    (st.warning ?
      '<div style="padding:11px 15px;background:#FEF2F2;border-radius:var(--r10);margin-bottom:16px;' +
        'font-size:12.5px;color:#991B1B"><strong>\u26A0 Heads up:</strong> ' + esc(st.warning) + '</div>' : '') +

    '<div id="een-layout" style="display:grid;grid-template-columns:minmax(280px,360px) 1fr;gap:18px;align-items:start">' +
      '<div id="een-signals-panel"></div>' +
      '<div id="een-chat-panel"></div>' +
    '</div>' +

    '<style>@media(max-width:900px){#een-layout{grid-template-columns:1fr!important}}</style>';

  eenRenderSignals();
  eenRenderChat();
}

function eenModeBadge(st) {
  var map = {
    mock:   ['No AI', 'var(--t2)', 'var(--s2)'],
    direct: ['AI (local key)', 'var(--amber)', '#FFFBEB'],
    proxy:  ['AI on', 'var(--green)', '#ECFDF5']
  };
  var m = map[st.mode] || map.mock;
  return '<span style="font-size:11px;font-weight:600;padding:4px 11px;border-radius:99px;' +
    'background:' + m[2] + ';color:' + m[1] + '">' + m[0] + '</span>';
}

/* ══════════════════════════ SIGNALS INBOX ══════════════════════════ */
function eenRenderSignals() {
  var el = document.getElementById('een-signals-panel');
  if (!el) return;
  el.innerHTML = '<div class="card card-pad"><div style="color:var(--t3);font-size:13px">Looking into it\u2026</div></div>';

  var s = eenLoadSettings();
  EenSignals.scanForAdmin(s.enabledRules).then(function (g) {
    EEN_SIGNALS = g;

    if (!g.count) {
      el.innerHTML =
        '<div class="card card-pad">' +
          '<div class="empty-teach" style="padding:26px 12px">' +
            '<div class="empty-teach-icon">\u2705</div>' +
            '<div class="empty-teach-title">All clear</div>' +
            '<div class="empty-teach-body">Nothing needs attention right now. ' +
              'Missed deadlines, stuck work and unpaid invoices will show here.</div>' +
          '</div>' +
        '</div>';
      return;
    }

    var groups = [
      ['Urgent', g.urgent, 'var(--red)', '#FEF2F2'],
      ['Keep an eye on', g.watch, 'var(--amber)', '#FFFBEB'],
      ['For your information', g.fyi, 'var(--t3)', 'var(--s2)']
    ].filter(function (x) { return x[1].length; });

    el.innerHTML =
      '<div class="card" style="position:sticky;top:12px">' +
        '<div style="padding:13px 15px;border-bottom:1px solid var(--b1);display:flex;' +
          'align-items:center;justify-content:space-between">' +
          '<div>' +
            '<div style="font-size:13.5px;font-weight:700">Needs your attention</div>' +
            '<div style="font-size:11.5px;color:var(--t3)">' + g.count + ' items found</div>' +
          '</div>' +
          '<button class="btn btn-primary btn-sm" onclick="eenAskBrief()">Full brief</button>' +
        '</div>' +
        '<div style="max-height:620px;overflow-y:auto">' +
          groups.map(function (grp) {
            return '<div style="padding:9px 15px 3px;font-size:10.5px;font-weight:700;' +
              'text-transform:uppercase;letter-spacing:.5px;color:' + grp[2] + ';background:' + grp[3] + '">' +
              grp[0] + ' \u00b7 ' + grp[1].length + '</div>' +
              grp[1].map(function (sg) { return eenSignalRow(sg, grp[2]); }).join('');
          }).join('') +
        '</div>' +
      '</div>';
  }).catch(function (e) {
    el.innerHTML = '<div class="card card-pad"><div style="color:var(--red);font-size:13px">' +
      esc(e.message || 'Signals didn’t load') + '</div></div>';
  });
}

function eenSignalRow(sg, color) {
  return '<div style="padding:11px 15px;border-bottom:1px solid var(--b1);cursor:pointer" ' +
    'onclick="eenAskAbout(\'' + escJs(sg.id) + '\')" role="button" tabindex="0">' +
    '<div style="display:flex;gap:9px">' +
      '<div style="width:4px;border-radius:99px;background:' + color + ';flex-shrink:0"></div>' +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-size:12.5px;font-weight:600;line-height:1.45;margin-bottom:3px">' +
          esc(sg.headline) + '</div>' +
        '<div style="font-size:11.5px;color:var(--t3);line-height:1.5">' + esc(sg.why) + '</div>' +
        (sg.action ? '<button class="btn btn-secondary btn-sm" style="margin-top:7px;font-size:11px;height:26px" ' +
          'onclick="event.stopPropagation();eenGoTo(' + escJs(JSON.stringify(sg.action)) + ')">View \u2192</button>' : '') +
      '</div>' +
    '</div>' +
  '</div>';
}

function eenGoTo(actionJson) {
  var a = typeof actionJson === 'string' ? JSON.parse(actionJson) : actionJson;
  if (!a || !a.module) return;
  gotoModule(a.module);
  if (a.module === 'hrm' && a.tab) setTimeout(function () { hrSetTab(a.tab); }, 120);
  if (a.module === 'profit' && a.projectId) setTimeout(function () { pfOpenProject(a.projectId); }, 120);
  if (a.module === 'profit' && a.tab) setTimeout(function () { pfSetTab(a.tab); }, 120);
}

function eenAskAbout(signalId) {
  if (!EEN_SIGNALS) return;
  var sg = EEN_SIGNALS.all.find(function (x) { return x.id === signalId; });
  if (!sg) return;
  eenSend('Tell me more about this and what I should do: ' + sg.headline);
}

/* ══════════════════════════ CHAT ══════════════════════════ */
function eenRenderChat() {
  var el = document.getElementById('een-chat-panel');
  if (!el) return;

  var suggestions = [
    'Give me today’s brief',
    'Who is absent today?',
    'Which invoices are unpaid?',
    'What is overdue?',
    'Who is free?',
    'Which project is losing money?',
    'Top performers'
  ];

  el.innerHTML =
    '<div class="card" style="display:flex;flex-direction:column;height:660px">' +

      '<div id="een-messages" style="flex:1;overflow-y:auto;padding:18px">' +
        (EEN_CHAT.length ? EEN_CHAT.map(eenBubble).join('') : eenEmptyChat(suggestions)) +
        (EEN_BUSY ? eenThinking() : '') +
      '</div>' +

      '<div style="border-top:1px solid var(--b1);padding:12px 14px">' +
        '<div style="display:flex;gap:8px">' +
          '<input class="form-input" id="een-input" style="flex:1" ' +
            'placeholder="Ask anything\u2026" aria-label="Ask Een" ' +
            'onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();eenSubmit()}">' +
          '<button class="btn btn-primary" onclick="eenSubmit()" ' + (EEN_BUSY ? 'disabled' : '') + '>' +
            (EEN_BUSY ? 'Wait\u2026' : 'Ask') + '</button>' +
        '</div>' +
        (EEN_CHAT.length ?
          '<button class="btn btn-secondary btn-sm" style="margin-top:9px;font-size:11.5px;height:28px" ' +
            'onclick="eenClearChat()">Start a new chat</button>' : '') +
      '</div>' +
    '</div>';

  eenScrollDown();
}

function eenEmptyChat(suggestions) {
  return '<div style="text-align:center;padding:30px 16px">' +
    '<div style="font-size:32px;margin-bottom:12px">\uD83D\uDCAC</div>' +
    '<div style="font-size:15px;font-weight:700;margin-bottom:6px">Ask anything</div>' +
    '<div style="font-size:12.5px;color:var(--t3);line-height:1.6;max-width:340px;margin:0 auto 18px">' +
      'I answer only from your own data \u2014 projects, money, team, invoices. ' +
      'If I don’t know, I’ll say so.</div>' +
    '<div style="display:flex;flex-wrap:wrap;gap:7px;justify-content:center;max-width:420px;margin:0 auto">' +
      suggestions.map(function (s) {
        return '<button class="btn btn-secondary btn-sm" style="font-size:12px" ' +
          'onclick="eenSend(' + escJs(JSON.stringify(s)) + ')">' + esc(s) + '</button>';
      }).join('') +
    '</div></div>';
}

function eenThinking() {
  return '<div style="display:flex;gap:10px;padding:10px 0;align-items:center">' +
    '<div class="avatar avatar-sm" style="background:var(--t1);color:#fff">E</div>' +
    '<div style="font-size:12.5px;color:var(--t3)">Checking your data\u2026</div>' +
  '</div>';
}

function eenBubble(m) {
  if (m.role === 'user') {
    return '<div style="display:flex;justify-content:flex-end;margin-bottom:16px">' +
      '<div style="max-width:78%;background:var(--t1);color:#fff;padding:10px 14px;' +
        'border-radius:var(--r12) var(--r12) var(--r4) var(--r12);font-size:13.5px;line-height:1.6">' +
        esc(m.text) + '</div></div>';
  }

  var srcLabels = {
    get_company_snapshot: 'Company snapshot',
    get_attention_signals: 'Needs your attention',
    get_project_money: 'Profitability',
    get_work_status: 'Deliverables',
    get_team_capacity: 'Team capacity',
    get_people_today: 'Today’s attendance',
    get_leave_requests: 'Leave requests',
    get_invoices: 'Invoices'
  };

  return '<div style="display:flex;gap:10px;margin-bottom:16px">' +
    '<div class="avatar avatar-sm" style="background:var(--t1);color:#fff;flex-shrink:0">E</div>' +
    '<div style="flex:1;min-width:0">' +
      (m.degraded ?
        '<div style="font-size:11px;color:var(--amber);background:#FFFBEB;padding:5px 9px;' +
          'border-radius:var(--r6);margin-bottom:7px;display:inline-block">' +
          esc(m.degradedReason || 'AI didn’t run \u2014 this answer is built directly from your data') + '</div>' : '') +
      '<div style="font-size:13.5px;line-height:1.7;color:var(--t1);white-space:pre-wrap">' +
        eenFormat(m.text) + '</div>' +
      (m.sources && m.sources.length ?
        '<div style="margin-top:9px;display:flex;gap:5px;flex-wrap:wrap;align-items:center">' +
          '<span style="font-size:10.5px;color:var(--t4)">Sources:</span>' +
          m.sources.map(function (s) {
            return '<span style="font-size:10px;padding:2px 8px;border-radius:99px;' +
              'background:var(--s2);color:var(--t3)">' + esc(srcLabels[s] || s) + '</span>';
          }).join('') +
        '</div>' : '') +
    '</div></div>';
}

/* **bold** support, everything else escaped */
function eenFormat(text) {
  return esc(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function eenScrollDown() {
  var m = document.getElementById('een-messages');
  if (m) m.scrollTop = m.scrollHeight;
}

function eenSubmit() {
  var inp = document.getElementById('een-input');
  if (!inp) return;
  var q = inp.value.trim();
  if (!q) return;
  inp.value = '';
  eenSend(q);
}

function eenSend(question) {
  if (EEN_BUSY) return;
  if (typeof question === 'string' && question.charAt(0) === '"') {
    try { question = JSON.parse(question); } catch (e) {}
  }

  EEN_CHAT.push({ role: 'user', text: question });
  EEN_BUSY = true;
  eenRenderChat();

  var history = EEN_CHAT.slice(-7, -1).map(function (m) {
    return { role: m.role, text: m.text };
  });

  EenBrain.ask(question, history).then(function (r) {
    EEN_CHAT.push({
      role: 'model', text: r.text, sources: r.sources,
      degraded: r.degraded, degradedReason: r.degradedReason
    });
  }).catch(function (e) {
    EEN_CHAT.push({
      role: 'model',
      text: 'Couldn’t answer. ' + (e.message || ''),
      degraded: true,
      degradedReason: 'Something went wrong'
    });
  }).then(function () {
    EEN_BUSY = false;
    eenRenderChat();
  });
}

function eenAskBrief() {
  if (EEN_BUSY) return;
  EEN_CHAT.push({ role: 'user', text: 'Give me today’s full brief' });
  EEN_BUSY = true;
  eenRenderChat();

  EenBrain.morningBrief().then(function (r) {
    EEN_CHAT.push({ role: 'model', text: r.text, sources: r.sources,
                    degraded: r.degraded, degradedReason: r.degradedReason });
  }).catch(function (e) {
    EEN_CHAT.push({ role: 'model', text: 'Couldn’t build the brief. ' + (e.message || ''), degraded: true });
  }).then(function () {
    EEN_BUSY = false;
    eenRenderChat();
  });
}

function eenClearChat() { EEN_CHAT = []; eenRenderChat(); }

/* ══════════════════════════ SETTINGS ══════════════════════════ */
function eenOpenSettings() {
  var s = eenLoadSettings();
  var rules = EenSignals.RULES;

  openPanel('Een settings',
    '<div class="form-group">' +
      '<label class="form-label">How AI runs</label>' +
      '<select class="form-select" id="een-mode" onchange="eenModeChanged()">' +
        '<option value="mock"' + (s.mode === 'mock' ? ' selected' : '') + '>No AI \u2014 answers straight from data</option>' +
        '<option value="proxy"' + (s.mode === 'proxy' ? ' selected' : '') + '>AI via server (safe, production)</option>' +
        '<option value="direct"' + (s.mode === 'direct' ? ' selected' : '') + '>AI via browser key (testing only)</option>' +
      '</select>' +
      '<div class="form-hint">Een works in "No AI" mode too \u2014 the answers are simpler, ' +
        'but always accurate. The signals list is the same in both modes.</div>' +
    '</div>' +

    '<div id="een-proxy-fields" style="display:' + (s.mode === 'proxy' ? 'block' : 'none') + '">' +
      '<div class="form-group">' +
        '<label class="form-label">Proxy URL</label>' +
        '<input class="form-input" id="een-proxy" value="' + escAttr(s.proxyUrl) + '" ' +
          'placeholder="https://your-app.vercel.app/api/een">' +
        '<div class="form-hint">The API key stays on the server, not in the browser. ' +
          'Set <code>GEMINI_API_KEY</code> in the backend <code>.env</code>; the proxy URL is <code>' + escAttr((window.OMENT_API_BASE || '') + '/een/chat') + '</code>.</div>' +
      '</div>' +
    '</div>' +

    '<div id="een-direct-fields" style="display:' + (s.mode === 'direct' ? 'block' : 'none') + '">' +
      '<div style="padding:11px 14px;background:#FEF2F2;border-radius:var(--r8);margin-bottom:13px;' +
        'font-size:12.5px;color:#991B1B;line-height:1.6">' +
        '<strong>For local testing only.</strong> Put a key in the browser on a live site and ' +
        'anyone can open DevTools and take it \u2014 draining your quota, or running up a bill if billing is on.</div>' +
      '<div class="form-group">' +
        '<label class="form-label">Gemini API key</label>' +
        '<input class="form-input" id="een-key" type="password" value="' + escAttr(s.apiKey) + '" ' +
          'placeholder="AIza\u2026">' +
        '<div class="form-hint">Free key: available from Google AI Studio in 5 minutes.</div>' +
      '</div>' +
    '</div>' +

    '<div class="form-group">' +
      '<label class="form-label">Model</label>' +
      '<select class="form-select" id="een-model">' +
        '<option value="gemini-2.5-flash"' + (s.model === 'gemini-2.5-flash' ? ' selected' : '') + '>Gemini 2.5 Flash</option>' +
        '<option value="gemini-2.5-flash-lite"' + (s.model === 'gemini-2.5-flash-lite' ? ' selected' : '') + '>Gemini 2.5 Flash-Lite (higher limit)</option>' +
      '</select>' +
    '</div>' +

    '<div style="border-top:1px solid var(--b1);margin:18px 0;padding-top:16px">' +
      '<div style="font-size:13px;font-weight:700;margin-bottom:10px">Messages to employees</div>' +
      '<label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;margin-bottom:9px">' +
        '<input type="checkbox" id="een-emp-msg" ' + (s.employeeMessages ? 'checked' : '') + ' style="margin-top:3px">' +
        '<span>' +
          '<span style="font-weight:600;font-size:13px">Let Een message employees directly</span>' +
          '<span style="display:block;font-size:12px;color:var(--t3);line-height:1.6;margin-top:2px">' +
            'When off, Een asks you first. <strong>Keep it off at the start</strong> \u2014 ' +
            'one wrong message breaks trust in the whole feature. Turn it on after a month of watching.</span>' +
        '</span>' +
      '</label>' +
    '</div>' +

    '<div style="border-top:1px solid var(--b1);margin:18px 0;padding-top:16px">' +
      '<div style="font-size:13px;font-weight:700;margin-bottom:4px">What to watch</div>' +
      '<div style="font-size:12px;color:var(--t3);margin-bottom:12px">Switch off anything you don’t want.</div>' +
      Object.keys(rules).map(function (k) {
        var on = s.enabledRules[k] !== false;
        return '<label style="display:flex;align-items:center;gap:9px;padding:6px 0;cursor:pointer">' +
          '<input type="checkbox" class="een-rule" data-rule="' + k + '" ' + (on ? 'checked' : '') + '>' +
          '<span style="font-size:12.5px;flex:1">' + esc(rules[k].label) + '</span>' +
          '<span style="font-size:10px;color:var(--t4);text-transform:uppercase">' +
            (rules[k].audience === 'BOTH' ? 'both' : rules[k].audience === 'ADMIN' ? 'you' : 'employee') + '</span>' +
        '</label>';
      }).join('') +
    '</div>',

    '<button class="btn btn-secondary" onclick="closePanel()">Cancel</button>' +
    '<button class="btn btn-primary" onclick="eenSaveSettingsForm()">Save</button>');
}

function eenModeChanged() {
  var m = document.getElementById('een-mode').value;
  document.getElementById('een-proxy-fields').style.display = m === 'proxy' ? 'block' : 'none';
  document.getElementById('een-direct-fields').style.display = m === 'direct' ? 'block' : 'none';
}

function eenSaveSettingsForm() {
  var s = eenLoadSettings();
  s.mode = document.getElementById('een-mode').value;
  s.model = document.getElementById('een-model').value;
  var px = document.getElementById('een-proxy');
  var ky = document.getElementById('een-key');
  if (px) s.proxyUrl = px.value.trim();
  if (ky) s.apiKey = ky.value.trim();
  s.employeeMessages = !!document.getElementById('een-emp-msg').checked;

  s.enabledRules = {};
  document.querySelectorAll('.een-rule').forEach(function (cb) {
    s.enabledRules[cb.dataset.rule] = cb.checked;
  });

  if (s.mode === 'proxy' && !s.proxyUrl) { toast('Enter the proxy URL', 'error'); return; }
  if (s.mode === 'direct' && !s.apiKey) { toast('Enter the API key', 'error'); return; }

  eenSaveSettings(s);
  closePanel();
  renderEen();
  toast('Een settings saved', 'success');
}

/* ══════════════════════════ PROACTIVE ══════════════════════════ */
function eenDashboardCard() {
  var el = document.getElementById('een-dash-card');
  if (!el) return;
  var s = eenLoadSettings();

  EenSignals.scanForAdmin(s.enabledRules).then(function (g) {
    if (!g.count) {
      el.innerHTML = '<div style="font-size:12.5px;color:var(--t3);padding:8px 0">' +
        '\u2705 Nothing needs attention right now.</div>';
      return;
    }
    var top = g.urgent[0] || g.watch[0] || g.all[0];
    el.innerHTML =
      '<div style="display:flex;gap:10px;align-items:flex-start;padding:4px 0 10px">' +
        '<div class="avatar avatar-sm" style="background:var(--t1);color:#fff;flex-shrink:0">E</div>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-size:13px;font-weight:600;line-height:1.5;margin-bottom:3px">' +
            esc(top.headline) + '</div>' +
          '<div style="font-size:11.5px;color:var(--t3);line-height:1.5">' + esc(top.why) + '</div>' +
        '</div>' +
      '</div>' +
      '<div style="display:flex;gap:8px;align-items:center">' +
        '<button class="btn btn-primary btn-sm" onclick="gotoModule(\'een\')">' +
          '' + (g.count - 1) + ' more</button>' +
      '</div>';
  });
}

function eenPushEmployeeNudges() {
  var s = eenLoadSettings();
  if (!s.employeeMessages) return Promise.resolve({ sent: 0, reason: 'Setting is off' });

  var DB = DataAPI.raw();
  var sentToday = 0;
  var todayIso = Utils.isoDate(new Date());

  return Promise.all(DB.employees.map(function (e) {
    var already = DB.notifications.some(function (n) {
      return n.recipientId === e.id && n.kind === 'EEN' &&
             Utils.isoDate(n.createdAt) === todayIso;
    });
    if (already) return null;

    return EenBrain.employeeNudge(e.id).then(function (nudge) {
      if (!nudge) return null;
      DB.notifications.unshift({
        id: Utils.newId('n'),
        recipientId: e.id,
        kind: 'EEN',
        title: nudge.text,
        body: 'Why you’re seeing this: ' + nudge.why,      
        entityType: nudge.action && nudge.action.deliverableId ? 'DELIVERABLE' : null,
        entityId: nudge.action ? nudge.action.deliverableId : null,
        read: false,
        createdAt: new Date().toISOString()
      });
      sentToday++;
      return nudge;
    }).catch(function () { return null; });
  })).then(function () {
    DataAPI.touch();
    DataAPI.flush();
    return { sent: sentToday };
  });
}