import { describe, it, expect, vi } from 'vitest';
import { shouldCompress, compressContext } from '../contextCompressor';

describe('shouldCompress', () => {
  it('should not compress on iteration 0', () => {
    expect(shouldCompress(0, 10)).toBe(false);
  });

  it('should compress on iteration 3 with enough messages', () => {
    expect(shouldCompress(3, 10)).toBe(true);
  });

  it('should compress on iteration 6 with enough messages', () => {
    expect(shouldCompress(6, 10)).toBe(true);
  });

  it('should not compress on non-multiple-of-3 iterations', () => {
    expect(shouldCompress(1, 10)).toBe(false);
    expect(shouldCompress(2, 10)).toBe(false);
    expect(shouldCompress(4, 10)).toBe(false);
    expect(shouldCompress(5, 10)).toBe(false);
  });

  it('should not compress when message count is too low', () => {
    // WINDOW_SIZE=4, needs > 5 messages
    expect(shouldCompress(3, 5)).toBe(false);
    expect(shouldCompress(3, 4)).toBe(false);
    expect(shouldCompress(3, 3)).toBe(false);
  });

  it('should compress when message count exceeds threshold', () => {
    expect(shouldCompress(3, 6)).toBe(true);
    expect(shouldCompress(3, 20)).toBe(true);
  });
});

describe('compressContext', () => {
  const makeMessages = (count) =>
    Array.from({ length: count }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${i}`,
    }));

  it('should return messages unchanged if within window size', async () => {
    const messages = makeMessages(4);
    const result = await compressContext(messages, 'test objective', vi.fn());
    // Should return same messages since 4 <= WINDOW_SIZE + 1 (5)
    expect(result).toEqual(messages);
  });

  it('should compress when messages exceed window', async () => {
    const messages = makeMessages(8);
    const mockFetch = vi.fn().mockResolvedValue({
      result: { output: 'Summary of earlier work' },
    });

    const result = await compressContext(messages, 'build an app', mockFetch);

    // Should have 1 summary message + last 4 messages = 5
    expect(result).toHaveLength(5);
    expect(result[0].role).toBe('user');
    expect(result[0].content).toContain('Summary of earlier work');
    // Last 4 messages preserved
    expect(result[1].content).toBe('Message 4');
    expect(result[4].content).toBe('Message 7');
  });

  it('should call fetchFn with correct summarizer agent', async () => {
    const messages = makeMessages(8);
    const mockFetch = vi.fn().mockResolvedValue({
      result: { output: 'Summary' },
    });

    await compressContext(messages, 'analyze data', mockFetch);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [agent, msgs] = mockFetch.mock.calls[0];
    expect(agent.role).toBe('synthesizer');
    expect(agent.id).toBe('context-summarizer');
    expect(msgs[0].content).toContain('analyze data');
  });

  it('should fall back to truncation on fetch error', async () => {
    const messages = makeMessages(8);
    const mockFetch = vi.fn().mockRejectedValue(new Error('API error'));

    const result = await compressContext(messages, 'build an app', mockFetch);

    // Should have 1 fallback message + last 4 messages = 5
    expect(result).toHaveLength(5);
    expect(result[0].content).toContain('build an app');
    expect(result[0].content).toContain('Continue your work');
  });

  it('should handle non-string message content', async () => {
    const messages = [
      { role: 'user', content: { type: 'complex', data: [1, 2, 3] } },
      { role: 'assistant', content: 'Response 1' },
      { role: 'user', content: 'Message 2' },
      { role: 'assistant', content: 'Response 2' },
      { role: 'user', content: 'Message 3' },
      { role: 'assistant', content: 'Response 3' },
    ];

    const mockFetch = vi.fn().mockResolvedValue({
      result: { output: 'Summary' },
    });

    const result = await compressContext(messages, 'test', mockFetch);
    expect(result).toHaveLength(5);
  });

  it('should use thinking field as fallback if output is missing', async () => {
    const messages = makeMessages(8);
    const mockFetch = vi.fn().mockResolvedValue({
      result: { thinking: 'Summary via thinking' },
    });

    const result = await compressContext(messages, 'test', mockFetch);
    expect(result[0].content).toContain('Summary via thinking');
  });
});
