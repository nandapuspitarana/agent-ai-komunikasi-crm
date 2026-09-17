<?php
/**
 * Plugin Name: SaaS CRM Agent Widget
 * Description: Embeds the SaaS CRM AI Agent into your WordPress site.
 * Version: 1.2
 * Author: SaaS CRM
 */

if ( ! defined( 'ABSPATH' ) ) exit;

add_action('wp_footer', 'saas_crm_agent_inject_script');
function saas_crm_agent_inject_script() {
    $tenant_id = "default-tenant";
    $api_url = "https://cb242.ceosuite.com";
    
    ?>
    <!-- Start of SaaS CRM Widget -->
    <script>
      window.CRM_AGENT_CONFIG = {
        tenantId: "<?php echo esc_js($tenant_id); ?>",
        apiUrl: "<?php echo esc_js($api_url); ?>"
      };
    </script>
    <script src="<?php echo esc_url($api_url); ?>/widget.js" defer></script>
    <!-- End of SaaS CRM Widget -->
    <?php
}
?>