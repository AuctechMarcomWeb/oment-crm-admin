// var STATE = {
//   currentModule: 'dashboard',
//   currentProject: null,
//   currentConversation: null,
//   currentEmployee: null,
//   empStatusFilter: '',
//   invoiceFilter: 'All',
//   moduleHistory: [],
//   noticeDetailOpen: false,
//   calMonth: new Date().getMonth(),
//   calYear: new Date().getFullYear(),
//   currentNotice: null,
//   noticeFilter: 'All',
//   settingsTab: 'company',
//   phoneInput: '',
//   eenChats: [],

//   company: {}, adminUser: {},
//   employees: [], departments: [], projects: [], tasks: [],
//   invoices: [], messages: [], notifications: [],
//   activityFeed: [], calendarEvents: [], notices: [], callLogs: [],
//   settings: {}
// };

// /* ── Display mappers: canonical -> admin ke purane strings ─────────────── */
// var _ADMIN_TASK_STATUS = {
//   TODO: 'Not Started', IN_PROGRESS: 'In Progress',
//   IN_REVIEW: 'In Review', REJECTED: 'In Progress', DONE: 'Done'
// };
// var _ADMIN_MS_STATUS  = { UPCOMING: 'Upcoming', IN_PROGRESS: 'In Progress', DONE: 'Done' };
// var _ADMIN_PRJ_STATUS = { PLANNING: 'Planning', ACTIVE: 'Active', ON_HOLD: 'On Hold', COMPLETED: 'Completed' };
// var _ADMIN_PRIORITY   = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High' };
// var _ADMIN_ATTENDANCE = { PRESENT: 'Present', HALF_DAY: 'Half Day', ABSENT: 'Absent', ON_LEAVE: 'On Leave' };
// var _ADMIN_INV_STATUS = { DRAFT: 'Draft', SENT: 'Sent', PARTIALLY_PAID: 'Partially Paid', PAID: 'Paid', OVERDUE: 'Overdue', CANCELLED: 'Cancelled' };
// var _ADMIN_LEAD_STAGE = { NEW: 'New', CONTACTED: 'Contacted', PROPOSAL_SENT: 'Proposal Sent', NEGOTIATION: 'Negotiation', WON: 'Won', LOST: 'Lost' };

// function _toCanonicalTaskStatus(s) {
//   var map = { 'Not Started': 'TODO', 'In Progress': 'IN_PROGRESS', 'In Review': 'IN_REVIEW', 'Done': 'DONE', 'Rejected': 'REJECTED' };
//   return map[s] || Schema.normStatus(s);
// }
// function _toCanonicalPriority(p) { return Schema.normPriority(p); }

// /* ── Formatters ───────────────────────────────────────────────────────── */
// function _fmtDay(iso) {
//   if (!iso) return '';
//   var d = new Date(iso);
//   if (isNaN(d)) return String(iso);
//   return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
// }
// function _fmtTime(iso) {
//   if (!iso) return '';
//   var d = new Date(iso);
//   if (isNaN(d)) return String(iso);
//   return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
// }
// function _relTime(iso) {
//   if (!iso) return '';
//   var diff = Date.now() - new Date(iso).getTime();
//   var mins = Math.round(diff / 60000);
//   if (mins < 1) return 'Just now';
//   if (mins < 60) return mins + ' min ago';
//   var hrs = Math.round(mins / 60);
//   if (hrs < 24) return hrs + (hrs === 1 ? ' hour ago' : ' hours ago');
//   var days = Math.round(hrs / 24);
//   if (days < 30) return days + (days === 1 ? ' day ago' : ' days ago');
//   return _fmtDay(iso);
// }
// function _durLabel(secs) {
//   if (!secs) return '\u2014';
//   var m = Math.floor(secs / 60), s = secs % 60;
//   return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
// }

// /* ── Main projection ──────────────────────────────────────────────────── */
// function syncState() {
//   var DB = DataAPI.raw();
//   if (!DB) return;

