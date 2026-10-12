
/* ── Runtime / UI state ───────────────────────────────────────────────── */
var CU = null;                        // current user
var ws = false, wsAt = null;          // work session
var tsecs = 0, trun = false, tiv = null, wiv = null;
var onBrk = false, brkAt = null, brkType = null, lastAct = Date.now();
var pv = 'dashboard', cv = 'dashboard', trF = 'all', trQ = '';
var projTab = 'overview', dlgCb = null, _bType = 'Lunch';
var _saPri = 'medium';

var SW = new Utils.Stopwatch();

/* ── Projections ──────────────────────────────────────────────────────── */
var USERS = [];        // login picker
var TASKS = [];        // is user ke deliverables
var SUBTASKS = [];     // approved / reviewable tasks inside deliverables
var PROJECTS = [];     // is user ke projects (milestone > deliverable nested)
var ATT_LOG = [];      // is user ki attendance
var NOTIFS = [];       // is user ki notifications
var COMPANY = {};

/* ── Display mappers ──────────────────────────────────────────────────── */
var _EMP_STATUS = {
  TODO: 'todo', IN_PROGRESS: 'inprogress', IN_REVIEW: 'submitted',
  REJECTED: 'rejected', DONE: 'approved'
};
var _EMP_PRIORITY = { LOW: 'low', MEDIUM: 'medium', HIGH: 'high' };
var _EMP_ATT = { PRESENT: 'Present', HALF_DAY: 'Half Day', ABSENT: 'Absent', ON_LEAVE: 'On Leave' };
var _EMP_MS_STATUS = { UPCOMING: 'Upcoming', IN_PROGRESS: 'In Progress', DONE: 'Done' };
var _EMP_DEL_STATUS = { TODO: 'To Do', IN_PROGRESS: 'In Progress', IN_REVIEW: 'In Review', REJECTED: 'Rejected', DONE: 'Done' };

function _toCanonical(s) {
  var map = { todo: 'TODO', inprogress: 'IN_PROGRESS', submitted: 'IN_REVIEW', rejected: 'REJECTED', approved: 'DONE' };
  return map[s] || Schema.normStatus(s);
}

function _timeLabel(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  if (isNaN(d)) return String(iso);
  var today = Utils.isoDate(new Date());
  if (Utils.isoDate(d) === today) return 'Today, ' + d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ', ' +
         d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}
function _relLabel(iso) {
  if (!iso) return '';
  var mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return mins + ' min ago';
  var h = Math.round(mins / 60);
  if (h < 24) return h + (h === 1 ? ' hour ago' : ' hours ago');
  var d = Math.round(h / 24);
  return d + (d === 1 ? ' day ago' : ' days ago');
}

/* ── Login roster ─────────────────────────────────────────────────────── */
function syncUsers() {
  var DB = DataAPI.raw();
  COMPANY = DB.company;
  USERS = DB.employees.filter(function (e) { return e.canLogin !== false && e.active !== false; })
    .map(function (e) {
      var dept = DB.departments.find(function (d) { return d.id === e.deptId; });
      return {
        id: e.id, name: e.name, role: e.role,
        dept: dept ? dept.name : 'Unassigned',
        email: e.email,
        ini: e.avatarInitials, initials: e.avatarInitials,
        avBg: e.avatarBg, avFg: e.avatarFg
      };
    });
}

