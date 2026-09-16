'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Save, FileText, Link as LinkIcon, Settings, Globe, HelpCircle, Plus, Trash2, ArrowLeft, Send, Bot, User, RotateCcw, GitMerge, List, MessageSquare, LayoutList, FormInput, ExternalLink, Cpu, ChevronRight, ChevronLeft, Code, Download, Upload } from 'lucide-react';
import Link from 'next/link';
import { ReactFlow, Background, Controls, MiniMap, useNodesState, useEdgesState, BackgroundVariant, addEdge, Handle, Position, applyNodeChanges, NodeChange } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { MessageNode } from '@/components/flow-nodes/MessageNode';
import { InputNode } from '@/components/flow-nodes/InputNode';
import { ConditionNode } from '@/components/flow-nodes/ConditionNode';
import AgentKnowledgeTab from '@/components/AgentKnowledgeTab';
import ImageUpload from '@/components/ImageUpload';
import SplitPaneFaq from '@/components/agent/SplitPaneFaq';
import { useTranslation } from '@/lib/i18n/I18nContext';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
  const [showChatPreview, setShowChatPreview] = useState(true);

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

  const [chatMessages, setChatMessages] = useState<{ role: 'assistant' | 'user', text: string, type?: string, options?: string, timestamp?: string }[]>([
    { role: 'assistant', text: agentConfig.welcomeMessage, type: agentConfig.welcomeMessageType, options: agentConfig.welcomeMessageOptions, timestamp: new Date().toISOString() }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (chatMessages.length <= 1) {
      setChatMessages([
        { role: 'assistant', text: agentConfig.welcomeMessage || '', type: agentConfig.welcomeMessageType, options: agentConfig.welcomeMessageOptions, timestamp: new Date().toISOString() }
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

    const newMessages = [...chatMessages, { role: 'user' as const, text: userInput, timestamp: new Date().toISOString() }];
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
        options: data.options,
        timestamp: new Date().toISOString()
      }]);
    } catch (error: any) {
      setChatMessages([...newMessages, {
        role: 'assistant',
        text: agentConfig.defaultResponse || `Sorry, the AI system cannot reply right now because: ${error.message}. Please ensure your question matches the existing Intent/QnA list.`,
        type: agentConfig.defaultResponseType || 'text',
        options: agentConfig.defaultResponseOptions || '',
        timestamp: new Date().toISOString()
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
              <SplitPaneFaq
                faqView={faqView}
                setFaqView={setFaqView}
                agentConfig={agentConfig}
                setAgentConfig={setAgentConfig}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                intents={intents}
                activeIntentId={activeIntentId}
                setActiveIntentId={setActiveIntentId}
                onAddIntent={addIntent}
                onRemoveIntent={removeIntent}
                onUpdateActiveIntent={updateActiveIntent}
                handlePhraseChange={handlePhraseChange}
                addPhrase={addPhrase}
                removePhrase={removePhrase}
                buttonRows={buttonRows}
                setButtonRows={setButtonRows}
                formFieldRows={formFieldRows}
                setFormFieldRows={setFormFieldRows}
                syncButtonRowsToIntent={syncButtonRowsToIntent}
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
              />
            )}
          </div>
        </div>

        {/* Right Column: Chat Preview Panel */}
        <div
          className={`${
            showChatPreview ? 'w-[360px]' : 'w-12'
          } bg-white border-l border-slate-200 flex-shrink-0 flex flex-col shadow-[-4px_0_15px_-5px_rgba(0,0,0,0.05)] z-10 transition-all duration-300 relative`}
        >
          {/* Toggle button */}
          <button
            type="button"
            onClick={() => setShowChatPreview(!showChatPreview)}
            className="absolute -left-3.5 top-5 z-20 w-7 h-7 bg-white border border-slate-300 rounded-full shadow-md flex items-center justify-center text-slate-500 hover:text-slate-800 hover:scale-105 transition-all"
            title={showChatPreview ? 'Collapse Preview' : 'Expand Preview'}
          >
            {showChatPreview ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>

          {showChatPreview ? (
            <div className="flex-1 overflow-y-auto space-y-4">
              {/* Chat Preview */}
              <div className="p-4 pt-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Chat Preview</h3>
                <div className="rounded-xl border border-slate-200 overflow-hidden h-[450px] flex flex-col">
                  <ChatUI
                    messages={chatMessages.map((msg, idx) => ({
                      id: idx,
                      text: msg.text,
                      sender: msg.role === 'user' ? 'user' : 'bot',
                      options: msg.options ? msg.options.split(',').map((o: string) => o.trim()) : undefined,
                      createdAt: msg.timestamp || new Date().toISOString()
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
                      setChatMessages([{ role: 'assistant', text: agentConfig.welcomeMessage || '', type: agentConfig.welcomeMessageType, options: agentConfig.welcomeMessageOptions, timestamp: new Date().toISOString() }]);
                      setPreviewSessionId(generateUUID());
                    }}
                    hideHeaderMoreOptions={true}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div
              className="flex-1 flex flex-col items-center pt-14 cursor-pointer hover:bg-slate-50 transition-colors select-none"
              onClick={() => setShowChatPreview(true)}
              title="Click to expand Chat Preview"
            >
              <MessageSquare size={16} className="text-slate-400 mb-3" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest [writing-mode:vertical-lr] rotate-180">
                Chat Preview
              </span>
            </div>
          )}
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
