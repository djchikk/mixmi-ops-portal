"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

// ============================================================
// Types
// ============================================================

interface PilotNode {
  id: string;
  name: string;
  slug: string | null;
  region: string;
  country: string;
  lead_name: string | null;
  status: string;
  what_it_tests: string | null;
  description: string | null;
  tags: string[] | null;
  activation_date: string | null;
}

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  stream: string;
  status: string;
  target_week: string | null;
  owner: string | null;
  pilot_node_id: string | null;
  pilot_nodes?: { name: string } | null;
}

interface Contact {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  organization: string | null;
  relationship_stage: string;
  context: string | null;
  pilot_node_id: string | null;
  pilot_nodes?: { name: string } | null;
}

interface Decision {
  id: string;
  title: string;
  decision: string;
  context: string | null;
  reasoning: string | null;
  decided_by: string;
  decided_at: string;
}

interface EngagementLog {
  id: string;
  title: string;
  event: string;
  description: string | null;
  participant_count: number | null;
  created_at: string;
  pilot_node_id: string | null;
  pilot_nodes?: { name: string } | null;
}

// -- Worksheet types --

type SectionStatus = "blank" | "in_progress" | "decided";

// Common fields that can appear on any section type
interface SectionCommon {
  id: string;
  title: string;
  status: SectionStatus;
  subtitle?: string;
  context?: string;
  preamble?: string;
  footer?: string;
  decisions_prompt?: string;
}

interface NarrativeSection extends SectionCommon {
  type: "narrative";
  body: string;
  style?: "callout" | "default";
}

interface PromptEntry {
  label: string;
  description?: string;
  response: string;
}

interface PromptSection extends SectionCommon {
  type: "prompt";
  prompt?: string;
  response?: string;
  notes?: string;
  prompts?: PromptEntry[];
}

interface TextSection extends SectionCommon {
  type: "text";
  content: string;
}

interface BudgetRow {
  label: string;
  low?: number | null;
  high?: number | null;
  amount?: number | null;
  actual?: number | null;
  notes: string;
}

interface BudgetSection extends SectionCommon {
  type: "budget";
  rows: BudgetRow[];
  items?: BudgetRow[];
}

interface ChecklistItem {
  label: string;
  detail?: string;
  lead?: string;
  checked: boolean;
  notes: string;
  item_status?: "blank" | "confirmed" | "rejected" | "needs_discussion";
  admin_only?: boolean;
}

interface ChecklistSection extends SectionCommon {
  type: "checklist";
  items: ChecklistItem[];
}

interface MatrixCell {
  value: string;
  cell_status?: "not_started" | "in_progress" | "done" | "blocked";
}

interface MatrixRowFlat {
  area?: string;
  label?: string;
  phase_a?: string;
  phase_b?: string;
  status?: string;
  cells?: MatrixCell[];
  [key: string]: unknown;
}

interface MatrixSection extends SectionCommon {
  type: "matrix";
  columns: string[];
  rows: MatrixRowFlat[];
}

interface RoleCard {
  person: string;
  leads: string;
  responsibilities: string;
}

interface RolesSection extends SectionCommon {
  type: "roles";
  roles: RoleCard[];
}

interface MediaSection {
  id: string;
  title: string;
  type: "media";
  status: SectionStatus;
  url: string;
  caption: string;
  subtitle?: string;
}

type WorksheetSection =
  | NarrativeSection
  | PromptSection
  | TextSection
  | BudgetSection
  | ChecklistSection
  | MatrixSection
  | RolesSection
  | MediaSection;

interface Worksheet {
  id: string;
  title: string;
  description: string | null;
  template_type: string | null;
  phase: string;
  created_by: string | null;
  pilot_node_id: string | null;
  sections: WorksheetSection[];
  processed_outputs: unknown;
  created_at: string;
  updated_at: string;
  pilot_nodes?: { name: string } | null;
}

// ============================================================
// Config
// ============================================================

const statusConfig: Record<string, { color: string; bg: string; icon: string }> = {
  planning: { color: "#A89878", bg: "#2A2520", icon: "◯" },
  activating: { color: "#E8B84D", bg: "#332A18", icon: "◐" },
  active: { color: "#5DBF82", bg: "#1A2E22", icon: "●" },
  scaling: { color: "#9B7ED8", bg: "#251E38", icon: "◉" },
  done: { color: "#5DBF82", bg: "#1A2E22", icon: "✓" },
  in_progress: { color: "#E8B84D", bg: "#332A18", icon: "◐" },
  next: { color: "#D4884A", bg: "#33241A", icon: "☆" },
  blocked: { color: "#D45A5A", bg: "#331A1A", icon: "✕" },
  planned: { color: "#7A7A7A", bg: "#252525", icon: "◯" },
  prospect: { color: "#7A7A7A", bg: "#252525", icon: "◯" },
  contacted: { color: "#7B8EA0", bg: "#1A2230", icon: "◐" },
  engaged: { color: "#E8B84D", bg: "#332A18", icon: "◐" },
  advocate: { color: "#9B7ED8", bg: "#251E38", icon: "◉" },
};

const streamColors: Record<string, string> = {
  platform: "#5A8A6E",
  pilot: "#C47A3A",
  tooling: "#7B6B9E",
  investor: "#9E8B6B",
  ops: "#6B7B9E",
};

const phaseConfig: Record<string, { color: string; bg: string }> = {
  draft: { color: "#7A7A7A", bg: "#252525" },
  working: { color: "#E8B84D", bg: "#332A18" },
  processed: { color: "#5DBF82", bg: "#1A2E22" },
};

const sectionStatusConfig: Record<string, { color: string; label: string }> = {
  blank: { color: "#7A7A7A", label: "blank" },
  in_progress: { color: "#E8B84D", label: "in progress" },
  decided: { color: "#5DBF82", label: "decided" },
};

const templateLabels: Record<string, string> = {
  node_design: "Node Design",
  budget_plan: "Budget Plan",
  retrospective: "Retrospective",
  strategy: "Strategy",
  general: "General",
};

// ============================================================
// Small Components
// ============================================================

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.planned;
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xl text-xs font-semibold tracking-wide"
      style={{ background: config.bg, color: config.color }}
    >
      <span className="text-[10px]">{config.icon}</span> {status?.replace("_", " ")}
    </span>
  );
}

function StreamBadge({ stream }: { stream: string }) {
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-lg text-[11px] font-semibold tracking-wider uppercase text-white/90"
      style={{ background: streamColors[stream] || "#666" }}
    >
      {stream === "pilot" ? "seed" : stream}
    </span>
  );
}

const nodeStageOrder = ["planning", "activating", "active", "scaling"];
const nodeStagePercent: Record<string, number> = { planning: 15, activating: 40, active: 70, scaling: 95 };
const nodeStageColors: Record<string, string> = {
  planning: "#7A7A7A",
  activating: "#E8B84D",
  active: "#5DBF82",
  scaling: "#9B7ED8",
};

