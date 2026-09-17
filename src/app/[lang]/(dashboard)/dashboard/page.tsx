'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { 
  BarChart, Users, Star, MessageSquareText, 
  ArrowUpRight, ArrowDownRight, Clock, 
  CheckCircle2, AlertCircle, Medal, Bot, Zap,
  Settings, UploadCloud, Link as LinkIcon, Plus,
  TrendingUp, Lightbulb, Loader2
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/I18nContext';

export default function DashboardOverview() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'overview' | 'rating' | 'ai-agent' | 'insight' | 'ai-cost'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  
  const [dashboardData, setDashboardData] = useState<{
    stats: { totalChats: number, resolvedChats: number, pendingChats: number, inProgressChats: number },
    csat: { average: string, totalReviews: number, distribution: { stars: number, percentage: number }[] },
    recentRatings: any[],
    agentLeaderboard: any[],
    aiStats: any,
    recentAiReplies: any[],
    insights: any
  } | null>(null);

  const [aiCostData, setAiCostData] = useState<any>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/dashboard/stats');
        if (res.ok) {
          const data = await res.json();
          setDashboardData(data);
        }
        
        const costRes = await fetch('/api/dashboard/ai-cost?days=7');
        if (costRes.ok) {
          const costData = await costRes.json();
          setAiCostData(costData);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  // Overview Data (Real data where available)
  const overviewStats = [
    { name: t('dashboard', 'totalChats'), value: dashboardData?.stats.totalChats || 0, change: '+12%', isPositive: true, icon: MessageSquareText },
    { name: t('dashboard', 'resolvedChats'), value: dashboardData?.stats.resolvedChats || 0, change: '+18%', isPositive: true, icon: CheckCircle2 },
    { name: t('dashboard', 'inProgressChats'), value: dashboardData?.stats.inProgressChats || 0, change: '+5%', isPositive: true, icon: Users },
    { name: t('dashboard', 'pendingChats'), value: dashboardData?.stats.pendingChats || 0, change: '-2%', isPositive: true, icon: Clock },
    { name: t('dashboard', 'avgCsat'), value: dashboardData?.csat.average || '0.0', change: '+0.2', isPositive: true, icon: Star },
    { name: t('dashboard', 'totalReviews'), value: dashboardData?.csat.totalReviews || 0, change: '+10%', isPositive: true, icon: Star },
  ];

  // Pie Chart Data
  const chatStatus = {
    resolved: { count: dashboardData?.stats.resolvedChats || 0, color: 'bg-green-500' },
    pending: { count: dashboardData?.stats.pendingChats || 0, color: 'bg-amber-500' },
    inProgress: { count: dashboardData?.stats.inProgressChats || 0, color: 'bg-brand-light' }
  };
  const totalChats = (dashboardData?.stats.totalChats || 0) > 0 ? dashboardData!.stats.totalChats : 1; // Prevent division by zero

  // Rating Data
  const csatOverview = dashboardData?.csat || {
    average: '0.0',
    totalReviews: 0,
    distribution: [
      { stars: 5, percentage: 0 },
      { stars: 4, percentage: 0 },
      { stars: 3, percentage: 0 },
      { stars: 2, percentage: 0 },
      { stars: 1, percentage: 0 },
    ]
  };

  const recentRatings = dashboardData?.recentRatings || [];

  const agentLeaderboard = dashboardData?.agentLeaderboard && dashboardData.agentLeaderboard.length > 0 ? dashboardData.agentLeaderboard : [
    { id: 1, name: 'Agent Sarah', score: '4.9', resolved: 145, avatar: 'S' },
    { id: 2, name: 'Agent John', score: '4.8', resolved: 132, avatar: 'J' },
    { id: 3, name: 'AI Bot', score: '4.5', resolved: 540, avatar: 'B' },
  ];

  // AI Agent Data
  const aiStats = [
    { name: 'AI Avg. CSAT', value: dashboardData?.aiStats?.avgCsat || '0.0', change: '+0.1', isPositive: true, icon: Star },
    { name: 'AI Resolves', value: dashboardData?.aiStats?.resolvedChats || '0', change: '+10%', isPositive: true, icon: CheckCircle2 },
    { name: 'Effectiveness Index', value: dashboardData?.aiStats?.effectiveness || '0%', change: '+5%', isPositive: true, icon: Zap },
    { name: 'Total Time Saved', value: dashboardData?.aiStats?.timeSaved || '0 hrs', change: '+12 hrs', isPositive: true, icon: Clock },
  ];

  const recentAiReplies = dashboardData?.recentAiReplies && dashboardData.recentAiReplies.length > 0 ? dashboardData.recentAiReplies : [];

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('dashboard', 'title')}</h1>
          <p className="text-slate-500">{t('dashboard', 'subtitle')}</p>
        </div>
        
        {/* Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl w-fit flex-wrap">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'overview' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t('dashboard', 'tabOverview')}
          </button>
          <button 
            onClick={() => setActiveTab('rating')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'rating' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t('dashboard', 'tabRating')}
          </button>
          <button 
            onClick={() => setActiveTab('ai-agent')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'ai-agent' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Bot size={16} /> {t('dashboard', 'tabAiAgent')}
          </button>
          <button 
            onClick={() => setActiveTab('insight')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'insight' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Lightbulb size={16} /> {t('dashboard', 'tabInsight')}
          </button>
          <button 
            onClick={() => setActiveTab('ai-cost')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'ai-cost' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <BarChart size={16} /> AI Cost & Evals
          </button>
        </div>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {isLoading ? (
            <div className="flex justify-center items-center h-64 text-slate-400">
              <Loader2 className="animate-spin w-8 h-8 mr-3 text-brand-light" /> {t('dashboard', 'loadingStats')}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {overviewStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.name} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-brand-bg text-brand flex items-center justify-center">
                      <Icon size={20} />
                    </div>
                    <div className={`flex items-center gap-1 text-sm font-medium ${stat.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {stat.isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                      {stat.change}
                    </div>
                  </div>
                  <h3 className="text-slate-500 text-sm font-medium mb-1">{stat.name}</h3>
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 mb-6">{t('dashboard', 'chatStatusDist')}</h2>
              <div className="h-6 w-full flex rounded-full overflow-hidden mb-6">
                <div style={{ width: `${(chatStatus.resolved.count / totalChats) * 100}%` }} className={chatStatus.resolved.color} title={t('dashboard', 'resolved')}></div>
                <div style={{ width: `${(chatStatus.inProgress.count / totalChats) * 100}%` }} className={chatStatus.inProgress.color} title={t('dashboard', 'inProgress')}></div>
                <div style={{ width: `${(chatStatus.pending.count / totalChats) * 100}%` }} className={chatStatus.pending.color} title={t('dashboard', 'pending')}></div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${chatStatus.resolved.color}`}></div>
                    <span className="font-medium text-slate-700">{t('dashboard', 'resolved')}</span>
                  </div>
                  <span className="font-bold text-slate-900">{chatStatus.resolved.count}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${chatStatus.inProgress.color}`}></div>
                    <span className="font-medium text-slate-700">{t('dashboard', 'inProgress')}</span>
                  </div>
                  <span className="font-bold text-slate-900">{chatStatus.inProgress.count}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${chatStatus.pending.color}`}></div>
                    <span className="font-medium text-slate-700">{t('dashboard', 'pending')}</span>
                  </div>
                  <span className="font-bold text-slate-900">{chatStatus.pending.count}</span>
                </div>
              </div>
            </div>
          </div>
          </>
          )}
        </div>
      )}

      {/* RATING TAB */}
      {activeTab === 'rating' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {isLoading ? (
            <div className="flex justify-center items-center h-64 text-slate-400">
              <Loader2 className="animate-spin w-8 h-8 mr-3 text-brand-light" /> {t('dashboard', 'loadingRating')}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-1 flex flex-col">
              <h2 className="text-lg font-bold text-slate-900 mb-6">{t('dashboard', 'csatOverview')}</h2>
              <div className="flex items-center gap-4 mb-8">
                <div className="text-5xl font-extrabold text-slate-900">{csatOverview.average}</div>
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star key={star} size={18} className={star <= 4 ? "text-amber-400 fill-amber-400" : "text-amber-400/30 fill-amber-400/30"} />
                    ))}
                  </div>
                  <div className="text-sm text-slate-500">{t('dashboard', 'basedOn')} {csatOverview.totalReviews} {t('dashboard', 'reviews')}</div>
                </div>
              </div>
              <div className="space-y-3 flex-1">
                {csatOverview.distribution.map((item) => (
                  <div key={item.stars} className="flex items-center gap-3">
                    <div className="text-sm font-medium text-slate-600 w-4">{item.stars}</div>
                    <Star size={12} className="text-slate-400" />
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400" style={{ width: `${item.percentage}%` }}></div>
                    </div>
                    <div className="text-xs text-slate-500 w-8 text-right">{item.percentage}%</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 lg:col-span-2 overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">{t('dashboard', 'agentLeaderboard')}</h2>
                <Medal size={20} className="text-brand-light" />
              </div>
              <div className="p-6 flex-1 overflow-auto">
                <div className="space-y-4">
                  {agentLeaderboard.map((agent, idx) => (
                    <div key={agent.id} className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="w-8 text-center font-bold text-slate-400">#{idx + 1}</div>
                      <div className="w-10 h-10 rounded-full bg-brand-bg text-brand-hover flex items-center justify-center font-bold">
                        {agent.avatar}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-900">{agent.name}</h4>
                        <p className="text-xs text-slate-500">{agent.resolved} {t('dashboard', 'chatsResolved')}</p>
                      </div>
                      <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg shadow-sm">
                        <Star size={16} className="text-amber-400 fill-amber-400" />
                        <span className="font-bold text-slate-900">{agent.score}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">{t('dashboard', 'recentRatings')}</h2>
              <button className="text-sm font-medium text-brand hover:text-brand-hover">{t('dashboard', 'viewAll')}</button>
            </div>
            <div className="divide-y divide-slate-100">
              {recentRatings.length > 0 ? recentRatings.map((rating) => (
                <div key={rating.id} className="p-6 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold shrink-0">
                    {rating.user.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-slate-900">{rating.user}</h4>
                      <span className="text-xs text-slate-400">{rating.time}</span>
                    </div>
                    <div className="flex items-center gap-1 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={14} className={i < rating.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'} />
                      ))}
                      <span className="text-xs ml-2 text-slate-500 capitalize px-2 py-0.5 bg-slate-100 rounded-full">{rating.channel}</span>
                    </div>
                    <p className="text-sm text-slate-600">{rating.comment}</p>
                  </div>
                </div>
              )) : (
                <div className="p-6 text-center text-slate-500">{t('dashboard', 'noReviews')}</div>
              )}
            </div>
          </div>
          </>
          )}
        </div>
      )}

      {/* AI AGENT TAB */}
      {activeTab === 'ai-agent' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* AI Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {aiStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.name} className="bg-gradient-to-br from-brand-bg to-blue-50 p-6 rounded-2xl shadow-sm border border-brand/20 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-white text-brand flex items-center justify-center shadow-sm">
                      <Icon size={20} />
                    </div>
                    <div className={`flex items-center gap-1 text-sm font-medium ${stat.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {stat.isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                      {stat.change}
                    </div>
                  </div>
                  <h3 className="text-indigo-900/60 text-sm font-medium mb-1">{stat.name}</h3>
                  <p className="text-2xl font-bold text-indigo-900">{stat.value}</p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Custom AI Agent Builder */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 lg:col-span-2 overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Settings size={20} className="text-brand-light" /> {t('dashboard', 'customAiBuilder')}
                </h2>
                <button className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-hover">
                  <Plus size={16} /> {t('dashboard', 'createAgent')}
                </button>
              </div>
              <div className="p-6">
                <form className="space-y-6">
                  {/* Name & Role */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t('dashboard', 'agentName')}</label>
                      <input type="text" placeholder="e.g., Technical Support Bot" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t('dashboard', 'handoffLogic')}</label>
                      <select className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand outline-none bg-white">
                        <option>{t('dashboard', 'aiResolves')}</option>
                        <option>{t('dashboard', 'humanBusinessHours')}</option>
                        <option>{t('dashboard', 'strictlyAi')}</option>
                      </select>
                    </div>
                  </div>

                  {/* System Prompt */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('dashboard', 'systemPrompt')}</label>
                    <textarea rows={3} placeholder="You are a helpful customer support agent for..." className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand outline-none resize-none"></textarea>
                  </div>

                  {/* Knowledge Base */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">{t('dashboard', 'kbContext')}</label>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1 border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-50 cursor-pointer transition-colors">
                        <UploadCloud size={24} className="mb-2 text-brand-light" />
                        <span className="text-sm">{t('dashboard', 'uploadPdfTxt')}</span>
                      </div>
                      <div className="flex-1 border border-slate-200 rounded-xl p-4 flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-2 text-slate-700">
                          <LinkIcon size={16} /> <span className="text-sm font-medium">{t('dashboard', 'crawlUrl')}</span>
                        </div>
                        <input type="url" placeholder="https://yourwebsite.com" className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-sm outline-none" />
                      </div>
                    </div>
                  </div>

                  {/* QnA */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('dashboard', 'customQna')}</label>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input type="text" placeholder={t('dashboard', 'question')} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none" />
                        <input type="text" placeholder={t('dashboard', 'answer')} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none" />
                      </div>
                      <button type="button" className="text-sm text-brand font-medium hover:text-brand-hover flex items-center gap-1 mt-2">
                        <Plus size={14} /> {t('dashboard', 'addAnother')}
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button type="button" className="bg-slate-900 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-slate-800">
                      {t('dashboard', 'saveAgent')}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Recent AI Replies */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 lg:col-span-1 overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">{t('dashboard', 'recentAiReplies')}</h2>
                <span className="flex items-center gap-2 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {t('dashboard', 'liveMonitoring')}
                </span>
              </div>
              <div className="divide-y divide-slate-100 overflow-auto flex-1">
                {recentAiReplies.map((reply) => (
                  <div key={reply.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 bg-brand-bg text-brand-hover rounded-md">{reply.agent}</span>
                        <span className="text-xs text-slate-500">to {reply.user}</span>
                      </div>
                      <span className="text-xs text-slate-400">{reply.time}</span>
                    </div>
                    <p className="text-sm text-slate-700 bg-slate-100 p-3 rounded-xl rounded-tl-sm inline-block">
                      {reply.message}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INSIGHT TAB */}
      {activeTab === 'insight' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Common Issues Extraction */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Lightbulb size={20} className="text-amber-500" /> {t('dashboard', 'topCommonIssues')}
                </h2>
                <select className="text-sm font-medium text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 outline-none">
                  <option>{t('dashboard', 'last30Days')}</option>
                  <option>Last 7 Days</option>
                  <option>Today</option>
                </select>
              </div>
              <div className="p-6">
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-6 flex gap-3">
                  <div className="mt-0.5"><Lightbulb size={18} className="text-amber-500" /></div>
                  <p className="text-sm text-amber-800">
                    {t('dashboard', 'aiAnalyzed').replace('conversations', ` ${totalChats} ${t('dashboard', 'conversations')} `)}
                  </p>
                </div>
              
              <div className="space-y-4">
                {(dashboardData?.insights?.commonIssues || [
                  { issue: 'Password Reset & Login', freq: '35%', count: 436, sentiment: 'Neutral' },
                  { issue: 'Billing / Subscription Upgrade', freq: '22%', count: 274, sentiment: 'Positive' },
                  { issue: 'Integration (WhatsApp/API)', freq: '18%', count: 224, sentiment: 'Negative' },
                  { issue: 'Custom AI Agent Configuration', freq: '15%', count: 187, sentiment: 'Neutral' },
                  { issue: 'Other / General Questions', freq: '10%', count: 127, sentiment: 'Neutral' },
                ]).map((item: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-xl border border-slate-100 bg-slate-50">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-semibold text-slate-800">{item.issue}</h4>
                      <span className="font-bold text-slate-900">{item.freq}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 mb-3">
                      <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: item.freq }}></div>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>{item.count} {t('dashboard', 'conversations')}</span>
                      <span className={`px-2 py-0.5 rounded-full ${
                        item.sentiment === 'Negative' ? 'bg-red-100 text-red-600' :
                        item.sentiment === 'Positive' ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {item.sentiment} {t('dashboard', 'sentiment')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

            {/* Actionable Insights */}
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-6 rounded-2xl shadow-sm text-white">
                <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                  <Lightbulb size={20} className="text-yellow-400" /> {t('dashboard', 'actionableInsights')}
                </h2>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3 bg-white/10 p-3 rounded-lg border border-white/5">
                    <span className="w-6 h-6 rounded-full bg-yellow-400/20 text-yellow-400 flex items-center justify-center shrink-0 font-bold text-xs">1</span>
                    <p className="text-sm text-slate-200 leading-relaxed">
                      <strong>High volume of Login issues:</strong> Consider adding a self-service password reset flow directly into the chat widget using the Visual Flow Builder.
                    </p>
                  </li>
                  <li className="flex items-start gap-3 bg-white/10 p-3 rounded-lg border border-white/5">
                    <span className="w-6 h-6 rounded-full bg-brand/20 text-brand-light flex items-center justify-center shrink-0 font-bold text-xs">2</span>
                    <p className="text-sm text-slate-200 leading-relaxed">
                      <strong>Negative sentiment on Integrations:</strong> Users struggle with WhatsApp API keys. Updating the "Knowledge Base" document for the SupportBot could resolve 40% of these queries instantly.
                    </p>
                  </li>
                </ul>
              </div>

              {/* Emerging Topics */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h2 className="text-lg font-bold text-slate-900 mb-4">{t('dashboard', 'emergingTopics')}</h2>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1.5 bg-brand-bg text-brand-hover rounded-lg text-sm font-medium border border-brand/20">"Shopify Plugin" <span className="text-xs text-brand-light ml-1">+45%</span></span>
                  <span className="px-3 py-1.5 bg-slate-50 text-slate-700 rounded-lg text-sm font-medium border border-slate-200">"Multi-agent handoff"</span>
                  <span className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm font-medium border border-red-100">"Slow widget load" <span className="text-xs text-red-400 ml-1">+12%</span></span>
                  <span className="px-3 py-1.5 bg-slate-50 text-slate-700 rounded-lg text-sm font-medium border border-slate-200">"Custom CSS"</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
      {/* AI COST TAB */}
      {activeTab === 'ai-cost' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {isLoading || !aiCostData ? (
            <div className="flex justify-center items-center h-64 text-slate-400">
              <Loader2 className="animate-spin w-8 h-8 mr-3 text-brand-light" /> Loading Observability Data...
            </div>
          ) : (
            <>
              {/* Cards Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                  <h3 className="text-slate-500 text-sm font-medium mb-1">Total Tokens Used</h3>
                  <p className="text-2xl font-bold text-slate-900">{aiCostData.cost_summary.total_tokens.toLocaleString()}</p>
                  <div className="text-xs text-slate-400 mt-2">
                    In: {aiCostData.cost_summary.total_input_tokens.toLocaleString()} | Out: {aiCostData.cost_summary.total_output_tokens.toLocaleString()}
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                  <h3 className="text-slate-500 text-sm font-medium mb-1">Estimated Cost</h3>
                  <p className="text-2xl font-bold text-emerald-600">${aiCostData.cost_summary.estimated_cost_usd.toFixed(2)}</p>
                  <div className="text-xs text-slate-400 mt-2">Based on OpenAI pricing</div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                  <h3 className="text-slate-500 text-sm font-medium mb-1">Total AI Requests</h3>
                  <p className="text-2xl font-bold text-slate-900">{aiCostData.request_stats.total_requests.toLocaleString()}</p>
                  <div className="text-xs text-slate-400 mt-2">Last 7 days</div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                  <h3 className="text-slate-500 text-sm font-medium mb-1">Avg Response Time</h3>
                  <p className="text-2xl font-bold text-slate-900">{aiCostData.request_stats.avg_latency_ms} <span className="text-sm text-slate-500">ms</span></p>
                  <div className="text-xs text-slate-400 mt-2">p95: {aiCostData.request_stats.p95_latency_ms} ms</div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Cost by Model */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-1">
                  <h2 className="text-lg font-bold text-slate-900 mb-6">Cost by Model</h2>
                  <div className="space-y-4">
                    {aiCostData.cost_summary.by_model.map((m: any) => (
                      <div key={m.model} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold text-slate-800">{m.model}</span>
                          <span className="font-bold text-emerald-600">${m.cost_usd.toFixed(4)}</span>
                        </div>
                        <div className="text-xs text-slate-500 flex justify-between">
                          <span>In: {m.input_tokens.toLocaleString()}</span>
                          <span>Out: {m.output_tokens.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                    {aiCostData.cost_summary.by_model.length === 0 && (
                      <div className="text-sm text-slate-400 text-center py-4">No data available</div>
                    )}
                  </div>
                </div>

                {/* AI Quality & Evals */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2">
                  <h2 className="text-lg font-bold text-slate-900 mb-6">AI Quality Evaluation (LLM-as-a-Judge)</h2>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="p-4 bg-blue-50 rounded-xl text-center">
                      <div className="text-xs font-bold text-blue-600 mb-1 uppercase tracking-wider">Pass Rate</div>
                      <div className="text-2xl font-black text-blue-900">{Math.round(aiCostData.eval_summary.pass_rate * 100)}%</div>
                    </div>
                    <div className="p-4 bg-emerald-50 rounded-xl text-center">
                      <div className="text-xs font-bold text-emerald-600 mb-1 uppercase tracking-wider">Avg Score</div>
                      <div className="text-2xl font-black text-emerald-900">{(aiCostData.eval_summary.avg_score * 100).toFixed(1)}/100</div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl text-center">
                      <div className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Evaluated</div>
                      <div className="text-2xl font-black text-slate-800">{aiCostData.eval_summary.total_evaluated}</div>
                    </div>
                    <div className="p-4 bg-red-50 rounded-xl text-center">
                      <div className="text-xs font-bold text-red-600 mb-1 uppercase tracking-wider">Failed</div>
                      <div className="text-2xl font-black text-red-900">{aiCostData.eval_summary.fail_count}</div>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-slate-700 mb-3">Score by Dimension</h3>
                  <div className="space-y-3">
                    {['faithfulness', 'relevance', 'coherence'].map((dim) => {
                      const val = aiCostData.eval_summary.by_dimension[dim] * 100;
                      return (
                        <div key={dim} className="flex items-center gap-3">
                          <div className="w-24 text-sm font-medium text-slate-600 capitalize">{dim}</div>
                          <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-brand" style={{ width: `${val}%` }}></div>
                          </div>
                          <div className="w-12 text-right text-sm font-bold text-slate-700">{val.toFixed(0)}%</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* RAG & Request Stats */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <h2 className="text-lg font-bold text-slate-900 mb-4">RAG Performance</h2>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 border border-slate-100 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Total RAG Queries</span>
                      <span className="font-bold text-slate-900">{aiCostData.rag_stats.total_rag_queries}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 border border-slate-100 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Avg Chunks Retrieved</span>
                      <span className="font-bold text-slate-900">{aiCostData.rag_stats.avg_chunks_retrieved}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 border border-slate-100 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Avg Similarity Score</span>
                      <span className="font-bold text-slate-900">{aiCostData.rag_stats.avg_similarity.toFixed(2)}</span>
                    </div>
                    
                    <div className="pt-4">
                      <h3 className="text-sm font-bold text-slate-700 mb-3">Backend Usage</h3>
                      <div className="flex gap-2">
                        {Object.entries(aiCostData.rag_stats.by_backend).map(([be, count]: [string, any]) => (
                          <div key={be} className="flex-1 p-3 bg-slate-50 rounded-lg text-center border border-slate-100">
                            <div className="text-xs text-slate-500 uppercase">{be}</div>
                            <div className="text-lg font-bold text-brand">{count}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <h2 className="text-lg font-bold text-slate-900 mb-4">Request Types</h2>
                  <div className="space-y-3">
                    {Object.entries(aiCostData.request_stats.by_type).sort((a: any, b: any) => b[1] - a[1]).map(([type, count]: [string, any]) => {
                      const total = aiCostData.request_stats.total_requests || 1;
                      const pct = (count / total) * 100;
                      return (
                        <div key={type} className="flex items-center gap-3">
                          <div className="w-24 text-sm font-medium text-slate-600">{type}</div>
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-slate-800" style={{ width: `${pct}%` }}></div>
                          </div>
                          <div className="w-10 text-right text-sm font-bold text-slate-900">{count}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Recent Traces Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                  <h2 className="text-lg font-bold text-slate-900">Recent AI Traces</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200">
                        <th className="p-4">Time</th>
                        <th className="p-4 w-1/3">User Message</th>
                        <th className="p-4">Intent</th>
                        <th className="p-4">Model</th>
                        <th className="p-4 text-right">Tokens</th>
                        <th className="p-4 text-right">Latency</th>
                        <th className="p-4 text-center">Eval</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {aiCostData.recent_traces.map((trace: any) => (
                        <tr key={trace.id} className="hover:bg-slate-50/50">
                          <td className="p-4 text-slate-500 whitespace-nowrap">
                            {new Date(trace.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </td>
                          <td className="p-4 text-slate-800 truncate max-w-[200px]" title={trace.user_message}>
                            {trace.user_message || <span className="text-slate-400 italic">No message</span>}
                          </td>
                          <td className="p-4">
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-medium">
                              {trace.intent_classified || 'N/A'}
                            </span>
                          </td>
                          <td className="p-4 text-slate-600">{trace.model_name || '-'}</td>
                          <td className="p-4 text-right font-medium text-slate-700">
                            {(trace.input_tokens || 0) + (trace.output_tokens || 0)}
                          </td>
                          <td className="p-4 text-right text-slate-600">
                            {trace.latency_ms ? `${trace.latency_ms}ms` : '-'}
                          </td>
                          <td className="p-4 text-center">
                            {trace.eval_label ? (
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                trace.eval_label === 'pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {trace.eval_label.toUpperCase()}
                              </span>
                            ) : '-'}
                          </td>
                        </tr>
                      ))}
                      {aiCostData.recent_traces.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400">No traces available yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

    </div>
  );
}
