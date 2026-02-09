import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Zap,
  Target,
  ArrowRight,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  Cpu,
  BrainCircuit,
  Workflow,
  Sparkles
} from 'lucide-react';

// Hero Section
function Hero() {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-6 pt-20 pb-32 relative">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center max-w-5xl"
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-sm mb-8"
        >
          <Sparkles className="w-4 h-4" />
          <span>The Operating System for the AI Age</span>
        </motion.div>

        {/* Main Headline */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight">
          <span className="text-white">One Human.</span>
          <br />
          <span className="bg-gradient-to-r from-indigo-400 via-cyan-400 to-orange-400 bg-clip-text text-transparent glow-text">
            One Million Agents.
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-12 leading-relaxed">
          The interface gap is the bottleneck. We&apos;re building the <span className="text-white font-semibold">orchestration layer</span> that transforms humans from bottlenecks into <span className="text-indigo-400 font-semibold">Sovereign Operators</span>.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <motion.a
            href="#demo"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-xl text-white font-semibold text-lg flex items-center gap-2 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-shadow"
          >
            <Play className="w-5 h-5" />
            See the Demo
          </motion.a>
          <motion.a
            href="#waitlist"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            className="px-8 py-4 bg-white/5 border border-white/20 rounded-xl text-white font-semibold text-lg hover:bg-white/10 transition-colors"
          >
            Join the Waitlist
          </motion.a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
          {[
            { label: 'Current Ratio', value: '1:1', desc: 'One human, one tool' },
            { label: 'Interface Gap', value: '→', desc: 'The bottleneck' },
            { label: 'Target Ratio', value: '1:1M', desc: 'One human, million agents' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="text-center"
            >
              <div className="text-3xl md:text-4xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
              <div className="text-xs text-gray-600">{stat.desc}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

// Problem Section
function Problem() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            AI didn&apos;t replace humans.
            <br />
            <span className="text-gray-500">It broke the interface.</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            The marginal cost of cognitive execution collapsed to zero. But without the right orchestration layer, humans drown in noise trying to manage AI swarms.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: Clock,
              title: "The Old World",
              desc: "Output was constrained by labor. To build more, you needed more people. Human intelligence was the bottleneck.",
              color: "text-gray-500",
            },
            {
              icon: Zap,
              title: "The Shift",
              desc: "Intelligence became a commodity—abundant, instant, infinitely scalable. But interfaces stayed at 1:1.",
              color: "text-orange-400",
            },
            {
              icon: BrainCircuit,
              title: "The Gap",
              desc: "Today's tools can't bridge the ratio. A human managing 100 agents drowns. We lack the orchestration layer.",
              color: "text-indigo-400",
            },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="animated-border p-8"
            >
              <item.icon className={`w-12 h-12 ${item.color} mb-4`} />
              <h3 className="text-2xl font-bold mb-3">{item.title}</h3>
              <p className="text-gray-400">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Interactive Demo Section
function Demo() {
  const [isRunning, setIsRunning] = useState(false);
  const [agents, setAgents] = useState([]);
  const [completedTasks, setCompletedTasks] = useState(0);
  const [humanIntent, setHumanIntent] = useState('');
  const [currentPhase, setCurrentPhase] = useState('idle');

  const intents = [
    "Analyze market for AI orchestration tools",
    "Build landing page with React + Tailwind",
    "Research competitor pricing models",
    "Draft investor pitch deck",
    "Set up CI/CD pipeline",
  ];

  const agentTypes = [
    { type: 'research', color: '#06b6d4', label: 'Research' },
    { type: 'build', color: '#6366f1', label: 'Build' },
    { type: 'analyze', color: '#f97316', label: 'Analyze' },
    { type: 'write', color: '#10b981', label: 'Write' },
    { type: 'test', color: '#ec4899', label: 'Test' },
  ];

  const resetDemo = useCallback(() => {
    setIsRunning(false);
    setAgents([]);
    setCompletedTasks(0);
    setHumanIntent('');
    setCurrentPhase('idle');
  }, []);

  const runDemo = useCallback(() => {
    resetDemo();
    setIsRunning(true);
    setCurrentPhase('intent');

    // Phase 1: Human provides intent
    setTimeout(() => {
      setHumanIntent(intents[Math.floor(Math.random() * intents.length)]);
      setCurrentPhase('spawning');

      // Phase 2: Spawn agents
      const numAgents = 15 + Math.floor(Math.random() * 10);
      const spawnInterval = setInterval(() => {
        setAgents(prev => {
          if (prev.length >= numAgents) {
            clearInterval(spawnInterval);
            setCurrentPhase('working');
            return prev;
          }
          const agentType = agentTypes[Math.floor(Math.random() * agentTypes.length)];
          return [...prev, {
            id: Date.now() + Math.random(),
            ...agentType,
            x: 20 + Math.random() * 60,
            y: 20 + Math.random() * 60,
            status: 'working',
            progress: 0,
          }];
        });
      }, 100);

      // Phase 3: Agents work and complete
      setTimeout(() => {
        setCurrentPhase('completing');
        const completeInterval = setInterval(() => {
          setAgents(prev => {
            const working = prev.filter(a => a.status === 'working');
            if (working.length === 0) {
              clearInterval(completeInterval);
              setCurrentPhase('done');
              setIsRunning(false);
              return prev;
            }
            const toComplete = working[Math.floor(Math.random() * working.length)];
            setCompletedTasks(c => c + 1);
            return prev.map(a =>
              a.id === toComplete.id ? { ...a, status: 'complete' } : a
            );
          });
        }, 200);
      }, 2000);
    }, 1000);
  }, [resetDemo]);

  return (
    <section id="demo" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            The <span className="text-indigo-400">Orchestration Layer</span> in Action
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Watch how a single human intent spawns, directs, and aggregates an army of AI agents.
          </p>
        </motion.div>

        {/* Demo Container */}
        <div className="animated-border p-1">
          <div className="bg-[#0d0d15] rounded-2xl overflow-hidden">
            {/* Demo Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <span className="text-gray-400 text-sm">Human Agency — Orchestration Demo</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">
                  Phase: <span className="text-indigo-400 capitalize">{currentPhase}</span>
                </span>
                {!isRunning ? (
                  <button
                    onClick={runDemo}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white text-sm font-medium transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Run Demo
                  </button>
                ) : (
                  <button
                    onClick={resetDemo}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm font-medium transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Demo Content */}
            <div className="grid lg:grid-cols-3 gap-0">
              {/* Left Panel - Human Intent */}
              <div className="p-6 border-r border-white/10">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-semibold">Human Intent</h3>
                </div>
                <div className="min-h-[100px] p-4 rounded-lg bg-white/5 border border-white/10">
                  <AnimatePresence mode="wait">
                    {humanIntent ? (
                      <motion.div
                        key="intent"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-white"
                      >
                        <span className="text-indigo-400 font-mono text-sm">{">"}</span>
                        <span className="ml-2">{humanIntent}</span>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="placeholder"
                        className="text-gray-600 text-sm"
                      >
                        Click &quot;Run Demo&quot; to provide intent...
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Stats */}
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-white/5">
                    <div className="text-2xl font-bold text-indigo-400">{agents.length}</div>
                    <div className="text-xs text-gray-500">Active Agents</div>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5">
                    <div className="text-2xl font-bold text-green-400">{completedTasks}</div>
                    <div className="text-xs text-gray-500">Completed</div>
                  </div>
                </div>

                {/* Agent Legend */}
                <div className="mt-6">
                  <div className="text-xs text-gray-500 mb-2">Agent Types</div>
                  <div className="flex flex-wrap gap-2">
                    {agentTypes.map(t => (
                      <div key={t.type} className="flex items-center gap-1">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: t.color }}
                        ></div>
                        <span className="text-xs text-gray-400">{t.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Center Panel - Agent Swarm Visualization */}
              <div className="p-6 min-h-[400px] relative">
                <div className="flex items-center gap-2 mb-4">
                  <Cpu className="w-5 h-5 text-cyan-400" />
                  <h3 className="font-semibold">Agent Swarm</h3>
                </div>
                <div className="relative h-[320px] rounded-lg bg-white/5 border border-white/10 overflow-hidden grid-pattern">
                  {/* Central Human Node */}
                  <motion.div
                    animate={{ scale: isRunning ? [1, 1.1, 1] : 1 }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/50 z-10"
                  >
                    <Users className="w-8 h-8 text-white" />
                  </motion.div>

                  {/* Connection Lines */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    {agents.map(agent => (
                      <motion.line
                        key={`line-${agent.id}`}
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: agent.status === 'complete' ? 0.1 : 0.3 }}
                        x1="50%"
                        y1="50%"
                        x2={`${agent.x}%`}
                        y2={`${agent.y}%`}
                        stroke={agent.color}
                        strokeWidth="1"
                        strokeDasharray={agent.status === 'working' ? "4 4" : "none"}
                      />
                    ))}
                  </svg>

                  {/* Agent Nodes */}
                  <AnimatePresence>
                    {agents.map(agent => (
                      <motion.div
                        key={agent.id}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{
                          scale: 1,
                          opacity: 1,
                          x: agent.status === 'working' ? [0, 3, -3, 0] : 0,
                        }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{
                          x: { repeat: Infinity, duration: 0.5 },
                        }}
                        className="absolute agent-node"
                        style={{
                          left: `${agent.x}%`,
                          top: `${agent.y}%`,
                          transform: 'translate(-50%, -50%)',
                        }}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${agent.status === 'complete' ? 'bg-green-500/20' : ''}`}
                          style={{
                            backgroundColor: agent.status === 'complete' ? undefined : `${agent.color}20`,
                            border: `2px solid ${agent.status === 'complete' ? '#10b981' : agent.color}`,
                          }}
                        >
                          {agent.status === 'complete' ? (
                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                          ) : (
                            <Cpu className="w-4 h-4" style={{ color: agent.color }} />
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              {/* Right Panel - Output Aggregation */}
              <div className="p-6 border-l border-white/10">
                <div className="flex items-center gap-2 mb-4">
                  <Workflow className="w-5 h-5 text-orange-400" />
                  <h3 className="font-semibold">Aggregated Output</h3>
                </div>
                <div className="space-y-3 max-h-[350px] overflow-y-auto">
                  <AnimatePresence>
                    {currentPhase === 'done' && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-lg bg-green-500/10 border border-green-500/30"
                      >
                        <div className="flex items-center gap-2 text-green-400 font-semibold mb-2">
                          <CheckCircle2 className="w-5 h-5" />
                          Task Complete
                        </div>
                        <p className="text-sm text-gray-400">
                          {agents.length} agents coordinated, {completedTasks} subtasks completed. Results synthesized and ready for human review.
                        </p>
                      </motion.div>
                    )}
                    {agents.filter(a => a.status === 'complete').slice(-5).reverse().map((agent) => (
                      <motion.div
                        key={agent.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-3 rounded-lg bg-white/5 border border-white/10"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: agent.color }}
                          ></div>
                          <span className="text-xs font-medium" style={{ color: agent.color }}>
                            {agent.label} Agent
                          </span>
                          <CheckCircle2 className="w-3 h-3 text-green-400 ml-auto" />
                        </div>
                        <p className="text-xs text-gray-500">
                          Subtask completed. Output aggregated.
                        </p>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {agents.length === 0 && (
                    <div className="text-gray-600 text-sm text-center py-8">
                      Agent outputs will appear here...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Solution Section
function Solution() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            The <span className="text-cyan-400">Sovereign Operator</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            In the new economy, the human doesn&apos;t compete with machines on execution. The human monopolizes <span className="text-white font-semibold">Intent</span> and <span className="text-white font-semibold">Judgment</span>.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {[
            {
              icon: Target,
              title: "AI Solves",
              human: "Humans define what to solve",
              color: "indigo",
            },
            {
              icon: Zap,
              title: "AI Explores",
              human: "Humans define the boundary",
              color: "cyan",
            },
            {
              icon: CheckCircle2,
              title: "AI Generates",
              human: "Humans provide the sanction",
              color: "orange",
            },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center p-8"
            >
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6`}
                style={{ backgroundColor: item.color === 'indigo' ? 'rgba(99, 102, 241, 0.2)' : item.color === 'cyan' ? 'rgba(6, 182, 212, 0.2)' : 'rgba(249, 115, 22, 0.2)' }}
              >
                <item.icon className="w-8 h-8" style={{ color: item.color === 'indigo' ? '#6366f1' : item.color === 'cyan' ? '#06b6d4' : '#f97316' }} />
              </div>
              <h3 className="text-2xl font-bold mb-2">{item.title}</h3>
              <p className="text-gray-400">{item.human}</p>
            </motion.div>
          ))}
        </div>

        {/* Key Quote */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="animated-border p-8 md:p-12 text-center"
        >
          <blockquote className="text-2xl md:text-3xl font-medium text-white mb-4">
            &quot;The junior engineer of 2026 must have the output capacity of the entire engineering department of 2024.&quot;
          </blockquote>
          <p className="text-gray-500">— The Human Agency Manifesto</p>
        </motion.div>
      </div>
    </section>
  );
}

// Waitlist Section
function Waitlist() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
      // In production, you'd send this to your backend
      console.log('Email submitted:', email);
    }
  };

  return (
    <section id="waitlist" className="py-24 px-6">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="animated-border p-8 md:p-12 text-center"
        >
          {!submitted ? (
            <>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Become a <span className="text-indigo-400">Sovereign Operator</span>
              </h2>
              <p className="text-xl text-gray-400 mb-8">
                Join the waitlist for early access to the orchestration layer.
              </p>
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="flex-1 px-6 py-4 rounded-xl bg-white/5 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  required
                />
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-xl text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30"
                >
                  Join Waitlist
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </form>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-6" />
              <h2 className="text-3xl font-bold mb-4">You&apos;re on the list!</h2>
              <p className="text-gray-400">
                We&apos;ll be in touch soon. Get ready to transcend labor.
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  );
}

// Footer
function Footer() {
  return (
    <footer className="py-12 px-6 border-t border-white/10">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl">Human Agency</span>
        </div>
        <p className="text-gray-500 text-sm">
          We do not save labor. We transcend it.
        </p>
        <div className="text-gray-600 text-sm">
          © 2026 Human Agency. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

// Main App
function App() {
  return (
    <div className="relative">
      {/* Background */}
      <div className="gradient-bg"></div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Users className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl">Human Agency</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#demo" className="text-gray-400 hover:text-white transition-colors">Demo</a>
            <a href="#waitlist" className="text-gray-400 hover:text-white transition-colors">Waitlist</a>
          </div>
          <a
            href="#waitlist"
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm font-medium transition-colors"
          >
            Get Early Access
          </a>
        </div>
      </nav>

      {/* Sections */}
      <Hero />
      <Problem />
      <Demo />
      <Solution />
      <Waitlist />
      <Footer />
    </div>
  );
}

export default App;
