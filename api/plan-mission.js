// Streaming Edge Function for mission planning
// Takes a user's objective and generates an agent tree configuration

import { streamText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

export const config = {
  runtime: 'edge',
};

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const openrouter = createOpenRouter({
  apiKey: OPENROUTER_API_KEY,
});

const PLANNER_PROMPT = `You are a Mission Planner for Human Agency, an AI orchestration system where one human directs swarms of AI agents.

Given a user's objective, decompose it into a hierarchical team of AI agents.

Available agent roles:
- coordinator: Breaks down objectives, spawns sub-agents, monitors progress, synthesizes results
- researcher: Gathers information, analyzes data, identifies patterns, documents findings
- executor: Takes concrete action, produces tangible outputs (code, documents, plans)
- validator: Reviews outputs for quality, identifies errors, suggests improvements
- synthesizer: Combines outputs from multiple agents into coherent deliverables

You MUST respond with ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "name": "Short mission name (3-5 words)",
  "description": "One-sentence description of the mission",
  "estimated_agents": <number between 5 and 25>,
  "agent_config": {
    "root": {
      "role": "coordinator",
      "name": "Descriptive name for the coordinator",
      "objective": "High-level coordination objective",
      "children": [
        {
          "role": "researcher|executor|validator|synthesizer|coordinator",
          "name": "Descriptive name",
          "objective": "Specific, actionable objective for this agent",
          "children": [...]
        }
      ]
    }
  }
}

Guidelines:
- Start with a coordinator at the root
- Use 5-25 agents total
- Each agent should have a specific, actionable objective
- Group related work under sub-coordinators for complex missions
- Include at least one validator
- Include a synthesizer for the final output
- Make names descriptive (e.g., "Market Research Analyst", not "Agent 1")
- Make objectives specific (e.g., "Research competitor pricing models in the SaaS space", not "Do research")`;

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
    const { objective } = await req.json();

    if (!objective?.trim()) {
      return new Response(JSON.stringify({ error: 'Objective is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const model = openrouter('moonshotai/kimi-k2');

    const result = streamText({
      model,
      system: PLANNER_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Plan a mission for this objective: ${objective}`,
        },
      ],
      temperature: 0.7,
      maxTokens: 3000,
    });

    return result.toTextStreamResponse({
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('Plan mission error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
