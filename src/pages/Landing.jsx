import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Play } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 }
};

const stagger = {
  visible: {
    transition: {
      staggerChildren: 0.15
    }
  }
};

function Header() {
  return (
    <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, padding: '1.5rem' }}>
      <div style={{ maxWidth: '56rem', marginLeft: 'auto', marginRight: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" className="font-serif" style={{ fontSize: '1.25rem', letterSpacing: '-0.025em', color: 'var(--theme-text-primary)', textDecoration: 'none' }}>
          Human Agency
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Link
            to="/demo"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              color: 'var(--theme-accent)',
              textDecoration: 'none',
              transition: 'color 0.3s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--theme-text-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--theme-accent)'}
          >
            <Play size={14} />
            Try Demo
          </Link>
          <a
            href="#waitlist"
            className="btn-minimal"
            style={{ fontSize: '0.875rem', color: 'var(--theme-text-muted)', textDecoration: 'none', transition: 'color 0.3s' }}
            onMouseEnter={(e) => e.target.style.color = 'var(--theme-text-primary)'}
            onMouseLeave={(e) => e.target.style.color = 'var(--theme-text-muted)'}
          >
            Join Waitlist
          </a>
          <ThemeToggle size="small" />
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6rem 1.5rem 8rem' }}>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={stagger}
        style={{ maxWidth: '48rem', marginLeft: 'auto', marginRight: 'auto', textAlign: 'center', width: '100%' }}
      >
        <motion.p
          variants={fadeUp}
          style={{ color: 'var(--theme-text-muted)', fontSize: '0.875rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '2rem' }}
        >
          A Manifesto
        </motion.p>

        <motion.h1
          variants={fadeUp}
          className="font-serif"
          style={{ fontSize: 'clamp(2rem, 8vw, 4.5rem)', fontWeight: 500, lineHeight: 1.1, marginBottom: '2rem', letterSpacing: '-0.025em', color: 'var(--theme-text-primary)' }}
        >
          The Economic Case for the Infinite Individual
        </motion.h1>

        <motion.div
          variants={fadeUp}
          className="section-divider"
          style={{ marginLeft: 'auto', marginRight: 'auto', marginBottom: '2rem' }}
        />

        <motion.p
          variants={fadeUp}
          style={{ fontSize: 'clamp(1rem, 3vw, 1.25rem)', color: 'var(--theme-text-secondary)', lineHeight: 1.7, maxWidth: '42rem', marginLeft: 'auto', marginRight: 'auto' }}
        >
          We are witnessing the most violent economic shift in history: the marginal cost of cognitive execution is collapsing to zero.
        </motion.p>

        <motion.div
          variants={fadeUp}
          style={{ marginTop: '3rem' }}
        >
          <a
            href="#manifesto"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--theme-text-muted)', fontSize: '0.875rem', textDecoration: 'none', transition: 'color 0.3s' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--theme-text-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--theme-text-muted)'}
          >
            <span>Read the Manifesto</span>
            <ArrowRight style={{ width: '1rem', height: '1rem' }} />
          </a>
        </motion.div>
      </motion.div>
    </section>
  );
}

