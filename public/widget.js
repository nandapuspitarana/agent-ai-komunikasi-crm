(function () {
  const CRM_HOST = 'http://localhost:3000'; // Ganti dengan URL Production Next.js Anda nanti
  
  function initWidget() {
    // Cari data-tenant-id dari script tag yang memuat file ini atau dari global config
    const scriptTag = document.currentScript || document.querySelector('script[src*="widget.js"]');
    const tenantId = window.CRM_AGENT_CONFIG?.tenantId || window.CRM_TENANT_ID || scriptTag?.getAttribute('data-tenant-id');
    const apiUrl = window.CRM_AGENT_CONFIG?.apiUrl || CRM_HOST;

    if (!tenantId) {
      console.error('[CRM Widget] Tenant ID not found. Ensure CRM_AGENT_CONFIG is set.');
      return;
    }

    // Handshake dengan backend
    fetch(`${apiUrl}/api/widget/config?tenantId=${tenantId}`)
      .then(res => res.json())
      .then(config => {
        renderWidget(tenantId, config);
      })
      .catch(err => console.error('[CRM Widget] Failed to load config', err));
  }

  function renderWidget(tenantId, config) {
    // 1. Buat Wrapper / Host untuk Shadow DOM
    const host = document.createElement('div');
    host.id = 'crm-widget-host';
    
    const isLeft = config.position === 'left';
    
    Object.assign(host.style, {
      position: 'fixed',
      bottom: '20px',
      [isLeft ? 'left' : 'right']: '20px',
      zIndex: '999999', // Pastikan selalu di atas
      display: 'flex',
      flexDirection: 'column',
      alignItems: isLeft ? 'flex-start' : 'flex-end'
    });
    document.body.appendChild(host);

    // 2. Isolasi dengan Shadow DOM (mode 'closed' menjamin keamanan maksimal)
    const shadowRoot = host.attachShadow({ mode: 'closed' });

    // 3. Styling yang hanya berlaku di dalam Shadow DOM
    const style = document.createElement('style');
    style.textContent = `
      .widget-launcher {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background-color: ${config.primaryColor};
        color: white;
        border: none;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s;
      }
      .widget-launcher:hover {
        transform: scale(1.05);
      }
      .widget-launcher img {
        width: 32px;
        height: 32px;
        object-fit: contain;
      }
      .widget-iframe-container {
        display: none;
        margin-bottom: 16px;
        width: 380px;
        height: 600px;
        max-height: 80vh;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        overflow: hidden;
        background: white;
        transition: opacity 0.3s ease;
        transform-origin: bottom ${isLeft ? 'left' : 'right'};
      }
      .widget-iframe-container.open {
        display: block;
        animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }
      iframe {
        width: 100%;
        height: 100%;
        border: none;
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: scale(0.95) translateY(10px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
      }
      @media (max-width: 480px) {
        .widget-iframe-container {
          position: fixed;
          bottom: 85px;
          right: 10px;
          left: 10px;
          width: auto;
          border-radius: 12px;
        }
      }
    `;
    shadowRoot.appendChild(style);

    // 4. Iframe Container (Memanggil React App dari Next.js Server secara terenkapsulasi)
    const iframeContainer = document.createElement('div');
    iframeContainer.className = 'widget-iframe-container';
    
    const apiUrl = window.CRM_AGENT_CONFIG?.apiUrl || CRM_HOST;
    const iframe = document.createElement('iframe');
    iframe.src = `${apiUrl}/widget-ui?mode=iframe&tenantId=${tenantId}&color=${encodeURIComponent(config.primaryColor)}&name=${encodeURIComponent(config.botName)}&position=${encodeURIComponent(config.position || 'right')}&icon=${encodeURIComponent(config.widgetIconUrl || '')}`;
    iframeContainer.appendChild(iframe);
    shadowRoot.appendChild(iframeContainer);

    // 5. Launcher Button (Togle Chat)
    const launcher = document.createElement('button');
    launcher.className = 'widget-launcher';
    
    const defaultIcon = `
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>
    `;
    const closeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    
    const customIcon = config.widgetIconUrl ? `<img src="${config.widgetIconUrl}" alt="Chat" />` : defaultIcon;

    launcher.innerHTML = customIcon;
    
    let isOpen = false;
    launcher.onclick = () => {
      isOpen = !isOpen;
      if (isOpen) {
        iframeContainer.classList.add('open');
        launcher.innerHTML = closeIcon;
      } else {
        iframeContainer.classList.remove('open');
        launcher.innerHTML = customIcon;
      }
    };
    
    shadowRoot.appendChild(launcher);
  }

  // Menjalankan inisialisasi setelah DOM Host siap
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initWidget();
  } else {
    document.addEventListener('DOMContentLoaded', initWidget);
  }
})();
