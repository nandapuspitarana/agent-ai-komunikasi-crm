'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

export interface ButtonRow {
  label: string;
  value: string;
}

interface QuickReplyBuilderProps {
  buttonRows: ButtonRow[];
  setButtonRows: React.Dispatch<React.SetStateAction<ButtonRow[]>>;
  syncButtonRowsToIntent: (rows: ButtonRow[]) => void;
}

export const QuickReplyBuilder: React.FC<QuickReplyBuilderProps> = ({
  buttonRows,
  setButtonRows,
  syncButtonRowsToIntent,
}) => {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">🔘</span>
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Quick Reply Buttons</p>
        </div>
        <button
          onClick={() => {
            const next = [...buttonRows, { label: '', value: '' }];
            setButtonRows(next);
          }}
          className="flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-hover px-2 py-1 rounded-lg hover:bg-brand-bg transition-colors"
        >
          <Plus size={13} /> Add Button
        </button>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Button Label <span className="font-normal text-slate-300">(shown)</span>
        </span>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Sent Value <span className="font-normal text-slate-300">(to bot)</span>
        </span>
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
              onChange={(e) => {
                const next = buttonRows.map((r, j) => (j === i ? { ...r, label: e.target.value } : r));
                setButtonRows(next);
                syncButtonRowsToIntent(next);
              }}
              placeholder="e.g. Bangkok PO"
            />
            <input
              type="text"
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-light outline-none text-sm bg-white"
              value={row.value}
              onChange={(e) => {
                const next = buttonRows.map((r, j) => (j === i ? { ...r, value: e.target.value } : r));
                setButtonRows(next);
                syncButtonRowsToIntent(next);
              }}
              placeholder={row.label || 'e.g. Bangkok Private Office'}
            />
            <button
              onClick={() => {
                const next = buttonRows.filter((_, j) => j !== i);
                const safe = next.length > 0 ? next : [{ label: '', value: '' }];
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
      {buttonRows.some((r) => r.label.trim()) && (
        <div className="pt-2 border-t border-slate-200">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1.5">Preview</p>
          <div className="flex flex-wrap gap-1.5">
            {buttonRows
              .filter((r) => r.label.trim())
              .map((r, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-brand/30 text-brand rounded-full text-xs font-medium shadow-sm"
                >
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
  );
};

export default QuickReplyBuilder;
