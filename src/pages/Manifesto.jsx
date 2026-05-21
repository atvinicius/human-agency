import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import SiteHeader from '../components/SiteHeader';

const sections = [
  {
    eyebrow: '01',
    title: 'The cost of cognitive execution is falling',
    paragraphs: [
      'For a long time, the amount of useful work a person could produce was constrained by available labor. More research required more analysts. More software required more engineers. More exploration required more hours.',
      'AI changes the shape of that constraint. A single person can now generate drafts, run searches, compare options, write code, summarize documents, and test ideas at a scale that used to require a team.',
      'That does not make the human irrelevant. It changes where the human is most valuable.',
    ],
  },
  {
    eyebrow: '02',
    title: 'The interface has not caught up',
    paragraphs: [
      'Most software still assumes one person using one tool to complete one task. Agentic systems break that pattern. A person may want several agents exploring different hypotheses, checking each other, gathering sources, and converging on a decision.',
      'The problem is not that agents can do too little. The problem is that delegated work quickly becomes hard to supervise. A pile of chats is not an operating model.',
      'The missing layer is an interface for intent, boundaries, evidence, intervention, and review.',
    ],
  },
  {
    eyebrow: '03',
    title: 'The operator becomes the point of leverage',
    paragraphs: [
      'In an AI-heavy workflow, the human should not compete with machines on raw execution. The human should define the mission, set the constraints, decide what is good enough, and remain accountable for the result.',
      'AI can search. The human decides what question is worth searching. AI can generate options. The human decides which tradeoffs are acceptable. AI can produce a report. The human decides whether the evidence is strong enough to act.',
      'Agency is not doing every step by hand. Agency is keeping authorship over direction and judgment when more of the work is delegated.',
    ],
  },
  {
    eyebrow: '04',
    title: 'What Human Agency is building',
    paragraphs: [
      'Human Agency is a mission control surface for delegated AI work. It is meant to help one person launch agent teams, see what they are doing, inspect their sources, interrupt weak paths, and approve the final synthesis.',
      'The product is early, and the first version over-indexed on the drama of the idea. The useful version is more grounded: fewer theatrics, better supervision, clearer reports, and stronger human checkpoints.',
      'The thesis remains simple: as AI makes execution cheaper, the product layer that matters is the one that preserves human direction.',
    ],
  },
];

export default function Manifesto() {
  return (
    <div className="manifesto-page">
      <SiteHeader />
      <main className="manifesto-page__main">
        <article className="manifesto-article">
          <Link to="/" className="manifesto-back-link">
            <ArrowLeft size={17} />
            <span>Back to product</span>
          </Link>

          <header className="manifesto-article__header">
            <p className="product-eyebrow">Essay</p>
            <h1>The Human Agency Manifesto</h1>
            <p>
              A practical thesis for agent orchestration: when AI makes execution abundant, the scarce resource becomes human direction.
            </p>
          </header>

          <div className="manifesto-article__body">
            {sections.map((section) => (
              <section key={section.title} className="manifesto-article__section">
                <span>{section.eyebrow}</span>
                <h2>{section.title}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </section>
            ))}
          </div>

          <footer className="manifesto-article__footer">
            <Link to="/demo" className="product-button product-button--primary">
              <span>Open Mission Control</span>
              <ArrowRight size={18} />
            </Link>
          </footer>
        </article>
      </main>
    </div>
  );
}
