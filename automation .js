// ============================================================================
// MORAL IMAGINATION NEWSLETTER — AUTOMATION SYSTEM
// Wake Forest University School of Divinity
// ============================================================================
// This file contains:
//   1. n8n Workflow JSON (importable)
//   2. Google Apps Script for cron jobs & spreadsheet management
//   3. Claude AI Agent prompts for QA review
//   4. Complete setup instructions
// ============================================================================

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: n8n WORKFLOW — Newsletter Pipeline Orchestrator
// ─────────────────────────────────────────────────────────────────────────────
// Import this JSON into your n8n instance at: Settings → Import Workflow

const N8N_WORKFLOW = {
  "name": "Moral Imagination Newsletter Pipeline",
  "nodes": [
    // ── TRIGGER: Webhook receives submissions ──
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "newsletter-submit",
        "responseMode": "responseNode",
        "options": {}
      },
      "name": "Webhook — Section Submission",
      "type": "n8n-nodes-base.webhook",
      "position": [250, 300]
    },

    // ── TRIGGER: Daily cron for reminders ──
    {
      "parameters": {
        "rule": {
          "interval": [{ "field": "cronExpression", "expression": "0 9 * * *" }]
        }
      },
      "name": "Cron — Daily 9AM Reminder Check",
      "type": "n8n-nodes-base.cron",
      "position": [250, 500]
    },

    // ── Google Sheets: Read contributor assignments ──
    {
      "parameters": {
        "operation": "read",
        "sheetId": "{{SPREADSHEET_ID}}",
        "range": "Contributors!A:K",
        "options": {}
      },
      "name": "Read Contributors Sheet",
      "type": "n8n-nodes-base.googleSheets",
      "position": [500, 500]
    },

    // ── Code Node: Check deadlines & determine alerts ──
    {
      "parameters": {
        "jsCode": `
const contributors = $input.all();
const today = new Date();
const results = { reminders: [], escalations: [], late: [] };

for (const item of contributors) {
  const c = item.json;
  const deadline = new Date(c.deadline);
  const daysUntil = Math.ceil((deadline - today) / 86400000);
  
  if (c.status === 'APPROVED' || c.status === 'SUBMITTED') continue;
  
  if (daysUntil < 0) {
    results.late.push({ ...c, daysLate: Math.abs(daysUntil) });
  } else if (daysUntil <= 3) {
    results.reminders.push({ ...c, daysLeft: daysUntil, urgency: 'urgent' });
  } else if (daysUntil <= 7) {
    results.reminders.push({ ...c, daysLeft: daysUntil, urgency: 'gentle' });
  }
}

return [{ json: results }];
`
      },
      "name": "Check Deadlines",
      "type": "n8n-nodes-base.code",
      "position": [750, 500]
    },

    // ── IF Node: Any late contributors? ──
    {
      "parameters": {
        "conditions": {
          "number": [{ "value1": "={{ $json.late.length }}", "operation": "larger", "value2": 0 }]
        }
      },
      "name": "Has Late Contributors?",
      "type": "n8n-nodes-base.if",
      "position": [1000, 500]
    },

    // ── Gmail: Send reminder to contributors ──
    {
      "parameters": {
        "sendTo": "={{ $json.email }}",
        "subject": "Moral Imagination Newsletter — Reminder: Your Section is Due",
        "emailType": "html",
        "message": `
<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #000; padding: 20px; text-align: center;">
    <h1 style="color: #9E7E38; margin: 0; font-size: 24px;">Moral Imagination</h1>
    <p style="color: #B3A999; margin: 4px 0 0; font-size: 12px;">Wake Forest University School of Divinity</p>
  </div>
  <div style="padding: 24px; border: 1px solid #E8E4DE;">
    <p>Dear {{ $json.contributorName }},</p>
    <p>This is a friendly reminder that your section <strong>"{{ $json.sectionTitle }}"</strong> 
    for the Moral Imagination newsletter is due in <strong>{{ $json.daysLeft }} days</strong>.</p>
    <p><strong>Word Limit:</strong> {{ $json.wordLimit }} words<br>
    <strong>Deadline:</strong> {{ $json.deadline }}</p>
    <p>Please submit via the dashboard or use the <code>/submit</code> command.</p>
    <p style="color: #5C574F;">— The Moral Imagination Editorial Team</p>
  </div>
</div>`
      },
      "name": "Send Contributor Reminder",
      "type": "n8n-nodes-base.gmail",
      "position": [1000, 300]
    },

    // ── Gmail: Escalation to editors ──
    {
      "parameters": {
        "sendTo": "editors@divinity.wfu.edu",
        "subject": "⚠️ Late Section Alert — Moral Imagination Newsletter",
        "emailType": "html",
        "message": `
<div style="font-family: Georgia, serif; max-width: 600px;">
  <div style="background: #000; padding: 20px; text-align: center;">
    <h1 style="color: #9E7E38; margin: 0;">⚠️ Late Section Alert</h1>
  </div>
  <div style="padding: 24px; border: 1px solid #E8E4DE;">
    <p>The following contributors have missed their deadline:</p>
    <table style="width: 100%; border-collapse: collapse;">
      <tr style="background: #F5F0E5;">
        <th style="padding: 8px; text-align: left; border: 1px solid #D5D0C8;">Section</th>
        <th style="padding: 8px; text-align: left; border: 1px solid #D5D0C8;">Contributor</th>
        <th style="padding: 8px; text-align: left; border: 1px solid #D5D0C8;">Days Late</th>
      </tr>
      {{ $json.late.map(c => '<tr><td style="padding:8px;border:1px solid #D5D0C8;">' + c.sectionTitle + '</td><td style="padding:8px;border:1px solid #D5D0C8;">' + c.contributorName + '</td><td style="padding:8px;border:1px solid #D5D0C8;color:#A63D40;font-weight:bold;">' + c.daysLate + ' days</td></tr>').join('') }}
    </table>
    <p>Please consider reassigning via <code>/reassign [section] @new-contributor</code></p>
  </div>
</div>`
      },
      "name": "Escalate to Editors",
      "type": "n8n-nodes-base.gmail",
      "position": [1250, 600]
    },

    // ── AI QA Agent: Claude reviews submission ──
    {
      "parameters": {
        "url": "https://api.anthropic.com/v1/messages",
        "method": "POST",
        "headers": {
          "x-api-key": "={{$credentials.anthropicApi.apiKey}}",
          "anthropic-version": "2023-06-01",
          "content-type": "application/json"
        },
        "body": {
          "model": "claude-sonnet-4-20250514",
          "max_tokens": 2000,
          "system": `You are the AI Quality Assurance agent for the "Moral Imagination" newsletter at Wake Forest University School of Divinity. Review submitted content against these criteria:

1. WORD COUNT: Check against the specified limit. Flag if over by more than 5%.
2. TONE: Should be academic yet accessible, warm, inclusive, and aligned with divinity school values.
3. FACTUAL CLAIMS: Flag any claims that need citations or verification.
4. STYLE GUIDE: Consistent with WFU School of Divinity voice — thoughtful, justice-oriented, community-focused.
5. SENSITIVITY: Flag any content that could be divisive or inappropriate for a diverse faith community.
6. FORMATTING: Check for proper paragraphing, no excessive jargon, readable structure.

Return a JSON response with this exact structure:
{
  "score": 0-100,
  "pass": true/false,
  "summary": "Brief overall assessment",
  "issues": [
    {"type": "error|warning|info|suggestion", "message": "Description of the issue"}
  ],
  "wordCount": actual_count,
  "toneAssessment": "Brief tone evaluation",
  "recommendedAction": "APPROVE|REVISE|REJECT"
}`,
          "messages": [{
            "role": "user",
            "content": "Review this newsletter section:\n\nSection: {{ $json.sectionTitle }}\nWord Limit: {{ $json.wordLimit }}\nContent:\n\n{{ $json.content }}"
          }]
        }
      },
      "name": "Claude AI QA Review",
      "type": "n8n-nodes-base.httpRequest",
      "position": [500, 300]
    },

    // ── Code Node: Parse AI response and update sheet ──
    {
      "parameters": {
        "jsCode": `
const aiResponse = JSON.parse($input.first().json.content[0].text);
const submission = $node["Webhook — Section Submission"].json;

return [{
  json: {
    sectionId: submission.sectionId,
    contributor: submission.contributorName,
    email: submission.email,
    aiScore: aiResponse.score,
    aiPass: aiResponse.pass,
    summary: aiResponse.summary,
    issues: aiResponse.issues,
    wordCount: aiResponse.wordCount,
    recommendedAction: aiResponse.recommendedAction,
    reviewedAt: new Date().toISOString(),
    newStatus: aiResponse.pass ? 'APPROVED' : 'REVISION_NEEDED'
  }
}];
`
      },
      "name": "Parse AI Review",
      "type": "n8n-nodes-base.code",
      "position": [750, 300]
    },

    // ── Google Sheets: Update status ──
    {
      "parameters": {
        "operation": "update",
        "sheetId": "{{SPREADSHEET_ID}}",
        "range": "Contributors!A:K",
        "options": {
          "valueInputOption": "USER_ENTERED"
        }
      },
      "name": "Update Contributor Status",
      "type": "n8n-nodes-base.googleSheets",
      "position": [1000, 300]
    },

    // ── Gmail: Send AI audit to contributor ──
    {
      "parameters": {
        "sendTo": "={{ $json.email }}",
        "subject": "Moral Imagination — AI Review Results for \"{{ $json.sectionTitle }}\"",
        "emailType": "html",
        "message": `
<div style="font-family: Georgia, serif; max-width: 600px;">
  <div style="background: #000; padding: 20px; text-align: center;">
    <h1 style="color: #9E7E38; margin: 0;">AI Quality Review</h1>
    <p style="color: #B3A999; font-size: 12px;">Moral Imagination Newsletter</p>
  </div>
  <div style="padding: 24px; border: 1px solid #E8E4DE;">
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="display: inline-block; width: 64px; height: 64px; border-radius: 50%; 
        border: 3px solid {{ $json.aiScore >= 90 ? '#4A7C59' : $json.aiScore >= 70 ? '#C4883A' : '#A63D40' }};
        line-height: 64px; font-size: 24px; font-weight: bold; color: {{ $json.aiScore >= 90 ? '#4A7C59' : $json.aiScore >= 70 ? '#C4883A' : '#A63D40' }};">
        {{ $json.aiScore }}
      </div>
      <p style="font-weight: bold; color: {{ $json.aiPass ? '#4A7C59' : '#A63D40' }};">
        {{ $json.aiPass ? '✓ APPROVED' : '⚠ REVISION NEEDED' }}
      </p>
    </div>
    <p>{{ $json.summary }}</p>
    <h3 style="color: #9E7E38;">Details:</h3>
    {{ $json.issues.map(i => '<p>' + (i.type === 'error' ? '🔴' : i.type === 'warning' ? '🟡' : i.type === 'suggestion' ? '💡' : '🔵') + ' ' + i.message + '</p>').join('') }}
    {{ !$json.aiPass ? '<p style="margin-top: 20px; padding: 12px; background: #FEF9F0; border-radius: 8px;">Please revise and resubmit using <code>/submit</code> or the dashboard.</p>' : '' }}
  </div>
</div>`
      },
      "name": "Send AI Audit to Writer",
      "type": "n8n-nodes-base.gmail",
      "position": [1250, 300]
    },

    // ── Compile: Check if all sections approved ──
    {
      "parameters": {
        "jsCode": `
const sheets = $input.all();
const allApproved = sheets.every(s => s.json.status === 'APPROVED');
const approvedCount = sheets.filter(s => s.json.status === 'APPROVED').length;

return [{
  json: {
    allApproved,
    approvedCount,
    totalSections: sheets.length,
    readyToCompile: allApproved
  }
}];
`
      },
      "name": "Check All Sections Approved",
      "type": "n8n-nodes-base.code",
      "position": [1500, 400]
    },

    // ── Gmail: Notify editors newsletter is ready ──
    {
      "parameters": {
        "sendTo": "editors@divinity.wfu.edu",
        "subject": "✅ Moral Imagination Newsletter — Ready to Compile!",
        "emailType": "html",
        "message": `
<div style="font-family: Georgia, serif; max-width: 600px;">
  <div style="background: #000; padding: 20px; text-align: center;">
    <h1 style="color: #9E7E38;">✅ All Sections Approved</h1>
  </div>
  <div style="padding: 24px; text-align: center; border: 1px solid #E8E4DE;">
    <p style="font-size: 18px;">All {{ $json.totalSections }} sections have been approved.</p>
    <p>Use <code>/compile</code> to generate the final newsletter, or visit the dashboard.</p>
  </div>
</div>`
      },
      "name": "Notify Editors — Ready",
      "type": "n8n-nodes-base.gmail",
      "position": [1750, 400]
    }
  ],

  "connections": {
    "Webhook — Section Submission": { "main": [[ { "node": "Claude AI QA Review", "type": "main", "index": 0 } ]] },
    "Claude AI QA Review": { "main": [[ { "node": "Parse AI Review", "type": "main", "index": 0 } ]] },
    "Parse AI Review": { "main": [[ 
      { "node": "Update Contributor Status", "type": "main", "index": 0 },
      { "node": "Send AI Audit to Writer", "type": "main", "index": 0 }
    ]] },
    "Cron — Daily 9AM Reminder Check": { "main": [[ { "node": "Read Contributors Sheet", "type": "main", "index": 0 } ]] },
    "Read Contributors Sheet": { "main": [[ { "node": "Check Deadlines", "type": "main", "index": 0 } ]] },
    "Check Deadlines": { "main": [[ { "node": "Has Late Contributors?", "type": "main", "index": 0 } ]] },
    "Has Late Contributors?": { 
      "main": [
        [ { "node": "Escalate to Editors", "type": "main", "index": 0 } ],
        [ { "node": "Send Contributor Reminder", "type": "main", "index": 0 } ]
      ]
    }
  }
};


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: GOOGLE APPS SCRIPT — Cron Jobs & Sheet Management
// ─────────────────────────────────────────────────────────────────────────────
// Deploy this in Google Apps Script (script.google.com)
// Attach to the Newsletter Management Google Sheet

