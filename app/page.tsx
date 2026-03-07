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

interface PromptSection {
  id: string;
  title: string;
  type: "prompt";
  status: "blank" | "in_progress" | "decided";
  prompt: string;
  response: string;
}

interface TextSection {
  id: string;
  title: string;
  type: "text";
  status: "blank" | "in_progress" | "decided";
  content: string;
}

interface BudgetRow {
  label: string;
  amount: number | null;
  notes: string;
}

interface BudgetSection {
  id: string;
  title: string;
  type: "budget";
  status: "blank" | "in_progress" | "decided";
  rows: BudgetRow[];
}

interface ChecklistItem {
  label: string;
  checked: boolean;
  notes: string;
}

interface ChecklistSection {
  id: string;
  title: string;
  type: "checklist";
  status: "blank" | "in_progress" | "decided";
  items: ChecklistItem[];
}

interface MediaSection {
  id: string;
  title: string;
  type: "media";
  status: "blank" | "in_progress" | "decided";
  url: string;
  caption: string;
}

type WorksheetSection = PromptSection | TextSection | BudgetSection | ChecklistSection | MediaSection;

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
// Section Editors
// ============================================================

function PromptSectionEditor({
  section,
  onChange,
}: {
  section: PromptSection;
  onChange: (updated: PromptSection) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="text-sm text-[#A89878] leading-relaxed bg-white/[0.03] rounded-lg p-3 border border-white/[0.06]">
        {section.prompt}
      </div>
      <textarea
        value={section.response}
        onChange={(e) => {
          const updated = { ...section, response: e.target.value };
          if (updated.status === "blank" && e.target.value.trim()) {
            updated.status = "in_progress";
          }
          onChange(updated);
        }}
        placeholder="Your response..."
        rows={4}
        className="w-full px-3 py-2.5 rounded-lg border border-white/[0.1] bg-white/[0.04] text-sm text-[#D4C4A8] placeholder-[#6B5D4D] focus:outline-none focus:border-[#C47A3A] transition-colors resize-y"
      />
    </div>
  );
}

function TextSectionEditor({
  section,
  onChange,
}: {
  section: TextSection;
  onChange: (updated: TextSection) => void;
}) {
  return (
    <textarea
      value={section.content}
      onChange={(e) => {
        const updated = { ...section, content: e.target.value };
        if (updated.status === "blank" && e.target.value.trim()) {
          updated.status = "in_progress";
        }
        onChange(updated);
      }}
      placeholder="Write here..."
      rows={5}
      className="w-full px-3 py-2.5 rounded-lg border border-white/[0.1] bg-white/[0.04] text-sm text-[#D4C4A8] placeholder-[#6B5D4D] focus:outline-none focus:border-[#C47A3A] transition-colors resize-y"
    />
  );
}

function BudgetSectionEditor({
  section,
  onChange,
}: {
  section: BudgetSection;
  onChange: (updated: BudgetSection) => void;
}) {
  const rows = section.rows || [];
  const updateRow = (idx: number, field: keyof BudgetRow, value: string | number | null) => {
    const newRows = [...rows];
    newRows[idx] = { ...newRows[idx], [field]: value };
    const updated = { ...section, rows: newRows };
    if (updated.status === "blank") updated.status = "in_progress";
    onChange(updated);
  };
  const addRow = () => {
    onChange({
      ...section,
      rows: [...rows, { label: "", amount: null, notes: "" }],
      status: section.status === "blank" ? "in_progress" : section.status,
    });
  };
  const removeRow = (idx: number) => {
    const newRows = rows.filter((_, i) => i !== idx);
    onChange({ ...section, rows: newRows });
  };
  const total = rows.reduce((sum, r) => sum + (r.amount || 0), 0);

  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input
            value={row.label}
            onChange={(e) => updateRow(i, "label", e.target.value)}
            placeholder="Item"
            className="flex-1 px-2.5 py-1.5 rounded-lg border border-white/[0.1] bg-white/[0.04] text-sm text-[#D4C4A8] placeholder-[#6B5D4D] focus:outline-none focus:border-[#C47A3A]"
          />
          <input
            type="number"
            value={row.amount ?? ""}
            onChange={(e) =>
              updateRow(i, "amount", e.target.value ? Number(e.target.value) : null)
            }
            placeholder="$0"
            className="w-24 px-2.5 py-1.5 rounded-lg border border-white/[0.1] bg-white/[0.04] text-sm text-[#D4C4A8] placeholder-[#6B5D4D] focus:outline-none focus:border-[#C47A3A] text-right"
          />
          <input
            value={row.notes}
            onChange={(e) => updateRow(i, "notes", e.target.value)}
            placeholder="Notes"
            className="w-32 px-2.5 py-1.5 rounded-lg border border-white/[0.1] bg-white/[0.04] text-sm text-[#D4C4A8] placeholder-[#6B5D4D] focus:outline-none focus:border-[#C47A3A]"
          />
          <button
            onClick={() => removeRow(i)}
            className="text-[#6B5D4D] hover:text-[#D45A5A] bg-transparent border-none cursor-pointer text-sm"
          >
            ×
          </button>
        </div>
      ))}
      <div className="flex justify-between items-center pt-2">
        <button
          onClick={addRow}
          className="text-xs text-[#A89878] hover:text-[#D4C4A8] bg-transparent border-none cursor-pointer"
        >
          + Add row
        </button>
        <div className="text-sm font-semibold text-[#D4C4A8]">
          Total: ${total.toLocaleString()}
        </div>
      </div>
    </div>
  );
}