//   var today = Utils.isoDate(new Date());
//   function _empTodayStatus(empId, att, DB, today) {
//     var onLeave = (DB.leaveRequests || []).some(function (r) {
//       return r.employeeId === empId && r.status === 'APPROVED' &&
//         (((r.dates || []).indexOf(today) >= 0) || (r.fromDate <= today && r.toDate >= today));
//     });
//     /* checked in today = working, even if a leave was approved for today */
//     if (att && att.firstInAt) return att.status === 'HALF_DAY' ? (_ADMIN_ATTENDANCE.HALF_DAY || 'Half Day') : 'Present';
//     if (onLeave || (att && att.status === 'ON_LEAVE')) return 'On Leave';
//     return 'Absent';
//   }
//   /* payments recorded without choosing a project: split over the projects the
//      employee earned on, oldest earnings first, so "Paid to team" adds up */
//   var _unlinkedPaidCache = null;
//   function _unlinkedPaidByProject(DB) {
//     if (_unlinkedPaidCache && _unlinkedPaidCache.n === (DB.walletEntries || []).length) return _unlinkedPaidCache.map;
//     var delProj = {}; (DB.deliverables || []).forEach(function (d) { delProj[d.id] = d.projectId; });
//     var payoutIds = {}; (DB.walletEntries || []).forEach(function (w) { if (w.type === 'PAYOUT') payoutIds[w.id] = 1; });
//     var byEmp = {};
//     (DB.walletEntries || []).slice().sort(function (a, b) { return String(a.createdAt).localeCompare(String(b.createdAt)); }).forEach(function (w) {
//       if ((w.type === 'BONUS' && w.meta && w.meta.direct) || (w.meta && w.meta.cancels)) return;
//       var e = byEmp[w.employeeId] = byEmp[w.employeeId] || { earn: [], linkedPaid: {}, free: 0 };
//       var wp = w.projectId != null ? w.projectId : (w.deliverableId != null ? delProj[w.deliverableId] : null);
//       if (w.type === 'PAYOUT') { if (wp != null) e.linkedPaid[wp] = (e.linkedPaid[wp] || 0) - w.amountPaise; else e.free += -w.amountPaise; }
//       else if (w.meta && w.meta.reversalOf && payoutIds[w.meta.reversalOf]) { if (wp != null) e.linkedPaid[wp] = (e.linkedPaid[wp] || 0) - w.amountPaise; else e.free -= w.amountPaise; }
//       else if (wp != null && w.amountPaise > 0) e.earn.push([wp, w.amountPaise]);
//     });
//     var out = {};
//     Object.keys(byEmp).forEach(function (k) {
//       var e = byEmp[k], free = Math.max(0, e.free), owed = {};
//       e.earn.forEach(function (x) { owed[x[0]] = (owed[x[0]] || 0) + x[1]; });
//       Object.keys(owed).forEach(function (p) { owed[p] = Math.max(0, owed[p] - (e.linkedPaid[p] || 0)); });
//       e.earn.forEach(function (x) {
//         if (free <= 0) return;
//         var take = Math.min(free, owed[x[0]], x[1]);
//         if (take > 0) { out[x[0]] = (out[x[0]] || 0) + take; owed[x[0]] -= take; free -= take; }
//       });
//     });
//     _unlinkedPaidCache = { n: (DB.walletEntries || []).length, map: out };
//     return out;
//   }
//   function _projectMoney(pid, DB) {
//     var delProj = {};
//     (DB.deliverables || []).forEach(function (d) { delProj[d.id] = d.projectId; });
//     var spent = 0, paid = 0;
//     var payoutIds = {};
//     (DB.walletEntries || []).forEach(function (w) { if (w.type === 'PAYOUT') payoutIds[w.id] = 1; });
//     (DB.walletEntries || []).forEach(function (w) {
//       var wp = w.projectId != null ? w.projectId : (w.deliverableId != null ? delProj[w.deliverableId] : null);
//       if (wp !== pid) return;
//       if ((w.type === 'BONUS' && w.meta && w.meta.direct) || (w.meta && w.meta.cancels)) return;     // old payment-as-earnings lines cancel out
//       if (w.type === 'PAYOUT') paid += -w.amountPaise;
//       else if (w.meta && w.meta.reversalOf && payoutIds[w.meta.reversalOf]) paid -= w.amountPaise;   // payment undone
//       else spent += w.amountPaise;
//     });
//     paid += _unlinkedPaidByProject(DB)[pid] || 0;
//     return { spentPaise: Math.max(0, spent), paidPaise: Math.max(0, paid) };
//   }
//   var attToday = {};
//   DB.attendance.forEach(function (a) { if (a.date === today) attToday[a.employeeId] = a; });

//   var deptById = {};
//   DB.departments.forEach(function (d) { deptById[d.id] = d; });
//   var empById = {};
//   DB.employees.forEach(function (e) { empById[e.id] = e; });

//   STATE.company   = DB.company;
//   STATE.adminUser = DB.adminUser;
//   STATE.settings  = DB.settings;

//   /* ── employees ── */
//   STATE.employees = DB.employees.map(function (e) {
//     var att = attToday[e.id];
//     var openTasks = DB.deliverables.filter(function (d) {
//       return (d.assigneeIds || []).indexOf(e.id) >= 0 && d.status !== 'DONE';
//     }).length;
//     var scored = DataAPI.employeeScore(e.id);
//     return {
//       id: e.id, name: e.name, role: e.role,
//       dept: deptById[e.deptId] ? deptById[e.deptId].name : 'Unassigned',
//       deptId: e.deptId,
//       email: e.email, phone: e.phone,
//       /* today's real attendance only: no check-in today = Absent (or On Leave) */
//       status: _empTodayStatus(e.id, att, DB, today),
//       score: scored.score,
//       scoreDetail: scored,
//       tasks: openTasks,
//       joined: _fmtDay(e.joinedAt),
//       manager: empById[e.managerId] ? empById[e.managerId].name : '\u2014',
//       managerId: e.managerId,
//       avatar: e.avatarInitials, color: e.color || e.avatarBg,
//       accessLevel: e.accessLevel
//     };
//   });

//   /* ── departments ── */
//   STATE.departments = DB.departments.map(function (d) {
//     var members = DB.employees.filter(function (e) { return e.deptId === d.id; });
//     var memberIds = members.map(function (e) { return e.id; });
//     var activeTasks = DB.deliverables.filter(function (t) {
//       return t.status !== 'DONE' && (t.assigneeIds || []).some(function (a) { return memberIds.indexOf(a) >= 0; });
//     }).length;
//     var scores = members.map(function (e) {
//       var s = DataAPI.employeeScore(e.id);
//       return s.score;
//     });
//     return {
//       id: d.id, name: d.name,
//       head: empById[d.headId] ? empById[d.headId].name : '\u2014',
//       headId: d.headId,
//       desc: d.description, color: d.color,
//       activeTasks: activeTasks,
//       memberCount: members.length,
//       score: scores.length ? Math.round(scores.reduce(function (a, b) { return a + b; }, 0) / scores.length) : 0
//     };
//   });

//   var prevExpanded = {};
//   (STATE.projects || []).forEach(function (p) { prevExpanded[p.id] = p._expandedMs || []; });

