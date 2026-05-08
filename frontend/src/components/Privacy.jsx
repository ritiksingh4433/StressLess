import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

const Privacy = ({ onBackHome }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 pt-24 pb-12">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex items-center gap-4 mb-8">
          <button onClick={onBackHome} className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft size={22} className="text-slate-700 dark:text-slate-300" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">Privacy Policy</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">How we collect, use and protect your data.</p>
          </div>
        </motion.div>

        <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl p-8 border border-slate-200 dark:border-white/10 shadow-lg">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Summary</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            We respect your privacy. StressLess collects only the minimal information needed to provide and improve our service,
            such as email addresses for account creation and optional test results to personalize recommendations. We do not sell
            your personal information.
          </p>

          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-4">What we collect</h3>
          <ul className="list-disc list-inside text-slate-600 dark:text-slate-400 mb-4">
            <li>Email and basic profile information when you sign up.</li>
            <li>Stress test responses and non-identifying analytics to improve the product.</li>
          </ul>

          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-4">How we use it</h3>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Data is used to provide personalized insights, power the AI analysis feature (when consented), and to maintain account security.
          </p>

          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-4">Sharing & Security</h3>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            We do not sell personal data. We may share aggregated, de-identified metrics with partners. We protect data with industry-standard
            security practices and limited access controls.
          </p>

          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-4">Contact</h3>
          <p className="text-slate-600 dark:text-slate-400">
            For privacy questions, email us at contact@stressless.com.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
