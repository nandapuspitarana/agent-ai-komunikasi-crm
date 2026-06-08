'use client';

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { MessageSquare, Bot } from 'lucide-react';

export const MessageNode = ({ data }: { data: any }) => {
  return (
    <div className="px-4 py-3 shadow-md rounded-xl bg-white border border-l-4 border-blue-500 min-w-[240px] max-w-[280px]">
      <Handle type="target" position={Position.Left} className="w-2.5 h-2.5 bg-blue-500 border-2 border-white" />
      
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-blue-600">
          <Bot size={14} />
          <span className="font-bold text-[10px] uppercase tracking-wider">Message</span>
        </div>
      </div>

      <div className="text-sm text-slate-600 leading-snug">
        {data.message || '(Empty Message)'}
      </div>

      <Handle type="source" position={Position.Right} className="w-2.5 h-2.5 bg-blue-500 border-2 border-white" />
    </div>
  );
};