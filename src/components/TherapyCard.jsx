import React from 'react';

const TherapyCard = ({ therapy, onExplore }) => {
  const Icon = therapy.icon;
  
  return (
    <div
      className="bg-white dark:bg-gradient-to-br dark:from-slate-800 dark:to-slate-900 rounded-2xl p-6 border-2 hover:scale-105 transition transform shadow-sm"
      style={{ borderColor: therapy.color }}
    >
      <div className="flex justify-center mb-4">
        <div className="p-4 rounded-full" style={{ backgroundColor: therapy.color + '20' }}>
          <Icon size={40} style={{ color: therapy.color }} />
        </div>
      </div>
      <h4 className="text-2xl font-bold text-center mb-4 text-slate-900 dark:text-white">{therapy.title}</h4>
      <p className="text-slate-600 dark:text-slate-300 text-center mb-6 text-sm">{therapy.description}</p>
      <button
        onClick={onExplore}
        className="w-full py-3 rounded-lg font-semibold transition hover:brightness-110"
        style={{ backgroundColor: '#00D26A', color: 'white' }}
      >
        Explore
      </button>
    </div>
  );
};

export default TherapyCard;