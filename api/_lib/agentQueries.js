// Database queries for server-side agent orchestration
// All functions take a Supabase admin client and return query results.

/**
 * Claim one working agent for processing using SKIP LOCKED.
 * This prevents multiple workers from processing the same agent.
 *
 * @param {object} supabase - Supabase admin client
 * @param {string} sessionId - Session to claim from
 * @returns {object|null} Claimed agent row, or null if none available
 */
export async function claimAgent(supabase, sessionId) {
  // Use raw SQL for FOR UPDATE SKIP LOCKED (not supported by PostgREST)
  const { data, error } = await supabase.rpc('claim_agent_for_iteration', {
    p_session_id: sessionId,
  });

  if (error || !data) return null;
  return data;
}

/**
 * Load all messages for an agent ordered by seq.
 *
 * @param {object} supabase
 * @param {string} agentId
 * @returns {Array} Messages in [{ role, content }] format
 */
export async function loadMessages(supabase, agentId) {
  const { data, error } = await supabase
    .from('agent_messages')
    .select('role, content, seq')
    .eq('agent_id', agentId)
    .order('seq', { ascending: true });

  if (error || !data) return [];
  return data.map(({ role, content }) => ({ role, content }));
}

/**
 * Save messages to agent_messages table.
 *
 * @param {object} supabase
 * @param {string} agentId
 * @param {Array} messages - [{ role, content }]
 */
export async function saveMessages(supabase, agentId, messages) {
  if (!messages || messages.length === 0) return;

  const rows = messages.map((m) => ({
    agent_id: agentId,
    role: m.role,
    content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
  }));

  const { error } = await supabase.from('agent_messages').insert(rows);
  if (error) console.error('saveMessages error:', error);
}

/**
 * Get sibling findings for collaboration context.
 * Returns last 5 findings from siblings of the given agent.
 *
 * @param {object} supabase
 * @param {string} sessionId
 * @param {string} agentId - Current agent (excluded)
 * @param {string} parentId - Parent agent ID to find siblings
 * @returns {Array<string>} Formatted finding strings
 */
export async function getSiblingFindings(supabase, sessionId, agentId, parentId) {
  if (!parentId) return [];

  // Get sibling agent IDs
  const { data: siblings } = await supabase
    .from('agents')
    .select('id')
    .eq('session_id', sessionId)
    .eq('parent_id', parentId)
    .neq('id', agentId);

  if (!siblings || siblings.length === 0) return [];

  const siblingIds = siblings.map((s) => s.id);

  // Get last 5 findings from these siblings
  const { data: findings } = await supabase
    .from('findings')
    .select('agent_name, content')
    .eq('session_id', sessionId)
    .in('agent_id', siblingIds)
    .order('created_at', { ascending: false })
    .limit(5);

  if (!findings) return [];

  return findings.map((f) => `${f.agent_name}: ${f.content.slice(0, 200)}`);
}

/**
 * Get new child completions since a timestamp.
 * Replaces FindingsRegistry.getNewCompletionsSince for server-side.
 *
 * @param {object} supabase
 * @param {string} sessionId
 * @param {Array<string>} childIds
 * @param {string|null} since - ISO timestamp
 * @returns {Array<{agentId, name, output}>}
 */
export async function getChildCompletions(supabase, sessionId, childIds, since) {
  if (!childIds || childIds.length === 0) return [];

  let query = supabase
    .from('agents')
    .select('id, name, completion_output')
    .eq('session_id', sessionId)
    .in('id', childIds)
    .eq('status', 'completed')
    .not('completion_output', 'is', null);

  if (since) {
    query = query.gt('updated_at', since);
  }

  const { data } = await query;
  if (!data) return [];

  return data.map((a) => ({
    agentId: a.id,
    name: a.name,
    output: a.completion_output,
  }));
}

/**
 * Check if all agents in a session are in terminal state.
 *
 * @param {object} supabase
 * @param {string} sessionId
 * @returns {boolean}
 */
export async function checkMissionComplete(supabase, sessionId) {
  const { data, error } = await supabase
    .from('agents')
    .select('status')
    .eq('session_id', sessionId);

  if (error || !data || data.length === 0) return false;

  return data.every((a) => ['completed', 'failed'].includes(a.status));
}
