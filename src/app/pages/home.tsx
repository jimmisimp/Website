import { memo } from 'react';
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';
import { Link } from 'react-router-dom';

const background = [
  'My mix of design and engineering skills give me a wide-ranging perspective that few others can claim. At Comcast, my journey took me from senior UX designer on our chat and voice apps, to product engineer for our universal AI assistant.',
];

const capabilities = [
  {
    title: 'Ask Me Anything',
    role: 'UX Design',
    body:
      'Working with the Machine Learning team, I designed the interface for a RAG-based knowledge tool running on [[gpt-3.5-turbo]], which quickly became one of the most widely praised tools amongst customer service agents.',
  },
  {
    title: 'Auto-Enhance',
    role: 'Design & Prototyping',
    body:
      'To improve the quality of our chat users\' messages, we integrated [[gpt-4o-mini]] to automatically "enhance" their grammer and spelling. It currently improves the quality of over 1 million messages per month.',
  },
  {
    title: 'Explain My Bill',
    role: 'AI Engineering',
    body:
      'Before "Agentic" was a buzzword, we created a multi-step AI tool to fetch and calculate a bill comparison, and transform it into a clear, structured output to assist agents through billing discussions.',
  },
  {
    title: 'Auto-Disposition',
    role: 'AI Engineering & Implementation',
    body:
      'Adapting the Python-based Google Agent Development Kit (ADK), we created a tool which used [[gemini-2.5-flash-lite]] to automatically label resolution state and sales outcomes.',
  },
  {
    title: 'Mercury Assistant',
    role: 'Design & Engineering',
    body:
      'The "Universal Assistant", designed to serve multiple platforms across chat, voice, and retail. Also built using ADK, it contains a suite of AI tools using [[gemini-2.5-flash]] and [[gemini-2.5-flash-lite]] to assist with billing, sales, and customer support.',
  },
];

const renderInlineModelText = (text: string) => {
  return text.split(/(\[\[.*?\]\])/g).map((part, index) => {
    const match = part.match(/^\[\[(.*)\]\]$/);
    if (!match) {
      return <span key={`${part}-${index}`}>{part}</span>;
    }

    return (
      <code key={`${match[1]}-${index}`} className="home-model-chip">
        {match[1]}
      </code>
    );
  });
};

const disciplineTags = [
  'UX Designer',
  'Product Designer',
  'Designer & Engineer',
  'Product Manager',
  'AI Product Engineer',
];

const heroTitleLines = ['An AI Optimist and Hype Skeptic.'];