//   STATE.projects = DB.projects.map(function (p) {
//     return {
//       id: p.id, name: p.name, code: p.code,
//       client: p.clientName, clientEmail: p.clientEmail, clientStateCode: p.clientStateCode,
//       clientPhone: p.clientPhone || '', clientGstin: p.clientGstin || '', clientAddress: p.clientAddress || '',
//       autoInvoiceOnCreate: !!p.autoInvoiceOnCreate, autoInvoiceOnComplete: p.autoInvoiceOnComplete !== false,
//       status: _ADMIN_PRJ_STATUS[p.status] || 'Planning',
//       priority: _ADMIN_PRIORITY[p.priority] || 'Medium',
//       progress: DataAPI.projectProgress(p.id),
//       dept: deptById[p.deptId] ? deptById[p.deptId].name : '\u2014',
//       deptId: p.deptId,
//       startDate: _fmtDay(p.startDate), deadline: p.deadline,
//       deadlineLabel: _fmtDay(p.deadline),
//       budget: Utils.paiseToRupees(p.budgetPaise),
//       /* total value of the project (what the client pays) — older projects fall back to budget */
//       value: Utils.paiseToRupees(p.contractValuePaise || p.budgetPaise || 0),
//       /* real money on this project, from the pay ledger:
//          spent  = what the team earned on it (task pay, milestone pay, direct payments)
//          paid   = what has actually been paid out against it */
//       spent: Utils.paiseToRupees(_projectMoney(p.id, DB).spentPaise),
//       /* money from the client: advance taken at the start + payments on invoices */
//       advance: Utils.paiseToRupees(p.advancePaidPaise || 0),
//       advanceDate: p.advanceDate || null, advanceMethod: p.advanceMethod || '', advanceRef: p.advanceRef || '',
//       receivedFromClient: Utils.paiseToRupees(Utils.clientReceivedPaise(p, DB.invoices)),
//       paidToTeam: Utils.paiseToRupees(_projectMoney(p.id, DB).paidPaise),
//       team: (p.memberIds || []).slice(), headId: p.headId,
//       desc: p.description,
//       milestones: DB.milestones
//         .filter(function (m) { return m.projectId === p.id; })
//         .sort(function (a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); })
//         .map(function (m) {
//           var prog = DataAPI.milestoneProgress(m.id);
//           return {
//             id: m.id, title: m.title,
//             date: _fmtDay(m.dueDate), dueDate: m.dueDate,
//             desc: m.description,
//             status: _ADMIN_MS_STATUS[m.status] || 'Upcoming',
//             billable: m.billable,
//             progress: prog
//           };
//         }),
//       _expandedMs: prevExpanded[p.id] || []
//     };
//   });

//   /* ── tasks (= deliverables, subtasks nested) ── */
//   STATE.tasks = DB.deliverables.map(function (d) {
//     var isRejected = d.status === 'REJECTED';
//     return {
//       id: d.id, projectId: d.projectId, milestoneId: d.milestoneId,
//       title: d.title, desc: d.description,
//       status: _ADMIN_TASK_STATUS[d.status] || 'In Progress',
//       canonicalStatus: d.status,
//       priority: _ADMIN_PRIORITY[d.priority] || 'Medium',
//       assignee: (d.assigneeIds || [])[0] || null,
//       assignees: (d.assigneeIds || []).slice(),
//       origin: d.origin,
//       deadline: d.dueAt ? Utils.isoDate(d.dueAt) : null,
//       hours: Math.round(Schema.TIME.secsToHours(d.estimateSecs) * 10) / 10,
//       loggedHours: Math.round(Schema.TIME.secsToHours(d.loggedSecs) * 10) / 10,
//       progress: DataAPI.deliverableProgress(d),
//       files: (d.briefFiles || []).slice(),
//       submissionFiles: (d.submissionFiles || []).slice(),
//       submissionNotes: d.submissionNotes,
//       rejectionReason: isRejected ? d.rejectionReason : null,
//       approvalState: d.approvalState,
//       /* piece-rate (shared/wallet.js) */
//       pricingMode: d.pricingMode || 'HOURLY',
//       pricePaise: d.pricePaise || 0,
//       price: Utils.paiseToRupees(d.pricePaise || 0),
//       agreement: d.agreement || { state: 'NONE' },
//       blocked: d.blocked || null,
//       blockedSecs: d.blockedSecs || 0,
//       settlement: d.settlement || null,
//       reworkCount: d.reworkCount || 0,
//       messages: (d.comments || []).map(function (c) {
//         return {
//           from: c.fromId,
//           fromName: empById[c.fromId] ? empById[c.fromId].name : (c.fromId === DB.adminUser.id ? DB.adminUser.name : 'Unknown'),
//           text: c.text,
//           time: _fmtTime(c.time) || c.time
//         };
//       }),
//       timeline: (d.timeline || []).map(function (t) {
//         return { type: t.type, text: t.text, time: /^\d{4}-/.test(String(t.time)) ? _fmtDay(t.time) : t.time };
//       }),
//       subtasks: DB.subtasks.filter(function (s) { return s.deliverableId === d.id; }).map(function (s) {
//         return {
//           id: s.id, title: s.title, desc: s.description,
//           createdBy: s.createdById,
//           createdByName: empById[s.createdById] ? empById[s.createdById].name : 'Admin',
//           assignee: s.assigneeId, assignees: [s.assigneeId],
//           status: _ADMIN_TASK_STATUS[s.status] || 'In Progress',
//           canonicalStatus: s.status,
//           priority: _ADMIN_PRIORITY[s.priority] || 'Medium',
//           timeSpent: Math.round(Schema.TIME.secsToHours(s.loggedSecs) * 10) / 10,
//           estimatedTime: Math.round(Schema.TIME.secsToHours(s.estimateSecs) * 10) / 10,
//           createdAt: s.createdAt ? Utils.isoDate(s.createdAt) : null,
//           completedAt: s.completedAt ? Utils.isoDate(s.completedAt) : null,
//           rejectionReason: s.status === 'REJECTED' ? s.rejectionReason : null,
//           approvalState: s.approvalState,
//           timeline: (s.timeline || []).map(function (t) {
//             return { type: t.type, text: t.text, time: /^\d{4}-/.test(String(t.time)) ? _fmtDay(t.time) : t.time };
//           })
//         };
//       })
//     };
//   });

