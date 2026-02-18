// Human input response endpoint
// Allows the client to respond to an agent's needs_input request.

import { createClient } from '@supabase/supabase-js';
import { authenticateRequest, unauthorizedResponse } from './_middleware/auth.js';

export const config = {
  runtime: 'edge',
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Authenticate user
  const authUser = await authenticateRequest(req);
  if (SUPABASE_URL && SUPABASE_SERVICE_KEY && !authUser) {
    return unauthorizedResponse(corsHeaders);
  }

  try {
    const { agentId, sessionId, response } = await req.json();

    if (!agentId || !sessionId || response === undefined) {
      return new Response(JSON.stringify({ error: 'agentId, sessionId, and response are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    });

    // Verify user owns the session
    if (authUser) {
      const { data: session } = await supabase
        .from('sessions')
        .select('user_id')
        .eq('id', sessionId)
        .single();

      if (!session || session.user_id !== authUser.id) {
        return new Response(JSON.stringify({ error: 'Not authorized for this session' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Update agent: clear pending_input, set status to working, store human response
    const { data: agent } = await supabase
      .from('agents')
      .select('context')
      .eq('id', agentId)
      .single();

    if (!agent) {
      return new Response(JSON.stringify({ error: 'Agent not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await supabase.from('agents').update({
      status: 'working',
      pending_input: null,
      context: {
        ...(agent.context || {}),
        humanResponse: response,
      },
    }).eq('id', agentId);

    // Add the human response as a message so iterate.js picks it up
    await supabase.from('agent_messages').insert({
      agent_id: agentId,
      role: 'user',
      content: `Human response: ${JSON.stringify(response)}`,
    });

    // Event
    await supabase.from('events').insert({
      session_id: sessionId,
      agent_id: agentId,
      type: 'input',
      message: `Human input provided`,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Respond-input error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
