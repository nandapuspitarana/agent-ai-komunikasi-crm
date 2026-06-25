'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { Search, Filter } from 'lucide-react';
import VisitorStatsCards from '@/components/visitors/VisitorStatsCards';
import VisitorTable from '@/components/visitors/VisitorTable';
import VisitorDetailDrawer from '@/components/visitors/VisitorDetailDrawer';
import { useTranslation } from '@/lib/i18n/I18nContext';

export default function VisitorsPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, hot_leads: 0, booking_ready: 0, avg_score: 0 });
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [classification, setClassification] = useState('');
  const [minScore, setMinScore] = useState('');
  
  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedVisitorId, setSelectedVisitorId] = useState<string | null>(null);

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchVisitors();
  }, [debouncedSearch, classification, minScore]);

  const fetchVisitors = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (debouncedSearch) query.append('search', debouncedSearch);
      if (classification) query.append('classification', classification);
      if (minScore) query.append('minScore', minScore);

      const res = await fetch(`/api/visitors?${query.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data || []);
        if (json.stats) setStats(json.stats);
      }
    } catch (err) {
      console.error('Failed to fetch visitors', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = (id: string) => {
    setSelectedVisitorId(id);
    setDrawerOpen(true);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">{t('visitors', 'title')}</h1>
        <p className="text-slate-600 mt-2">{t('visitors', 'subtitle')}</p>
      </div>

      <VisitorStatsCards stats={stats} />

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder={t('visitors', 'searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition-all text-sm"
          />
        </div>
        
        <div className="flex gap-4 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-500" />
            <select
              value={classification}
              onChange={(e) => setClassification(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand text-sm"
            >
              <option value="">{t('visitors', 'allIntents')}</option>
              <option value="hot_lead">{t('visitors', 'hotLeads')}</option>
              <option value="booking">{t('visitors', 'booking')}</option>
              <option value="warm">{t('visitors', 'warm')}</option>
              <option value="cold">{t('visitors', 'cold')}</option>
              <option value="support">{t('visitors', 'support')}</option>
            </select>
          </div>
          
          <select
            value={minScore}
            onChange={(e) => setMinScore(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand text-sm"
          >
            <option value="">{t('visitors', 'anyScore')}</option>
            <option value="50">{t('visitors', 'scoreGt50')}</option>
            <option value="75">{t('visitors', 'scoreGt75')}</option>
            <option value="90">{t('visitors', 'scoreGt90')}</option>
          </select>
        </div>
      </div>

      <VisitorTable 
        visitors={data} 
        isLoading={loading} 
        onViewDetail={handleViewDetail} 
      />

      <VisitorDetailDrawer 
        isOpen={drawerOpen} 
        onClose={() => setDrawerOpen(false)} 
        visitorId={selectedVisitorId} 
      />
    </div>
  );
}
