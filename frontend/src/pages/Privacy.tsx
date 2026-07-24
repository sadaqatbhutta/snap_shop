import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { fadeUp } from '../lib/animations';

export default function Privacy() {
  return (
    <motion.div className="max-w-3xl mx-auto py-8 px-4 space-y-6" variants={fadeUp} initial="initial" animate="animate">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-2">Legal</p>
        <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mt-2">Last updated: July 23, 2026</p>
      </div>

      <section className="space-y-3 text-sm text-gray-700 leading-relaxed">
        <p>
          SnapShop AI (&quot;we&quot;, &quot;us&quot;) provides a multi-tenant customer messaging platform.
          This policy describes how we collect, use, and protect business and end-customer data.
        </p>
        <h2 className="text-lg font-semibold text-gray-900 pt-2">Data we process</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Account data: name, email, authentication identifiers (via Firebase Auth).</li>
          <li>Business configuration: AI context, FAQs, templates, segments, team membership.</li>
          <li>Conversation data: messages exchanged on connected channels (WhatsApp, Instagram, Facebook, TikTok, webchat).</li>
          <li>Billing metadata: plan, Stripe customer/subscription identifiers (payment cards are handled by Stripe).</li>
          <li>Technical logs: request IDs, error telemetry (when Sentry is enabled).</li>
        </ul>
        <h2 className="text-lg font-semibold text-gray-900 pt-2">How we use data</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>To operate the inbox, AI replies, broadcasts, CRM, and analytics features.</li>
          <li>To enforce plan limits and process subscriptions.</li>
          <li>To send transactional emails (invites, inquiry/escalation alerts) when configured.</li>
        </ul>
        <h2 className="text-lg font-semibold text-gray-900 pt-2">Retention &amp; deletion</h2>
        <p>
          Business owners can delete their account from Settings. Deletion removes the business document and
          associated subcollections via the backend delete API. Channel provider retention (Meta, TikTok)
          is governed by those providers&apos; policies.
        </p>
        <h2 className="text-lg font-semibold text-gray-900 pt-2">Contact</h2>
        <p>
          Privacy questions: <a className="text-indigo-600 underline" href="mailto:privacy@snapshop.ai">privacy@snapshop.ai</a>
        </p>
      </section>

      <Link to="/settings" className="inline-block text-sm font-semibold text-indigo-600 hover:underline">
        ← Back to Settings
      </Link>
    </motion.div>
  );
}
