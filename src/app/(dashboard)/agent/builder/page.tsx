'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Save, FileText, Link as LinkIcon, Settings, Globe, HelpCircle, Plus, Trash2, ArrowLeft, Send, Bot, User, RotateCcw, GitMerge, List, MessageSquare, LayoutList, FormInput, ExternalLink, Cpu, ChevronRight, Code } from 'lucide-react';
import Link from 'next/link';
import { ReactFlow, Background, Controls, MiniMap, useNodesState, useEdgesState, BackgroundVariant, addEdge, Handle, Position, applyNodeChanges, NodeChange } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// --- Custom Nodes for React Flow ---
const QuestionNode = ({ data }: { data: any }) => {
  const phrases = data.phrases || [];
  return (
    <div className="px-4 py-3 shadow-md rounded-xl bg-white border border-l-4 border-orange-400 min-w-[200px] max-w-[280px]">
      <Handle type="target" position={Position.Left} className="w-2.5 h-2.5 bg-orange-400 border-2 border-white opacity-0" />
      <div className="flex items-center gap-1.5 mb-2 text-orange-500">
        <User size={14} />
        <span className="font-bold text-[10px] uppercase tracking-wider">{data.name || 'User Intent'}</span>
      </div>
      <div className="space-y-1.5">
        {phrases.slice(0, 3).map((p: string, i: number) => (
          <div key={i} className="text-xs bg-orange-50 text-slate-700 px-2 py-1 rounded border border-orange-100 italic">"{p}"</div>
        ))}
        {phrases.length > 3 && (
          <div className="text-[10px] text-slate-400 text-center">+{phrases.length - 3} more phrases</div>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="w-2.5 h-2.5 bg-orange-400 border-2 border-white" />
    </div>
  );
};

const AnswerNode = ({ data }: { data: any }) => {
  const answerType = data.answerType || 'text';
  const options = Array.isArray(data.options) && data.options.length > 0 ? data.options : ['Option 1', 'Option 2'];

  return (
    <div className="px-4 py-3 shadow-md rounded-xl bg-white border border-l-4 border-blue-500 min-w-[240px] max-w-[280px]">
      <Handle type="target" position={Position.Left} className="w-2.5 h-2.5 bg-blue-500 border-2 border-white" />

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-blue-600">
          <Bot size={14} />
          <span className="font-bold text-[10px] uppercase tracking-wider">Agent Answer</span>
        </div>
        <div className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase flex items-center gap-1">
          {answerType === 'text' && <MessageSquare size={10} />}
          {answerType === 'options' && <LayoutList size={10} />}
          {answerType === 'form' && <FormInput size={10} />}
          {answerType === 'card' && <ExternalLink size={10} />}
          {answerType}
        </div>
      </div>

      <div className="text-sm text-slate-600 leading-snug">{data.label || '(Empty Answer)'}</div>

      {answerType === 'options' && (
        <div className="flex flex-col gap-1.5 mt-3">
          {options.map((opt: string, i: number) => (
            <div key={i} className="text-[11px] bg-blue-50 text-blue-600 border border-blue-200 py-1.5 px-2 rounded-md text-center shadow-sm">
              {opt}
            </div>
          ))}
        </div>
      )}

      {answerType === 'form' && (
        <div className="flex flex-col gap-1.5 mt-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200 shadow-inner">
          <input disabled placeholder="Nama Lengkap" className="text-[11px] px-2 py-1.5 rounded border border-slate-200 bg-white w-full" />
          <input disabled placeholder="Nomor Telepon" className="text-[11px] px-2 py-1.5 rounded border border-slate-200 bg-white w-full" />
          <button disabled className="text-[11px] bg-blue-600 text-white py-1.5 rounded mt-1 font-medium shadow-sm">Submit Form</button>
        </div>
      )}

      {answerType === 'card' && (
        <div className="mt-3 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
          <div className="h-20 bg-slate-100 border-b border-slate-200 flex items-center justify-center text-slate-400">
            <ExternalLink size={24} className="opacity-50" />
          </div>
          <div className="p-2.5 bg-slate-50">
            <div className="text-xs font-semibold text-slate-800 leading-tight">{data.cardTitle || 'Link Card Title'}</div>
            <div className="text-[10px] text-blue-600 mt-1.5 font-medium">View Website &rarr;</div>
          </div>
        </div>
      )}

      {data.customPayload && data.customPayload.trim() !== '' && (
        <div className="mt-3 pt-2 border-t border-slate-100 text-[9px] font-mono text-slate-400 bg-slate-50 p-1.5 rounded overflow-hidden text-ellipsis whitespace-nowrap">
          {data.customPayload}
        </div>
      )}
    </div>
  );
};
// -----------------------------------

export default function AgentBuilderPage() {
  const [activeTab, setActiveTab] = useState('faq');
  const [agentConfig, setAgentConfig] = useState({
    name: 'Sales Assistant',
    agentId: 'sales_bot_01',
    llmProvider: 'gemini',
    systemPrompt: 'You are a helpful sales assistant.',
    humanPrompt: 'User says: {input}',
    language: 'id',
    speakingStyle: 'professional',
    responseLength: 'medium',
    welcomeMessage: 'Halo! Ada yang bisa saya bantu hari ini?',
    defaultFeedback: 'Apakah jawaban ini membantu?',
    urls: ['']
  });

  // --- Unified Intent State ---
  const [faqView, setFaqView] = useState<'list' | 'flow'>('list');
  const [activeIntentId, setActiveIntentId] = useState<string | null>(null); // For detailed edit view

  const [intents, setIntents] = useState([
    {
      id: '1',
      name: 'Intent: Sapaan Awal',
      trainingPhrases: ['Halo', 'Hai', 'Permisi', 'Mulai percakapan'],
      answerType: 'options',
      answer: 'Halo! Silakan pilih layanan yang Anda butuhkan:',
      options: 'Komplain, Cek Status, Promo',
      cardTitle: '',
      customPayload: ''
    },
    {
      id: '2',
      name: 'Intent: Komplain Produk',
      trainingPhrases: ['Saya ingin komplain', 'Barang rusak', 'Pesanan tidak sesuai', 'Kecewa'],
      answerType: 'form',
      answer: 'Mohon maaf atas ketidaknyamanan Anda. Silakan isi form keluhan berikut.',
      options: '',
      cardTitle: '',
      customPayload: '{"action": "trigger_complaint_form"}'
    },
    {
      id: '3',
      name: 'Intent: Cek Status',
      trainingPhrases: ['Cek status order', 'Pesanan saya sampai mana?', 'Lacak resi'],
      answerType: 'text',
      answer: 'Baik, silakan ketikkan Nomor Resi Anda.',
      options: '',
      cardTitle: '',
      customPayload: ''
    },
  ]);

  // --- Flow State derived from Intents ---
  const nodeTypes = useMemo(() => ({ question: QuestionNode, answer: AnswerNode }), []);
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);

  useEffect(() => {
    const newNodes: any[] = [];
    const newEdges: any[] = [];

    intents.forEach((intent, i) => {
      const existingQNode = nodes.find(n => n.id === `q-${intent.id}`);
      const existingANode = nodes.find(n => n.id === `a-${intent.id}`);

      newNodes.push({
        id: `q-${intent.id}`,
        position: existingQNode ? existingQNode.position : { x: 50, y: i * 250 + 50 },
        data: { name: intent.name, phrases: intent.trainingPhrases },
        type: 'question',
      });

      newNodes.push({
        id: `a-${intent.id}`,
        position: existingANode ? existingANode.position : { x: 450, y: i * 250 + 50 },
        data: {
          label: intent.answer,
          answerType: intent.answerType,
          options: intent.options.split(',').map(s => s.trim()).filter(Boolean),
          cardTitle: intent.cardTitle,
          customPayload: intent.customPayload
        },
        type: 'answer',
      });

      newEdges.push({
        id: `e-${intent.id}`,
        source: `q-${intent.id}`,
        target: `a-${intent.id}`,
        type: 'smoothstep',
        animated: intent.answerType === 'options',
        style: { stroke: '#94a3b8', strokeWidth: 2 }
      });
    });

    setNodes(newNodes);
    setEdges(newEdges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intents]);

  const onNodesChange = useCallback((changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)), []);

  // --- Handlers for Intent List ---
  const addIntent = () => {
    const newId = Date.now().toString();
    setIntents([...intents, {
      id: newId,
      name: 'New Intent',
      trainingPhrases: ['New training phrase...'],
      answerType: 'text',
      answer: '',
      options: '',
      cardTitle: '',
      customPayload: ''
    }]);
    setActiveIntentId(newId); // open the new intent immediately
  };

  const removeIntent = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIntents(intents.filter(i => i.id !== id));
    if (activeIntentId === id) setActiveIntentId(null);
  };

  const updateActiveIntent = (field: string, value: any) => {
    setIntents(intents.map(i => i.id === activeIntentId ? { ...i, [field]: value } : i));
  };

  const handlePhraseChange = (index: number, value: string) => {
    const active = intents.find(i => i.id === activeIntentId);
    if (!active) return;
    const newPhrases = [...active.trainingPhrases];
    newPhrases[index] = value;
    updateActiveIntent('trainingPhrases', newPhrases);
  };

  const addPhrase = () => {
    const active = intents.find(i => i.id === activeIntentId);
    if (!active) return;
    updateActiveIntent('trainingPhrases', [...active.trainingPhrases, '']);
  };

  const removePhrase = (index: number) => {
    const active = intents.find(i => i.id === activeIntentId);
    if (!active) return;
    const newPhrases = active.trainingPhrases.filter((_, i) => i !== index);
    updateActiveIntent('trainingPhrases', newPhrases.length ? newPhrases : ['']);
  };

  // --- Training Simulation ---
  const [isTraining, setIsTraining] = useState(false);
  const handleTrainAgent = () => {
    setIsTraining(true);
    setTimeout(() => {
      setIsTraining(false);
      alert('Agent successfully trained with the latest knowledge and intents!');
    }, 2000);
  };

  // --- Chat Simulation ---
  const [chatMessages, setChatMessages] = useState<{ role: 'assistant' | 'user', text: string }[]>([
    { role: 'assistant', text: agentConfig.welcomeMessage }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMessages = [...chatMessages, { role: 'user' as const, text: chatInput }];
    setChatMessages(newMessages);
    setChatInput('');
    setIsTyping(true);

    setTimeout(() => {
      setChatMessages([...newMessages, {
        role: 'assistant',
        text: `[Matched Intent]\nStyle: ${agentConfig.speakingStyle}`
      }]);
      setIsTyping(false);
    }, 1500);
  };

  const activeIntentData = intents.find(i => i.id === activeIntentId);

  return (
    <div className="h-full bg-slate-50 flex flex-col font-sans text-slate-800 overflow-hidden">

      {/* Header Toolbar */}
      <div className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 shadow-sm flex-shrink-0 z-20">
        <div className="flex items-center gap-4">
          <Link href="/agent" className="p-2 -ml-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">Agent Builder</h1>
            <p className="text-xs text-slate-500">{agentConfig.name || 'Untitled Agent'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleTrainAgent}
            disabled={isTraining}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm ${isTraining ? 'bg-amber-100 text-amber-600 cursor-wait' : 'bg-amber-500 text-white hover:bg-amber-600'
              }`}
          >
            <Cpu size={16} className={isTraining ? 'animate-pulse' : ''} />
            {isTraining ? 'Training in progress...' : 'Train Agent'}
          </button>
          <button className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all shadow-sm">
            <Save size={16} /> Save Changes
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">

        {/* Left Column: Vertical Tabs */}
        <div className="w-64 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col p-4 shadow-[2px_0_8px_-4px_rgba(0,0,0,0.1)] z-10">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">Configuration</p>
          <nav className="space-y-1">
            <button onClick={() => { setActiveTab('settings'); setActiveIntentId(null); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}>
              <Settings size={18} className={activeTab === 'settings' ? 'text-blue-600' : 'text-slate-400'} /> Setting Agent
            </button>
            <button onClick={() => { setActiveTab('knowledge'); setActiveIntentId(null); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'knowledge' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}>
              <Globe size={18} className={activeTab === 'knowledge' ? 'text-blue-600' : 'text-slate-400'} /> Sumber Knowledge
            </button>
            <button onClick={() => setActiveTab('faq')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'faq' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}>
              <HelpCircle size={18} className={activeTab === 'faq' ? 'text-blue-600' : 'text-slate-400'} /> Intents & QnA
            </button>
          </nav>
        </div>

        {/* Middle Column: Tab Content */}
        <div className="flex-1 overflow-y-auto p-8 relative bg-slate-50">
          <div className="max-w-5xl mx-auto h-full flex flex-col">

            {/* TAB: SETTING AGENT */}
            {activeTab === 'settings' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10 max-w-3xl mx-auto w-full">
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 border-b border-slate-100 pb-2">Basic Info</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Agent Name</label>
                      <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={agentConfig.name} onChange={e => setAgentConfig({ ...agentConfig, name: e.target.value })} />
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* TAB: FAQ / INTENTS */}
            {activeTab === 'faq' && (
              <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300 w-full">

                {activeIntentId ? (
                  /* --- INTENT DETAIL VIEW --- */
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex-1 flex flex-col min-h-[600px] relative">
                    <button
                      onClick={() => setActiveIntentId(null)}
                      className="absolute top-6 left-6 flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
                    >
                      <ArrowLeft size={16} /> Back to List
                    </button>

                    <div className="mt-8 mb-6">
                      <input
                        type="text"
                        className="text-2xl font-bold text-slate-900 bg-transparent border-none outline-none w-full placeholder-slate-300"
                        value={activeIntentData?.name}
                        onChange={e => updateActiveIntent('name', e.target.value)}
                        placeholder="Intent Name"
                      />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1">
                      {/* Left: Training Phrases */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <User size={18} className="text-orange-500" />
                          <h3 className="font-semibold text-slate-800">Training Phrases</h3>
                        </div>
                        <p className="text-xs text-slate-500 mb-4">Add multiple phrases or questions that should trigger this intent. Different questions will map to the same answer.</p>

                        <div className="space-y-2">
                          {activeIntentData?.trainingPhrases.map((phrase, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <input
                                type="text"
                                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm bg-slate-50"
                                value={phrase}
                                onChange={e => handlePhraseChange(i, e.target.value)}
                                placeholder="Add user expression..."
                              />
                              <button onClick={() => removePhrase(i)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                          <button onClick={addPhrase} className="flex items-center gap-2 text-sm text-orange-600 font-medium hover:text-orange-700 mt-2 px-2 py-1 rounded hover:bg-orange-50">
                            <Plus size={16} /> Add Phrase
                          </button>
                        </div>
                      </div>

                      {/* Right: Response Configuration */}
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <Bot size={18} className="text-blue-500" />
                            <h3 className="font-semibold text-slate-800">Agent Response</h3>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Response Type</label>
                            <select
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none text-sm bg-white"
                              value={activeIntentData?.answerType}
                              onChange={e => updateActiveIntent('answerType', e.target.value)}
                            >
                              <option value="text">Text Only</option>
                              <option value="options">Options / Buttons</option>
                              <option value="form">Input Form</option>
                              <option value="card">Card Link</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Message Content</label>
                            <textarea
                              rows={3}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none text-sm bg-slate-50"
                              value={activeIntentData?.answer}
                              onChange={e => updateActiveIntent('answer', e.target.value)}
                              placeholder="Type the agent's message..."
                            />
                          </div>

                          {activeIntentData?.answerType === 'options' && (
                            <div>
                              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Options (Comma separated)</label>
                              <input
                                type="text"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none text-sm bg-slate-50"
                                value={activeIntentData?.options}
                                onChange={e => updateActiveIntent('options', e.target.value)}
                                placeholder="e.g. Komplain, Cek Status, Lainnya"
                              />
                            </div>
                          )}
                          {activeIntentData?.answerType === 'card' && (
                            <div>
                              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Card Title</label>
                              <input
                                type="text"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none text-sm bg-slate-50"
                                value={activeIntentData?.cardTitle}
                                onChange={e => updateActiveIntent('cardTitle', e.target.value)}
                                placeholder="e.g. Promo Spesial"
                              />
                            </div>
                          )}
                        </div>

                        {/* Custom Payload */}
                        <div className="pt-4 border-t border-slate-100">
                          <div className="flex items-center gap-2 mb-3">
                            <Code size={18} className="text-slate-500" />
                            <h3 className="font-semibold text-slate-800">Custom Payload (JSON)</h3>
                          </div>
                          <p className="text-xs text-slate-500 mb-2">Optional JSON payload for rich client integrations or backend actions.</p>
                          <textarea
                            rows={4}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 outline-none text-sm bg-slate-800 text-green-400 font-mono"
                            value={activeIntentData?.customPayload}
                            onChange={e => updateActiveIntent('customPayload', e.target.value)}
                            placeholder='{\n  "action": "your_action_name"\n}'
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* --- INTENTS LIST & FLOW VIEW --- */
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex-1 flex flex-col min-h-[600px]">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <p className="text-slate-700 font-medium text-base">Intents & Dialogue Map</p>
                        <p className="text-slate-500 text-sm mt-1">Manage multiple intents. Group questions into one response logic.</p>
                      </div>
                      <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button onClick={() => setFaqView('list')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${faqView === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                          <List size={16} /> List
                        </button>
                        <button onClick={() => setFaqView('flow')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${faqView === 'flow' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                          <GitMerge size={16} /> Flow
                        </button>
                      </div>
                    </div>

                    {faqView === 'list' ? (
                      <div className="space-y-3 overflow-y-auto w-full">
                        <div className="flex justify-end mb-2">
                          <button onClick={addIntent} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors">
                            <Plus size={16} /> Add Intent
                          </button>
                        </div>

                        {intents.map((intent) => (
                          <div
                            key={intent.id}
                            onClick={() => setActiveIntentId(intent.id)}
                            className="flex items-center justify-between p-4 border border-slate-200 bg-white hover:border-blue-300 hover:shadow-md cursor-pointer rounded-xl transition-all group"
                          >
                            <div className="flex-1">
                              <h4 className="font-semibold text-slate-800 text-sm mb-1">{intent.name}</h4>
                              <p className="text-xs text-slate-500 line-clamp-1">
                                <span className="font-medium text-orange-500">{intent.trainingPhrases.length} phrases</span> &bull; Responds with <span className="uppercase text-blue-500">{intent.answerType}</span>
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-slate-300 group-hover:text-blue-500 transition-colors">
                                <ChevronRight size={20} />
                              </div>
                              <button
                                onClick={(e) => removeIntent(intent.id, e)}
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
                        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} fitView className="w-full h-full">
                          <Background variant={BackgroundVariant.Dots} gap={16} size={1.5} color="#cbd5e1" />
                          <Controls className="bg-white border border-slate-200 shadow-sm fill-slate-700" />
                        </ReactFlow>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Chat Preview Panel */}
        <div className="w-[360px] bg-white border-l border-slate-200 flex-shrink-0 flex flex-col shadow-[-4px_0_15px_-5px_rgba(0,0,0,0.05)] z-10">
          <div className="p-4 bg-slate-900 text-white flex justify-between items-center flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-inner">
                <Bot size={16} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-sm leading-tight">{agentConfig.name || 'AI Assistant'}</h3>
                <p className="text-[11px] text-blue-200 flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span> Live Preview
                </p>
              </div>
            </div>
            <button onClick={() => setChatMessages([{ role: 'assistant', text: agentConfig.welcomeMessage }])} className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md transition-colors">
              <RotateCcw size={16} />
            </button>
          </div>
          <div className="flex-1 p-4 overflow-y-auto bg-slate-100/50 space-y-4">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex-shrink-0 flex items-center justify-center mt-1"><Bot size={12} className="text-blue-600" /></div>
                )}
                <div className={`max-w-[85%] rounded-2xl p-3 text-[13px] shadow-sm leading-relaxed ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-2 justify-start">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex-shrink-0 flex items-center justify-center mt-1"><Bot size={12} className="text-blue-600" /></div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-3 py-4 shadow-sm flex gap-1 items-center h-10">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                </div>
              </div>
            )}
          </div>
          <div className="p-3 bg-white border-t border-slate-200 flex-shrink-0">
            <form onSubmit={handleSendMessage} className="relative flex items-center">
              <input type="text" placeholder="Test your agent..." className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={chatInput} onChange={(e) => setChatInput(e.target.value)} />
              <button type="submit" disabled={!chatInput.trim() || isTyping} className="absolute right-1.5 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50"><Send size={14} /></button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
