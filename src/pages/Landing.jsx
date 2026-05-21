import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  GitBranch,
  Network,
  PauseCircle,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import SiteHeader from '../components/SiteHeader';

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const missionRows = [
  { label: 'Coordinator', status: 'Splitting mission', tone: 'gold' },
  { label: 'Researcher', status: 'Checking primary sources', tone: 'blue' },
  { label: 'Validator', status: 'Testing contradictions', tone: 'violet' },
  { label: 'Synthesizer', status: 'Drafting brief', tone: 'green' },
];

const workflowSteps = [
  {
    icon: GitBranch,
    title: 'Plan the mission',
    body: 'Turn a broad objective into specialized agents with clear jobs, scope, and stopping conditions.',
  },
  {
    icon: Network,
    title: 'Watch the work unfold',
    body: 'Follow agent branches, search events, source handoffs, and blockers from one live operating view.',
  },
  {
    icon: ClipboardCheck,
    title: 'Approve the outcome',
    body: 'Review evidence, redirect weak threads, and ship a synthesized report with the human still accountable.',
  },
];

const controlFeatures = [
  {
    icon: PauseCircle,
    title: 'Human checkpoints',
    body: 'Agents can pause for judgment when a tradeoff, missing assumption, or risky claim needs operator input.',
  },
  {
    icon: FileSearch,
    title: 'Evidence-first reports',
    body: 'Outputs collect findings, sources, timelines, and raw notes instead of hiding the work behind a chat answer.',
  },
  {
    icon: ShieldCheck,
    title: 'Bounded autonomy',
    body: 'Spawn limits, mission budgets, and role prompts keep the system oriented around a specific assignment.',
  },
];

const useCases = [
  'Competitive research before a product decision',
  'Technical diligence across unfamiliar markets',
  'Source-backed briefings for strategy work',
  'Exploratory research where the answer is not obvious yet',
];

