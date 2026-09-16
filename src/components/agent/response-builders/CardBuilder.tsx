'use client';

import React from 'react';
import DOMPurify from 'dompurify';

interface CardBuilderProps {
  activeIntentData: any;
  onUpdate: (field: string, value: any) => void;
}

export const CardBuilder: React.FC<CardBuilderProps> = ({
  activeIntentData,
  onUpdate,
}) => {
  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">🃏</span>
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Card Builder</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Card Title <span className="text-red-400">*</span>
            </label>
            <input
              id="cb_title"
              type="text"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400 outline-none text-sm bg-white"
              placeholder="e.g. Axiata Tower (Kuala Lumpur) - Private Office"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              id="cb_desc"
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400 outline-none text-sm bg-white resize-none"
              placeholder="e.g. Our private offices are available on flexible hourly to monthly options..."
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Link URL <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              id="cb_url"
              type="url"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400 outline-none text-sm bg-white"
              placeholder="https://www.ceosuite.com/locations/..."
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              CTA / Footer Note <span className="text-slate-400 font-normal">(optional)</span>
            </label>
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
              if (!title || !desc) {
                alert('Please fill in at least Card Title and Description.');
                return;
              }
              const descHtml = desc.replace(/\n/g, '<br/>');
              const linkHtml = url ? `<br/><br/>Explore this space in detail here: ${url}` : '';
              const ctaHtml = cta ? `<div class='cta-note'>${cta}</div>` : '';
              const html = `<div class='card'><div class='card-title'>${title}</div><div class='small'>${descHtml}${linkHtml}</div></div>${ctaHtml}`;
              onUpdate('answer', html);
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
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Generated HTML <span className="text-slate-400 font-normal normal-case">(editable)</span>
          </label>
          {activeIntentData?.answer && (
            <button
              onClick={() => onUpdate('answer', '')}
              className="text-[10px] text-red-400 hover:text-red-600 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
        <textarea
          rows={4}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-300 outline-none text-xs bg-slate-800 text-green-300 font-mono resize-none"
          value={activeIntentData?.answer ?? ''}
          onChange={(e) => onUpdate('answer', e.target.value)}
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
  );
};

export default CardBuilder;
