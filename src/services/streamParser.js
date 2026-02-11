// Parse streaming text responses from Vercel AI SDK toTextStreamResponse()
// The stream sends raw text chunks — no protocol framing needed.

/**
 * Read a streaming text response and call onDelta with each chunk.
 * Returns the full accumulated text when the stream completes.
 *
 * @param {Response} response - Fetch response with streaming body
 * @param {Function} onDelta - Called with (delta, accumulated) for each chunk
 * @returns {Promise<string>} Full accumulated text
 */
export async function parseDataStream(response, onDelta) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    accumulated += chunk;
    onDelta(chunk, accumulated);
  }

  return accumulated;
}

/**
 * Parse the accumulated streaming text as a structured agent response JSON.
 * Falls back to a default structure if parsing fails.
 *
 * @param {string} text - Full accumulated text from stream
 * @returns {object} Parsed agent response
 */
export function parseAgentResponse(text) {
  let jsonText = text.trim();

  // Strip markdown code blocks if present
  if (jsonText.startsWith('```')) {
    const start = jsonText.indexOf('\n') + 1;
    const end = jsonText.lastIndexOf('```');
    if (end > start) {
      jsonText = jsonText.slice(start, end).trim();
    }
  }

  try {
    return JSON.parse(jsonText);
  } catch {
    // Fallback: treat the whole text as output
    return {
      thinking: 'Processing...',
      activity: 'Working on objective',
      progress_delta: 5,
      output: text,
      complete: false,
    };
  }
}
