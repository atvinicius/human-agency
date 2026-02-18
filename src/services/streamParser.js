// Parse streaming text responses from Vercel AI SDK toTextStreamResponse()
// The stream sends raw text chunks — no protocol framing needed.
// With multi-step tool calls, intermediate text may appear before final JSON.

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
 * Enhanced to handle multi-step tool responses where intermediate text
 * may appear before the final JSON block.
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

  // Try direct parse first
  try {
    return JSON.parse(jsonText);
  } catch {
    // Try to extract the last valid JSON object from the text
    // This handles multi-step tool call output where text precedes JSON
    const lastJson = extractLastJsonObject(jsonText);
    if (lastJson) {
      try {
        return JSON.parse(lastJson);
      } catch {
        // Fall through to fallback
      }
    }

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

/**
 * Extract the last complete JSON object {...} from a string.
 * Handles nested braces correctly.
 */
function extractLastJsonObject(text) {
  let depth = 0;
  let end = -1;
  let start = -1;

  // Scan backwards for the last closing brace
  for (let i = text.length - 1; i >= 0; i--) {
    if (text[i] === '}') {
      if (end === -1) end = i;
      depth++;
    } else if (text[i] === '{') {
      depth--;
      if (depth === 0) {
        start = i;
        break;
      }
    }
  }

  if (start !== -1 && end !== -1 && start < end) {
    return text.slice(start, end + 1);
  }

  return null;
}
