# feat/output-overhaul — Rethink Output, Collaboration & Visualization

## Problem
The current output system is lossy and flat. Markdown is the only format. Critical information is discarded between agent execution and final report. The user says ".md files are not good — we must rethink."

## What's Lost Today

| Data | Where It Lives | In Final Report? |
|------|---------------|-----------------|
| Agent thinking/reasoning | `context.lastThinking` | NO |
| Search queries & results | ActivityStream events | NO |
| Inter-agent data flows | dataTransfers (animation only) | NO |
| Source URLs/citations | Lost after search tool executes | NO |
| Confidence levels | Not collected at all | NO |
| Agent objectives | agent.objective | NO |
| Validation results | Validator agent output only | Partially |
| Artifacts | MissionReport artifacts tab | YES |
| Agent output text | MissionReport sections | YES (truncated) |
| Synthesis | MissionReport synthesis | YES |

## Current Pipeline (What to Fix)

```
Agent JSON Response
  ├→ output → addSection() → Report (truncated)
  ├→ artifacts → addSection(type:artifact) → Artifacts tab
  ├→ thinking → context only (LOST)
  ├→ searches → ActivityStream only (LOST)
  └→ complete → FindingsRegistry.completions → synthesis input

Synthesis: completions[] (first 8000 chars) → LLM → markdown string
```

## Design Principles for New Output System

1. **Structured data, not just text** — Preserve metadata, relationships, sources
2. **Progressive disclosure** — Summary → section detail → raw agent output
3. **Source attribution** — Every claim should trace back to a search result or agent reasoning
4. **Rich rendering** — Not just markdown; interactive sections, collapsible panels, source links
5. **Export flexibility** — Copy as rich text, download as structured JSON or formatted HTML, not just .md

## Implementation Plan

### Phase 1: Enrich the Data Model

**`src/stores/missionReportStore.js`** — Expand section structure:
```js
// Current section:
{ agentId, agentName, role, content, type, timestamp }

// New section:
{ agentId, agentName, role, content, type, timestamp,
  thinking,           // Agent's reasoning for this output
  sources: [],        // URLs/references that informed this
  searchQueries: [],  // What searches led here
  parentSection,      // Link to parent agent's section
  confidence,         // Self-assessed if available
  tags: []            // Auto-tagged: 'finding', 'validation', 'synthesis', etc.
}
```

Add new methods:
- `addSearchRecord({ agentId, query, resultCount, sources })` — track searches
- `getSourceMap()` — deduplicated map of all sources across agents
- `getSectionTree()` — hierarchical view following agent parent-child relationships

**`src/services/orchestrationService.js`** — Capture more data into report:
- After agent call, also pass `result.thinking` and search data to `addSection()`
- Track search queries/sources from `result.searches` into the report store
- Pass parent-child relationship context

**`src/services/findingsRegistry.js`** — Expose more to synthesis:
- Add method to export full collaboration graph (who shared what with whom)
- Include search metadata in findings

### Phase 2: Redesign the Report Component

**`src/components/MissionReport.jsx`** — Complete overhaul:

**New tab structure:**
1. **Summary** — LLM synthesis with inline source citations [1][2][3], clickable
2. **Findings** — Hierarchical view: coordinator → researchers → validators, expandable cards
3. **Sources** — Deduplicated list of all web sources with which agents cited them
4. **Timeline** — Merged ActivityStream + report data: searches, findings, validations, synthesis in order

**Each finding card shows:**
- Agent name + role badge
- Output content (full, not truncated)
- Collapsible "Reasoning" section (thinking)
- Source chips (clickable URLs)
- "Based on" links (which parent/sibling informed this)

**Export options:**
- Copy as rich text (HTML) — preserves formatting and links
- Download as HTML report — self-contained, styled
- Download as JSON — full structured data for programmatic use
- Copy synthesis only — quick share

### Phase 3: Improve Synthesis Prompt

**`src/services/orchestrationService.js` `_triggerSynthesis()`:**
- Include search sources in synthesis context
- Include agent objectives (what each was trying to answer)
- Include validation results explicitly
- Ask LLM to add inline citations: [Source: URL]
- Structured synthesis output (not just free-form markdown):
  ```json
  {
    "executive_summary": "...",
    "key_findings": [{ "finding": "...", "sources": [...], "confidence": "high|medium|low" }],
    "detailed_analysis": "...",
    "methodology": "...",
    "sources": [{ "url": "...", "title": "...", "cited_by": [...] }]
  }
  ```

### Phase 4: Agent System Prompt Enhancement

**`api/agent-stream.js`** — Update the JSON response format agents should use:
- Add `sources: [{ url, title, relevant_quote }]` to output format
- Add `confidence: "high|medium|low"` self-assessment
- Add `search_context: [{ query, key_results }]` so searches are linked to outputs
- Keep backward compatible (optional fields)

## Files to Modify
1. `src/stores/missionReportStore.js` — expand data model
2. `src/components/MissionReport.jsx` — complete UI redesign
3. `src/services/orchestrationService.js` — capture more data into report (lines 329-372 only — the addSection/search/artifact area)
4. `src/services/findingsRegistry.js` — expose collaboration graph
5. `api/agent-stream.js` — update system prompt for richer output format
6. `src/utils/renderMarkdown.jsx` — enhance or replace with richer rendering
7. New: `src/components/report/` — modular report components (FindingCard, SourceList, Timeline, etc.)

## Files NOT to Touch
- `src/stores/creditStore.js` — credits worktree
- `src/stores/authStore.js` — history worktree
- `src/components/MissionHistory.jsx` — history worktree

## Testing
- Run `npm test` — existing tests should pass
- Add tests for new missionReportStore methods
- Manual: run a mission, verify report shows sources, thinking, hierarchy