//   /* ── invoices ── */
//   var projById = {};
//   DB.projects.forEach(function (p) { projById[p.id] = p; });
//   STATE.invoices = DB.invoices.map(function (i) {
//     var overdue = i.status !== 'PAID' && i.status !== 'CANCELLED' && i.status !== 'DRAFT' &&
//                   i.dueDate && i.dueDate < today;
//     return {
//       id: i.id, num: i.number,
//       projectId: i.projectId, milestoneId: i.milestoneId,
//       project: projById[i.projectId] ? projById[i.projectId].name : '\u2014',
//       client: i.clientName, clientEmail: i.clientEmail, clientGstin: i.clientGstin,
//       placeOfSupply: i.placeOfSupply,
//       amount: Utils.paiseToRupees(i.totalPaise),
//       subtotal: Utils.paiseToRupees(i.subtotalPaise),
//       cgst: Utils.paiseToRupees(i.cgstPaise),
//       sgst: Utils.paiseToRupees(i.sgstPaise),
//       igst: Utils.paiseToRupees(i.igstPaise),
//       paidAmount: Utils.paiseToRupees(i.paidPaise),
//       balance: Utils.paiseToRupees(i.totalPaise - i.paidPaise),
//       lines: (i.lines || []).slice(),
//       date: _fmtDay(i.issueDate), issueDate: i.issueDate,
//       due: _fmtDay(i.dueDate), dueDate: i.dueDate,
//       status: overdue ? 'Overdue' : (_ADMIN_INV_STATUS[i.status] || 'Draft'),
//       canonicalStatus: i.status,
//       notes: i.notes,
//       payments: (i.payments || []).map(function (p) {
//         return { id: p.id, amount: Utils.paiseToRupees(p.amountPaise), date: p.date, method: p.method, reference: p.reference, note: p.note };
//       }),
//       /* history shown in the invoice: created → sent → payments → paid / cancelled */
//       timeline: [
//         i.issueDate ? { at: i.issueDate, text: 'Invoice created', tone: 'grey' } : null,
//         i.sentAt ? { at: i.sentAt.slice(0, 10), text: 'Sent to ' + (i.clientEmail || i.clientName), tone: 'blue' } : null,
//         i.lastSentAt && i.lastSentAt !== i.sentAt ? { at: i.lastSentAt.slice(0, 10), text: 'Sent again (reminder)', tone: 'blue' } : null
//       ].concat((i.payments || []).map(function (p) {
//         return { at: p.date, text: Utils.fmtRupee(p.amountPaise).replace('.00', '') + ' received' + (p.method ? ' via ' + p.method : '') + (p.reference ? ' (ref ' + p.reference + ')' : ''), tone: 'green' };
//       })).concat([
//         i.cancelledAt ? { at: i.cancelledAt.slice(0, 10), text: 'Cancelled', tone: 'red' } : null
//       ]).filter(Boolean).map(function (t) { return { text: t.text, time: _fmtDay(t.at), tone: t.tone }; })
//     };
//   });

//   /* ── messages ── */
//   STATE.messages = DB.conversations.map(function (c) {
//     var withEmp = empById[c.withId] || { name: 'Unknown', avatarInitials: '??', color: '#9B9899' };
//     var last = c.msgs[c.msgs.length - 1];
//     return {
//       id: c.id, withId: c.withId,
//       name: withEmp.name, avatar: withEmp.avatarInitials, color: withEmp.color || withEmp.avatarBg,
//       isOnline: withEmp.attendanceStatus === 'PRESENT',
//       unread: c.unread || 0,
//       preview: last ? last.text : '',
//       lastAt: last ? last.at : '',
//       time: last ? _fmtTime(last.at) : '',
//       msgs: c.msgs.map(function (m) {
//         return { text: m.text, sent: m.fromId === DB.adminUser.id, time: _fmtTime(m.at) };
//       })
//     };
//   });
//   /* newest conversation first (Messages list + dashboard preview) */
//   STATE.messages.sort(function (a, b) { return String(b.lastAt).localeCompare(String(a.lastAt)); });
//   if (typeof updateMsgBadge === 'function') updateMsgBadge();

//   /* ── notifications (admin ke) ── */
//   STATE.notifications = DB.notifications
//     .filter(function (n) { return n.recipientId === DB.adminUser.id; })
//     .map(function (n) {
//       return { id: n.id, text: n.title, sub: n.body, read: n.read, kind: n.kind,
//                entityType: n.entityType, entityId: n.entityId, time: _relTime(n.createdAt) };
//     });

//   /* ── activity ── */
//   STATE.activityFeed = DB.activity.map(function (a) {
//     return { icon: a.icon, color: a.color, text: a.text, time: _relTime(a.at) };
//   });

//   /* ── calendar ── */
//   STATE.calendarEvents = DB.calendarEvents.slice();

//   STATE.notices = DB.notices.map(function (n) {
//     return {
//       id: n.id, title: n.title, content: n.content,
//       date: _fmtDay(n.date), rawDate: n.date,
//       recipients: n.recipients, priority: n.priority, status: n.status,
//       readBy: (n.readBy || []).map(function (id) { return empById[id] ? empById[id].name : 'Unknown'; }),
//       notReadBy: (n.notReadBy || []).map(function (id) { return empById[id] ? empById[id].name : 'Unknown'; }),
//       readByIds: (n.readBy || []).slice(), notReadByIds: (n.notReadBy || []).slice(),
//       attachments: (n.attachments || []).slice()
//     };
//   });
//   if (STATE.currentNotice == null && STATE.notices.length) STATE.currentNotice = STATE.notices[0].id;

