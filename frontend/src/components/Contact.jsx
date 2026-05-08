import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Github } from 'lucide-react';

const Contact = ({ onBackHome, onNavigate }) => {
  const teamMembers = [
    {
      id: 1,
      name: "Ritik Singh",
      role: "Full Stack Developer",
      github: "https://github.com/ritiksingh4433",
      image: "👨‍💻"
    },
    {
      id: 2,
      name: "Ayush Choudhary",
      role: "Full Stack Developer",
      github: "https://github.com/ayushChoudhary157",
      image: "👩‍🎨"
    },
    {
      id: 3,
      name: "Purosotam Kumar",
      role: "Full Stack Developer",
      github: "https://github.com/purosotam-kumar11",
      image: "👨‍💼"
    },
    {
      id: 4,
      name: "Kaushal Kumar",
      role: "Full Stack Developer",
      github: "https://github.com/kaushalkumar0001",
      image: "👩‍💻"
    },
    {
      id: 5,
      name: "Yash Singh",
      role: "Full Stack Developer",
      github: "https://github.com/Yash77929",
      image: "👨‍🔧"
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 pt-24 pb-12">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-4 mb-12"
        >
          <button
            onClick={onBackHome}
            className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} className="text-slate-700 dark:text-slate-300" />
          </button>
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white">
              Meet Our <span className="text-yellow-500">Team</span>
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2 text-lg">
              {/* The people behind StressLess */}
            </p>
          </div>
        </motion.div>

        {/* Team Members Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:flex lg:flex-wrap lg:justify-center lg:gap-8"
        >
          {teamMembers.map((member) => (
            <motion.div
              key={member.id}
              variants={itemVariants}
              className="group w-full md:w-[45%] lg:w-[30%]"
            >
              <div className="h-full bg-white dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl p-8 border border-slate-200 dark:border-white/10 hover:border-yellow-500 dark:hover:border-yellow-400 transition-all duration-300 shadow-lg hover:shadow-2xl hover:-translate-y-2">
                
                {/* Avatar */}
                <div className="text-6xl mb-6 group-hover:scale-110 transition-transform duration-300">
                  {member.image}
                </div>

                {/* Name */}
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  {member.name}
                </h3>

                {/* Role */}
                <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400 mb-4">
                  {member.role}
                </p>

                {/* Description */}
                <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 leading-relaxed">
                  {/* Passionate about creating solutions that make a difference in people's mental wellness journey. */}
                </p>

                {/* GitHub Link Button */}
                <a
                  href={member.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white font-bold rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-300"
                >
                  <Github size={18} />
                  GitHub Profile
                </a>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Contact Info Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-16 p-8 bg-white dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-white/10 flex flex-col items-center text-center"
        >
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
            Get In Touch
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-2xl">
            Have questions or want to collaborate? We'd love to hear from you!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={() => (onNavigate ? onNavigate('mail') : window.location.href = 'mailto:singhritik7605@gmail.com')}
              className="px-6 py-3 bg-yellow-500 text-white font-bold rounded-lg hover:bg-yellow-600 transition-colors text-center"
            >
              Email Us
            </button>
            <a
              href="https://github.com/ritiksingh4433/StressLess"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 border-2 border-yellow-500 text-yellow-600 dark:text-yellow-400 font-bold rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-500/10 transition-colors text-center"
            >
              Visit Our GitHub
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Contact;
