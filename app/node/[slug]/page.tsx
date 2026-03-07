"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

// ============================================================
// Types
// ============================================================

interface PilotNode {
  id: string;
  name: string;
  slug: string;
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
  pilot_node_id: string | null;
  updated_at?: string;
}

interface NodePageContent {
  narrative: string;
  image_url: string | null;
  image_caption: string | null;
  video_url: string | null;
  video_caption: string | null;
  updated_at: string;
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
  ops: "#6B7B9E",
};

// ============================================================
// Helpers
// ============================================================

function parseVideoEmbed(url: string): { type: "youtube" | "vimeo" | "unknown"; embedUrl: string } {
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch) {
    return { type: "youtube", embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}` };
  }
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

export default function NodeProgressPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [node, setNode] = useState<PilotNode | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [contactCount, setContactCount] = useState(0);
  const [content, setContent] = useState<NodePageContent | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      // 1. Resolve slug to node
      const { data: nodeData, error } = await supabase
        .from("pilot_nodes")
        .select("id, name, slug, region, country, lead_name, status, what_it_tests")
        .eq("slug", slug)
        .single();

      if (error || !nodeData) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setNode(nodeData);

      // 2. Fetch node-scoped data in parallel
      const [msRes, contactsRes, contentRes] = await Promise.all([
        supabase
          .from("milestones")
          .select("id, title, stream, status, target_week, is_public, pilot_node_id, updated_at")
          .eq("is_public", true)
          .neq("stream", "investor")
          .or(`pilot_node_id.eq.${nodeData.id},pilot_node_id.is.null`)
          .order("created_at"),
        supabase
          .from("community_contacts")
          .select("id", { count: "exact", head: true })
          .eq("pilot_node_id", nodeData.id),
        supabase
          .from("node_page_content")
          .select("narrative, image_url, image_caption, video_url, video_caption, updated_at")
          .eq("pilot_node_id", nodeData.id)
          .single(),
      ]);

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
        setContent(contentRes.data);
        if (contentRes.data.updated_at) {
          setLastUpdated((prev) => {
            if (!prev) return contentRes.data!.updated_at;
            return contentRes.data!.updated_at > prev ? contentRes.data!.updated_at : prev;
          });
        }
      }

      setLoading(false);
    }
    load();
  }, [slug]);

  // Derived data
  const narrative = content?.narrative || "";
  const imageUrl = content?.image_url || "";
  const imageCaption = content?.image_caption || "";
  const videoUrl = content?.video_url || "";
  const videoCaption = content?.video_caption || "";
  const hasMedia = imageUrl.trim() !== "" || videoUrl.trim() !== "";

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

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-[#E8DCC8] mb-2">Page not found</h1>
          <p className="text-[#8B7B68]">This node doesn&apos;t have a public progress page.</p>
        </div>
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
      `}</style>

      <div className="min-h-screen px-4 py-12 sm:py-16">
        <div className="max-w-[768px] mx-auto">

          {/* ── Header ── */}
          <FadeIn delay={0}>
            <header className="mb-16 text-center">
              <h1 className="text-4xl sm:text-5xl font-light tracking-tight text-[#E8DCC8] mb-2">
                mixmi
              </h1>
              <p className="text-xl text-[#D4C4A8] font-semibold mb-1">
                {node?.name}
              </p>
              <p className="text-lg text-[#8B7B68] tracking-widest uppercase font-semibold">
                Progress
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

          {/* ── Narrative ── */}
          {narrative.trim() && (
            <FadeIn delay={100}>
              <section className="mb-16">
                <div className="border-l-2 border-[#C47A3A]/40 pl-6 py-2">
                  <p className="text-xl sm:text-[22px] text-[#D4C4A8] leading-relaxed font-light whitespace-pre-line">
                    {narrative}
                  </p>
                </div>
              </section>
            </FadeIn>
          )}

          {/* ── Media (image + video) ── */}
          {hasMedia && (
            <FadeIn delay={150}>
              <section className="mb-16 space-y-8">
                {imageUrl.trim() && (
                  <div>
                    <img
                      src={imageUrl}
                      alt={imageCaption || `${node?.name} progress`}
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

          {/* ── Key Numbers ── */}
          <FadeIn delay={200}>
            <section className="mb-16">
              <div className="flex gap-3 sm:gap-4">
                <Stat label="Milestones Done" value={completedMilestones} color="#5DBF82" />
                <Stat label="Total Milestones" value={milestones.length} color="#E8B84D" />
                <Stat label="Contacts Engaged" value={contactCount} color="#9B7ED8" />
              </div>
            </section>
          </FadeIn>

          {/* ── Milestones by Stream ── */}
          {milestonesByStream.length > 0 && (
            <FadeIn delay={300}>
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
          )}

          {/* ── What's Next ── */}
          {upcomingMilestones.length > 0 && (
            <FadeIn delay={400}>
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
          <FadeIn delay={500}>
            <footer className="text-center pt-8 pb-4 border-t border-white/[0.06]">
              <p className="text-sm text-[#8B7B68]">
                Questions?{" "}
                <a
                  href="mailto:sandy@mixmi.me"
                  className="text-[#C47A3A] hover:text-[#E8B84D] transition-colors"
                >
                  sandy@mixmi.me
                </a>
              </p>
              <p className="text-xs text-[#6B5D4D] mt-2">
                Built with care in Solvang, CA
              </p>
            </footer>
          </FadeIn>

        </div>
      </div>
    </>
  );
}