//   /* ── call logs ── */
//   STATE.callLogs = DB.callLogs.map(function (c) {
//     return {
//       id: c.id, name: c.name, number: c.number,
//       duration: _durLabel(c.durationSecs),
//       type: c.type, date: _fmtDay(c.at) + ', ' + _fmtTime(c.at),
//       status: c.status
//     };
//   });
// }

// function refresh(renderFn) {
//   syncState();
//   if (typeof renderFn === 'function') renderFn();
// }


var STATE = {
  currentModule: 'dashboard',
  currentProject: null,
  currentConversation: null,
  currentEmployee: null,
  empStatusFilter: '',
  invoiceFilter: 'All',
  moduleHistory: [],
  noticeDetailOpen: false,
  calMonth: new Date().getMonth(),
  calYear: new Date().getFullYear(),
  currentNotice: null,
  noticeFilter: 'All',
  settingsTab: 'company',
  phoneInput: '',
  eenChats: [],

  company: {}, adminUser: {},
  employees: [], departments: [], projects: [], tasks: [],
  invoices: [], messages: [], notifications: [],
  activityFeed: [], calendarEvents: [], notices: [], callLogs: [],
  settings: {}
};

/* ── Display mappers: canonical -> admin ke purane strings ─────────────── */
var _ADMIN_TASK_STATUS = {
  TODO: 'Not Started', IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review', REJECTED: 'In Progress', DONE: 'Done'
};
var _ADMIN_MS_STATUS  = { UPCOMING: 'Upcoming', IN_PROGRESS: 'In Progress', DONE: 'Done' };
var _ADMIN_PRJ_STATUS = { PLANNING: 'Planning', ACTIVE: 'Active', ON_HOLD: 'On Hold', COMPLETED: 'Completed' };
var _ADMIN_PRIORITY   = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High' };
var _ADMIN_ATTENDANCE = { PRESENT: 'Present', HALF_DAY: 'Half Day', ABSENT: 'Absent', ON_LEAVE: 'On Leave' };
var _ADMIN_INV_STATUS = { DRAFT: 'Draft', SENT: 'Sent', PARTIALLY_PAID: 'Partially Paid', PAID: 'Paid', OVERDUE: 'Overdue', CANCELLED: 'Cancelled' };
var _ADMIN_LEAD_STAGE = { NEW: 'New', CONTACTED: 'Contacted', PROPOSAL_SENT: 'Proposal Sent', NEGOTIATION: 'Negotiation', WON: 'Won', LOST: 'Lost' };

function _toCanonicalTaskStatus(s) {
  var map = { 'Not Started': 'TODO', 'In Progress': 'IN_PROGRESS', 'In Review': 'IN_REVIEW', 'Done': 'DONE', 'Rejected': 'REJECTED' };
  return map[s] || Schema.normStatus(s);
}
function _toCanonicalPriority(p) { return Schema.normPriority(p); }

