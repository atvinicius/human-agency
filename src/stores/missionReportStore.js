import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

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
  _realtimeUnsub: null,

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
    agentSources,
    confidence,
    searchContext,
  }) =>
    set((state) => {
      const contentStr = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
      // Merge agent-provided source URLs with auto-extracted URLs
      const extractedUrls = extractUrls(contentStr);
      const agentUrls = (agentSources || []).map((s) => s.url).filter(Boolean);
      const allUrls = [...new Set([...agentUrls, ...extractedUrls])];
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
            sources: allUrls,
            agentSources: agentSources || [],
            confidence: confidence || null,
            searchContext: searchContext || [],
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

  // Accepts a string (legacy) or structured object { executive_summary, key_findings, detailed_analysis, methodology, sources }
  setSynthesis: (data) =>
    set({
      synthesis: typeof data === 'string' ? data : data,
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

  /**
   * Subscribe to Supabase Realtime for report_sections inserts.
   * Returns an unsubscribe function.
   */
  subscribeToSession: (sessionId) => {
    if (!isSupabaseConfigured() || !sessionId) return () => {};

    const channel = supabase.channel(`report:${sessionId}`);

    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'report_sections', filter: `session_id=eq.${sessionId}` },
      (payload) => {
        const section = payload.new;

        if (section.type === 'synthesis') {
          set({ synthesis: section.content, status: 'complete' });
        } else {
          set((state) => ({
            sections: [
              ...state.sections,
              {
                id: section.id,
                agentId: section.agent_id,
                agentName: section.agent_name,
                role: section.role,
                title: section.title || section.agent_name,
                content: section.content,
                type: section.type,
                timestamp: new Date(section.created_at).getTime(),
                tags: autoTag(section.role, section.type),
                sources: extractUrls(section.content),
              },
            ],
          }));
        }
      }
    );

    channel.subscribe();

    const unsubscribe = () => {
      supabase.removeChannel(channel);
    };

    set({ _realtimeUnsub: unsubscribe });
    return unsubscribe;
  },

  /**
   * Load report sections from DB (for reconnection / mission resume).
   */
  loadFromDB: async (sessionId) => {
    if (!isSupabaseConfigured() || !sessionId) return;

    const { data: sections } = await supabase
      .from('report_sections')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (!sections) return;

    const synthSection = sections.find((s) => s.type === 'synthesis');
    const otherSections = sections.filter((s) => s.type !== 'synthesis');

    set({
      sections: otherSections.map((s) => ({
        id: s.id,
        agentId: s.agent_id,
        agentName: s.agent_name,
        role: s.role,
        title: s.title || s.agent_name,
        content: s.content,
        type: s.type,
        timestamp: new Date(s.created_at).getTime(),
        tags: autoTag(s.role, s.type),
        sources: extractUrls(s.content),
      })),
      synthesis: synthSection?.content || '',
      status: synthSection ? 'complete' : 'building',
    });
  },

  reset: () => {
    const unsub = get()._realtimeUnsub;
    if (unsub) unsub();
    set({
      sections: [],
      searchRecords: [],
      synthesis: '',
      status: 'building',
      _realtimeUnsub: null,
    });
  },
}));
