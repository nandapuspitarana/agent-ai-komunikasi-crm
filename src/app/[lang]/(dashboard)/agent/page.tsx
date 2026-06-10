'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { Bot, Plus, Search, MoreVertical, Edit2, Trash2, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AgentsListPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/flows');
      if (response.ok) {
        const data = await response.json();
        setAgents(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const [importing, setImporting] = useState(false);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;
    try {
      const response = await fetch(`/api/flows?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        setAgents(agents.filter(a => a.id !== id));
      } else {
        alert('Failed to delete agent');
      }
    } catch (error) {
      console.error('Error deleting agent:', error);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);

      const response = await fetch('/api/agent/flow/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jsonData),
      });

      if (response.ok) {
        alert('Agent imported successfully!');
        fetchAgents(); // Refresh the list
      } else {
        const errorData = await response.json();
        alert(`Import failed: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('Failed to parse or import the JSON file. Please ensure it is a valid Agent Export.');
    } finally {
      setImporting(false);
      // Reset the input so the same file can be selected again if needed
      e.target.value = '';
    }
  };

  return (
    <div className="min-h-full bg-slate-50 p-6 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Bot className="text-blue-600" /> AI Agents
            </h1>
            <p className="text-slate-500 mt-1">Manage and monitor your agents.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className={`flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200 transition-all shadow-sm cursor-pointer ${importing ? 'opacity-75 cursor-not-allowed' : ''}`}>
              <span>{importing ? 'Importing...' : 'Import JSON'}</span>
              <input type="file" accept=".json" className="hidden" onChange={handleImport} disabled={importing} />
            </label>
            <Link href="/agent/builder" className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all shadow-md hover:shadow-lg">
              <Plus size={18} /> Create New Agent
            </Link>
          </div>
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
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">QnA</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created At</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Loading agents...
                  </td>
                </tr>
              ) : agents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No agents found. Click "Create New Agent" to build one!
                  </td>
                </tr>
              ) : (
                agents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-900 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                        <Bot size={16} />
                      </div>
                      {agent.name}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{agent.description || 'No description'}</td>
                    <td className="py-3 px-4 text-slate-500">
                      <span className="font-semibold text-slate-700">{agent.intents?.length || 0}</span> QnA
                    </td>
                    <td className="py-3 px-4">
                      {agent.intents?.length > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                          Draft
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{new Date(agent.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Currently builder doesn't support ?id= mapping directly from URL natively in the snippet given, but we will pass it anyway */}
                        <Link href={`/agent/builder?id=${agent.id}`} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors" title="Edit Agent">
                          <Edit2 size={16} />
                        </Link>
                        <button onClick={() => handleDelete(agent.id)} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors" title="Delete Agent">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
