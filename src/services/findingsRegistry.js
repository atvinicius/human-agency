// FindingsRegistry — Per-session in-memory store for inter-agent collaboration
// Tracks findings, completions, and enables context sharing between agents

export class FindingsRegistry {
  constructor() {
    this.findings = [];
    this.completions = {};
    this._nextId = 1;
  }

  addFinding(agentId, name, role, content) {
    if (!content || content.length < 10) return;
    this.findings.push({
      id: this._nextId++,
      agentId,
      agentName: name,
      agentRole: role,
      content: typeof content === 'string' ? content : JSON.stringify(content),
      timestamp: Date.now(),
    });
    // Cap at 200 findings
    if (this.findings.length > 200) {
      this.findings = this.findings.slice(-200);
    }
  }

  registerCompletion(agentId, output) {
    this.completions[agentId] = {
      output: typeof output === 'string' ? output : JSON.stringify(output),
      timestamp: Date.now(),
    };
  }

  getChildCompletions(childIds) {
    if (!childIds || childIds.length === 0) return [];
    return childIds
      .filter((id) => this.completions[id])
      .map((id) => ({
        agentId: id,
        ...this.completions[id],
      }));
  }

  getNewCompletionsSince(childIds, sinceTimestamp) {
    if (!childIds || childIds.length === 0) return [];
    return childIds
      .filter((id) => this.completions[id] && this.completions[id].timestamp > sinceTimestamp)
      .map((id) => ({
        agentId: id,
        ...this.completions[id],
      }));
  }

  getSiblingFindings(agentId, parentId, agents) {
    if (!parentId) return [];
    const siblings = agents
      .filter((a) => (a.parent_id === parentId || a.parentId === parentId) && a.id !== agentId);
    const siblingIds = new Set(siblings.map((s) => s.id));
    return this.findings
      .filter((f) => siblingIds.has(f.agentId))
      .slice(-5) // Last 5 sibling findings
      .map((f) => `${f.agentName}: ${f.content.slice(0, 200)}`);
  }

  getSummary() {
    const totalFindings = this.findings.length;
    const totalCompletions = Object.keys(this.completions).length;
    const recentFindings = this.findings.slice(-3).map(
      (f) => `[${f.agentName}] ${f.content.slice(0, 100)}`
    );
    return {
      totalFindings,
      totalCompletions,
      recentFindings,
    };
  }

  reset() {
    this.findings = [];
    this.completions = {};
    this._nextId = 1;
  }
}