function ChecklistSectionEditor({
  section,
  onChange,
}: {
  section: ChecklistSection;
  onChange: (updated: ChecklistSection) => void;
}) {
  const items = section.items || [];
  const updateItem = (idx: number, field: keyof ChecklistItem, value: string | boolean) => {
    const newItems = [...items];
    newItems[idx] = { ...newItems[idx], [field]: value };
    const updated = { ...section, items: newItems };
    if (updated.status === "blank") updated.status = "in_progress";
    onChange(updated);
  };
  const addItem = () => {
    onChange({
      ...section,
      items: [...items, { label: "", checked: false, notes: "" }],
      status: section.status === "blank" ? "in_progress" : section.status,
    });
  };
  const removeItem = (idx: number) => {
    const newItems = items.filter((_, i) => i !== idx);
    onChange({ ...section, items: newItems });
  };

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input
            type="checkbox"
            checked={item.checked}
            onChange={(e) => updateItem(i, "checked", e.target.checked)}
            className="accent-[#5DBF82] w-4 h-4 cursor-pointer"
          />
          <input
            value={item.label}
            onChange={(e) => updateItem(i, "label", e.target.value)}
            placeholder="Item"
            className="flex-1 px-2.5 py-1.5 rounded-lg border border-white/[0.1] bg-white/[0.04] text-sm text-[#D4C4A8] placeholder-[#6B5D4D] focus:outline-none focus:border-[#C47A3A]"
          />
          <input
            value={item.notes}
            onChange={(e) => updateItem(i, "notes", e.target.value)}
            placeholder="Notes"
            className="w-32 px-2.5 py-1.5 rounded-lg border border-white/[0.1] bg-white/[0.04] text-sm text-[#D4C4A8] placeholder-[#6B5D4D] focus:outline-none focus:border-[#C47A3A]"
          />
          <button
            onClick={() => removeItem(i)}
            className="text-[#6B5D4D] hover:text-[#D45A5A] bg-transparent border-none cursor-pointer text-sm"
          >
            ×
          </button>
        </div>
      ))}
      <button
        onClick={addItem}
        className="text-xs text-[#A89878] hover:text-[#D4C4A8] bg-transparent border-none cursor-pointer"
      >
        + Add item
      </button>
    </div>
  );
}

