import React from 'react';
import { Flame, Star, Snowflake, HeadphonesIcon, CalendarCheck } from 'lucide-react';

interface ClassificationBadgeProps {
  classification: string | null;
}

export default function ClassificationBadge({ classification }: ClassificationBadgeProps) {
  if (!classification) return <span className="text-slate-400">-</span>;

  const config: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
    hot_lead: { bg: 'bg-red-100', text: 'text-red-700', icon: <Flame size={14} />, label: 'Hot Lead' },
    warm: { bg: 'bg-amber-100', text: 'text-amber-700', icon: <Star size={14} />, label: 'Warm' },
    cold: { bg: 'bg-slate-100', text: 'text-slate-700', icon: <Snowflake size={14} />, label: 'Cold' },
    support: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <HeadphonesIcon size={14} />, label: 'Support' },
    booking: { bg: 'bg-purple-100', text: 'text-purple-700', icon: <CalendarCheck size={14} />, label: 'Booking' },
  };

  const style = config[classification] || { bg: 'bg-slate-100', text: 'text-slate-700', icon: null, label: classification };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
      {style.icon}
      {style.label}
    </span>
  );
}
