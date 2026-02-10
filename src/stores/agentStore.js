import { create } from 'zustand';

export const useAgentStore = create((set, get) => ({
  agents: [],
  selectedAgentId: null,
  events: [],
  isPaused: false,
  filters: {
    roles: [], // empty = show all
    statuses: [], // empty = show all
    priorities: [], // empty = show all
  },

  // Agent mutations
  addAgent: (agent) =>
    set((state) => ({
      agents: [...state.agents, agent],
      events: [
        {
          id: Date.now(),
          type: 'spawn',
          agentId: agent.id,
          agentName: agent.name,
          message: `${agent.name} spawned as ${agent.role}`,
          timestamp: new Date(),
        },
        ...state.events,
      ].slice(0, 100), // Keep last 100 events
    })),

  updateAgent: (id, updates) =>
    set((state) => {
      const agent = state.agents.find((a) => a.id === id);
      const newEvents = [...state.events];

      // Track status changes
      if (updates.status && agent && updates.status !== agent.status) {
        newEvents.unshift({
          id: Date.now(),
          type: updates.status === 'completed' ? 'complete' : 'status',
          agentId: id,
          agentName: agent.name,
          message: `${agent.name} ${updates.status}`,
          timestamp: new Date(),
        });
      }

      // Track activity changes
      if (updates.currentActivity && agent && updates.currentActivity !== agent.currentActivity) {
        newEvents.unshift({
          id: Date.now() + 1,
          type: 'activity',
          agentId: id,
          agentName: agent.name,
          message: updates.currentActivity,
          timestamp: new Date(),
        });
      }

      return {
        agents: state.agents.map((a) =>
          a.id === id ? { ...a, ...updates } : a
        ),
        events: newEvents.slice(0, 100),
      };
    }),

  removeAgent: (id) =>
    set((state) => ({
      agents: state.agents.filter((a) => a.id !== id),
      selectedAgentId: state.selectedAgentId === id ? null : state.selectedAgentId,
    })),

  // Selection
  selectAgent: (id) => set({ selectedAgentId: id }),
  clearSelection: () => set({ selectedAgentId: null }),

  // Pause/Resume
  pauseAgent: (id) => {
    const agent = get().agents.find((a) => a.id === id);
    if (!agent || agent.status === 'completed' || agent.status === 'failed') return;

    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === id ? { ...a, status: 'paused', previousStatus: a.status } : a
      ),
      events: [
        {
          id: Date.now(),
          type: 'pause',
          agentId: id,
          agentName: agent.name,
          message: `${agent.name} paused`,
          timestamp: new Date(),
        },
        ...state.events,
      ].slice(0, 100),
    }));
  },

  resumeAgent: (id) => {
    const agent = get().agents.find((a) => a.id === id);
    if (!agent || agent.status !== 'paused') return;

    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === id
          ? { ...a, status: a.previousStatus || 'working', previousStatus: undefined }
          : a
      ),
      events: [
        {
          id: Date.now(),
          type: 'resume',
          agentId: id,
          agentName: agent.name,
          message: `${agent.name} resumed`,
          timestamp: new Date(),
        },
        ...state.events,
      ].slice(0, 100),
    }));
  },

  pauseAll: () =>
    set((state) => {
      const pausableAgents = state.agents.filter(
        (a) => !['completed', 'failed', 'paused'].includes(a.status)
      );

      return {
        isPaused: true,
        agents: state.agents.map((a) =>
          pausableAgents.some((p) => p.id === a.id)
            ? { ...a, status: 'paused', previousStatus: a.status }
            : a
        ),
        events: [
          {
            id: Date.now(),
            type: 'pause',
            agentId: null,
            agentName: 'System',
            message: `All agents paused (${pausableAgents.length} affected)`,
            timestamp: new Date(),
          },
          ...state.events,
        ].slice(0, 100),
      };
    }),

  resumeAll: () =>
    set((state) => {
      const pausedAgents = state.agents.filter((a) => a.status === 'paused');

      return {
        isPaused: false,
        agents: state.agents.map((a) =>
          a.status === 'paused'
            ? { ...a, status: a.previousStatus || 'working', previousStatus: undefined }
            : a
        ),
        events: [
          {
            id: Date.now(),
            type: 'resume',
            agentId: null,
            agentName: 'System',
            message: `All agents resumed (${pausedAgents.length} affected)`,
            timestamp: new Date(),
          },
          ...state.events,
        ].slice(0, 100),
      };
    }),

  // Human input
  requestInput: (agentId, inputRequest) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === agentId
          ? { ...a, status: 'waiting', pendingInput: inputRequest }
          : a
      ),
    })),

  respondToInput: (agentId, response) => {
    const agent = get().agents.find((a) => a.id === agentId);
    if (!agent || !agent.pendingInput) return;

    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === agentId
          ? { ...a, status: 'working', pendingInput: undefined }
          : a
      ),
      events: [
        {
          id: Date.now(),
          type: 'input',
          agentId: agentId,
          agentName: agent.name,
          message: `Human input provided to ${agent.name}`,
          timestamp: new Date(),
        },
        ...state.events,
      ].slice(0, 100),
    }));
  },

  // Filters
  setFilter: (filterType, values) =>
    set((state) => ({
      filters: { ...state.filters, [filterType]: values },
    })),

  clearFilters: () =>
    set({ filters: { roles: [], statuses: [], priorities: [] } }),

  // Reset
  reset: () =>
    set({
      agents: [],
      selectedAgentId: null,
      events: [],
      isPaused: false,
      filters: { roles: [], statuses: [], priorities: [] },
    }),

  // Computed
  getFilteredAgents: () => {
    const { agents, filters } = get();

    return agents.filter((agent) => {
      if (filters.roles.length && !filters.roles.includes(agent.role)) return false;
      if (filters.statuses.length && !filters.statuses.includes(agent.status)) return false;
      if (filters.priorities.length && !filters.priorities.includes(agent.priority)) return false;
      return true;
    });
  },

  getAgentById: (id) => get().agents.find((a) => a.id === id),

  getChildAgents: (parentId) => get().agents.filter((a) => a.parentId === parentId),

  getStats: () => {
    const agents = get().agents;
    return {
      total: agents.length,
      working: agents.filter((a) => a.status === 'working').length,
      completed: agents.filter((a) => a.status === 'completed').length,
      failed: agents.filter((a) => a.status === 'failed').length,
      paused: agents.filter((a) => a.status === 'paused').length,
      waiting: agents.filter((a) => a.status === 'waiting').length,
    };
  },
}));
