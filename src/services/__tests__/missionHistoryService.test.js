import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase before importing the service
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockSingle = vi.fn();

// Agent count data: s1 has 2 agents, s2 has 1 agent
const agentCountMap = { s1: 2, s2: 1 };

vi.mock('../../lib/supabase', () => ({
  isSupabaseConfigured: () => true,
  supabase: {
    from: (table) => {
      mockFrom(table);
      if (table === 'agents') {
        // Count-only query: .select('id', { count, head }).eq('session_id', sid)
        return {
          select: (...args) => {
            mockSelect(...args);
            return {
              eq: (col, val) => {
                mockEq(col, val);
                return Promise.resolve({
                  count: agentCountMap[val] || 0,
                  error: null,
                });
              },
              // For getMissionDetails: .eq('session_id', sid).order(...).limit(...)
              order: (...args3) => {
                mockOrder(...args3);
                return {
                  limit: (...args4) => {
                    mockLimit(...args4);
                    return Promise.resolve({ data: [], error: null });
                  },
                };
              },
            };
          },
        };
      }
      // Sessions and other tables
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
