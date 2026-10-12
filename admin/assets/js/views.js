var VIEW_SHELLS = {
  'view-dashboard': `      <!-- Stats Bar -->
      <div class="stats-bar" id="stats-bar"></div>
      <!-- Activity + Alerts -->
      <div class="dash-row dash-row-fixed">
        <div class="card card-pad dash-fixed">
          <div class="section-header">
            <div>
              <div class="section-title">Live Activity Feed</div>
              <div class="section-sub">Recent events across the platform \u00b7 click any item to open it</div>
            </div>
            <span class="badge badge-grey" id="activity-count"></span>
          </div>
          <div class="activity-list dash-scroll" id="activity-feed"></div>
        </div>
        <div class="card card-pad dash-fixed">
          <div class="section-header">
            <div class="section-title">Critical Alerts</div>
            <span class="badge" id="alerts-count" style="display:none"></span>
          </div>
          <div class="dash-scroll">
            <div id="critical-alerts"></div>
            <div id="team-now"></div>
          </div>
        </div>
      </div>
      <!-- Projects Health Row -->
      <div class="card card-pad" style="margin-bottom:20px">
        <div class="section-header">
          <div>
            <div class="section-title">Projects Health</div>
            <div class="section-sub">Real-time progress overview</div>
          </div>
          <span class="link-btn" onclick="gotoModule('projects')">View All →</span>
        </div>
        <div class="projects-scroll" id="projects-health"></div>
      </div>
      <!-- Bottom Grid -->
      <div class="dash-bottom" id="dash-bottom">
        <!-- Col 1: Dept Overview -->
        <div class="card card-pad">
          <div class="section-header">
            <div class="section-title">Department Overview</div>
            <span class="link-btn" onclick="gotoModule('departments')">Manage →</span>
          </div>
          <div id="dept-overview"></div>
        </div>
        <!-- Col 2: Top Performers -->
        <div class="card card-pad">
          <div class="section-header">
            <div class="section-title">Top Performers</div>
            <div class="section-sub">This week</div>
          </div>
          <div id="top-performers"></div>
        </div>
        <!-- Col 3: Unbilled Delivered Work — agency ka sabse bada leak -->
        <div class="card card-pad">
          <div class="section-header">
            <div>
              <div class="section-title">Unbilled Work</div>
              <div class="section-sub">Delivered but not invoiced</div>
            </div>
          </div>
          <div id="unbilled-snapshot"></div>
          <div style="margin-top:12px">
            <div style="font-size:13px;color:var(--t3);margin-bottom:8px">Sitting uninvoiced</div>
            <div style="font-size:24px;font-weight:700;color:var(--amber);font-family:var(--mono)" id="unbilled-value">—</div>
          </div>
          <button class="btn btn-primary" style="width:100%;margin-top:12px;justify-content:center" onclick="gotoModule('invoices')">Open Billing →</button>
        </div>
      </div>
      <!-- Een assistant card -->
      <div class="card card-pad" style="margin-bottom:20px">
        <div class="section-header">
          <div>
            <div class="section-title">Een says</div>
            <div class="section-sub">The most important thing that needs attention now</div>
          </div>
        </div>
        <div id="een-dash-card"></div>
      </div>

      <!-- Milestone Summary Widget -->
      <div class="card card-pad" style="margin-bottom:20px" id="milestone-summary-card">
        <div class="section-header">
          <div>
            <div class="section-title">Milestone Tracker</div>
            <div class="section-sub" id="ms-summary-sub">All projects snapshot</div>
          </div>
          <span class="link-btn" onclick="gotoModule('projects')">View Projects →</span>
        </div>
        <div id="milestone-summary-body"></div>
      </div>
      <!-- Messages Preview -->
      <div class="card card-pad" style="margin-bottom:0">
        <div class="section-header">
          <div class="section-title">Recent Messages</div>
          <span class="link-btn" onclick="gotoModule('messages')">Open Messages →</span>
        </div>
        <div class="msg-preview-list" id="msg-preview"></div>
      `,

  'view-departments': `      <div class="section-header" style="margin-bottom:20px">
        <div>
          <div class="section-title" style="font-size:20px">Departments</div>
          <div class="section-sub">Manage your organizational structure</div>
        </div>
        <button class="btn btn-primary" onclick="openCreateDeptPanel()">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          Create New Department
        </button>
      </div>
      <div class="grid-3" id="dept-cards">`,

  'view-employees': `      <div class="section-header" style="margin-bottom:16px">
        <div>
          <div class="section-title" style="font-size:20px">Employees</div>
          <div class="section-sub" id="emp-count-sub"></div>
        </div>
        <button class="btn btn-primary" onclick="openAddEmpModal()">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          Add New Employee
        </button>
      </div>
      <div class="filter-bar">
        <select id="emp-dept-filter" onchange="filterEmployees()">
          <option value="">All Departments</option>
        </select>
        <div class="status-pills" id="emp-status-pills">
          <div class="status-pill active" data-status="" onclick="setEmpStatus(this,'')">All</div>
          <div class="status-pill" data-status="Present" onclick="setEmpStatus(this,'Present')">Present</div>
          <div class="status-pill" data-status="Absent" onclick="setEmpStatus(this,'Absent')">Absent</div>
          <div class="status-pill" data-status="On Leave" onclick="setEmpStatus(this,'On Leave')">On Leave</div>
        </div>
        <input type="text" placeholder="Search by name…" id="emp-search" oninput="filterEmployees()" style="height:32px;border:1px solid var(--b2);border-radius:var(--r8);padding:0 10px;font-size:13px;background:var(--surface);outline:none;flex:1;max-width:220px">
      </div>
      <div style="display:flex;gap:10px;margin-bottom:16px" id="emp-stats-pills"></div>
      <div class="emp-cards" id="emp-cards-grid">`,

  'view-projects': `      <div class="section-header" style="margin-bottom:20px">
        <div>
          <div class="section-title" style="font-size:20px">Projects</div>
          <div class="section-sub">Track all client deliverables</div>
        </div>
        <button class="btn btn-primary" onclick="openAddProjectModal()">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          Add New Project
        </button>
      </div>
      <div class="project-cards" id="project-cards-grid">`,

  'view-project-detail': `      <div class="project-detail-header">
        <div class="back-btn" onclick="gotoModule('projects')">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M19 12H5M5 12l7-7M5 12l7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Back to Projects
        </div>
        <div style="flex:1">
          <div class="section-title" style="font-size:18px" id="pd-title"></div>
          <div style="font-size:13px;color:var(--t3);margin-top:2px" id="pd-client"></div>
        </div>
        <div id="pd-badges" style="display:flex;gap:6px;align-items:center">
          <button class="btn btn-secondary btn-sm" id="pd-edit-btn" style="display:none" onclick="openEditProjectModal(STATE.currentProject)">✏️ Edit</button>
        </div>
      </div>
      <div class="tab-bar" style="margin-bottom:20px">
        <div class="tab-btn active" onclick="switchTab(this,'pd-overview')">Overview</div>
        <div class="tab-btn" onclick="switchTab(this,'pd-tasks')">Milestones</div>
        <div class="tab-btn" onclick="switchTab(this,'pd-timeline')">Timeline</div>
        <div class="tab-btn" onclick="switchTab(this,'pd-team')">Team</div>
        <div class="tab-btn" onclick="switchTab(this,'pd-finance')">Finance</div>
      </div>
      <div id="pd-overview" class="tab-pane active"></div>
      <div id="pd-tasks" class="tab-pane"></div>
      <div id="pd-timeline" class="tab-pane"></div>
      <div id="pd-team" class="tab-pane"></div>
      <div id="pd-finance" class="tab-pane">`,

  'view-messages': `      <div style="margin-bottom:16px">
        <div class="section-title" style="font-size:20px">Messages</div>
        <div class="section-sub">Team communication hub</div>
      </div>
      <div class="messages-layout">
        <div class="contacts-panel">
          <div class="contacts-search">
            <input type="text" placeholder="Search conversations…" oninput="filterContacts(this.value)" style="width:100%;box-sizing:border-box">
          </div>
          <div class="tab-bar" style="padding:0 8px;margin-bottom:0">
            <div class="tab-btn active" style="font-size:12px;padding:8px 10px" onclick="this.parentElement.querySelectorAll('.tab-btn').forEach(t=>t.classList.remove('active'));this.classList.add('active');filterContacts('')">All</div>
            <div class="tab-btn" style="font-size:12px;padding:8px 10px" onclick="this.parentElement.querySelectorAll('.tab-btn').forEach(t=>t.classList.remove('active'));this.classList.add('active')">Direct</div>
            <div class="tab-btn" style="font-size:12px;padding:8px 10px" onclick="this.parentElement.querySelectorAll('.tab-btn').forEach(t=>t.classList.remove('active'));this.classList.add('active')">Departments</div>
          </div>
          <div class="contacts-list" id="contacts-list"></div>
          <div style="padding:12px;border-top:1px solid var(--b1)">
            <button class="btn btn-secondary" style="width:100%;justify-content:center;font-size:12px" onclick="gotoModule('notices')">📢 Send Broadcast</button>
          </div>
        </div>
        <div class="chat-area">
          <div class="chat-header" id="chat-header">
            <div class="empty-state" style="flex:1;padding:20px">
              <div class="empty-icon">💬</div>
              <div class="empty-title">Select a conversation</div>
              <div class="empty-sub">Choose a contact to start messaging</div>
            </div>
          </div>
          <div class="chat-messages" id="chat-messages" style="display:none"></div>
          <div class="chat-input-bar" id="chat-input-bar" style="display:none">
            <textarea placeholder="Type a message…" id="chat-input" rows="1" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendMessage()}"></textarea>
            <button class="btn btn-primary btn-sm" onclick="sendMessage()">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polygon points="22 2 15 22 11 13 2 9 22 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>
        </div>
      `,

};

var _mounted = {};

function mountView(name) {
  var id = 'view-' + name;
  if (_mounted[id]) return true;
  var el = document.getElementById(id);
  if (!el) return false;
  var shell = VIEW_SHELLS[id];
  if (shell == null) { _mounted[id] = true; return true; }
  el.innerHTML = shell;
  _mounted[id] = true;
  return true;
}

(function wrapMount() {
  if (typeof gotoModule !== 'function') return;
  var _g = gotoModule;
  window.gotoModule = function (name, skipHistory) {
    mountView(name);
    _g(name, skipHistory);
  };
})();