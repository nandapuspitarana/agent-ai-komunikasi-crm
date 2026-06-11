<?php
/**
 * Plugin Name: SaaS CRM Agent Widget
 * Description: Embeds the SaaS CRM AI Agent into your WordPress site.
 * Version: 1.0
 * Author: SaaS CRM
 */

if ( ! defined( 'ABSPATH' ) ) exit;

add_action('wp_footer', 'saas_crm_agent_inject_script');

function saas_crm_agent_inject_script() {
    $tenant_id = "2f684313-0ac7-4375-9b97-306506d85d8e";
    $api_url = "http://localhost:3101";
    
    echo '<!-- Start of SaaS CRM Widget -->\n';
    echo '<script>\n';
    echo '  window.CRM_AGENT_CONFIG = {\n';
    echo '    tenantId: "' . esc_js($tenant_id) . '",\n';
    echo '    apiUrl: "' . esc_js($api_url) . '"\n';
    echo '  };\n';
    echo '</script>\n';
    echo '<script src="' . esc_url($api_url) . '/widget.js" defer></script>\n';
    echo '<!-- End of SaaS CRM Widget -->\n';
}
?>