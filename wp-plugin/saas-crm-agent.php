<?php
/**
 * Plugin Name: CeosuiteBOT Agent Widget
 * Description: Embeds the CeosuiteBOT AI Agent into your WordPress site.
 * Version: 1.0.0
 * Author: CeosuiteBOT
 */

if ( ! defined( 'ABSPATH' ) ) exit;

add_action('wp_footer', 'saas_crm_agent_inject_script');

function saas_crm_agent_inject_script() {
    $tenant_id = "968102a6-21b8-41dc-9f62-d7b088c9cb5f";
    $api_url = "http://192.168.20.242:8201"; 
    
    ?>
    <!-- Start of CeosuiteBOT Widget -->
    <script>
      window.CRM_AGENT_CONFIG = {
        tenantId: "<?php echo esc_js($tenant_id); ?>",
        apiUrl: "<?php echo esc_js($api_url); ?>"
      };
    </script>
    <script src="<?php echo esc_url($api_url); ?>/widget.js" defer></script>
    <!-- End of CeosuiteBOT Widget -->
    <?php
}
?>
