// Server-side response parser for agent JSON output
// Mirrors src/services/streamParser.js logic for use in api/ serverless functions

/**
 * Parse agent response text as structured JSON.
 * Handles markdown code blocks and multi-step tool output where
 * intermediate text precedes the final JSON block.
 *
 * @param {string} text - Full text from LLM response
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
export function extractLastJsonObject(text) {
  let depth = 0;
  let end = -1;
  let start = -1;

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
