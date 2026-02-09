import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';

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
    <header className="fixed top-0 left-0 right-0 z-50 px-6 py-6">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <a href="/" className="font-serif text-xl tracking-tight">
          Human Agency
        </a>
        <a
          href="#waitlist"
          className="text-sm text-[#6b6560] hover:text-[#e8e4df] transition-colors btn-minimal"
        >
          Join Waitlist
        </a>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-32">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={stagger}
        className="max-w-3xl mx-auto text-center"
      >
        <motion.p
          variants={fadeUp}
          className="text-[#6b6560] text-sm tracking-widest uppercase mb-8"
        >
          A Manifesto
        </motion.p>

        <motion.h1
          variants={fadeUp}
          className="font-serif text-4xl md:text-6xl lg:text-7xl font-medium leading-tight mb-8 tracking-tight"
        >
          The Economic Case for the Infinite Individual
        </motion.h1>

        <motion.div variants={fadeUp} className="section-divider mx-auto mb-8" />

        <motion.p
          variants={fadeUp}
          className="text-lg md:text-xl text-[#9a948e] leading-relaxed max-w-2xl mx-auto"
        >
          We are witnessing the most violent economic shift in history: the marginal cost of cognitive execution is collapsing to zero.
        </motion.p>

        <motion.div
          variants={fadeUp}
          className="mt-16"
        >
          <a
            href="#manifesto"
            className="inline-flex items-center gap-2 text-[#6b6560] hover:text-[#e8e4df] transition-colors text-sm"
          >
            <span>Read the Manifesto</span>
            <ArrowRight className="w-4 h-4" />
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
      className="py-24 md:py-32 px-6 manifesto-section"
    >
      <div className="max-w-2xl mx-auto">
        <span className="section-number text-lg mb-4 block">{number}</span>
        <h2 className="font-serif text-3xl md:text-4xl font-medium mb-8 tracking-tight text-white">
          {title}
        </h2>
        <div className="space-y-6 text-[#9a948e] text-lg leading-relaxed">
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
        <p className="text-white">
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
        <div className="py-6 space-y-4">
          <p className="text-white">
            <span className="text-[#c9a87c]">AI solves.</span> Humans define <em>what</em> to solve.
          </p>
          <p className="text-white">
            <span className="text-[#c9a87c]">AI explores.</span> Humans define the <em>boundary</em>.
          </p>
          <p className="text-white">
            <span className="text-[#c9a87c]">AI generates.</span> Humans provide the <em>sanction</em>.
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
        <p className="text-white font-serif text-xl md:text-2xl pt-8 italic">
          We do not save labor. We transcend it.
        </p>
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
    <section id="waitlist" className="py-32 px-6">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeUp}
        transition={{ duration: 0.8 }}
        className="max-w-xl mx-auto text-center"
      >
        {!submitted ? (
          <>
            <span className="section-number text-lg mb-4 block">V.</span>
            <h2 className="font-serif text-3xl md:text-4xl font-medium mb-6 tracking-tight text-white">
              Join the Movement
            </h2>
            <p className="text-[#9a948e] text-lg mb-10">
              Be among the first to become a Sovereign Operator.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-6 py-4 bg-transparent border border-[#2a2a2a] text-[#e8e4df] placeholder-[#4a4a4a] text-center text-lg transition-colors"
                required
              />
              <button
                type="submit"
                className="w-full px-6 py-4 bg-[#e8e4df] text-[#0a0a0a] font-medium text-lg hover:bg-white transition-colors flex items-center justify-center gap-2"
              >
                <span>Request Access</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-8"
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-full border border-[#c9a87c] flex items-center justify-center">
              <Check className="w-8 h-8 text-[#c9a87c]" />
            </div>
            <h2 className="font-serif text-2xl mb-4 text-white">You're on the list</h2>
            <p className="text-[#6b6560]">
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
    <footer className="py-16 px-6 border-t border-[#1a1a1a]">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <span className="font-serif text-lg">Human Agency</span>
        <p className="text-[#4a4a4a] text-sm">
          We do not save labor. We transcend it.
        </p>
        <span className="text-[#4a4a4a] text-sm">
          2026
        </span>
      </div>
    </footer>
  );
}

function App() {
  return (
    <div className="relative">
      <Header />
      <Hero />
      <Manifesto />
      <Waitlist />
      <Footer />
    </div>
  );
}

export default App;
