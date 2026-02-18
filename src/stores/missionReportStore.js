import { create } from 'zustand';

export const useMissionReportStore = create((set, get) => ({
  sections: [],
  synthesis: '',
  status: 'building', // 'building' | 'synthesizing' | 'complete'

  addSection: ({ agentId, agentName, role, title, content, type = 'output', timestamp }) =>
    set((state) => ({
      sections: [
        ...state.sections,
        {
          id: `${agentId}-${Date.now()}`,
          agentId,
          agentName,
          role,
          title: title || agentName,
          content: typeof content === 'string' ? content : JSON.stringify(content, null, 2),
          type,
          timestamp: timestamp || Date.now(),
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

  reset: () =>
    set({
      sections: [],
      synthesis: '',
      status: 'building',
    }),
}));
