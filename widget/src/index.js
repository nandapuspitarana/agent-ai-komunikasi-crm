import { h, render } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import SocketManager from './socket';

const Widget = () => {
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [tenantId, setTenantId] = useState(null);

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
    if (!inputValue.trim() || !isConnected || !socketRef.current) return;

    const userMessage = { text: inputValue, sender: 'user', timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Send message via SocketManager
      await socketRef.current.sendMessage({
        text: inputValue,
        type: 'user_message'
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => [...prev, { 
        text: 'Failed to send message. Please try again.', 
        sender: 'system', 
        timestamp: new Date() 
      }]);
    }

    setInputValue('');
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
