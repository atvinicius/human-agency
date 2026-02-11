// Parse Vercel AI SDK data stream protocol on the client
// Protocol format: `type:value\n` where type is a single char
// 0 = text delta, e = error, d = done data

/**
 * Read a streaming response from the AI SDK and call onDelta with each text chunk.
 * Returns the full accumulated text when the stream completes.
 *
 * @param {Response} response - Fetch response with streaming body
 * @param {Function} onDelta - Called with each text chunk as it arrives
 * @returns {Promise<string>} Full accumulated text
 */
export async function parseDataStream(response, onDelta) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Process complete lines
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete line in buffer

    for (const line of lines) {
      if (!line.trim()) continue;

      // AI SDK data stream format: `type:payload`
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;

      const type = line.slice(0, colonIdx);
      const payload = line.slice(colonIdx + 1);

      if (type === '0') {
        // Text delta — payload is a JSON-encoded string
        try {
          const text = JSON.parse(payload);
          accumulated += text;
          onDelta(text, accumulated);
        } catch {
          // Not valid JSON, use raw
          accumulated += payload;
          onDelta(payload, accumulated);
        }
      }
      // type 'e' = error, 'd' = finish data — we don't need to handle these
      // since we just accumulate text and parse JSON at the end
    }
  }

  // Process any remaining buffer
  if (buffer.trim()) {
    const colonIdx = buffer.indexOf(':');
    if (colonIdx !== -1) {
      const type = buffer.slice(0, colonIdx);
      const payload = buffer.slice(colonIdx + 1);
      if (type === '0') {
        try {
          const text = JSON.parse(payload);
          accumulated += text;
        } catch {
          accumulated += payload;
        }
      }
    }
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
  // Try to extract JSON from the text
  // The model should return JSON, but sometimes wraps it in markdown code blocks
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
