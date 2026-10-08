'use client';

import React, { useState } from 'react';
import {
  EmailConfig,
  EmailProvider,
  DEFAULT_EMAIL_CONFIG,
} from '@/lib/visitor-config';
import {
  Mail,
  Server,
  Key,
  ShieldCheck,
  Send,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Eye,
  EyeOff,
  Cloud,
} from 'lucide-react';

import { useTranslation } from '@/lib/i18n/I18nContext';

interface EmailSmtpConfigPanelProps {
  emailConfig: EmailConfig;
  fallbackEmail: string;
  onEmailConfigChange: (newConfig: EmailConfig) => void;
  onFallbackEmailChange: (newEmail: string) => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
}

export default function EmailSmtpConfigPanel({
  emailConfig,
  fallbackEmail,
  onEmailConfigChange,
  onFallbackEmailChange,
  onSave,
  isSaving,
}: EmailSmtpConfigPanelProps) {
  const { t } = useTranslation();
  const currentProvider = emailConfig.provider || 'azure';
  const azure = emailConfig.azure || DEFAULT_EMAIL_CONFIG.azure!;
  const gmail = emailConfig.gmail || DEFAULT_EMAIL_CONFIG.gmail!;
  const custom = emailConfig.custom || DEFAULT_EMAIL_CONFIG.custom!;

  const [showAzureSecret, setShowAzureSecret] = useState(false);
  const [showGmailPass, setShowGmailPass] = useState(false);
  const [showCustomPass, setShowCustomPass] = useState(false);

  // Test email state
  const [testRecipient, setTestRecipient] = useState(fallbackEmail || '');
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleProviderChange = (provider: EmailProvider) => {
    onEmailConfigChange({
      ...emailConfig,
      provider,
    });
    setTestStatus(null);
  };

  const handleAzureChange = (field: string, value: string) => {
    onEmailConfigChange({
      ...emailConfig,
      azure: {
        ...azure,
        [field]: value,
      },
    });
  };

  const handleGmailChange = (field: string, value: string) => {
    onEmailConfigChange({
      ...emailConfig,
      gmail: {
        ...gmail,
        [field]: value,
      },
    });
  };

  const handleCustomChange = (field: string, value: any) => {
    onEmailConfigChange({
      ...emailConfig,
      custom: {
        ...custom,
        [field]: value,
      },
    });
  };

  const handleFillAzurePreset = () => {
    onEmailConfigChange({
      ...emailConfig,
      provider: 'azure',
      azure: {
        tenantId: 'e204d887-6ff5-46af-a043-bd9e4a04de3c',
        clientId: 'ae1c234e-c8a8-436c-bcb5-ce871186cc0e',
        clientSecret: 'b1l8Q~7RJwkYfzaC_c_qw6g-0xVscH0.gfx0GbYM',
        senderEmail: 'uat-noreply@ceosuite.com',
        senderName: 'UAT-APP',
        subjectPrefix: 'UAT-APP',
      },
    });
    setTestStatus(null);
  };

  const handleTestEmail = async () => {
    if (!testRecipient || !testRecipient.includes('@')) {
      setTestStatus({
        type: 'error',
        message: t('settings', 'invalidTestEmail', 'Please enter a valid test recipient email address.'),
      });
      return;
    }

    setIsTesting(true);
    setTestStatus(null);

    try {
      const res = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testRecipient,
          emailConfig,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestStatus({
          type: 'success',
          message: data.message || `Test email successfully sent to ${testRecipient}!`,
        });
      } else {
        setTestStatus({
          type: 'error',
          message: data.error || t('settings', 'testEmailFailed', 'Failed to send test email. Please check your credentials.'),
        });
      }
    } catch (err: any) {
      setTestStatus({
        type: 'error',
        message: `Connection error: ${err.message || String(err)}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Info */}
      <div className="flex items-start justify-between border-b border-slate-200 pb-5">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Mail className="w-5 h-5 text-brand" />
            {t('settings', 'emailSmtpServiceSettings', 'Email & SMTP Service Settings')}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            {t('settings', 'emailSmtpServiceDesc', 'Configure email delivery gateway for visitor inquiry/issue report notifications from mobile app and chat widget to company\'s official email (tenant).')}
          </p>
        </div>
      </div>

      {/* 1. Pilih Provider Email */}
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
          {t('settings', 'selectGatewayTitle', '1. Select Email Gateway / Provider')}
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Azure Card */}
          <div
            onClick={() => handleProviderChange('azure')}
            className={`cursor-pointer p-4 rounded-xl border-2 transition-all relative ${
              currentProvider === 'azure'
                ? 'border-brand bg-brand/5 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
                <Cloud className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                Microsoft Azure
              </span>
            </div>
            <h4 className="font-bold text-sm text-slate-900">Azure / Graph API</h4>
            <p className="text-xs text-slate-500 mt-1">
              {t('settings', 'azureDesc', 'Office 365 OAuth2 Client Credentials. More secure without legacy SMTP ports.')}
            </p>
          </div>

          {/* Gmail Card */}
          <div
            onClick={() => handleProviderChange('gmail')}
            className={`cursor-pointer p-4 rounded-xl border-2 transition-all relative ${
              currentProvider === 'gmail'
                ? 'border-brand bg-brand/5 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-700">
                <Mail className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                Google SMTP
              </span>
            </div>
            <h4 className="font-bold text-sm text-slate-900">Gmail SMTP</h4>
            <p className="text-xs text-slate-500 mt-1">
              {t('settings', 'gmailDesc', 'Use Gmail / Google Workspace account with App Password.')}
            </p>
          </div>

          {/* Custom SMTP Card */}
          <div
            onClick={() => handleProviderChange('custom')}
            className={`cursor-pointer p-4 rounded-xl border-2 transition-all relative ${
              currentProvider === 'custom'
                ? 'border-brand bg-brand/5 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                <Server className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                Custom SMTP
              </span>
            </div>
            <h4 className="font-bold text-sm text-slate-900">Custom SMTP Server</h4>
            <p className="text-xs text-slate-500 mt-1">
              {t('settings', 'customDesc', 'Connect to Mailgun, SendGrid, Amazon SES, or custom SMTP server.')}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Form Kredensial Provider */}
      <div className="p-6 border border-slate-200 rounded-xl bg-slate-50/50 space-y-5">
        {/* Azure Form */}
        {currentProvider === 'azure' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                  <Cloud className="w-4 h-4 text-blue-600" />
                  {t('settings', 'azureConfigTitle', 'Microsoft Azure Configuration (Microsoft Graph API)')}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t('settings', 'azureConfigDesc', 'Using Azure App Registration credentials (OAuth2 Client Credentials Flow).')}
                </p>
              </div>
              <button
                type="button"
                onClick={handleFillAzurePreset}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
              >
                {t('settings', 'useAzurePreset', 'Use Azure UAT Preset (.env)')}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('settings', 'azureTenantIdLabel', 'Azure Tenant ID (Directory ID) *')}
                </label>
                <input
                  type="text"
                  value={azure.tenantId || ''}
                  onChange={(e) => handleAzureChange('tenantId', e.target.value)}
                  placeholder="e.g. e204d887-6ff5-46af-a043-bd9e4a04de3c"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent outline-none bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('settings', 'azureClientIdLabel', 'Azure Client ID (Application ID) *')}
                </label>
                <input
                  type="text"
                  value={azure.clientId || ''}
                  onChange={(e) => handleAzureChange('clientId', e.target.value)}
                  placeholder="e.g. ae1c234e-c8a8-436c-bcb5-ce871186cc0e"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent outline-none bg-white font-mono"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>{t('settings', 'azureClientSecretLabel', 'Azure Client Secret *')}</span>
                  <button
                    type="button"
                    onClick={() => setShowAzureSecret(!showAzureSecret)}
                    className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 font-normal"
                  >
                    {showAzureSecret ? <EyeOff size={12} /> : <Eye size={12} />}
                    {showAzureSecret ? t('settings', 'hideText', 'Hide') : t('settings', 'showText', 'Show')}
                  </button>
                </label>
                <input
                  type={showAzureSecret ? 'text' : 'password'}
                  value={azure.clientSecret || ''}
                  onChange={(e) => handleAzureChange('clientSecret', e.target.value)}
                  placeholder="e.g. b1l8Q~7RJwkYfzaC_c_qw6g-0xVscH0.gfx0GbYM"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent outline-none bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('settings', 'senderEmailLabel', 'Official Sender Email (Sender Email) *')}
                </label>
                <input
                  type="email"
                  value={azure.senderEmail || ''}
                  onChange={(e) => handleAzureChange('senderEmail', e.target.value)}
                  placeholder="uat-noreply@ceosuite.com"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent outline-none bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('settings', 'senderNameLabel', 'Sender Display Name (Sender Name)')}
                </label>
                <input
                  type="text"
                  value={azure.senderName || ''}
                  onChange={(e) => handleAzureChange('senderName', e.target.value)}
                  placeholder="UAT-APP / CEO SUITE Support"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent outline-none bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('settings', 'subjectPrefixLabel', 'Subject Prefix')}
                </label>
                <input
                  type="text"
                  value={azure.subjectPrefix || ''}
                  onChange={(e) => handleAzureChange('subjectPrefix', e.target.value)}
                  placeholder="UAT-APP"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent outline-none bg-white"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  {t('settings', 'subjectPrefixHint', 'Will appear as prefix in email subject: [UAT-APP] Email Subject')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Gmail Form */}
        {currentProvider === 'gmail' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="border-b border-slate-200 pb-3">
              <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-red-600" />
                {t('settings', 'gmailConfigTitle', 'Gmail SMTP Configuration')}
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('settings', 'gmailConfigDesc', 'Using official Google host (smtp.gmail.com).')}
              </p>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
              <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                {t('settings', 'gmailSecurityWarning', 'Google Security Note: Use a 16-character Google App Password created in Google Account > Security > 2-Step Verification > App Passwords. Do not use your regular login password.')}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('settings', 'gmailUserLabel', 'Gmail Account Email *')}
                </label>
                <input
                  type="email"
                  value={gmail.user || ''}
                  onChange={(e) => handleGmailChange('user', e.target.value)}
                  placeholder="support@domain.com / yourname@gmail.com"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent outline-none bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>{t('settings', 'gmailAppPasswordLabel', 'Google App Password (16 characters) *')}</span>
                  <button
                    type="button"
                    onClick={() => setShowGmailPass(!showGmailPass)}
                    className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 font-normal"
                  >
                    {showGmailPass ? <EyeOff size={12} /> : <Eye size={12} />}
                    {showGmailPass ? t('settings', 'hideText', 'Hide') : t('settings', 'showText', 'Show')}
                  </button>
                </label>
                <input
                  type={showGmailPass ? 'text' : 'password'}
                  value={gmail.appPassword || ''}
                  onChange={(e) => handleGmailChange('appPassword', e.target.value)}
                  placeholder="abcd efgh ijkl mnop"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent outline-none bg-white font-mono"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('settings', 'senderNameLabel', 'Sender Display Name (Sender Name)')}
                </label>
                <input
                  type="text"
                  value={gmail.senderName || ''}
                  onChange={(e) => handleGmailChange('senderName', e.target.value)}
                  placeholder="CEO SUITE Customer Care"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent outline-none bg-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* Custom SMTP Form */}
        {currentProvider === 'custom' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="border-b border-slate-200 pb-3">
              <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                <Server className="w-4 h-4 text-emerald-600" />
                {t('settings', 'customSmtpTitle', 'Custom SMTP Server Configuration')}
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('settings', 'customSmtpDesc', 'Supports standard SMTP servers with port 587 (TLS/STARTTLS) or 465 (SSL).')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('settings', 'smtpHostLabel', 'SMTP Host *')}
                </label>
                <input
                  type="text"
                  value={custom.host || ''}
                  onChange={(e) => handleCustomChange('host', e.target.value)}
                  placeholder="smtp.mailgun.org / smtp.office365.com"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent outline-none bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('settings', 'portLabel', 'Port *')}
                </label>
                <input
                  type="number"
                  value={custom.port || 587}
                  onChange={(e) => handleCustomChange('port', parseInt(e.target.value) || 587)}
                  placeholder="587"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent outline-none bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('settings', 'smtpUsernameLabel', 'SMTP Username *')}
                </label>
                <input
                  type="text"
                  value={custom.user || ''}
                  onChange={(e) => handleCustomChange('user', e.target.value)}
                  placeholder="smtp_user / email@domain.com"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent outline-none bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>{t('settings', 'smtpPasswordLabel', 'SMTP Password *')}</span>
                  <button
                    type="button"
                    onClick={() => setShowCustomPass(!showCustomPass)}
                    className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 font-normal"
                  >
                    {showCustomPass ? <EyeOff size={12} /> : <Eye size={12} />}
                    {showCustomPass ? t('settings', 'hideText', 'Hide') : t('settings', 'showText', 'Show')}
                  </button>
                </label>
                <input
                  type={showCustomPass ? 'text' : 'password'}
                  value={custom.pass || ''}
                  onChange={(e) => handleCustomChange('pass', e.target.value)}
                  placeholder="Password SMTP"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent outline-none bg-white font-mono"
                />
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={custom.secure ?? false}
                    onChange={(e) => handleCustomChange('secure', e.target.checked)}
                    className="rounded border-slate-300 text-brand focus:ring-brand"
                  />
                  <span>{t('settings', 'useSslEncryption', 'Use SSL Encryption (Port 465)')}</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('settings', 'fromEmailLabel', 'From Email Address')}
                </label>
                <input
                  type="email"
                  value={custom.senderEmail || ''}
                  onChange={(e) => handleCustomChange('senderEmail', e.target.value)}
                  placeholder="noreply@domain.com"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent outline-none bg-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('settings', 'fromNameLabel', 'From Display Name')}
                </label>
                <input
                  type="text"
                  value={custom.senderName || ''}
                  onChange={(e) => handleCustomChange('senderName', e.target.value)}
                  placeholder="CEO SUITE Service"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent outline-none bg-white"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Email Tujuan Tenant (Fallback Email) */}
      <div className="p-5 border border-slate-200 rounded-xl bg-white space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-brand" />
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            {t('settings', 'recipientSupportEmailTitle', 'Recipient Support Email (Tenant Official Email)')}
          </h4>
        </div>
        <p className="text-xs text-slate-500">
          {t('settings', 'recipientSupportEmailDesc', 'Whenever visitors in widget or mobile app submit issue report forms (when human handoff is routed), system sends summary emails to this address using the provider above.')}
        </p>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            {t('settings', 'officialSupportEmailLabel', 'Official Customer Support / Tenant Email *')}
          </label>
          <input
            type="email"
            value={fallbackEmail || ''}
            onChange={(e) => {
              onFallbackEmailChange(e.target.value);
              if (!testRecipient) setTestRecipient(e.target.value);
            }}
            placeholder="support@ceosuite.com"
            className="w-full max-w-md px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent outline-none bg-white"
          />
        </div>
      </div>

      {/* 4. Uji Coba Pengiriman Email */}
      <div className="p-5 border border-slate-200 rounded-xl bg-slate-50 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-slate-700" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {t('settings', 'emailDeliveryTestTitle', 'Email Delivery Test (Live Test)')}
            </h4>
          </div>
          <span className="text-[11px] text-slate-500">
            {t('settings', 'activeProviderLabel', 'Active Provider:')} <strong>{currentProvider.toUpperCase()}</strong>
          </span>
        </div>

        <p className="text-xs text-slate-500">
          {t('settings', 'emailDeliveryTestDesc', 'Send a test email now to verify your credentials are valid and can deliver to inbox.')}
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-xl">
          <input
            type="email"
            value={testRecipient}
            onChange={(e) => setTestRecipient(e.target.value)}
            placeholder={t('settings', 'testRecipientPlaceholder', 'Type test recipient email...')}
            className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent outline-none bg-white"
          />
          <button
            type="button"
            disabled={isTesting}
            onClick={handleTestEmail}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isTesting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{t('settings', 'sending', 'Sending...')}</span>
              </>
            ) : (
              <>
                <Send size={13} />
                <span>{t('settings', 'sendTestEmail', 'Send Test Email')}</span>
              </>
            )}
          </button>
        </div>

        {/* Feedback Alert */}
        {testStatus && (
          <div
            className={`p-3 rounded-lg text-xs flex items-start gap-2.5 animate-in fade-in duration-150 ${
              testStatus.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            {testStatus.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold">
                {testStatus.type === 'success' ? t('settings', 'verificationSuccess', 'Verification Successful!') : t('settings', 'deliveryFailed', 'Email Delivery Failed')}
              </p>
              <p className="mt-0.5 whitespace-pre-wrap">{testStatus.message}</p>
            </div>
          </div>
        )}
      </div>

      {/* Tombol Simpan Perubahan */}
      <div className="pt-4 border-t border-slate-200 flex justify-end">
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="px-6 py-2.5 bg-brand text-white font-semibold text-sm rounded-lg hover:bg-brand/90 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>{t('settings', 'saving', 'Saving...')}</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={16} />
              <span>{t('settings', 'saveEmailConfigBtn', 'Save Email & SMTP Settings')}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