/* ── Per-user projection ──────────────────────────────────────────────── */
function syncUserState() {
  if (!CU) return;
  var DB = DataAPI.raw();
  var uid = CU.id;

  var empById = {};
  DB.employees.forEach(function (e) { empById[e.id] = e; });
  var projById = {};
  DB.projects.forEach(function (p) { projById[p.id] = p; });
  var msById = {};
  DB.milestones.forEach(function (m) { msById[m.id] = m; });

  var mine = DB.deliverables.filter(function (d) {
    return (d.assigneeIds || []).indexOf(uid) >= 0;
  });

  TASKS = mine.map(function (d) {
    var creator = empById[d.createdById] ||
      (d.createdById === DB.adminUser.id ? DB.adminUser : null) ||
      { name: 'Admin', avatarInitials: 'AD', avatarBg: '#18171A', avatarFg: '#fff' };
    var proj = projById[d.projectId];
    var ms = d.milestoneId ? msById[d.milestoneId] : null;

    return {
      id: d.id,
      title: d.title,
      desc: d.description,
      priority: _EMP_PRIORITY[d.priority] || 'medium',
      status: _EMP_STATUS[d.status] || 'todo',
      canonicalStatus: d.status,
      dms: d.dueAt ? new Date(d.dueAt).getTime() : null,
      dlabel: d.dueAt ? _timeLabel(d.dueAt) : 'No deadline',
      deadlineLabel: d.dueAt ? _timeLabel(d.dueAt) : 'No deadline',
      by: creator.name,
      byIni: creator.avatarInitials || Schema.initialsOf(creator.name),
      byBg: creator.avatarBg || '#18171A',
      byFg: creator.avatarFg || '#ffffff',
      assignedDate: d.createdAt ? Utils.isoDate(d.createdAt) : '',
      exp: d.estimateSecs || 0,
      logged: d.loggedSecs || 0,
      active: false,                                   
      self: d.origin === 'SELF',
      saStatus: d.approvalState ? d.approvalState.toLowerCase() : null,
      saRejReason: d.status === 'REJECTED' ? d.rejectionReason : null,
      proj: proj ? proj.name : null,
      projId: d.projectId,
      ms: ms ? ms.title : null,
      msId: d.milestoneId,
      deliverableId: d.id,
      files: (d.briefFiles || []).slice(),
      subFiles: (d.submissionFiles || []).slice(),
      subNotes: d.submissionNotes || '',
      msgs: (d.comments || []).map(function (c) {
        var f = empById[c.fromId] || (c.fromId === DB.adminUser.id ? DB.adminUser : null) ||
                { name: 'Unknown', avatarInitials: '??', avatarBg: '#E8E5DF', avatarFg: '#333' };
        return {
          from: f.name,
          ini: f.avatarInitials, initials: f.avatarInitials,
          bg: f.avatarBg, fg: f.avatarFg, fc: f.avatarFg,
          time: _timeLabel(c.time) || c.time,
          text: c.text
        };
      }),
      tl: (d.timeline || []).map(function (t) {
        return { type: t.type, text: t.text, time: /^\d{4}-/.test(String(t.time)) ? _timeLabel(t.time) : t.time };
      }),
      rejReason: d.status === 'REJECTED' ? d.rejectionReason : null,
      /* ── piece-rate (shared/wallet.js) ── */
      pricingMode: d.pricingMode || 'HOURLY',
      isPiece: d.pricingMode === 'PIECE',
      pricePaise: d.pricePaise || 0,
      myPricePaise: d.pricingMode === 'PIECE' ? _myShare(d, uid) : 0,
      slab: d.slab || null,
      agreement: d.agreement || { state: 'NONE' },
      blocked: d.blocked || null,
      blockedSecs: d.blockedSecs || 0,
      settlement: d.settlement || null,
      reworkCount: d.reworkCount || 0,
      subtasks: DB.subtasks.filter(function (s) { return s.deliverableId === d.id; }).map(function (s) {
        return {
          id: s.id, title: s.title, desc: s.description,
          done: s.status === 'DONE',
          status: _EMP_STATUS[s.status] || 'todo',
          canonicalStatus: s.status,
          priority: _EMP_PRIORITY[s.priority] || 'medium',
          estimateSecs: s.estimateSecs, loggedSecs: s.loggedSecs,
          adminStatus: s.approvalState ? s.approvalState.toLowerCase() : null,
          origin: s.origin || (s.createdById === s.assigneeId ? 'SELF' : 'ADMIN'),
          adminNote: s.rejectionReason || null
        };
      }),
      createdAt: d.createdAt
    };
  });

  TASKS.sort(function (a, b) {
    var rank = { rejected: 0, inprogress: 1, todo: 2, submitted: 3, approved: 4 };
    var ra = rank[a.status], rb = rank[b.status];
    if (ra !== rb) return ra - rb;
    return (a.dms || Infinity) - (b.dms || Infinity);
  });

  /* Subtasks are real work items too. Keep them separate from the parent
     deliverables so dashboard totals stay correct, but make them available
     to Task Tracker and the task-detail/timer flow. */
  SUBTASKS = (DB.subtasks || [])
    .filter(function (s) { return Number(s.assigneeId) === Number(uid); })
    .map(function (s) {
      var d = DB.deliverables.find(function (x) { return Number(x.id) === Number(s.deliverableId); });
      var proj = d ? projById[d.projectId] : null;
      var ms = d ? msById[d.milestoneId] : null;
      var readyApproved = String(s.approvalState || '').toUpperCase() === 'APPROVED';
      /* Old records from the previous approval implementation were stored as
         DONE immediately. If they have no real logged time, treat them as
         approved-and-ready rather than falsely completed. */
      var canonical = String(s.status || '').toUpperCase();
      if (readyApproved && canonical === 'DONE' && !(s.loggedSecs > 0)) canonical = 'TODO';
      return {
        id: s.id, isSubtask: true, parentId: d ? d.id : s.deliverableId,
        title: s.title, desc: s.description || '',
        priority: _EMP_PRIORITY[s.priority] || 'medium',
        status: _EMP_STATUS[canonical] || 'todo', canonicalStatus: canonical,
        dms: d && d.dueAt ? new Date(d.dueAt).getTime() : null,
        dlabel: d && d.dueAt ? _timeLabel(d.dueAt) : 'No deadline',
        deadlineLabel: d && d.dueAt ? _timeLabel(d.dueAt) : 'No deadline',
        by: 'Task under ' + (d ? d.title : 'deliverable'),
        proj: proj ? proj.name : null, projId: d ? d.projectId : null,
        ms: ms ? ms.title : null, msId: d ? d.milestoneId : null,
        deliverableId: d ? d.id : s.deliverableId,
        parentTitle: d ? d.title : 'Deliverable',
        exp: s.estimateSecs || 0, logged: s.loggedSecs || 0, active: false,
        self: Number(s.createdById) === Number(s.assigneeId),
        saStatus: s.approvalState ? String(s.approvalState).toLowerCase() : null,
        saRejReason: s.rejectionReason || null,
        rejReason: s.rejectionReason || null,
        subtasks: [], files: [], subFiles: [], subNotes: '', msgs: [],
        tl: (s.timeline || []).map(function (t) { return { type:t.type, text:t.text, time:/^\d{4}-/.test(String(t.time))?_timeLabel(t.time):t.time }; }),
        adminStatus: s.approvalState ? String(s.approvalState).toLowerCase() : null,
        completedAt: s.completedAt || null,
        createdAt: s.createdAt || null
      };
    });

  PROJECTS = DB.projects
    .filter(function (p) { return (p.memberIds || []).indexOf(uid) >= 0; })
    .map(function (p) {
      var head = empById[p.headId];
      return {
        id: p.id, name: p.name, client: p.clientName,
        status: { PLANNING: 'Planning', ACTIVE: 'Active', ON_HOLD: 'On Hold', COMPLETED: 'Completed' }[p.status] || 'Planning',
        priority: { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High' }[p.priority] || 'Medium',
        head: p.headId, headName: head ? head.name : 'Unknown',
        team: (p.memberIds || []).slice(),
        progress: DataAPI.projectProgress(p.id),
        deadline: p.deadline,
        dept: p.deptId,
        desc: p.description,
        milestones: DB.milestones
          .filter(function (m) { return m.projectId === p.id; })
          .sort(function (a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); })
          .map(function (m) {
            var prog = DataAPI.milestoneProgress(m.id);
            return {
              id: m.id, title: m.title,
              status: _EMP_MS_STATUS[m.status] || 'Upcoming',
              date: m.dueDate, desc: m.description,
              progress: prog,
              deliverables: DB.deliverables
                .filter(function (d) { return d.milestoneId === m.id; })
                .map(function (d) {
                  return {
                    id: d.id, title: d.title, desc: d.description,
                    priority: { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High' }[d.priority] || 'Medium',
                    status: _EMP_DEL_STATUS[d.status] || 'To Do',
                    canonicalStatus: d.status,
                    deadline: d.dueAt ? Utils.isoDate(d.dueAt) : null,
                    hours: Math.round(Schema.TIME.secsToHours(d.estimateSecs) * 10) / 10,
                    loggedHours: Math.round(Schema.TIME.secsToHours(d.loggedSecs) * 10) / 10,
                    progress: d.progressPct,
                    assignees: (d.assigneeIds || []).slice(),
                    isMine: (d.assigneeIds || []).indexOf(uid) >= 0,
                    origin: d.origin,
                    approvalState: d.approvalState,
                    rejectionReason: d.status === 'REJECTED' ? d.rejectionReason : null,
                    selfTasks: DB.subtasks
                      .filter(function (s) { return s.deliverableId === d.id && s.createdById === s.assigneeId; })
                      .map(function (s) { return _mapSub(s, empById); }),
                    tasks: DB.subtasks
                      .filter(function (s) { return s.deliverableId === d.id && s.createdById !== s.assigneeId; })
                      .map(function (s) { return _mapSub(s, empById); })
                  };
                })
            };
          })
      };
    });

  /* ── ATTENDANCE ──────────────────────────────────────────────────────── */
  ATT_LOG = DB.attendance
    .filter(function (a) { return a.employeeId === uid; })
    .sort(function (a, b) { return a.date < b.date ? 1 : -1; })
    .map(function (a) {
      return {
        id: a.id, date: a.date,
        login: a.firstInAt ? new Date(a.firstInAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '',
        logout: a.lastOutAt ? new Date(a.lastOutAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) : null,
        sessions: (a.sessions || []).map(function (s) { return {
          inAt: s.inAt || null, outAt: s.outAt || null,
          login: s.inAt ? new Date(s.inAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '',
          logout: s.outAt ? new Date(s.outAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) : null
        }; }),
        total: a.sessionSecs, active: a.activeSecs, idle: a.idleSecs,
        breaks: (a.breaks || []).map(function (b) {
          return {
            type: b.type,
            start: b.startAt ? new Date(b.startAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '',
            end: b.endAt ? new Date(b.endAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) : null,
            dur: Math.round((b.secs || 0) / 60)
          };
        }),
        tasks: Object.keys(a.perDeliverableSecs || {}).map(Number),
        taskTime: a.perDeliverableSecs || {},
        status: _EMP_ATT[a.status] || 'Absent'
      };
    });

  /* ── NOTIFICATIONS ───────────────────────────────────────────────────── */
  var ICONS = {
    ASSIGNED: { icon: '\uD83D\uDCCB', bg: '#EFF6FF' },
    APPROVED: { icon: '\u2713',       bg: '#ECFDF5' },
    REJECTED: { icon: '\u2715',       bg: '#FEF2F2' },
    DUE:      { icon: '\u23F0',       bg: '#FFFBEB' },
    REVIEW:   { icon: '\uD83D\uDC41', bg: '#F5F3FF' },
    EEN:      { icon: '\uD83D\uDCA1', bg: '#EFF6FF' },
    INFO:     { icon: '\u2139',       bg: '#F0EEE9' },
    MESSAGE:  { icon: '\uD83D\uDCAC', bg: '#EFF6FF' },
    PENALTY:  { icon: '⚖️',            bg: '#FEF2F2' },
    PENALTY_APPEAL: { icon: '⚖️',       bg: '#FFFBEB' }
  };
  NOTIFS = DB.notifications
    .filter(function (n) { return n.recipientId === uid; })
    .map(function (n) {
      var look = ICONS[n.kind] || ICONS.INFO;
      return {
        id: n.id, type: n.kind.toLowerCase(),
        icon: look.icon, iconBg: look.bg,
        text: n.title, sub: n.body,
        time: _relLabel(n.createdAt),
        unread: !n.read,
        taskId: n.entityType === 'DELIVERABLE' ? n.entityId : null,
        subtaskId: n.entityType === 'SUBTASK' ? n.entityId : null
      };
    });
}

function _myShare(d, uid) {
  var ids = d.assigneeIds || [], n = ids.length, total = d.pricePaise || 0;
  if (!n) return 0;
  var base = Math.floor(total / n), i = ids.indexOf(uid);
  return base + (i === 0 ? total - base * n : 0);
}


function findWorkItem(id) {
  return TASKS.find(function (x) { return String(x.id) === String(id); }) ||
    SUBTASKS.find(function (x) { return String(x.id) === String(id); }) || null;
}

function _mapSub(s, empById) {
  var emp = empById[s.assigneeId] || { name: 'Team', avatarInitials: '??', avatarBg: '#ccc', avatarFg: '#fff' };
  return {
    id: s.id, employeeId: s.assigneeId, assignee: s.assigneeId, createdById: s.createdById,
    employeeName: emp.name,
    title: s.title, desc: s.description,
    priority: { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High' }[s.priority] || 'Medium',
    status: (_EMP_DEL_STATUS[(String(s.approvalState || '').toUpperCase() === 'APPROVED' && s.status === 'DONE' && !(s.loggedSecs > 0)) ? 'TODO' : s.status] || 'To Do'),
    canonicalStatus: (String(s.approvalState || '').toUpperCase() === 'APPROVED' && s.status === 'DONE' && !(s.loggedSecs > 0)) ? 'TODO' : s.status,
    hoursLogged: Math.round(Schema.TIME.secsToHours(s.loggedSecs) * 10) / 10,
    estHours: Math.round(Schema.TIME.secsToHours(s.estimateSecs) * 10) / 10,
    date: s.createdAt ? Utils.isoDate(s.createdAt) : null,
    adminStatus: s.approvalState ? s.approvalState.toLowerCase() : null,
    adminNote: s.rejectionReason || null
  };
}

/* Mutation ke baad — projection refresh + re-render */
function syncAndRender(fn) {
  syncUserState();
  if (typeof fn === 'function') fn();
  else if (typeof rAll === 'function') rAll();
}