function SectionRenderer({
  section,
  onChange,
}: {
  section: WorksheetSection;
  onChange: (updated: WorksheetSection) => void;
}) {
  const statusCfg = sectionStatusConfig[section.status] || sectionStatusConfig.blank;
  return (
    <div className="bg-white/[0.03] rounded-xl p-5 border border-white/[0.06]">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-sm font-semibold text-[#D4C4A8] tracking-tight">
          {section.title}
        </h4>
        <span
          className="text-[11px] font-semibold tracking-wide"
          style={{ color: statusCfg.color }}
        >
          {statusCfg.label}
        </span>
      </div>
      {section.type === "prompt" && (
        <PromptSectionEditor section={section} onChange={onChange as (u: PromptSection) => void} />
      )}
      {section.type === "text" && (
        <TextSectionEditor section={section} onChange={onChange as (u: TextSection) => void} />
      )}
      {section.type === "budget" && (
        <BudgetSectionEditor section={section} onChange={onChange as (u: BudgetSection) => void} />
      )}
      {section.type === "checklist" && (
        <ChecklistSectionEditor section={section} onChange={onChange as (u: ChecklistSection) => void} />
      )}
      {section.type === "media" && (
        <div className="text-sm text-[#6B5D4D] italic">Media sections coming soon</div>
      )}
    </div>
  );
}

// ============================================================
// Worksheet Detail
// ============================================================

function WorksheetDetail({
  worksheet,
  dirty,
  saving,
  onSectionChange,
  onPhaseChange,
  onSave,
  onBack,
}: {
  worksheet: Worksheet;
  dirty: boolean;
  saving: boolean;
  onSectionChange: (sectionId: string, updated: WorksheetSection) => void;
  onPhaseChange: (phase: string) => void;
  onSave: () => void;
  onBack: () => void;
}) {
  return (
    <div>
      <button
        onClick={onBack}
        className="mb-4 px-0 py-1 border-none bg-transparent text-[#A89878] text-sm cursor-pointer hover:text-[#D4C4A8] transition-colors"
      >
        &larr; All Worksheets
      </button>

      {/* Header */}
      <div className="bg-white/[0.04] backdrop-blur-sm rounded-2xl p-6 border border-white/[0.06] mb-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 min-w-0">
            <div className="text-xl font-semibold text-[#E8DCC8] tracking-tight">
              {worksheet.title}
            </div>
            {worksheet.description && (
              <div className="text-sm text-[#8B7B68] mt-1">{worksheet.description}</div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <select
              value={worksheet.phase}
              onChange={(e) => onPhaseChange(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-white/[0.1] bg-[#1A1816] text-sm text-[#D4C4A8] focus:outline-none focus:border-[#C47A3A] cursor-pointer"
            >
              <option value="draft">Draft</option>
              <option value="working">Working</option>
              <option value="processed">Processed</option>
            </select>
            <button
              onClick={onSave}
              disabled={!dirty || saving}
              className={`px-4 py-1.5 rounded-lg border-none text-sm font-semibold cursor-pointer transition-all ${
                dirty
                  ? "bg-[#C47A3A] text-white hover:bg-[#D4884A]"
                  : "bg-white/[0.06] text-[#6B5D4D] cursor-default"
              } disabled:opacity-50`}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-[#6B5D4D]">
          {worksheet.template_type && (
            <span>{templateLabels[worksheet.template_type] || worksheet.template_type}</span>
          )}
          {worksheet.pilot_nodes && <span>· {worksheet.pilot_nodes.name}</span>}
          {worksheet.created_by && <span>· by {worksheet.created_by}</span>}
          <span>· updated {new Date(worksheet.updated_at).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {(worksheet.sections || []).length === 0 ? (
          <div className="text-[#6B5D4D] text-sm italic bg-white/[0.03] rounded-xl p-6 border border-white/[0.06]">
            This worksheet has no sections yet. Add sections via Supabase.
          </div>
        ) : (
          (worksheet.sections || []).map((section) => (
            <SectionRenderer
              key={section.id}
              section={section}
              onChange={(updated) => onSectionChange(section.id, updated)}
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
  const [worksheetDirty, setWorksheetDirty] = useState(false);

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
    setWorksheetDirty(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleSectionChange = useCallback(
    (sectionId: string, updated: WorksheetSection) => {
      if (!selectedWorksheet) return;
      const newSections = (selectedWorksheet.sections || []).map((s) =>
        s.id === sectionId ? updated : s
      );
      setSelectedWorksheet({ ...selectedWorksheet, sections: newSections });
      setWorksheetDirty(true);
    },
    [selectedWorksheet]
  );

  const handlePhaseChange = useCallback(
    (phase: string) => {
      if (!selectedWorksheet) return;
      setSelectedWorksheet({ ...selectedWorksheet, phase });
      setWorksheetDirty(true);
    },
    [selectedWorksheet]
  );

  const saveWorksheet = useCallback(async () => {
    if (!selectedWorksheet) return;
    setWorksheetSaving(true);
    try {
      const { error } = await supabase
        .from("worksheets")
        .update({
          sections: selectedWorksheet.sections,
          phase: selectedWorksheet.phase,
        })
        .eq("id", selectedWorksheet.id);
      if (error) throw error;
      setWorksheets((prev) =>
        prev.map((ws) =>
          ws.id === selectedWorksheet.id
            ? { ...ws, sections: selectedWorksheet.sections, phase: selectedWorksheet.phase, updated_at: new Date().toISOString() }
            : ws
        )
      );
      setWorksheetDirty(false);
    } catch (e) {
      console.error("Save worksheet error:", e);
    }
    setWorksheetSaving(false);
  }, [selectedWorksheet]);

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
            dirty={worksheetDirty}
            saving={worksheetSaving}
            onSectionChange={handleSectionChange}
            onPhaseChange={handlePhaseChange}
            onSave={saveWorksheet}
            onBack={() => { setSelectedWorksheet(null); setWorksheetDirty(false); }}
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