export const Home = memo(() => {
  const prefersReducedMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const liveHeroProgress = useSpring(scrollY, {
    stiffness: 110,
    damping: 20,
    mass: 0.2,
  });
  const heroProgress = useTransform(liveHeroProgress, [0, 420], [0, 1]);
  const heroTitleClipPath = useTransform(heroProgress, [0.0, 0.2], ['inset(0% 0% 64% 0%)', 'inset(0% 0% 0% 0%)']);
  const heroLeadOpacity = useTransform(heroProgress, [0.3, 0.5], [0, 1]);
  const heroLeadY = useTransform(heroProgress, [0.3, 0.5], [56, 0]);
  const heroSupportOpacity = useTransform(heroProgress, [0.4, 0.6], [0, 1]);
  const heroSupportY = useTransform(heroProgress, [0.4, 0.6], [48, 0]);
  const heroActionsOpacity = useTransform(heroProgress, [0.5, 0.7], [0, 1]);
  const heroActionsY = useTransform(heroProgress, [0.5, 0.7], [44, 0]);
  const heroProofOpacity = useTransform(heroProgress, [0.8, 1.0], [0, 1]);
  const heroProofY = useTransform(heroProgress, [0.8, 1.0], [52, 0]);
  const heroEase = 'easeInOut' as const;

  return (
    <main className="home-page">
      <header className="home-header-shell">
        <div className="home-header home-header--intro">
          <div>
            <p className="home-eyebrow">Adam Yuras</p>
            <p className="home-wordmark">Product Engineer / Designer</p>
          </div>
          <nav className="home-nav" aria-label="Primary">
            <Link to="/resume">Resume</Link>
            <a
              href="https://www.linkedin.com/in/adam-yuras-ai"
              target="_blank"
              rel="noreferrer"
            >
              LinkedIn
            </a>
          </nav>
        </div>
      </header>

      <section className="home-title-stage" aria-labelledby="home-title">
        <motion.div className="home-hero-headline-block home-hero-headline-block--bleed">
          <div className="home-title-stage__inner">
            <h1 id="home-title" className="home-title">
              {heroTitleLines.map(line => (
                <span key={line} className="home-title-line-shell">
                  <motion.span
                    className="home-title-line"
                    style={
                      prefersReducedMotion
                        ? undefined
                        : {
                          clipPath: heroTitleClipPath,
                        }
                    }
                  >
                    {line}
                  </motion.span>
                </span>
              ))}
            </h1>
          </div>
        </motion.div>
      </section>

      <div className="home-frame">
        <section className="home-intro-stage" aria-labelledby="home-title">
          <div className="home-intro-sticky">
            <section className="home-hero home-hero--split home-hero--body">
              <motion.div
                className="home-hero-copy-block"
                viewport={{ once: true }}
                style={
                  prefersReducedMotion
                    ? undefined
                    : {
                      opacity: heroLeadOpacity,
                      y: heroLeadY,
                    }
                }
              >
                <p className="home-lede">AI is transformative, but creativity remains a uniquely human ability.</p>
                <motion.div
                  className="home-hero-reveal-block"
                  viewport={{ once: true }}
                  style={
                    prefersReducedMotion
                      ? undefined
                      : {
                        opacity: heroSupportOpacity,
                        y: heroSupportY,
                      }
                  }
                >
                  <p className="home-support">
                    Making performant, high-quality products still requires a fundamental understanding of design and engineering. AI can help us build quickly, but without a vision, you're just going nowhere fast.
                  </p>
                </motion.div>
                <motion.div
                  className="home-actions"
                  viewport={{ once: true }}
                  style={
                    prefersReducedMotion
                      ? undefined
                      : {
                        opacity: heroActionsOpacity,
                        y: heroActionsY,
                      }
                  }
                >
                  <a className="home-button home-button--primary" href="mailto:adam@adamyuras.com">
                    Email Adam
                  </a>
                  <a
                    className="home-button"
                    href="https://www.linkedin.com/in/adam-yuras-ai"
                    target="_blank"
                    rel="noreferrer"
                  >
                    LinkedIn
                  </a>
                </motion.div>
              </motion.div>

              <motion.aside
                className="home-proof-panel home-proof-panel--row"
                aria-label="Summary"
                viewport={{ once: true }}
                style={
                  prefersReducedMotion
                    ? undefined
                    : {
                      opacity: heroProofOpacity,
                      y: heroProofY,
                    }
                }
              >
                <div className="home-proof-item">
                  <span className="home-proof-label">My Expertise</span>
                  <p>Product design, user experience, and engineering, with a focus on AI integration.</p>
                </div>
                <div className="home-proof-item">
                  <span className="home-proof-label">My Approach</span>
                  <p>When delivery has become exponentially faster, good ideas and solid product design matter more than ever.</p>
                </div>
                <div className="home-proof-item">
                  <span className="home-proof-label">My Background</span>
                  <p>Designer, developer, game maker, musician, artist, 3d-printing enthusiast, and lifelong computer nerd.</p>
                </div>
              </motion.aside>
            </section>
          </div>
        </section>

        <section className="home-section" aria-labelledby="background-title">
          <div className="home-section-heading">
            <p className="home-section-label">What I've Done</p>
            <h2 id="background-title">I've never been afraid to learn something new.</h2>
          </div>
          <div className="home-two-column">
            <div className="home-list-block">
              {background.map(item => (
                <p key={item}>{item}</p>
              ))}
            </div>
            <div className="home-tag-block" aria-label="Disciplines">
              {disciplineTags.map(tag => (
                <span key={tag} className="home-tag">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </section>


        <section className="home-section" aria-labelledby="capabilities-title">
          <div className="home-section-heading">
            <p className="home-section-label">What I've Built</p>
            <h2 id="capabilities-title">A timeline of AI products at Comcast.</h2>
          </div>
          <div className="home-timeline" aria-label="Timeline of AI products at Comcast">
            <motion.div
              aria-hidden="true"
              className="home-timeline-spine"
              initial={prefersReducedMotion ? false : { scaleY: 0 }}
              whileInView={prefersReducedMotion ? undefined : { scaleY: 1 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.8, ease: heroEase }}
            />
            {capabilities.map((capability, index) => (
              <motion.article
                key={capability.title}
                className="home-timeline-item"
                initial={prefersReducedMotion ? false : { opacity: 0, y: 28 }}
                whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{
                  duration: 0.55,
                  delay: prefersReducedMotion ? 0 : index * 0.08,
                  ease: heroEase,
                }}
              >
                <div className="home-timeline-marker" aria-hidden="true">
                  <span className="home-timeline-index">{String(index + 1).padStart(2, '0')}</span>
                  <motion.span
                    className="home-timeline-dot"
                    initial={prefersReducedMotion ? false : { scale: 0.85, opacity: 0 }}
                    whileInView={prefersReducedMotion ? undefined : { scale: 1, opacity: 1 }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{
                      duration: 0.35,
                      delay: prefersReducedMotion ? 0 : index * 0.08 + 0.1,
                    }}
                  />
                </div>
                <div className="home-timeline-card">
                  <h3>{capability.title}</h3>
                  <p>{renderInlineModelText(capability.body)}</p>
                  <p className="home-timeline-role">{capability.role}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </section>


        <section className="home-section" aria-labelledby="philosophy-title">
          <div className="home-section-heading">
            <p className="home-section-label">My Perspective</p>
            <h2 id="philosophy-title">A realistic view of AI.</h2>
          </div>
          <div className="home-section-copy">
            <p>
              I've been fascinated by AI tools ever since the early days of Dall-E and GPT-3. I've
              always known there was great potential in the technology. But years later, there
              remains only a few areas where it's really proven its usefulness. The truth is, without serious intervention, LLMs produce generic, uncreative results.
            </p>
            <p>
              I've watched other teams fail because they over-estimated AI's critical and creative thinking abilities, and under-valued people at the same time. My goal is to help businesses and teams from getting stuck waiting for AI to deliver something it can't.
            </p>
          </div>
        </section>

        <section className="home-closing" aria-labelledby="closing-title">
          <div>
            <p className="home-closing-label">Get in touch</p>
            <h2 id="closing-title">
              In a time where hype reigns, work with a serious person.
            </h2>
          </div>
          <div className="home-actions">
            <a className="home-button home-button--light" href="mailto:adam@adamyuras.com">
              adam@adamyuras.com
            </a>
            <Link className="home-button home-button--ghost" to="/resume">
              View resume
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
});
