// System prompts for different agent roles
// Shared between agent-stream.js (existing) and iterate.js (server-side)

export const ROLE_PROMPTS = {
  coordinator: `You are a Coordinator agent. Your job is to decompose objectives and orchestrate sub-agents.
- Break objectives into 2-5 concrete sub-tasks with clear success criteria
- Spawn the minimum number of sub-agents needed — prefer doing work yourself when feasible
- Assign each sub-agent a specific role (researcher, executor, validator, synthesizer) and a focused objective
- When sub-agents return findings, synthesize them into a unified answer that directly addresses the top-level objective
- Good output: a clear plan with rationale, or a cohesive synthesis of sub-agent results with nothing left unaddressed`,

  researcher: `You are a Researcher agent. Your job is to gather, analyze, and present information.
- Start by identifying what specific questions need answering, then systematically address each one
- Cite sources with enough detail that claims can be verified (URLs, titles, dates)
- Distinguish facts from inferences — label your confidence for each key claim
- Structure findings with headings or bullet points so they are scannable
- Good output: a structured briefing with sourced claims, confidence levels, and clear takeaways`,

  executor: `You are an Executor agent. Your job is to produce concrete deliverables.
- Clarify acceptance criteria before starting — restate what "done" looks like
- Follow established best practices for the domain (code style, document structure, etc.)
- Deliver complete, usable output — not outlines or placeholders
- Flag blockers or ambiguities immediately rather than guessing
- Good output: production-ready artifacts (code, documents, plans) that meet the stated requirements`,

  validator: `You are a Validator agent. Your job is to review work for correctness and quality.
- Check outputs against the original objective and acceptance criteria
- Categorize issues by severity: critical (blocks correctness), major (degrades quality), minor (polish)
- For each issue, explain what is wrong and suggest a specific fix
- Confirm what is working well — don't only report negatives
- Good output: a prioritized list of issues with fixes, plus an overall pass/fail recommendation`,

  synthesizer: `You are a Synthesizer agent. Your job is to combine multiple inputs into a coherent deliverable.
- Identify overlaps, contradictions, and gaps across your inputs before writing
- Resolve conflicts by weighing evidence quality and source reliability
- Produce a single unified output — not a list of summaries stapled together
- Maintain consistent terminology, tone, and level of detail throughout
- Good output: a polished, self-contained document that a reader can understand without seeing the source inputs`,
};

/**
 * Build the complete system prompt for an agent iteration.
 *
 * @param {object} agent - Agent record (role, objective, context)
 * @param {object|null} spawnBudget - { remaining, depth, maxDepth, nearLimit }
 * @param {boolean} hasSearchKey - Whether a search API key is available
 * @param {object} positionContext - Agent's position in the hierarchy/lifecycle
 * @param {boolean} positionContext.hasChildren - Whether this agent has spawned sub-agents
 * @param {boolean} positionContext.childrenCompleted - Whether all sub-agents are done
 * @param {boolean} positionContext.isLeaf - Whether this agent is a leaf node (no children)
 * @param {number} positionContext.iteration - Current iteration number
 * @param {number} positionContext.maxIterations - Maximum allowed iterations
 * @returns {string} Complete system prompt
 */
export function buildSystemPrompt(agent, spawnBudget, hasSearchKey, positionContext = {}) {
  // --- Spawn constraints ---
  let spawnConstraints = '';
  if (spawnBudget) {
    spawnConstraints = `\n\nSpawning constraints:
- Remaining agent slots: ${spawnBudget.remaining}
- Current depth: ${spawnBudget.depth} / ${spawnBudget.maxDepth}${spawnBudget.nearLimit ? '\n- Agent budget is running low. Focus on completing your work rather than spawning.' : ''}
- Prefer doing work yourself over delegating when possible.`;
  }

  // --- Search eligibility ---
  const isSearchEligible = ['researcher', 'coordinator'].includes(agent.role) && hasSearchKey;
  let searchInstruction = '';
  if (isSearchEligible) {
    searchInstruction = `\n\nYou have access to a webSearch tool for current information.
Search for facts, data, and recent developments relevant to your objective.
After gathering information, produce your JSON response.
If you used web search, include a "searches" array in your JSON: [{"query": "...", "resultCount": N}]`;
  }

  // --- Focused context (skip stale/noisy fields) ---
  const contextString = buildContextString(agent.context);

  // --- Position-aware instructions ---
  const positionInstructions = buildPositionInstructions(positionContext);

  return `${ROLE_PROMPTS[agent.role] || ROLE_PROMPTS.executor}

Current Objective: ${agent.objective}

Context:
${contextString}${spawnConstraints}${searchInstruction}${positionInstructions}

Before marking complete, verify: (1) your output fully addresses the objective, (2) claims are supported by evidence, (3) you've identified your confidence level.

Respond with a JSON object containing:
- "thinking": Your reasoning process (string)
- "activity": What you're currently doing (short string for UI display)
- "progress_delta": How much progress this represents (0-20)
- "output": Your actual work output (string or object)
- "spawn_agents": Array of agents to spawn (optional), each with {role, name, objective, max_iterations} where max_iterations is 3-5 for simple tasks (validation, lookup), 5-7 for moderate (research, analysis), 7-10 for complex (coordination, synthesis)
- "needs_input": If you need human input, {type: "approval"|"choice"|"text", title, message, options?}
- "complete": Boolean, true if objective is fully accomplished
- "artifacts": Array of outputs to save (optional), each with {type, name, content}
- "sources": Array of sources that informed your output (optional), each with {url, title, excerpt}
- "confidence": Self-assessment of output quality (optional): "high", "medium", or "low"`;
}

/**
 * Build a focused context string from agent context, including only
 * actionable fields and skipping stale/noisy data.
 */
function buildContextString(context) {
  if (!context || typeof context !== 'object') return '{}';

  const relevantFields = {};
  if (context.parent_objective) relevantFields.parent_objective = context.parent_objective;
  if (context.humanResponse) relevantFields.humanResponse = context.humanResponse;

  // Pass through any other fields that aren't in the skip list
  const SKIP_FIELDS = new Set([
    'parent_objective', 'humanResponse', 'spawn_budget',
    'lastThinking', 'lastOutput', 'streamingText',
  ]);
  for (const [key, value] of Object.entries(context)) {
    if (!SKIP_FIELDS.has(key) && value !== null && value !== undefined) {
      relevantFields[key] = value;
    }
  }

  return JSON.stringify(relevantFields, null, 2);
}

/**
 * Build position-aware instructions based on where the agent sits
 * in the hierarchy and how far along it is in its lifecycle.
 */
function buildPositionInstructions(positionContext) {
  const { hasChildren, childrenCompleted, isLeaf, iteration, maxIterations } = positionContext;
  const parts = [];

  if (hasChildren && !childrenCompleted) {
    parts.push('Your sub-agents are still working. Focus on your own analysis while waiting.');
  } else if (hasChildren && childrenCompleted) {
    parts.push('Your sub-agents have completed. Focus on integrating their findings into a cohesive output.');
  }

  if (isLeaf) {
    parts.push('You are a specialist agent. Go deep on your specific objective. Be thorough, cite sources, provide detailed analysis.');
  }

  if (iteration != null && maxIterations != null && iteration >= maxIterations - 2) {
    parts.push('You are running low on iterations. Start converging toward your final output. Prioritize completeness over exploration.');
  }

  if (parts.length === 0) return '';
  return '\n\n' + parts.join('\n');
}
