# Human Agency - Agent Orchestration Interface

## Vision
A visual "Mission Control" interface where humans direct swarms of AI agents. Instead of chat, it's a living map that grows left-to-right as agents spawn, work, and complete tasks.

---

## Architecture Overview

### Data Model

```
Agent {
  id, parentId, childIds[]
  role: coordinator | researcher | executor | validator | synthesizer
  status: spawning | working | waiting | paused | blocked | completed | failed
  priority: critical | high | normal | low | background
  progress: 0-100
  name, objective, currentActivity
  pendingInput?: HumanInputRequest
}
```

### Directory Structure

```
src/
├── pages/
│   ├── Landing.jsx          # Current landing page (extracted)
│   └── Demo.jsx              # New orchestration interface
│
├── components/
│   ├── map/
│   │   ├── AgentMap.jsx      # Main canvas with pan/zoom
│   │   ├── AgentNode.jsx     # Individual agent visual
│   │   ├── AgentEdge.jsx     # Connection lines
│   │   └── MapControls.jsx   # Zoom/filter controls
│   │
│   ├── intervention/
│   │   ├── InterventionPanel.jsx  # Human input panel
│   │   └── QuickActions.jsx       # Pause/Resume/Cancel
│   │
│   └── stream/
│       └── ActivityStream.jsx     # Event feed
│
├── stores/
│   └── agentStore.js         # Zustand state management
│
├── services/
│   └── mockAgentService.js   # Demo data simulation
│
└── utils/
    ├── colorScheme.js        # Role/status color mapping
    └── layoutEngine.js       # Tree positioning algorithm
```

---

## Visual Design System

### Color Coding (HSL-based)

| Role | Base Hue | Visual Meaning |
|------|----------|----------------|
| Coordinator | Gold (45°) | Command nodes |
| Researcher | Blue (210°) | Information gathering |
| Executor | Green (150°) | Action taking |
| Validator | Purple (280°) | Verification |
| Synthesizer | Orange (30°) | Combining outputs |

**Status modifies saturation/lightness:**
- Working: Vibrant (70% sat)
- Paused: Dim (30% sat)
- Blocked/Failed: Intense red
- Completed: Faded (20% sat)

**Priority adds visual treatments:**
- Critical: Pulsing glow, thick border
- High: Subtle glow
- Normal: Standard
- Low/Background: Reduced opacity, smaller

### Node Anatomy

```
┌────────────────────────────┐
│ ● Status    [Pause][Dive]  │  <- Header
│ Agent Name                 │  <- Title
│ ▓▓▓▓▓▓░░░░ 60%            │  <- Progress
│ "Current activity..."      │  <- Activity
└────────────────────────────┘
```

### Grouping/Collapsing

When >5 siblings share same role, auto-group into collapsed view showing count and aggregate progress.

---

## Interaction Patterns

1. **Pan/Zoom**: Navigate the map with mouse/touch
2. **Click Node**: Select and show detail panel
3. **Hover**: Show quick actions (pause/dive/cancel)
4. **Pause/Resume**: Individual or global (cascade to children)
5. **Dive In**: Zoom + focus + show full details
6. **Human Input**: Sliding panel for approvals/choices/text input
7. **Redirect**: Change agent's objective mid-work

---

## Implementation Phases

### Phase 1: Demo MVP (First Implementation)
- [ ] Add routing (react-router-dom)
- [ ] Extract landing page to `pages/Landing.jsx`
- [ ] Create `pages/Demo.jsx` with "Try Demo" button from landing
- [ ] Install dependencies: zustand, d3-hierarchy, d3-zoom, @faker-js/faker
- [ ] Build `AgentMap.jsx` - canvas with basic pan/zoom
- [ ] Build `AgentNode.jsx` - styled nodes with progress
- [ ] Build `AgentEdge.jsx` - connection lines
- [ ] Create `agentStore.js` - state management
- [ ] Create `mockAgentService.js` - simulate agent spawning/progress
- [ ] Create `ActivityStream.jsx` - scrolling event feed
- [ ] Implement color scheme utility

### Phase 2: Interaction Layer
- [ ] Pause/Resume functionality (individual + global)
- [ ] Click-to-focus with detail panel
- [ ] Human input request modals
- [ ] Visual feedback on interventions

### Phase 3: Scale & Polish
- [ ] Auto-grouping for large trees
- [ ] Mini-map navigation
- [ ] Priority surfacing (attention layer)
- [ ] Performance optimization (virtual rendering)

---

## New Dependencies

```json
{
  "react-router-dom": "^7.x",
  "zustand": "^5.x",
  "d3-hierarchy": "^3.x",
  "d3-zoom": "^3.x",
  "@faker-js/faker": "^9.x"
}
```

---

## Files to Modify

- `src/App.jsx` - Add router, keep landing at `/`, add demo at `/demo`
- `src/index.css` - Extend theme with map-specific colors
- `package.json` - Add new dependencies

## Files to Create

- `src/pages/Landing.jsx` - Extract current App content
- `src/pages/Demo.jsx` - Orchestration interface entry
- `src/components/map/AgentMap.jsx`
- `src/components/map/AgentNode.jsx`
- `src/components/map/AgentEdge.jsx`
- `src/components/map/MapControls.jsx`
- `src/components/stream/ActivityStream.jsx`
- `src/stores/agentStore.js`
- `src/services/mockAgentService.js`
- `src/utils/colorScheme.js`
- `src/utils/layoutEngine.js`

---

## Verification

1. Run `npm run dev`
2. Landing page at `/` should work as before
3. "Try Demo" button navigates to `/demo`
4. Demo shows animated agent map with:
   - Nodes spawning and growing left-to-right
   - Color-coded by role/status
   - Progress bars animating
   - Activity stream updating
   - Pan/zoom working
5. Clicking a node shows details
6. Pause/Resume buttons work
