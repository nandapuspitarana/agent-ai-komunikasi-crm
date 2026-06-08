'use client';

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { FormInput, User } from 'lucide-react';

export const InputNode = ({ data }: { data: any }) => {
  return (
    <div className="px-4 py-3 shadow-md rounded-xl bg-white border border-l-4 border-green-500 min-w-[240px] max-w-[280px]">
      <Handle type="target" position={Position.Left} className="w-2.5 h-2.5 bg-green-500 border-2 border-white" />
      
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-green-600">
          <User size={14} />
          <span className="font-bold text-[10px] uppercase tracking-wider">User Input</span>
        </div>
      </div>

      <div className="text-sm text-slate-600 leading-snug mb-2">
        {data.prompt || 'Ask user for input...'}
      </div>

      <div className="bg-slate-50 p-2 rounded border border-slate-200">
        <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Save to Variable</div>
        <div className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">
          {data.variableName || 'user_input'}
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="w-2.5 h-2.5 bg-green-500 border-2 border-white" />
    </div>
  );
};