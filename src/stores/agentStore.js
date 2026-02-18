import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Importance levels: critical > important > normal > debug
const IMPORTANCE_LEVELS = ['critical', 'important', 'normal', 'debug'];

function classifyEventImportance(type, agent, updates) {
  // Critical: requires human attention
  if (type === 'input') return 'critical';
  if (type === 'error') return 'critical';
  if (type === 'complete' && agent?.role === 'coordinator') return 'critical';
  if (updates?.status === 'failed') return 'critical';

  // Important: notable milestones
  if (type === 'spawn') return 'important';
  if (type === 'complete') return 'important';
  if (updates?.status === 'blocked') return 'important';

  // Normal: operational events
  if (type === 'pause') return 'normal';
  if (type === 'resume') return 'normal';
  if (type === 'status') return 'normal';

  // Debug: routine progress
  if (type === 'activity') return 'debug';

  return 'normal';
}

function meetsMinImportance(importance, minImportance) {
  return IMPORTANCE_LEVELS.indexOf(importance) <= IMPORTANCE_LEVELS.indexOf(minImportance);
}

export const useAgentStore = create((set, get) => ({
  agents: [],
  selectedAgentId: null,
  events: [],
  dataTransfers: [],
  isPaused: false,
  eventFilter: 'normal', // minimum importance level to show
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
          importance: classifyEventImportance('spawn', agent),
        },
        ...state.events,
      ].slice(0, 100),
    })),

  updateAgent: (id, updates) =>
    set((state) => {
      const agent = state.agents.find((a) => a.id === id);
      const newEvents = [...state.events];

      // Track status changes
      if (updates.status && agent && updates.status !== agent.status) {
        const type = updates.status === 'completed' ? 'complete' : 'status';
        newEvents.unshift({
          id: Date.now(),
          type,
          agentId: id,
          agentName: agent.name,
          message: `${agent.name} ${updates.status}`,
          timestamp: new Date(),
          importance: classifyEventImportance(type, agent, updates),
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
          importance: classifyEventImportance('activity', agent, updates),
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
          importance: 'normal',
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
          importance: 'normal',
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
            importance: 'normal',
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
            importance: 'normal',
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
          importance: 'critical',
        },
        ...state.events,
      ].slice(0, 100),
    }));
  },

  // Data transfers for visualization
  addDataTransfer: (transfer) =>
    set((state) => ({
      dataTransfers: [
        { id: Date.now() + Math.random(), ...transfer, timestamp: Date.now() },
        ...state.dataTransfers,
      ].slice(0, 50),
    })),

  // Programmatic event emitter (for search events, etc.)
  addEvent: ({ type, agentId, agentName, message, importance }) =>
    set((state) => ({
      events: [
        {
          id: Date.now() + Math.random(),
          type,
          agentId,
          agentName,
          message,
          timestamp: new Date(),
          importance: importance || classifyEventImportance(type),
        },
        ...state.events,
      ].slice(0, 100),
    })),

  // Event filter
  setEventFilter: (minImportance) => set({ eventFilter: minImportance }),

  // Filters
  setFilter: (filterType, values) =>
    set((state) => ({
      filters: { ...state.filters, [filterType]: values },
    })),

  clearFilters: () =>
    set({ filters: { roles: [], statuses: [], priorities: [] } }),

  // Reset
  reset: () => {
    // Unsubscribe from any active Realtime channel
    const unsub = get()._realtimeUnsub;
    if (unsub) unsub();
    set({
      agents: [],
      selectedAgentId: null,
      events: [],
      dataTransfers: [],
      isPaused: false,
      eventFilter: 'normal',
      filters: { roles: [], statuses: [], priorities: [] },
      _realtimeUnsub: null,
    });
  },

  // Realtime channel unsubscribe function (internal)
  _realtimeUnsub: null,

  /**
   * Subscribe to Supabase Realtime for a session.
   * Listens for agent INSERT/UPDATE and event INSERT.
   * Returns an unsubscribe function.
   */
  subscribeToSession: (sessionId) => {
    if (!isSupabaseConfigured() || !sessionId) return () => {};

    const channel = supabase.channel(`session:${sessionId}`);

    // Agent inserts (new spawns from server)
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'agents', filter: `session_id=eq.${sessionId}` },
      (payload) => {
        const agent = payload.new;
        // Only add if not already in store (avoid duplicates from local addAgent)
        const exists = get().agents.some((a) => a.id === agent.id);
        if (!exists) {
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
                importance: classifyEventImportance('spawn', agent),
              },
              ...state.events,
            ].slice(0, 100),
          }));
        }
      }
    );

    // Agent updates (status changes, progress, activity from server)
    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'agents', filter: `session_id=eq.${sessionId}` },
      (payload) => {
        const updated = payload.new;
        const old = payload.old;
        set((state) => {
          const existing = state.agents.find((a) => a.id === updated.id);
          const newEvents = [...state.events];

          // Generate events from status changes
          if (updated.status && existing && updated.status !== existing.status) {
            const type = updated.status === 'completed' ? 'complete' : 'status';
            newEvents.unshift({
              id: Date.now(),
              type,
              agentId: updated.id,
              agentName: updated.name || existing.name,
              message: `${updated.name || existing.name} ${updated.status}`,
              timestamp: new Date(),
              importance: classifyEventImportance(type, existing, updated),
            });
          }

          // Generate activity events
          if (updated.current_activity && existing && updated.current_activity !== existing.current_activity) {
            newEvents.unshift({
              id: Date.now() + 1,
              type: 'activity',
              agentId: updated.id,
              agentName: updated.name || existing.name,
              message: updated.current_activity,
              timestamp: new Date(),
              importance: classifyEventImportance('activity', existing, updated),
            });
          }

          // Data transfer for completion (findings flow up)
          const dataTransfers = [...state.dataTransfers];
          if (updated.status === 'completed' && existing && existing.status !== 'completed' && updated.parent_id) {
            dataTransfers.unshift({
              id: Date.now() + Math.random(),
              sourceId: updated.id,
              targetId: updated.parent_id,
              type: 'findings',
              timestamp: Date.now(),
            });
          }

          return {
            agents: state.agents.map((a) =>
              a.id === updated.id ? { ...a, ...updated } : a
            ),
            events: newEvents.slice(0, 100),
            dataTransfers: dataTransfers.slice(0, 50),
          };
        });
      }
    );

    // Event inserts (search events, completion events from server)
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'events', filter: `session_id=eq.${sessionId}` },
      (payload) => {
        const event = payload.new;
        // Derive data transfers from search events
        if (event.type === 'search') {
          set((state) => ({
            dataTransfers: [
              { id: Date.now() + Math.random(), sourceId: 'external', targetId: event.agent_id, type: 'search_result', timestamp: Date.now() },
              ...state.dataTransfers,
            ].slice(0, 50),
          }));
        }

        // Add to events if not already present
        set((state) => ({
          events: [
            {
              id: event.id || Date.now() + Math.random(),
              type: event.type,
              agentId: event.agent_id,
              agentName: event.agent_name || state.agents.find((a) => a.id === event.agent_id)?.name || 'Agent',
              message: event.message,
              timestamp: new Date(event.created_at || Date.now()),
              importance: classifyEventImportance(event.type),
            },
            ...state.events,
          ].slice(0, 100),
        }));
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
   * Load session state from DB (for reconnection / mission resume).
   */
  loadFromDB: async (sessionId) => {
    if (!isSupabaseConfigured() || !sessionId) return;

    // Fetch agents
    const { data: agents } = await supabase
      .from('agents')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    // Fetch recent events
    const { data: events } = await supabase
      .from('events')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(100);

    set({
      agents: agents || [],
      events: (events || []).map((e) => ({
        id: e.id,
        type: e.type,
        agentId: e.agent_id,
        agentName: e.agent_name || (agents || []).find((a) => a.id === e.agent_id)?.name || 'Agent',
        message: e.message,
        timestamp: new Date(e.created_at),
        importance: classifyEventImportance(e.type),
      })),
    });
  },

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

  getFilteredEvents: () => {
    const { events, eventFilter } = get();
    return events.filter((e) => meetsMinImportance(e.importance || 'normal', eventFilter));
  },

  getCriticalEventCount: () => {
    return get().events.filter((e) => e.importance === 'critical').length;
  },

  getAgentById: (id) => get().agents.find((a) => a.id === id),

  getChildAgents: (parentId) => get().agents.filter((a) => a.parentId === parentId || a.parent_id === parentId),

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
