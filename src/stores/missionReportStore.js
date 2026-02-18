import { create } from 'zustand';

// Extract URLs from text content
function extractUrls(text) {
  if (!text) return [];
  const urlRegex = /https?:\/\/[^\s<>"')\]]+/g;
  const matches = text.match(urlRegex) || [];
  return [...new Set(matches.map((url) => url.replace(/[.,;:!?)]+$/, '')))];
}

// Auto-tag based on agent role and section type
function autoTag(role, type) {
  const tags = [];
  if (type === 'artifact') tags.push('artifact');
  switch (role) {
    case 'coordinator':
      tags.push('coordination');
      break;
    case 'researcher':
      tags.push('finding');
      break;
    case 'validator':
      tags.push('validation');
      break;
    case 'synthesizer':
      tags.push('synthesis');
      break;
    case 'executor':
      tags.push('execution');
      break;
    default:
      tags.push('output');
  }
  return tags;
}

export const useMissionReportStore = create((set, get) => ({
  sections: [],
  searchRecords: [],
  synthesis: '',
  status: 'building', // 'building' | 'synthesizing' | 'complete'

  addSection: ({
    agentId,
    agentName,
    role,
    title,
    content,
    type = 'output',
    timestamp,
    thinking,
    searchQueries,
    parentAgentId,
    objective,
  }) =>
    set((state) => {
      const contentStr = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
      return {
        sections: [
          ...state.sections,
          {
            id: `${agentId}-${Date.now()}`,
            agentId,
            agentName,
            role,
            title: title || agentName,
            content: contentStr,
            type,
            timestamp: timestamp || Date.now(),
            thinking: thinking || null,
            searchQueries: searchQueries || [],
            parentAgentId: parentAgentId || null,
            objective: objective || null,
            tags: autoTag(role, type),
            sources: extractUrls(contentStr),
          },
        ],
      };
    }),

  addSearchRecord: ({ agentId, agentName, query, resultCount }) =>
    set((state) => ({
      searchRecords: [
        ...state.searchRecords,
        {
          id: `search-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          agentId,
          agentName,
          query,
          resultCount: resultCount || 0,
          timestamp: Date.now(),
        },
      ],
    })),

  setSynthesis: (text) =>
    set({
      synthesis: text,
      status: 'complete',
    }),

  setStatus: (status) => set({ status }),

  getSectionsByRole: () => {
    const { sections } = get();
    const grouped = {};
    for (const section of sections) {
      const role = section.role || 'other';
      if (!grouped[role]) grouped[role] = [];
      grouped[role].push(section);
    }
    return grouped;
  },

  getArtifacts: () => {
    return get().sections.filter((s) => s.type === 'artifact');
  },

  getSourceMap: () => {
    const { sections } = get();
    const sourceMap = {};
    for (const section of sections) {
      for (const url of section.sources || []) {
        if (!sourceMap[url]) {
          sourceMap[url] = { url, citedBy: [] };
        }
        if (!sourceMap[url].citedBy.some((c) => c.agentId === section.agentId)) {
          sourceMap[url].citedBy.push({
            agentId: section.agentId,
            agentName: section.agentName,
            role: section.role,
          });
        }
      }
    }
    return sourceMap;
  },

  getSectionTree: () => {
    const { sections } = get();
    // Group sections by agentId
    const agentMap = {};
    for (const section of sections) {
      if (!agentMap[section.agentId]) {
        agentMap[section.agentId] = {
          agentId: section.agentId,
          agentName: section.agentName,
          role: section.role,
          parentAgentId: section.parentAgentId,
          sections: [],
          children: [],
        };
      }
      agentMap[section.agentId].sections.push(section);
    }

    // Build tree from parent-child relationships
    const roots = [];
    const nodes = Object.values(agentMap);
    for (const node of nodes) {
      node.children = nodes.filter((n) => n.parentAgentId === node.agentId);
      if (!node.parentAgentId || !nodes.find((n) => n.agentId === node.parentAgentId)) {
        roots.push(node);
      }
    }
    return roots;
  },

  reset: () =>
    set({
      sections: [],
      searchRecords: [],
      synthesis: '',
      status: 'building',
    }),
}));
