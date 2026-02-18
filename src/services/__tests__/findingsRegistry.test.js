import { describe, it, expect, beforeEach } from 'vitest';
import { FindingsRegistry } from '../findingsRegistry';

describe('FindingsRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = new FindingsRegistry();
  });

  it('should add findings', () => {
    registry.addFinding('a1', 'Researcher A', 'researcher', 'Found interesting data about topic X');
    expect(registry.findings).toHaveLength(1);
    expect(registry.findings[0].agentName).toBe('Researcher A');
    expect(registry.findings[0].content).toContain('topic X');
  });

  it('should ignore short findings', () => {
    registry.addFinding('a1', 'Agent', 'researcher', 'short');
    expect(registry.findings).toHaveLength(0);
  });

  it('should register completions', () => {
    registry.registerCompletion('a1', 'Final output from agent 1');
    expect(registry.completions['a1']).toBeDefined();
    expect(registry.completions['a1'].output).toBe('Final output from agent 1');
  });

  it('should get child completions', () => {
    registry.registerCompletion('c1', 'Child 1 output');
    registry.registerCompletion('c2', 'Child 2 output');
    registry.registerCompletion('c3', 'Child 3 output');

    const completions = registry.getChildCompletions(['c1', 'c3', 'c99']);
    expect(completions).toHaveLength(2);
    expect(completions[0].agentId).toBe('c1');
    expect(completions[1].agentId).toBe('c3');
  });

  it('should get new completions since timestamp', () => {
    const past = Date.now() - 1000;
    registry.registerCompletion('c1', 'Old output');
    // Backdate c1's completion
    registry.completions['c1'].timestamp = past;

    const mark = Date.now() - 500;
    registry.registerCompletion('c2', 'New output');
    // Ensure c2 is after mark
    registry.completions['c2'].timestamp = mark + 100;

    const newCompletions = registry.getNewCompletionsSince(['c1', 'c2'], mark);
    expect(newCompletions).toHaveLength(1);
    expect(newCompletions[0].agentId).toBe('c2');
  });

  it('should get sibling findings', () => {
    const agents = [
      { id: 'a1', parent_id: 'root' },
      { id: 'a2', parent_id: 'root' },
      { id: 'a3', parent_id: 'root' },
    ];
    registry.addFinding('a2', 'Sibling B', 'researcher', 'Sibling B found something interesting about the topic');
    registry.addFinding('a3', 'Sibling C', 'researcher', 'Sibling C discovered another angle on the problem');

    const siblings = registry.getSiblingFindings('a1', 'root', agents);
    expect(siblings).toHaveLength(2);
    expect(siblings[0]).toContain('Sibling B');
  });

  it('should cap findings at 200', () => {
    for (let i = 0; i < 250; i++) {
      registry.addFinding(`a${i}`, 'Agent', 'researcher', `Finding number ${i} with enough content to pass the length check`);
    }
    expect(registry.findings.length).toBeLessThanOrEqual(200);
  });

  it('should provide summary', () => {
    registry.addFinding('a1', 'Agent A', 'researcher', 'First finding with substantial content for the summary');
    registry.addFinding('a2', 'Agent B', 'researcher', 'Second finding with substantial content for the summary');
    registry.registerCompletion('a1', 'Done');

    const summary = registry.getSummary();
    expect(summary.totalFindings).toBe(2);
    expect(summary.totalCompletions).toBe(1);
    expect(summary.recentFindings).toHaveLength(2);
  });

  it('should reset', () => {
    registry.addFinding('a1', 'Agent', 'researcher', 'Some substantial finding content here');
    registry.registerCompletion('a1', 'Output');
    registry.reset();

    expect(registry.findings).toHaveLength(0);
    expect(Object.keys(registry.completions)).toHaveLength(0);
  });
});
