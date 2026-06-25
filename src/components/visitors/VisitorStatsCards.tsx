import React from 'react';
import { Users, Flame, CalendarCheck, Activity } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/I18nContext';

interface VisitorStats {
  total: number;
  hot_leads: number;
  booking_ready: number;
  avg_score: number;
}

interface VisitorStatsCardsProps {
  stats: VisitorStats;
}

export default function VisitorStatsCards({ stats }: VisitorStatsCardsProps) {
  const { t } = useTranslation();
  const cards = [
    {
      title: t('visitors', 'totalVisitors'),
      value: stats.total,
      icon: <Users size={24} className="text-blue-600" />,
      bg: 'bg-blue-50',
    },
    {
      title: t('visitors', 'hotLeads'),
      value: stats.hot_leads,
      icon: <Flame size={24} className="text-red-600" />,
      bg: 'bg-red-50',
    },
    {
      title: t('visitors', 'bookingReady'),
      value: stats.booking_ready,
      icon: <CalendarCheck size={24} className="text-purple-600" />,
      bg: 'bg-purple-50',
    },
    {
      title: t('visitors', 'avgLeadScore'),
      value: stats.avg_score,
      icon: <Activity size={24} className="text-green-600" />,
      bg: 'bg-green-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, i) => (
        <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${card.bg}`}>
            {card.icon}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">{card.title}</p>
            <h4 className="text-2xl font-bold text-slate-900">{card.value}</h4>
          </div>
        </div>
      ))}
    </div>
  );
}
