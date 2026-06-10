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

export default function DashboardOverview() {
  const [activeTab, setActiveTab] = useState<'overview' | 'rating' | 'ai-agent' | 'insight'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  
  const [dashboardData, setDashboardData] = useState<{
    stats: { totalChats: number, resolvedChats: number, pendingChats: number, inProgressChats: number },
    csat: { average: string, totalReviews: number, distribution: { stars: number, percentage: number }[] },
    recentRatings: any[]
  } | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/dashboard/stats');
        if (res.ok) {
          const data = await res.json();
          setDashboardData(data);
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
    { name: 'Total Chats', value: dashboardData?.stats.totalChats || 0, change: '+12%', isPositive: true, icon: MessageSquareText },
    { name: 'Resolved Chats', value: dashboardData?.stats.resolvedChats || 0, change: '+18%', isPositive: true, icon: CheckCircle2 },
    { name: 'In Progress Chats', value: dashboardData?.stats.inProgressChats || 0, change: '+5%', isPositive: true, icon: Users },
    { name: 'Pending Chats', value: dashboardData?.stats.pendingChats || 0, change: '-2%', isPositive: true, icon: Clock },
    { name: 'Avg. CSAT Score', value: dashboardData?.csat.average || '0.0', change: '+0.2', isPositive: true, icon: Star },
    { name: 'Total Reviews', value: dashboardData?.csat.totalReviews || 0, change: '+10%', isPositive: true, icon: Star },
  ];

  // Pie Chart Data
  const chatStatus = {
    resolved: { count: dashboardData?.stats.resolvedChats || 0, color: 'bg-green-500' },
    pending: { count: dashboardData?.stats.pendingChats || 0, color: 'bg-amber-500' },
    inProgress: { count: dashboardData?.stats.inProgressChats || 0, color: 'bg-blue-500' }
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

  const agentLeaderboard = [
    { id: 1, name: 'Agent Sarah', score: '4.9', resolved: 145, avatar: 'S' },
    { id: 2, name: 'Agent John', score: '4.8', resolved: 132, avatar: 'J' },
    { id: 3, name: 'AI Bot', score: '4.5', resolved: 540, avatar: 'B' },
  ];

  // AI Agent Data
  const aiStats = [
    { name: 'AI Avg. CSAT', value: '4.7/5.0', change: '+0.1', isPositive: true, icon: Star },
    { name: 'AI Avg. Resolution Time', value: '1m 05s', change: '-30s', isPositive: true, icon: Clock },
    { name: 'Effectiveness Index', value: '88%', change: '+5%', isPositive: true, icon: Zap },
    { name: 'Total Time Saved', value: '120 hrs', change: '+12 hrs', isPositive: true, icon: Clock },
  ];

  const recentAiReplies = [
    { id: 1, agent: 'SupportBot', user: 'Mike', message: 'I can help you reset your password. Please follow this link...', time: '5 mins ago' },
    { id: 2, agent: 'SalesBot', user: 'Anna', message: 'Our Pro plan includes unlimited AI agents and custom branding.', time: '12 mins ago' },
    { id: 3, agent: 'TechBot', user: 'David', message: 'Error 404 usually means the URL is incorrect. Have you checked the spelling?', time: '30 mins ago' },
  ];

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500">Monitor your agent performance and client satisfaction.</p>
        </div>
        
        {/* Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'overview' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('rating')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'rating' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Rating & CSAT
          </button>
          <button 
            onClick={() => setActiveTab('ai-agent')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'ai-agent' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Bot size={16} /> AI Agent
          </button>
          <button 
            onClick={() => setActiveTab('insight')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'insight' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Lightbulb size={16} /> Insight
          </button>
        </div>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {isLoading ? (
            <div className="flex justify-center items-center h-64 text-slate-400">
              <Loader2 className="animate-spin w-8 h-8 mr-3 text-blue-500" /> Memuat data statistik...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {overviewStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.name} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
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
              <h2 className="text-lg font-bold text-slate-900 mb-6">Chat Status Distribution</h2>
              <div className="h-6 w-full flex rounded-full overflow-hidden mb-6">
                <div style={{ width: `${(chatStatus.resolved.count / totalChats) * 100}%` }} className={chatStatus.resolved.color} title="Resolved"></div>
                <div style={{ width: `${(chatStatus.inProgress.count / totalChats) * 100}%` }} className={chatStatus.inProgress.color} title="In Progress"></div>
                <div style={{ width: `${(chatStatus.pending.count / totalChats) * 100}%` }} className={chatStatus.pending.color} title="Pending"></div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${chatStatus.resolved.color}`}></div>
                    <span className="font-medium text-slate-700">Resolved</span>
                  </div>
                  <span className="font-bold text-slate-900">{chatStatus.resolved.count}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${chatStatus.inProgress.color}`}></div>
                    <span className="font-medium text-slate-700">In Progress</span>
                  </div>
                  <span className="font-bold text-slate-900">{chatStatus.inProgress.count}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${chatStatus.pending.color}`}></div>
                    <span className="font-medium text-slate-700">Pending</span>
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
              <Loader2 className="animate-spin w-8 h-8 mr-3 text-blue-500" /> Memuat data rating...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-1 flex flex-col">
              <h2 className="text-lg font-bold text-slate-900 mb-6">CSAT Overview</h2>
              <div className="flex items-center gap-4 mb-8">
                <div className="text-5xl font-extrabold text-slate-900">{csatOverview.average}</div>
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star key={star} size={18} className={star <= 4 ? "text-amber-400 fill-amber-400" : "text-amber-400/30 fill-amber-400/30"} />
                    ))}
                  </div>
                  <div className="text-sm text-slate-500">Based on {csatOverview.totalReviews} reviews</div>
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
                <h2 className="text-lg font-bold text-slate-900">Agent Leaderboard</h2>
                <Medal size={20} className="text-blue-500" />
              </div>
              <div className="p-6 flex-1 overflow-auto">
                <div className="space-y-4">
                  {agentLeaderboard.map((agent, idx) => (
                    <div key={agent.id} className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="w-8 text-center font-bold text-slate-400">#{idx + 1}</div>
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                        {agent.avatar}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-900">{agent.name}</h4>
                        <p className="text-xs text-slate-500">{agent.resolved} chats resolved</p>
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
              <h2 className="text-lg font-bold text-slate-900">Recent Customer Ratings</h2>
              <button className="text-sm font-medium text-blue-600 hover:text-blue-700">View all</button>
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
                <div className="p-6 text-center text-slate-500">Belum ada review.</div>
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
                <div key={stat.name} className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-2xl shadow-sm border border-blue-100 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-white text-blue-600 flex items-center justify-center shadow-sm">
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
                  <Settings size={20} className="text-blue-500" /> Custom AI Agent Builder
                </h2>
                <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                  <Plus size={16} /> Create Agent
                </button>
              </div>
              <div className="p-6">
                <form className="space-y-6">
                  {/* Name & Role */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Agent Name</label>
                      <input type="text" placeholder="e.g., Technical Support Bot" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Handoff Logic</label>
                      <select className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                        <option>AI Resolves, fallback to Human</option>
                        <option>Human only during business hours</option>
                        <option>Strictly AI</option>
                      </select>
                    </div>
                  </div>

                  {/* System Prompt */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">System Prompt (AI Persona)</label>
                    <textarea rows={3} placeholder="You are a helpful customer support agent for..." className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"></textarea>
                  </div>

                  {/* Knowledge Base */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Knowledge Base (Context)</label>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1 border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-50 cursor-pointer transition-colors">
                        <UploadCloud size={24} className="mb-2 text-blue-500" />
                        <span className="text-sm">Upload Document (PDF/TXT)</span>
                      </div>
                      <div className="flex-1 border border-slate-200 rounded-xl p-4 flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-2 text-slate-700">
                          <LinkIcon size={16} /> <span className="text-sm font-medium">Crawl Website URL</span>
                        </div>
                        <input type="url" placeholder="https://yourwebsite.com" className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-sm outline-none" />
                      </div>
                    </div>
                  </div>

                  {/* QnA */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Custom Q&A Pairs</label>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input type="text" placeholder="Question?" className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none" />
                        <input type="text" placeholder="Answer..." className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none" />
                      </div>
                      <button type="button" className="text-sm text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1 mt-2">
                        <Plus size={14} /> Add another
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button type="button" className="bg-slate-900 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-slate-800">
                      Save Agent
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Recent AI Replies */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 lg:col-span-1 overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-900">Recent AI Replies</h2>
                <p className="text-sm text-slate-500">Live monitoring of bot activity</p>
              </div>
              <div className="divide-y divide-slate-100 overflow-auto flex-1">
                {recentAiReplies.map((reply) => (
                  <div key={reply.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md">{reply.agent}</span>
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
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp size={20} className="text-purple-500" /> Top Common Issues
                </h2>
                <span className="text-xs font-medium bg-purple-100 text-purple-700 px-2 py-1 rounded-md">Last 30 Days</span>
              </div>
              <p className="text-sm text-slate-500 mb-6">
                AI has analyzed 1,248 conversations to extract the most frequently mentioned user issues.
              </p>
              
              <div className="space-y-4">
                {[
                  { issue: 'Password Reset & Login', freq: '35%', count: 436, sentiment: 'Neutral' },
                  { issue: 'Billing / Subscription Upgrade', freq: '22%', count: 274, sentiment: 'Positive' },
                  { issue: 'Integration (WhatsApp/API)', freq: '18%', count: 224, sentiment: 'Negative' },
                  { issue: 'Custom AI Agent Configuration', freq: '15%', count: 187, sentiment: 'Neutral' },
                  { issue: 'Other / General Questions', freq: '10%', count: 127, sentiment: 'Neutral' },
                ].map((item, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-slate-100 bg-slate-50">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-semibold text-slate-800">{item.issue}</h4>
                      <span className="font-bold text-slate-900">{item.freq}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 mb-3">
                      <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: item.freq }}></div>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>{item.count} conversations</span>
                      <span className={`px-2 py-0.5 rounded-full ${
                        item.sentiment === 'Negative' ? 'bg-red-100 text-red-600' :
                        item.sentiment === 'Positive' ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {item.sentiment} Sentiment
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actionable Insights */}
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-6 rounded-2xl shadow-sm text-white">
                <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                  <Lightbulb size={20} className="text-yellow-400" /> Actionable Recommendations
                </h2>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3 bg-white/10 p-3 rounded-lg border border-white/5">
                    <span className="w-6 h-6 rounded-full bg-yellow-400/20 text-yellow-400 flex items-center justify-center shrink-0 font-bold text-xs">1</span>
                    <p className="text-sm text-slate-200 leading-relaxed">
                      <strong>High volume of Login issues:</strong> Consider adding a self-service password reset flow directly into the chat widget using the Visual Flow Builder.
                    </p>
                  </li>
                  <li className="flex items-start gap-3 bg-white/10 p-3 rounded-lg border border-white/5">
                    <span className="w-6 h-6 rounded-full bg-blue-400/20 text-blue-400 flex items-center justify-center shrink-0 font-bold text-xs">2</span>
                    <p className="text-sm text-slate-200 leading-relaxed">
                      <strong>Negative sentiment on Integrations:</strong> Users struggle with WhatsApp API keys. Updating the "Knowledge Base" document for the SupportBot could resolve 40% of these queries instantly.
                    </p>
                  </li>
                </ul>
              </div>

              {/* Emerging Topics */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Emerging Topics</h2>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-100">"Shopify Plugin" <span className="text-xs text-blue-400 ml-1">+45%</span></span>
                  <span className="px-3 py-1.5 bg-slate-50 text-slate-700 rounded-lg text-sm font-medium border border-slate-200">"Multi-agent handoff"</span>
                  <span className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm font-medium border border-red-100">"Slow widget load" <span className="text-xs text-red-400 ml-1">+12%</span></span>
                  <span className="px-3 py-1.5 bg-slate-50 text-slate-700 rounded-lg text-sm font-medium border border-slate-200">"Custom CSS"</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
