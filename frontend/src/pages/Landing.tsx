import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, MessageSquare, Bot, Megaphone, Sparkles } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen text-[var(--ink)]">
      {/* Full-bleed hero — one composition */}
      <section className="relative min-h-[100svh] overflow-hidden hero-stage">
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="mesh-orb top-[-10%] left-[-5%] h-[36rem] w-[36rem] bg-[var(--accent)]" />
          <div className="mesh-orb bottom-[-15%] right-[-8%] h-[28rem] w-[28rem] bg-white/20 [animation-delay:1.2s]" />
        </div>

        <header className="relative z-20 flex items-center justify-between px-6 md:px-12 pt-7">
          <div>
            <p className="font-display brand-mark text-[2rem] md:text-[2.35rem] leading-none text-white">SnapShop</p>
            <p className="mt-1.5 text-[10px] uppercase tracking-[0.28em] font-semibold text-[var(--accent-bright)]/90">
              AI customer workspace
            </p>
          </div>
          <Link
            to="/app"
            className="inline-flex items-center gap-2 rounded-[0.7rem] bg-white px-4 py-2.5 text-sm font-bold text-[var(--ink)] hover:bg-[var(--accent-bright)] transition-colors"
          >
            Open workspace <ArrowRight className="w-4 h-4" />
          </Link>
        </header>

        <div className="relative z-20 flex flex-col justify-end min-h-[calc(100svh-5.5rem)] px-6 md:px-12 pb-14 md:pb-20 max-w-6xl">
          <motion.p
            className="font-display text-[clamp(3.4rem,11vw,7.5rem)] leading-[0.92] text-white max-w-4xl"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            SnapShop
          </motion.p>

          <motion.p
            className="mt-6 text-lg md:text-xl text-white/70 max-w-lg leading-relaxed"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.5 }}
          >
            Conversations that sell while you sleep — AI inbox, knowledge, and campaigns in one workspace.
          </motion.p>

          <motion.div
            className="mt-9 flex flex-wrap gap-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.45 }}
          >
            <Link
              to="/app"
              className="inline-flex items-center gap-2 rounded-[0.7rem] bg-[var(--accent)] px-6 py-3.5 text-sm font-bold text-white hover:brightness-110"
            >
              Start free <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#product"
              className="inline-flex items-center gap-2 rounded-[0.7rem] border border-white/25 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/10"
            >
              See the product
            </a>
          </motion.div>

          {/* Ambient product signal — not a card overlay */}
          <motion.div
            className="mt-14 md:mt-16 flex flex-col gap-3 max-w-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <div className="chat-bubble-demo self-start rounded-2xl rounded-bl-md bg-white/10 border border-white/15 px-4 py-3 text-sm text-white/90 backdrop-blur-md">
              Do you have the navy hoodie in XL?
            </div>
            <div className="chat-bubble-demo self-end rounded-2xl rounded-br-md bg-[var(--accent)]/90 px-4 py-3 text-sm text-white shadow-lg">
              Yes — XL navy is in stock. Want me to reserve one?
            </div>
            <div className="chat-bubble-demo self-start rounded-2xl rounded-bl-md bg-white/10 border border-white/15 px-4 py-3 text-sm text-white/90 backdrop-blur-md">
              Yes please — COD to Gulberg.
            </div>
          </motion.div>
        </div>
      </section>

      <section id="product" className="relative px-6 md:px-12 py-20 md:py-28 max-w-6xl mx-auto">
        <p className="page-eyebrow mb-3">Built for the AI era</p>
        <h2 className="section-title text-3xl md:text-5xl max-w-2xl leading-[1.05]">
          An agent that knows your catalog — and knows when to hand off.
        </h2>

        <div className="mt-14 grid md:grid-cols-2 gap-x-12 gap-y-12">
          {[
            { icon: Bot, title: 'RAG + memory', body: 'Answers from your knowledge base and remembers each customer across chats.' },
            { icon: Sparkles, title: 'Tools & workflows', body: 'Order lookup, stock checks, booking hooks, and routing to sales or support.' },
            { icon: MessageSquare, title: 'Multimodal inbox', body: 'Understands voice notes and product photos — not just text threads.' },
            { icon: Megaphone, title: 'Campaigns that convert', body: 'Segments, templates, and AI-written broadcasts across every channel.' },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
            >
              <f.icon className="w-5 h-5 text-[var(--accent-deep)] mb-4" strokeWidth={2.2} />
              <h3 className="font-display text-xl md:text-2xl text-[var(--ink)]">{f.title}</h3>
              <p className="mt-2 text-[var(--ink-soft)] text-[0.95rem] leading-relaxed max-w-sm">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="relative px-6 md:px-12 pb-24 max-w-6xl mx-auto">
        <div className="rounded-[1.75rem] overflow-hidden hero-stage min-h-[240px] md:min-h-[300px] flex items-end p-8 md:p-12">
          <div className="relative z-10 max-w-xl">
            <p className="text-[var(--accent-bright)] text-xs font-bold uppercase tracking-[0.2em]">Ready when you are</p>
            <p className="font-display text-3xl md:text-4xl text-white mt-3 leading-tight">
              Launch your AI workspace in minutes.
            </p>
            <Link
              to="/app"
              className="mt-7 inline-flex items-center gap-2 rounded-[0.7rem] bg-white px-5 py-3 text-sm font-bold text-[var(--ink)] hover:bg-[var(--accent-bright)]"
            >
              Get started <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="px-6 md:px-12 py-8 border-t border-[var(--line)] flex flex-wrap gap-4 justify-between text-sm text-[var(--ink-soft)] max-w-6xl mx-auto">
        <p className="font-display text-[var(--ink)]">SnapShop</p>
        <div className="flex gap-5">
          <Link to="/privacy" className="hover:text-[var(--accent-deep)]">Privacy</Link>
          <Link to="/terms" className="hover:text-[var(--accent-deep)]">Terms</Link>
          <Link to="/app" className="hover:text-[var(--accent-deep)]">Sign in</Link>
        </div>
      </footer>
    </div>
  );
}
