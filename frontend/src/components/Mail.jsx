import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

const Mail = ({ onBack }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const body = `Name: ${name}\nEmail: ${email}\n\n${message}`;
    const mailto = `mailto:contact@stressless.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 pt-24 pb-12">
      <div className="max-w-3xl mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex items-center gap-4 mb-8">
          <button onClick={onBack} className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft size={22} className="text-slate-700 dark:text-slate-300" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">Send Us a Message</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Compose a message and your email client will open to send it.</p>
          </div>
        </motion.div>

        <motion.form onSubmit={handleSubmit} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="bg-white dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl p-8 border border-slate-200 dark:border-white/10 shadow-lg">
          <label className="block mb-4">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Your Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-2 w-full rounded-md border px-3 py-2 bg-transparent text-slate-900 dark:text-white border-slate-200 dark:border-white/10" placeholder="John Doe" />
          </label>

          <label className="block mb-4">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Your Email</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-md border px-3 py-2 bg-transparent text-slate-900 dark:text-white border-slate-200 dark:border-white/10" placeholder="you@example.com" />
          </label>

          <label className="block mb-4">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Subject</span>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-2 w-full rounded-md border px-3 py-2 bg-transparent text-slate-900 dark:text-white border-slate-200 dark:border-white/10" placeholder="How can we help?" />
          </label>

          <label className="block mb-6">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Message</span>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} className="mt-2 w-full rounded-md border px-3 py-2 bg-transparent text-slate-900 dark:text-white border-slate-200 dark:border-white/10" placeholder="Write your message..." />
          </label>

          <div className="flex items-center gap-3">
            <button type="submit" className="px-6 py-3 bg-yellow-500 text-white font-bold rounded-lg hover:bg-yellow-600 transition-colors">Open Mail Client</button>
            <button type="button" onClick={onBack} className="px-4 py-3 border rounded-lg border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300">Cancel</button>
          </div>
        </motion.form>
      </div>
    </div>
  );
};

export default Mail;
