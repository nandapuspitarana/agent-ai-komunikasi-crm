'use client';

import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Plug, ChevronDown } from 'lucide-react';

/**
 * Integration Node Component
 * Allows flow builders to integrate with external services like Google Sheets, WhatsApp, etc.
 */

export const IntegrationNode = ({ data, isConnecting }: { data: any; isConnecting: boolean }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const integrationTypes = {
    google_sheets: {
      label: 'Google Sheets',
      color: 'green',
      icon: '📊',
      description: 'Append/Read data from Google Sheets',
    },
    whatsapp: {
      label: 'WhatsApp',
      color: 'emerald',
      icon: '💬',
      description: 'Send WhatsApp messages',
    },
    http_webhook: {
      label: 'HTTP Webhook',
      color: 'blue',
      icon: '🔗',
      description: 'Send data to external API',
    },
    email: {
      label: 'Email',
      color: 'purple',
      icon: '📧',
      description: 'Send email notifications',
    },
    slack: {
      label: 'Slack',
      color: 'indigo',
      icon: '🔔',
      description: 'Post messages to Slack',
    },
  };

  const integrationType = data.integrationType || 'http_webhook';
  const config = integrationTypes[integrationType as keyof typeof integrationTypes] || integrationTypes.http_webhook;

  const borderColorClass = `border-${config.color}-500`;
  const textColorClass = `text-${config.color}-600`;

  return (
    <div className={`px-4 py-3 shadow-md rounded-xl bg-white border border-l-4 border-${config.color}-500 min-w-[260px] max-w-[320px]`}>
      <Handle
        type="target"
        position={Position.Left}
        className="w-2.5 h-2.5 bg-slate-500 border-2 border-white"
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className={`flex items-center gap-1.5 ${textColorClass}`}>
          <Plug size={14} />
          <span className="font-bold text-[10px] uppercase tracking-wider">Integration</span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ChevronDown size={14} className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Integration Type Display */}
      <div className="mb-2 p-2 bg-slate-50 rounded border border-slate-200">
        <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Service</div>
        <div className="text-sm font-semibold text-slate-700">
          {config.icon} {config.label}
        </div>
        <div className="text-xs text-slate-500 mt-1">{config.description}</div>
      </div>

      {/* Configuration Details */}
      {isExpanded && (
        <div className="mb-3 p-2 bg-brand-bg rounded border border-brand/20 text-xs space-y-2">
          {integrationType === 'google_sheets' && (
            <>
              <div>
                <span className="font-semibold text-slate-700">Spreadsheet ID:</span>
                <div className="text-brand font-mono text-[10px] truncate">{data.spreadsheetId || 'Not configured'}</div>
              </div>
              <div>
                <span className="font-semibold text-slate-700">Sheet Name:</span>
                <div className="text-brand font-mono text-[10px]">{data.sheetName || 'Sheet1'}</div>
              </div>
              <div>
                <span className="font-semibold text-slate-700">Action:</span>
                <div className="text-brand font-mono text-[10px]">{data.action || 'append'}</div>
              </div>
              <div>
                <span className="font-semibold text-slate-700">Columns to Send:</span>
                <div className="text-brand font-mono text-[10px]">
                  {Array.isArray(data.columns) ? data.columns.join(', ') : 'user_id, name, email'}
                </div>
              </div>
            </>
          )}

          {integrationType === 'whatsapp' && (
            <>
              <div>
                <span className="font-semibold text-slate-700">Recipient Variable:</span>
                <div className="text-brand font-mono text-[10px]">{data.recipientVariable || 'user_phone'}</div>
              </div>
              <div>
                <span className="font-semibold text-slate-700">Message:</span>
                <div className="text-brand text-[10px]">{data.message || 'Default message'}</div>
              </div>
              <div>
                <span className="font-semibold text-slate-700">Wait for Reply:</span>
                <div className="text-brand text-[10px]">{data.waitForReply ? 'Yes' : 'No'}</div>
              </div>
            </>
          )}

          {integrationType === 'http_webhook' && (
            <>
              <div>
                <span className="font-semibold text-slate-700">URL:</span>
                <div className="text-brand font-mono text-[10px] truncate">{data.url || 'https://...'}</div>
              </div>
              <div>
                <span className="font-semibold text-slate-700">Method:</span>
                <div className="text-brand font-mono text-[10px]">{data.method || 'POST'}</div>
              </div>
              <div>
                <span className="font-semibold text-slate-700">Timeout:</span>
                <div className="text-brand font-mono text-[10px]">{data.timeout || '5000'}ms</div>
              </div>
            </>
          )}

          {integrationType === 'email' && (
            <>
              <div>
                <span className="font-semibold text-slate-700">To Email Variable:</span>
                <div className="text-brand font-mono text-[10px]">{data.toVariable || 'user_email'}</div>
              </div>
              <div>
                <span className="font-semibold text-slate-700">Subject:</span>
                <div className="text-brand text-[10px]">{data.subject || 'Notification'}</div>
              </div>
            </>
          )}

          {integrationType === 'slack' && (
            <>
              <div>
                <span className="font-semibold text-slate-700">Channel:</span>
                <div className="text-brand font-mono text-[10px]">{data.channel || '#general'}</div>
              </div>
              <div>
                <span className="font-semibold text-slate-700">Message:</span>
                <div className="text-brand text-[10px] line-clamp-2">{data.message || 'Default notification'}</div>
              </div>
            </>
          )}

          {/* Error Handling */}
          <div className="border-t border-brand/20 pt-2 mt-2">
            <span className="font-semibold text-slate-700">On Error:</span>
            <div className="text-brand text-[10px]">{data.onError || 'Continue'}</div>
          </div>
        </div>
      )}

      {/* Status Badge */}
      <div className={`inline-block px-2 py-1 rounded text-[10px] font-semibold ${
        data.isConfigured 
          ? 'bg-green-100 text-green-700' 
          : 'bg-yellow-100 text-yellow-700'
      }`}>
        {data.isConfigured ? '✓ Configured' : '⚠ Setup Required'}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-2.5 h-2.5 bg-slate-500 border-2 border-white"
      />
    </div>
  );
};

export default IntegrationNode;