function MissionControlScene() {
  return (
    <div className="mission-scene" aria-hidden="true">
      <div className="mission-scene__chrome">
        <div className="mission-scene__window-controls">
          <span />
          <span />
          <span />
        </div>
        <div className="mission-scene__title">Mission: Map the AI research tooling market</div>
        <div className="mission-scene__status">7 agents active</div>
      </div>

      <div className="mission-scene__body">
        <div className="mission-scene__panel mission-scene__panel--left">
          <div className="mission-scene__panel-label">Agent queue</div>
          {missionRows.map((row) => (
            <div className="mission-scene__row" key={row.label}>
              <span className={`mission-scene__dot mission-scene__dot--${row.tone}`} />
              <div>
                <strong>{row.label}</strong>
                <span>{row.status}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mission-scene__map">
          <svg className="mission-scene__edges" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M 50 50 L 30 28" />
            <path d="M 50 50 L 70 34" />
            <path d="M 50 50 L 30 76" />
            <path d="M 50 50 L 70 80" />
          </svg>
          <span className="mission-scene__node mission-scene__node--lead">Director</span>
          <span className="mission-scene__node mission-scene__node--research">Source map</span>
          <span className="mission-scene__node mission-scene__node--market">Market scan</span>
          <span className="mission-scene__node mission-scene__node--risk">Risk check</span>
          <span className="mission-scene__node mission-scene__node--brief">Brief</span>
        </div>

        <div className="mission-scene__panel mission-scene__panel--right">
          <div className="mission-scene__panel-label">Needs judgment</div>
          <div className="mission-scene__decision">
            <strong>Choose depth</strong>
            <span>Run another source pass or synthesize now?</span>
          </div>
          <div className="mission-scene__actions">
            <span>Deepen</span>
            <span>Synthesize</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="product-hero">
      <MissionControlScene />

      <motion.div
        className="product-hero__content"
        initial="hidden"
        animate="visible"
        variants={stagger}
      >
        <motion.p variants={fadeUp} className="product-eyebrow">
          Agent orchestration for real work
        </motion.p>
        <motion.h1 variants={fadeUp}>Human Agency</motion.h1>
        <motion.p variants={fadeUp} className="product-hero__lede">
          Mission control for AI teams. Launch parallel agents, inspect their evidence, and step in before important decisions are made.
        </motion.p>
        <motion.div variants={fadeUp} className="product-hero__actions">
          <Link to="/demo" className="product-button product-button--primary">
            <Sparkles size={18} />
            <span>Open Mission Control</span>
          </Link>
          <Link to="/manifesto" className="product-button product-button--secondary">
            <span>Read the thesis</span>
            <ArrowRight size={18} />
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}

function ProofStrip() {
  return (
    <section className="product-proof" aria-label="Product principles">
      <div className="product-proof__item">
        <strong>Parallel by default</strong>
        <span>Specialized agents work separate threads without turning your screen into chat noise.</span>
      </div>
      <div className="product-proof__item">
        <strong>Evidence visible</strong>
        <span>Sources, findings, and contradictions stay attached to the final brief.</span>
      </div>
      <div className="product-proof__item">
        <strong>Human in command</strong>
        <span>The operator sets intent, redirects weak paths, and owns the judgment call.</span>
      </div>
    </section>
  );
}

function Workflow() {
  return (
    <section className="product-section" id="workflow">
      <div className="product-section__intro">
        <p className="product-eyebrow">How it works</p>
        <h2>From objective to reviewed output.</h2>
        <p>
          Human Agency is built around missions, not chat sessions. Each mission has a plan, a live agent map, and a report you can audit.
        </p>
      </div>

      <div className="workflow-grid">
        {workflowSteps.map((step, index) => {
          const Icon = step.icon;
          return (
            <motion.article
              className="workflow-step"
              key={step.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={fadeUp}
              transition={{ delay: index * 0.08 }}
            >
              <div className="workflow-step__icon">
                <Icon size={22} />
              </div>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}

function ControlLayer() {
  return (
    <section className="product-section product-section--split">
      <div className="product-section__intro">
        <p className="product-eyebrow">Control layer</p>
        <h2>The scarce skill is no longer asking once. It is steering the work.</h2>
        <p>
          The product exists for the moment after the first prompt, when useful work needs coordination, comparison, and judgment.
        </p>
      </div>

      <div className="feature-list">
        {controlFeatures.map((feature) => {
          const Icon = feature.icon;
          return (
            <article className="feature-item" key={feature.title}>
              <Icon size={22} />
              <div>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function UseCases() {
  return (
    <section className="product-section product-section--muted">
      <div className="product-section__intro">
        <p className="product-eyebrow">Built for messy research</p>
        <h2>Use it when one answer is not enough.</h2>
      </div>

      <div className="use-case-grid">
        {useCases.map((useCase) => (
          <div className="use-case" key={useCase}>
            <CheckCircle2 size={20} />
            <span>{useCase}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function RequestAccess() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
    }
  };

  return (
    <section className="product-cta" id="access">
      <div className="product-cta__copy">
        <p className="product-eyebrow">Private beta</p>
        <h2>Help shape the next version of Mission Control.</h2>
        <p>
          The current product is an early orchestration prototype. The next version will be rebuilt around fewer gimmicks, clearer supervision, and useful research output.
        </p>
      </div>

      {!submitted ? (
        <form className="access-form" onSubmit={handleSubmit}>
          <label htmlFor="access-email">Work email</label>
          <div className="access-form__row">
            <input
              id="access-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              required
            />
            <button type="submit">
              <span>Request Access</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </form>
      ) : (
        <div className="access-confirmation" role="status">
          <CheckCircle2 size={22} />
          <span>Request received. We will be in touch.</span>
        </div>
      )}
    </section>
  );
}

function Footer() {
  return (
    <footer className="product-footer">
      <span>Human Agency</span>
      <div>
        <Link to="/manifesto">Manifesto</Link>
        <Link to="/demo">Mission Control</Link>
      </div>
    </footer>
  );
}

export default function Landing() {
  return (
    <div className="product-page">
      <SiteHeader />
      <main>
        <Hero />
        <ProofStrip />
        <Workflow />
        <ControlLayer />
        <UseCases />
        <RequestAccess />
      </main>
      <Footer />
    </div>
  );
}
