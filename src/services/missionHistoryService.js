import { supabase, isSupabaseConfigured } from '../lib/supabase';

export async function getMissionHistory(userId) {
  if (!isSupabaseConfigured() || !userId) return [];

  const { data, error } = await supabase
    .from('sessions')
    .select('id, name, status, objective, metadata, started_at, completed_at')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Failed to fetch mission history:', error);
    return [];
  }

  // Fetch agent counts per session
  const sessionIds = data.map((s) => s.id);
  if (sessionIds.length === 0) return [];

  const { data: agentCounts, error: countErr } = await supabase
    .from('agents')
    .select('session_id')
    .in('session_id', sessionIds);

  if (countErr) {
    console.error('Failed to fetch agent counts:', countErr);
    return data.map((s) => ({ ...s, agent_count: 0 }));
  }

  const countMap = {};
  for (const row of agentCounts) {
    countMap[row.session_id] = (countMap[row.session_id] || 0) + 1;
  }

  return data.map((s) => ({
    ...s,
    agent_count: countMap[s.id] || 0,
  }));
}

export async function getMissionDetails(sessionId) {
  if (!isSupabaseConfigured() || !sessionId) return null;

  const [sessionRes, agentsRes, eventsRes, artifactsRes] = await Promise.all([
    supabase.from('sessions').select('*').eq('id', sessionId).single(),
    supabase.from('agents').select('*').eq('session_id', sessionId).order('spawned_at', { ascending: true }),
    supabase.from('events').select('*').eq('session_id', sessionId).order('created_at', { ascending: false }).limit(100),
    supabase.from('artifacts').select('*').eq('session_id', sessionId).order('created_at', { ascending: true }),
  ]);

  if (sessionRes.error) {
    console.error('Failed to fetch mission details:', sessionRes.error);
    return null;
  }

  return {
    session: sessionRes.data,
    agents: agentsRes.data || [],
    events: eventsRes.data || [],
    artifacts: artifactsRes.data || [],
  };
}
