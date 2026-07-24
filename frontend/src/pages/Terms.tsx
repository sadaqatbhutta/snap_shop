import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { fadeUp } from '../lib/animations';

export default function Terms() {
  return (
    <motion.div className="max-w-3xl mx-auto py-8 px-4 space-y-6" variants={fadeUp} initial="initial" animate="animate">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-teal-700 mb-2">Legal</p>
        <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
        <p className="text-sm text-gray-500 mt-2">Last updated: July 23, 2026</p>
      </div>

      <section className="space-y-3 text-sm text-gray-700 leading-relaxed">
        <p>
          By creating a SnapShop AI account you agree to these terms. If you use SnapShop on behalf of a
          business, you represent that you have authority to bind that business.
        </p>
        <h2 className="text-lg font-semibold text-gray-900 pt-2">Service</h2>
        <p>
          SnapShop provides AI-assisted messaging, CRM, broadcasts, and related tooling. Features and
          message volumes depend on your plan (Free, Growth Pro, Scale Plus, or Enterprise).
        </p>
        <h2 className="text-lg font-semibold text-gray-900 pt-2">Acceptable use</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Comply with Meta, TikTok, and other channel provider policies and local messaging laws.</li>
          <li>Do not send spam, phishing, or unlawful content through SnapShop.</li>
          <li>Protect your API tokens and team invite links.</li>
        </ul>
        <h2 className="text-lg font-semibold text-gray-900 pt-2">Billing</h2>
        <p>
          Paid plans are billed via Stripe. Plan limits (messages, AI calls, broadcasts, seats) are enforced
          by the platform. Overages may require an upgrade. Enterprise terms may be set in a separate order form.
        </p>
        <h2 className="text-lg font-semibold text-gray-900 pt-2">Disclaimer</h2>
        <p>
          The service is provided &quot;as is.&quot; AI replies can be incorrect; human review remains your responsibility
          for high-risk or regulated communications.
        </p>
        <h2 className="text-lg font-semibold text-gray-900 pt-2">Contact</h2>
        <p>
          Legal: <a className="text-teal-700 underline" href="mailto:legal@snapshop.ai">legal@snapshop.ai</a>
        </p>
      </section>

      <Link to="/app/settings" className="inline-block text-sm font-semibold text-teal-700 hover:underline">
        ← Back to Settings
      </Link>
    </motion.div>
  );
}
