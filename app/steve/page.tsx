"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

// ============================================================
// Types (only what this page needs)
// ============================================================

interface PilotNode {
  id: string;
  name: string;
  region: string;
  country: string;
  lead_name: string | null;
  status: string;
  what_it_tests: string | null;
}

interface Milestone {
  id: string;
  title: string;
  stream: string;
  status: string;
  target_week: string | null;
  is_public: boolean;
  updated_at?: string;
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
};

const streamColors: Record<string, string> = {
  platform: "#5A8A6E",
  pilot: "#C47A3A",
  tooling: "#7B6B9E",
  investor: "#9E8B6B",
  ops: "#6B7B9E",
};

const FALLBACK_NARRATIVE = `We're in the first weeks of activating four seed communities across Kenya, the US, and beyond. The ops infrastructure is live, the team is coordinating through AI-powered tools, and our first content uploads are on the horizon.`;

// ============================================================
// Helpers
// ============================================================

function parseVideoEmbed(url: string): { type: "youtube" | "vimeo" | "unknown"; embedUrl: string } {
  // YouTube: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch) {
    return { type: "youtube", embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}` };
  }
  // Vimeo: vimeo.com/ID
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return { type: "vimeo", embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
  }
  return { type: "unknown", embedUrl: url };
}

// ============================================================
// Small components
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

function FadeIn({ delay, children }: { delay: number; children: React.ReactNode }) {
  return (
    <div
      className="animate-fadeIn"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      {children}
    </div>
  );
}

// ============================================================
// Main page
// ============================================================

export default function StevePage() {
  const [nodes, setNodes] = useState<PilotNode[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [contactCount, setContactCount] = useState(0);
  const [content, setContent] = useState<Record<string, string>>({});
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nodesExpanded, setNodesExpanded] = useState(false);

  useEffect(() => {
    async function load() {
      const [nodesRes, msRes, contactsRes, contentRes] = await Promise.all([
        supabase
          .from("pilot_nodes")
          .select("id, name, region, country, lead_name, status, what_it_tests")
          .order("created_at"),
        supabase
          .from("milestones")
          .select("id, title, stream, status, target_week, is_public, updated_at")
          .eq("is_public", true)
          .in("stream", ["platform", "pilot"])
          .order("created_at"),
        supabase
          .from("community_contacts")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("site_content")
          .select("key, value")
          .in("key", [
            "steve_narrative",
            "steve_image_url",
            "steve_image_caption",
            "steve_video_url",
            "steve_video_caption",
            "steve_updates",
          ]),
      ]);

      if (nodesRes.data) setNodes(nodesRes.data);
      if (msRes.data) {
        setMilestones(msRes.data);
        const dates = msRes.data
          .map((m) => m.updated_at)
          .filter(Boolean)
          .sort()
          .reverse();
        if (dates.length > 0) setLastUpdated(dates[0]!);
      }
      if (contactsRes.count != null) setContactCount(contactsRes.count);
      if (contentRes.data) {
        const map: Record<string, string> = {};
        contentRes.data.forEach((row: { key: string; value: string }) => {
          map[row.key] = row.value;
        });
        setContent(map);
      }
      setLoading(false);
    }
    load();
  }, []);

  // Derived data
  const narrative = content.steve_narrative || FALLBACK_NARRATIVE;
  const imageUrl = content.steve_image_url || "";
  const imageCaption = content.steve_image_caption || "";
  const videoUrl = content.steve_video_url || "";
  const videoCaption = content.steve_video_caption || "";
  const hasMedia = imageUrl.trim() !== "" || videoUrl.trim() !== "";
  const steveUpdates: { date: string; narrative: string; image_url: string | null; image_caption: string | null; video_url: string | null; video_caption: string | null }[] = (() => {
    try { return JSON.parse(content.steve_updates || "[]"); } catch { return []; }
  })();

  const activeNodeCount = nodes.filter((n) =>
    ["activating", "active", "scaling"].includes(n.status)
  ).length;
  const completedMilestones = milestones.filter((m) => m.status === "done").length;
  const upcomingMilestones = milestones
    .filter((m) => ["next", "in_progress"].includes(m.status))
    .slice(0, 5);

  // Group milestones by stream
  const streams = [...new Set(milestones.map((m) => m.stream))];
  const milestonesByStream = streams.map((stream) => {
    const items = milestones.filter((m) => m.stream === stream);
    const done = items.filter((m) => m.status === "done").length;
    return { stream, items, done, total: items.length };
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[#8B7B68] text-lg animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out;
        }
        @keyframes pulseGlow {
          0%, 100% {
            border-color: rgba(232, 184, 77, 0.15);
            box-shadow: 0 0 0 0 rgba(232, 184, 77, 0);
          }
          50% {
            border-color: rgba(232, 184, 77, 0.35);
            box-shadow: 0 0 12px 0 rgba(232, 184, 77, 0.08);
          }
        }
        .pulse-activating {
          animation: pulseGlow 3s ease-in-out infinite;
        }
      `}</style>

      <div className="min-h-screen px-4 py-12 sm:py-16">
        <div className="max-w-[768px] mx-auto">

          {/* ── Header ── */}
          <FadeIn delay={0}>
            <header className="mb-16 text-center">
              <h1 className="text-4xl sm:text-5xl font-light tracking-tight text-[#E8DCC8] mb-2">
                mixmi
              </h1>
              <p className="text-lg text-[#8B7B68] tracking-widest uppercase font-semibold">
                Seed Node Progress
              </p>
              {lastUpdated && (
                <p className="text-xs text-[#6B5D4D] mt-3">
                  Last updated{" "}
                  {new Date(lastUpdated).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              )}
            </header>
          </FadeIn>

          {/* ── The Story ── */}
          <FadeIn delay={100}>
            <section className="mb-16">
              <div className="border-l-2 border-[#C47A3A]/40 pl-6 py-2">
                <p className="text-xl sm:text-[22px] text-[#D4C4A8] leading-relaxed font-light whitespace-pre-line">
                  {narrative}
                </p>
              </div>
            </section>
          </FadeIn>

          {/* ── Media (image + video) ── */}
          {hasMedia && (
            <FadeIn delay={150}>
              <section className="mb-16 space-y-8">
                {imageUrl.trim() && (
                  <div>
                    <img
                      src={imageUrl}
                      alt={imageCaption || "Mixmi seed node"}
                      className="w-full rounded-xl border border-white/[0.08] object-cover max-h-[480px]"
                    />
                    {imageCaption && (
                      <p className="text-[13px] text-[#8B7B68] mt-2 text-center italic">
                        {imageCaption}
                      </p>
                    )}
                  </div>
                )}
                {videoUrl.trim() && (() => {
                  const { type, embedUrl } = parseVideoEmbed(videoUrl);
                  if (type === "unknown") {
                    return (
                      <div>
                        <a
                          href={videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#C47A3A] hover:text-[#E8B84D] transition-colors text-sm"
                        >
                          Watch video →
                        </a>
                        {videoCaption && (
                          <p className="text-[13px] text-[#8B7B68] mt-1 italic">{videoCaption}</p>
                        )}
                      </div>
                    );
                  }
                  return (
                    <div>
                      <div className="aspect-video rounded-xl overflow-hidden border border-white/[0.08]">
                        <iframe
                          src={embedUrl}
                          title={videoCaption || "Video"}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="w-full h-full"
                        />
                      </div>
                      {videoCaption && (
                        <p className="text-[13px] text-[#8B7B68] mt-2 text-center italic">
                          {videoCaption}
                        </p>
                      )}
                    </div>
                  );
                })()}
              </section>
            </FadeIn>
          )}

          {/* ── Update History ── */}
          {steveUpdates.length > 0 && (
            <FadeIn delay={175}>
              <section className="mb-16">
                <h2 className="text-sm text-[#8B7B68] uppercase tracking-widest font-semibold mb-5">
                  Updates
                </h2>
                <div className="space-y-0">
                  {steveUpdates.map((entry, i) => (
                    <div key={i} className="border-l-2 border-[#8B7B68]/30 pl-5 pb-8 relative">
                      <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-[#8B7B68]/60" />
                      <p className="text-[11px] text-[#6B5D4D] uppercase tracking-wider font-semibold mb-2">
                        {new Date(entry.date).toLocaleDateString("en-US", {
                          month: "long", day: "numeric", year: "numeric",
                        })}
                      </p>
                      {entry.narrative && (
                        <p className="text-sm text-[#A89878] leading-relaxed whitespace-pre-line mb-3">
                          {entry.narrative}
                        </p>
                      )}
                      {entry.image_url && (
                        <div className="mb-3">
                          <img src={entry.image_url} alt={entry.image_caption || "Previous update"} className="max-h-48 rounded-lg border border-white/[0.06] object-cover" />
                          {entry.image_caption && <p className="text-[11px] text-[#6B5D4D] mt-1 italic">{entry.image_caption}</p>}
                        </div>
                      )}
                      {entry.video_url && (() => {
                        const { type, embedUrl } = parseVideoEmbed(entry.video_url);
                        if (type === "unknown") return (
                          <div className="mb-3">
                            <a href={entry.video_url} target="_blank" rel="noopener noreferrer" className="text-[#C47A3A] hover:text-[#E8B84D] transition-colors text-xs">Watch video →</a>
                            {entry.video_caption && <p className="text-[11px] text-[#6B5D4D] mt-1 italic">{entry.video_caption}</p>}
                          </div>
                        );
                        return (
                          <div className="mb-3">
                            <div className="aspect-video rounded-lg overflow-hidden border border-white/[0.06] max-w-sm">
                              <iframe src={embedUrl} title={entry.video_caption || "Video"} allowFullScreen className="w-full h-full" />
                            </div>
                            {entry.video_caption && <p className="text-[11px] text-[#6B5D4D] mt-1 italic">{entry.video_caption}</p>}
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              </section>
            </FadeIn>
          )}

          {/* ── Key Numbers ── */}
          <FadeIn delay={200}>
            <section className="mb-16">
              <div className="flex gap-3 sm:gap-4">
                <Stat label="Nodes Active" value={activeNodeCount} color="#E8B84D" />
                <Stat label="Milestones Done" value={completedMilestones} color="#5DBF82" />
                <Stat label="Contacts Engaged" value={contactCount} color="#9B7ED8" />
              </div>
            </section>
          </FadeIn>

          {/* ── Node Progress Timeline ── */}
          {nodes.length > 0 && (
            <FadeIn delay={250}>
              <section className="mb-16">
                <h2 className="text-sm text-[#8B7B68] uppercase tracking-widest font-semibold mb-5">
                  Node Progress
                </h2>
                <div className="bg-white/[0.03] rounded-xl p-5 border border-white/[0.06]">
                  <NodeProgressTimeline nodes={nodes} />
                </div>
              </section>
            </FadeIn>
          )}

          {/* ── Seed Communities ── */}
          <FadeIn delay={350}>
            <section className="mb-16">
              <button
                onClick={() => setNodesExpanded((v) => !v)}
                className="flex items-center gap-2 mb-4 group bg-transparent border-none cursor-pointer p-0"
              >
                <h2 className="text-sm text-[#8B7B68] uppercase tracking-widest font-semibold">
                  Seed Communities
                </h2>
                <span className={`text-[#6B5D4D] text-xs transition-transform duration-200 ${nodesExpanded ? "rotate-90" : ""}`}>
                  ▶
                </span>
              </button>

              {!nodesExpanded ? (
                <div
                  onClick={() => setNodesExpanded(true)}
                  className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-[#A89878] cursor-pointer hover:text-[#D4C4A8] transition-colors"
                >
                  {nodes.slice(0, 4).map((n, i) => (
                    <span key={n.id} className="inline-flex items-center gap-1.5">
                      {i > 0 && <span className="text-[#6B5D4D]">·</span>}
                      <span>{n.name}</span>
                      <StatusBadge status={n.status} />
                    </span>
                  ))}
                  {nodes.length > 4 && (
                    <span className="text-[#6B5D4D] ml-1">+ {nodes.length - 4} more</span>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {nodes.map((node) => (
                    <div
                      key={node.id}
                      className={`rounded-xl bg-white/[0.04] border border-white/[0.08] p-5 ${
                        node.status === "activating" ? "pulse-activating" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-[17px] font-semibold text-[#E8DCC8]">{node.name}</h3>
                        <StatusBadge status={node.status} />
                      </div>
                      {node.lead_name && (
                        <div className="text-xs text-[#8B7B68] mb-2">
                          Led by {node.lead_name}
                        </div>
                      )}
                      {node.what_it_tests && (
                        <p className="text-[13px] text-[#A89878] leading-relaxed">
                          {node.what_it_tests.length > 140
                            ? node.what_it_tests.slice(0, 140) + "..."
                            : node.what_it_tests}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </FadeIn>

          {/* ── Milestones by Stream ── */}
          <FadeIn delay={400}>
            <section className="mb-16">
              <h2 className="text-sm text-[#8B7B68] uppercase tracking-widest font-semibold mb-5">
                Progress by Stream
              </h2>
              <div className="space-y-6">
                {milestonesByStream.map(({ stream, items, done, total }) => (
                  <div key={stream}>
                    <div className="flex items-center gap-3 mb-2">
                      <StreamBadge stream={stream} />
                      <span className="text-xs text-[#6B5D4D]">
                        {done} of {total} complete
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 rounded-full bg-white/[0.06] mb-3 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: total > 0 ? `${(done / total) * 100}%` : "0%",
                          background: streamColors[stream] || "#666",
                        }}
                      />
                    </div>
                    {/* Milestone list */}
                    <div className="space-y-1.5 pl-1">
                      {items.map((m) => {
                        const sc = statusConfig[m.status] || statusConfig.planned;
                        return (
                          <div key={m.id} className="flex items-center gap-2.5 text-[13px]">
                            <span className="text-[10px]" style={{ color: sc.color }}>
                              {sc.icon}
                            </span>
                            <span className={m.status === "done" ? "text-[#8B7B68]" : "text-[#D4C4A8]"}>
                              {m.title}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </FadeIn>

          {/* ── What's Next ── */}
          {upcomingMilestones.length > 0 && (
            <FadeIn delay={500}>
              <section className="mb-16">
                <h2 className="text-sm text-[#8B7B68] uppercase tracking-widest font-semibold mb-5">
                  What&apos;s Next
                </h2>
                <div className="space-y-2.5">
                  {upcomingMilestones.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/[0.03] border border-white/[0.06]"
                    >
                      <StreamBadge stream={m.stream} />
                      <span className="text-[14px] text-[#D4C4A8] flex-1">{m.title}</span>
                      <StatusBadge status={m.status} />
                    </div>
                  ))}
                </div>
              </section>
            </FadeIn>
          )}

          {/* ── Footer ── */}
          <FadeIn delay={600}>
            <footer className="text-center pt-8 pb-4 border-t border-white/[0.06]">
              <p className="text-sm text-[#8B7B68]">
                <a
                  href="mailto:hoover.sandy@gmail.com"
                  className="text-[#C47A3A] hover:text-[#E8B84D] transition-colors"
                >
                  Questions? Get in touch
                </a>
              </p>
            </footer>
          </FadeIn>

        </div>
      </div>
    </>
  );
}
