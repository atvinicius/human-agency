// Context compression for agent message history
// Reduces token usage by summarizing older messages while preserving recent context

const WINDOW_SIZE = 4; // Keep last 4 messages (2 assistant + 2 user exchanges)
const COMPRESS_EVERY = 3; // Compress after every 3 iterations

/**
 * Determine if compression is needed for this iteration
 */
export function shouldCompress(iteration, messageCount) {
  return iteration > 0 && iteration % COMPRESS_EVERY === 0 && messageCount > WINDOW_SIZE + 1;
}

/**
 * Compress older messages into a summary, keeping recent messages intact.
 * Uses the same /api/agent endpoint with a summarization prompt.
 *
 * @param {Array} messages - Full message history
 * @param {string} agentObjective - The agent's current objective
 * @param {Function} fetchFn - Function to call the LLM (goes through request queue)
 * @returns {Array} Compressed message array
 */
export async function compressContext(messages, agentObjective, fetchFn) {
  if (messages.length <= WINDOW_SIZE + 1) return messages;

  const oldMessages = messages.slice(0, -WINDOW_SIZE);
  const recentMessages = messages.slice(-WINDOW_SIZE);

  // Build a summary of the old conversation
  const summaryContent = oldMessages
    .map((m) => `[${m.role}]: ${typeof m.content === 'string' ? m.content.slice(0, 500) : JSON.stringify(m.content).slice(0, 500)}`)
    .join('\n');

  try {
    const summaryAgent = {
      id: 'context-summarizer',
      role: 'synthesizer',
      objective: 'Summarize conversation context',
      model: 'moonshotai/kimi-k2',
    };

    const summaryMessages = [
      {
        role: 'user',
        content: `Summarize the following agent conversation for objective: "${agentObjective}".
Focus on: key decisions made, important findings, current state, and what needs to happen next.
Be concise — 2-3 sentences maximum.

${summaryContent}`,
      },
    ];

    const response = await fetchFn(summaryAgent, summaryMessages);
    const summaryText = response?.result?.output || response?.result?.thinking || 'Previous work completed.';

    return [
      {
        role: 'user',
        content: `Context summary of your work so far:\n${summaryText}\n\nContinue from where you left off.`,
      },
      ...recentMessages,
    ];
  } catch (error) {
    // If summarization fails, fall back to simple truncation
    console.warn('[ContextCompressor] Summarization failed, using truncation fallback:', error.message);
    return [
      {
        role: 'user',
        content: `You have been working on: "${agentObjective}". Continue your work.`,
      },
      ...recentMessages,
    ];
  }
}
