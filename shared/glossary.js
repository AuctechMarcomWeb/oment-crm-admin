
(function (root) {
  'use strict';

  var TERMS = {

    /* ── Profitability ── */
    margin: {
      title: 'Margin',
      short: 'Money left after costs.',
      long: 'The revenue you have recognised on this project (invoiced + delivered-but-not-yet-invoiced), ' +
            'minus the team’s loaded cost. Positive means profit, negative means you are subsidising the project.',
      formula: '(Invoiced + WIP) \u2212 delivery cost'
    },
    loadedCost: {
      title: 'Loaded cost',
      short: 'What one person really costs in total.',
      long: 'A person costs more than their salary \u2014 rent, laptop, software, HR, ' +
            'bench time and PF all sit on top. For most Indian agencies this is ' +
            '1.3\u20131.5\u00d7 salary. Compute margin from salary alone and every project looks profitable ' +
            'while the company still loses money.',
      formula: 'Cost per hour \u00d7 overhead multiplier'
    },
    overheadMultiplier: {
      title: 'Overhead multiplier',
      short: 'The number that turns salary into real cost.',
      long: 'Default is 1.4 \u2014 meaning someone who costs \u20b9900/hr actually costs ' +
            '\u20b91,260/hr. To find your own number: total annual ' +
            'expenses \u00f7 total annual salary.',
      formula: 'Total company cost \u00f7 total salary cost'
    },
    effectiveRate: {
      title: 'Effective rate',
      short: 'How much you earn per hour of work.',
      long: 'Compare this with your bill rate. If the bill rate is \u20b92,500/hr but the effective rate ' +
            'is \u20b91,200/hr, then either scope is creeping, estimates were too low, ' +
            'or a lot of time is going into non-billable work.',
      formula: 'Recognised revenue \u00f7 hours logged'
    },
    wip: {
      title: 'Delivered, not invoiced (WIP)',
      short: 'Work is complete, but nobody sent the invoice.',
      long: 'This is an agency’s biggest revenue leak \u2014 a milestone completes and the invoice ' +
            'never gets raised. This money is yours, you just haven’t asked for it. It shows up nowhere ' +
            'in cash flow, so it can stay hidden for months.',
      formula: 'Completed billable milestones without an invoice'
    },
    burnVsDelivery: {
      title: 'Budget burned vs delivered',
      short: 'Whether money is running out faster than work gets done.',
      long: 'Two bars \u2014 one shows how much budget has gone to cost, the other how much work ' +
            'has actually been delivered. If burn is 10%+ ahead of delivery, the project needs attention ' +
            'now, otherwise you find out at the end when nothing can be done.',
      formula: 'Cost \u00f7 contract  vs  deliverables done \u00f7 total'
    },
    forecastMargin: {
      title: 'Forecast margin',
      short: 'How much profit will be left when the project ends.',
      long: '"59% margin so far" is useless if the remaining work will drag it to 30%. ' +
            'This adds the cost of the remaining committed work. Deliverables that have already ' +
            'exceeded their estimate get a 25% buffer \u2014 otherwise the forecast lies.',
      formula: 'Contract \u2212 (cost so far + remaining work cost)'
    },
    costMultiple: {
      title: 'Cost multiple',
      short: 'How much you earned for every rupee spent.',
      long: 'Above 2.0\u00d7 is healthy. Below that, either the person’s time is going into non-billable ' +
            'work (internal, admin, bench), or their bill rate is too low for their cost.',
      formula: 'Billable value \u00f7 loaded cost'
    },
    contribution: {
      title: 'Contribution',
      short: 'How much money a person brings in (after cost).',
      long: 'Billable value created minus their loaded cost. This is not a performance ' +
            'rating \u2014 a senior who mentors and reviews will show a lower number, ' +
            'but the team doesn’t run without them.',
      formula: 'Billable value \u2212 loaded cost'
    },
    recognisedRevenue: {
      title: 'Recognised revenue',
      short: 'The value of the work that has been completed.',
      long: 'This is different from all three: <strong>contract</strong> (what was signed), <strong>invoiced</strong> ' +
            '(what was billed), <strong>collected</strong> (what was paid). A project can be 100% delivered, ' +
            '80% invoiced and 40% collected \u2014 you need to see all three separately.',
      formula: 'Invoiced + delivered-not-invoiced'
    },
    gstNote: {
      title: 'GST is not revenue',
      short: 'GST is not your income, so it isn’t counted.',
      long: 'GST is not your money \u2014 you collect it for the government and pass it ' +
            'on. Count it as revenue and your margin looks a false 18% higher.',
      formula: null
    },

    /* ── People / HRM ── */
    utilisation: {
      title: 'Utilisation',
      short: 'What share of working time went to client work.',
      long: 'The agency benchmark is 60\u201375%. 100% is neither possible nor healthy \u2014 meetings, ' +
            'internal work, learning and leave all come out of it. Below 40% means either ' +
            'there is no work, or time isn’t being logged.',
      formula: 'Billable hours \u00f7 available hours'
    },
    committedAhead: {
      title: 'Committed ahead',
      short: 'How many days of work that person still has queued.',
      long: 'The remaining estimate on their open deliverables. For capacity planning this is the most ' +
            'direct number \u2014 who can take new work and who can’t.',
      formula: '\u03a3 (estimate \u2212 logged) of open work \u00f7 8h'
    },
    payableDays: {
      title: 'Payable days',
      short: 'How many days count for salary.',
      long: 'Present days + half of half-days + approved leave. Absent and LOP are excluded. ' +
            'This is the number that goes to payroll.',
      formula: 'Present + (half days \u00d7 0.5) + approved leave'
    },
    graceWindow: {
      title: 'Grace window',
      short: 'This much delay is tolerated without being marked late.',
      long: 'Default 15 minutes, for traffic and genuine delays. Only after this is someone flagged "late".',
      formula: null
    },
    regularisation: {
      title: 'Attendance correction',
      short: 'Getting the correct time recorded when you forgot to punch.',
      long: 'This is the most common HR ticket. The employee submits the correct in/out time with a ' +
            'reason, the approver reviews it. On approval the attendance register updates ' +
            'automatically \u2014 otherwise the day stays "absent" and payroll comes out wrong.',
      formula: null
    },
    proRatedLeave: {
      title: 'Pro-rated leave',
      short: 'Leave is granted based on the joining date.',
      long: 'Someone who joined in August shouldn’t get the full year’s 12 CL. The balance ' +
            'is calculated from the joining month.',
      formula: 'Annual quota \u00d7 remaining months \u00f7 12'
    },
    workingDays: {
      title: 'Working days',
      short: 'Sundays and holidays don’t count.',
      long: 'This is shown before you apply \u2014 "3 days will be used, ' +
            '2 weekend days skipped" \u2014 so there are no surprises later.',
      formula: null
    },

    /* ── Delivery ── */
    deliverable: {
      title: 'Deliverable',
      short: 'A piece of work assigned to someone and reviewed afterwards.',
      long: 'Structure: Project \u2192 Milestone \u2192 Deliverable \u2192 Task. The milestone is the billing ' +
            'unit, the deliverable is the assignment unit, tasks are the employee’s own breakdown.',
      formula: null
    },
    approvalLoop: {
      title: 'Approval loop',
      short: 'Submit work \u2192 manager reviews \u2192 approved or returned.',
      long: 'Unlike dragging a status column, rejecting requires a <strong>reason ' +
            '\u2014 mandatory</strong>, and the employee sees it verbatim. The full audit trail ' +
            'stays in the timeline.',
      formula: null
    },
    estimateDrift: {
      title: 'Estimate drift',
      short: 'How much longer it took than planned.',
      long: 'Positive means it took longer than estimated. If it’s consistently +40%, the problem ' +
            'is estimation, not the team \u2014 add buffer when quoting.',
      formula: '(Actual \u00f7 estimate \u2212 1) \u00d7 100'
    },
    firstPassApproval: {
      title: 'First-time approval',
      short: 'How much work was approved on the first attempt.',
      long: 'Above 80% is healthy. If it drops, briefs aren’t clear, or ' +
            'review criteria aren’t being shared upfront.',
      formula: 'Approved \u00f7 (approved + returned)'
    },

    /* ── Billing ── */
    invoiceNumbering: {
      title: 'Invoice numbering',
      short: 'An invoice number is never reused.',
      long: 'Format PREFIX/FY/0001. Even if an invoice is deleted, its number is never ' +
            'issued again \u2014 under GST, numbers must be unique and sequential.',
      formula: null
    },
    gstSplit: {
      title: 'CGST/SGST vs IGST',
      short: 'The type of GST depends on which state the client is in.',
      long: 'If the client is in your state: CGST + SGST (split equally). In another state: ' +
            'full IGST. Set your state code in Settings, and the client’s place of supply ' +
            'on the invoice.',
      formula: null
    },
    outstanding: {
      title: 'Outstanding',
      short: 'Invoiced but not yet paid.',
      long: 'This is separate from margin. A project can be at 60% margin while you still have ' +
            'no cash \u2014 profit and cash are two different things.',
      formula: 'Invoiced \u2212 collected'
    }
  };

  function helpIcon(key, size) {
    var t = TERMS[key];
    if (!t) return '';
    size = size || 13;
    var body = t.short + (t.formula ? ' \u2014 ' + t.formula : '');
    return '<span class="help-dot" tabindex="0" role="button" ' +
      'aria-label="' + _attr(t.title + ': ' + body) + '" ' +
      'onclick="event.stopPropagation();showTermHelp(\'' + key + '\')" ' +
      'onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();event.stopPropagation();showTermHelp(\'' + key + '\')}" ' +
      'style="width:' + size + 'px;height:' + size + 'px;font-size:' + (size - 4) + 'px">?' +
      '<span class="help-tip" role="tooltip">' +
        '<strong>' + _esc(t.title) + '</strong>' + _esc(t.short) +
        (t.formula ? '<em>' + _esc(t.formula) + '</em>' : '') +
        '<span class="help-more">Click for detail</span>' +
      '</span></span>';
  }

  function _esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function _attr(v) { return _esc(v); }

  root.Glossary = {
    TERMS: TERMS,
    helpIcon: helpIcon,
    get: function (key) { return TERMS[key] || null; },
    keys: function () { return Object.keys(TERMS); }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = root.Glossary;

})(typeof window !== 'undefined' ? window : globalThis);