/* ── Formatters ───────────────────────────────────────────────────────── */
function _fmtDay(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  if (isNaN(d)) return String(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function _fmtTime(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  if (isNaN(d)) return String(iso);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}
function _relTime(iso) {
  if (!iso) return '';
  var diff = Date.now() - new Date(iso).getTime();
  var mins = Math.round(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return mins + ' min ago';
  var hrs = Math.round(mins / 60);
  if (hrs < 24) return hrs + (hrs === 1 ? ' hour ago' : ' hours ago');
  var days = Math.round(hrs / 24);
  if (days < 30) return days + (days === 1 ? ' day ago' : ' days ago');
  return _fmtDay(iso);
}
function _durLabel(secs) {
  if (!secs) return '\u2014';
  var m = Math.floor(secs / 60), s = secs % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

/* ── Main projection ──────────────────────────────────────────────────── */
function syncState() {
  var DB = DataAPI.raw();
  if (!DB) return;

  var today = Utils.isoDate(new Date());
  function _empTodayStatus(empId, att, DB, today) {
    var onLeave = (DB.leaveRequests || []).some(function (r) {
      return r.employeeId === empId && r.status === 'APPROVED' &&
        (((r.dates || []).indexOf(today) >= 0) || (r.fromDate <= today && r.toDate >= today));
    });
    /* checked in today = working, even if a leave was approved for today */
    if (att && att.firstInAt) return att.status === 'HALF_DAY' ? (_ADMIN_ATTENDANCE.HALF_DAY || 'Half Day') : 'Present';
    if (onLeave || (att && att.status === 'ON_LEAVE')) return 'On Leave';
    return 'Absent';
  }
  /* payments recorded without choosing a project: split over the projects the
     employee earned on, oldest earnings first, so "Paid to team" adds up */
  var _unlinkedPaidCache = null;
  function _unlinkedPaidByProject(DB) {
    if (_unlinkedPaidCache && _unlinkedPaidCache.n === (DB.walletEntries || []).length) return _unlinkedPaidCache.map;
    var delProj = {}; (DB.deliverables || []).forEach(function (d) { delProj[d.id] = d.projectId; });
    var payoutIds = {}; (DB.walletEntries || []).forEach(function (w) { if (w.type === 'PAYOUT') payoutIds[w.id] = 1; });
    var byEmp = {};
    (DB.walletEntries || []).slice().sort(function (a, b) { return String(a.createdAt).localeCompare(String(b.createdAt)); }).forEach(function (w) {
      if ((w.type === 'BONUS' && w.meta && w.meta.direct) || (w.meta && w.meta.cancels)) return;
      var e = byEmp[w.employeeId] = byEmp[w.employeeId] || { earn: [], linkedPaid: {}, free: 0 };
      var wp = w.projectId != null ? w.projectId : (w.deliverableId != null ? delProj[w.deliverableId] : null);
      if (w.type === 'PAYOUT') { if (wp != null) e.linkedPaid[wp] = (e.linkedPaid[wp] || 0) - w.amountPaise; else e.free += -w.amountPaise; }
      else if (w.meta && w.meta.reversalOf && payoutIds[w.meta.reversalOf]) { if (wp != null) e.linkedPaid[wp] = (e.linkedPaid[wp] || 0) - w.amountPaise; else e.free -= w.amountPaise; }
      else if (wp != null && w.amountPaise > 0) e.earn.push([wp, w.amountPaise]);
    });
    var out = {};
    Object.keys(byEmp).forEach(function (k) {
      var e = byEmp[k], free = Math.max(0, e.free), owed = {};
      e.earn.forEach(function (x) { owed[x[0]] = (owed[x[0]] || 0) + x[1]; });
      Object.keys(owed).forEach(function (p) { owed[p] = Math.max(0, owed[p] - (e.linkedPaid[p] || 0)); });
      e.earn.forEach(function (x) {
        if (free <= 0) return;
        var take = Math.min(free, owed[x[0]], x[1]);
        if (take > 0) { out[x[0]] = (out[x[0]] || 0) + take; owed[x[0]] -= take; free -= take; }
      });
    });
    _unlinkedPaidCache = { n: (DB.walletEntries || []).length, map: out };
    return out;
  }
  function _projectMoney(pid, DB) {
    var delProj = {};
    (DB.deliverables || []).forEach(function (d) { delProj[d.id] = d.projectId; });
    var spent = 0, paid = 0;
    var payoutIds = {};
    (DB.walletEntries || []).forEach(function (w) { if (w.type === 'PAYOUT') payoutIds[w.id] = 1; });
    (DB.walletEntries || []).forEach(function (w) {
      var wp = w.projectId != null ? w.projectId : (w.deliverableId != null ? delProj[w.deliverableId] : null);
      if (wp !== pid) return;
      if ((w.type === 'BONUS' && w.meta && w.meta.direct) || (w.meta && w.meta.cancels)) return;     // old payment-as-earnings lines cancel out
      if (w.type === 'PAYOUT') paid += -w.amountPaise;
      else if (w.meta && w.meta.reversalOf && payoutIds[w.meta.reversalOf]) paid -= w.amountPaise;   // payment undone
      else spent += w.amountPaise;
    });
    paid += _unlinkedPaidByProject(DB)[pid] || 0;
    return { spentPaise: Math.max(0, spent), paidPaise: Math.max(0, paid) };
  }
  var attToday = {};
  DB.attendance.forEach(function (a) { if (a.date === today) attToday[a.employeeId] = a; });

  var deptById = {};
  DB.departments.forEach(function (d) { deptById[d.id] = d; });
  var empById = {};
  DB.employees.forEach(function (e) { empById[e.id] = e; });

  STATE.company   = DB.company;
  STATE.adminUser = DB.adminUser;
  STATE.settings  = DB.settings;

  /* ── employees ── */
  STATE.employees = DB.employees.map(function (e) {
    var att = attToday[e.id];
    var openTasks = DB.deliverables.filter(function (d) {
      return (d.assigneeIds || []).indexOf(e.id) >= 0 && d.status !== 'DONE';
    }).length;
    var scored = DataAPI.employeeScore(e.id);
    return {
      id: e.id, name: e.name, role: e.role,
      dept: deptById[e.deptId] ? deptById[e.deptId].name : 'Unassigned',
      deptId: e.deptId,
      email: e.email, phone: e.phone,
      /* today's real attendance only: no check-in today = Absent (or On Leave) */
      status: _empTodayStatus(e.id, att, DB, today),
      score: scored.score,
      scoreDetail: scored,
      tasks: openTasks,
      joined: _fmtDay(e.joinedAt),
      manager: empById[e.managerId] ? empById[e.managerId].name : '\u2014',
      managerId: e.managerId,
      avatar: e.avatarInitials, color: e.color || e.avatarBg,
      accessLevel: e.accessLevel
    };
  });

  /* ── departments ── */
  STATE.departments = DB.departments.map(function (d) {
    var members = DB.employees.filter(function (e) { return e.deptId === d.id; });
    var memberIds = members.map(function (e) { return e.id; });
    var activeTasks = DB.deliverables.filter(function (t) {
      return t.status !== 'DONE' && (t.assigneeIds || []).some(function (a) { return memberIds.indexOf(a) >= 0; });
    }).length;
    var scores = members.map(function (e) {
      var s = DataAPI.employeeScore(e.id);
      return s.score;
    });
    return {
      id: d.id, name: d.name,
      head: empById[d.headId] ? empById[d.headId].name : '\u2014',
      headId: d.headId,
      desc: d.description, color: d.color,
      activeTasks: activeTasks,
      memberCount: members.length,
      score: scores.length ? Math.round(scores.reduce(function (a, b) { return a + b; }, 0) / scores.length) : 0
    };
  });

  var prevExpanded = {};
  (STATE.projects || []).forEach(function (p) { prevExpanded[p.id] = p._expandedMs || []; });

  STATE.projects = DB.projects.map(function (p) {
    return {
      id: p.id, name: p.name, code: p.code,
      client: p.clientName, clientEmail: p.clientEmail, clientStateCode: p.clientStateCode,
      clientPhone: p.clientPhone || '', clientGstin: p.clientGstin || '', clientAddress: p.clientAddress || '',
      autoInvoiceOnCreate: !!p.autoInvoiceOnCreate, autoInvoiceOnComplete: p.autoInvoiceOnComplete !== false,
      status: _ADMIN_PRJ_STATUS[p.status] || 'Planning',
      priority: _ADMIN_PRIORITY[p.priority] || 'Medium',
      progress: DataAPI.projectProgress(p.id),
      dept: deptById[p.deptId] ? deptById[p.deptId].name : '\u2014',
      deptId: p.deptId,
      startDate: _fmtDay(p.startDate), deadline: p.deadline,
      deadlineLabel: _fmtDay(p.deadline),
      budget: Utils.paiseToRupees(p.budgetPaise),
      /* total value of the project (what the client pays) — older projects fall back to budget */
      value: Utils.paiseToRupees(p.contractValuePaise || p.budgetPaise || 0),
      /* real money on this project, from the pay ledger:
         spent  = what the team earned on it (task pay, milestone pay, direct payments)
         paid   = what has actually been paid out against it */
      spent: Utils.paiseToRupees(_projectMoney(p.id, DB).spentPaise),
      /* money from the client: advance taken at the start + payments on invoices */
      advance: Utils.paiseToRupees(p.advancePaidPaise || 0),
      advanceDate: p.advanceDate || null, advanceMethod: p.advanceMethod || '', advanceRef: p.advanceRef || '',
      receivedFromClient: Utils.paiseToRupees(Utils.clientReceivedPaise(p, DB.invoices)),
      paidToTeam: Utils.paiseToRupees(_projectMoney(p.id, DB).paidPaise),
      team: (p.memberIds || []).slice(), headId: p.headId,
      desc: p.description,
      milestones: DB.milestones
        .filter(function (m) { return m.projectId === p.id; })
        .sort(function (a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); })
        .map(function (m) {
          var prog = DataAPI.milestoneProgress(m.id);
          return {
            id: m.id, title: m.title,
            date: _fmtDay(m.dueDate), dueDate: m.dueDate,
            desc: m.description,
            status: _ADMIN_MS_STATUS[m.status] || 'Upcoming',
            billable: m.billable,
            progress: prog
          };
        }),
      _expandedMs: prevExpanded[p.id] || []
    };
  });

  /* ── tasks (= deliverables, subtasks nested) ── */
  STATE.tasks = DB.deliverables.map(function (d) {
    var isRejected = d.status === 'REJECTED';
    return {
      id: d.id, projectId: d.projectId, milestoneId: d.milestoneId,
      title: d.title, desc: d.description,
      status: _ADMIN_TASK_STATUS[d.status] || 'In Progress',
      canonicalStatus: d.status,
      priority: _ADMIN_PRIORITY[d.priority] || 'Medium',
      assignee: (d.assigneeIds || [])[0] || null,
      assignees: (d.assigneeIds || []).slice(),
      origin: d.origin,
      deadline: d.dueAt ? Utils.isoDate(d.dueAt) : null,
      hours: Math.round(Schema.TIME.secsToHours(d.estimateSecs) * 10) / 10,
      loggedHours: Math.round(Schema.TIME.secsToHours(d.loggedSecs) * 10) / 10,
      progress: DataAPI.deliverableProgress(d),
      files: (d.briefFiles || []).slice(),
      submissionFiles: (d.submissionFiles || []).slice(),
      submissionNotes: d.submissionNotes,
      rejectionReason: isRejected ? d.rejectionReason : null,
      approvalState: d.approvalState,
      /* piece-rate (shared/wallet.js) */
      pricingMode: d.pricingMode || 'HOURLY',
      pricePaise: d.pricePaise || 0,
      price: Utils.paiseToRupees(d.pricePaise || 0),
      agreement: d.agreement || { state: 'NONE' },
      blocked: d.blocked || null,
      blockedSecs: d.blockedSecs || 0,
      settlement: d.settlement || null,
      reworkCount: d.reworkCount || 0,
      messages: (d.comments || []).map(function (c) {
        return {
          from: c.fromId,
          fromName: empById[c.fromId] ? empById[c.fromId].name : (c.fromId === DB.adminUser.id ? DB.adminUser.name : 'Unknown'),
          text: c.text,
          time: _fmtTime(c.time) || c.time
        };
      }),
      timeline: (d.timeline || []).map(function (t) {
        return { type: t.type, text: t.text, time: /^\d{4}-/.test(String(t.time)) ? _fmtDay(t.time) : t.time };
      }),
      subtasks: DB.subtasks.filter(function (s) { return s.deliverableId === d.id; }).map(function (s) {
        return {
          id: s.id, title: s.title, desc: s.description,
          createdBy: s.createdById,
          createdByName: empById[s.createdById] ? empById[s.createdById].name : 'Admin',
          assignee: s.assigneeId, assignees: [s.assigneeId],
          status: _ADMIN_TASK_STATUS[s.status] || 'In Progress',
          canonicalStatus: s.status,
          priority: _ADMIN_PRIORITY[s.priority] || 'Medium',
          timeSpent: Math.round(Schema.TIME.secsToHours(s.loggedSecs) * 10) / 10,
          estimatedTime: Math.round(Schema.TIME.secsToHours(s.estimateSecs) * 10) / 10,
          createdAt: s.createdAt ? Utils.isoDate(s.createdAt) : null,
          completedAt: s.completedAt ? Utils.isoDate(s.completedAt) : null,
          rejectionReason: s.status === 'REJECTED' ? s.rejectionReason : null,
          approvalState: s.approvalState,
          submissionNotes: s.submissionNotes || '',
          submissionFiles: s.submissionFiles || [],
          timeline: (s.timeline || []).map(function (t) {
            return { type: t.type, text: t.text, time: /^\d{4}-/.test(String(t.time)) ? _fmtDay(t.time) : t.time };
          })
        };
      })
    };
  });

  /* ── invoices ── */
  var projById = {};
  DB.projects.forEach(function (p) { projById[p.id] = p; });
  STATE.invoices = DB.invoices.map(function (i) {
    var overdue = i.status !== 'PAID' && i.status !== 'CANCELLED' && i.status !== 'DRAFT' &&
                  i.dueDate && i.dueDate < today;
    return {
      id: i.id, num: i.number,
      projectId: i.projectId, milestoneId: i.milestoneId,
      project: projById[i.projectId] ? projById[i.projectId].name : '\u2014',
      client: i.clientName, clientEmail: i.clientEmail, clientGstin: i.clientGstin,
      placeOfSupply: i.placeOfSupply,
      amount: Utils.paiseToRupees(i.totalPaise),
      subtotal: Utils.paiseToRupees(i.subtotalPaise),
      cgst: Utils.paiseToRupees(i.cgstPaise),
      sgst: Utils.paiseToRupees(i.sgstPaise),
      igst: Utils.paiseToRupees(i.igstPaise),
      paidAmount: Utils.paiseToRupees(i.paidPaise),
      balance: Utils.paiseToRupees(i.totalPaise - i.paidPaise),
      lines: (i.lines || []).slice(),
      date: _fmtDay(i.issueDate), issueDate: i.issueDate,
      due: _fmtDay(i.dueDate), dueDate: i.dueDate,
      status: overdue ? 'Overdue' : (_ADMIN_INV_STATUS[i.status] || 'Draft'),
      canonicalStatus: i.status,
      notes: i.notes,
      payments: (i.payments || []).map(function (p) {
        return { id: p.id, amount: Utils.paiseToRupees(p.amountPaise), date: p.date, method: p.method, reference: p.reference, note: p.note };
      }),
      /* history shown in the invoice: created → sent → payments → paid / cancelled */
      timeline: [
        i.issueDate ? { at: i.issueDate, text: 'Invoice created', tone: 'grey' } : null,
        i.sentAt ? { at: i.sentAt.slice(0, 10), text: 'Sent to ' + (i.clientEmail || i.clientName), tone: 'blue' } : null,
        i.lastSentAt && i.lastSentAt !== i.sentAt ? { at: i.lastSentAt.slice(0, 10), text: 'Sent again (reminder)', tone: 'blue' } : null
      ].concat((i.payments || []).map(function (p) {
        return { at: p.date, text: Utils.fmtRupee(p.amountPaise).replace('.00', '') + ' received' + (p.method ? ' via ' + p.method : '') + (p.reference ? ' (ref ' + p.reference + ')' : ''), tone: 'green' };
      })).concat([
        i.cancelledAt ? { at: i.cancelledAt.slice(0, 10), text: 'Cancelled', tone: 'red' } : null
      ]).filter(Boolean).map(function (t) { return { text: t.text, time: _fmtDay(t.at), tone: t.tone }; })
    };
  });

  /* ── messages ── */
  STATE.messages = DB.conversations.filter(function (c) { return c.kind !== 'PEER'; }).map(function (c) {
    var withEmp = empById[c.withId] || { name: 'Unknown', avatarInitials: '??', color: '#9B9899' };
    var last = c.msgs[c.msgs.length - 1];
    return {
      id: c.id, withId: c.withId,
      name: withEmp.name, avatar: withEmp.avatarInitials, color: withEmp.color || withEmp.avatarBg,
      isOnline: withEmp.attendanceStatus === 'PRESENT',
      unread: c.unread || 0,
      preview: last ? last.text : '',
      lastAt: last ? last.at : '',
      time: last ? _fmtTime(last.at) : '',
      msgs: c.msgs.map(function (m) {
        return { text: m.text, sent: m.fromId === DB.adminUser.id, time: _fmtTime(m.at) };
      })
    };
  });
  /* newest conversation first (Messages list + dashboard preview) */
  STATE.messages.sort(function (a, b) { return String(b.lastAt).localeCompare(String(a.lastAt)); });
  if (typeof updateMsgBadge === 'function') updateMsgBadge();

  /* ── notifications (admin ke) ── */
  STATE.notifications = DB.notifications
    .filter(function (n) { return n.recipientId === DB.adminUser.id; })
    .map(function (n) {
      return { id: n.id, text: n.title, sub: n.body, read: n.read, kind: n.kind,
               entityType: n.entityType, entityId: n.entityId, time: _relTime(n.createdAt) };
    });

  /* ── activity ── */
  STATE.activityFeed = DB.activity.map(function (a) {
    return { icon: a.icon, color: a.color, text: a.text, time: _relTime(a.at) };
  });

  /* ── calendar ── */
  STATE.calendarEvents = DB.calendarEvents.slice();

  STATE.notices = DB.notices.map(function (n) {
    return {
      id: n.id, title: n.title, content: n.content,
      date: _fmtDay(n.date), rawDate: n.date,
      recipients: n.recipients, priority: n.priority, status: n.status,
      readBy: (n.readBy || []).map(function (id) { return empById[id] ? empById[id].name : 'Unknown'; }),
      notReadBy: (n.notReadBy || []).map(function (id) { return empById[id] ? empById[id].name : 'Unknown'; }),
      readByIds: (n.readBy || []).slice(), notReadByIds: (n.notReadBy || []).slice(),
      attachments: (n.attachments || []).slice()
    };
  });
  if (STATE.currentNotice == null && STATE.notices.length) STATE.currentNotice = STATE.notices[0].id;

  /* ── call logs ── */
  STATE.callLogs = DB.callLogs.map(function (c) {
    return {
      id: c.id, name: c.name, number: c.number,
      duration: _durLabel(c.durationSecs),
      type: c.type, date: _fmtDay(c.at) + ', ' + _fmtTime(c.at),
      status: c.status
    };
  });
}

function refresh(renderFn) {
  syncState();
  if (typeof renderFn === 'function') renderFn();
}