import { useState, useEffect, useCallback } from "react";

// ─── WFU Color System from their website ───
const COLORS = {
  black: "#000000",
  gold: "#9E7E38",
  goldLight: "#C4A95B",
  goldPale: "#F5F0E5",
  warmGray: "#B3A999",
  darkGray: "#3D3935",
  cream: "#FAF8F3",
  white: "#FFFFFF",
  accent: "#8B6914",
  textPrimary: "#1A1A1A",
  textSecondary: "#5C574F",
  success: "#4A7C59",
  warning: "#C4883A",
  danger: "#A63D40",
  info: "#4A6FA5",
};

// ─── Section Definitions ───
const SECTIONS = [
  { id: "dean_letter", title: "Letter from the Dean", wordLimit: 400, icon: "✉", required: true },
  { id: "book_club", title: "Book Club", wordLimit: 250, icon: "📖", required: true },
  { id: "community_events", title: "Community Events", wordLimit: 300, icon: "🗓", required: true },
  { id: "art_poetry", title: "Art / Poetry / Crafts", wordLimit: 250, icon: "🎨", required: true },
  { id: "moral_dialog", title: "Moral Dialog of the Week", wordLimit: 350, icon: "💬", required: true },
  { id: "health_note", title: "Health Note", wordLimit: 200, icon: "❤", required: true },
  { id: "spiritual_formation", title: "Spiritual Formation Connection", wordLimit: 300, icon: "✦", required: true },
  { id: "biblical_interpretation", title: "Biblical Interpretation", wordLimit: 300, icon: "📜", required: true },
  { id: "impact_highlight", title: "Impact & Service Highlight", wordLimit: 350, icon: "⭐", required: true },
];

const STATUS = {
  NOT_STARTED: { label: "Not Started", color: COLORS.warmGray, bg: "#F0EDE8" },
  IN_PROGRESS: { label: "In Progress", color: COLORS.info, bg: "#EBF0F7" },
  SUBMITTED: { label: "Submitted", color: COLORS.gold, bg: "#FBF5E8" },
  AI_REVIEW: { label: "AI Review", color: "#7B5EA7", bg: "#F3EFF8" },
  REVISION_NEEDED: { label: "Revision Needed", color: COLORS.warning, bg: "#FDF3E6" },
  APPROVED: { label: "Approved", color: COLORS.success, bg: "#EBF3ED" },
  LATE: { label: "Late", color: COLORS.danger, bg: "#FAEAEA" },
};

// ─── Mock Data ───
const MOCK_ISSUE = {
  id: "MI-2026-03",
  title: "Moral Imagination — March 2026",
  deadline: "2026-03-14",
  publishDate: "2026-03-17",
  status: "in_progress",
  editors: ["Dr. Sarah Mitchell", "Rev. James Park"],
  sections: [
    { ...SECTIONS[0], contributor: "Dean Corey D.B. Walker", email: "walkercdb@wfu.edu", status: "APPROVED", submittedAt: "2026-03-08", wordCount: 385, aiScore: 96 },
    { ...SECTIONS[1], contributor: "Dr. Lisa Chen", email: "chenl@wfu.edu", status: "AI_REVIEW", submittedAt: "2026-03-10", wordCount: 238, aiScore: null },
    { ...SECTIONS[2], contributor: "Maria Gonzalez", email: "gonzam@wfu.edu", status: "SUBMITTED", submittedAt: "2026-03-11", wordCount: 290, aiScore: null },
    { ...SECTIONS[3], contributor: "Prof. David Artis", email: "artisd@wfu.edu", status: "IN_PROGRESS", submittedAt: null, wordCount: 0, aiScore: null },
    { ...SECTIONS[4], contributor: "Dr. Amanda Foster", email: "fostera@wfu.edu", status: "APPROVED", submittedAt: "2026-03-07", wordCount: 340, aiScore: 94 },
    { ...SECTIONS[5], contributor: "Nurse Practitioner Kim Taylor", email: "taylork@wfu.edu", status: "REVISION_NEEDED", submittedAt: "2026-03-09", wordCount: 215, aiScore: 72 },
    { ...SECTIONS[6], contributor: "Chaplain Robert Owens", email: "owensr@wfu.edu", status: "NOT_STARTED", submittedAt: null, wordCount: 0, aiScore: null },
    { ...SECTIONS[7], contributor: "Dr. Hannah Ross", email: "rossh@wfu.edu", status: "LATE", submittedAt: null, wordCount: 0, aiScore: null },
    { ...SECTIONS[8], contributor: "Student Body Rep. Aiden Brooks", email: "brooka@wfu.edu", status: "SUBMITTED", submittedAt: "2026-03-11", wordCount: 328, aiScore: null },
  ],
};

