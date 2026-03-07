-- Seed the Pilot Design Session worksheet with full document content
-- Run this in Supabase SQL Editor

INSERT INTO worksheets (title, description, template_type, phase, created_by, sections)
VALUES (
  'Mixmi Pilot Design Session',
  's + Carolyn — February 28, 2026',
  'node_design',
  'working',
  'Sandy + Claude',
  '[
    {
      "id": "intro",
      "type": "narrative",
      "title": "Purpose",
      "status": "decided",
      "body": "Tame the chaotic soup. Move from expansive thinking to operational clarity. Walk out with decisions made, a budget framework, and next actions for each starting node.\n\nThe agent architecture insight: Design each node the way you''d design an agent. Prompt = specific instructions. Context = what the node leader needs. Intent = what this node is for in the learning system."
    },
    {
      "id": "block1",
      "type": "checklist",
      "title": "Block 1: Node Selection — The Starting Four",
      "subtitle": "15 minutes — Confirm and discuss scope for each.",
      "status": "blank",
      "context": "For each node, confirm selection and discuss scope. These are the four starting nodes for Phase 1.",
      "items": [
        {
          "label": "Kenya — Joshua + Kevin: Relationship ready. Tests hardest UX case: communal ownership + mobile-first. Real people, real stakes.",
          "checked": false,
          "notes": "",
          "item_status": "blank"
        },
        {
          "label": "Producers — s (lead) + Charles, Gray Bear, friends: Tests professional quality bar. s manages relationships + recruits additional producer friends for content diversity. Focus: low-stakes, fun cross-collaboration. Carolyn handles comms, educational videos, asset tracking.",
          "checked": false,
          "notes": "",
          "item_status": "blank"
        },
        {
          "label": "Visual Artists — Carolyn (full autonomy): Carolyn decides who, when, and how. Includes visual artists AND musician friends. Mixed-media node. Free reign on participant selection and pacing.",
          "checked": false,
          "notes": "",
          "item_status": "blank"
        },
        {
          "label": "Kevin Locke (Indigenous) — s (lead, transitioning to Carolyn): Focused scope: Contact Kevin Locke''s widow. Build his profile page + wallet as a demonstration. Show her how it works, then transition management to her (with Carolyn''s support). This is the proving ground — if the widow trusts the process, it signals trustworthiness to other Indigenous + Bahá''í-connected communities.",
          "checked": false,
          "notes": "",
          "item_status": "blank"
        }
      ]
    },
    {
      "id": "block1-phase2",
      "type": "narrative",
      "title": "Phase 2 Nodes (Waiting)",
      "status": "blank",
      "body": "Chile (Philip busy; smart contracts being built by s + Claude Code), broader Indigenous expansion (requires Navajo travel, $1,400), Bhutan (scope undefined), Jamaica (compensation needed), Record Label (product must be experience-ready for Aki)."
    },
    {
      "id": "block1-decisions",
      "type": "prompt",
      "title": "Decisions for Block 1",
      "status": "blank",
      "prompt": "Confirm four starting nodes. Discuss which additional producer friends s will recruit. Confirm Carolyn''s full autonomy on Visual Artists scope. Discuss timing for Kevin Locke widow contact.",
      "response": "",
      "notes": ""
    },
    {
      "id": "block2",
      "type": "narrative",
      "title": "Block 2: Per-Node Budget Template",
      "subtitle": "30 minutes — Get to a number you can put in front of Steve.",
      "status": "blank",
      "body": "Categories to decide per node:\n\n• Node leader compensation: Monthly stipend range ($500–1,000/mo). Adjust for context. Note: Kevin Locke node has minimal cost initially — s leads with existing tools.\n• Participant compensation model: Per-session, per-upload, or flat monthly? Node leader helps decide. Kevin Locke widow: may not need traditional compensation — she''s a partner, not a participant.\n• Tools & access: Claude Pro accounts ($20/mo each). Mobile data stipend for Kenya. Any equipment needs.\n• Duration: 3 months for Phase 1 (aligns with reflection cycle from Milestone Model)."
    },
    {
      "id": "block2-budget",
      "type": "budget",
      "title": "Rough Budget Envelope",
      "subtitle": "To refine together",
      "status": "blank",
      "context": "Use the \"Node Budgets\" tab in the spreadsheet to fill in actual numbers. The \"Node Contributors\" tab lists everyone with contact details and status.",
      "rows": [
        { "label": "Kenya (3 months)", "low": 2250, "high": 4800, "amount": null, "notes": "Joshua stipend + participant comp + tools" },
        { "label": "Producers (3 months)", "low": 1500, "high": 3600, "amount": null, "notes": "s self-funds lead; participant stipends for producers'' time" },
        { "label": "Visual Artists (3 months)", "low": 1500, "high": 3600, "amount": null, "notes": "Carolyn stipend + participant comp" },
        { "label": "Kevin Locke (3 months)", "low": 250, "high": 1000, "amount": null, "notes": "Minimal: s leads with existing tools. Possible gift/honorarium for widow." },
        { "label": "Platform costs (3 mo)", "low": 1245, "high": 1245, "amount": null, "notes": "~$415/mo current burn" },
        { "label": "Contingency (10%)", "low": 770, "high": 1545, "amount": null, "notes": "" },
        { "label": "Total pilot budget", "low": 8420, "high": 17090, "amount": null, "notes": "This is the number for Steve" }
      ]
    },
    {
      "id": "block3",
      "type": "narrative",
      "title": "Block 3: Node Design Canvas",
      "subtitle": "45 minutes — Where fuzziness becomes operational.",
      "status": "blank",
      "body": "For each of the four starting nodes, walk through the canvas together. The spreadsheet has a \"Node Design Canvas\" tab pre-populated with suggestions.\n\nFor each node, decide:\n• Prompt: What are the 3–5 specific things this node is asked to do?\n• Context: What does the node leader need to know? Platform state, compensation, reporting method.\n• Intent: What is this node for in the learning system? Name the research question. Frame the anti-NGO invitation.\n• Protagonist indicators: What does protagonist emergence look like for this specific node?"
    },
    {
      "id": "block3-roles",
      "type": "roles",
      "title": "Role Clarity",
      "subtitle": "Confirm together",
      "status": "blank",
      "context": "",
      "roles": [
        {
          "person": "s",
          "leads": "Producers, Kevin Locke (initial)",
          "responsibilities": "Producer recruitment + quality assessment. Kevin Locke widow contact + profile building. Technical platform decisions. Smart contract development (with Claude Code)."
        },
        {
          "person": "Carolyn",
          "leads": "Visual Artists (full autonomy)",
          "responsibilities": "Visual Artists node: decides participants, pacing, scope. Across all nodes: emailing, educational short videos, asset tracking. Eventually: Kevin Locke handoff recipient. Systematizer role: observing patterns across nodes."
        },
        {
          "person": "Joshua",
          "leads": "Kenya",
          "responsibilities": "Community coordinator. Decides who participates, how it''s introduced, what feels fair. Reports via WhatsApp voice notes."
        }
      ]
    },
    {
      "id": "block4",
      "type": "checklist",
      "title": "Block 4: Immediate Next Actions",
      "subtitle": "10 minutes — What happens this week?",
      "status": "blank",
      "context": "",
      "items": [
        { "label": "Upload spreadsheet to Google Sheets. Both review and edit.", "checked": false, "notes": "Owner: s", "item_status": "blank" },
        { "label": "Kenya — this week actions", "checked": false, "notes": "", "item_status": "blank" },
        { "label": "Producers — this week actions", "checked": false, "notes": "", "item_status": "blank" },
        { "label": "Visual Artists — this week actions", "checked": false, "notes": "", "item_status": "blank" },
        { "label": "Kevin Locke — this week actions", "checked": false, "notes": "", "item_status": "blank" },
        { "label": "Internal (s + Carolyn) — this week actions", "checked": false, "notes": "", "item_status": "blank" }
      ]
    },
    {
      "id": "block5",
      "type": "narrative",
      "title": "Block 5: Development Goals for Pilot Readiness",
      "subtitle": "15 minutes — What does the platform need to be ready?",
      "status": "blank",
      "body": "The pilot can''t run on a platform that isn''t ready. These are the development milestones s needs to hit — mostly with Claude Code — before each phase. Use this as a shared checklist so Carolyn knows what''s coming and can plan node outreach accordingly."
    },
    {
      "id": "block5-matrix",
      "type": "matrix",
      "title": "Development Readiness Matrix",
      "subtitle": "Fill in the \"Status Now\" column together",
      "status": "blank",
      "context": "Identify the 3 biggest gaps between where the platform is and where it needs to be for Phase A. Those become s''s development priorities for March.",
      "columns": ["Phase A Target (Apr–May)", "Phase B Target (Jun–Sep)", "Status Now"],
      "rows": [
        {
          "label": "Upload Chatbot",
          "cells": [
            { "value": "Full conversation flow working: ownership types, pay-it-forward, voice-to-text, cultural sensitivity flags", "cell_status": "not_started" },
            { "value": "Refined based on pilot feedback. Multi-language support if Kenya needs it", "cell_status": "not_started" },
            { "value": "", "cell_status": "not_started" }
          ]
        },
        {
          "label": "DJ Mixer",
          "cells": [
            { "value": "BPM sync, effects, basic remix chain with attribution tracking. Functional enough for producer feedback", "cell_status": "not_started" },
            { "value": "Producer-requested features implemented. Bulk upload working", "cell_status": "not_started" },
            { "value": "", "cell_status": "not_started" }
          ]
        },
        {
          "label": "Attribution System",
          "cells": [
            { "value": "Ingredients model working end-to-end. Credits display on content. Remix chains tracked", "cell_status": "not_started" },
            { "value": "Verified under complex workflows (multi-contributor, cross-node remix)", "cell_status": "not_started" },
            { "value": "", "cell_status": "not_started" }
          ]
        },
        {
          "label": "Smart Contracts (SUI)",
          "cells": [
            { "value": "Basic payment splitting working. zkLogin authentication. Storehouse wallet prototype", "cell_status": "not_started" },
            { "value": "Payment splits tested with real (small) amounts. Trust established", "cell_status": "not_started" },
            { "value": "", "cell_status": "not_started" }
          ]
        },
        {
          "label": "Globe / Discovery",
          "cells": [
            { "value": "Content appears on globe by region. Basic browsing and playback", "cell_status": "not_started" },
            { "value": "Cross-node discovery measurable. Analytics on browsing patterns", "cell_status": "not_started" },
            { "value": "", "cell_status": "not_started" }
          ]
        },
        {
          "label": "Creator Profiles / Stores",
          "cells": [
            { "value": "Profile pages presentable. Kevin Locke estate profile as proof of concept", "cell_status": "not_started" },
            { "value": "Store functionality for pilot creators. Shopping cart if needed", "cell_status": "not_started" },
            { "value": "", "cell_status": "not_started" }
          ]
        },
        {
          "label": "Agent System",
          "cells": [
            { "value": "Creator companion agent functional. Cultural slowdown logic. Intent alignment basics", "cell_status": "not_started" },
            { "value": "Agent learning from pilot data. Intent metrics measurable", "cell_status": "not_started" },
            { "value": "", "cell_status": "not_started" }
          ]
        },
        {
          "label": "Onboarding Flow",
          "cells": [
            { "value": "Someone can go from zero to published content in under 15 minutes. The Judy benchmark", "cell_status": "not_started" },
            { "value": "Refined based on Kenya + Visual Artists feedback. Pain points resolved", "cell_status": "not_started" },
            { "value": "", "cell_status": "not_started" }
          ]
        },
        {
          "label": "Analytics / Metrics",
          "cells": [
            { "value": "Basic dashboards: uploads, remix chains, user activity. Enough to populate metrics spreadsheet", "cell_status": "not_started" },
            { "value": "Full metrics collection for all Universal + Node-Specific metrics", "cell_status": "not_started" },
            { "value": "", "cell_status": "not_started" }
          ]
        },
        {
          "label": "Internal Tools",
          "cells": [
            { "value": "MCP connectors for Notion. Reporting workflows. Carolyn can track assets without engineering help", "cell_status": "not_started" },
            { "value": "AI automation rate increasing. Documentation self-maintaining", "cell_status": "not_started" },
            { "value": "", "cell_status": "not_started" }
          ]
        }
      ]
    },
    {
      "id": "block-ops",
      "type": "prompt",
      "title": "If Time Allows: Internal Operations Metric",
      "subtitle": "Discuss briefly",
      "status": "blank",
      "context": "Track how well s and Carolyn are succeeding with AI-assisted internal tools and automation. This is in the spreadsheet under \"Internal Operations\" in Universal Metrics.",
      "prompt": "Key questions: What % of admin is AI-assisted? Hours per node per week? What internal tools are working? Could someone new understand the pilot from docs alone?",
      "response": "",
      "notes": ""
    },
    {
      "id": "closing",
      "type": "narrative",
      "title": "Companion Materials",
      "status": "blank",
      "body": "Companion spreadsheet: 7 tabs — Node Overview, Node Budgets, Universal Metrics, Node-Specific Metrics, Node Design Canvas, Milestone Tracker, Node Contributors (names, contact details, status, notes). Upload to Google Sheets for shared editing.\n\n\"The chaotic soup is actually a really rich broth. You just need to pick the bowls you''re serving first.\""
    }
  ]'::jsonb
);
