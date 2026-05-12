'use client';

import React, { useState } from 'react';
import { Bot, Plus, Search, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function AgentsListPage() {
  const [agents] = useState([
    { id: 'sales_bot_01', name: 'Sales Assistant', provider: 'Gemini', status: 'Active', knowledge: '2 Docs, 1 URL' },
    { id: 'support_bot_02', name: 'Customer Support', provider: 'OpenAI', status: 'Inactive', knowledge: '5 Docs' },
    { id: 'internal_hr_01', name: 'HR Assistant', provider: 'Local', status: 'Active', knowledge: '1 Doc, 3 URLs' },
  ]);

  return (
    <div className="min-h-full bg-slate-50 p-6 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Bot className="text-blue-600" /> AI Agents
            </h1>
            <p className="text-slate-500 mt-1">Manage and monitor all your AI agents in one place.</p>
          </div>
          <Link href="/agent/builder" className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all shadow-md hover:shadow-lg">
            <Plus size={18} /> Create New Agent
          </Link>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search agents by name or ID..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* Agent List */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-600 font-medium">
                <th className="py-3 px-4">Agent Name</th>
                <th className="py-3 px-4">Agent ID</th>
                <th className="py-3 px-4">LLM Provider</th>
                <th className="py-3 px-4">Knowledge Base</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {agents.map((agent, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-medium text-slate-900 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                      <Bot size={16} />
                    </div>
                    {agent.name}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500 text-xs">{agent.id}</td>
                  <td className="py-3 px-4">{agent.provider}</td>
                  <td className="py-3 px-4 text-slate-500">{agent.knowledge}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      agent.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {agent.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href="/agent/builder" className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors">
                        <Edit2 size={16} />
                      </Link>
                      <button className="p-1.5 text-slate-400 hover:text-red-600 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {agents.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No agents found. Create one to get started!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