const GOOGLE_APPS_SCRIPT = `
// ============================================================================
// MORAL IMAGINATION NEWSLETTER — Google Apps Script
// Wake Forest University School of Divinity
// ============================================================================
// 
// SETUP:
// 1. Create a Google Sheet with tabs: Contributors, Issues, Archive, Config
// 2. Open Extensions → Apps Script
// 3. Paste this code
// 4. Set up time-driven triggers (see bottom of file)
// ============================================================================

const CONFIG = {
  SPREADSHEET_ID: SpreadsheetApp.getActiveSpreadsheet().getId(),
  N8N_WEBHOOK_URL: 'YOUR_N8N_WEBHOOK_URL',
  EDITOR_EMAILS: ['editor1@wfu.edu', 'editor2@wfu.edu'],
  ANTHROPIC_API_KEY: PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY'),
  NEWSLETTER_NAME: 'Moral Imagination',
  SECTIONS: [
    { id: 'dean_letter', title: 'Letter from the Dean', wordLimit: 400 },
    { id: 'book_club', title: 'Book Club', wordLimit: 250 },
    { id: 'community_events', title: 'Community Events', wordLimit: 300 },
    { id: 'art_poetry', title: 'Art / Poetry / Crafts', wordLimit: 250 },
    { id: 'moral_dialog', title: 'Moral Dialog of the Week', wordLimit: 350 },
    { id: 'health_note', title: 'Health Note', wordLimit: 200 },
    { id: 'spiritual_formation', title: 'Spiritual Formation Connection', wordLimit: 300 },
    { id: 'biblical_interpretation', title: 'Biblical Interpretation', wordLimit: 300 },
    { id: 'impact_highlight', title: 'Impact & Service Highlight', wordLimit: 350 },
  ]
};

// ─── CRON JOB: Daily Deadline Check (runs at 9 AM) ───
function dailyDeadlineCheck() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Contributors');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const today = new Date();
  
  const statusCol = headers.indexOf('Status');
  const deadlineCol = headers.indexOf('Deadline');
  const emailCol = headers.indexOf('Email');
  const nameCol = headers.indexOf('Contributor');
  const sectionCol = headers.indexOf('Section');
  const wordLimitCol = headers.indexOf('Word Limit');
  
  const reminders = [];
  const escalations = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const status = row[statusCol];
    const deadline = new Date(row[deadlineCol]);
    const daysUntil = Math.ceil((deadline - today) / 86400000);
    
    if (status === 'APPROVED' || status === 'SUBMITTED' || status === 'AI_REVIEW') continue;
    
    if (daysUntil < 0) {
      // LATE — escalate to editors
      escalations.push({
        name: row[nameCol],
        email: row[emailCol],
        section: row[sectionCol],
        daysLate: Math.abs(daysUntil)
      });
      // Update status to LATE
      sheet.getRange(i + 1, statusCol + 1).setValue('LATE');
    } else if (daysUntil <= 3) {
      reminders.push({
        name: row[nameCol],
        email: row[emailCol],
        section: row[sectionCol],
        wordLimit: row[wordLimitCol],
        daysLeft: daysUntil,
        urgency: 'URGENT'
      });
    } else if (daysUntil <= 7) {
      reminders.push({
        name: row[nameCol],
        email: row[emailCol],
        section: row[sectionCol],
        wordLimit: row[wordLimitCol],
        daysLeft: daysUntil,
        urgency: 'GENTLE'
      });
    }
  }
  
  // Send reminders
  reminders.forEach(r => sendReminderEmail(r));
  
  // Escalate late items
  if (escalations.length > 0) {
    sendEscalationEmail(escalations);
  }
  
  Logger.log('Deadline check complete. Reminders: ' + reminders.length + ', Escalations: ' + escalations.length);
}

// ─── Send styled reminder email ───
function sendReminderEmail(contributor) {
  const subject = contributor.urgency === 'URGENT' 
    ? '⚠️ URGENT: Your Moral Imagination Section is Due in ' + contributor.daysLeft + ' Days'
    : '📝 Reminder: Moral Imagination Newsletter — ' + contributor.section;
  
  const htmlBody = \`
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #000000; padding: 24px; text-align: center; border-top: 3px solid #9E7E38;">
        <div style="color: #B3A999; font-size: 11px; letter-spacing: 3px; text-transform: uppercase;">Wake Forest University School of Divinity</div>
        <h1 style="color: #9E7E38; margin: 8px 0 0; font-size: 28px;">Moral Imagination</h1>
      </div>
      <div style="padding: 28px; background: #FFFFFF; border: 1px solid #E8E4DE;">
        <p style="color: #1A1A1A;">Dear \${contributor.name},</p>
        <p style="color: #1A1A1A; line-height: 1.7;">This is a \${contributor.urgency === 'URGENT' ? '<strong style="color: #A63D40;">urgent</strong>' : 'friendly'} 
        reminder that your section <strong style="color: #9E7E38;">"\${contributor.section}"</strong> 
        for the Moral Imagination newsletter is due in <strong>\${contributor.daysLeft} day(s)</strong>.</p>
        <div style="background: #F5F0E5; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <strong>Section:</strong> \${contributor.section}<br>
          <strong>Word Limit:</strong> \${contributor.wordLimit} words<br>
          <strong>Submit via:</strong> Dashboard or <code>/submit</code> command
        </div>
        <p style="color: #5C574F; font-size: 14px;">Thank you for your contribution to our community,<br>
        <em>— The Moral Imagination Editorial Team</em></p>
      </div>
      <div style="background: #000000; padding: 16px; text-align: center;">
        <div style="color: #B3A999; font-size: 11px;">Wake Forest University School of Divinity · Winston-Salem, NC</div>
      </div>
    </div>
  \`;
  
  GmailApp.sendEmail(contributor.email, subject, '', { htmlBody: htmlBody });
}

// ─── Send escalation email to editors ───
function sendEscalationEmail(lateContributors) {
  const tableRows = lateContributors.map(c => 
    '<tr><td style="padding:10px;border:1px solid #D5D0C8;">' + c.section + 
    '</td><td style="padding:10px;border:1px solid #D5D0C8;">' + c.name + 
    '</td><td style="padding:10px;border:1px solid #D5D0C8;">' + c.email + 
    '</td><td style="padding:10px;border:1px solid #D5D0C8;color:#A63D40;font-weight:bold;">' + c.daysLate + ' days</td></tr>'
  ).join('');
  
  const htmlBody = \`
    <div style="font-family: Georgia, serif; max-width: 600px;">
      <div style="background: #000; padding: 20px; text-align: center; border-top: 3px solid #A63D40;">
        <h1 style="color: #A63D40; margin: 0; font-size: 22px;">⚠️ Late Section Alert</h1>
        <p style="color: #B3A999; margin: 4px 0 0; font-size: 12px;">Moral Imagination Newsletter</p>
      </div>
      <div style="padding: 24px; border: 1px solid #E8E4DE;">
        <p>The following contributor(s) have missed their deadline:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr style="background: #F5F0E5;">
            <th style="padding:10px;text-align:left;border:1px solid #D5D0C8;">Section</th>
            <th style="padding:10px;text-align:left;border:1px solid #D5D0C8;">Contributor</th>
            <th style="padding:10px;text-align:left;border:1px solid #D5D0C8;">Email</th>
            <th style="padding:10px;text-align:left;border:1px solid #D5D0C8;">Days Late</th>
          </tr>
          \${tableRows}
        </table>
        <p><strong>Recommended Actions:</strong></p>
        <ul>
          <li>Contact the contributor directly</li>
          <li>Use <code>/reassign [section] @new-contributor</code> to transfer</li>
          <li>Use <code>/deadline [section] [new-date]</code> to extend</li>
        </ul>
      </div>
    </div>
  \`;
  
  CONFIG.EDITOR_EMAILS.forEach(email => {
    GmailApp.sendEmail(email, '⚠️ Late Sections — Moral Imagination Newsletter', '', { htmlBody: htmlBody });
  });
}

// ─── AI QA Review via Claude API ───
function runAIReview(sectionId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Contributors');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const sectionCol = headers.indexOf('Section ID');
  const contentCol = headers.indexOf('Content');
  const titleCol = headers.indexOf('Section');
  const wordLimitCol = headers.indexOf('Word Limit');
  
  let rowIndex = -1;
  let sectionData = null;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][sectionCol] === sectionId) {
      rowIndex = i;
      sectionData = {
        title: data[i][titleCol],
        wordLimit: data[i][wordLimitCol],
        content: data[i][contentCol]
      };
      break;
    }
  }
  
  if (!sectionData || !sectionData.content) {
    Logger.log('No content found for section: ' + sectionId);
    return;
  }
  
  const payload = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: 'You are the AI QA agent for the Moral Imagination newsletter. Review the content and return ONLY a JSON object with: score (0-100), pass (boolean), summary (string), issues (array of {type, message}), wordCount (number), recommendedAction (APPROVE/REVISE/REJECT).',
    messages: [{
      role: 'user',
      content: 'Review this section:\\nTitle: ' + sectionData.title + '\\nWord Limit: ' + sectionData.wordLimit + '\\nContent:\\n' + sectionData.content
    }]
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': CONFIG.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    payload: JSON.stringify(payload)
  };
  
  const response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', options);
  const result = JSON.parse(response.getContentText());
  const review = JSON.parse(result.content[0].text);
  
  // Update the sheet
  const statusCol = headers.indexOf('Status');
  const scoreCol = headers.indexOf('AI Score');
  const reviewCol = headers.indexOf('AI Review');
  
  sheet.getRange(rowIndex + 1, statusCol + 1).setValue(review.pass ? 'APPROVED' : 'REVISION_NEEDED');
  sheet.getRange(rowIndex + 1, scoreCol + 1).setValue(review.score);
  sheet.getRange(rowIndex + 1, reviewCol + 1).setValue(JSON.stringify(review));
  
  return review;
}

// ─── Reassign a section to a new contributor ───
function reassignSection(sectionId, newContributorName, newContributorEmail) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Contributors');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const sectionCol = headers.indexOf('Section ID');
  const nameCol = headers.indexOf('Contributor');
  const emailCol = headers.indexOf('Email');
  const statusCol = headers.indexOf('Status');
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][sectionCol] === sectionId) {
      const oldName = data[i][nameCol];
      sheet.getRange(i + 1, nameCol + 1).setValue(newContributorName);
      sheet.getRange(i + 1, emailCol + 1).setValue(newContributorEmail);
      sheet.getRange(i + 1, statusCol + 1).setValue('NOT_STARTED');
      
      // Notify the new contributor
      sendWelcomeEmail(newContributorEmail, newContributorName, data[i][headers.indexOf('Section')], data[i][headers.indexOf('Word Limit')], data[i][headers.indexOf('Deadline')]);
      
      // Notify editors
      CONFIG.EDITOR_EMAILS.forEach(email => {
        GmailApp.sendEmail(email, 
          'Section Reassigned — Moral Imagination', 
          'Section "' + data[i][headers.indexOf('Section')] + '" has been reassigned from ' + oldName + ' to ' + newContributorName + '.'
        );
      });
      
      Logger.log('Reassigned ' + sectionId + ' from ' + oldName + ' to ' + newContributorName);
      return true;
    }
  }
  return false;
}

// ─── Welcome email for new/reassigned contributors ───
function sendWelcomeEmail(email, name, section, wordLimit, deadline) {
  const htmlBody = \`
    <div style="font-family: Georgia, serif; max-width: 600px;">
      <div style="background: #000; padding: 24px; text-align: center; border-top: 3px solid #9E7E38;">
        <div style="color: #B3A999; font-size: 11px; letter-spacing: 3px;">WAKE FOREST UNIVERSITY SCHOOL OF DIVINITY</div>
        <h1 style="color: #9E7E38; margin: 8px 0 0;">Moral Imagination</h1>
      </div>
      <div style="padding: 28px; border: 1px solid #E8E4DE;">
        <p>Dear \${name},</p>
        <p>You have been assigned to write the <strong style="color: #9E7E38;">"\${section}"</strong> section for the upcoming issue of the Moral Imagination newsletter.</p>
        <div style="background: #F5F0E5; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <strong>Section:</strong> \${section}<br>
          <strong>Word Limit:</strong> \${wordLimit} words<br>
          <strong>Deadline:</strong> \${deadline}<br>
          <strong>Submit via:</strong> Dashboard or <code>/submit</code> command
        </div>
        <p>Thank you for contributing to our community's ongoing conversation.</p>
        <p style="color: #5C574F;"><em>— The Moral Imagination Editorial Team</em></p>
      </div>
    </div>
  \`;
  
  GmailApp.sendEmail(email, 'Welcome — Moral Imagination Newsletter Assignment', '', { htmlBody: htmlBody });
}

// ─── Check if all sections are approved ───
function checkCompileReady() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Contributors');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const statusCol = headers.indexOf('Status');
  
  let allApproved = true;
  let approvedCount = 0;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][statusCol] === 'APPROVED') {
      approvedCount++;
    } else {
      allApproved = false;
    }
  }
  
  if (allApproved) {
    CONFIG.EDITOR_EMAILS.forEach(email => {
      GmailApp.sendEmail(email,
        '✅ All Sections Approved — Ready to Compile!',
        'All ' + approvedCount + ' sections are approved. Use /compile to generate the newsletter.'
      );
    });
  }
  
  return { allApproved, approvedCount, total: data.length - 1 };
}

// ─── Archive completed newsletter ───
function archiveIssue(issueId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const contributors = ss.getSheetByName('Contributors');
  const archive = ss.getSheetByName('Archive');
  
  const data = contributors.getDataRange().getValues();
  const timestamp = new Date().toISOString();
  
  for (let i = 1; i < data.length; i++) {
    archive.appendRow([issueId, timestamp, ...data[i]]);
  }
  
  Logger.log('Issue ' + issueId + ' archived successfully.');
}

// ─── SETUP TRIGGERS ───
// Run this function once to set up all time-driven triggers
function setupTriggers() {
  // Delete existing triggers
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  
  // Daily deadline check at 9 AM
  ScriptApp.newTrigger('dailyDeadlineCheck')
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .create();
  
  // Check compile readiness every 2 hours
  ScriptApp.newTrigger('checkCompileReady')
    .timeBased()
    .everyHours(2)
    .create();
  
  Logger.log('Triggers set up successfully.');
}

// ─── SHEET SETUP ───
// Run once to initialize the spreadsheet structure
function initializeSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Contributors tab
  let sheet = ss.getSheetByName('Contributors') || ss.insertSheet('Contributors');
  sheet.getRange(1, 1, 1, 12).setValues([[
    'Section ID', 'Section', 'Contributor', 'Email', 'Word Limit',
    'Deadline', 'Status', 'Content', 'AI Score', 'AI Review',
    'Submitted At', 'Notes'
  ]]);
  sheet.getRange(1, 1, 1, 12).setBackground('#000000').setFontColor('#9E7E38').setFontWeight('bold');
  
  // Populate default sections
  CONFIG.SECTIONS.forEach((s, i) => {
    sheet.getRange(i + 2, 1).setValue(s.id);
    sheet.getRange(i + 2, 2).setValue(s.title);
    sheet.getRange(i + 2, 5).setValue(s.wordLimit);
    sheet.getRange(i + 2, 7).setValue('NOT_STARTED');
  });
  
  // Archive tab
  let archive = ss.getSheetByName('Archive') || ss.insertSheet('Archive');
  archive.getRange(1, 1, 1, 14).setValues([[
    'Issue ID', 'Archived At', 'Section ID', 'Section', 'Contributor', 'Email',
    'Word Limit', 'Deadline', 'Status', 'Content', 'AI Score', 'AI Review',
    'Submitted At', 'Notes'
  ]]);
  archive.getRange(1, 1, 1, 14).setBackground('#000000').setFontColor('#9E7E38').setFontWeight('bold');
  
  // Config tab
  let config = ss.getSheetByName('Config') || ss.insertSheet('Config');
  config.getRange(1, 1, 4, 2).setValues([
    ['Setting', 'Value'],
    ['Current Issue ID', 'MI-2026-03'],
    ['Default Deadline', '14 days from assignment'],
    ['Editor Emails', CONFIG.EDITOR_EMAILS.join(', ')]
  ]);
  config.getRange(1, 1, 1, 2).setBackground('#000000').setFontColor('#9E7E38').setFontWeight('bold');
  
  Logger.log('Spreadsheet initialized.');
}
`;


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: SYSTEM ARCHITECTURE DOCUMENTATION
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_DOCS = `
# MORAL IMAGINATION NEWSLETTER SYSTEM
## Wake Forest University School of Divinity
## Complete Architecture & Setup Guide

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## OVERVIEW

The Moral Imagination newsletter is a 4+ page publication produced by the 
WFU School of Divinity. This system automates the entire editorial pipeline 
from contributor assignment through final distribution.

### System Components:
1. **React Dashboard** — Visual management interface for editors
2. **Google Sheets** — Central data store for contributors, content, and config
3. **Google Apps Script** — Cron jobs for reminders, escalations, and automation
4. **n8n Workflows** — Event-driven automation (webhooks, AI review, compilation)
5. **Claude AI Agent** — Quality assurance, tone review, and content auditing
6. **DOCX Template Generator** — Produces print-ready newsletter from template

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## SECTIONS & WORD LIMITS

| # | Section                          | Word Limit | Required |
|---|----------------------------------|------------|----------|
| 1 | Letter from the Dean             | 400        | Yes      |
| 2 | Book Club                        | 250        | Yes      |
| 3 | Community Events                 | 300        | Yes      |
| 4 | Art / Poetry / Crafts            | 250        | Yes      |
| 5 | Moral Dialog of the Week         | 350        | Yes      |
| 6 | Health Note                      | 200        | Yes      |
| 7 | Spiritual Formation Connection   | 300        | Yes      |
| 8 | Biblical Interpretation          | 300        | Yes      |
| 9 | Impact & Service Highlight       | 350        | Yes      |

Total estimated: ~2,700 words → fits comfortably in 4 pages with 
headers, images, and formatting.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## WORKFLOW

1. ASSIGN → Editor assigns contributors via dashboard or /assign command
2. WRITE → Contributors write their section within word limits
3. SUBMIT → Content submitted via webhook, form, or /submit command
4. AI QA → Claude AI reviews for tone, accuracy, word count, style
5. REVISE → If needed, writer receives AI audit and revises
6. APPROVE → Editor gives final approval (or AI auto-approves scores 90+)
7. COMPILE → All sections merged into DOCX/PDF newsletter template
8. PUBLISH → Distributed to email list; archived in Google Drive

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## ALERT SYSTEM

### Contributor Reminders:
- 7 days before deadline: Gentle reminder email
- 3 days before deadline: Urgent reminder email  
- 1 day before deadline: Final warning email
- Deadline day: Marked as LATE

### Editor Escalations:
- Deadline + 0: Immediate notification of late sections
- Deadline + 2: Reassignment recommendation sent
- Includes direct links to /reassign command

### Completion Alerts:
- When all sections are approved: "Ready to Compile" notification
- After compilation: Preview link sent to all editors
- After publication: Archive confirmation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## SLASH COMMANDS

| Command      | Description                              |
|--------------|------------------------------------------|
| /submit      | Submit section content                   |
| /status      | View all section statuses                |
| /remind      | Send reminder to a contributor           |
| /reassign    | Transfer section to new writer           |
| /audit       | Trigger AI review on a section           |
| /approve     | Manually approve a section               |
| /preview     | Generate newsletter preview              |
| /compile     | Compile all sections into final          |
| /deadline    | Set or update deadline                   |
| /export      | Export as DOCX/PDF/HTML                  |
| /notify      | Alert all late contributors              |
| /archive     | Archive completed issue                  |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## SETUP INSTRUCTIONS

### Step 1: Google Sheet
1. Create new Google Sheet: "Moral Imagination Newsletter"
2. Open Extensions → Apps Script
3. Paste the Google Apps Script code
4. Run initializeSheet() to create tab structure
5. Run setupTriggers() to enable cron jobs
6. Add Anthropic API key: Script Properties → ANTHROPIC_API_KEY

### Step 2: n8n Workflows
1. Import the n8n workflow JSON
2. Configure credentials:
   - Google Sheets OAuth2
   - Gmail OAuth2
   - Anthropic API key
3. Update SPREADSHEET_ID in the workflow
4. Activate all trigger nodes

### Step 3: Dashboard
1. Deploy the React dashboard (or use as embedded artifact)
2. Connect to Google Sheets API for real-time data
3. Share dashboard URL with editors

### Step 4: Contributor Onboarding
1. Add contributors to the Google Sheet
2. System automatically sends welcome email with instructions
3. Contributors receive their section details and deadline

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

// Export for reference
module.exports = { N8N_WORKFLOW, GOOGLE_APPS_SCRIPT, SYSTEM_DOCS };