const AI_AUDIT_EXAMPLE = {
  section: "Health Note",
  contributor: "Nurse Practitioner Kim Taylor",
  score: 72,
  summary: "Content is relevant and well-written but exceeds word limit and contains a factual claim that needs a citation.",
  issues: [
    { type: "warning", message: "Word count (215) exceeds the 200-word limit by 15 words. Please trim." },
    { type: "error", message: "Paragraph 2: The claim about 'meditation reducing cortisol by 40%' requires a citation." },
    { type: "info", message: "Tone matches the newsletter style guide well." },
    { type: "suggestion", message: "Consider adding a call-to-action for the campus wellness center." },
  ],
};

// ─── Components ───

function WFULogo() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="4" fill={COLORS.black} />
      <text x="20" y="16" textAnchor="middle" fill={COLORS.gold} fontSize="9" fontWeight="700" fontFamily="Georgia, serif">
        WFU
      </text>
      <line x1="8" y1="20" x2="32" y2="20" stroke={COLORS.gold} strokeWidth="0.5" />
      <text x="20" y="30" textAnchor="middle" fill={COLORS.white} fontSize="5.5" fontFamily="Georgia, serif">
        DIVINITY
      </text>
    </svg>
  );
}

function StatusBadge({ status }) {
  const s = STATUS[status];
  if (!s) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 12px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        color: s.color,
        background: s.bg,
        letterSpacing: "0.02em",
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: s.color,
          flexShrink: 0,
        }}
      />
      {s.label}
    </span>
  );
}

function ProgressRing({ value, size = 52, stroke = 4 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  const color = value >= 90 ? COLORS.success : value >= 70 ? COLORS.warning : COLORS.danger;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E8E4DE" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill={COLORS.textPrimary}
        fontSize={13}
        fontWeight={700}
        style={{ transform: "rotate(90deg)", transformOrigin: "center" }}
      >
        {value}%
      </text>
    </svg>
  );
}

