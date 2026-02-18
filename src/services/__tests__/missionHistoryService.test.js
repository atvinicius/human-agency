import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase before importing the service
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockIn = vi.fn();
const mockSingle = vi.fn();

vi.mock('../../lib/supabase', () => ({
  isSupabaseConfigured: () => true,
  supabase: {
    from: (table) => {
      mockFrom(table);
      return {
        select: (...args) => {
          mockSelect(...args);
          return {
            eq: (...args2) => {
              mockEq(...args2);
              return {
                order: (...args3) => {
                  mockOrder(...args3);
                  return {
                    limit: (...args4) => {
                      mockLimit(...args4);
                      // Return sessions data
                      if (table === 'sessions') {
                        return Promise.resolve({
                          data: [
                            { id: 's1', name: 'Mission 1', status: 'completed', objective: 'Test', started_at: '2025-01-01' },
                            { id: 's2', name: 'Mission 2', status: 'active', objective: 'Test 2', started_at: '2025-01-02' },
                          ],
                          error: null,
                        });
                      }
                      return Promise.resolve({ data: [], error: null });
                    },
                    single: () => {
                      mockSingle();
                      return Promise.resolve({
                        data: { id: 's1', name: 'Mission 1', status: 'completed' },
                        error: null,
                      });
                    },
                  };
                },
                single: () => {
                  mockSingle();
                  return Promise.resolve({
                    data: { id: 's1', name: 'Mission 1', status: 'completed' },
                    error: null,
                  });
                },
              };
            },
            in: (...args2) => {
              mockIn(...args2);
              return Promise.resolve({
                data: [
                  { session_id: 's1' },
                  { session_id: 's1' },
                  { session_id: 's2' },
                ],
                error: null,
              });
            },
          };
        },
      };
    },
  },
}));

import { getMissionHistory } from '../missionHistoryService';

describe('missionHistoryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty array when no userId', async () => {
    const result = await getMissionHistory(null);
    expect(result).toEqual([]);
  });

  it('should fetch mission history with agent counts', async () => {
    const result = await getMissionHistory('user-123');

    expect(result.length).toBe(2);
    expect(result[0].name).toBe('Mission 1');
    expect(result[0].agent_count).toBe(2); // s1 has 2 agents
    expect(result[1].name).toBe('Mission 2');
    expect(result[1].agent_count).toBe(1); // s2 has 1 agent
  });

  it('should query sessions table with correct params', async () => {
    await getMissionHistory('user-123');

    expect(mockFrom).toHaveBeenCalledWith('sessions');
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123');
  });
});
