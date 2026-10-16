(function (root) {
  'use strict';

  var GUIDES = {
    dashboard: {
      what: 'This is your home page. The whole company at a glance.',
      steps: [
        'The boxes on top show the company’s headline numbers',
        'A red or amber box means something needs attention \u2014 click it',
        '"Margin" on a project card is the profit left on that project'
      ]
    },
    projects: {
      what: 'All your client projects live here.',
      steps: [
        'Click "Add Project" to create a new project',
        'Click a project to open it',
        'Inside, create milestones, then add work (deliverables) to each milestone'
      ]
    },
    'project-detail': {
      what: 'All the work on this project is here.',
      steps: [
        'Milestone = a major stage. When it completes, you invoice the client',
        'Deliverable = a piece of work you assign to an employee',
        'When an employee submits work it shows "In Review" \u2014 approve it or send it back'
      ]
    },
    payouts: {
      what: 'Task-based pay. Who is owed what, why, and where work is stuck.',
      steps: [
        'When creating a deliverable choose "Fixed price" \u2014 price + agreed time',
        'The employee accepts the time or proposes their own \u2014 see the "Agreements" tab, with past data',
        'Money goes to the wallet on approval. Late = one slab down, never below the floor',
        'Check the "Blocked" tab daily \u2014 that is your own bottleneck',
        'Answer disputes with a note \u2014 silence breaks trust'
      ]
    },
    employees: {
      what: 'Your team directory.',
      steps: [
        'Click "Add Employee" to add someone',
        'Click a name to see their details',
        'You can assign new work from there too'
      ]
    },
    departments: {
      what: 'Split the team into groups \u2014 like Software, Design, Operations.',
      steps: [
        'Click "Add Department" to create a group',
        'Pick a head for each group',
        'Click a group to add or remove people'
      ]
    },
    hrm: {
      what: 'Attendance, leave and how busy the team is \u2014 all here.',
      steps: [
        '<b>Today</b> \u2014 who is working right now, who is late',
        '<b>Register</b> \u2014 the whole month’s attendance. P = present, A = absent',
        '<b>Leave</b> \u2014 approve or reject leave requests',
        '<b>Timesheets</b> \u2014 how much time went to each project',
        '<b>Capacity</b> \u2014 who is overloaded, who has room'
      ]
    },
    profit: {
      what: 'Shows whether each project is making or losing money.',
      steps: [
        'Green number = profit. Red = loss',
        'Click a project to see where the money went',
        'First time here? Fill in everyone’s rate in the "Rates" tab \u2014 otherwise the numbers will be wrong'
      ]
    },
    invoices: {
      what: 'Invoices sent to clients.',
      steps: [
        'Click a project to create its invoice',
        '"Delivered but not invoiced" means the work is done but you forgot to bill it',
        'When payment arrives, click "Mark paid"'
      ]
    },
    notices: {
      what: 'Send announcements to the team.',
      steps: [
        'Click "New Notice" to write one',
        'Choose who receives it \u2014 everyone or one department',
        'After sending you can see who has read it'
      ]
    },
    calendar: {
      what: 'Calendar of meetings and deadlines.',
      steps: [
        'Click a date to create an event',
        'Different colours are for different kinds of events'
      ]
    },
    messages: {
      what: 'Direct chat with the team.',
      steps: [
        'Pick a name on the left',
        'Type below and send'
      ]
    },
    analytics: {
      what: 'The company’s numbers, as charts.',
      steps: [
        'Change the time period at the top',
        'Each chart explains what it shows underneath'
      ]
    },
    calling: {
      what: 'Phone dialer.',
      steps: [
        'Not live yet \u2014 a phone service needs to be connected',
        'Past calls are listed below'
      ]
    },
    een: {
      what: 'Your assistant. Things that need attention on the left, ask questions on the right.',
      steps: [
        'The list on the left is built <b>without AI</b> \u2014 it is always accurate',
        'Click any line to ask for details about it',
        'Click Settings to enable AI \u2014 a free Gemini key works',
        'Een works even with AI off, the answers are just simpler'
      ]
    },
    settings: {
      what: 'Company details and settings.',
      steps: [
        'Enter the company name, address and GST number here',
        'Download all your data from the <b>Data</b> tab',
        'Change your name and password in <b>My account</b>'
      ]
    },
    help: {
      what: 'Any term in the app you don’t understand is explained here.',
      steps: [
        'Type the term in the search box above',
        'Wherever you see "?" in the app, hover it for the meaning'
      ]
    }
  };

  var HIDE_KEY = 'oment_guides_hidden';

  function hiddenSet() {
    try { return JSON.parse(localStorage.getItem(HIDE_KEY) || '[]'); }
    catch (e) { return []; }
  }
  function isHidden(name) { return hiddenSet().indexOf(name) >= 0; }
  function hide(name) {
    var h = hiddenSet();
    if (h.indexOf(name) < 0) h.push(name);
    try { localStorage.setItem(HIDE_KEY, JSON.stringify(h)); } catch (e) {}
  }
  function showAll() {
    try { localStorage.removeItem(HIDE_KEY); } catch (e) {}
  }

  function html(name) {
    var g = GUIDES[name];
    if (!g) return '';

    if (isHidden(name)) {
      return '<button class="guide-reopen" onclick="showGuide(\'' + name + '\')">' +
        '<span aria-hidden="true">?</span> How this page works' +
      '</button>';
    }

    return '<div class="page-guide" role="note">' +
      '<div class="page-guide-head">' +
        '<span class="page-guide-icon" aria-hidden="true">i</span>' +
        '<span class="page-guide-what">' + g.what + '</span>' +
        '<button class="page-guide-close" onclick="hideGuide(\'' + name + '\')" ' +
          'aria-label="Hide this guide">\u2715</button>' +
      '</div>' +
      '<ul class="page-guide-steps">' +
        g.steps.map(function (st) { return '<li>' + st + '</li>'; }).join('') +
      '</ul>' +
    '</div>';
  }

  root.PageGuide = {
    html: html,
    hide: hide,
    showAll: showAll,
    isHidden: isHidden,
    GUIDES: GUIDES
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = root.PageGuide;

})(typeof window !== 'undefined' ? window : globalThis);