function SectionCard({ section, onAction }) {
  const [expanded, setExpanded] = useState(false);
  const daysLeft = Math.ceil((new Date("2026-03-14") - new Date()) / 86400000);
  const wordPct = Math.min(100, Math.round((section.wordCount / section.wordLimit) * 100));
  const isOverLimit = section.wordCount > section.wordLimit;

  return (
    <div
      style={{
        background: COLORS.white,
        borderRadius: 12,
        border: `1px solid ${section.status === "LATE" ? COLORS.danger + "40" : "#E8E4DE"}`,
        overflow: "hidden",
        transition: "box-shadow 0.2s, border-color 0.2s",
        boxShadow: expanded ? "0 8px 24px rgba(0,0,0,0.08)" : "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: "16px 20px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 16,
          userSelect: "none",
        }}
      >
        <span style={{ fontSize: 22, width: 36, textAlign: "center", flexShrink: 0 }}>{section.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: COLORS.textPrimary, fontFamily: "'Playfair Display', Georgia, serif" }}>
              {section.title}
            </span>
            <StatusBadge status={section.status} />
          </div>
          <div style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 3 }}>
            {section.contributor} · {section.wordCount}/{section.wordLimit} words
          </div>
        </div>
        {section.aiScore !== null && <ProgressRing value={section.aiScore} size={44} stroke={3.5} />}
        <span
          style={{
            fontSize: 18,
            color: COLORS.warmGray,
            transition: "transform 0.2s",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          ▾
        </span>
      </div>

      {expanded && (
        <div
          style={{
            padding: "0 20px 20px",
            borderTop: `1px solid #F0EDE8`,
            marginTop: 0,
            animation: "fadeIn 0.2s ease",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
            <InfoItem label="Email" value={section.email} />
            <InfoItem label="Submitted" value={section.submittedAt || "—"} />
            <InfoItem label="Word Limit" value={`${section.wordLimit} words`} />
            <InfoItem
              label="Word Count"
              value={`${section.wordCount} ${isOverLimit ? "(OVER LIMIT)" : ""}`}
              valueColor={isOverLimit ? COLORS.danger : undefined}
            />
          </div>

          {/* Word count bar */}
          <div style={{ marginTop: 14 }}>
            <div style={{ height: 6, background: "#F0EDE8", borderRadius: 3, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(wordPct, 100)}%`,
                  background: isOverLimit ? COLORS.danger : wordPct > 90 ? COLORS.gold : COLORS.success,
                  borderRadius: 3,
                  transition: "width 0.5s ease",
                }}
              />
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            {section.status === "NOT_STARTED" || section.status === "LATE" ? (
              <>
                <ActionBtn label="Send Reminder" icon="🔔" onClick={() => onAction("reminder", section)} />
                <ActionBtn label="Reassign" icon="🔄" variant="outline" onClick={() => onAction("reassign", section)} />
              </>
            ) : section.status === "SUBMITTED" ? (
              <>
                <ActionBtn label="Run AI Review" icon="🤖" onClick={() => onAction("ai_review", section)} />
                <ActionBtn label="Preview" icon="👁" variant="outline" onClick={() => onAction("preview", section)} />
              </>
            ) : section.status === "AI_REVIEW" ? (
              <ActionBtn label="View AI Audit" icon="📋" onClick={() => onAction("view_audit", section)} />
            ) : section.status === "REVISION_NEEDED" ? (
              <>
                <ActionBtn label="View AI Audit" icon="📋" onClick={() => onAction("view_audit", section)} />
                <ActionBtn label="Send Feedback" icon="📧" variant="outline" onClick={() => onAction("send_feedback", section)} />
              </>
            ) : section.status === "APPROVED" ? (
              <ActionBtn label="View Final" icon="✓" variant="success" onClick={() => onAction("view_final", section)} />
            ) : (
              <ActionBtn label="Check In" icon="💬" variant="outline" onClick={() => onAction("checkin", section)} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value, valueColor }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: COLORS.warmGray, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: valueColor || COLORS.textPrimary, fontWeight: 500 }}>{value}</div>
    </div>
  );
}

function ActionBtn({ label, icon, variant = "primary", onClick }) {
  const styles = {
    primary: { background: COLORS.black, color: COLORS.gold, border: "none" },
    outline: { background: "transparent", color: COLORS.textPrimary, border: `1.5px solid #D5D0C8` },
    success: { background: COLORS.success, color: COLORS.white, border: "none" },
    danger: { background: COLORS.danger, color: COLORS.white, border: "none" },
  };
  const s = styles[variant];
  return (
    <button
      onClick={onClick}
      style={{
        ...s,
        padding: "8px 16px",
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        transition: "opacity 0.15s",
      }}
      onMouseEnter={(e) => (e.target.style.opacity = 0.85)}
      onMouseLeave={(e) => (e.target.style.opacity = 1)}
    >
      <span style={{ fontSize: 14 }}>{icon}</span>
      {label}
    </button>
  );
}

function AIAuditPanel({ audit, onClose }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
        animation: "fadeIn 0.2s ease",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: COLORS.white,
          borderRadius: 16,
          maxWidth: 560,
          width: "90%",
          maxHeight: "80vh",
          overflow: "auto",
          boxShadow: "0 24px 48px rgba(0,0,0,0.15)",
        }}
      >
        <div style={{ padding: "24px 28px", borderBottom: `1px solid #F0EDE8` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ margin: 0, fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, color: COLORS.textPrimary }}>
                AI Quality Audit
              </h3>
              <p style={{ margin: "4px 0 0", fontSize: 14, color: COLORS.textSecondary }}>
                {audit.section} — {audit.contributor}
              </p>
            </div>
            <ProgressRing value={audit.score} size={56} stroke={4} />
          </div>
        </div>

        <div style={{ padding: "20px 28px" }}>
          <p style={{ fontSize: 14, color: COLORS.textPrimary, lineHeight: 1.6, margin: "0 0 20px" }}>{audit.summary}</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {audit.issues.map((issue, i) => {
              const icons = { error: "🔴", warning: "🟡", info: "🔵", suggestion: "💡" };
              const bgs = { error: "#FDF2F2", warning: "#FEF9F0", info: "#F0F4FA", suggestion: "#F8F6FE" };
              const borders = { error: "#F5C6C6", warning: "#F5DEB3", info: "#BFD4F0", suggestion: "#DDD4F0" };
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 10,
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: bgs[issue.type],
                    border: `1px solid ${borders[issue.type]}`,
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: COLORS.textPrimary,
                  }}
                >
                  <span style={{ flexShrink: 0, fontSize: 14 }}>{icons[issue.type]}</span>
                  <span>{issue.message}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ padding: "16px 28px", borderTop: `1px solid #F0EDE8`, display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <ActionBtn label="Send to Writer" icon="📧" onClick={onClose} />
          <ActionBtn label="Override & Approve" icon="✓" variant="success" onClick={onClose} />
          <ActionBtn label="Close" icon="✕" variant="outline" onClick={onClose} />
        </div>
      </div>
    </div>
  );
}

function SlashCommandPanel() {
  const commands = [
    { cmd: "/submit", desc: "Submit your section content", example: '/submit "Your article text here..."' },
    { cmd: "/status", desc: "Check the status of all sections", example: "/status" },
    { cmd: "/remind", desc: "Send reminder to a contributor", example: "/remind @chaplain-owens" },
    { cmd: "/reassign", desc: "Transfer a section to a new writer", example: "/reassign biblical-interpretation @new-writer" },
    { cmd: "/audit", desc: "Trigger AI review on a submitted section", example: "/audit health-note" },
    { cmd: "/approve", desc: "Manually approve a section", example: "/approve dean-letter" },
    { cmd: "/preview", desc: "Generate a preview of the newsletter", example: "/preview" },
    { cmd: "/compile", desc: "Compile all approved sections into final", example: "/compile" },
    { cmd: "/deadline", desc: "Set or update the deadline", example: "/deadline 2026-03-14" },
    { cmd: "/export", desc: "Export newsletter as DOCX/PDF/HTML", example: "/export pdf" },
    { cmd: "/notify", desc: "Send alerts to all late contributors", example: "/notify late" },
    { cmd: "/archive", desc: "Archive this issue to storage", example: "/archive MI-2026-03" },
  ];

  return (
    <div style={{ background: COLORS.white, borderRadius: 12, border: "1px solid #E8E4DE", overflow: "hidden" }}>
      <div
        style={{
          padding: "16px 20px",
          background: COLORS.black,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span style={{ fontSize: 18 }}>⌨</span>
        <span style={{ color: COLORS.gold, fontWeight: 700, fontSize: 15, fontFamily: "'Playfair Display', Georgia, serif" }}>
          Slash Commands
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 11,
            color: COLORS.warmGray,
            background: "rgba(255,255,255,0.08)",
            padding: "3px 10px",
            borderRadius: 12,
          }}
        >
          AI Agent Powered
        </span>
      </div>
      <div style={{ padding: 4 }}>
        {commands.map((c, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "130px 1fr 1fr",
              gap: 12,
              padding: "10px 16px",
              borderBottom: i < commands.length - 1 ? "1px solid #F5F2ED" : "none",
              alignItems: "center",
              fontSize: 13,
            }}
          >
            <code
              style={{
                color: COLORS.gold,
                fontWeight: 700,
                fontSize: 13,
                background: "#FAF8F3",
                padding: "3px 8px",
                borderRadius: 6,
                fontFamily: "'SF Mono', 'Fira Code', monospace",
              }}
            >
              {c.cmd}
            </code>
            <span style={{ color: COLORS.textPrimary }}>{c.desc}</span>
            <code style={{ fontSize: 11, color: COLORS.warmGray, fontFamily: "'SF Mono', 'Fira Code', monospace" }}>{c.example}</code>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkflowDiagram() {
  const steps = [
    { label: "Assign", icon: "👤", desc: "Editor assigns sections to contributors", color: COLORS.info },
    { label: "Write", icon: "✍", desc: "Contributors write within word limits", color: COLORS.gold },
    { label: "Submit", icon: "📤", desc: "Content submitted via /submit or form", color: COLORS.goldLight },
    { label: "AI QA", icon: "🤖", desc: "AI agent reviews tone, length, accuracy", color: "#7B5EA7" },
    { label: "Revise", icon: "🔄", desc: "Writer revises based on AI feedback", color: COLORS.warning },
    { label: "Approve", icon: "✓", desc: "Editor gives final approval", color: COLORS.success },
    { label: "Compile", icon: "📄", desc: "All sections merged into template", color: COLORS.black },
    { label: "Publish", icon: "📬", desc: "Newsletter distributed to list", color: COLORS.danger },
  ];

  return (
    <div style={{ background: COLORS.white, borderRadius: 12, border: "1px solid #E8E4DE", padding: 24 }}>
      <h3
        style={{
          margin: "0 0 20px",
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 18,
          color: COLORS.textPrimary,
        }}
      >
        Newsletter Workflow Pipeline
      </h3>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 0, overflowX: "auto", paddingBottom: 8 }}>
        {steps.map((step, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            <div style={{ textAlign: "center", width: 90 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: step.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  margin: "0 auto 8px",
                  boxShadow: `0 3px 8px ${step.color}30`,
                }}
              >
                {step.icon}
              </div>
              <div style={{ fontWeight: 700, fontSize: 12, color: COLORS.textPrimary }}>{step.label}</div>
              <div style={{ fontSize: 10, color: COLORS.textSecondary, marginTop: 3, lineHeight: 1.35, padding: "0 4px" }}>
                {step.desc}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div
                style={{
                  width: 28,
                  height: 2,
                  background: `linear-gradient(90deg, ${step.color}, ${steps[i + 1].color})`,
                  flexShrink: 0,
                  marginTop: -20,
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function NewsletterPreview() {
  return (
    <div
      style={{
        background: COLORS.white,
        borderRadius: 12,
        border: "1px solid #E8E4DE",
        overflow: "hidden",
        maxWidth: 480,
        margin: "0 auto",
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: COLORS.black,
          padding: "28px 32px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: `linear-gradient(90deg, ${COLORS.gold}, ${COLORS.goldLight}, ${COLORS.gold})`,
          }}
        />
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.25em",
            color: COLORS.warmGray,
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          Wake Forest University School of Divinity
        </div>
        <h1
          style={{
            margin: 0,
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 32,
            fontWeight: 700,
            color: COLORS.gold,
            letterSpacing: "0.02em",
          }}
        >
          Moral Imagination
        </h1>
        <div
          style={{
            width: 60,
            height: 1.5,
            background: COLORS.gold,
            margin: "12px auto 8px",
            borderRadius: 1,
          }}
        />
        <div style={{ fontSize: 13, color: COLORS.warmGray }}>March 2026 · Volume III, Issue 3</div>
      </div>

      {/* Dean Letter Preview */}
      <div style={{ padding: "24px 32px", borderBottom: `1px solid #F0EDE8` }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <span style={{ fontSize: 16 }}>✉</span>
          <h2
            style={{
              margin: 0,
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 16,
              color: COLORS.gold,
              fontWeight: 700,
            }}
          >
            Letter from the Dean
          </h2>
        </div>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            lineHeight: 1.7,
            color: COLORS.textPrimary,
            fontFamily: "Georgia, serif",
          }}
        >
          Dear members of the School of Divinity community, as we enter this season of reflection and renewal, I am reminded of the
          transformative power of moral imagination in our shared life together. Our commitment to justice, compassion, and
          truth-telling continues to guide our work...
        </p>
        <p
          style={{
            margin: "10px 0 0",
            fontSize: 12,
            color: COLORS.textSecondary,
            fontStyle: "italic",
          }}
        >
          — Dean Corey D.B. Walker
        </p>
      </div>

      {/* Sections preview */}
      {[
        { icon: "📖", title: "Book Club", preview: "This month we explore 'The Color of Compromise' by Jemar Tisby..." },
        { icon: "💬", title: "Moral Dialog of the Week", preview: "How do we balance institutional loyalty with prophetic witness?..." },
        { icon: "❤", title: "Health Note", preview: "Spring wellness tips for mind, body, and spirit during midterms..." },
      ].map((s, i) => (
        <div key={i} style={{ padding: "16px 32px", borderBottom: "1px solid #F0EDE8" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 14 }}>{s.icon}</span>
            <h3
              style={{
                margin: 0,
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 14,
                color: COLORS.gold,
                fontWeight: 600,
              }}
            >
              {s.title}
            </h3>
          </div>
          <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: COLORS.textSecondary, fontFamily: "Georgia, serif" }}>
            {s.preview}
          </p>
        </div>
      ))}

      {/* Footer */}
      <div style={{ background: COLORS.black, padding: "20px 32px", textAlign: "center" }}>
        <div style={{ fontSize: 11, color: COLORS.warmGray, letterSpacing: "0.05em" }}>
          Wake Forest University School of Divinity · Winston-Salem, NC
        </div>
        <div style={{ fontSize: 10, color: "#5C574F", marginTop: 4 }}>
          divinity.wfu.edu · Unsubscribe
        </div>
      </div>
    </div>
  );
}

function AutomationPanel() {
  const automations = [
    {
      name: "Deadline Reminder Cron",
      trigger: "Daily at 9 AM EST",
      desc: "Checks deadline proximity. Sends gentle reminders 7 days out, urgent reminders 3 days out, and escalation alerts on deadline day.",
      status: "active",
    },
    {
      name: "AI QA Agent",
      trigger: "On section submission",
      desc: "Claude AI reviews for word count, tone consistency, factual claims, style guide adherence. Generates audit report.",
      status: "active",
    },
    {
      name: "Late Contributor Alert",
      trigger: "Deadline + 1 day",
      desc: "Notifies editors/leadership when a section is past due. Includes reassignment recommendation.",
      status: "active",
    },
    {
      name: "Auto-Compile Newsletter",
      trigger: "All sections approved",
      desc: "Merges all approved sections into the newsletter template. Generates DOCX, PDF, and HTML versions.",
      status: "standby",
    },
    {
      name: "Archive & Distribute",
      trigger: "On /publish command",
      desc: "Stores final version in Google Drive archive. Sends to email list via Mailchimp/SendGrid.",
      status: "standby",
    },
  ];

  return (
    <div style={{ background: COLORS.white, borderRadius: 12, border: "1px solid #E8E4DE", overflow: "hidden" }}>
      <div
        style={{
          padding: "16px 20px",
          background: `linear-gradient(135deg, ${COLORS.black} 0%, #2A2622 100%)`,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span style={{ fontSize: 18 }}>⚡</span>
        <span style={{ color: COLORS.gold, fontWeight: 700, fontSize: 15, fontFamily: "'Playfair Display', Georgia, serif" }}>
          n8n Automation Workflows
        </span>
      </div>
      <div style={{ padding: 4 }}>
        {automations.map((a, i) => (
          <div
            key={i}
            style={{
              padding: "14px 20px",
              borderBottom: i < automations.length - 1 ? "1px solid #F5F2ED" : "none",
              display: "flex",
              alignItems: "flex-start",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: a.status === "active" ? COLORS.success : COLORS.warmGray,
                marginTop: 5,
                flexShrink: 0,
                boxShadow: a.status === "active" ? `0 0 6px ${COLORS.success}50` : "none",
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: COLORS.textPrimary }}>{a.name}</span>
                <span
                  style={{
                    fontSize: 11,
                    color: COLORS.textSecondary,
                    background: "#F5F2ED",
                    padding: "2px 8px",
                    borderRadius: 10,
                  }}
                >
                  {a.trigger}
                </span>
              </div>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: COLORS.textSecondary, lineHeight: 1.5 }}>{a.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main App ───
export default function MoralImaginationDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showAudit, setShowAudit] = useState(false);
  const issue = MOCK_ISSUE;

  const approved = issue.sections.filter((s) => s.status === "APPROVED").length;
  const total = issue.sections.length;
  const overallProgress = Math.round((approved / total) * 100);

  const handleAction = (action, section) => {
    if (action === "view_audit") setShowAudit(true);
  };

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: "◉" },
    { id: "preview", label: "Preview", icon: "👁" },
    { id: "commands", label: "Commands", icon: "⌨" },
    { id: "automation", label: "Automation", icon: "⚡" },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `linear-gradient(180deg, ${COLORS.cream} 0%, #F0EDE8 100%)`,
        fontFamily: "'Outfit', 'Helvetica Neue', system-ui, sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&family=Outfit:wght@300;400;500;600;700&display=swap');
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #D5D0C8; border-radius: 3px; }
      `}</style>

      {/* Top Bar */}
      <div
        style={{
          background: COLORS.black,
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          height: 56,
          position: "sticky",
          top: 0,
          zIndex: 100,
          borderBottom: `2px solid ${COLORS.gold}`,
        }}
      >
        <WFULogo />
        <div style={{ marginLeft: 14 }}>
          <div
            style={{
              color: COLORS.gold,
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 17,
              fontWeight: 700,
              letterSpacing: "0.02em",
            }}
          >
            Moral Imagination
          </div>
          <div style={{ color: COLORS.warmGray, fontSize: 11, letterSpacing: "0.04em" }}>Newsletter Management System</div>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                background: activeTab === t.id ? "rgba(158,126,56,0.15)" : "transparent",
                border: "none",
                color: activeTab === t.id ? COLORS.gold : COLORS.warmGray,
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.15s",
              }}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 20px 60px" }}>
        {activeTab === "dashboard" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20, animation: "fadeIn 0.3s ease" }}>
            {/* Issue Header */}
            <div
              style={{
                background: COLORS.white,
                borderRadius: 14,
                padding: "24px 28px",
                border: "1px solid #E8E4DE",
                display: "flex",
                alignItems: "center",
                gap: 24,
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, minWidth: 200 }}>
                <h1
                  style={{
                    margin: 0,
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontSize: 24,
                    color: COLORS.textPrimary,
                    fontWeight: 700,
                  }}
                >
                  {issue.title}
                </h1>
                <div style={{ marginTop: 8, display: "flex", gap: 20, fontSize: 13, color: COLORS.textSecondary, flexWrap: "wrap" }}>
                  <span>
                    📅 Deadline: <strong style={{ color: COLORS.textPrimary }}>{issue.deadline}</strong>
                  </span>
                  <span>
                    📬 Publish: <strong style={{ color: COLORS.textPrimary }}>{issue.publishDate}</strong>
                  </span>
                  <span>
                    👤 Editors: <strong style={{ color: COLORS.textPrimary }}>{issue.editors.join(", ")}</strong>
                  </span>
                </div>
              </div>

              <div style={{ textAlign: "center" }}>
                <ProgressRing value={overallProgress} size={72} stroke={5} />
                <div style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 4 }}>
                  {approved}/{total} Approved
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <ActionBtn label="Compile" icon="📄" variant="primary" />
                <ActionBtn label="Notify All Late" icon="🔔" variant="danger" />
              </div>
            </div>

            {/* Workflow */}
            <WorkflowDiagram />

            {/* Section Cards */}
            <div>
              <h2
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: 18,
                  color: COLORS.textPrimary,
                  margin: "0 0 14px",
                  fontWeight: 700,
                }}
              >
                Sections ({total})
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {issue.sections.map((s, i) => (
                  <SectionCard key={i} section={s} onAction={handleAction} />
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "preview" && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <h2
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 20,
                color: COLORS.textPrimary,
                margin: "0 0 20px",
                textAlign: "center",
              }}
            >
              Newsletter Template Preview
            </h2>
            <NewsletterPreview />
          </div>
        )}

        {activeTab === "commands" && (
          <div style={{ animation: "fadeIn 0.3s ease", display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ textAlign: "center", maxWidth: 560, margin: "0 auto" }}>
              <h2
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: 20,
                  color: COLORS.textPrimary,
                  margin: "0 0 8px",
                }}
              >
                AI Agent Slash Commands
              </h2>
              <p style={{ fontSize: 14, color: COLORS.textSecondary, lineHeight: 1.6, margin: 0 }}>
                Use these commands in Slack, the dashboard, or via the Claude API to manage every aspect of the newsletter pipeline.
              </p>
            </div>
            <SlashCommandPanel />
          </div>
        )}

        {activeTab === "automation" && (
          <div style={{ animation: "fadeIn 0.3s ease", display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ textAlign: "center", maxWidth: 560, margin: "0 auto" }}>
              <h2
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: 20,
                  color: COLORS.textPrimary,
                  margin: "0 0 8px",
                }}
              >
                Automation & Workflows
              </h2>
              <p style={{ fontSize: 14, color: COLORS.textSecondary, lineHeight: 1.6, margin: 0 }}>
                Powered by n8n workflows and Google Apps Script cron jobs. All automations run on schedule or trigger-based events.
              </p>
            </div>
            <AutomationPanel />
            <WorkflowDiagram />
          </div>
        )}
      </div>

      {showAudit && <AIAuditPanel audit={AI_AUDIT_EXAMPLE} onClose={() => setShowAudit(false)} />}
    </div>
  );
}