function NodeProgressTimeline({
  nodes,
  highlightNodeId,
}: {
  nodes: { id: string; name: string; status: string }[];
  highlightNodeId?: string;
}) {
  const statusPriority: Record<string, number> = { activating: 0, active: 1, scaling: 2, planning: 3 };
  const sorted = [...nodes].sort((a, b) => {
    const aIsKenya = a.name.toLowerCase().includes("kenya") ? 0 : 1;
    const bIsKenya = b.name.toLowerCase().includes("kenya") ? 0 : 1;
    if (aIsKenya !== bIsKenya) return aIsKenya - bIsKenya;
    return (statusPriority[a.status] ?? 9) - (statusPriority[b.status] ?? 9);
  });

  return (
    <div className="space-y-3">
      {/* Stage labels */}
      <div className="flex justify-between text-[10px] text-[#6B5D4D] uppercase tracking-widest font-semibold px-1">
        {nodeStageOrder.map((s) => (
          <span key={s}>{s}</span>
        ))}
      </div>
      {sorted.map((node) => {
        const pct = nodeStagePercent[node.status] || 5;
        const color = nodeStageColors[node.status] || "#7A7A7A";
        const isMuted = highlightNodeId != null && node.id !== highlightNodeId;
        return (
          <div key={node.id} className={`${isMuted ? "opacity-40" : ""}`}>
            <div className="flex items-center gap-3">
              <span className={`text-[13px] w-[120px] shrink-0 truncate ${isMuted ? "text-[#6B5D4D]" : "text-[#D4C4A8] font-medium"}`}>
                {node.name}
              </span>
              <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${color}88, ${color})`,
                  }}
                />
              </div>
              <span className="text-[11px] w-[70px] text-right shrink-0" style={{ color }}>
                {node.status}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="px-5 py-4 rounded-xl bg-white/[0.04] backdrop-blur-sm border border-white/[0.06] text-center flex-1 min-w-[100px]">
      <div className="text-3xl font-light tracking-tight" style={{ color: color || "#E8DCC8" }}>
        {value}
      </div>
      <div className="text-[11px] text-[#8B7B68] mt-1 uppercase tracking-widest font-semibold">
        {label}
      </div>
    </div>
  );
}

function PhaseBadge({ phase }: { phase: string }) {
  const config = phaseConfig[phase] || phaseConfig.draft;
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-xl text-xs font-semibold tracking-wide"
      style={{ background: config.bg, color: config.color }}
    >
      {phase}
    </span>
  );
}

function SectionProgressBar({ sections }: { sections: WorksheetSection[] }) {
  if (sections.length === 0) return null;
  const decided = sections.filter((s) => s.status === "decided").length;
  const inProgress = sections.filter((s) => s.status === "in_progress").length;
  return (
    <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden bg-white/[0.06] w-full max-w-[120px]">
      {sections.map((s, i) => (
        <div
          key={i}
          className="flex-1 rounded-full"
          style={{
            background:
              s.status === "decided"
                ? "#5DBF82"
                : s.status === "in_progress"
                ? "#E8B84D"
                : "transparent",
          }}
        />
      ))}
    </div>
  );
}

function WorksheetCard({
  worksheet,
  onClick,
}: {
  worksheet: Worksheet;
  onClick: () => void;
}) {
  const sections = worksheet.sections || [];
  const decided = sections.filter((s) => s.status === "decided").length;
  return (
    <div
      onClick={onClick}
      className="bg-white/[0.04] backdrop-blur-sm rounded-xl p-5 border border-white/[0.06] hover:-translate-y-0.5 hover:border-white/[0.12] hover:bg-white/[0.06] transition-all cursor-pointer"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <div className="text-base font-semibold text-[#E8DCC8] tracking-tight truncate">
            {worksheet.title}
          </div>
          {worksheet.description && (
            <div className="text-xs text-[#6B5D4D] mt-0.5 truncate">
              {worksheet.description}
            </div>
          )}
        </div>
        <PhaseBadge phase={worksheet.phase} />
      </div>
      <div className="flex items-center gap-3 text-xs text-[#8B7B68] mb-3">
        {worksheet.template_type && (
          <span>{templateLabels[worksheet.template_type] || worksheet.template_type}</span>
        )}
        {worksheet.pilot_nodes && (
          <span className="text-[#6B5D4D]">· {worksheet.pilot_nodes.name}</span>
        )}
        <span className="text-[#6B5D4D]">
          · {new Date(worksheet.updated_at).toLocaleDateString()}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <SectionProgressBar sections={sections} />
        <span className="text-[11px] text-[#6B5D4D]">
          {decided}/{sections.length} decided
        </span>
      </div>
    </div>
  );
}

// ============================================================
// Inline Edit Primitives
// ============================================================

function InlineField({
  value,
  placeholder,
  onCommit,
  className,
}: {
  value: string;
  placeholder: string;
  onCommit: (value: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const commit = () => { setEditing(false); if (draft !== value) onCommit(draft); };
  if (!editing) {
    return (
      <span
        onClick={() => { setDraft(value); setEditing(true); }}
        className={`inline-block px-1.5 py-0.5 rounded border border-transparent cursor-pointer hover:border-white/[0.15] transition-colors ${className || ""}`}
      >
        {value || <span className="text-[#6B5D4D] italic">{placeholder}</span>}
      </span>
    );
  }
  return (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
      placeholder={placeholder}
      className={`px-1.5 py-0.5 rounded border border-white/[0.15] bg-white/[0.04] text-[#D4C4A8] placeholder-[#6B5D4D] focus:outline-none focus:border-[#C47A3A]/60 transition-colors ${className || ""}`}
    />
  );
}

function InlineNumber({
  value,
  placeholder,
  onCommit,
  prefix,
  className,
}: {
  value: number | null;
  placeholder: string;
  onCommit: (value: number | null) => void;
  prefix?: string;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value?.toString() ?? "");
  const commit = () => { setEditing(false); const num = draft ? Number(draft) : null; if (num !== value) onCommit(num); };
  if (!editing) {
    return (
      <span
        onClick={() => { setDraft(value?.toString() ?? ""); setEditing(true); }}
        className={`inline-block px-1.5 py-0.5 rounded border border-transparent cursor-pointer hover:border-white/[0.15] transition-colors text-right ${className || ""}`}
      >
        {value != null ? `${prefix || ""}${value.toLocaleString()}` : <span className="text-[#6B5D4D] italic">{placeholder}</span>}
      </span>
    );
  }
  return (
    <input
      autoFocus
      type="number"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
      placeholder={placeholder}
      className={`px-1.5 py-0.5 rounded border border-white/[0.15] bg-white/[0.04] text-[#D4C4A8] placeholder-[#6B5D4D] focus:outline-none focus:border-[#C47A3A]/60 transition-colors text-right ${className || ""}`}
    />
  );
}

function InlineTextarea({
  value,
  placeholder,
  onCommit,
  rows,
}: {
  value: string;
  placeholder: string;
  onCommit: (value: string) => void;
  rows?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const commit = () => { setEditing(false); if (draft !== value) onCommit(draft); };
  if (!editing) {
    return (
      <div
        onClick={() => { setDraft(value); setEditing(true); }}
        className="w-full px-3 py-2 rounded-lg border border-white/[0.08] text-[15px] text-[#D4C4A8] cursor-pointer hover:border-white/[0.15] transition-colors min-h-[48px] whitespace-pre-wrap leading-[1.7] bg-white/[0.02]"
      >
        {value || <span className="text-[#6B5D4D] italic">{placeholder}</span>}
      </div>
    );
  }
  return (
    <textarea
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Escape") setEditing(false); }}
      placeholder={placeholder}
      rows={rows || 4}
      className="w-full px-3 py-2 rounded-lg border border-[#C47A3A]/60 bg-white/[0.04] text-[15px] text-[#D4C4A8] placeholder-[#6B5D4D] focus:outline-none transition-colors resize-y leading-[1.7]"
    />
  );
}

// ============================================================
// Document-Style Section Renderers
// ============================================================

function DocSectionHeader({ title, subtitle, status }: { title: string; subtitle?: string; status?: SectionStatus }) {
  const statusCfg = status ? (sectionStatusConfig[status] || sectionStatusConfig.blank) : null;
  return (
    <div className="mb-4">
      <div className="flex items-baseline gap-3">
        <h3 className="text-lg font-semibold text-[#E8DCC8] tracking-tight leading-snug">
          {title}
        </h3>
        {statusCfg && status !== "blank" && (
          <span className="text-[11px] font-medium tracking-wide" style={{ color: statusCfg.color }}>
            {statusCfg.label}
          </span>
        )}
      </div>
      {subtitle && (
        <div className="text-[13px] text-[#8B7B68] mt-1 italic">{subtitle}</div>
      )}
    </div>
  );
}

function NarrativeBody({ text }: { text: string }) {
  // Split paragraphs and render callout-style blocks for lines that look like insights/quotes
  const paragraphs = text.split("\n\n");
  return (
    <div className="space-y-3">
      {paragraphs.map((p, i) => {
        // Detect callout/insight blocks (starts with a label followed by colon)
        const isCallout = /^(The .+ insight|Note|Important|Key principle)[:\s]/i.test(p.trim());
        // Detect closing quotes
        const isQuote = p.trim().startsWith('"') && p.trim().endsWith('"');

        if (isQuote) {
          return (
            <blockquote key={i} className="border-l-2 border-[#C47A3A]/40 pl-4 py-1 text-[15px] text-[#D4C4A8] italic leading-[1.8]">
              {p.trim()}
            </blockquote>
          );
        }
        if (isCallout) {
          return (
            <div key={i} className="bg-white/[0.03] border border-white/[0.08] rounded-lg px-4 py-3 text-[14px] text-[#A89878] leading-[1.8] italic">
              {p}
            </div>
          );
        }
        return (
          <p key={i} className="text-[15px] text-[#A89878] leading-[1.8] whitespace-pre-wrap">
            {p}
          </p>
        );
      })}
    </div>
  );
}

function SectionPreamble({ section }: { section: SectionCommon }) {
  return (
    <>
      {section.preamble && (
        <div className="mb-4"><NarrativeBody text={section.preamble} /></div>
      )}
      {section.context && (
        <div className="mb-4"><NarrativeBody text={section.context} /></div>
      )}
    </>
  );
}

function SectionFooter({ section }: { section: SectionCommon }) {
  return (
    <>
      {section.decisions_prompt && (
        <div className="mt-5 bg-white/[0.03] border border-white/[0.08] rounded-lg px-4 py-3">
          <div className="text-[11px] text-[#C47A3A] uppercase tracking-wider font-semibold mb-1.5">Decisions for this block</div>
          <div className="text-[14px] text-[#D4C4A8] leading-[1.7] italic">{section.decisions_prompt}</div>
        </div>
      )}
      {section.footer && (
        <div className="mt-4"><NarrativeBody text={section.footer} /></div>
      )}
    </>
  );
}

function NarrativeSectionRenderer({ section }: { section: NarrativeSection }) {
  if (section.style === "callout") {
    return (
      <div>
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-lg px-5 py-4">
          <div className="text-[14px] font-semibold text-[#D4C4A8] mb-1.5">{section.title}</div>
          <div className="text-[14px] text-[#A89878] leading-[1.8] italic">{section.body}</div>
        </div>
        <SectionFooter section={section} />
      </div>
    );
  }
  return (
    <div>
      <DocSectionHeader title={section.title} subtitle={section.subtitle} />
      <SectionPreamble section={section} />
      <NarrativeBody text={section.body} />
      <SectionFooter section={section} />
    </div>
  );
}

function PromptSectionRenderer({
  section,
  onCommit,
}: {
  section: PromptSection;
  onCommit: (updated: PromptSection) => void;
}) {
  const prompts = section.prompts || [];
  const hasMultiplePrompts = prompts.length > 0;

  const commitPromptEntry = (idx: number, field: keyof PromptEntry, value: string) => {
    const newPrompts = [...prompts];
    newPrompts[idx] = { ...newPrompts[idx], [field]: value };
    const updated = { ...section, prompts: newPrompts };
    if (updated.status === "blank" && value.trim()) updated.status = "in_progress";
    onCommit(updated);
  };

  return (
    <div>
      <DocSectionHeader title={section.title} subtitle={section.subtitle} status={section.status} />
      <SectionPreamble section={section} />
      {hasMultiplePrompts ? (
        <div className="space-y-6">
          {prompts.map((entry, i) => (
            <div key={i} className="border-l-2 border-white/[0.08] pl-4">
              <div className="text-[15px] text-[#E8DCC8] font-semibold mb-1">{entry.label}</div>
              {entry.description && (
                <div className="text-[13px] text-[#8B7B68] leading-[1.7] mb-2">{entry.description}</div>
              )}
              <InlineTextarea
                value={entry.response}
                placeholder="Click to add your response..."
                onCommit={(val) => commitPromptEntry(i, "response", val)}
              />
            </div>
          ))}
        </div>
      ) : (
        <>
          {section.prompt && (
            <div className="text-[15px] text-[#D4C4A8] leading-[1.7] mb-3 font-medium italic">
              {section.prompt}
            </div>
          )}
          <InlineTextarea
            value={section.response || ""}
            placeholder="Click to add your response..."
            onCommit={(val) => {
              const updated = { ...section, response: val };
              if (updated.status === "blank" && val.trim()) updated.status = "in_progress";
              onCommit(updated);
            }}
          />
        </>
      )}
      {section.notes !== undefined && (
        <div className="mt-3">
          <div className="text-[11px] text-[#8B7B68] uppercase tracking-wider font-semibold mb-1">Notes / Follow-up</div>
          <InlineTextarea
            value={section.notes || ""}
            placeholder="Add notes, flags, or follow-up questions..."
            rows={2}
            onCommit={(val) => {
              onCommit({ ...section, notes: val });
            }}
          />
        </div>
      )}
      <SectionFooter section={section} />
    </div>
  );
}

function TextSectionRenderer({
  section,
  onCommit,
}: {
  section: TextSection;
  onCommit: (updated: TextSection) => void;
}) {
  return (
    <div>
      <DocSectionHeader title={section.title} subtitle={section.subtitle} status={section.status} />
      <SectionPreamble section={section} />
      <InlineTextarea
        value={section.content}
        placeholder="Click to write..."
        rows={5}
        onCommit={(val) => {
          const updated = { ...section, content: val };
          if (updated.status === "blank" && val.trim()) updated.status = "in_progress";
          onCommit(updated);
        }}
      />
      <SectionFooter section={section} />
    </div>
  );
}

const checklistItemStatusConfig: Record<string, { color: string; label: string; icon: string }> = {
  blank: { color: "#7A7A7A", label: "", icon: "" },
  confirmed: { color: "#5DBF82", label: "confirmed", icon: "✓" },
  rejected: { color: "#D45A5A", label: "rejected", icon: "✕" },
  needs_discussion: { color: "#E8B84D", label: "discuss", icon: "?" },
};

function BudgetSectionRenderer({
  section,
  onCommit,
}: {
  section: BudgetSection;
  onCommit: (updated: BudgetSection) => void;
}) {
  const rows = section.rows || section.items || [];
  const hasRanges = rows.some((r) => r.low != null || r.high != null);
  const getActual = (r: BudgetRow) => r.actual ?? r.amount ?? null;

  const commitRow = (idx: number, field: string, value: string | number | null) => {
    const newRows = [...rows];
    newRows[idx] = { ...newRows[idx], [field]: value };
    const updated = { ...section, rows: newRows };
    if (updated.status === "blank") updated.status = "in_progress";
    onCommit(updated);
  };

  const addRow = () => {
    onCommit({
      ...section,
      rows: [...rows, { label: "", low: null, high: null, actual: null, amount: null, notes: "" }],
      status: section.status === "blank" ? "in_progress" : section.status,
    });
  };

  const totalActual = rows.reduce((sum, r) => sum + (getActual(r) || 0), 0);
  const totalLow = rows.reduce((sum, r) => sum + (r.low || 0), 0);
  const totalHigh = rows.reduce((sum, r) => sum + (r.high || 0), 0);

  return (
    <div>
      <DocSectionHeader title={section.title} subtitle={section.subtitle} status={section.status} />
      <SectionPreamble section={section} />
      <div className="rounded-lg border border-white/[0.08] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.08]">
              <th className="text-left px-3 py-2.5 text-[11px] text-[#8B7B68] uppercase tracking-wider font-semibold">Item</th>
              {hasRanges && (
                <>
                  <th className="text-right px-3 py-2.5 text-[11px] text-[#8B7B68] uppercase tracking-wider font-semibold w-24">Low</th>
                  <th className="text-right px-3 py-2.5 text-[11px] text-[#8B7B68] uppercase tracking-wider font-semibold w-24">High</th>
                </>
              )}
              <th className="text-right px-3 py-2.5 text-[11px] text-[#8B7B68] uppercase tracking-wider font-semibold w-24">Actual</th>
              <th className="text-left px-3 py-2.5 text-[11px] text-[#8B7B68] uppercase tracking-wider font-semibold">Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={`border-b border-white/[0.04] ${i % 2 === 1 ? "bg-white/[0.02]" : ""}`}>
                <td className="px-3 py-1.5 text-[#D4C4A8]">
                  <InlineField value={row.label} placeholder="Item" onCommit={(val) => commitRow(i, "label", val)} />
                </td>
                {hasRanges && (
                  <>
                    <td className="px-3 py-1.5">
                      <InlineNumber value={row.low ?? null} placeholder="—" prefix="$" onCommit={(val) => commitRow(i, "low", val)} className="w-full text-sm text-[#8B7B68]" />
                    </td>
                    <td className="px-3 py-1.5">
                      <InlineNumber value={row.high ?? null} placeholder="—" prefix="$" onCommit={(val) => commitRow(i, "high", val)} className="w-full text-sm text-[#8B7B68]" />
                    </td>
                  </>
                )}
                <td className="px-3 py-1.5">
                  <InlineNumber value={getActual(row)} placeholder="—" prefix="$" onCommit={(val) => commitRow(i, row.actual !== undefined ? "actual" : "amount", val)} className="w-full text-sm text-[#D4C4A8] font-medium" />
                </td>
                <td className="px-3 py-1.5">
                  <InlineField value={row.notes} placeholder="—" onCommit={(val) => commitRow(i, "notes", val)} className="text-sm text-[#8B7B68]" />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-white/[0.08]">
              <td className="px-3 py-2.5 text-[#D4C4A8] font-semibold">Total</td>
              {hasRanges && (
                <>
                  <td className="px-3 py-2.5 text-right text-[#8B7B68] font-medium">${totalLow.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right text-[#8B7B68] font-medium">${totalHigh.toLocaleString()}</td>
                </>
              )}
              <td className="px-3 py-2.5 text-right text-[#D4C4A8] font-semibold">${totalActual.toLocaleString()}</td>
              <td className="px-3 py-2.5" />
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="mt-2">
        <button
          onClick={addRow}
          className="text-xs text-[#8B7B68] hover:text-[#D4C4A8] bg-transparent border-none cursor-pointer"
        >
          + Add row
        </button>
      </div>
      <SectionFooter section={section} />
    </div>
  );
}

function ChecklistSectionRenderer({
  section,
  onCommit,
}: {
  section: ChecklistSection;
  onCommit: (updated: ChecklistSection) => void;
}) {
  const items = section.items || [];

  const commitItem = (idx: number, updates: Partial<ChecklistItem>) => {
    const newItems = [...items];
    newItems[idx] = { ...newItems[idx], ...updates };
    const updated = { ...section, items: newItems };
    if (updated.status === "blank") updated.status = "in_progress";
    onCommit(updated);
  };

  const addItem = () => {
    onCommit({
      ...section,
      items: [...items, { label: "", checked: false, notes: "", item_status: "blank" }],
      status: section.status === "blank" ? "in_progress" : section.status,
    });
  };

  return (
    <div>
      <DocSectionHeader title={section.title} subtitle={section.subtitle} status={section.status} />
      <SectionPreamble section={section} />
      <div className="space-y-1">
        {items.map((item, i) => {
          const itemSt = checklistItemStatusConfig[item.item_status || "blank"] || checklistItemStatusConfig.blank;
          return (
            <div key={i} className={`flex items-start gap-3 py-2 group border-b border-white/[0.04] last:border-b-0 ${item.admin_only ? "bg-white/[0.08] rounded-lg px-3 -mx-3" : ""}`}>
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) => commitItem(i, {
                  checked: e.target.checked,
                  item_status: e.target.checked ? "confirmed" : (item.item_status === "confirmed" ? "blank" : item.item_status),
                })}
                className="accent-[#5DBF82] w-4 h-4 cursor-pointer mt-1 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <span className={`text-[15px] leading-[1.7] ${item.checked ? "text-[#8B7B68] line-through" : "text-[#D4C4A8]"}`}>
                      {item.label ? (
                        item.label.includes(" — ") ? (
                          <>
                            <strong className="font-semibold text-[#E8DCC8]">{item.label.split(" — ")[0]}</strong>
                            {" — "}
                            <span className="text-[#A89878]">{item.label.split(" — ").slice(1).join(" — ")}</span>
                          </>
                        ) : item.label
                      ) : <span className="text-[#6B5D4D] italic">Untitled item</span>}
                    </span>
                    {item.admin_only && (
                      <span className="text-[11px] text-[#8B7B68] ml-2" title="Admin only — sensitive item">🔒</span>
                    )}
                    {item.lead && (
                      <span className="text-[13px] text-[#8B7B68] ml-2">— {item.lead}</span>
                    )}
                  </div>
                  {itemSt.label && (
                    <span className="text-[10px] font-semibold tracking-wide px-1.5 py-0.5 rounded shrink-0 mt-0.5" style={{ color: itemSt.color, background: `${itemSt.color}15` }}>
                      {itemSt.icon} {itemSt.label}
                    </span>
                  )}
                </div>
                {item.detail && (
                  <div className="text-[13px] text-[#A89878] leading-[1.7] mt-1 pl-0.5">
                    {item.detail}
                  </div>
                )}
                <InlineField
                  value={item.notes}
                  placeholder="Add notes..."
                  onCommit={(val) => commitItem(i, { notes: val })}
                  className="text-[13px] text-[#8B7B68] mt-0.5 block"
                />
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <label
                  className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 cursor-pointer"
                  title="Mark as admin-only (sensitive)"
                >
                  <input
                    type="checkbox"
                    checked={item.admin_only || false}
                    onChange={(e) => commitItem(i, { admin_only: e.target.checked })}
                    className="w-3 h-3 accent-[#8B7B68] cursor-pointer"
                  />
                  <span className="text-[10px] text-[#6B5D4D]">🔒</span>
                </label>
                <select
                  value={item.item_status || "blank"}
                  onChange={(e) => commitItem(i, {
                    item_status: e.target.value as ChecklistItem["item_status"],
                    checked: e.target.value === "confirmed",
                  })}
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-[11px] px-1 py-0.5 rounded border border-white/[0.1] bg-[#1A1816] text-[#8B7B68] focus:outline-none cursor-pointer shrink-0"
                >
                  <option value="blank">—</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="rejected">Rejected</option>
                  <option value="needs_discussion">Discuss</option>
                </select>
              </div>
            </div>
          );
        })}
      </div>
      <button
        onClick={addItem}
        className="mt-2 text-xs text-[#8B7B68] hover:text-[#D4C4A8] bg-transparent border-none cursor-pointer"
      >
        + Add item
      </button>
      <SectionFooter section={section} />
    </div>
  );
}

const matrixCellColors: Record<string, { color: string; bg: string }> = {
  not_started: { color: "#7A7A7A", bg: "transparent" },
  in_progress: { color: "#E8B84D", bg: "#332A18" },
  done: { color: "#5DBF82", bg: "#1A2E22" },
  blocked: { color: "#D45A5A", bg: "#331A1A" },
};

function MatrixSectionRenderer({
  section,
  onCommit,
}: {
  section: MatrixSection;
  onCommit: (updated: MatrixSection) => void;
}) {
  const matrixRows = section.rows || [];
  const columns = section.columns || [];

  // Positional mapping: columns[0] = area/label, columns[1..n] = data fields
  // Flat row field keys in order matching the columns array
  const flatFieldKeys = ["area", "phase_a", "phase_b", "status"];

  const commitRow = (rowIdx: number, field: string, value: string) => {
    const newRows = [...matrixRows];
    newRows[rowIdx] = { ...newRows[rowIdx], [field]: value };
    const updated = { ...section, rows: newRows };
    if (updated.status === "blank") updated.status = "in_progress";
    onCommit(updated);
  };

  // Detect if rows use flat fields (area/phase_a/phase_b/status) or cells[] array
  const usesFlat = matrixRows.length > 0 && (matrixRows[0].area != null || matrixRows[0].phase_a != null);

  return (
    <div>
      <DocSectionHeader title={section.title} subtitle={section.subtitle} status={section.status} />
      <SectionPreamble section={section} />
      <div className="rounded-lg border border-white/[0.08] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.08]">
              {!usesFlat && (
                <th className="text-left px-3 py-2.5 text-[11px] text-[#8B7B68] uppercase tracking-wider font-semibold min-w-[140px]">Area</th>
              )}
              {columns.map((col, ci) => (
                <th key={ci} className={`text-left px-3 py-2.5 text-[11px] text-[#8B7B68] uppercase tracking-wider font-semibold ${usesFlat && ci === 0 ? "min-w-[140px]" : "min-w-[180px]"}`}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrixRows.map((row, ri) => {
              return (
                <tr key={ri} className={`border-b border-white/[0.04] ${ri % 2 === 1 ? "bg-white/[0.02]" : ""}`}>
                  {usesFlat ? (
                    <>
                      {columns.map((_, ci) => {
                        const fieldKey = flatFieldKeys[ci] || "";
                        const cellValue = (row as Record<string, unknown>)[fieldKey] as string || "";
                        // First column (area/label) renders bold
                        if (ci === 0) {
                          return (
                            <td key={ci} className="px-3 py-2 text-[#D4C4A8] font-medium text-[13px] align-top">
                              {row.area || row.label || ""}
                            </td>
                          );
                        }
                        // Status column — render as editable dropdown
                        if (fieldKey === "status") {
                          const statusVal = cellValue || "not_started";
                          const statusCfg = matrixCellColors[statusVal] || matrixCellColors.not_started;
                          return (
                            <td key={ci} className="px-3 py-2 align-top">
                              <select
                                value={statusVal}
                                onChange={(e) => commitRow(ri, "status", e.target.value)}
                                className="text-[11px] px-1.5 py-1 rounded border border-white/[0.08] bg-[#1A1816] focus:outline-none cursor-pointer"
                                style={{ color: statusCfg.color }}
                              >
                                <option value="not_started">Not Started</option>
                                <option value="in_progress">In Progress</option>
                                <option value="done">Done</option>
                                <option value="blocked">Blocked</option>
                              </select>
                            </td>
                          );
                        }
                        // Data columns — render content
                        return (
                          <td key={ci} className="px-3 py-2 align-top">
                            <div className="text-[13px] text-[#A89878] leading-relaxed whitespace-pre-wrap">{cellValue || "—"}</div>
                          </td>
                        );
                      })}
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2 text-[#D4C4A8] font-medium text-[13px] align-top">{row.area || row.label || ""}</td>
                      {columns.map((_, ci) => {
                        const cell = row.cells?.[ci] || { value: "", cell_status: "not_started" };
                        return (
                          <td key={ci} className="px-3 py-2 align-top">
                            <InlineField
                              value={cell.value}
                              placeholder="—"
                              onCommit={(val) => {
                                const newRows = [...matrixRows];
                                const cells = [...(newRows[ri].cells || [])];
                                cells[ci] = { ...(cells[ci] || { value: "" }), value: val };
                                newRows[ri] = { ...newRows[ri], cells };
                                const updated = { ...section, rows: newRows };
                                if (updated.status === "blank") updated.status = "in_progress";
                                onCommit(updated);
                              }}
                              className="text-[13px] text-[#A89878] leading-relaxed"
                            />
                          </td>
                        );
                      })}
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <SectionFooter section={section} />
    </div>
  );
}

function RolesSectionRenderer({
  section,
  onCommit,
}: {
  section: RolesSection;
  onCommit: (updated: RolesSection) => void;
}) {
  const roles = section.roles || [];

  const commitRole = (idx: number, field: keyof RoleCard, value: string) => {
    const newRoles = [...roles];
    newRoles[idx] = { ...newRoles[idx], [field]: value };
    const updated = { ...section, roles: newRoles };
    if (updated.status === "blank") updated.status = "in_progress";
    onCommit(updated);
  };

  return (
    <div>
      <DocSectionHeader title={section.title} subtitle={section.subtitle} status={section.status} />
      <SectionPreamble section={section} />
      <div className="rounded-lg border border-white/[0.08] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.08]">
              <th className="text-left px-3 py-2.5 text-[11px] text-[#8B7B68] uppercase tracking-wider font-semibold w-32">Person</th>
              <th className="text-left px-3 py-2.5 text-[11px] text-[#8B7B68] uppercase tracking-wider font-semibold w-40">Leads</th>
              <th className="text-left px-3 py-2.5 text-[11px] text-[#8B7B68] uppercase tracking-wider font-semibold">Key Responsibilities</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role, i) => (
              <tr key={i} className={`border-b border-white/[0.04] ${i % 2 === 1 ? "bg-white/[0.02]" : ""}`}>
                <td className="px-3 py-2 align-top">
                  <InlineField value={role.person} placeholder="Name" onCommit={(val) => commitRole(i, "person", val)} className="text-[#D4C4A8] font-medium" />
                </td>
                <td className="px-3 py-2 align-top">
                  <InlineField value={role.leads} placeholder="Area" onCommit={(val) => commitRole(i, "leads", val)} className="text-[#A89878]" />
                </td>
                <td className="px-3 py-2 align-top">
                  <InlineField value={role.responsibilities} placeholder="Responsibilities" onCommit={(val) => commitRole(i, "responsibilities", val)} className="text-[#A89878] text-[13px] leading-relaxed" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <SectionFooter section={section} />
    </div>
  );
}

function SectionRenderer({
  section,
  onCommit,
}: {
  section: WorksheetSection;
  onCommit: (updated: WorksheetSection) => void;
}) {
  return (
    <div className="py-6 border-b border-white/[0.05] last:border-b-0">
      {section.type === "narrative" && (
        <NarrativeSectionRenderer section={section} />
      )}
      {section.type === "prompt" && (
        <PromptSectionRenderer section={section} onCommit={onCommit as (u: PromptSection) => void} />
      )}
      {section.type === "text" && (
        <TextSectionRenderer section={section} onCommit={onCommit as (u: TextSection) => void} />
      )}
      {section.type === "budget" && (
        <BudgetSectionRenderer section={section} onCommit={onCommit as (u: BudgetSection) => void} />
      )}
      {section.type === "checklist" && (
        <ChecklistSectionRenderer section={section} onCommit={onCommit as (u: ChecklistSection) => void} />
      )}
      {section.type === "matrix" && (
        <MatrixSectionRenderer section={section} onCommit={onCommit as (u: MatrixSection) => void} />
      )}
      {section.type === "roles" && (
        <RolesSectionRenderer section={section} onCommit={onCommit as (u: RolesSection) => void} />
      )}
      {section.type === "media" && (
        <div>
          <DocSectionHeader title={section.title} />
          <div className="text-sm text-[#6B5D4D] italic">Media upload coming soon</div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Worksheet Detail
// ============================================================

function WorksheetDetail({
  worksheet,
  saving,
  onSectionCommit,
  onPhaseCommit,
  onBack,
}: {
  worksheet: Worksheet;
  saving: boolean;
  onSectionCommit: (sectionId: string, updated: WorksheetSection) => void;
  onPhaseCommit: (phase: string) => void;
  onBack: () => void;
}) {
  const sections = worksheet.sections || [];
  return (
    <div className="max-w-[820px] mx-auto">
      <button
        onClick={onBack}
        className="mb-6 px-0 py-1 border-none bg-transparent text-[#A89878] text-sm cursor-pointer hover:text-[#D4C4A8] transition-colors"
      >
        &larr; All Worksheets
      </button>

      {/* Document wrapper */}
      <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/[0.06] px-10 py-8 md:px-14 md:py-10">
        {/* Title block */}
        <div className="mb-8 pb-6 border-b border-white/[0.08]">
          <h1 className="text-2xl md:text-[28px] font-semibold text-[#E8DCC8] tracking-tight leading-tight">
            {worksheet.title}
          </h1>
          {worksheet.description && (
            <p className="text-[15px] text-[#A89878] mt-2 leading-[1.7]">{worksheet.description}</p>
          )}
          <div className="flex items-center gap-4 mt-4 text-[13px] text-[#6B5D4D]">
            {worksheet.created_by && <span>{worksheet.created_by}</span>}
            {worksheet.pilot_nodes && <span>· {worksheet.pilot_nodes.name}</span>}
            <span>· {new Date(worksheet.updated_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
            <div className="ml-auto flex items-center gap-2">
              {saving && <span className="text-[11px] text-[#8B7B68] italic">Saving...</span>}
              <select
                value={worksheet.phase}
                onChange={(e) => onPhaseCommit(e.target.value)}
                className="px-2 py-1 rounded border border-white/[0.1] bg-[#1A1816] text-[12px] text-[#D4C4A8] focus:outline-none focus:border-[#C47A3A]/60 cursor-pointer"
              >
                <option value="draft">Draft</option>
                <option value="working">Working</option>
                <option value="processed">Processed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sections */}
        {sections.length === 0 ? (
          <div className="text-[#6B5D4D] text-[15px] italic py-8 text-center">
            This worksheet has no sections yet. Add sections via Supabase.
          </div>
        ) : (
          sections.map((section) => (
            <SectionRenderer
              key={section.id}
              section={section}
              onCommit={(updated) => onSectionCommit(section.id, updated)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================
// Login
// ============================================================

function LoginScreen({
  onLogin,
  error,
  loading,
}: {
  onLogin: (email: string, password: string) => void;
  error: string;
  loading: boolean;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-[360px] p-10 rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/[0.08] shadow-2xl">
        <div className="text-center mb-8">
          <div className="text-3xl font-light text-[#D4C4A8] tracking-tight">
            mixmi <span className="font-semibold">ops</span>
          </div>
          <div className="text-sm text-[#8B7B68] mt-1 italic">pilot operations portal</div>
        </div>

        <div className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="px-3.5 py-2.5 rounded-lg border border-white/[0.1] bg-white/[0.04] text-sm text-[#D4C4A8] placeholder-[#6B5D4D] focus:outline-none focus:border-[#C47A3A] transition-colors"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onLogin(email, password)}
            className="px-3.5 py-2.5 rounded-lg border border-white/[0.1] bg-white/[0.04] text-sm text-[#D4C4A8] placeholder-[#6B5D4D] focus:outline-none focus:border-[#C47A3A] transition-colors"
          />
          {error && (
            <div className="text-[#D45A5A] text-sm text-center">{error}</div>
          )}
          <button
            onClick={() => onLogin(email, password)}
            disabled={loading}
            className="px-3.5 py-2.5 rounded-lg border-none bg-[#8B7355] text-white text-sm font-semibold cursor-pointer hover:bg-[#9E8462] transition-colors disabled:opacity-50 disabled:cursor-wait"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Node Card
// ============================================================

function NodeCard({ node, onClick }: { node: PilotNode; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className="bg-white/[0.04] backdrop-blur-sm rounded-xl p-5 border border-white/[0.06] hover:-translate-y-0.5 hover:border-white/[0.12] hover:bg-white/[0.06] transition-all cursor-pointer">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="text-base font-semibold text-[#E8DCC8] tracking-tight">
            {node.name}
          </div>
          <div className="text-[13px] text-[#8B7B68] mt-0.5">
            {node.region} · {node.country}
          </div>
        </div>
        <StatusBadge status={node.status} />
      </div>
      <div className="text-[13px] text-[#A89878] leading-relaxed">
        <div>
          <span className="text-[#8B7B68]">Lead:</span> {node.lead_name || "—"}
        </div>
        {node.what_it_tests && (
          <div className="mt-1.5 text-xs text-[#6B5D4D] leading-relaxed">
            {node.what_it_tests.length > 120
              ? node.what_it_tests.slice(0, 120) + "..."
              : node.what_it_tests}
          </div>
        )}
      </div>
      {node.tags && node.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2.5">
          {node.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.06] text-[#8B7B68] font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Milestone Row
// ============================================================

function MilestoneRow({ m }: { m: Milestone }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/[0.05]">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[#D4C4A8] truncate">{m.title}</div>
        {m.description && (
          <div className="text-xs text-[#6B5D4D] mt-0.5 truncate">{m.description}</div>
        )}
      </div>
      <StreamBadge stream={m.stream} />
      <StatusBadge status={m.status} />
      <div className="text-xs text-[#8B7B68] min-w-[50px] text-right">
        {m.target_week || "—"}
      </div>
      <div className="text-xs text-[#8B7B68] min-w-[60px] text-right">
        {m.owner || "—"}
      </div>
    </div>
  );
}

// ============================================================
// Contact Row
// ============================================================

function ContactRow({ c }: { c: Contact }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/[0.05]">
      <div className="w-8 h-8 rounded-full bg-white/[0.08] flex items-center justify-center text-sm font-semibold text-[#A89878]">
        {(c.name || "?")[0]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[#D4C4A8]">{c.name}</div>
        <div className="text-xs text-[#6B5D4D]">
          {c.role || "—"} {c.organization ? `· ${c.organization}` : ""}
          {c.pilot_nodes ? ` · ${c.pilot_nodes.name}` : ""}
        </div>
      </div>
      <StatusBadge status={c.relationship_stage} />
    </div>
  );
}

// ============================================================
// Node Detail
// ============================================================

function NodeDetail({
  node,
  milestones,
  contacts,
  engagement,
  engagementLoading,
  onBack,
}: {
  node: PilotNode;
  milestones: Milestone[];
  contacts: Contact[];
  engagement: EngagementLog[];
  engagementLoading: boolean;
  onBack: () => void;
}) {
  const nodeMilestones = milestones.filter((m) => m.pilot_node_id === node.id);
  const nodeContacts = contacts.filter((c) => c.pilot_nodes?.name === node.name);

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-4 px-0 py-1 border-none bg-transparent text-[#A89878] text-sm cursor-pointer hover:text-[#D4C4A8] transition-colors"
      >
        ← All Seed Nodes
      </button>

      {/* Header */}
      <div className="bg-white/[0.04] backdrop-blur-sm rounded-2xl p-6 border border-white/[0.06] mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="text-xl font-semibold text-[#E8DCC8] tracking-tight">
              {node.name}
            </div>
            <div className="text-sm text-[#8B7B68] mt-1">
              {node.region} · {node.country}
            </div>
          </div>
          <StatusBadge status={node.status} />
        </div>
        <div className="text-sm text-[#A89878] leading-relaxed space-y-1.5">
          <div>
            <span className="text-[#8B7B68]">Lead:</span> {node.lead_name || "—"}
          </div>
          {node.activation_date && (
            <div>
              <span className="text-[#8B7B68]">Activated:</span>{" "}
              {new Date(node.activation_date).toLocaleDateString()}
            </div>
          )}
          {node.description && (
            <div className="mt-3 text-[13px] text-[#A89878] leading-relaxed">
              {node.description}
            </div>
          )}
          {node.what_it_tests && (
            <div className="mt-2 text-xs text-[#6B5D4D] leading-relaxed">
              <span className="text-[#8B7B68] font-semibold">Tests:</span>{" "}
              {node.what_it_tests}
            </div>
          )}
        </div>
        {node.tags && node.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {node.tags.map((tag) => (
              <span
                key={tag}
                className="text-[11px] px-2 py-0.5 rounded-md bg-white/[0.06] text-[#8B7B68] font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Milestones */}
      <div className="bg-white/[0.03] rounded-2xl p-6 border border-white/[0.06] mb-6">
        <h3 className="text-[15px] font-semibold text-[#D4C4A8] mb-4 tracking-tight">
          Milestones
        </h3>
        {nodeMilestones.length === 0 ? (
          <div className="text-[#6B5D4D] text-sm italic">No milestones for this node</div>
        ) : (
          <>
            <div className="flex items-center gap-3 py-1.5 border-b-2 border-white/[0.08] text-[11px] text-[#8B7B68] font-semibold uppercase tracking-wider">
              <div className="flex-1">Milestone</div>
              <div className="w-[70px]">Stream</div>
              <div className="w-[90px]">Status</div>
              <div className="w-[50px] text-right">Week</div>
              <div className="w-[60px] text-right">Owner</div>
            </div>
            {nodeMilestones.map((m) => (
              <MilestoneRow key={m.id} m={m} />
            ))}
          </>
        )}
      </div>

      {/* Contacts */}
      <div className="bg-white/[0.03] rounded-2xl p-6 border border-white/[0.06] mb-6">
        <h3 className="text-[15px] font-semibold text-[#D4C4A8] mb-4 tracking-tight">
          Contacts
        </h3>
        {nodeContacts.length === 0 ? (
          <div className="text-[#6B5D4D] text-sm italic">No contacts linked to this node</div>
        ) : (
          nodeContacts.map((c) => <ContactRow key={c.id} c={c} />)
        )}
      </div>

      {/* Engagement */}
      <div className="bg-white/[0.03] rounded-2xl p-6 border border-white/[0.06]">
        <h3 className="text-[15px] font-semibold text-[#D4C4A8] mb-4 tracking-tight">
          Engagement Log
        </h3>
        {engagementLoading ? (
          <div className="text-[#6B5D4D] text-sm italic">Loading engagement...</div>
        ) : engagement.length === 0 ? (
          <div className="text-[#6B5D4D] text-sm italic">No engagement logged for this node</div>
        ) : (
          engagement.map((e) => (
            <div key={e.id} className="py-2 border-b border-white/[0.05] text-sm">
              <span className="text-[#8B7B68]">
                {new Date(e.created_at).toLocaleDateString()}
              </span>{" "}
              <span className="text-[#A89878]">{e.title}</span>
              {e.description && (
                <span className="text-[#6B5D4D]"> — {e.description}</span>
              )}
              {e.participant_count && (
                <span className="text-[#6B5D4D]"> ({e.participant_count} participants)</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================
// Tab Button
// ============================================================

function Tab({
  label,
  active,
  onClick,
  count,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg border-none text-[13px] font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
        active ? "bg-[#8B7355] text-white" : "bg-transparent text-[#A89878] hover:bg-white/[0.05]"
      }`}
    >
      {label}
      {count != null && (
        <span
          className={`text-[11px] px-1.5 rounded-md ${
            active ? "bg-white/25" : "bg-white/[0.06]"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ============================================================
// Main Page
// ============================================================

export default function OpsPortal() {
  const [token, setToken] = useState<string | null>(null);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [milestoneFilter, setMilestoneFilter] = useState("all");

  const [selectedNode, setSelectedNode] = useState<PilotNode | null>(null);
  const [nodeEngagement, setNodeEngagement] = useState<EngagementLog[]>([]);
  const [nodeEngagementLoading, setNodeEngagementLoading] = useState(false);

  const [nodes, setNodes] = useState<PilotNode[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [engagement, setEngagement] = useState<EngagementLog[]>([]);
  const [worksheets, setWorksheets] = useState<Worksheet[]>([]);
  const [selectedWorksheet, setSelectedWorksheet] = useState<Worksheet | null>(null);

  const [siteContent, setSiteContent] = useState<Record<string, string>>({});
  const [steveImageUploading, setSteveImageUploading] = useState(false);
  const [worksheetSaving, setWorksheetSaving] = useState(false);

  const [userRole, setUserRole] = useState<string>("admin");
  const [userNodeId, setUserNodeId] = useState<string | null>(null);

  const [nodePageContent, setNodePageContent] = useState<Record<string, {
    pilot_node_id: string;
    narrative: string;
    image_url: string | null;
    image_caption: string | null;
    video_url: string | null;
    video_caption: string | null;
    draft_narrative: string | null;
    draft_image_url: string | null;
    draft_image_caption: string | null;
    draft_video_url: string | null;
    draft_video_caption: string | null;
    updates?: { date: string; narrative: string; image_url: string | null; image_caption: string | null; video_url: string | null; video_caption: string | null }[];
  }>>({});
  const [editingNodePage, setEditingNodePage] = useState<string>("steve");
  const [nodeImageUploading, setNodeImageUploading] = useState(false);

  const handleLogin = async (email: string, password: string) => {
    setLoginLoading(true);
    setLoginError("");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      setToken(data.session?.access_token || null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Login failed";
      setLoginError(msg);
    }
    setLoginLoading(false);
  };

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      // Fetch user role (default admin if not found, so existing admins work before seeding)
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role, pilot_node_id")
        .single();
      if (roleData) {
        setUserRole(roleData.role);
        setUserNodeId(roleData.pilot_node_id);
      } else {
        setUserRole("admin");
        setUserNodeId(null);
      }

      const [nodesRes, msRes, contactsRes, decisionsRes, engRes, wsRes, scRes, npcRes] = await Promise.all([
        supabase.from("pilot_nodes").select("*").order("created_at"),
        supabase.from("milestones").select("*, pilot_nodes(name)").order("created_at"),
        supabase.from("community_contacts").select("*, pilot_nodes(name)").order("name"),
        supabase.from("decisions_log").select("*").order("decided_at", { ascending: false }),
        supabase.from("engagement_logs").select("*, pilot_nodes(name)").order("created_at", { ascending: false }).limit(20),
        supabase.from("worksheets").select("*, pilot_nodes(name)").order("updated_at", { ascending: false }),
        supabase.from("site_content").select("key, value"),
        supabase.from("node_page_content").select("pilot_node_id, narrative, image_url, image_caption, video_url, video_caption, draft_narrative, draft_image_url, draft_image_caption, draft_video_url, draft_video_caption, updates"),
      ]);
      if (nodesRes.data) setNodes(nodesRes.data);
      if (msRes.data) setMilestones(msRes.data);
      if (contactsRes.data) setContacts(contactsRes.data);
      if (decisionsRes.data) setDecisions(decisionsRes.data);
      if (engRes.data) setEngagement(engRes.data);
      if (wsRes.data) setWorksheets(wsRes.data);
      if (scRes.data) {
        const map: Record<string, string> = {};
        scRes.data.forEach((row: { key: string; value: string }) => { map[row.key] = row.value; });
        setSiteContent(map);
      }
      if (npcRes.data) {
        const map: Record<string, typeof nodePageContent[string]> = {};
        (npcRes.data as (typeof nodePageContent[string])[]).forEach((row) => {
          map[row.pilot_node_id] = row;
        });
        setNodePageContent(map);
      }
    } catch (e) {
      console.error("Load error:", e);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setToken(session.access_token);
    });
  }, []);

  // Draft save helper — writes to draft_ columns only, no archiving
  const saveDraftNodePageField = async (
    nodeId: string,
    field: string,
    value: string | null,
  ) => {
    const draftField = `draft_${field}` as keyof typeof nodePageContent[string];

    setNodePageContent(prev => ({
      ...prev,
      [nodeId]: { ...prev[nodeId], pilot_node_id: nodeId, [draftField]: value },
    }));

    await supabase.from("node_page_content").upsert({
      pilot_node_id: nodeId,
      [draftField]: value,
      updated_at: new Date().toISOString(),
    }, { onConflict: "pilot_node_id" });
  };

  // Publish: archive live content, promote draft to live, clear drafts
  const publishNodePage = async (nodeId: string) => {
    const current = nodePageContent[nodeId];
    if (!current) return;

    const hasLiveContent = current.narrative || current.image_url || current.video_url;
    let updates = current.updates || [];

    if (hasLiveContent) {
      const snapshot = {
        date: new Date().toISOString(),
        narrative: current.narrative || "",
        image_url: current.image_url || null,
        image_caption: current.image_caption || null,
        video_url: current.video_url || null,
        video_caption: current.video_caption || null,
      };
      updates = [snapshot, ...updates];
    }

    const newLive = {
      pilot_node_id: nodeId,
      narrative: current.draft_narrative ?? current.narrative,
      image_url: current.draft_image_url ?? current.image_url,
      image_caption: current.draft_image_caption ?? current.image_caption,
      video_url: current.draft_video_url ?? current.video_url,
      video_caption: current.draft_video_caption ?? current.video_caption,
      draft_narrative: null as string | null,
      draft_image_url: null as string | null,
      draft_image_caption: null as string | null,
      draft_video_url: null as string | null,
      draft_video_caption: null as string | null,
      updates,
      updated_at: new Date().toISOString(),
    };

    setNodePageContent(prev => ({
      ...prev,
      [nodeId]: { ...prev[nodeId], ...newLive },
    }));

    await supabase.from("node_page_content").upsert(newLive, { onConflict: "pilot_node_id" });
  };

  // Steve page publish
  const publishStevePage = async () => {
    type UpdateEntry = { date: string; narrative: string; image_url: string | null; image_caption: string | null; video_url: string | null; video_caption: string | null };
    let currentUpdates: UpdateEntry[] = [];
    try { currentUpdates = JSON.parse(siteContent.steve_updates || "[]"); } catch { /* ignore */ }

    const hasLiveContent = siteContent.steve_narrative || siteContent.steve_image_url || siteContent.steve_video_url;
    let updates = currentUpdates;
    if (hasLiveContent) {
      const snapshot: UpdateEntry = {
        date: new Date().toISOString(),
        narrative: siteContent.steve_narrative || "",
        image_url: siteContent.steve_image_url || null,
        image_caption: siteContent.steve_image_caption || null,
        video_url: siteContent.steve_video_url || null,
        video_caption: siteContent.steve_video_caption || null,
      };
      updates = [snapshot, ...currentUpdates];
    }

    const promotions = [
      { key: "steve_narrative", value: siteContent.steve_draft_narrative || siteContent.steve_narrative || "" },
      { key: "steve_image_url", value: siteContent.steve_draft_image_url || siteContent.steve_image_url || "" },
      { key: "steve_image_caption", value: siteContent.steve_draft_image_caption || siteContent.steve_image_caption || "" },
      { key: "steve_video_url", value: siteContent.steve_draft_video_url || siteContent.steve_video_url || "" },
      { key: "steve_video_caption", value: siteContent.steve_draft_video_caption || siteContent.steve_video_caption || "" },
      { key: "steve_updates", value: JSON.stringify(updates) },
      { key: "steve_draft_narrative", value: "" },
      { key: "steve_draft_image_url", value: "" },
      { key: "steve_draft_image_caption", value: "" },
      { key: "steve_draft_video_url", value: "" },
      { key: "steve_draft_video_caption", value: "" },
    ];

    const newSiteContent = { ...siteContent };
    promotions.forEach(({ key, value }) => { newSiteContent[key] = value; });
    setSiteContent(newSiteContent);

    const now = new Date().toISOString();
    await Promise.all(
      promotions.map(({ key, value }) =>
        supabase.from("site_content").upsert({ key, value, updated_at: now })
      )
    );
  };

  // Draft detection helpers
  const nodeHasDraft = (nodeId: string): boolean => {
    const npc = nodePageContent[nodeId];
    if (!npc) return false;
    return (
      (npc.draft_narrative != null && npc.draft_narrative !== (npc.narrative || "")) ||
      (npc.draft_image_url != null && npc.draft_image_url !== (npc.image_url || "")) ||
      (npc.draft_image_caption != null && npc.draft_image_caption !== (npc.image_caption || "")) ||
      (npc.draft_video_url != null && npc.draft_video_url !== (npc.video_url || "")) ||
      (npc.draft_video_caption != null && npc.draft_video_caption !== (npc.video_caption || ""))
    );
  };

  const steveHasDraft = (): boolean => {
    const fields = ["narrative", "image_url", "image_caption", "video_url", "video_caption"];
    return fields.some(f => {
      const draftVal = siteContent[`steve_draft_${f}`];
      const liveVal = siteContent[`steve_${f}`] || "";
      return draftVal != null && draftVal !== "" && draftVal !== liveVal;
    });
  };

  // Redirect node leaders away from admin-only tabs
  useEffect(() => {
    if (userRole === "node_leader" && ["decisions", "worksheets", "nodepages"].includes(tab)) {
      setTab("overview");
    }
  }, [userRole, tab]);

  const selectNode = useCallback((node: PilotNode) => {
    setSelectedNode(node);
    setSelectedWorksheet(null);
    setNodeEngagement([]);
    setNodeEngagementLoading(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
    supabase
      .from("engagement_logs")
      .select("*, pilot_nodes(name)")
      .eq("pilot_node_id", node.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setNodeEngagement(data || []);
        setNodeEngagementLoading(false);
      });
  }, []);

  const selectWorksheet = useCallback((ws: Worksheet) => {
    setSelectedWorksheet(ws);
    setSelectedNode(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const persistWorksheet = useCallback(
    async (id: string, payload: { sections?: WorksheetSection[]; phase?: string }) => {
      setWorksheetSaving(true);
      try {
        const { error } = await supabase
          .from("worksheets")
          .update(payload)
          .eq("id", id);
        if (error) throw error;
        const now = new Date().toISOString();
        setWorksheets((prev) =>
          prev.map((ws) =>
            ws.id === id ? { ...ws, ...payload, updated_at: now } : ws
          )
        );
        setSelectedWorksheet((prev) =>
          prev && prev.id === id ? { ...prev, ...payload, updated_at: now } : prev
        );
      } catch (e) {
        console.error("Save worksheet error:", e);
      }
      setWorksheetSaving(false);
    },
    []
  );

  const handleSectionCommit = useCallback(
    (sectionId: string, updated: WorksheetSection) => {
      if (!selectedWorksheet) return;
      const newSections = (selectedWorksheet.sections || []).map((s) =>
        s.id === sectionId ? updated : s
      );
      setSelectedWorksheet({ ...selectedWorksheet, sections: newSections });
      persistWorksheet(selectedWorksheet.id, { sections: newSections });
    },
    [selectedWorksheet, persistWorksheet]
  );

  const handlePhaseCommit = useCallback(
    (phase: string) => {
      if (!selectedWorksheet) return;
      setSelectedWorksheet({ ...selectedWorksheet, phase });
      persistWorksheet(selectedWorksheet.id, { phase });
    },
    [selectedWorksheet, persistWorksheet]
  );

  if (!token) {
    return (
      <LoginScreen
        onLogin={handleLogin}
        error={loginError}
        loading={loginLoading}
      />
    );
  }

  const isAdmin = userRole === "admin";
  const isNodeLeader = userRole === "node_leader";

  const scopedNodes = isAdmin ? nodes : nodes.filter((n) => n.id === userNodeId);
  const scopedMilestones = isAdmin
    ? milestones
    : milestones.filter((m) => m.pilot_node_id === userNodeId || m.pilot_node_id === null);
  const scopedContacts = isAdmin
    ? contacts
    : contacts.filter((c) => c.pilot_node_id === userNodeId);
  const scopedEngagement = isAdmin
    ? engagement
    : engagement.filter((e) => e.pilot_node_id === userNodeId);

  const activeMilestones = scopedMilestones.filter(
    (m) => m.status === "in_progress" || m.status === "next"
  );
  const doneMilestones = scopedMilestones.filter((m) => m.status === "done");
  const blockedMilestones = scopedMilestones.filter((m) => m.status === "blocked");
  const activeNodes = scopedNodes.filter(
    (n) => n.status === "active" || n.status === "activating"
  );
  const filteredMilestones =
    milestoneFilter === "all"
      ? scopedMilestones
      : scopedMilestones.filter((m) => m.stream === milestoneFilter);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="px-8 py-5 flex items-center justify-between border-b border-white/[0.06] bg-black/20 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex items-baseline gap-3">
          <span className="text-[22px] font-light text-[#D4C4A8] tracking-tight">
            mixmi <span className="font-semibold">ops</span>
          </span>
          <span className="text-xs text-[#6B5D4D] italic">seed node operations</span>
        </div>
        <div className="flex gap-1 bg-white/[0.03] rounded-lg p-0.5">
          <Tab label="Overview" active={tab === "overview"} onClick={() => { setTab("overview"); setSelectedNode(null); setSelectedWorksheet(null); }} />
          <Tab label="Milestones" active={tab === "milestones"} onClick={() => { setTab("milestones"); setSelectedNode(null); setSelectedWorksheet(null); }} count={scopedMilestones.length} />
          <Tab label="Nodes" active={tab === "nodes"} onClick={() => { setTab("nodes"); setSelectedNode(null); setSelectedWorksheet(null); }} count={scopedNodes.length} />
          <Tab label="Contacts" active={tab === "contacts"} onClick={() => { setTab("contacts"); setSelectedNode(null); setSelectedWorksheet(null); }} count={scopedContacts.length} />
          {isAdmin && <Tab label="Decisions" active={tab === "decisions"} onClick={() => { setTab("decisions"); setSelectedNode(null); setSelectedWorksheet(null); }} count={decisions.length} />}
          {isAdmin && <Tab label="Worksheets" active={tab === "worksheets"} onClick={() => { setTab("worksheets"); setSelectedNode(null); setSelectedWorksheet(null); }} count={worksheets.length} />}
          {isAdmin && <Tab label="Node Pages" active={tab === "nodepages"} onClick={() => { setTab("nodepages"); setSelectedNode(null); setSelectedWorksheet(null); }} />}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="px-3.5 py-1.5 rounded-lg border border-white/[0.1] bg-transparent text-[#A89878] text-xs font-semibold cursor-pointer hover:bg-white/[0.05] transition-colors disabled:opacity-50"
          >
            {loading ? "Loading..." : "↻ Refresh"}
          </button>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              setToken(null);
            }}
            className="px-3.5 py-1.5 rounded-lg border border-white/[0.08] bg-transparent text-[#6B5D4D] text-xs cursor-pointer hover:bg-white/[0.05] transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-8 py-6">
        {/* NODE DETAIL */}
        {selectedNode ? (
          <NodeDetail
            node={selectedNode}
            milestones={milestones}
            contacts={contacts}
            engagement={nodeEngagement}
            engagementLoading={nodeEngagementLoading}
            onBack={() => setSelectedNode(null)}
          />
        ) : selectedWorksheet ? (
          <WorksheetDetail
            worksheet={selectedWorksheet}
            saving={worksheetSaving}
            onSectionCommit={handleSectionCommit}
            onPhaseCommit={handlePhaseCommit}
            onBack={() => setSelectedWorksheet(null)}
          />
        ) : <>
        {/* OVERVIEW */}
        {tab === "overview" && (
          <div>
            <div className="flex gap-4 mb-7">
              <Stat label="Seed Nodes" value={scopedNodes.length} color="#5DBF82" />
              <Stat label="Activating" value={activeNodes.length} color="#E8B84D" />
              <Stat label="In Progress" value={activeMilestones.length} color="#D4884A" />
              <Stat label="Completed" value={doneMilestones.length} color="#5DBF82" />
              <Stat label="Blocked" value={blockedMilestones.length} color="#D45A5A" />
              <Stat label="Contacts" value={scopedContacts.length} color="#9B7ED8" />
            </div>

            {scopedNodes.length > 0 && (
              <div className="bg-white/[0.03] rounded-2xl p-6 border border-white/[0.06] mb-6">
                <h3 className="text-[15px] font-semibold text-[#D4C4A8] mb-4 tracking-tight">
                  Seed Node Progress
                </h3>
                <NodeProgressTimeline nodes={scopedNodes} />
              </div>
            )}

            <div className="bg-white/[0.03] rounded-2xl p-6 border border-white/[0.06] mb-6">
              <h3 className="text-[15px] font-semibold text-[#D4C4A8] mb-4 tracking-tight">
                Active & Next Milestones
              </h3>
              {activeMilestones.length === 0 ? (
                <div className="text-[#6B5D4D] text-sm italic">No active milestones</div>
              ) : (
                activeMilestones.map((m) => <MilestoneRow key={m.id} m={m} />)
              )}
            </div>

            <div className="bg-white/[0.03] rounded-2xl p-6 border border-white/[0.06] mb-6">
              <h3 className="text-[15px] font-semibold text-[#D4C4A8] mb-4 tracking-tight">
                Seed Nodes
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {scopedNodes.map((n) => (
                  <NodeCard key={n.id} node={n} onClick={() => selectNode(n)} />
                ))}
              </div>
            </div>

            <div className="bg-white/[0.03] rounded-2xl p-6 border border-white/[0.06]">
              <h3 className="text-[15px] font-semibold text-[#D4C4A8] mb-4 tracking-tight">
                Recent Activity
              </h3>
              {scopedEngagement.length === 0 ? (
                <div className="text-[#6B5D4D] text-sm italic">
                  No activity logged yet. Engagement events will appear here as nodes become active.
                </div>
              ) : (
                scopedEngagement.map((e) => (
                  <div key={e.id} className="py-2 border-b border-white/[0.05] text-sm">
                    <span className="text-[#8B7B68]">
                      {new Date(e.created_at).toLocaleDateString()}
                    </span>{" "}
                    {e.pilot_nodes && (
                      <span className="text-[#6B5D4D]">[{e.pilot_nodes.name}]</span>
                    )}{" "}
                    <span className="text-[#A89878]">{e.title}</span>
                    {e.participant_count && (
                      <span className="text-[#6B5D4D]"> ({e.participant_count} participants)</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* MILESTONES */}
        {tab === "milestones" && (
          <div className="bg-white/[0.03] rounded-2xl p-6 border border-white/[0.06]">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-[15px] font-semibold text-[#D4C4A8] tracking-tight">
                All Milestones
              </h3>
              <div className="flex gap-1">
                {["all", "platform", "pilot", "tooling", "investor"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setMilestoneFilter(f)}
                    className="px-2.5 py-1 rounded-md border-none text-[11px] font-semibold cursor-pointer uppercase tracking-wider transition-colors"
                    style={{
                      background:
                        milestoneFilter === f
                          ? streamColors[f] || "#8B7355"
                          : "rgba(255,255,255,0.04)",
                      color: milestoneFilter === f ? "#fff" : "#8B7B68",
                    }}
                  >
                    {f === "pilot" ? "seed" : f}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 py-1.5 border-b-2 border-white/[0.08] text-[11px] text-[#8B7B68] font-semibold uppercase tracking-wider">
              <div className="flex-1">Milestone</div>
              <div className="w-[70px]">Stream</div>
              <div className="w-[90px]">Status</div>
              <div className="w-[50px] text-right">Week</div>
              <div className="w-[60px] text-right">Owner</div>
            </div>
            {filteredMilestones.map((m) => (
              <MilestoneRow key={m.id} m={m} />
            ))}
          </div>
        )}

        {/* NODES */}
        {tab === "nodes" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scopedNodes.map((n) => (
              <NodeCard key={n.id} node={n} onClick={() => selectNode(n)} />
            ))}
          </div>
        )}

        {/* CONTACTS */}
        {tab === "contacts" && (
          <div className="bg-white/[0.03] rounded-2xl p-6 border border-white/[0.06]">
            <h3 className="text-[15px] font-semibold text-[#D4C4A8] mb-4 tracking-tight">
              Community Contacts
            </h3>
            {scopedContacts.map((c) => (
              <ContactRow key={c.id} c={c} />
            ))}
          </div>
        )}

        {/* DECISIONS */}
        {tab === "decisions" && (
          <div className="bg-white/[0.03] rounded-2xl p-6 border border-white/[0.06]">
            <h3 className="text-[15px] font-semibold text-[#D4C4A8] mb-4 tracking-tight">
              Decisions Log
            </h3>
            {decisions.map((d) => (
              <div key={d.id} className="py-4 border-b border-white/[0.05]">
                <div className="flex justify-between items-start">
                  <div className="text-[15px] font-semibold text-[#D4C4A8]">
                    {d.title}
                  </div>
                  <span className="text-xs text-[#6B5D4D]">
                    {d.decided_at &&
                      new Date(d.decided_at).toLocaleDateString()}{" "}
                    · {d.decided_by}
                  </span>
                </div>
                <div className="text-sm text-[#A89878] mt-2 leading-relaxed">
                  {d.decision}
                </div>
                {d.reasoning && (
                  <div className="text-[13px] text-[#6B5D4D] mt-2 leading-relaxed italic">
                    Reasoning: {d.reasoning}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* WORKSHEETS */}
        {tab === "worksheets" && (
          <div>
            {worksheets.length === 0 ? (
              <div className="bg-white/[0.03] rounded-2xl p-6 border border-white/[0.06]">
                <div className="text-[#6B5D4D] text-sm italic">
                  No worksheets yet. Create worksheets via Supabase to get started.
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {worksheets.map((ws) => (
                  <WorksheetCard
                    key={ws.id}
                    worksheet={ws}
                    onClick={() => selectWorksheet(ws)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "nodepages" && (() => {
          const isEditingSteve = editingNodePage === "steve";
          const editingNode = !isEditingSteve ? nodes.find((n) => n.id === editingNodePage) : null;
          const npc = editingNode ? nodePageContent[editingNode.id] : null;

          return (
          <div className="space-y-6">
            <div className="bg-white/[0.03] rounded-2xl p-6 border border-white/[0.06]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-[#E8DCC8]">Public Pages</h2>
                  <select
                    value={editingNodePage}
                    onChange={(e) => setEditingNodePage(e.target.value)}
                    className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-[#D4C4A8]"
                  >
                    <option value="steve">Steve (Investor Page)</option>
                    {nodes.filter((n) => n.slug).map((n) => (
                      <option key={n.id} value={n.id}>{n.name}</option>
                    ))}
                  </select>
                </div>
                <a
                  href={isEditingSteve ? "/steve" : `/node/${editingNode?.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#C47A3A] hover:text-[#E8B84D] transition-colors"
                >
                  View live page →
                </a>
              </div>

              {/* ── Steve Page Editor ── */}
              {isEditingSteve && (
                <>
                  {steveHasDraft() ? (
                    <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-[#332A18]/60 border border-[#E8B84D]/20">
                      <span className="w-2 h-2 rounded-full bg-[#E8B84D] animate-pulse" />
                      <span className="text-xs text-[#E8B84D] font-semibold uppercase tracking-wider">Draft — not yet published</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-[#1A2E22]/60 border border-[#5DBF82]/20">
                      <span className="w-2 h-2 rounded-full bg-[#5DBF82]" />
                      <span className="text-xs text-[#5DBF82] font-semibold uppercase tracking-wider">Published — live on page</span>
                    </div>
                  )}

                  <div className="mb-6">
                    <div className="text-[11px] text-[#8B7B68] uppercase tracking-wider font-semibold mb-2">
                      Narrative Message
                    </div>
                    <InlineTextarea
                      value={siteContent.steve_draft_narrative || siteContent.steve_narrative || ""}
                      placeholder="Write a personal message for Steve..."
                      rows={4}
                      onCommit={async (val) => {
                        setSiteContent((prev) => ({ ...prev, steve_draft_narrative: val }));
                        await supabase.from("site_content").upsert({ key: "steve_draft_narrative", value: val, updated_at: new Date().toISOString() });
                      }}
                    />
                  </div>

                  <div className="mb-6">
                    <div className="text-[11px] text-[#8B7B68] uppercase tracking-wider font-semibold mb-2">
                      Image
                    </div>
                    {(siteContent.steve_draft_image_url || siteContent.steve_image_url) ? (
                      <div className="space-y-2">
                        <img
                          src={siteContent.steve_draft_image_url || siteContent.steve_image_url}
                          alt="Steve page image"
                          className="max-h-48 rounded-lg border border-white/[0.08] object-cover"
                        />
                        <button
                          onClick={async () => {
                            setSiteContent((prev) => ({ ...prev, steve_draft_image_url: "" }));
                            await supabase.from("site_content").upsert({ key: "steve_draft_image_url", value: "", updated_at: new Date().toISOString() });
                          }}
                          className="text-xs text-[#D45A5A] hover:text-[#E87070] bg-transparent border-none cursor-pointer"
                        >
                          Remove image
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setSteveImageUploading(true);
                            try {
                              const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
                              const path = `steve/${Date.now()}.${ext}`;
                              const { error } = await supabase.storage.from("public-media").upload(path, file, { upsert: true });
                              if (error) {
                                alert(`Upload failed: ${error.message}`);
                                setSteveImageUploading(false);
                                return;
                              }
                              const { data: urlData } = supabase.storage.from("public-media").getPublicUrl(path);
                              const publicUrl = urlData.publicUrl;
                              setSiteContent((prev) => ({ ...prev, steve_draft_image_url: publicUrl }));
                              await supabase.from("site_content").upsert({ key: "steve_draft_image_url", value: publicUrl, updated_at: new Date().toISOString() });
                            } catch (err) {
                              alert(`Upload error: ${err}`);
                            }
                            setSteveImageUploading(false);
                          }}
                          className="text-sm text-[#A89878] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-white/[0.1] file:bg-white/[0.04] file:text-[#D4C4A8] file:text-xs file:font-semibold file:cursor-pointer hover:file:bg-white/[0.08] file:transition-colors"
                        />
                        {steveImageUploading && (
                          <span className="text-xs text-[#E8B84D] ml-2 animate-pulse">Uploading...</span>
                        )}
                      </div>
                    )}
                    <div className="mt-2">
                      <InlineField
                        value={siteContent.steve_draft_image_caption || siteContent.steve_image_caption || ""}
                        placeholder="Image caption (optional)"
                        onCommit={async (val) => {
                          setSiteContent((prev) => ({ ...prev, steve_draft_image_caption: val }));
                          await supabase.from("site_content").upsert({ key: "steve_draft_image_caption", value: val, updated_at: new Date().toISOString() });
                        }}
                        className="text-sm text-[#8B7B68]"
                      />
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className="text-[11px] text-[#8B7B68] uppercase tracking-wider font-semibold mb-2">
                      Video (YouTube or Vimeo URL)
                    </div>
                    <InlineField
                      value={siteContent.steve_draft_video_url || siteContent.steve_video_url || ""}
                      placeholder="Paste YouTube or Vimeo URL..."
                      onCommit={async (val) => {
                        setSiteContent((prev) => ({ ...prev, steve_draft_video_url: val }));
                        await supabase.from("site_content").upsert({ key: "steve_draft_video_url", value: val, updated_at: new Date().toISOString() });
                      }}
                      className="text-sm text-[#D4C4A8]"
                    />
                    {(siteContent.steve_draft_video_url || siteContent.steve_video_url) && (() => {
                      const url = siteContent.steve_draft_video_url || siteContent.steve_video_url;
                      const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                      const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
                      const embedUrl = ytMatch
                        ? `https://www.youtube.com/embed/${ytMatch[1]}`
                        : vimeoMatch
                        ? `https://player.vimeo.com/video/${vimeoMatch[1]}`
                        : null;
                      if (!embedUrl) return null;
                      return (
                        <div className="mt-3 aspect-video rounded-lg overflow-hidden border border-white/[0.08] max-w-md">
                          <iframe src={embedUrl} title="Video preview" allowFullScreen className="w-full h-full" />
                        </div>
                      );
                    })()}
                    <div className="mt-2">
                      <InlineField
                        value={siteContent.steve_draft_video_caption || siteContent.steve_video_caption || ""}
                        placeholder="Video caption (optional)"
                        onCommit={async (val) => {
                          setSiteContent((prev) => ({ ...prev, steve_draft_video_caption: val }));
                          await supabase.from("site_content").upsert({ key: "steve_draft_video_caption", value: val, updated_at: new Date().toISOString() });
                        }}
                        className="text-sm text-[#8B7B68]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/[0.06]">
                    <span className="text-xs text-[#6B5D4D] italic">
                      Changes auto-save as drafts. Click Publish to update the live page.
                    </span>
                    <button
                      onClick={() => {
                        if (confirm("Publish this update? Current live content will be archived.")) {
                          publishStevePage();
                        }
                      }}
                      disabled={!(steveHasDraft() || siteContent.steve_narrative || siteContent.steve_image_url || siteContent.steve_video_url)}
                      className="px-5 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-[#C47A3A] hover:bg-[#D4884A] text-white"
                    >
                      {steveHasDraft() ? "Publish Update" : "Republish"}
                    </button>
                  </div>
                </>
              )}

              {/* ── Node Page Editor ── */}
              {!isEditingSteve && editingNode && (
                <>
                  {nodeHasDraft(editingNode.id) ? (
                    <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-[#332A18]/60 border border-[#E8B84D]/20">
                      <span className="w-2 h-2 rounded-full bg-[#E8B84D] animate-pulse" />
                      <span className="text-xs text-[#E8B84D] font-semibold uppercase tracking-wider">Draft — not yet published</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-[#1A2E22]/60 border border-[#5DBF82]/20">
                      <span className="w-2 h-2 rounded-full bg-[#5DBF82]" />
                      <span className="text-xs text-[#5DBF82] font-semibold uppercase tracking-wider">Published — live on page</span>
                    </div>
                  )}

                  <div className="mb-6">
                    <div className="text-[11px] text-[#8B7B68] uppercase tracking-wider font-semibold mb-2">
                      Narrative Message
                    </div>
                    <InlineTextarea
                      value={npc?.draft_narrative ?? npc?.narrative ?? ""}
                      placeholder={`Write a personal message for the ${editingNode.name} node leader...`}
                      rows={4}
                      onCommit={(val) => saveDraftNodePageField(editingNode.id, "narrative", val)}
                    />
                  </div>

                  <div className="mb-6">
                    <div className="text-[11px] text-[#8B7B68] uppercase tracking-wider font-semibold mb-2">
                      Image
                    </div>
                    {(npc?.draft_image_url ?? npc?.image_url) ? (
                      <div className="space-y-2">
                        <img
                          src={(npc?.draft_image_url ?? npc?.image_url)!}
                          alt={`${editingNode.name} page image`}
                          className="max-h-48 rounded-lg border border-white/[0.08] object-cover"
                        />
                        <button
                          onClick={() => saveDraftNodePageField(editingNode.id, "image_url", "")}
                          className="text-xs text-[#D45A5A] hover:text-[#E87070] bg-transparent border-none cursor-pointer"
                        >
                          Remove image
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setNodeImageUploading(true);
                            try {
                              const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
                              const path = `nodes/${editingNode.id}/${Date.now()}.${ext}`;
                              const { error } = await supabase.storage.from("public-media").upload(path, file, { upsert: true });
                              if (error) {
                                alert(`Upload failed: ${error.message}`);
                                setNodeImageUploading(false);
                                return;
                              }
                              const { data: urlData } = supabase.storage.from("public-media").getPublicUrl(path);
                              const publicUrl = urlData.publicUrl;
                              await saveDraftNodePageField(editingNode.id, "image_url", publicUrl);
                            } catch (err) {
                              alert(`Upload error: ${err}`);
                            }
                            setNodeImageUploading(false);
                          }}
                          className="text-sm text-[#A89878] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-white/[0.1] file:bg-white/[0.04] file:text-[#D4C4A8] file:text-xs file:font-semibold file:cursor-pointer hover:file:bg-white/[0.08] file:transition-colors"
                        />
                        {nodeImageUploading && (
                          <span className="text-xs text-[#E8B84D] ml-2 animate-pulse">Uploading...</span>
                        )}
                      </div>
                    )}
                    <div className="mt-2">
                      <InlineField
                        value={npc?.draft_image_caption ?? npc?.image_caption ?? ""}
                        placeholder="Image caption (optional)"
                        onCommit={(val) => saveDraftNodePageField(editingNode.id, "image_caption", val)}
                        className="text-sm text-[#8B7B68]"
                      />
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className="text-[11px] text-[#8B7B68] uppercase tracking-wider font-semibold mb-2">
                      Video (YouTube or Vimeo URL)
                    </div>
                    <InlineField
                      value={npc?.draft_video_url ?? npc?.video_url ?? ""}
                      placeholder="Paste YouTube or Vimeo URL..."
                      onCommit={(val) => saveDraftNodePageField(editingNode.id, "video_url", val)}
                      className="text-sm text-[#D4C4A8]"
                    />
                    {(npc?.draft_video_url ?? npc?.video_url) && (() => {
                      const url = (npc?.draft_video_url ?? npc?.video_url)!;
                      const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                      const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
                      const embedUrl = ytMatch
                        ? `https://www.youtube.com/embed/${ytMatch[1]}`
                        : vimeoMatch
                        ? `https://player.vimeo.com/video/${vimeoMatch[1]}`
                        : null;
                      if (!embedUrl) return null;
                      return (
                        <div className="mt-3 aspect-video rounded-lg overflow-hidden border border-white/[0.08] max-w-md">
                          <iframe src={embedUrl} title="Video preview" allowFullScreen className="w-full h-full" />
                        </div>
                      );
                    })()}
                    <div className="mt-2">
                      <InlineField
                        value={npc?.draft_video_caption ?? npc?.video_caption ?? ""}
                        placeholder="Video caption (optional)"
                        onCommit={(val) => saveDraftNodePageField(editingNode.id, "video_caption", val)}
                        className="text-sm text-[#8B7B68]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/[0.06]">
                    <span className="text-xs text-[#6B5D4D] italic">
                      Changes auto-save as drafts. Click Publish to update the live page.
                    </span>
                    <button
                      onClick={() => {
                        if (confirm("Publish this update? Current live content will be archived.")) {
                          publishNodePage(editingNode.id);
                        }
                      }}
                      disabled={!(nodeHasDraft(editingNode.id) || npc?.narrative || npc?.image_url || npc?.video_url)}
                      className="px-5 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-[#C47A3A] hover:bg-[#D4884A] text-white"
                    >
                      {nodeHasDraft(editingNode.id) ? "Publish Update" : "Republish"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          );
        })()}
        </>}
      </div>

      {/* Footer */}
      <div className="text-center px-8 py-6 text-[#4A3E32] text-xs border-t border-white/[0.05] mt-10">
        mixmi ops · internal portal ·{" "}
        {new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </div>
    </div>
  );
}
