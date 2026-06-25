import React from 'react';

interface LeadScoreBadgeProps {
  score: number;
}

export default function LeadScoreBadge({ score }: LeadScoreBadgeProps) {
  // Color shifting logic
  let colorClass = 'bg-slate-200';
  let barColorClass = 'bg-slate-400';
  
  if (score > 75) {
    colorClass = 'text-red-700 bg-red-100';
    barColorClass = 'bg-red-500';
  } else if (score > 40) {
    colorClass = 'text-amber-700 bg-amber-100';
    barColorClass = 'bg-amber-500';
  } else if (score > 0) {
    colorClass = 'text-green-700 bg-green-100';
    barColorClass = 'bg-green-500';
  } else {
    colorClass = 'text-slate-600 bg-slate-100';
    barColorClass = 'bg-slate-300';
  }

  const cappedScore = Math.min(Math.max(score, 0), 100);

  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${colorClass}`}>
        {cappedScore}
      </span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div 
          className={`h-full ${barColorClass} transition-all duration-500`} 
          style={{ width: `${cappedScore}%` }} 
        />
      </div>
    </div>
  );
}
