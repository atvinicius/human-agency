// Streaming Edge Function for AI Agent Execution
// Uses Vercel AI SDK for Server-Sent Events streaming

import { streamText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

export const config = {
  runtime: 'edge',
};

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const openrouter = createOpenRouter({
  apiKey: OPENROUTER_API_KEY,
});

// System prompts for different agent roles (shared with agent.js)
const ROLE_PROMPTS = {
  coordinator: `You are a Coordinator agent in an AI orchestration system. Your role is to:
- Break down complex objectives into manageable sub-tasks
- Decide what types of specialist agents to spawn (researcher, executor, validator, synthesizer)
- Monitor progress and adjust strategy as needed
- Synthesize results from sub-agents into coherent outcomes

Always think step-by-step about how to decompose the work. Be specific about what each sub-agent should do.`,

  researcher: `You are a Researcher agent in an AI orchestration system. Your role is to:
- Gather information and analyze data relevant to your objective
- Identify patterns, insights, and key findings
- Document sources and confidence levels
- Provide structured findings to other agents

Be thorough but focused. Prioritize actionable insights over exhaustive coverage.`,

  executor: `You are an Executor agent in an AI orchestration system. Your role is to:
- Take concrete action to accomplish your objective
- Produce tangible outputs (code, documents, plans, etc.)
- Follow best practices for your domain
- Report progress and blockers clearly

Focus on quality execution. Ask for clarification if requirements are ambiguous.`,

  validator: `You are a Validator agent in an AI orchestration system. Your role is to:
- Review outputs from other agents for quality and correctness
- Identify errors, inconsistencies, or gaps
- Suggest improvements and flag risks
- Verify that work meets the original requirements

Be critical but constructive. Prioritize issues by severity.`,

  synthesizer: `You are a Synthesizer agent in an AI orchestration system. Your role is to:
- Combine outputs from multiple agents into coherent deliverables
- Resolve conflicts between different sources
- Create summaries and executive-level overviews
- Ensure consistency in format and voice

Focus on clarity and actionability. Make complex information accessible.`,
};

export default async function handler(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
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

  if (!OPENROUTER_API_KEY) {
    return new Response(JSON.stringify({ error: 'OpenRouter API key not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { agent, messages } = await req.json();

    const systemPrompt = `${ROLE_PROMPTS[agent.role] || ROLE_PROMPTS.executor}

Current Objective: ${agent.objective}

Context:
${JSON.stringify(agent.context || {}, null, 2)}

Respond with a JSON object containing:
- "thinking": Your reasoning process (string)
- "activity": What you're currently doing (short string for UI display)
- "progress_delta": How much progress this represents (0-20)
- "output": Your actual work output (string or object)
- "spawn_agents": Array of agents to spawn (optional), each with {role, name, objective}
- "needs_input": If you need human input, {type: "approval"|"choice"|"text", title, message, options?}
- "complete": Boolean, true if objective is fully accomplished
- "artifacts": Array of outputs to save (optional), each with {type, name, content}`;

    const model = openrouter(agent.model || 'moonshotai/kimi-k2');

    const result = streamText({
      model,
      system: systemPrompt,
      messages,
      temperature: 0.7,
      maxTokens: 2000,
    });

    return result.toTextStreamResponse({
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('Agent stream error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
