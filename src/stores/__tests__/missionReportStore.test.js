import { describe, it, expect, beforeEach } from 'vitest';
import { useMissionReportStore } from '../missionReportStore';

describe('missionReportStore', () => {
  beforeEach(() => {
    useMissionReportStore.getState().reset();
  });

  it('should start with empty state', () => {
    const state = useMissionReportStore.getState();
    expect(state.sections).toHaveLength(0);
    expect(state.synthesis).toBe('');
    expect(state.status).toBe('building');
  });

  it('should add sections', () => {
    useMissionReportStore.getState().addSection({
      agentId: 'a1',
      agentName: 'Researcher A',
      role: 'researcher',
      content: 'Some research findings',
    });

    const state = useMissionReportStore.getState();
    expect(state.sections).toHaveLength(1);
    expect(state.sections[0].agentName).toBe('Researcher A');
    expect(state.sections[0].type).toBe('output');
  });

  it('should add artifact sections', () => {
    useMissionReportStore.getState().addSection({
      agentId: 'a1',
      agentName: 'Writer',
      role: 'executor',
      title: 'Draft Report',
      content: 'Report content here',
      type: 'artifact',
    });

    const artifacts = useMissionReportStore.getState().getArtifacts();
    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].title).toBe('Draft Report');
  });

  it('should set synthesis and status to complete', () => {
    useMissionReportStore.getState().setSynthesis('# Final Report\nAll findings compiled.');

    const state = useMissionReportStore.getState();
    expect(state.synthesis).toContain('Final Report');
    expect(state.status).toBe('complete');
  });

  it('should get sections grouped by role', () => {
    useMissionReportStore.getState().addSection({
      agentId: 'a1', agentName: 'R1', role: 'researcher', content: 'Finding 1',
    });
    useMissionReportStore.getState().addSection({
      agentId: 'a2', agentName: 'R2', role: 'researcher', content: 'Finding 2',
    });
    useMissionReportStore.getState().addSection({
      agentId: 'a3', agentName: 'V1', role: 'validator', content: 'Validation',
    });

    const grouped = useMissionReportStore.getState().getSectionsByRole();
    expect(grouped.researcher).toHaveLength(2);
    expect(grouped.validator).toHaveLength(1);
  });

  it('should reset state', () => {
    useMissionReportStore.getState().addSection({
      agentId: 'a1', agentName: 'Agent', role: 'researcher', content: 'Data',
    });
    useMissionReportStore.getState().setSynthesis('Synthesis');
    useMissionReportStore.getState().reset();

    const state = useMissionReportStore.getState();
    expect(state.sections).toHaveLength(0);
    expect(state.synthesis).toBe('');
    expect(state.status).toBe('building');
  });

  it('should set status independently', () => {
    useMissionReportStore.getState().setStatus('synthesizing');
    expect(useMissionReportStore.getState().status).toBe('synthesizing');
  });

  it('should stringify non-string content', () => {
    useMissionReportStore.getState().addSection({
      agentId: 'a1',
      agentName: 'Agent',
      role: 'researcher',
      content: { key: 'value', nested: { data: true } },
    });

    const section = useMissionReportStore.getState().sections[0];
    expect(typeof section.content).toBe('string');
    expect(section.content).toContain('key');
  });
});
