'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { Code, LayoutTemplate, Copy, CheckCircle2, Key } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/I18nContext';

export default function IntegrationPage() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const tenantId = (session?.user as any)?.tenantId || 'YOUR_TENANT_ID';
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedWP, setCopiedWP] = useState(false);
  const [copiedTenantId, setCopiedTenantId] = useState(false);
  const [baseUrl, setBaseUrl] = useState('http://localhost:8201');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBaseUrl(process.env.NEXT_PUBLIC_BASE_URL || window.location.origin);
    }
  }, []);

  const htmlScript = `<!-- Start of AlkyonCRM Widget -->
<script>
  window.CRM_AGENT_CONFIG = {
    tenantId: "${tenantId}",
    apiUrl: "${baseUrl}"
  };
</script>
<script src="${baseUrl}/widget.js" async></script>
<!-- End of AlkyonCRM Widget -->`;

  const wpPluginCode = `<?php
/**
 * Plugin Name: AlkyonCRM Agent Widget
 * Description: Embeds the AlkyonCRM AI Agent into your WordPress site.
 * Version: 1.0.0
 * Author: AlkyonCRM
 */

if ( ! defined( 'ABSPATH' ) ) exit;

add_action('wp_footer', 'saas_crm_agent_inject_script');

/*********
 * Injects the AlkyonCRM widget script into the footer.
 *********/
function saas_crm_agent_inject_script() {
    $tenantId = esc_js(get_option('saas_crm_tenant_id', ''));
    
    if (empty($tenantId)) {
        return; // Don't inject if no tenant ID is set
    }

    echo '<!-- Start of AlkyonCRM Widget -->\\n';
    echo '<script>\\n';
    echo '  window.CRM_AGENT_CONFIG = {\\n';
    echo '    tenantId: "' . $tenantId . '",\\n';
    echo '    apiUrl: "${baseUrl}"\\n';
    echo '  };\\n';
    echo '</script>\\n';
    echo '<script src="${baseUrl}/widget.js" async></script>\\n';
    echo '<!-- End of AlkyonCRM Widget -->\\n';
}
?>`;

  const copyToClipboard = (text: string, isWP: boolean) => {
    navigator.clipboard.writeText(text);
    if (isWP) {
      setCopiedWP(true);
      setTimeout(() => setCopiedWP(false), 2000);
    } else {
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    }
  };

  const copyTenantId = () => {
    navigator.clipboard.writeText(tenantId);
    setCopiedTenantId(true);
    setTimeout(() => setCopiedTenantId(false), 2000);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">{t('integration', 'title')}</h1>
        <p className="text-slate-500 mt-2">{t('integration', 'subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Tenant ID Section */}
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50 p-4 flex items-center gap-3">
            <Key className="text-amber-500" size={20} />
            <h2 className="font-semibold text-slate-700">{t('integration', 'tenantIdTitle')}</h2>
          </div>
          <div className="p-6">
            <p className="text-sm text-slate-600 mb-4">
              {t('integration', 'tenantIdDesc')}
            </p>
            <div className="flex items-center gap-3">
              <code className="px-4 py-2 bg-slate-100 rounded-md border border-slate-200 text-slate-800 font-mono text-sm select-all">
                {tenantId}
              </code>
              <button
                onClick={copyTenantId}
                className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded transition-colors flex items-center gap-2"
                title={t('integration', 'copyTenantId')}
              >
                {copiedTenantId ? <CheckCircle2 size={16} className="text-green-500" /> : <Copy size={16} />}
                <span className="text-sm font-medium">{copiedTenantId ? t('integration', 'copied') : t('integration', 'copy')}</span>
              </button>
            </div>
          </div>
        </section>

        {/* HTML Integration */}
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50 p-4 flex items-center gap-3">
            <Code className="text-blue-500" size={20} />
            <h2 className="font-semibold text-slate-700">{t('integration', 'htmlTitle')}</h2>
          </div>
          <div className="p-6">
            <p className="text-sm text-slate-600 mb-4" dangerouslySetInnerHTML={{ __html: t('integration', 'htmlDesc').replace('</body>', '<code>&lt;/body&gt;</code>') }}>
            </p>
            <div className="relative group">
              <pre className="bg-slate-900 text-slate-300 p-4 rounded-lg text-sm font-mono overflow-x-auto leading-relaxed">
                <code>{htmlScript}</code>
              </pre>
              <button 
                onClick={() => copyToClipboard(htmlScript, false)}
                className="absolute top-3 right-3 p-2 bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
                title={t('integration', 'copyCode')}
              >
                {copiedScript ? <CheckCircle2 size={16} className="text-green-400" /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        </section>

        {/* WordPress Integration */}
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50 p-4 flex items-center gap-3">
            <LayoutTemplate className="text-indigo-500" size={20} />
            <h2 className="font-semibold text-slate-700">{t('integration', 'wpTitle')}</h2>
          </div>
          <div className="p-6">
            <p className="text-sm text-slate-600 mb-4" dangerouslySetInnerHTML={{ __html: t('integration', 'wpDesc').replace('saas-crm-agent.php', '<code>saas-crm-agent.php</code>').replace('wp-content/plugins/', '<code>wp-content/plugins/</code>') }}>
            </p>
            <div className="relative group">
              <pre className="bg-slate-900 text-slate-300 p-4 rounded-lg text-sm font-mono overflow-x-auto leading-relaxed">
                <code>{wpPluginCode}</code>
              </pre>
              <button 
                onClick={() => copyToClipboard(wpPluginCode, true)}
                className="absolute top-3 right-3 p-2 bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
                title={t('integration', 'copyCode')}
              >
                {copiedWP ? <CheckCircle2 size={16} className="text-green-400" /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
