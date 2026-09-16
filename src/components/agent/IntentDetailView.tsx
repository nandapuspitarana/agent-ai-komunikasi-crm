'use client';

import React, { useState } from 'react';
import { ArrowLeft, User, Bot, Trash2, Plus, Code, MessageSquare, Sparkles } from 'lucide-react';
import CardBuilder from './response-builders/CardBuilder';
import FormBuilder, { FormFieldRow } from './response-builders/FormBuilder';
import QuickReplyBuilder, { ButtonRow } from './response-builders/QuickReplyBuilder';
import ResponseTypeSelector from './response-builders/ResponseTypeSelector';

interface IntentDetailViewProps {
  activeIntentData: any;
  onUpdateActiveIntent: (field: string, value: any) => void;
  onBack: () => void;
  handlePhraseChange: (index: number, value: string) => void;
  addPhrase: () => void;
  removePhrase: (index: number) => void;
  buttonRows: ButtonRow[];
  setButtonRows: React.Dispatch<React.SetStateAction<ButtonRow[]>>;
  formFieldRows: FormFieldRow[];
  setFormFieldRows: React.Dispatch<React.SetStateAction<FormFieldRow[]>>;
  syncButtonRowsToIntent: (rows: ButtonRow[]) => void;
}

export const IntentDetailView: React.FC<IntentDetailViewProps> = ({
  activeIntentData,
  onUpdateActiveIntent,
  onBack,
  handlePhraseChange,
  addPhrase,
  removePhrase,
  buttonRows,
  setButtonRows,
  formFieldRows,
  setFormFieldRows,
  syncButtonRowsToIntent,
}) => {
  const [activeTab, setActiveTab] = useState<'phrases' | 'response' | 'payload'>('response');
  const phraseCount = activeIntentData?.trainingPhrases?.length || 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col min-h-[600px] overflow-hidden">
      {/* Top Header Bar */}
      <div className="p-5 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-4 mb-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            <ArrowLeft size={14} /> Back to List
          </button>

          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-md bg-brand-bg text-brand">
              {activeIntentData?.answerType || 'text'}
            </span>
            <span className="text-xs text-slate-400">
              {phraseCount} phrase{phraseCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Intent Name Title Input */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            className="text-xl sm:text-2xl font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-brand outline-none w-full placeholder-slate-300 py-1 transition-colors"
            value={activeIntentData?.name ?? ''}
            onChange={(e) => onUpdateActiveIntent('name', e.target.value)}
            placeholder="Intent Name (e.g. Price Inquiry, Office Booking)"
          />
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex items-center gap-2 mt-4 border-b border-slate-100 -mb-5 pb-0">
          <button
            type="button"
            onClick={() => setActiveTab('response')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'response'
                ? 'border-brand text-brand'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Bot size={15} />
            Agent Response
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('phrases')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'phrases'
                ? 'border-brand text-brand'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User size={15} />
            Training Phrases
            <span className="ml-1 text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-bold">
              {phraseCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('payload')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'payload'
                ? 'border-brand text-brand'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Code size={15} />
            Advanced Payload
          </button>
        </div>
      </div>

      {/* Main Tab Content Body */}
      <div className="p-6 flex-1 overflow-y-auto">
        {/* TAB 1: RESPONSE CONFIGURATION */}
        {activeTab === 'response' && (
          <div className="max-w-3xl space-y-6 animate-in fade-in duration-200">
            {/* Visual Response Type Selector */}
            <ResponseTypeSelector
              value={activeIntentData?.answerType ?? 'text'}
              onChange={(type) => onUpdateActiveIntent('answerType', type)}
            />

            {/* Builder based on type */}
            {activeIntentData?.answerType === 'card' ? (
              <CardBuilder
                activeIntentData={activeIntentData}
                onUpdate={onUpdateActiveIntent}
              />
            ) : activeIntentData?.answerType === 'form' ? (
              <FormBuilder
                activeIntentData={activeIntentData}
                onUpdate={onUpdateActiveIntent}
                formFieldRows={formFieldRows}
                setFormFieldRows={setFormFieldRows}
              />
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Message Content
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Plain text or HTML formatting supported
                    </span>
                  </div>
                  <textarea
                    rows={activeIntentData?.answerType === 'options' ? 3 : 5}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-light outline-none text-sm bg-slate-50 focus:bg-white resize-none transition-all"
                    value={activeIntentData?.answer ?? ''}
                    onChange={(e) => onUpdateActiveIntent('answer', e.target.value)}
                    placeholder={
                      activeIntentData?.answerType === 'handoff'
                        ? "e.g. Please wait, I'm connecting you to our human agent... [HANDOFF_REQUESTED]"
                        : "Type the agent's message reply here..."
                    }
                  />
                  {activeIntentData?.answerType === 'handoff' && (
                    <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                      <span>💡</span> Include <code className="bg-rose-50 border border-rose-200 px-1 py-0.5 rounded font-mono text-xs">[HANDOFF_REQUESTED]</code> to trigger human handoff automatically.
                    </p>
                  )}
                </div>

                {activeIntentData?.answerType === 'options' && (
                  <QuickReplyBuilder
                    buttonRows={buttonRows}
                    setButtonRows={setButtonRows}
                    syncButtonRowsToIntent={syncButtonRowsToIntent}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TRAINING PHRASES */}
        {activeTab === 'phrases' && (
          <div className="max-w-3xl space-y-4 animate-in fade-in duration-200">
            <div className="flex items-start justify-between gap-4 bg-orange-50/60 border border-orange-200/80 rounded-xl p-4">
              <div>
                <h4 className="font-semibold text-orange-950 text-sm">User Training Phrases</h4>
                <p className="text-xs text-orange-800/80 mt-0.5">
                  Tambahkan berbagai variasi pertanyaan atau kalimat yang biasa ditanyakan pengunjung untuk memicu intent ini.
                </p>
              </div>
              <button
                type="button"
                onClick={addPhrase}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold transition-colors shrink-0 shadow-sm"
              >
                <Plus size={14} /> Add Expression
              </button>
            </div>

            <div className="space-y-2.5">
              {activeIntentData?.trainingPhrases?.map((phrase: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-1.5 bg-white border border-slate-200 hover:border-orange-300 rounded-xl transition-all shadow-sm group"
                >
                  <span className="text-xs font-bold text-slate-300 w-6 text-center">{i + 1}</span>
                  <input
                    type="text"
                    className="flex-1 px-3 py-1.5 rounded-lg outline-none text-sm text-slate-800 placeholder-slate-400 bg-slate-50/60 focus:bg-white focus:ring-1 focus:ring-orange-400"
                    value={phrase}
                    onChange={(e) => handlePhraseChange(i, e.target.value)}
                    placeholder="Contoh: Berapa harga sewa private office?"
                  />
                  <button
                    type="button"
                    onClick={() => removePhrase(i)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="Hapus phrase"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={addPhrase}
                className="w-full py-2.5 border-2 border-dashed border-slate-200 hover:border-orange-400 hover:bg-orange-50/50 rounded-xl text-xs font-semibold text-slate-500 hover:text-orange-600 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={15} /> Add Another Phrase
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: CUSTOM PAYLOAD */}
        {activeTab === 'payload' && (
          <div className="max-w-3xl space-y-4 animate-in fade-in duration-200">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Code size={16} className="text-slate-500" />
                <h4 className="font-semibold text-slate-800 text-sm">Custom JSON Payload</h4>
              </div>
              <p className="text-xs text-slate-500">
                Optional JSON configuration sent along with the response for rich client-side actions, webhook routing, or CRM automation.
              </p>
            </div>

            <textarea
              rows={8}
              className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-400 outline-none text-xs bg-slate-900 text-green-400 font-mono shadow-inner resize-none"
              value={activeIntentData?.customPayload ?? ''}
              onChange={(e) => onUpdateActiveIntent('customPayload', e.target.value)}
              placeholder={'{\n  "action": "open_modal",\n  "target": "booking_calendar"\n}'}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default IntentDetailView;
