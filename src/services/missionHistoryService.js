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

  // Fetch agent counts per session (count-only, no full rows)
  const sessionIds = data.map((s) => s.id);
  if (sessionIds.length === 0) return [];

  const countMap = {};
  // Query each session's agent count individually to avoid transferring full rows
  const countPromises = sessionIds.map(async (sid) => {
    const { count, error: countErr } = await supabase
      .from('agents')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sid);
    if (!countErr) countMap[sid] = count || 0;
  });
  await Promise.all(countPromises);

  return data.map((s) => ({
    ...s,
    agent_count: countMap[s.id] || 0,
  }));
}

export async function getMissionDetails(sessionId) {
  if (!isSupabaseConfigured() || !sessionId) return null;

  const [sessionRes, agentsRes, eventsRes, artifactsRes] = await Promise.all([
    supabase.from('sessions').select('*').eq('id', sessionId).single(),
    supabase.from('agents').select('id, name, role, status, progress, objective, current_activity, spawned_at').eq('session_id', sessionId).order('spawned_at', { ascending: true }),
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
