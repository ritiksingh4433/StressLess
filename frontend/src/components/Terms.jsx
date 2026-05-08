import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

const Terms = ({ onBackHome }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 pt-24 pb-12">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex items-center gap-4 mb-8">
          <button onClick={onBackHome} className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft size={22} className="text-slate-700 dark:text-slate-300" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">Terms of Service</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Rules and guidelines for using StressLess.</p>
          </div>
        </motion.div>

        <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl p-8 border border-slate-200 dark:border-white/10 shadow-lg">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Overview</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            By using StressLess you agree to these terms. Use our service responsibly and do not attempt to misuse or abuse the features.
          </p>

          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-4">Acceptable Use</h3>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            You must not use the service for illegal activities, harassment, or to share harmful or disallowed content. Maintain respectful behaviour.
          </p>

          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-4">Intellectual Property</h3>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            The StressLess service and its content are the property of the project authors. You may not reproduce branded assets without permission.
          </p>

          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-4">Liability</h3>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            StressLess provides wellness-related guidance and is not a substitute for professional medical advice. We are not liable for any outcomes
            from following suggestions in the app.
          </p>

          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-4">Contact</h3>
          <p className="text-slate-600 dark:text-slate-400">
            For terms questions, email contact@stressless.com.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Terms;
