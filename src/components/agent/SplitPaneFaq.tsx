'use client';

import React from 'react';
import { List, GitMerge, Plus, Trash2, ChevronRight, MessageSquare, Bot, Search, Sparkles, Layers } from 'lucide-react';
import { ReactFlow, Background, Controls, BackgroundVariant } from '@xyflow/react';
import AgentPersonaConfig from './AgentPersonaConfig';
import WelcomeMessageConfig from './WelcomeMessageConfig';
import FallbackConfig from './FallbackConfig';
import IntentDetailView from './IntentDetailView';
import { ButtonRow } from './response-builders/QuickReplyBuilder';
import { FormFieldRow } from './response-builders/FormBuilder';

interface SplitPaneFaqProps {
  faqView: 'list' | 'flow';
  setFaqView: (view: 'list' | 'flow') => void;
  agentConfig: any;
  setAgentConfig: React.Dispatch<React.SetStateAction<any>>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  intents: any[];
  activeIntentId: string | null;
  setActiveIntentId: (id: string | null) => void;
  onAddIntent: () => void;
  onRemoveIntent: (id: string, e: React.MouseEvent) => void;
  onUpdateActiveIntent: (field: string, value: any) => void;
  handlePhraseChange: (index: number, value: string) => void;
  addPhrase: () => void;
  removePhrase: (index: number) => void;
  buttonRows: ButtonRow[];
  setButtonRows: React.Dispatch<React.SetStateAction<ButtonRow[]>>;
  formFieldRows: FormFieldRow[];
  setFormFieldRows: React.Dispatch<React.SetStateAction<FormFieldRow[]>>;
  syncButtonRowsToIntent: (rows: ButtonRow[]) => void;
  nodes: any[];
  edges: any[];
  nodeTypes: any;
  onNodesChange: any;
}

