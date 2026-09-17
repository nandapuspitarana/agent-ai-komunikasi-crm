'use client';

import React from 'react';
import { List, GitMerge, Plus, Trash2, ChevronRight } from 'lucide-react';
import { ReactFlow, Background, Controls, BackgroundVariant } from '@xyflow/react';
import AgentPersonaConfig from './AgentPersonaConfig';
import WelcomeMessageConfig from './WelcomeMessageConfig';
import FallbackConfig from './FallbackConfig';

interface IntentListViewProps {
  faqView: 'list' | 'flow';
  setFaqView: (view: 'list' | 'flow') => void;
  agentConfig: any;
  setAgentConfig: React.Dispatch<React.SetStateAction<any>>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  intents: any[];
  onSelectIntent: (id: string) => void;
  onAddIntent: () => void;
  onRemoveIntent: (id: string, e: React.MouseEvent) => void;
  nodes: any[];
  edges: any[];
  nodeTypes: any;
  onNodesChange: any;
}

export const IntentListView: React.FC<IntentListViewProps> = ({
  faqView,
  setFaqView,
  agentConfig,
  setAgentConfig,
  searchQuery,
  setSearchQuery,
  intents,
  onSelectIntent,
  onAddIntent,
  onRemoveIntent,
  nodes,
  edges,
  nodeTypes,
  onNodesChange,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex-1 flex flex-col min-h-[600px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-slate-700 font-medium text-base">Intents & Dialogue Map</p>
          <p className="text-slate-500 text-sm mt-1">Manage multiple intents. Group questions into one response logic.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setFaqView('list')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              faqView === 'list' ? 'bg-white text-brand shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <List size={16} /> List
          </button>
          <button
            onClick={() => setFaqView('flow')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              faqView === 'flow' ? 'bg-white text-brand shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <GitMerge size={16} /> Flow
          </button>
        </div>
      </div>

      {faqView === 'list' ? (
        <div className="space-y-3 overflow-y-auto w-full">
          {/* AI Persona */}
          <AgentPersonaConfig agentConfig={agentConfig} setAgentConfig={setAgentConfig} />

          {/* Welcome Message */}
          <WelcomeMessageConfig agentConfig={agentConfig} setAgentConfig={setAgentConfig} />

          {/* Fallback Config */}
          <FallbackConfig agentConfig={agentConfig} setAgentConfig={setAgentConfig} />

          {/* Search & Add Intent */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search intents by name, phrase, or response..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-light outline-none text-sm bg-white"
              />
              <div className="absolute left-3 top-2.5 text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>
            </div>
            <button
              onClick={onAddIntent}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-brand-bg text-brand rounded-lg text-sm font-medium hover:bg-brand-bg transition-colors shrink-0"
            >
              <Plus size={16} /> Add Intent
            </button>
          </div>

          {/* Intent Cards */}
          {intents
            .filter(
              (intent) =>
                !searchQuery ||
                intent.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                intent.trainingPhrases?.some((p: string) => p.toLowerCase().includes(searchQuery.toLowerCase())) ||
                intent.answer?.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map((intent) => (
              <div
                key={intent.id}
                onClick={() => onSelectIntent(intent.id)}
                className="flex items-center justify-between p-4 border border-slate-200 bg-white hover:border-brand/30 hover:shadow-md cursor-pointer rounded-xl transition-all group"
              >
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-800 text-sm mb-1">{intent.name}</h4>
                  <p className="text-xs text-slate-500 line-clamp-1">
                    <span className="font-medium text-orange-500">{intent.trainingPhrases?.length || 0} phrases</span> &bull; Responds with <span className="uppercase text-brand-light">{intent.answerType}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-slate-300 group-hover:text-brand-light transition-colors">
                    <ChevronRight size={20} />
                  </div>
                  <button
                    onClick={(e) => onRemoveIntent(intent.id, e)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
        </div>
      ) : (
        <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            fitView
            className="w-full h-full"
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1.5} color="#cbd5e1" />
            <Controls className="bg-white border border-slate-200 shadow-sm fill-slate-700" />
          </ReactFlow>
        </div>
      )}
    </div>
  );
};

export default IntentListView;
