import { describe, it, expect, beforeEach } from 'vitest';
import { useAgentStore } from '../agentStore';

describe('agentStore', () => {
  beforeEach(() => {
    useAgentStore.getState().reset();
  });

  describe('event importance classification', () => {
    it('should classify spawn events as important', () => {
      useAgentStore.getState().addAgent({
        id: 'a1',
        name: 'Test Agent',
        role: 'researcher',
        status: 'idle',
      });

      const events = useAgentStore.getState().events;
      expect(events[0].importance).toBe('important');
      expect(events[0].type).toBe('spawn');
    });

    it('should classify coordinator completion as critical', () => {
      // Add a coordinator agent
      useAgentStore.getState().addAgent({
        id: 'coord',
        name: 'Coordinator',
        role: 'coordinator',
        status: 'working',
      });

      // Complete it
      useAgentStore.getState().updateAgent('coord', { status: 'completed' });

      const events = useAgentStore.getState().events;
      const completeEvent = events.find(
        (e) => e.type === 'complete' && e.agentId === 'coord'
      );
      expect(completeEvent.importance).toBe('critical');
    });

    it('should classify non-coordinator completion as important', () => {
      useAgentStore.getState().addAgent({
        id: 'r1',
        name: 'Researcher',
        role: 'researcher',
        status: 'working',
      });

      useAgentStore.getState().updateAgent('r1', { status: 'completed' });

      const events = useAgentStore.getState().events;
      const completeEvent = events.find(
        (e) => e.type === 'complete' && e.agentId === 'r1'
      );
      expect(completeEvent.importance).toBe('important');
    });

    it('should classify failed status as critical', () => {
      useAgentStore.getState().addAgent({
        id: 'f1',
        name: 'Failing Agent',
        role: 'executor',
        status: 'working',
      });

      useAgentStore.getState().updateAgent('f1', { status: 'failed' });

      const events = useAgentStore.getState().events;
      const statusEvent = events.find(
        (e) => e.type === 'status' && e.agentId === 'f1'
      );
      expect(statusEvent.importance).toBe('critical');
    });

    it('should classify activity updates as debug', () => {
      useAgentStore.getState().addAgent({
        id: 'a1',
        name: 'Worker',
        role: 'executor',
        status: 'working',
        currentActivity: 'Starting',
      });

      useAgentStore.getState().updateAgent('a1', {
        currentActivity: 'Analyzing data',
      });

      const events = useAgentStore.getState().events;
      const activityEvent = events.find((e) => e.type === 'activity');
      expect(activityEvent.importance).toBe('debug');
    });

    it('should classify pause events as normal', () => {
      useAgentStore.getState().addAgent({
        id: 'p1',
        name: 'Pausable',
        role: 'executor',
        status: 'working',
      });

      useAgentStore.getState().pauseAgent('p1');

      const events = useAgentStore.getState().events;
      const pauseEvent = events.find((e) => e.type === 'pause');
      expect(pauseEvent.importance).toBe('normal');
    });

    it('should classify input events as critical', () => {
      useAgentStore.getState().addAgent({
        id: 'i1',
        name: 'Needy Agent',
        role: 'executor',
        status: 'working',
      });

      useAgentStore.getState().requestInput('i1', {
        type: 'approval',
        title: 'Need approval',
        message: 'Please approve',
      });

      useAgentStore.getState().respondToInput('i1', 'approved');

      const events = useAgentStore.getState().events;
      const inputEvent = events.find((e) => e.type === 'input');
      expect(inputEvent.importance).toBe('critical');
    });
  });

  describe('event filtering', () => {
    beforeEach(() => {
      // Create agents and events at various importance levels
      const store = useAgentStore.getState();

      store.addAgent({
        id: 'a1',
        name: 'Agent 1',
        role: 'coordinator',
        status: 'working',
        currentActivity: 'Starting',
      });

      // activity event (debug)
      store.updateAgent('a1', { currentActivity: 'Analyzing' });

      // complete event for coordinator (critical)
      store.updateAgent('a1', { status: 'completed' });
    });

    it('should filter events by minimum importance (normal)', () => {
      useAgentStore.getState().setEventFilter('normal');
      const filtered = useAgentStore.getState().getFilteredEvents();
      // Should exclude debug events
      const hasDebug = filtered.some((e) => e.importance === 'debug');
      expect(hasDebug).toBe(false);
    });

    it('should filter events by minimum importance (critical)', () => {
      useAgentStore.getState().setEventFilter('critical');
      const filtered = useAgentStore.getState().getFilteredEvents();
      // Should only have critical events
      filtered.forEach((e) => {
        expect(e.importance).toBe('critical');
      });
    });

    it('should show all events when filter is debug', () => {
      useAgentStore.getState().setEventFilter('debug');
      const filtered = useAgentStore.getState().getFilteredEvents();
      const all = useAgentStore.getState().events;
      expect(filtered.length).toBe(all.length);
    });

    it('should count critical events correctly', () => {
      const count = useAgentStore.getState().getCriticalEventCount();
      // At least the coordinator completion event
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });

  describe('core store operations', () => {
    it('should add and retrieve agents', () => {
      useAgentStore.getState().addAgent({
        id: 'a1',
        name: 'Test',
        role: 'executor',
        status: 'idle',
      });

      expect(useAgentStore.getState().agents).toHaveLength(1);
      expect(useAgentStore.getState().getAgentById('a1').name).toBe('Test');
    });

    it('should update agent properties', () => {
      useAgentStore.getState().addAgent({
        id: 'a1',
        name: 'Test',
        role: 'executor',
        status: 'idle',
      });

      useAgentStore.getState().updateAgent('a1', { status: 'working', progress: 50 });

      const agent = useAgentStore.getState().getAgentById('a1');
      expect(agent.status).toBe('working');
      expect(agent.progress).toBe(50);
    });

    it('should remove agents', () => {
      useAgentStore.getState().addAgent({
        id: 'a1',
        name: 'Test',
        role: 'executor',
        status: 'idle',
      });

      useAgentStore.getState().removeAgent('a1');
      expect(useAgentStore.getState().agents).toHaveLength(0);
    });

    it('should clear selection when selected agent is removed', () => {
      useAgentStore.getState().addAgent({
        id: 'a1',
        name: 'Test',
        role: 'executor',
        status: 'idle',
      });

      useAgentStore.getState().selectAgent('a1');
      expect(useAgentStore.getState().selectedAgentId).toBe('a1');

      useAgentStore.getState().removeAgent('a1');
      expect(useAgentStore.getState().selectedAgentId).toBeNull();
    });

    it('should get child agents by parentId', () => {
      useAgentStore.getState().addAgent({
        id: 'parent',
        name: 'Parent',
        role: 'coordinator',
        status: 'working',
      });
      useAgentStore.getState().addAgent({
        id: 'child1',
        name: 'Child 1',
        role: 'researcher',
        status: 'working',
        parentId: 'parent',
      });
      useAgentStore.getState().addAgent({
        id: 'child2',
        name: 'Child 2',
        role: 'executor',
        status: 'working',
        parentId: 'parent',
      });

      const children = useAgentStore.getState().getChildAgents('parent');
      expect(children).toHaveLength(2);
    });

    it('should compute stats correctly', () => {
      useAgentStore.getState().addAgent({ id: 'a1', name: 'A1', role: 'executor', status: 'working' });
      useAgentStore.getState().addAgent({ id: 'a2', name: 'A2', role: 'executor', status: 'working' });
      useAgentStore.getState().addAgent({ id: 'a3', name: 'A3', role: 'executor', status: 'completed' });

      // updateAgent to set correct status (addAgent sets status from the passed object)
      useAgentStore.getState().updateAgent('a3', { status: 'completed' });

      const stats = useAgentStore.getState().getStats();
      expect(stats.total).toBe(3);
      expect(stats.working).toBe(2);
      // a3 was added with 'completed' status already
      expect(stats.completed).toBe(1);
    });

    it('should limit events to 100', () => {
      const store = useAgentStore.getState();
      // Add 110 agents to generate 110 spawn events
      for (let i = 0; i < 110; i++) {
        store.addAgent({
          id: `agent-${i}`,
          name: `Agent ${i}`,
          role: 'executor',
          status: 'idle',
        });
      }

      expect(useAgentStore.getState().events.length).toBeLessThanOrEqual(100);
    });

    it('should pause and resume individual agents', () => {
      useAgentStore.getState().addAgent({
        id: 'a1',
        name: 'Test',
        role: 'executor',
        status: 'working',
      });

      useAgentStore.getState().pauseAgent('a1');
      expect(useAgentStore.getState().getAgentById('a1').status).toBe('paused');

      useAgentStore.getState().resumeAgent('a1');
      expect(useAgentStore.getState().getAgentById('a1').status).toBe('working');
    });

    it('should pause and resume all agents', () => {
      useAgentStore.getState().addAgent({ id: 'a1', name: 'A1', role: 'executor', status: 'working' });
      useAgentStore.getState().addAgent({ id: 'a2', name: 'A2', role: 'executor', status: 'working' });

      useAgentStore.getState().pauseAll();
      expect(useAgentStore.getState().isPaused).toBe(true);
      expect(useAgentStore.getState().getAgentById('a1').status).toBe('paused');
      expect(useAgentStore.getState().getAgentById('a2').status).toBe('paused');

      useAgentStore.getState().resumeAll();
      expect(useAgentStore.getState().isPaused).toBe(false);
      expect(useAgentStore.getState().getAgentById('a1').status).toBe('working');
      expect(useAgentStore.getState().getAgentById('a2').status).toBe('working');
    });

    it('should not pause completed or failed agents', () => {
      useAgentStore.getState().addAgent({ id: 'a1', name: 'A1', role: 'executor', status: 'completed' });
      useAgentStore.getState().addAgent({ id: 'a2', name: 'A2', role: 'executor', status: 'failed' });

      useAgentStore.getState().pauseAgent('a1');
      useAgentStore.getState().pauseAgent('a2');

      expect(useAgentStore.getState().getAgentById('a1').status).toBe('completed');
      expect(useAgentStore.getState().getAgentById('a2').status).toBe('failed');
    });

    it('should reset store to initial state', () => {
      useAgentStore.getState().addAgent({ id: 'a1', name: 'A1', role: 'executor', status: 'working' });
      useAgentStore.getState().selectAgent('a1');
      useAgentStore.getState().setEventFilter('critical');

      useAgentStore.getState().reset();

      const state = useAgentStore.getState();
      expect(state.agents).toHaveLength(0);
      expect(state.events).toHaveLength(0);
      expect(state.selectedAgentId).toBeNull();
      expect(state.isPaused).toBe(false);
      expect(state.eventFilter).toBe('normal');
    });
  });

  describe('agent filtering', () => {
    beforeEach(() => {
      useAgentStore.getState().addAgent({ id: 'a1', name: 'Coord', role: 'coordinator', status: 'working' });
      useAgentStore.getState().addAgent({ id: 'a2', name: 'Researcher', role: 'researcher', status: 'working' });
      useAgentStore.getState().addAgent({ id: 'a3', name: 'Executor', role: 'executor', status: 'completed' });
    });

    it('should filter agents by role', () => {
      useAgentStore.getState().setFilter('roles', ['coordinator']);
      const filtered = useAgentStore.getState().getFilteredAgents();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].role).toBe('coordinator');
    });

    it('should filter agents by status', () => {
      useAgentStore.getState().setFilter('statuses', ['working']);
      const filtered = useAgentStore.getState().getFilteredAgents();
      expect(filtered).toHaveLength(2);
    });

    it('should return all agents when no filters active', () => {
      const filtered = useAgentStore.getState().getFilteredAgents();
      expect(filtered).toHaveLength(3);
    });

    it('should clear all filters', () => {
      useAgentStore.getState().setFilter('roles', ['coordinator']);
      useAgentStore.getState().clearFilters();
      const filtered = useAgentStore.getState().getFilteredAgents();
      expect(filtered).toHaveLength(3);
    });
  });
});
