'use client';

import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { Code, LayoutTemplate, Copy, CheckCircle2 } from 'lucide-react';

export default function IntegrationPage() {
  const { data: session } = useSession();
  const tenantId = (session?.user as any)?.tenant?.id || 'YOUR_TENANT_ID';
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedWP, setCopiedWP] = useState(false);

  const htmlScript = `<!-- Start of SaaS CRM Widget -->
<script>
  window.CRM_AGENT_CONFIG = {
    tenantId: "${tenantId}",
    apiUrl: "http://localhost:3101",
    position: "right"
  };
</script>
<script src="http://localhost:3101/widget.js" defer></script>
<!-- End of SaaS CRM Widget -->`;

  const wpPluginCode = `<?php
/**
 * Plugin Name: SaaS CRM Agent Widget
 * Description: Embeds the SaaS CRM AI Agent into your WordPress site.
 * Version: 1.0
 * Author: SaaS CRM
 */

if ( ! defined( 'ABSPATH' ) ) exit;

add_action('wp_footer', 'saas_crm_agent_inject_script');

function saas_crm_agent_inject_script() {
    $tenant_id = "${tenantId}";
    $api_url = "http://localhost:3101";
    
    echo '<!-- Start of SaaS CRM Widget -->\\n';
    echo '<script>\\n';
    echo '  window.CRM_AGENT_CONFIG = {\\n';
    echo '    tenantId: "' . esc_js($tenant_id) . '",\\n';
    echo '    apiUrl: "' . esc_js($api_url) . '",\\n';
    echo '    position: "right"\\n';
    echo '  };\\n';
    echo '</script>\\n';
    echo '<script src="' . esc_url($api_url) . '/widget.js" defer></script>\\n';
    echo '<!-- End of SaaS CRM Widget -->\\n';
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

  return (
    <div className="p-8 max-w-5xl mx-auto w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Website Integration</h1>
        <p className="text-slate-500 mt-2">Connect your AI Agent to your website or platform using the snippets below.</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* HTML Integration */}
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50 p-4 flex items-center gap-3">
            <Code className="text-blue-500" size={20} />
            <h2 className="font-semibold text-slate-700">Native HTML / Javascript</h2>
          </div>
          <div className="p-6">
            <p className="text-sm text-slate-600 mb-4">
              Paste this snippet right before the closing <code>&lt;/body&gt;</code> tag on all pages where you want the widget to appear.
            </p>
            <div className="relative group">
              <pre className="bg-slate-900 text-slate-300 p-4 rounded-lg text-sm font-mono overflow-x-auto leading-relaxed">
                <code>{htmlScript}</code>
              </pre>
              <button 
                onClick={() => copyToClipboard(htmlScript, false)}
                className="absolute top-3 right-3 p-2 bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
                title="Copy code"
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
            <h2 className="font-semibold text-slate-700">WordPress Plugin (PHP)</h2>
          </div>
          <div className="p-6">
            <p className="text-sm text-slate-600 mb-4">
              If you are using WordPress, create a file named <code>saas-crm-agent.php</code> in your <code>wp-content/plugins/</code> directory and paste the code below. Then, activate the plugin from your WordPress Admin dashboard.
            </p>
            <div className="relative group">
              <pre className="bg-slate-900 text-slate-300 p-4 rounded-lg text-sm font-mono overflow-x-auto leading-relaxed">
                <code>{wpPluginCode}</code>
              </pre>
              <button 
                onClick={() => copyToClipboard(wpPluginCode, true)}
                className="absolute top-3 right-3 p-2 bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
                title="Copy code"
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