function ManifestoSection({ number, title, children, id }) {
  return (
    <motion.section
      id={id}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={fadeUp}
      transition={{ duration: 0.8 }}
      className="manifesto-section"
      style={{ padding: 'clamp(4rem, 10vw, 8rem) 1.5rem' }}
    >
      <div style={{ maxWidth: '42rem', marginLeft: 'auto', marginRight: 'auto', width: '100%' }}>
        <span className="section-number" style={{ fontSize: '1.125rem', marginBottom: '1rem', display: 'block' }}>{number}</span>
        <h2 className="font-serif" style={{ fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', fontWeight: 500, marginBottom: '2rem', letterSpacing: '-0.025em', color: 'var(--theme-text-primary)' }}>
          {title}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', color: 'var(--theme-text-secondary)', fontSize: '1.125rem', lineHeight: 1.8 }}>
          {children}
        </div>
      </div>
    </motion.section>
  );
}

function Manifesto() {
  return (
    <div id="manifesto">
      <ManifestoSection number="I." title="The Zero-Cost Axiom">
        <p>
          For centuries, value was constrained by labor. To build more software, you needed more engineers. To close more deals, you needed more associates. Human intelligence was the bottleneck.
        </p>
        <p>
          That era is over.
        </p>
        <p>
          With the rise of generative models and autonomous agents, intelligence has become a commodity—<strong>abundant, instant, and infinitely scalable</strong>.
        </p>
      </ManifestoSection>

      <ManifestoSection number="II." title="The Ratio Crisis">
        <p>
          The prevailing fear is that AI will replace humans. This is a category error. AI does not replace the human; it replaces the <strong>constraint</strong> on the human.
        </p>
        <p>
          However, we face a critical breaking point: <strong>The Interface Gap</strong>.
        </p>
        <p>
          Current software is designed for a <strong>1:1 Ratio</strong>—one human using one tool to do one task. The future demands a <strong>1:1,000,000 Ratio</strong>—one human directing a swarm of one million agents.
        </p>
        <p>
          Today, if a human tries to manage 100 AI agents, they drown in noise. We lack the orchestration layer to wield the power we have created.
        </p>
        <p style={{ color: 'var(--theme-text-primary)' }}>
          Without this layer, human value collapses. With it, human value becomes infinite.
        </p>
      </ManifestoSection>

      <ManifestoSection number="III." title="The Sovereign Operator">
        <p>
          We reject the pessimism of "post-labor" obsolescence. We believe in the rise of the <strong>Sovereign Operator</strong>.
        </p>
        <p>
          In this new economy, the human does not compete with the machine on execution—writing code, analyzing data, generating pixels. The human monopolizes <strong>Intent</strong> and <strong>Judgment</strong>.
        </p>
        <div style={{ padding: '1.5rem 0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ color: 'var(--theme-text-primary)' }}>
            <span style={{ color: 'var(--theme-accent)' }}>AI solves.</span> Humans define <em>what</em> to solve.
          </p>
          <p style={{ color: 'var(--theme-text-primary)' }}>
            <span style={{ color: 'var(--theme-accent)' }}>AI explores.</span> Humans define the <em>boundary</em>.
          </p>
          <p style={{ color: 'var(--theme-text-primary)' }}>
            <span style={{ color: 'var(--theme-accent)' }}>AI generates.</span> Humans provide the <em>sanction</em>.
          </p>
        </div>
        <p>
          The value of the future worker is not defined by their output, but by their <strong>leverage</strong>. The junior engineer of 2026 must have the output capacity of the entire engineering department of 2024.
        </p>
      </ManifestoSection>

      <ManifestoSection number="IV." title="What We Are Building">
        <p>
          <strong>Human Agency</strong> is the operating system for this new scale.
        </p>
        <p>
          We are not building another chatbot. We are building the <strong>Orchestration Layer</strong> that allows a single human mind to drive an army of synthetic workers.
        </p>
        <p>
          We are building the infrastructure that validates, aggregates, and directs AI labor, ensuring that as the leverage of the machine approaches infinity, the agency of the human remains absolute.
        </p>
        <p className="font-serif" style={{ color: 'var(--theme-text-primary)', fontSize: 'clamp(1.25rem, 4vw, 1.5rem)', paddingTop: '2rem', fontStyle: 'italic' }}>
          The era of the infinite individual.
        </p>
        <div style={{ paddingTop: '3rem' }}>
          <Link
            to="/demo"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '1rem 2rem',
              background: 'var(--theme-accent)',
              color: 'var(--theme-accent-text)',
              textDecoration: 'none',
              fontWeight: 500,
              fontSize: '1rem',
              transition: 'all 0.3s',
              borderRadius: '2px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--theme-accent-hover)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--theme-accent)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <Play size={18} />
            See How It Works
          </Link>
        </div>
      </ManifestoSection>
    </div>
  );
}

function Waitlist() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
      console.log('Email submitted:', email);
    }
  };

  return (
    <section id="waitlist" style={{ padding: '8rem 1.5rem' }}>
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeUp}
        transition={{ duration: 0.8 }}
        style={{ maxWidth: '32rem', marginLeft: 'auto', marginRight: 'auto', textAlign: 'center', width: '100%' }}
      >
        {!submitted ? (
          <>
            <span className="section-number" style={{ fontSize: '1.125rem', marginBottom: '1rem', display: 'block' }}>V.</span>
            <h2 className="font-serif" style={{ fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', fontWeight: 500, marginBottom: '1.5rem', letterSpacing: '-0.025em', color: 'var(--theme-text-primary)' }}>
              Join the Movement
            </h2>
            <p style={{ color: 'var(--theme-text-secondary)', fontSize: '1.125rem', marginBottom: '2.5rem' }}>
              Be among the first to become a Sovereign Operator.
            </p>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                style={{
                  width: '100%',
                  padding: '1rem 1.5rem',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--theme-border)',
                  color: 'var(--theme-text-primary)',
                  textAlign: 'center',
                  fontSize: '1.125rem',
                  transition: 'border-color 0.3s'
                }}
              />
              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '1rem 1.5rem',
                  backgroundColor: 'var(--theme-text-primary)',
                  color: 'var(--theme-bg)',
                  fontWeight: 500,
                  fontSize: '1.125rem',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'opacity 0.3s'
                }}
                onMouseEnter={(e) => e.target.style.opacity = '0.9'}
                onMouseLeave={(e) => e.target.style.opacity = '1'}
              >
                <span>Request Access</span>
                <ArrowRight style={{ width: '1.25rem', height: '1.25rem' }} />
              </button>
            </form>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ padding: '2rem 0' }}
          >
            <div style={{
              width: '4rem',
              height: '4rem',
              marginLeft: 'auto',
              marginRight: 'auto',
              marginBottom: '1.5rem',
              borderRadius: '50%',
              border: '1px solid var(--theme-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Check style={{ width: '2rem', height: '2rem', color: 'var(--theme-accent)' }} />
            </div>
            <h2 className="font-serif" style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--theme-text-primary)' }}>You're on the list</h2>
            <p style={{ color: 'var(--theme-text-muted)' }}>
              We'll be in touch.
            </p>
          </motion.div>
        )}
      </motion.div>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{ padding: '4rem 1.5rem', borderTop: '1px solid var(--theme-grid)' }}>
      <div style={{
        maxWidth: '56rem',
        marginLeft: 'auto',
        marginRight: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.5rem'
      }}>
        <span className="font-serif" style={{ fontSize: '1.125rem', color: 'var(--theme-text-primary)' }}>Human Agency</span>
        <p style={{ color: 'var(--theme-text-muted)', fontSize: '0.875rem' }}>
          The era of the infinite individual.
        </p>
        <span style={{ color: 'var(--theme-text-muted)', fontSize: '0.875rem' }}>
          2026
        </span>
      </div>
    </footer>
  );
}

export default function Landing() {
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <Header />
      <Hero />
      <Manifesto />
      <Waitlist />
      <Footer />
    </div>
  );
}
