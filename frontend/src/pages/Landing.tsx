import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, MessageSquare, Bot, Megaphone, Sparkles } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen text-[var(--ink)] relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="mesh-orb -top-24 -left-16 h-[28rem] w-[28rem] bg-teal-300/25" />
        <div className="mesh-orb bottom-0 right-0 h-96 w-96 bg-slate-400/15 [animation-delay:1s]" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-6 md:px-12 py-6">
        <div>
          <p className="font-display brand-mark text-3xl leading-none">SnapShop</p>
          <p className="text-[11px] uppercase tracking-[0.22em] font-semibold text-teal-800/70 mt-1">AI customer workspace</p>
        </div>
        <Link to="/app" className="btn-primary px-5 py-2.5 text-sm inline-flex items-center gap-2">
          Open workspace <ArrowRight className="w-4 h-4" />
        </Link>
      </header>

      <section className="relative z-10 px-6 md:px-12 pt-10 pb-20 md:pt-16 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl"
        >
          <p className="font-display text-5xl md:text-7xl leading-[1.02] text-[var(--ink)]">
            SnapShop
          </p>
          <h1 className="mt-5 font-display text-2xl md:text-4xl text-[var(--ink-soft)] leading-snug">
            Conversations that sell while you sleep.
          </h1>
          <p className="mt-5 text-base md:text-lg text-slate-600 max-w-xl leading-relaxed">
            Multi-channel AI inbox with RAG knowledge, tools, voice & image understanding, and human escalation — built for WhatsApp-first businesses.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/app" className="btn-primary px-6 py-3.5 text-sm inline-flex items-center gap-2">
              Start free <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#features" className="px-6 py-3.5 text-sm font-semibold rounded-xl border border-[var(--line)] bg-white/70 hover:bg-white">
              See what&apos;s inside
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.55 }}
          className="mt-16 md:mt-20 relative rounded-3xl overflow-hidden border border-[var(--line)] bg-[var(--ink)] text-white min-h-[280px] md:min-h-[360px]"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(20,184,166,0.4),transparent_45%),radial-gradient(circle_at_85%_70%,rgba(148,163,184,0.25),transparent_40%)]" />
          <div className="relative z-10 p-8 md:p-12 flex flex-col justify-end h-full min-h-[280px] md:min-h-[360px]">
            <p className="text-teal-200/90 text-xs uppercase tracking-[0.2em] font-semibold">Live AI agent</p>
            <p className="font-display text-3xl md:text-4xl mt-3 max-w-lg leading-tight">
              Replies with your catalog. Escalates when it shouldn&apos;t guess.
            </p>
          </div>
        </motion.div>
      </section>

      <section id="features" className="relative z-10 px-6 md:px-12 pb-24 max-w-6xl mx-auto">
        <h2 className="font-display text-3xl mb-8">Built for the AI era</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {[
            { icon: Bot, title: 'RAG + memory', body: 'Answers from your knowledge base and remembers each customer across chats.' },
            { icon: Sparkles, title: 'Tools & workflows', body: 'Order lookup, stock checks, booking hooks, and routing rules to sales or support.' },
            { icon: MessageSquare, title: 'Multimodal inbox', body: 'Understands voice notes and product photos — not just text.' },
            { icon: Megaphone, title: 'Campaigns that convert', body: 'Segments, templates, and AI-written broadcasts across channels.' },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="py-2"
            >
              <f.icon className="w-5 h-5 text-teal-700 mb-3" />
              <h3 className="font-semibold text-lg">{f.title}</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed max-w-md">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 px-6 md:px-12 py-8 border-t border-[var(--line)] flex flex-wrap gap-4 justify-between text-sm text-slate-500">
        <p>© {new Date().getFullYear()} SnapShop</p>
        <div className="flex gap-4">
          <Link to="/privacy" className="hover:text-teal-800">Privacy</Link>
          <Link to="/terms" className="hover:text-teal-800">Terms</Link>
          <Link to="/app" className="hover:text-teal-800">Sign in</Link>
        </div>
      </footer>
    </div>
  );
}
