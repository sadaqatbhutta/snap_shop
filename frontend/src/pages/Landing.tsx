import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowRight,
  MessageSquare,
  Bot,
  Megaphone,
  Sparkles,
  Clock,
  Moon,
  Users,
  Store,
  Headphones,
  Briefcase,
  ShoppingBag,
  UserRound,
} from 'lucide-react';

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' as const },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
};

export default function Landing() {
  return (
    <div className="min-h-screen text-[var(--ink)]">
      {/* Full-bleed hero — matches mock composition */}
      <section className="relative min-h-[100svh] overflow-hidden hero-stage">
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="mesh-orb top-[-10%] left-[-5%] h-[36rem] w-[36rem] bg-[var(--accent)]" />
          <div className="mesh-orb bottom-[-15%] right-[-8%] h-[28rem] w-[28rem] bg-white/20 [animation-delay:1.2s]" />
        </div>

        <header className="relative z-20 px-6 md:px-12 pt-7">
          <div className="flex items-center justify-between">
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
          </div>
          <p className="mt-5 text-[11px] md:text-xs tracking-wide text-white/45">
            WhatsApp-ready · Catalog-aware · Human handoff
          </p>
        </header>

        {/* Right — tilted phone + ripple glow */}
        <motion.aside
          className="pointer-events-none absolute z-10 hidden lg:flex items-center justify-center inset-y-[8%] right-0 w-[min(48vw,28rem)] pr-6 xl:pr-12"
          initial={{ opacity: 0, x: 36, rotate: 8 }}
          animate={{ opacity: 1, x: 0, rotate: 0 }}
          transition={{ delay: 0.28, duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          aria-hidden
        >
          <div className="hero-phone-stage relative flex items-center justify-center">
            <div className="hero-ripple" />
            <div className="hero-phone relative w-[min(100%,18.5rem)] rotate-[8deg] rounded-[2.1rem] border border-white/15 bg-[#0c1218] p-[0.55rem] shadow-[0_40px_80px_-28px_rgba(0,0,0,0.75)]">
              <div className="overflow-hidden rounded-[1.65rem] bg-[#0b141a]">
                <div className="flex items-center gap-2.5 bg-[#075e54] px-3 py-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-[11px] font-bold text-white">
                    S
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-white">SnapShop</p>
                    <p className="text-[10px] text-white/70">online · AI agent</p>
                  </div>
                </div>
                <div className="flex min-h-[21rem] flex-col gap-2.5 bg-[radial-gradient(ellipse_at_top,_rgba(0,168,150,0.12),_transparent_55%),_#0b141a] px-3 py-4">
                  <div className="max-w-[88%] self-start rounded-2xl rounded-bl-md bg-[#1f2c34] px-3 py-2 text-[12.5px] leading-snug text-white/90">
                    Do you have the navy hoodie in XL?
                  </div>
                  <div className="max-w-[90%] self-end rounded-2xl rounded-br-md bg-[var(--accent)] px-3 py-2 text-[12.5px] leading-snug text-white">
                    Yes — XL navy is in stock. Want me to reserve one?
                  </div>
                  <div className="max-w-[85%] self-start rounded-2xl rounded-bl-md bg-[#1f2c34] px-3 py-2 text-[12.5px] leading-snug text-white/90">
                    Yes please — COD to Gulberg.
                  </div>
                  <div className="max-w-[88%] self-end rounded-2xl rounded-br-md bg-[var(--accent)] px-3 py-2 text-[12.5px] leading-snug text-white">
                    Reserved. Tracking on WhatsApp in 2 min.
                  </div>
                </div>
                <div className="flex items-center gap-2 border-t border-white/5 bg-[#0b141a] px-2.5 py-2">
                  <div className="h-8 flex-1 rounded-full bg-white/5 px-3 text-[11px] leading-8 text-white/35">
                    Message
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-[11px] font-bold text-white">
                    →
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.aside>

        <div className="relative z-20 flex flex-col justify-between min-h-[calc(100svh-6.5rem)] px-6 md:px-12 pb-10 md:pb-14 max-w-6xl lg:max-w-[56%]">
          <div className="flex flex-col justify-center flex-1 pt-8 md:pt-12">
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

            {/* Chat preview on mobile only — desktop uses the phone mock */}
            <motion.div
              className="mt-12 flex flex-col gap-3 max-w-md lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <div className="chat-bubble-demo self-start rounded-2xl rounded-bl-md bg-white/10 border border-white/15 px-4 py-3 text-sm text-white/90 backdrop-blur-md">
                Do you have the navy hoodie in XL?
              </div>
              <div className="chat-bubble-demo self-end rounded-2xl rounded-br-md bg-[var(--accent)]/90 px-4 py-3 text-sm text-white shadow-lg [animation-delay:0.8s]">
                Yes — XL navy is in stock. Want me to reserve one?
              </div>
              <div className="chat-bubble-demo self-start rounded-2xl rounded-bl-md bg-white/10 border border-white/15 px-4 py-3 text-sm text-white/90 backdrop-blur-md [animation-delay:1.4s]">
                Yes please — COD to Gulberg.
              </div>
            </motion.div>
          </div>

          {/* Hero feature trio — matches mock bottom row */}
          <motion.div
            className="mt-10 md:mt-12 grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6 max-w-2xl"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38, duration: 0.5 }}
          >
            {[
              {
                icon: WhatsAppIcon,
                title: 'WhatsApp-ready',
                body: 'Engage where customers already are.',
              },
              {
                icon: ShoppingBag,
                title: 'Catalog-aware',
                body: 'Understand products and availability.',
              },
              {
                icon: UserRound,
                title: 'Human handoff',
                body: 'Seamless escalation to your team.',
              },
            ].map((item) => (
              <div key={item.title}>
                <item.icon className="w-5 h-5 text-[var(--accent-bright)] mb-3" />
                <p className="text-sm font-bold text-white">{item.title}</p>
                <p className="mt-1 text-xs text-white/50 leading-relaxed max-w-[11rem]">{item.body}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Outcomes */}
      <section className="relative px-6 md:px-12 py-16 md:py-20 border-b border-[var(--line)]">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="grid sm:grid-cols-3 gap-10 md:gap-12"
            {...fadeUp}
          >
            {[
              {
                icon: Clock,
                title: 'Instant replies',
                body: 'Customers get answers the moment they message — size, stock, price, delivery.',
              },
              {
                icon: Moon,
                title: 'After-hours coverage',
                body: 'The inbox keeps selling when your team is offline. No missed night orders.',
              },
              {
                icon: Users,
                title: 'Clean handoffs',
                body: 'When a human should take over, they get full context — not a cold thread.',
              },
            ].map((item) => (
              <div key={item.title}>
                <item.icon className="w-5 h-5 text-[var(--accent-deep)] mb-4" strokeWidth={2.2} />
                <p className="font-display text-2xl md:text-3xl text-[var(--ink)] leading-tight">{item.title}</p>
                <p className="mt-2 text-[var(--ink-soft)] text-sm leading-relaxed max-w-xs">{item.body}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Meet the agent */}
      <section className="relative px-6 md:px-12 py-20 md:py-28 max-w-6xl mx-auto">
        <motion.div {...fadeUp}>
          <p className="page-eyebrow mb-3">Meet the agent</p>
          <h2 className="section-title text-3xl md:text-5xl max-w-3xl leading-[1.05]">
            Every great shop runs on someone who never drops a DM.
          </h2>
          <p className="mt-6 text-[var(--ink-soft)] text-lg leading-relaxed max-w-2xl">
            That person is rare, expensive, and impossible to clone. SnapShop is that agent — automated,
            catalog-aware, and ready to escalate the moment a human should step in.
          </p>
          <p className="mt-8 font-display text-xl md:text-2xl text-[var(--ink)] max-w-xl leading-snug">
            “Remembers the catalog, closes the easy ones, and surfaces the rest with full context.”
          </p>
          <div className="mt-10 flex flex-wrap gap-10">
            <div>
              <p className="font-display text-3xl text-[var(--ink)]">24/7</p>
              <p className="mt-1 text-sm text-[var(--ink-soft)]">Always on</p>
            </div>
            <div>
              <p className="font-display text-3xl text-[var(--ink)]">Every</p>
              <p className="mt-1 text-sm text-[var(--ink-soft)]">Channel covered</p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Product capabilities */}
      <section id="product" className="relative px-6 md:px-12 py-20 md:py-28 max-w-6xl mx-auto border-t border-[var(--line)]">
        <p className="page-eyebrow mb-3">The workspace</p>
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

      {/* Why SnapShop */}
      <section id="why" className="relative px-6 md:px-12 py-20 md:py-28 bg-[var(--paper)]">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeUp}>
            <p className="page-eyebrow mb-3">Why SnapShop</p>
            <h2 className="section-title text-3xl md:text-5xl max-w-3xl leading-[1.05]">
              Shops don’t have a chat problem.
              <br />
              They have a context handoff problem.
            </h2>
            <p className="mt-6 text-[var(--ink-soft)] text-lg leading-relaxed max-w-2xl">
              Every customer is re-explained across WhatsApp, webchat, and your team. Each handoff loses
              what they already said — and forces the next person to start over.
            </p>
          </motion.div>

          <div className="mt-14 grid md:grid-cols-3 gap-10 md:gap-12">
            {[
              {
                title: 'Capture what they asked',
                body: 'SnapShop starts with the conversation itself — not a canned FAQ or a forgotten thread.',
              },
              {
                title: 'Connect answers to the catalog',
                body: 'AI interprets the ask while your knowledge base and tools control what can be promised.',
              },
              {
                title: 'Learn from human takeovers',
                body: 'When your team steps in, that judgment stays with the customer for next time.',
              },
            ].map((pillar) => (
              <div key={pillar.title}>
                <h3 className="font-display text-xl md:text-2xl text-[var(--ink)]">{pillar.title}</h3>
                <p className="mt-3 text-[var(--ink-soft)] text-sm leading-relaxed max-w-sm">{pillar.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 pt-10 border-t border-[var(--line)]">
            <p className="text-sm font-semibold text-[var(--ink)] mb-6">One conversation. One evidence chain.</p>
            <ol className="flex flex-wrap gap-x-1 gap-y-3 text-sm text-[var(--ink-soft)]">
              {[
                'Message',
                'Understanding',
                'Answer',
                'Action',
                'Handoff',
                'Outcome',
              ].map((step, i, arr) => (
                <li key={step} className="flex items-center gap-2">
                  <span className="font-display text-[var(--ink)]">{i + 1}</span>
                  <span>{step}</span>
                  {i < arr.length - 1 && <span className="text-[var(--line-strong,#c5ced6)] mx-1" aria-hidden>→</span>}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="relative px-6 md:px-12 py-20 md:py-28 max-w-6xl mx-auto">
        <p className="page-eyebrow mb-3">Who it’s for</p>
        <h2 className="section-title text-3xl md:text-5xl max-w-2xl leading-[1.05]">
          Everyone gets time back.
        </h2>
        <p className="mt-5 text-[var(--ink-soft)] text-lg max-w-xl leading-relaxed">
          SnapShop removes work from every part of the shop — not just the owner answering DMs at midnight.
        </p>

        <div className="mt-14 grid md:grid-cols-3 gap-10 md:gap-12">
          {[
            {
              icon: Store,
              role: 'Owner',
              title: 'Grow without growing the inbox.',
              body: 'More conversations handled. Same team. Sales don’t wait on your reply speed.',
            },
            {
              icon: Briefcase,
              role: 'Sales',
              title: 'Close the ones that matter.',
              body: 'AI clears stock and shipping questions. You jump in when a deal needs a human.',
            },
            {
              icon: Headphones,
              role: 'Support',
              title: 'Review exceptions.',
              body: 'Stop retyping the same answers. Focus on the threads that actually need attention.',
            },
          ].map((item) => (
            <div key={item.role}>
              <item.icon className="w-5 h-5 text-[var(--accent-deep)] mb-4" strokeWidth={2.2} />
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-deep)]">{item.role}</p>
              <h3 className="mt-2 font-display text-xl md:text-2xl text-[var(--ink)]">{item.title}</h3>
              <p className="mt-2 text-[var(--ink-soft)] text-sm leading-relaxed max-w-sm">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Workflow */}
      <section id="workflow" className="relative px-6 md:px-12 py-20 md:py-28 border-t border-[var(--line)]">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeUp}>
            <p className="page-eyebrow mb-3">Message to sale</p>
            <h2 className="section-title text-3xl md:text-5xl max-w-2xl leading-[1.05]">
              One conversation. No vendor hopscotch.
            </h2>
            <p className="mt-5 text-[var(--ink-soft)] text-lg max-w-2xl leading-relaxed">
              Every stage runs off the same thread — from the first WhatsApp ping to a reserved order or a
              clean human handoff.
            </p>
          </motion.div>

          <ol className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
            {[
              'Inbound message',
              'AI understand',
              'Catalog answer',
              'Reserve / order tools',
              'Human when needed',
              'Follow-up campaign',
            ].map((step, i) => (
              <li key={step} className="flex gap-4">
                <span className="font-display text-2xl text-[var(--accent-deep)] tabular-nums w-8 shrink-0">
                  {i + 1}
                </span>
                <span className="font-display text-lg md:text-xl text-[var(--ink)] pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Channels */}
      <section className="relative px-6 md:px-12 py-20 md:py-28 bg-[var(--paper)]">
        <div className="max-w-6xl mx-auto">
          <p className="page-eyebrow mb-3">Channels</p>
          <h2 className="section-title text-3xl md:text-5xl max-w-2xl leading-[1.05]">
            Works with the channels you already run.
          </h2>
          <p className="mt-5 text-[var(--ink-soft)] text-lg max-w-2xl leading-relaxed">
            SnapShop is an intelligence layer on your customer conversations — not a new inbox you have to
            migrate into overnight.
          </p>

          <ul className="mt-8 space-y-2 text-[var(--ink-soft)] text-sm leading-relaxed">
            <li>No rip-and-replace inbox.</li>
            <li>No migration project to start answering.</li>
            <li>Deploy on the channels you already use.</li>
          </ul>

          <div className="mt-12 flex flex-wrap gap-x-10 gap-y-4">
            {['WhatsApp', 'Webchat', 'Broadcasts'].map((ch) => (
              <p key={ch} className="font-display text-xl md:text-2xl text-[var(--ink)]">
                {ch}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative px-6 md:px-12 py-20 md:py-24 max-w-6xl mx-auto">
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
              Start free <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="px-6 md:px-12 py-10 border-t border-[var(--line)] max-w-6xl mx-auto">
        <div className="flex flex-wrap gap-6 justify-between items-start">
          <div>
            <p className="font-display text-[var(--ink)] text-lg">SnapShop</p>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">AI customer workspace</p>
          </div>
          <div className="flex flex-wrap gap-5 text-sm text-[var(--ink-soft)]">
            <a href="#product" className="hover:text-[var(--accent-deep)]">Product</a>
            <a href="#why" className="hover:text-[var(--accent-deep)]">Why SnapShop</a>
            <a href="#workflow" className="hover:text-[var(--accent-deep)]">Workflow</a>
            <Link to="/privacy" className="hover:text-[var(--accent-deep)]">Privacy</Link>
            <Link to="/terms" className="hover:text-[var(--accent-deep)]">Terms</Link>
            <Link to="/app" className="hover:text-[var(--accent-deep)]">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
