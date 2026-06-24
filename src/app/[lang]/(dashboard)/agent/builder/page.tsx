'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Save, FileText, Link as LinkIcon, Settings, Globe, HelpCircle, Plus, Trash2, ArrowLeft, Send, Bot, User, RotateCcw, GitMerge, List, MessageSquare, LayoutList, FormInput, ExternalLink, Cpu, ChevronRight, Code, Download, Upload } from 'lucide-react';
import Link from 'next/link';
import { ReactFlow, Background, Controls, MiniMap, useNodesState, useEdgesState, BackgroundVariant, addEdge, Handle, Position, applyNodeChanges, NodeChange } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { MessageNode } from '@/components/flow-nodes/MessageNode';
import { InputNode } from '@/components/flow-nodes/InputNode';
import DOMPurify from 'dompurify';
import { ConditionNode } from '@/components/flow-nodes/ConditionNode';
import AgentKnowledgeTab from '@/components/AgentKnowledgeTab';
import ImageUpload from '@/components/ImageUpload';
import { useTranslation } from '@/lib/i18n/I18nContext';
import { ChatUI, ChatMessageData } from '@/components/chat/ChatUI';

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
    <div className="px-4 py-3 shadow-md rounded-xl bg-white border border-l-4 border-brand-light min-w-[240px] max-w-[280px]">
      <Handle type="target" position={Position.Left} className="w-2.5 h-2.5 bg-brand-light border-2 border-white" />

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-brand">
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
            <div key={i} className="text-[11px] bg-brand-bg text-brand border border-brand/20 py-1.5 px-2 rounded-md text-center shadow-sm">
              {opt}
            </div>
          ))}
        </div>
      )}

      {answerType === 'form' && (
        <div className="flex flex-col gap-1.5 mt-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200 shadow-inner">
          <input disabled placeholder="Full Name" className="text-[11px] px-2 py-1.5 rounded border border-slate-200 bg-white w-full" />
          <input disabled placeholder="Phone Number" className="text-[11px] px-2 py-1.5 rounded border border-slate-200 bg-white w-full" />
          <button disabled className="text-[11px] bg-brand text-white py-1.5 rounded mt-1 font-medium shadow-sm">Submit Form</button>
        </div>
      )}

      {answerType === 'card' && (
        <div className="mt-3 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
          <div className="h-20 bg-slate-100 border-b border-slate-200 flex items-center justify-center text-slate-400">
            <ExternalLink size={24} className="opacity-50" />
          </div>
          <div className="p-2.5 bg-slate-50">
            <div className="text-xs font-semibold text-slate-800 leading-tight">{data.cardTitle || 'Link Card Title'}</div>
            <div className="text-[10px] text-brand mt-1.5 font-medium">View Website &rarr;</div>
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
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

const nodeTypes = {
  message: MessageNode,
  input: InputNode,
  condition: ConditionNode,
  question: QuestionNode,
  answer: AnswerNode,
};

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

function AgentBuilderContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const flowIdParam = searchParams?.get('id') || null;

  const [activeTab, setActiveTab] = useState('settings');
  const [currentFlowId, setCurrentFlowId] = useState<string | null>(flowIdParam);

  const [agentConfig, setAgentConfig] = useState({
    name: 'Sales Assistant',
    description: 'A helpful sales assistant for customer support',
    agentId: 'sales_bot_01',
    llmProvider: 'gemini',
    systemPrompt: 'You are a helpful sales assistant.',
    humanPrompt: 'User says: {input}',
    language: 'en',
    speakingStyle: 'professional',
    responseLength: 'medium',
    welcomeMessage: 'Hi! How can I help you today?',
    welcomeMessageType: 'text',
    welcomeMessageOptions: '',
    defaultResponse: 'Sorry, I don\'t understand your question. Please select a menu below:',
    defaultResponseType: 'options',
    defaultResponseOptions: 'Help me choose, Talk to Agent',
    defaultFeedback: 'Was this answer helpful?',
    urls: [''],
    themeBrandColor: '#801517',
    themeBotBubbleColor: '#ffffff',
    themeUserBubbleColor: '#801517',
    botAvatarUrl: '',
    businessNeeds: ''
  });

  // --- Unified Intent State ---
  const [faqView, setFaqView] = useState<'list' | 'flow'>('list');
  const [activeIntentId, setActiveIntentId] = useState<string | null>(null); // For detailed edit view

  const [intents, setIntents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // --- Array-based UI state for Options (buttons) and Form fields ---
  const [buttonRows, setButtonRows] = useState<{label: string; value: string}[]>([{label: '', value: ''}]);
  const [formFieldRows, setFormFieldRows] = useState<{label: string; placeholder: string; type: string; required: boolean}[]>([{label: '', placeholder: '', type: 'text', required: false}]);

  // Sync buttonRows <-> activeIntentData.options when switching intents
  useEffect(() => {
    if (!activeIntentId) return;
    const intent = intents.find(i => i.id === activeIntentId);
    if (!intent) return;
    if (intent.answerType === 'options' && intent.options) {
      const parsed = intent.options.split(',').map((o: string) => {
        const t = o.trim();
        const pipeIdx = t.indexOf('|');
        return pipeIdx !== -1
          ? { label: t.substring(0, pipeIdx).trim(), value: t.substring(pipeIdx + 1).trim() }
          : { label: t, value: t };
      }).filter((r: any) => r.label);
      setButtonRows(parsed.length > 0 ? parsed : [{label: '', value: ''}]);
    } else {
      setButtonRows([{label: '', value: ''}]);
    }
    setFormFieldRows([{label: '', placeholder: '', type: 'text', required: false}]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIntentId]);

  // Helper: serialize buttonRows back to the options string and save
  const syncButtonRowsToIntent = (rows: {label: string; value: string}[]) => {
    const str = rows
      .filter(r => r.label.trim())
      .map(r => r.value.trim() && r.value.trim() !== r.label.trim() ? `${r.label}|${r.value}` : r.label)
      .join(', ');
    updateActiveIntent('options', str);
  };

  const nodeTypes = useMemo(() => ({ 
    question: QuestionNode, 
    answer: AnswerNode,
    message: MessageNode,
    input: InputNode,
    condition: ConditionNode
  }), []);
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
          options: typeof intent.options === 'string' ? intent.options.split(',').map((s: string) => s.trim()).filter(Boolean) : intent.options,
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
    const newPhrases = active.trainingPhrases.filter((_: any, i: number) => i !== index);
    updateActiveIntent('trainingPhrases', newPhrases.length ? newPhrases : ['']);
  };

  // --- Training Simulation ---
  const [isTraining, setIsTraining] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedFlows, setSavedFlows] = useState<any[]>([]);
  const [isLoadingFlows, setIsLoadingFlows] = useState(false);
  const [showFlowMenu, setShowFlowMenu] = useState(false);
  const [tenantConfig, setTenantConfig] = useState<any>({});

  useEffect(() => {
    // Load saved flows and tenant config on mount
    const loadData = async () => {
      try {
        const [flowsRes, tenantRes] = await Promise.all([
          fetch('/api/flows'),
          fetch('/api/tenant')
        ]);
        
        if (flowsRes.ok) {
          const data = await flowsRes.json();
          setSavedFlows(data || []);
        }
        
        if (tenantRes.ok) {
          const data = await tenantRes.json();
          if (data.tenant) {
            setTenantConfig(data.tenant);
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();

    if (currentFlowId) {
      handleLoadFlow(currentFlowId, true);
    }
  }, [currentFlowId]);

  const handleLoadFlow = async (flowId: string, isInitialLoad: boolean = false) => {
    setIsLoadingFlows(true);
    try {
      const response = await fetch(`/api/flows/${flowId}`);
      if (response.ok) {
        const flow = await response.json();
        
        setAgentConfig(flow.config || {
          name: flow.name,
          description: flow.description || '',
          agentId: 'sales_bot_01',
          llmProvider: 'gemini',
          systemPrompt: 'You are a helpful sales assistant.',
          humanPrompt: 'User says: {input}',
          language: 'en',
          speakingStyle: 'professional',
          responseLength: 'medium',
          welcomeMessage: 'Hi! How can I help you today?',
          welcomeMessageType: 'text',
          welcomeMessageOptions: '',
          defaultFeedback: 'Was this answer helpful?',
          urls: [''],
          businessNeeds: '',
          botAvatarUrl: ''
        });

        // Map database fields to UI fields
        if (flow.intents && Array.isArray(flow.intents)) {
          setIntents(flow.intents.map((i: any) => ({
            id: i.id,
            name: i.name,
            trainingPhrases: i.trainingPhrases || [],
            answerType: i.responseType || 'text',
            answer: i.response || '',
            options: i.options || '',
            customPayload: i.metadata?.customPayload || ''
          })));
        } else {
          setIntents([]);
        }
        
        // Update flow visualization from metadata
        if (flow.metadata?.nodes && flow.metadata?.edges) {
          setNodes(flow.metadata.nodes);
          setEdges(flow.metadata.edges);
        }
        
        setCurrentFlowId(flow.id);
        setShowFlowMenu(false);
        if (!isInitialLoad) {
          alert(`Loaded flow: ${flow.name}`);
        }
      }
    } catch (error) {
      console.error('Error loading flow:', error);
      if (!isInitialLoad) alert('Failed to load flow');
    } finally {
      setIsLoadingFlows(false);
    }
  };

  const handleSaveFlow = async () => {
    setIsSaving(true);
    try {
      const payload: any = {
        name: agentConfig.name || 'Untitled Agent',
        description: agentConfig.description || '',
        config: agentConfig,
        intents: intents,
        metadata: { nodes, edges }
      };
      if (currentFlowId) {
        payload.id = currentFlowId;
      }

      const response = await fetch('/api/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to save flow');
      }

      const data = await response.json();
      if ((data.status === 'created' || data.status === 'updated') && data.flow?.id) {
        setCurrentFlowId(data.flow.id);
        
        if (data.flow.intents) {
          setIntents(data.flow.intents.map((i: any) => ({
            id: i.id,
            name: i.name,
            trainingPhrases: i.trainingPhrases || [],
            answerType: i.responseType || 'text',
            answer: i.response || '',
            options: i.options || '',
            customPayload: i.metadata?.customPayload || ''
          })));
        }

        if (!currentFlowId) {
          window.history.replaceState(null, '', `/agent/builder?id=${data.flow.id}`);
        }
      }
      
      alert('Flow saved successfully!');
    } catch (error) {
      console.error('Error saving flow:', error);
      alert('Failed to save flow. Check console for details.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTrainAgent = () => {
    setIsTraining(true);
    setTimeout(() => {
      setIsTraining(false);
      alert('Agent successfully trained with the latest knowledge and intents!');
    }, 2000);
  };

  const handleExport = () => {
    if (!currentFlowId) {
      alert('Please save the Agent first before exporting.');
      return;
    }
    // Redirect to the download route
    window.location.href = `/api/agent/flow/${currentFlowId}/export`;
  };

  const [isImporting, setIsImporting] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const payload = JSON.parse(text);

      const response = await fetch('/api/agent/flow/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to import flow');
      }

      const data = await response.json();
      alert('Import successful! Loading imported flow...');
      handleLoadFlow(data.flow.id);
    } catch (error: any) {
      console.error('Import error:', error);
      alert('Import failed: ' + error.message);
    } finally {
      setIsImporting(false);
      if (importFileInputRef.current) {
        importFileInputRef.current.value = '';
      }
    }
  };

  // --- Chat Simulation ---
  const [previewSessionId, setPreviewSessionId] = useState<string>('');
  
  useEffect(() => {
    // Generate a valid UUID for the python backend on mount
    setPreviewSessionId(generateUUID());
  }, []);

  const [chatMessages, setChatMessages] = useState<{ role: 'assistant' | 'user', text: string, type?: string, options?: string }[]>([
    { role: 'assistant', text: agentConfig.welcomeMessage, type: agentConfig.welcomeMessageType, options: agentConfig.welcomeMessageOptions }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (chatMessages.length <= 1) {
      setChatMessages([
        { role: 'assistant', text: agentConfig.welcomeMessage || '', type: agentConfig.welcomeMessageType, options: agentConfig.welcomeMessageOptions }
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentConfig.welcomeMessage, agentConfig.welcomeMessageType, agentConfig.welcomeMessageOptions]);

  const handleSendMessage = async (input?: string | React.FormEvent) => {
    if (input && typeof input === 'object' && 'preventDefault' in input) {
      input.preventDefault();
    }
    const userInput = typeof input === 'string' ? input : chatInput;

    if (!userInput.trim() || !currentFlowId) return;

    const newMessages = [...chatMessages, { role: 'user' as const, text: userInput }];
    setChatMessages(newMessages);
    setChatInput('');
    setIsTyping(true);

    // 1. Native Intent Matching against Unsaved Local State
    const lowerMsg = userInput.toLowerCase().trim();
    let matchedIntent = null;
    
    if (intents && intents.length > 0) {
      let maxMatchLength = 0;
      for (const intent of intents) {
        if (!intent.trainingPhrases || !Array.isArray(intent.trainingPhrases)) continue;
        for (const phrase of intent.trainingPhrases) {
          const lowerPhrase = phrase.toLowerCase().trim();
          if (lowerMsg === lowerPhrase) {
            matchedIntent = intent;
            maxMatchLength = Infinity;
            break;
          } else if (lowerMsg.includes(lowerPhrase)) {
            if (lowerPhrase.length > maxMatchLength) {
              maxMatchLength = lowerPhrase.length;
              matchedIntent = intent;
            }
          }
        }
        if (maxMatchLength === Infinity) break;
      }
    }

    // 2. Call API to get response (and optionally paraphrase matched intents)
    try {
      if (!currentFlowId) throw new Error('Agent not saved yet. Please save agent to test AI fallback.');
      
      const res = await fetch('/api/agent/test-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flowId: currentFlowId,
          message: userInput,
          sessionId: previewSessionId,
          matchedIntent: matchedIntent ? {
            name: matchedIntent.name,
            response: matchedIntent.answer || matchedIntent.response || '',
            type: matchedIntent.answerType || matchedIntent.responseType || 'text',
            options: matchedIntent.options
          } : null
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      setChatMessages([...newMessages, {
        role: 'assistant',
        text: data.reply,
        type: data.type,
        options: data.options
      }]);
    } catch (error: any) {
      setChatMessages([...newMessages, {
        role: 'assistant',
        text: agentConfig.defaultResponse || `Sorry, the AI system cannot reply right now because: ${error.message}. Please ensure your question matches the existing Intent/QnA list.`,
        type: agentConfig.defaultResponseType || 'text',
        options: agentConfig.defaultResponseOptions || ''
      }]);
    } finally {
      setIsTyping(false);
    }
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
          <input 
            type="file" 
            accept=".json" 
            ref={importFileInputRef}
            onChange={handleImport}
            className="hidden" 
          />
          <button
            onClick={() => importFileInputRef.current?.click()}
            disabled={isImporting}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-200 ${isImporting ? 'bg-slate-100 text-slate-400' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
            title="Import Agent Configuration"
          >
            <Upload size={16} className={isImporting ? 'animate-bounce' : ''} /> <span className="hidden sm:inline">{isImporting ? 'Importing...' : 'Import JSON'}</span>
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors border border-slate-200"
            title="Download Agent Configuration"
          >
            <Download size={16} /> <span className="hidden sm:inline">Export JSON</span>
          </button>
          <div className="relative">
            <button
              onClick={() => setShowFlowMenu(!showFlowMenu)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm bg-slate-100 text-slate-700 hover:bg-slate-200"
            >
              <FileText size={16} /> {savedFlows.length > 0 ? `Load Flow (${savedFlows.length})` : 'Load Flow'}
            </button>
            {showFlowMenu && savedFlows.length > 0 && (
              <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                {savedFlows.map((flow) => (
                  <button
                    key={flow.id}
                    onClick={() => handleLoadFlow(flow.id)}
                    disabled={isLoadingFlows}
                    className="w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    <div className="font-medium text-sm text-slate-900">{flow.name}</div>
                    <div className="text-xs text-slate-500 mt-1">{flow.intents?.length || 0} intents</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handleTrainAgent}
            disabled={isTraining}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm ${isTraining ? 'bg-amber-100 text-amber-600 cursor-wait' : 'bg-amber-500 text-white hover:bg-amber-600'
              }`}
          >
            <Cpu size={16} className={isTraining ? 'animate-pulse' : ''} />
            {isTraining ? 'Training in progress...' : 'Train Agent'}
          </button>
          <button
            onClick={handleSaveFlow}
            disabled={isSaving}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all shadow-sm ${isSaving ? 'bg-slate-100 text-slate-600 cursor-wait' : 'bg-brand text-white hover:bg-brand-hover'
              }`}
          >
            <Save size={16} className={isSaving ? 'animate-pulse' : ''} /> {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">

        {/* Left Column: Vertical Tabs */}
        <div className="w-64 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col p-4 shadow-[2px_0_8px_-4px_rgba(0,0,0,0.1)] z-10">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">Configuration</p>
          <nav className="space-y-1">
            <button onClick={() => { setActiveTab('settings'); setActiveIntentId(null); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-brand-bg text-brand-hover' : 'text-slate-600 hover:bg-slate-100'}`}>
              <Settings size={18} className={activeTab === 'settings' ? 'text-brand' : 'text-slate-400'} /> Setting Agent
            </button>
            <button onClick={() => { setActiveTab('knowledge'); setActiveIntentId(null); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'knowledge' ? 'bg-brand-bg text-brand-hover' : 'text-slate-600 hover:bg-slate-100'}`}>
              <Globe size={18} className={activeTab === 'knowledge' ? 'text-brand' : 'text-slate-400'} /> Base Knowledge
            </button>
            <button onClick={() => setActiveTab('faq')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'faq' ? 'bg-brand-bg text-brand-hover' : 'text-slate-600 hover:bg-slate-100'}`}>
              <HelpCircle size={18} className={activeTab === 'faq' ? 'text-brand' : 'text-slate-400'} /> Intents & QnA
            </button>
          </nav>
        </div>

        {/* Middle Column: Tab Content */}
        <div className="flex-1 overflow-y-auto p-8 relative bg-slate-50">
          <div className="w-full h-full flex flex-col">

            {/* TAB: SETTING AGENT */}
            {activeTab === 'settings' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10 max-w-3xl mx-auto w-full">
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 border-b border-slate-100 pb-2">Basic Info</h2>
                  <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Agent Name</label>
                    <input 
                      type="text" 
                      value={agentConfig.name || ''}
                      onChange={(e) => setAgentConfig({...agentConfig, name: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand-light"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <textarea 
                      value={agentConfig.description || ''}
                      onChange={(e) => setAgentConfig({...agentConfig, description: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand-light"
                      rows={2}
                    />
                  </div>
                  
                  <div className="pt-4 border-t border-slate-100">
                    <ImageUpload 
                      currentImage={agentConfig.botAvatarUrl} 
                      onImageCropped={(url) => setAgentConfig({ ...agentConfig, botAvatarUrl: url })}
                      targetSize={256} 
                      maxFileSize={2} 
                      label="Bot Avatar"
                    />
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 pb-2 border-b border-slate-100">AI Prompt Configuration</h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          System Prompt
                        </label>
                        <p className="text-xs text-slate-500 mb-2">Core instructions for AI. Provide persona context, tasks, or special rules here. (Example: include tag `[HANDOFF_REQUESTED]` if user wants to talk to human agent).</p>
                        <textarea 
                          value={agentConfig.systemPrompt || ''}
                          onChange={(e) => setAgentConfig({...agentConfig, systemPrompt: e.target.value})}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand-light font-mono text-sm bg-slate-50"
                          rows={6}
                          placeholder="You are a helpful sales assistant..."
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Human Prompt
                        </label>
                        <p className="text-xs text-slate-500 mb-2">{t('agentBuilder', 'inputPlaceholder')}</p>
                        <input 
                          type="text" 
                          value={agentConfig.humanPrompt || ''}
                          onChange={(e) => setAgentConfig({...agentConfig, humanPrompt: e.target.value})}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand-light font-mono text-sm bg-slate-50"
                          placeholder="User says: {input}"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 mt-6">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 pb-2 border-b border-slate-100">Fallback / Default Response</h2>
                    <p className="text-xs text-slate-500 mb-4">{t('agentBuilder', 'fallbackPlaceholder')}</p>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Fallback Message</label>
                        <textarea 
                          value={agentConfig.defaultResponse || ''}
                          onChange={(e) => setAgentConfig({...agentConfig, defaultResponse: e.target.value})}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand-light"
                          rows={3}
                          placeholder="Sorry, I don't understand. I will forward this to our agent. [HANDOFF_REQUESTED]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Response Type</label>
                        <select 
                          value={agentConfig.defaultResponseType || 'text'}
                          onChange={(e) => setAgentConfig({...agentConfig, defaultResponseType: e.target.value})}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand-light bg-white"
                        >
                          <option value="text">Text Only</option>
                          <option value="options">Options / Buttons</option>
                        </select>
                      </div>
                      {agentConfig.defaultResponseType === 'options' && (
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Options (Comma separated)</label>
                          <input 
                            type="text" 
                            value={agentConfig.defaultResponseOptions || ''}
                            onChange={(e) => setAgentConfig({...agentConfig, defaultResponseOptions: e.target.value})}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand-light"
                            placeholder="e.g. Bicara dengan Agen, Menu Utama"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  </div>
                </section>
              </div>
            )}

            {/* TAB: KNOWLEDGE BASE */}
            {activeTab === 'knowledge' && (
              <AgentKnowledgeTab flowId={currentFlowId} />
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
                        value={activeIntentData?.name ?? ''}
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
                          {activeIntentData?.trainingPhrases.map((phrase: any, i: number) => (
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
                      <div className="space-y-5">
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <Bot size={18} className="text-brand-light" />
                            <h3 className="font-semibold text-slate-800">Agent Response</h3>
                          </div>

                          {/* Response Type */}
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Response Type</label>
                            <select
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-light outline-none text-sm bg-white"
                              value={activeIntentData?.answerType ?? 'text'}
                              onChange={e => updateActiveIntent('answerType', e.target.value)}
                            >
                              <option value="text">💬 Text Only</option>
                              <option value="options">🔘 Text + Quick Reply Buttons</option>
                              <option value="card">🃏 Info Card (with link)</option>
                              <option value="form">📋 Contact Form</option>
                              <option value="handoff">🙋 Text + Handoff to Agent</option>
                            </select>
                          </div>

                          {/* ── CARD BUILDER ── */}
                          {activeIntentData?.answerType === 'card' ? (
                            <div className="space-y-4">
                              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <span className="text-base">🃏</span>
                                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Card Builder</p>
                                </div>
                                <div className="space-y-3">
                                  <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Card Title <span className="text-red-400">*</span></label>
                                    <input
                                      id="cb_title"
                                      type="text"
                                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400 outline-none text-sm bg-white"
                                      placeholder="e.g. Axiata Tower (Kuala Lumpur) - Private Office"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Description <span className="text-red-400">*</span></label>
                                    <textarea
                                      id="cb_desc"
                                      rows={3}
                                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400 outline-none text-sm bg-white resize-none"
                                      placeholder="e.g. Our private offices are available on flexible hourly to monthly options..."
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Link URL <span className="text-slate-400 font-normal">(optional)</span></label>
                                    <input
                                      id="cb_url"
                                      type="url"
                                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400 outline-none text-sm bg-white"
                                      placeholder="https://www.ceosuite.com/locations/..."
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">CTA / Footer Note <span className="text-slate-400 font-normal">(optional)</span></label>
                                    <input
                                      id="cb_cta"
                                      type="text"
                                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400 outline-none text-sm bg-white"
                                      placeholder="e.g. Next, you can continue with the recommended action or ask a question."
                                      defaultValue="Next, you can continue with the recommended action or ask a question."
                                    />
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      const title = (document.getElementById('cb_title') as HTMLInputElement)?.value.trim();
                                      const desc = (document.getElementById('cb_desc') as HTMLTextAreaElement)?.value.trim();
                                      const url = (document.getElementById('cb_url') as HTMLInputElement)?.value.trim();
                                      const cta = (document.getElementById('cb_cta') as HTMLInputElement)?.value.trim();
                                      if (!title || !desc) { alert('Please fill in at least Card Title and Description.'); return; }
                                      const descHtml = desc.replace(/\n/g, '<br/>');
                                      const linkHtml = url ? `<br/><br/>Explore this space in detail here: ${url}` : '';
                                      const ctaHtml = cta ? `<div class='cta-note'>${cta}</div>` : '';
                                      const html = `<div class='card'><div class='card-title'>${title}</div><div class='small'>${descHtml}${linkHtml}</div></div>${ctaHtml}`;
                                      updateActiveIntent('answer', html);
                                    }}
                                    className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
                                  >
                                    <span>✨</span> Generate Card HTML
                                  </button>
                                </div>
                              </div>

                              {/* Generated HTML preview + raw editor */}
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Generated HTML <span className="text-slate-400 font-normal normal-case">(editable)</span></label>
                                  {activeIntentData?.answer && (
                                    <button
                                      onClick={() => updateActiveIntent('answer', '')}
                                      className="text-[10px] text-red-400 hover:text-red-600 transition-colors"
                                    >Clear</button>
                                  )}
                                </div>
                                <textarea
                                  rows={4}
                                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-300 outline-none text-xs bg-slate-800 text-green-300 font-mono resize-none"
                                  value={activeIntentData?.answer ?? ''}
                                  onChange={e => updateActiveIntent('answer', e.target.value)}
                                  placeholder="HTML will appear here after clicking 'Generate Card HTML'..."
                                />
                                {activeIntentData?.answer && (
                                  <div className="mt-2">
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Preview</p>
                                    <div
                                      className="p-3 border border-slate-200 rounded-xl bg-white text-sm"
                                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(activeIntentData.answer) }}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : activeIntentData?.answerType === 'form' ? (
                            /* ── FORM BUILDER ── */
                            <div className="space-y-4">
                              <div className="bg-brand-bg/60 p-4 rounded-xl border border-brand/20">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-base">📋</span>
                                    <p className="text-xs font-bold text-brand uppercase tracking-wider">Form Builder</p>
                                  </div>
                                  <button
                                    onClick={() => setFormFieldRows([...formFieldRows, {label: '', placeholder: '', type: 'text', required: false}])}
                                    className="flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-hover px-2 py-1 rounded-lg hover:bg-brand-bg/80 border border-brand/30 transition-colors"
                                  >
                                    <Plus size={13} /> Add Field
                                  </button>
                                </div>
                                <div className="space-y-3">
                                  <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Intro Message</label>
                                    <input
                                      type="text"
                                      className="w-full px-3 py-2 border border-brand/20 rounded-lg focus:ring-2 focus:ring-brand-light outline-none text-sm bg-white"
                                      placeholder="e.g. Please fill in the form below:"
                                      id="formBuilderIntro"
                                    />
                                  </div>

                                  {/* Field rows */}
                                  <div className="space-y-2">
                                    {/* Column headers */}
                                    <div className="grid grid-cols-[1fr_1fr_100px_auto_auto] gap-2 items-center">
                                      <span className="text-[10px] font-bold text-brand/70 uppercase tracking-wider">Label</span>
                                      <span className="text-[10px] font-bold text-brand/70 uppercase tracking-wider">Placeholder</span>
                                      <span className="text-[10px] font-bold text-brand/70 uppercase tracking-wider">Type</span>
                                      <span className="text-[10px] font-bold text-brand/70 uppercase tracking-wider">Req</span>
                                      <span />
                                    </div>
                                    {formFieldRows.map((field, i) => (
                                      <div key={i} className="grid grid-cols-[1fr_1fr_100px_auto_auto] gap-2 items-center">
                                        <input
                                          type="text"
                                          className="px-2.5 py-1.5 border border-brand/20 rounded-lg focus:ring-2 focus:ring-brand-light outline-none text-sm bg-white w-full"
                                          value={field.label}
                                          onChange={e => setFormFieldRows(formFieldRows.map((f, j) => j === i ? {...f, label: e.target.value} : f))}
                                          placeholder="Name"
                                        />
                                        <input
                                          type="text"
                                          className="px-2.5 py-1.5 border border-brand/20 rounded-lg focus:ring-2 focus:ring-brand-light outline-none text-sm bg-white w-full"
                                          value={field.placeholder}
                                          onChange={e => setFormFieldRows(formFieldRows.map((f, j) => j === i ? {...f, placeholder: e.target.value} : f))}
                                          placeholder="e.g. John Doe"
                                        />
                                        <select
                                          className="px-2 py-1.5 border border-brand/20 rounded-lg focus:ring-2 focus:ring-brand-light outline-none text-sm bg-white w-full"
                                          value={field.type}
                                          onChange={e => setFormFieldRows(formFieldRows.map((f, j) => j === i ? {...f, type: e.target.value} : f))}
                                        >
                                          <option value="text">Text</option>
                                          <option value="email">Email</option>
                                          <option value="tel">Phone</option>
                                          <option value="number">Number</option>
                                          <option value="date">Date</option>
                                          <option value="textarea">Textarea</option>
                                        </select>
                                        <label className="flex items-center justify-center cursor-pointer">
                                          <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-brand/30 text-brand focus:ring-brand-light"
                                            checked={field.required}
                                            onChange={e => setFormFieldRows(formFieldRows.map((f, j) => j === i ? {...f, required: e.target.checked} : f))}
                                          />
                                        </label>
                                        <button
                                          onClick={() => {
                                            const next = formFieldRows.filter((_, j) => j !== i);
                                            setFormFieldRows(next.length > 0 ? next : [{label: '', placeholder: '', type: 'text', required: false}]);
                                          }}
                                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                          title="Remove field"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    ))}
                                  </div>

                                  <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Webhook POST URL <span className="text-slate-400 font-normal">(optional)</span></label>
                                    <input
                                      type="text"
                                      className="w-full px-3 py-2 border border-brand/20 rounded-lg focus:ring-2 focus:ring-brand-light outline-none text-sm bg-white"
                                      placeholder="https://n8n.example.com/webhook/..."
                                      id="formBuilderWebhook"
                                    />
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      const intro = (document.getElementById('formBuilderIntro') as HTMLInputElement).value.trim();
                                      const webhookUrl = (document.getElementById('formBuilderWebhook') as HTMLInputElement).value.trim();
                                      const validFields = formFieldRows.filter(f => f.label.trim());
                                      if (!validFields.length) { alert('Please add at least one field.'); return; }
                                      let onSubmitCode = "event.preventDefault();";
                                      if (webhookUrl) {
                                        onSubmitCode += ` var btn=this.querySelector('button[type=submit]'); if(btn){btn.disabled=true;btn.textContent='Sending...';} var fd=new FormData(this); var d=Object.fromEntries(fd); fetch('${webhookUrl}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)}).then(()=>{alert('Data berhasil dikirim!'); this.reset(); if(btn){btn.disabled=false;btn.textContent='Submit';}}).catch(e=>{console.error(e); alert('Gagal mengirim data'); if(btn){btn.disabled=false;btn.textContent='Submit';}});`;
                                      }
                                      let html = `<form class='form-card' onsubmit="${onSubmitCode}">`;
                                      validFields.forEach(field => {
                                        const nameAttr = field.label.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
                                        const req = field.required ? 'required' : '';
                                        const ph = field.placeholder || `Enter ${field.label}`;
                                        html += `<label class='form-card_label'>${field.label}${field.required ? ' <span class="required">*</span>' : ''}</label>`;
                                        if (field.type === 'tel') {
                                          html += `<input type='tel' name='${nameAttr}' placeholder='${ph}' class='form-card_input' pattern='[0-9]+' title='Please enter only numbers' oninput='this.value = this.value.replace(/[^0-9]/g, "")' ${req}/>`;
                                        } else if (field.type === 'textarea') {
                                          html += `<textarea name='${nameAttr}' placeholder='${ph}' class='form-card_input' ${req}></textarea>`;
                                        } else {
                                          html += `<input type='${field.type}' name='${nameAttr}' placeholder='${ph}' class='form-card_input' ${req}/>`;
                                        }
                                      });
                                      html += `<button type='submit' class='submit-btn'>Submit</button></form>`;
                                      updateActiveIntent('answer', (intro || 'Silakan lengkapi form berikut:') + html);
                                    }}
                                    className="w-full py-2 bg-brand hover:bg-brand-hover text-white rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
                                  >
                                    <span>📋</span> Generate Form HTML
                                  </button>
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Generated HTML <span className="text-slate-400 font-normal normal-case">(editable)</span></label>
                                <textarea
                                  rows={4}
                                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-light outline-none text-xs bg-slate-800 text-green-300 font-mono resize-none"
                                  value={activeIntentData?.answer ?? ''}
                                  onChange={e => updateActiveIntent('answer', e.target.value)}
                                  placeholder="HTML will appear here after clicking Generate..."
                                />
                              </div>
                            </div>
                          ) : (
                            /* ── TEXT / OPTIONS / HANDOFF ── */
                            <div className="space-y-4">
                              <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Message Content</label>
                                <textarea
                                  rows={activeIntentData?.answerType === 'options' ? 2 : 4}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-light outline-none text-sm bg-slate-50 resize-none"
                                  value={activeIntentData?.answer ?? ''}
                                  onChange={e => updateActiveIntent('answer', e.target.value)}
                                  placeholder={activeIntentData?.answerType === 'handoff' ? "e.g. Please wait, I'm connecting you to our agent... [HANDOFF_REQUESTED]" : "Type the agent's message here..."}
                                />
                                {activeIntentData?.answerType === 'handoff' && (
                                  <p className="text-[10px] text-slate-400 mt-1">Tip: Include <code className="bg-slate-100 px-1 rounded">[HANDOFF_REQUESTED]</code> at the end to trigger the agent handoff.</p>
                                )}
                              </div>

                              {activeIntentData?.answerType === 'options' && (
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-base">🔘</span>
                                      <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Quick Reply Buttons</p>
                                    </div>
                                    <button
                                      onClick={() => {
                                        const next = [...buttonRows, {label: '', value: ''}];
                                        setButtonRows(next);
                                      }}
                                      className="flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-hover px-2 py-1 rounded-lg hover:bg-brand-bg transition-colors"
                                    >
                                      <Plus size={13} /> Add Button
                                    </button>
                                  </div>

                                  {/* Column headers */}
                                  <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Button Label <span className="font-normal text-slate-300">(shown)</span></span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sent Value <span className="font-normal text-slate-300">(to bot)</span></span>
                                    <span />
                                  </div>

                                  {/* Button rows */}
                                  <div className="space-y-2">
                                    {buttonRows.map((row, i) => (
                                      <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                                        <input
                                          type="text"
                                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-light outline-none text-sm bg-white"
                                          value={row.label}
                                          onChange={e => {
                                            const next = buttonRows.map((r, j) => j === i ? {...r, label: e.target.value} : r);
                                            setButtonRows(next);
                                            syncButtonRowsToIntent(next);
                                          }}
                                          placeholder="e.g. Bangkok PO"
                                        />
                                        <input
                                          type="text"
                                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-light outline-none text-sm bg-white"
                                          value={row.value}
                                          onChange={e => {
                                            const next = buttonRows.map((r, j) => j === i ? {...r, value: e.target.value} : r);
                                            setButtonRows(next);
                                            syncButtonRowsToIntent(next);
                                          }}
                                          placeholder={row.label || 'e.g. Bangkok Private Office'}
                                        />
                                        <button
                                          onClick={() => {
                                            const next = buttonRows.filter((_, j) => j !== i);
                                            const safe = next.length > 0 ? next : [{label: '', value: ''}];
                                            setButtonRows(safe);
                                            syncButtonRowsToIntent(safe);
                                          }}
                                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                          title="Remove"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Live preview */}
                                  {buttonRows.some(r => r.label.trim()) && (
                                    <div className="pt-2 border-t border-slate-200">
                                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1.5">Preview</p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {buttonRows.filter(r => r.label.trim()).map((r, i) => (
                                          <span key={i} className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-brand/30 text-brand rounded-full text-xs font-medium shadow-sm">
                                            {r.label}
                                            {r.value.trim() && r.value.trim() !== r.label.trim() && (
                                              <span className="text-slate-300 text-[9px]">→ {r.value}</span>
                                            )}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
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
                            value={activeIntentData?.customPayload ?? ''}
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
                        <button onClick={() => setFaqView('list')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${faqView === 'list' ? 'bg-white text-brand shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                          <List size={16} /> List
                        </button>
                        <button onClick={() => setFaqView('flow')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${faqView === 'flow' ? 'bg-white text-brand shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                          <GitMerge size={16} /> Flow
                        </button>
                      </div>
                    </div>

                    {faqView === 'list' ? (
                      <div className="space-y-3 overflow-y-auto w-full">
                        {/* AI PERSONA (NEW SETTINGS) */}
                        <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-5 mb-6">
                          <div className="flex items-center gap-2 mb-3">
                            <Bot size={18} className="text-purple-600" />
                            <h3 className="font-semibold text-slate-800">AI Persona & Business Needs</h3>
                          </div>
                          <p className="text-xs text-slate-500 mb-4">Set up how your AI agent speaks and understands your business context.</p>
                          
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">Main Language</label>
                              <select 
                                value={agentConfig.language || 'Bahasa Indonesia'}
                                onChange={(e) => setAgentConfig({...agentConfig, language: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-sm"
                              >
                                <option value="Bahasa Indonesia">Indonesian</option>
                                <option value="English">English</option>
                                <option value="Bahasa Indonesia campur English (Jaksel)">Mixed (Indonesian & English)</option>
                                <option value="Jawa">Javanese</option>
                                <option value="Mandarin">Chinese (Mandarin)</option>
                                <option value="Korean">Korean</option>
                                <option value="Thai">Thai</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">Speaking Style</label>
                              <select 
                                value={agentConfig.speakingStyle || 'ramah dan profesional'}
                                onChange={(e) => setAgentConfig({...agentConfig, speakingStyle: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-sm"
                              >
                                <option value="ramah dan profesional">Friendly & Professional</option>
                                <option value="sangat santai dan asik layaknya teman">Casual & Fun</option>
                                <option value="sangat formal dan baku">Formal & Standard</option>
                                <option value="penuh antusiasme dan ceria">Enthusiastic & Cheerful</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Business Needs / Context (Optional)</label>
                            <textarea 
                              value={agentConfig.businessNeeds || ''}
                              onChange={(e) => setAgentConfig({...agentConfig, businessNeeds: e.target.value})}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                              rows={3}
                              placeholder="Example: We are a beauty clinic focusing on anti-aging treatments. Provide advice in a convincing tone."
                            />
                            <p className="text-[10px] text-slate-400 mt-1">{t('agentBuilder', 'contextPlaceholder')}</p>
                          </div>
                        </div>

                        {/* WELCOME MESSAGE / SAPAAN (NEW PLACEMENT) */}
                        <div className="bg-brand-bg/50 border border-brand/20 rounded-xl p-5 mb-6">
                          <div className="flex items-center gap-2 mb-3">
                            <MessageSquare size={18} className="text-brand" />
                            <h3 className="font-semibold text-slate-800">Welcome Message / Greeting</h3>
                          </div>
                          <p className="text-xs text-slate-500 mb-4">{t('agentBuilder', 'welcomePlaceholder')}</p>
                          
                          <div className="space-y-4">
                            <div>
                              <textarea 
                                value={agentConfig.welcomeMessage || ''}
                                onChange={(e) => setAgentConfig({...agentConfig, welcomeMessage: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand-light text-sm"
                                rows={2}
                                placeholder="Hello! How can I help you today?"
                              />
                            </div>
                            <div className="flex gap-4">
                              <div className="w-1/3">
                                <label className="block text-xs font-medium text-slate-700 mb-1">Message Type</label>
                                <select 
                                  value={agentConfig.welcomeMessageType || 'text'}
                                  onChange={(e) => setAgentConfig({...agentConfig, welcomeMessageType: e.target.value})}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand-light bg-white text-sm"
                                >
                                  <option value="text">Text Only</option>
                                  <option value="options">Text with Options (Buttons)</option>
                                  <option value="form">Form (Lead Capture)</option>
                                </select>
                              </div>
                              {agentConfig.welcomeMessageType === 'options' && (
                                <div className="flex-1">
                                  <label className="block text-xs font-medium text-slate-700 mb-1">Options (comma separated)</label>
                                  <input 
                                    type="text" 
                                    value={agentConfig.welcomeMessageOptions || ''}
                                    onChange={(e) => setAgentConfig({...agentConfig, welcomeMessageOptions: e.target.value})}
                                    placeholder="e.g. Help me choose, Pricing, Book a tour"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand-light text-sm"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* DEFAULT RESPONSE (NEW PLACEMENT) */}
                        <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-5 mb-6">
                          <div className="flex items-center gap-2 mb-3">
                            <Bot size={18} className="text-orange-600" />
                            <h3 className="font-semibold text-slate-800">Default Fallback Response</h3>
                          </div>
                          <p className="text-xs text-slate-500 mb-4">{t('agentBuilder', 'unknownPlaceholder')} (does not match any Intent/QnA).</p>
                          
                          <div className="space-y-4">
                            <div>
                                <textarea 
                                  value={agentConfig.defaultResponse || ''}
                                  onChange={(e) => setAgentConfig({...agentConfig, defaultResponse: e.target.value})}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                                  rows={2}
                                  placeholder="Sorry, I don't understand your question..."
                                />
                              </div>
                            <div className="flex gap-4">
                              <div className="w-1/3">
                                <label className="block text-xs font-medium text-slate-700 mb-1">Message Type</label>
                                <select 
                                  value={agentConfig.defaultResponseType || 'text'}
                                  onChange={(e) => setAgentConfig({...agentConfig, defaultResponseType: e.target.value})}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-sm"
                                >
                                  <option value="text">Text Only</option>
                                  <option value="options">Text with Options (Buttons)</option>
                                  <option value="form">Form (Lead Capture)</option>
                                </select>
                              </div>
                              {agentConfig.defaultResponseType === 'options' && (
                                <div className="flex-1">
                                  <label className="block text-xs font-medium text-slate-700 mb-1">Options (comma separated)</label>
                                  <input 
                                    type="text" 
                                    value={agentConfig.defaultResponseOptions || ''}
                                    onChange={(e) => setAgentConfig({...agentConfig, defaultResponseOptions: e.target.value})}
                                    placeholder="e.g. Kembali ke Menu Utama, Bicara dengan Agen"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

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
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            </div>
                          </div>
                          <button onClick={addIntent} className="flex items-center justify-center gap-2 px-4 py-2 bg-brand-bg text-brand rounded-lg text-sm font-medium hover:bg-brand-bg transition-colors shrink-0">
                            <Plus size={16} /> Add Intent
                          </button>
                        </div>

                        {intents
                          .filter(intent => 
                            !searchQuery || 
                            intent.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            intent.trainingPhrases?.some((p: string) => p.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            intent.answer?.toLowerCase().includes(searchQuery.toLowerCase())
                          )
                          .map((intent) => (
                          <div
                            key={intent.id}
                            onClick={() => setActiveIntentId(intent.id)}
                            className="flex items-center justify-between p-4 border border-slate-200 bg-white hover:border-brand/30 hover:shadow-md cursor-pointer rounded-xl transition-all group"
                          >
                            <div className="flex-1">
                              <h4 className="font-semibold text-slate-800 text-sm mb-1">{intent.name}</h4>
                              <p className="text-xs text-slate-500 line-clamp-1">
                                <span className="font-medium text-orange-500">{intent.trainingPhrases.length} phrases</span> &bull; Responds with <span className="uppercase text-brand-light">{intent.answerType}</span>
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-slate-300 group-hover:text-brand-light transition-colors">
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
        <div className="w-[360px] bg-white border-l border-slate-200 flex-shrink-0 flex flex-col shadow-[-4px_0_15px_-5px_rgba(0,0,0,0.05)] z-10 overflow-hidden flex-col">
          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Test Panel removed to avoid Redis errors in environments without Redis */}

            {/* Chat Preview */}
            <div className="p-4 pt-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Chat Preview</h3>
              <div className="rounded-xl border border-slate-200 overflow-hidden h-[450px] flex flex-col">
                <ChatUI
                  messages={chatMessages.map((msg, idx) => ({
                    id: idx,
                    text: msg.text,
                    sender: msg.role === 'user' ? 'user' : 'bot',
                    options: msg.options ? msg.options.split(',').map((o: string) => o.trim()) : undefined
                  }))}
                  isTyping={isTyping}
                  status="bot"
                  isConnected={true}
                  config={{
                    name: agentConfig.name || 'AI Assistant',
                    tenantName: tenantConfig.name || 'Your Brand',
                    primaryColor: tenantConfig.themeBrandColor || '#801517',
                    botAvatarUrl: agentConfig.botAvatarUrl,
                    logo: tenantConfig.logoUrl
                  }}
                  inputValue={chatInput}
                  onInputChange={setChatInput}
                  onSendMessage={handleSendMessage}
                  onRestartChat={() => {
                    setChatMessages([{ role: 'assistant', text: agentConfig.welcomeMessage || '', type: agentConfig.welcomeMessageType, options: agentConfig.welcomeMessageOptions }]);
                    setPreviewSessionId(generateUUID());
                  }}
                  hideHeaderMoreOptions={true}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AgentBuilderPage() {
  return (
    <Suspense fallback={<div className="h-full flex items-center justify-center">Loading agent builder...</div>}>
      <AgentBuilderContent />
    </Suspense>
  );
}
