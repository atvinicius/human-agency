import { describe, it, expect } from 'vitest';
import { parseAgentResponse } from '../streamParser';

describe('parseAgentResponse', () => {
  it('should parse valid JSON', () => {
    const input = JSON.stringify({
      thinking: 'Analyzing data',
      activity: 'Researching',
      progress_delta: 10,
      output: 'Found results',
      complete: false,
    });

    const result = parseAgentResponse(input);
    expect(result.thinking).toBe('Analyzing data');
    expect(result.activity).toBe('Researching');
    expect(result.progress_delta).toBe(10);
    expect(result.output).toBe('Found results');
    expect(result.complete).toBe(false);
  });

  it('should strip markdown code blocks (json)', () => {
    const json = { thinking: 'test', output: 'hello' };
    const input = '```json\n' + JSON.stringify(json) + '\n```';

    const result = parseAgentResponse(input);
    expect(result.thinking).toBe('test');
    expect(result.output).toBe('hello');
  });

  it('should strip markdown code blocks (no language tag)', () => {
    const json = { thinking: 'test', output: 'hello' };
    const input = '```\n' + JSON.stringify(json) + '\n```';

    const result = parseAgentResponse(input);
    expect(result.thinking).toBe('test');
    expect(result.output).toBe('hello');
  });

  it('should return fallback for invalid JSON', () => {
    const result = parseAgentResponse('This is not JSON at all');
    expect(result.thinking).toBe('Processing...');
    expect(result.activity).toBe('Working on objective');
    expect(result.progress_delta).toBe(5);
    expect(result.output).toBe('This is not JSON at all');
    expect(result.complete).toBe(false);
  });

  it('should handle empty string', () => {
    const result = parseAgentResponse('');
    expect(result.output).toBe('');
    expect(result.complete).toBe(false);
  });

  it('should handle whitespace-padded JSON', () => {
    const json = { thinking: 'padded', output: 'result' };
    const input = '  \n' + JSON.stringify(json) + '\n  ';

    const result = parseAgentResponse(input);
    expect(result.thinking).toBe('padded');
  });

  it('should handle JSON with nested objects', () => {
    const input = JSON.stringify({
      thinking: 'Processing',
      output: { key: 'value', nested: { deep: true } },
      complete: true,
    });

    const result = parseAgentResponse(input);
    expect(result.output.key).toBe('value');
    expect(result.output.nested.deep).toBe(true);
    expect(result.complete).toBe(true);
  });

  it('should handle JSON with spawn_agents array', () => {
    const input = JSON.stringify({
      thinking: 'Need more agents',
      activity: 'Spawning',
      progress_delta: 5,
      output: 'Delegating tasks',
      spawn_agents: [
        { role: 'researcher', name: 'Data Analyst', objective: 'Analyze data' },
        { role: 'executor', name: 'Writer', objective: 'Write report' },
      ],
      complete: false,
    });

    const result = parseAgentResponse(input);
    expect(result.spawn_agents).toHaveLength(2);
    expect(result.spawn_agents[0].role).toBe('researcher');
    expect(result.spawn_agents[1].name).toBe('Writer');
  });
});
