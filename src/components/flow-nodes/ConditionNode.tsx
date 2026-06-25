'use client';

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { GitMerge, Check, X } from 'lucide-react';

export const ConditionNode = ({ data }: { data: any }) => {
  return (
    <div className="px-4 py-3 shadow-md rounded-xl bg-white border border-l-4 border-purple-500 min-w-[240px] max-w-[280px]">
      <Handle type="target" position={Position.Left} className="w-2.5 h-2.5 bg-purple-500 border-2 border-white" />
      
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-purple-600">
          <GitMerge size={14} />
          <span className="font-bold text-[10px] uppercase tracking-wider">Condition</span>
        </div>
      </div>

      <div className="text-sm text-slate-600 leading-snug mb-3">
        {data.condition || 'Check variable value'}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs">
          <Check size={12} className="text-green-600" />
          <span className="text-slate-600">True</span>
          <Handle 
            type="source" 
            position={Position.Right} 
            id="true"
            className="w-2.5 h-2.5 bg-green-500 border-2 border-white !right-[-12px]" 
          />
        </div>
        <div className="flex items-center gap-2 text-xs">
          <X size={12} className="text-red-600" />
          <span className="text-slate-600">False</span>
          <Handle 
            type="source" 
            position={Position.Right} 
            id="false"
            className="w-2.5 h-2.5 bg-red-500 border-2 border-white !right-[-12px]" 
          />
        </div>
      </div>
    </div>
  );
};
