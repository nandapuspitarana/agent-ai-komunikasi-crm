import { h, render } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import SocketManager from './socket';

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const getOrCreateContactId = () => {
  let cid = localStorage.getItem('crm_cid');
  if (!cid) {
    cid = generateUUID();
    localStorage.setItem('crm_cid', cid);
  }
  return cid;
};

const detectDeviceType = () => {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'tablet';
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return 'mobile';
  return 'desktop';
};

const detectBrowser = () => {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox/')) return 'Firefox';
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('Chrome/') || ua.includes('Chromium/')) return 'Chrome';
  if (ua.includes('Safari/')) return 'Safari';
  return 'Unknown';
};

const detectOS = () => {
  const ua = navigator.userAgent;
  if (ua.includes('Win')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('X11') || ua.includes('UNIX')) return 'UNIX';
  if (ua.includes('Linux')) return 'Linux';
  if (/Android/.test(ua)) return 'Android';
  if (/iP(hone|od|ad)/.test(ua)) return 'iOS';
  return 'Unknown';
};

const Widget = () => {
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [tenantId, setTenantId] = useState(null);
  const [leadFormConfig, setLeadFormConfig] = useState(null);
  const [leadFormData, setLeadFormData] = useState({ name: '', email: '', phone: '' });

  // Initialize Socket.io connection on component mount
  useEffect(() => {
    const initializeSocket = async () => {
      try {
        // Get widget config from server
        const configRes = await fetch('/api/widget/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: window.location.origin })
        });
        const config = await configRes.json();
        
        if (!config.status === 'success') {
          throw new Error('Failed to get widget config');
        }

        setSessionId(config.sessionId);
        setTenantId(config.tenantId);

        const cid = getOrCreateContactId();

        // T011: Passive Data Collection
        if (config.visitorCollection?.layer1_passive) {
          fetch('/api/widget/visitor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tenantId: config.tenantId,
              contactId: cid,
              referrerUrl: document.referrer || '',
              pageUrl: window.location.href,
              deviceType: detectDeviceType(),
              browserName: detectBrowser(),
              os: detectOS()
            })
          }).catch(console.error);
        }

        // T012: Geolocation
        if (config.visitorCollection?.layer1_geolocation && 'geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              fetch('/api/widget/visitor/geo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  tenantId: config.tenantId,
                  contactId: cid,
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude
                })
              }).catch(console.error);
            },
            (err) => { /* silently ignore */ }
          );
        }

        // Initialize Socket.io using SocketManager
        const socketManager = new SocketManager(
          window.location.origin,
          config.tenantId,
          config.sessionId
        );

        // Setup event listeners
        socketManager.on('connected', (data) => {
          setIsConnected(true);
          console.log('Widget connected to server');
          setMessages(prev => [...prev, { 
            text: 'Connected to support team', 
            sender: 'system', 
            timestamp: new Date() 
          }]);
        });

        socketManager.on('disconnected', (data) => {
          setIsConnected(false);
          console.log('Widget disconnected from server');
        });

        socketManager.on('message', (data) => {
          setMessages(prev => [...prev, { 
            text: data.message, 
            sender: 'agent', 
            timestamp: new Date() 
          }]);
        });

        socketManager.on('agent_typing', (data) => {
          setMessages(prev => [...prev, { 
            text: 'Agent is typing...', 
            sender: 'system', 
            isTyping: true 
          }]);
        });

        socketManager.on('agent_typing_stop', (data) => {
          setMessages(prev => prev.filter(msg => !msg.isTyping));
        });

        socketManager.on('flow_event', (data) => {
          if (data.type === 'message') {
            setMessages(prev => [...prev, { 
              text: data.content, 
              sender: 'bot', 
              timestamp: new Date() 
            }]);
          }
        });

        socketManager.on('connection_error', (data) => {
          console.error('Connection error:', data.error);
          setMessages(prev => [...prev, { 
            text: 'Connection error. Please try again.', 
            sender: 'system', 
            timestamp: new Date() 
          }]);
        });

        // Connect to server
        await socketManager.connect();
        socketRef.current = socketManager;
      } catch (error) {
        console.error('Failed to initialize widget:', error);
        setMessages(prev => [...prev, { 
          text: 'Failed to connect. Please refresh the page.', 
          sender: 'system', 
          timestamp: new Date() 
        }]);
      }
    };

    if (isOpen) {
      initializeSocket();
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [isOpen]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = { text: inputValue, sender: 'user', timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    
    const sentValue = inputValue;
    setInputValue('');

    try {
      const cid = getOrCreateContactId();
      
      // T013 & T024/T022: Send via HTTP API to process NLP and Lead Form
      const res = await fetch('/api/widget/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tenantId,
          sessionId: sessionId,
          contactId: cid,
          message: sentValue
        })
      });
      
      const data = await res.json();
      
      if (data.reply) {
        setMessages(prev => [...prev, {
          text: data.reply,
          sender: 'bot',
          timestamp: new Date()
        }]);
      }
      
      if (data.triggerLeadForm && data.leadFormConfig) {
        setLeadFormConfig(data.leadFormConfig);
      }
      
    } catch (error) {
      console.error('Failed to send message via API:', error);
      // Fallback to socket if API fails
      if (socketRef.current && isConnected) {
        try {
          await socketRef.current.sendMessage({
            text: sentValue,
            type: 'user_message'
          });
        } catch (socErr) {
          setMessages(prev => [...prev, { 
            text: 'Failed to send message. Please try again.', 
            sender: 'system', 
            timestamp: new Date() 
          }]);
        }
      }
    }
  };

  const submitLeadForm = async () => {
    try {
      const cid = getOrCreateContactId();
      await fetch('/api/widget/visitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          contactId: cid,
          ...leadFormData
        })
      });
      setLeadFormConfig(null);
      setMessages(prev => [...prev, { 
        text: 'Data telah disimpan. Terima kasih!', 
        sender: 'system', 
        timestamp: new Date() 
      }]);
    } catch (err) {
      console.error('Lead form submission failed', err);
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999, fontFamily: 'sans-serif' }}>
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          style={{
            width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#2563eb',
            color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontSize: '24px', position: 'relative'
          }}
          title={isConnected ? 'Connected' : 'Connecting...'}
        >
          💬
          {isConnected && (
            <div style={{
              position: 'absolute', bottom: '0', right: '0', width: '12px', height: '12px',
              backgroundColor: '#10b981', borderRadius: '50%', border: '2px solid white'
            }}></div>
          )}
        </button>
      )}
      
      {isOpen && (
        <div style={{
          width: '350px', height: '500px', backgroundColor: 'white', borderRadius: '16px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column',
          overflow: 'hidden', border: '1px solid #e2e8f0'
        }}>
          <div style={{ padding: '16px', backgroundColor: '#2563eb', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold' }}>
              Chat with us {isConnected ? '🟢' : '🔴'}
            </span>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '20px' }}>×</button>
          </div>

          <div style={{ flex: 1, padding: '16px', overflowY: 'auto', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
            {messages.map((msg, idx) => (
              <div 
                key={idx}
                style={{
                  marginBottom: '12px',
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '80%'
                }}
              >
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: msg.sender === 'user' ? '#2563eb' : (msg.sender === 'system' ? '#f1f5f9' : 'white'),
                  color: msg.sender === 'user' ? 'white' : '#334155',
                  fontSize: '14px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  fontStyle: msg.isTyping ? 'italic' : 'normal',
                  opacity: msg.isTyping ? 0.6 : 1
                }}>
                  {msg.text}
                </div>
                {msg.timestamp && (
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', textAlign: msg.sender === 'user' ? 'right' : 'left' }}>
                    {msg.timestamp.toLocaleTimeString()}
                  </div>
                )}
              </div>
            ))}
            
            {leadFormConfig && (
              <div style={{
                margin: '12px 0', padding: '16px', backgroundColor: 'white',
                borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#1e293b' }}>
                  {leadFormConfig.title || 'Silakan lengkapi data Anda'}
                </h4>
                
                {leadFormConfig.fields.includes('name') && (
                  <input type="text" placeholder="Nama Lengkap" 
                    value={leadFormData.name} onChange={e => setLeadFormData({...leadFormData, name: e.target.value})}
                    style={{ width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                )}
                
                {leadFormConfig.fields.includes('email') && (
                  <input type="email" placeholder="Alamat Email" 
                    value={leadFormData.email} onChange={e => setLeadFormData({...leadFormData, email: e.target.value})}
                    style={{ width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                )}
                
                {leadFormConfig.fields.includes('phone') && (
                  <input type="tel" placeholder="Nomor HP/WhatsApp" 
                    value={leadFormData.phone} onChange={e => setLeadFormData({...leadFormData, phone: e.target.value})}
                    style={{ width: '100%', padding: '8px', marginBottom: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                )}
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={submitLeadForm} style={{ flex: 1, padding: '8px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                    Kirim
                  </button>
                  {leadFormConfig.skippable && (
                    <button onClick={() => setLeadFormConfig(null)} style={{ flex: 1, padding: '8px', backgroundColor: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                      Nanti saja
                    </button>
                  )}
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          <div style={{ padding: '12px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '8px' }}>
            <input 
              type="text"
              placeholder="Type a message..."
              value={inputValue}
              onInput={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              style={{ flex: 1, padding: '8px 12px', borderRadius: '20px', border: '1px solid #cbd5e1', outline: 'none' }}
              disabled={!isConnected}
            />
            <button
              onClick={handleSendMessage}
              disabled={!isConnected || !inputValue.trim()}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                backgroundColor: isConnected ? '#2563eb' : '#cbd5e1',
                color: 'white',
                border: 'none',
                cursor: isConnected ? 'pointer' : 'not-allowed',
                fontSize: '14px'
              }}
            >
              Send
            </button>
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
