"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

// ============================================================
// Types
// ============================================================

interface PilotNode {
  id: string;
  name: string;
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
  pilot_nodes?: { name: string } | null;
}

// -- Worksheet types --

type SectionStatus = "blank" | "in_progress" | "decided";

interface NarrativeSection {
  id: string;
  title: string;
  type: "narrative";
  status: SectionStatus;
  body: string;
  subtitle?: string;
}

interface PromptSection {
  id: string;
  title: string;
  type: "prompt";
  status: SectionStatus;
  context?: string;
  prompt: string;
  response: string;
  notes?: string;
  subtitle?: string;
}

interface TextSection {
  id: string;
  title: string;
  type: "text";
  status: SectionStatus;
  content: string;
  subtitle?: string;
}

interface BudgetRow {
  label: string;
  low?: number | null;
  high?: number | null;
  amount: number | null;
  notes: string;
}

interface BudgetSection {
  id: string;
  title: string;
  type: "budget";
  status: SectionStatus;
  context?: string;
  rows: BudgetRow[];
  subtitle?: string;
}

interface ChecklistItem {
  label: string;
  checked: boolean;
  notes: string;
  item_status?: "blank" | "confirmed" | "rejected" | "needs_discussion";
}

interface ChecklistSection {
  id: string;
  title: string;
  type: "checklist";
  status: SectionStatus;
  context?: string;
  items: ChecklistItem[];
  subtitle?: string;
}

interface MatrixCell {
  value: string;
  cell_status?: "not_started" | "in_progress" | "done" | "blocked";
}

interface MatrixSection {
  id: string;
  title: string;
  type: "matrix";
  status: SectionStatus;
  context?: string;
  columns: string[];
  rows: { label: string; cells: MatrixCell[] }[];
  subtitle?: string;
}

interface RoleCard {
  person: string;
  leads: string;
  responsibilities: string;
}

