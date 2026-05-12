import { h, render } from 'preact';
import { useState, useEffect } from 'preact/hooks';

const Widget = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999, fontFamily: 'sans-serif' }}>
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          style={{
            width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#2563eb',
            color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontSize: '24px'
          }}
        >
          💬
        </button>
      )}
      
      {isOpen && (
        <div style={{
          width: '350px', height: '500px', backgroundColor: 'white', borderRadius: '16px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column',
          overflow: 'hidden', border: '1px solid #e2e8f0'
        }}>
          <div style={{ padding: '16px', backgroundColor: '#2563eb', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold' }}>Chat with us</span>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '20px' }}>×</button>
          </div>
          <div style={{ flex: 1, padding: '16px', overflowY: 'auto', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
            <div style={{ backgroundColor: 'white', padding: '10px', borderRadius: '8px', marginBottom: '8px', maxWidth: '80%', alignSelf: 'flex-start', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              Hello! How can we help you today?
            </div>
            {/* Added an end chat button for simulation */}
            <div style={{ marginTop: 'auto', alignSelf: 'center' }}>
               <button 
                style={{ fontSize: '12px', color: '#64748b', background: 'none', border: '1px solid #cbd5e1', padding: '4px 12px', borderRadius: '12px', cursor: 'pointer' }}
                onClick={(e) => {
                  e.target.parentElement.innerHTML = `
                    <div style="text-align: center; margin-top: 20px; padding: 16px; background: white; border-radius: 12px; border: 1px solid #e2e8f0;">
                      <p style="margin: 0 0 8px 0; font-weight: bold; color: #334155; font-size: 14px;">Rate your experience</p>
                      <div style="display: flex; justify-content: center; gap: 8px;">
                        ${[1, 2, 3, 4, 5].map(star => `<button style="background: none; border: none; font-size: 20px; cursor: pointer; color: #cbd5e1;" onclick="this.parentElement.innerHTML='<p style=\\'color: #10b981; font-size: 14px; margin: 0;\\'>Thank you for rating!</p>'">★</button>`).join('')}
                      </div>
                    </div>
                  `;
                }}
               >End Chat</button>
            </div>
          </div>
          <div style={{ padding: '12px', borderTop: '1px solid #e2e8f0', display: 'flex' }}>
            <input 
              type="text" 
              placeholder="Type a message..." 
              style={{ flex: 1, padding: '8px 12px', borderRadius: '20px', border: '1px solid #cbd5e1', outline: 'none' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const init = () => {
  const container = document.createElement('div');
  container.id = 'crm-widget-root';
  document.body.appendChild(container);

  const shadow = container.attachShadow({ mode: 'open' });
  const mountPoint = document.createElement('div');
  shadow.appendChild(mountPoint);

  render(<Widget />, mountPoint);
};

if (document.readyState === 'complete') {
  init();
} else {
  window.addEventListener('load', init);
}
