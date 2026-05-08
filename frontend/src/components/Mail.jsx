import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Check } from 'lucide-react';

const Mail = ({ onBack }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // 'success' or 'error'
  const [statusMessage, setStatusMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name || !email || !subject || !message) {
      setStatus('error');
      setStatusMessage('Please fill in all fields');
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      console.log('Sending to:', `${API_URL}/contact/send-mail`);
      
      const response = await fetch(`${API_URL}/contact/send-mail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setStatusMessage('Message sent successfully!');
        setTimeout(() => {
          setName('');
          setEmail('');
          setSubject('');
          setMessage('');
          setStatus(null);
          onBack();
        }, 2000);
      } else {
        setStatus('error');
        setStatusMessage(data.message || 'Failed to send message');
      }
    } catch (err) {
      setStatus('error');
      setStatusMessage('Error sending message. Please try again.');
      console.error('Mail error:', err);
    } finally {
      setLoading(false);
    }
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
            <p className="text-slate-600 dark:text-slate-400 mt-1">Your message will be sent directly to us.</p>
          </div>
        </motion.div>

        <motion.form onSubmit={handleSubmit} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="bg-white dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl p-8 border border-slate-200 dark:border-white/10 shadow-lg">
          <label className="block mb-4">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-2 w-full rounded-md border px-3 py-2 bg-transparent text-slate-900 dark:text-white border-slate-200 dark:border-white/10" placeholder="Enter Your Name" />
          </label>

          <label className="block mb-4">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Email</span>
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

          {status === 'success' && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-700 rounded-lg flex items-center gap-2">
              <Check size={20} className="text-green-600 dark:text-green-400" />
              <p className="text-green-700 dark:text-green-300 font-medium">{statusMessage}</p>
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 rounded-lg">
              <p className="text-red-700 dark:text-red-300 font-medium">{statusMessage}</p>
            </motion.div>
          )}

          <div className="flex items-center gap-3">
            <button type="submit" disabled={loading} className="px-6 py-3 bg-yellow-500 text-white font-bold rounded-lg hover:bg-yellow-600 disabled:bg-yellow-400 transition-colors">
              {loading ? 'Sending...' : 'Send'}
            </button>
            <button type="button" onClick={onBack} className="px-4 py-3 border rounded-lg border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300">Cancel</button>
          </div>
        </motion.form>
      </div>
    </div>
  );
};

export default Mail;