interface RolesSection {
  id: string;
  title: string;
  type: "roles";
  status: SectionStatus;
  context?: string;
  roles: RoleCard[];
  subtitle?: string;
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
      {stream}
    </span>
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

function NarrativeSectionRenderer({ section }: { section: NarrativeSection }) {
  return (
    <div>
      <DocSectionHeader title={section.title} subtitle={section.subtitle} />
      <NarrativeBody text={section.body} />
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
  return (
    <div>
      <DocSectionHeader title={section.title} subtitle={section.subtitle} status={section.status} />
      {section.context && (
        <div className="mb-4"><NarrativeBody text={section.context} /></div>
      )}
      <div className="text-[15px] text-[#D4C4A8] leading-[1.7] mb-3 font-medium italic">
        {section.prompt}
      </div>
      <InlineTextarea
        value={section.response}
        placeholder="Click to add your response..."
        onCommit={(val) => {
          const updated = { ...section, response: val };
          if (updated.status === "blank" && val.trim()) updated.status = "in_progress";
          onCommit(updated);
        }}
      />
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
  const rows = section.rows || [];
  const hasRanges = rows.some((r) => r.low != null || r.high != null);

  const commitRow = (idx: number, field: keyof BudgetRow, value: string | number | null) => {
    const newRows = [...rows];
    newRows[idx] = { ...newRows[idx], [field]: value };
    const updated = { ...section, rows: newRows };
    if (updated.status === "blank") updated.status = "in_progress";
    onCommit(updated);
  };

  const addRow = () => {
    onCommit({
      ...section,
      rows: [...rows, { label: "", low: null, high: null, amount: null, notes: "" }],
      status: section.status === "blank" ? "in_progress" : section.status,
    });
  };

  const totalActual = rows.reduce((sum, r) => sum + (r.amount || 0), 0);
  const totalLow = rows.reduce((sum, r) => sum + (r.low || 0), 0);
  const totalHigh = rows.reduce((sum, r) => sum + (r.high || 0), 0);

  return (
    <div>
      <DocSectionHeader title={section.title} subtitle={section.subtitle} status={section.status} />
      {section.context && (
        <div className="mb-4"><NarrativeBody text={section.context} /></div>
      )}
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
                  <InlineNumber value={row.amount} placeholder="—" prefix="$" onCommit={(val) => commitRow(i, "amount", val)} className="w-full text-sm text-[#D4C4A8] font-medium" />
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
      {section.context && (
        <div className="mb-4"><NarrativeBody text={section.context} /></div>
      )}
      <div className="space-y-1.5">
        {items.map((item, i) => {
          const itemSt = checklistItemStatusConfig[item.item_status || "blank"] || checklistItemStatusConfig.blank;
          return (
            <div key={i} className="flex items-start gap-3 py-1.5 group">
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
                <div className="flex items-center gap-2">
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
                  {itemSt.label && (
                    <span className="text-[10px] font-semibold tracking-wide px-1.5 py-0.5 rounded" style={{ color: itemSt.color, background: `${itemSt.color}15` }}>
                      {itemSt.icon} {itemSt.label}
                    </span>
                  )}
                </div>
                {(item.notes || true) && (
                  <InlineField
                    value={item.notes}
                    placeholder="Add notes..."
                    onCommit={(val) => commitItem(i, { notes: val })}
                    className="text-[13px] text-[#8B7B68] mt-0.5 block"
                  />
                )}
              </div>
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
          );
        })}
      </div>
      <button
        onClick={addItem}
        className="mt-2 text-xs text-[#8B7B68] hover:text-[#D4C4A8] bg-transparent border-none cursor-pointer"
      >
        + Add item
      </button>
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

  const commitCell = (rowIdx: number, colIdx: number, updates: Partial<MatrixCell>) => {
    const newRows = [...matrixRows];
    const cells = [...(newRows[rowIdx].cells || [])];
    cells[colIdx] = { ...(cells[colIdx] || { value: "" }), ...updates };
    newRows[rowIdx] = { ...newRows[rowIdx], cells };
    const updated = { ...section, rows: newRows };
    if (updated.status === "blank") updated.status = "in_progress";
    onCommit(updated);
  };

  return (
    <div>
      <DocSectionHeader title={section.title} subtitle={section.subtitle} status={section.status} />
      {section.context && (
        <div className="mb-4"><NarrativeBody text={section.context} /></div>
      )}
      <div className="rounded-lg border border-white/[0.08] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.08]">
              <th className="text-left px-3 py-2.5 text-[11px] text-[#8B7B68] uppercase tracking-wider font-semibold min-w-[140px]">Area</th>
              {columns.map((col, ci) => (
                <th key={ci} className="text-left px-3 py-2.5 text-[11px] text-[#8B7B68] uppercase tracking-wider font-semibold min-w-[180px]">{col}</th>
              ))}
              <th className="text-left px-3 py-2.5 text-[11px] text-[#8B7B68] uppercase tracking-wider font-semibold w-24">Status</th>
            </tr>
          </thead>
          <tbody>
            {matrixRows.map((row, ri) => (
              <tr key={ri} className={`border-b border-white/[0.04] ${ri % 2 === 1 ? "bg-white/[0.02]" : ""}`}>
                <td className="px-3 py-2 text-[#D4C4A8] font-medium text-[13px] align-top">{row.label}</td>
                {columns.map((_, ci) => {
                  const cell = row.cells?.[ci] || { value: "", cell_status: "not_started" };
                  return (
                    <td key={ci} className="px-3 py-2 align-top">
                      <InlineField
                        value={cell.value}
                        placeholder="—"
                        onCommit={(val) => commitCell(ri, ci, { value: val })}
                        className="text-[13px] text-[#A89878] leading-relaxed"
                      />
                    </td>
                  );
                })}
                <td className="px-3 py-2 align-top">
                  {(() => {
                    const lastCell = row.cells?.[columns.length - 1] || row.cells?.[0];
                    const st = lastCell?.cell_status || "not_started";
                    const cfg = matrixCellColors[st] || matrixCellColors.not_started;
                    return (
                      <select
                        value={st}
                        onChange={(e) => {
                          const colIdx = columns.length - 1;
                          commitCell(ri, Math.max(colIdx, 0), { cell_status: e.target.value as MatrixCell["cell_status"] });
                        }}
                        className="text-[11px] px-1.5 py-1 rounded border border-white/[0.08] bg-[#1A1816] focus:outline-none cursor-pointer"
                        style={{ color: cfg.color }}
                      >
                        <option value="not_started">Not Started</option>
                        <option value="in_progress">In Progress</option>
                        <option value="done">Done</option>
                        <option value="blocked">Blocked</option>
                      </select>
                    );
                  })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
      {section.context && (
        <div className="mb-4"><NarrativeBody text={section.context} /></div>
      )}
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
        ← All Nodes
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
  const [worksheetSaving, setWorksheetSaving] = useState(false);

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
      const [nodesRes, msRes, contactsRes, decisionsRes, engRes, wsRes] = await Promise.all([
        supabase.from("pilot_nodes").select("*").order("created_at"),
        supabase.from("milestones").select("*, pilot_nodes(name)").order("created_at"),
        supabase.from("community_contacts").select("*, pilot_nodes(name)").order("name"),
        supabase.from("decisions_log").select("*").order("decided_at", { ascending: false }),
        supabase.from("engagement_logs").select("*, pilot_nodes(name)").order("created_at", { ascending: false }).limit(20),
        supabase.from("worksheets").select("*, pilot_nodes(name)").order("updated_at", { ascending: false }),
      ]);
      if (nodesRes.data) setNodes(nodesRes.data);
      if (msRes.data) setMilestones(msRes.data);
      if (contactsRes.data) setContacts(contactsRes.data);
      if (decisionsRes.data) setDecisions(decisionsRes.data);
      if (engRes.data) setEngagement(engRes.data);
      if (wsRes.data) setWorksheets(wsRes.data);
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

  const activeMilestones = milestones.filter(
    (m) => m.status === "in_progress" || m.status === "next"
  );
  const doneMilestones = milestones.filter((m) => m.status === "done");
  const blockedMilestones = milestones.filter((m) => m.status === "blocked");
  const activeNodes = nodes.filter(
    (n) => n.status === "active" || n.status === "activating"
  );
  const filteredMilestones =
    milestoneFilter === "all"
      ? milestones
      : milestones.filter((m) => m.stream === milestoneFilter);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="px-8 py-5 flex items-center justify-between border-b border-white/[0.06] bg-black/20 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex items-baseline gap-3">
          <span className="text-[22px] font-light text-[#D4C4A8] tracking-tight">
            mixmi <span className="font-semibold">ops</span>
          </span>
          <span className="text-xs text-[#6B5D4D] italic">pilot operations</span>
        </div>
        <div className="flex gap-1 bg-white/[0.03] rounded-lg p-0.5">
          <Tab label="Overview" active={tab === "overview"} onClick={() => { setTab("overview"); setSelectedNode(null); setSelectedWorksheet(null); }} />
          <Tab label="Milestones" active={tab === "milestones"} onClick={() => { setTab("milestones"); setSelectedNode(null); setSelectedWorksheet(null); }} count={milestones.length} />
          <Tab label="Nodes" active={tab === "nodes"} onClick={() => { setTab("nodes"); setSelectedNode(null); setSelectedWorksheet(null); }} count={nodes.length} />
          <Tab label="Contacts" active={tab === "contacts"} onClick={() => { setTab("contacts"); setSelectedNode(null); setSelectedWorksheet(null); }} count={contacts.length} />
          <Tab label="Decisions" active={tab === "decisions"} onClick={() => { setTab("decisions"); setSelectedNode(null); setSelectedWorksheet(null); }} count={decisions.length} />
          <Tab label="Worksheets" active={tab === "worksheets"} onClick={() => { setTab("worksheets"); setSelectedNode(null); setSelectedWorksheet(null); }} count={worksheets.length} />
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
              <Stat label="Pilot Nodes" value={nodes.length} color="#5DBF82" />
              <Stat label="Activating" value={activeNodes.length} color="#E8B84D" />
              <Stat label="In Progress" value={activeMilestones.length} color="#D4884A" />
              <Stat label="Completed" value={doneMilestones.length} color="#5DBF82" />
              <Stat label="Blocked" value={blockedMilestones.length} color="#D45A5A" />
              <Stat label="Contacts" value={contacts.length} color="#9B7ED8" />
            </div>

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
                Pilot Nodes
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {nodes.map((n) => (
                  <NodeCard key={n.id} node={n} onClick={() => selectNode(n)} />
                ))}
              </div>
            </div>

            <div className="bg-white/[0.03] rounded-2xl p-6 border border-white/[0.06]">
              <h3 className="text-[15px] font-semibold text-[#D4C4A8] mb-4 tracking-tight">
                Recent Activity
              </h3>
              {engagement.length === 0 ? (
                <div className="text-[#6B5D4D] text-sm italic">
                  No activity logged yet. Engagement events will appear here as nodes become active.
                </div>
              ) : (
                engagement.map((e) => (
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
                    {f}
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
            {nodes.map((n) => (
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
            {contacts.map((c) => (
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