const TYPE_BADGES: Record<string, { label: string; color: string }> = {
  text: { label: 'Text', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  options: { label: 'Quick Reply', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  card: { label: 'Info Card', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  form: { label: 'Lead Form', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  handoff: { label: 'Handoff', color: 'bg-rose-50 text-rose-700 border-rose-200' },
};

export const SplitPaneFaq: React.FC<SplitPaneFaqProps> = ({
  faqView,
  setFaqView,
  agentConfig,
  setAgentConfig,
  searchQuery,
  setSearchQuery,
  intents,
  activeIntentId,
  setActiveIntentId,
  onAddIntent,
  onRemoveIntent,
  onUpdateActiveIntent,
  handlePhraseChange,
  addPhrase,
  removePhrase,
  buttonRows,
  setButtonRows,
  formFieldRows,
  setFormFieldRows,
  syncButtonRowsToIntent,
  nodes,
  edges,
  nodeTypes,
  onNodesChange,
}) => {
  const activeIntentData = intents.find((i) => i.id === activeIntentId);

  const filteredIntents = intents.filter(
    (intent) =>
      !searchQuery ||
      intent.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      intent.trainingPhrases?.some((p: string) => p.toLowerCase().includes(searchQuery.toLowerCase())) ||
      intent.answer?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300 w-full gap-3 overflow-hidden">
      {/* Sub-header with Title & View Switch */}
      <div className="flex items-center justify-between px-1 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-bg flex items-center justify-center text-brand">
            <Layers size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-slate-800 font-bold text-base">Intents & Dialogue Map</h2>
              <span className="text-[11px] font-semibold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                {intents.length} Intent{intents.length !== 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-slate-500 text-xs">Kelola respon otomatis, variasi pertanyaan, dan alur percakapan bot.</p>
          </div>
        </div>

        <div className="flex bg-slate-200/80 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setFaqView('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              faqView === 'list' ? 'bg-white text-brand shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <List size={14} /> Split View
          </button>
          <button
            type="button"
            onClick={() => setFaqView('flow')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              faqView === 'flow' ? 'bg-white text-brand shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <GitMerge size={14} /> Flow Diagram
          </button>
        </div>
      </div>

      {/* Main Container */}
      {faqView === 'list' ? (
        <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
          {/* LEFT PANE: Intent List Sidebar */}
          <div className="w-80 lg:w-96 flex-shrink-0 flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            {/* Search & Add Header */}
            <div className="p-3 border-b border-slate-200 space-y-2 bg-white flex-shrink-0">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama intent / pertanyaan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-light outline-none text-xs bg-slate-50/60 focus:bg-white transition-all"
                />
              </div>

              <button
                type="button"
                onClick={onAddIntent}
                className="w-full py-2 px-3 bg-brand hover:bg-brand-hover text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                <Plus size={14} /> Add New Intent
              </button>
            </div>

            {/* Scrollable List Body */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {/* Collapsible Global Configuration */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  Global Bot Settings
                </p>
                <AgentPersonaConfig agentConfig={agentConfig} setAgentConfig={setAgentConfig} />
                <WelcomeMessageConfig agentConfig={agentConfig} setAgentConfig={setAgentConfig} />
                <FallbackConfig agentConfig={agentConfig} setAgentConfig={setAgentConfig} />
              </div>

              {/* Intents List Items */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between px-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Custom Intents ({filteredIntents.length})
                  </p>
                </div>

                {filteredIntents.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 space-y-2">
                    <p className="text-xs">Tidak ada intent yang cocok.</p>
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="text-xs text-brand underline font-medium"
                      >
                        Reset pencarian
                      </button>
                    )}
                  </div>
                ) : (
                  filteredIntents.map((intent) => {
                    const isSelected = activeIntentId === intent.id;
                    const badge = TYPE_BADGES[intent.answerType] || TYPE_BADGES.text;
                    const firstPhrase = intent.trainingPhrases?.[0];

                    return (
                      <div
                        key={intent.id}
                        onClick={() => setActiveIntentId(intent.id)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all relative group ${
                          isSelected
                            ? 'border-brand bg-brand-bg/40 shadow-sm ring-1 ring-brand/30'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4
                              className={`text-xs font-bold line-clamp-1 ${
                                isSelected ? 'text-brand' : 'text-slate-800'
                              }`}
                            >
                              {intent.name || 'Untitled Intent'}
                            </h4>
                            {firstPhrase && (
                              <p className="text-[11px] text-slate-500 italic line-clamp-1 mt-0.5">
                                "{firstPhrase}"
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={(e) => onRemoveIntent(intent.id, e)}
                            className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all shrink-0"
                            title="Hapus intent"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${badge.color}`}
                          >
                            {badge.label}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {intent.trainingPhrases?.length || 0} phrase{intent.trainingPhrases?.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* RIGHT PANE: Intent Detail or Empty State */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {activeIntentId && activeIntentData ? (
              <IntentDetailView
                activeIntentData={activeIntentData}
                onUpdateActiveIntent={onUpdateActiveIntent}
                onBack={() => setActiveIntentId(null)}
                handlePhraseChange={handlePhraseChange}
                addPhrase={addPhrase}
                removePhrase={removePhrase}
                buttonRows={buttonRows}
                setButtonRows={setButtonRows}
                formFieldRows={formFieldRows}
                setFormFieldRows={setFormFieldRows}
                syncButtonRowsToIntent={syncButtonRowsToIntent}
              />
            ) : (
              <div className="flex-1 bg-white border border-slate-200 rounded-xl flex flex-col items-center justify-center p-8 text-center shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-brand-bg flex items-center justify-center text-brand mb-4 shadow-inner">
                  <Bot size={32} />
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1">
                  Pilih Intent untuk Mulai Mengedit
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mb-5 leading-relaxed">
                  Pilih salah satu intent dari daftar di sebelah kiri untuk melihat dan mengatur kalimat pemicu serta jenis respon bot, atau buat intent baru.
                </p>
                <button
                  type="button"
                  onClick={onAddIntent}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg text-xs font-semibold hover:bg-brand-hover shadow-sm transition-all"
                >
                  <Plus size={15} /> Buat Intent Baru
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* FLOW VIEW */
        <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden relative shadow-inner">
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

export default SplitPaneFaq;
