'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ApiStudio() {
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('https://api.stripe.com/v1/customers');
  const [prompt, setPrompt] = useState('');
  const [activeTab, setActiveTab] = useState('body'); // body, headers, auth, ai
  const [requestBody, setRequestBody] = useState('{\n  "email": "jenny.rosen@example.com",\n  "name": "Jenny Rosen"\n}');
  const [isSending, setIsSending] = useState(false);
  const [response, setResponse] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);

  const handleSend = async () => {
    setIsSending(true);
    setResponse(null);
    setAiAnalysis(null);
    try {
      const res = await fetch('/api/api-studio/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          method,
          requestBody: activeTab === 'body' ? requestBody : null,
          headers: [] // We could pass headers state here
        })
      });
      const data = await res.json();
      setResponse(data);

      if (data.status >= 400 && data.status < 600) {
        setAiAnalysis({
          title: "AI Inference Detected Error",
          reason: `The server responded with ${data.status} ${data.statusText}. Ensure all parameters are valid.`,
          actionText: "Analyze deeper"
        });
      }
    } catch (e) {
      setResponse({ status: 500, time: 0, size: 0, data: { error: e.message } });
    } finally {
      setIsSending(false);
    }
  };

  const handleAIGenerate = async () => {
    setIsSending(true);
    try {
      const res = await fetch('/api/api-studio/ai-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, method, url })
      });
      const data = await res.json();
      if (data.jsonPayload) {
        setRequestBody(data.jsonPayload);
        setActiveTab('body');
      }
    } catch (err) {
      alert("AI Generation failed");
    } finally {
      setPrompt('');
      setIsSending(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Sidebar History */}
      <div style={styles.sidebar}>
        <div style={styles.brandContainer}>
          <div style={styles.logoBadge}>AI</div>
          <h2 style={styles.brandText}>NexAPI Studio</h2>
        </div>
        <div style={styles.historySection}>
          <p style={styles.historyTitle}>COLLECTIONS</p>
          {['Stripe Payments', 'User Auth Services', 'AI Data Pipelines'].map((col, idx) => (
            <div key={idx} style={styles.historyItem}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
              <span>{col}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Composer */}
      <div style={styles.composerWrapper}>
        
        {/* Magic AI Prompt Bar */}
        <div style={styles.aiPromptContainer}>
          <svg width="20" height="20" fill="none" stroke="#a855f7" strokeWidth="2" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
          <input 
            type="text" 
            placeholder="Tell AI what you want: 'Generate a payload to create a new user with random data'"
            style={styles.aiInput}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAIGenerate()}
          />
          <button style={styles.aiButton} onClick={handleAIGenerate}>
            Generate
          </button>
        </div>

        {/* URL Bar */}
        <div style={styles.urlBarContainer}>
          <select style={styles.methodSelect} value={method} onChange={(e) => setMethod(e.target.value)}>
            <option>GET</option>
            <option>POST</option>
            <option>PUT</option>
            <option>DELETE</option>
            <option>PATCH</option>
          </select>
          <input 
            type="text" 
            style={styles.urlInput}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button style={styles.sendButton} onClick={handleSend} disabled={isSending}>
            {isSending ? 'Sending...' : 'Send Request'}
          </button>
        </div>

        <div style={styles.panelsContainer}>
          {/* Request Panel */}
          <div style={styles.panel}>
            <div style={styles.tabsHeader}>
              <div 
                style={activeTab === 'body' ? styles.activeTab : styles.tab} 
                onClick={() => setActiveTab('body')}
              >Body</div>
              <div 
                style={activeTab === 'headers' ? styles.activeTab : styles.tab} 
                onClick={() => setActiveTab('headers')}
              >Headers <span style={styles.countBadge}>0</span></div>
              <div 
                style={activeTab === 'auth' ? styles.activeTab : styles.tab} 
                onClick={() => setActiveTab('auth')}
              >Auth</div>
              <div 
                style={activeTab === 'ai' ? styles.aiActiveTab : styles.tab} 
                onClick={() => setActiveTab('ai')}
              >✨ AI Test Suite</div>
            </div>
            
            <div style={styles.editorArea}>
              {activeTab === 'body' && (
                <textarea 
                  style={styles.codeEditor} 
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  spellCheck="false"
                />
              )}
              {activeTab === 'ai' && (
                <div style={styles.aiSuiteArea}>
                  <p style={{color: '#94a3b8', marginBottom: '15px'}}>AI can automatically generate negative test payloads (SQL injection, boundary attacks, missing fields) based on this endpoint.</p>
                  <button style={styles.generateTestsBtn}>Generate 20 Edge Cases</button>
                </div>
              )}
              {/* Other tabs omitted for brevity */}
            </div>
          </div>

          {/* Response Panel */}
          <div style={styles.panel}>
            {!response ? (
              <div style={styles.emptyResponse}>
                <svg width="48" height="48" fill="none" stroke="#334155" strokeWidth="1" viewBox="0 0 24 24" style={{marginBottom: '15px'}}><path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                <p>Hit "Send" to get a response</p>
                <p style={{fontSize: '12px', color: '#475569', marginTop: '5px'}}>NexAPI proxy ensures CORS bypassing</p>
              </div>
            ) : (
              <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
                <div style={styles.responseHeader}>
                  <span style={{color: response.status >= 400 ? '#ef4444' : '#10b981', fontWeight: 'bold'}}>{response.status} {response.status === 401 ? 'Unauthorized' : 'OK'}</span>
                  <span style={{color: '#64748b', fontSize: '13px'}}>{response.time}</span>
                  <span style={{color: '#64748b', fontSize: '13px'}}>{response.size}</span>
                </div>
                
                {aiAnalysis && (
                  <motion.div initial={{opacity: 0, y: -10}} animate={{opacity: 1, y: 0}} style={styles.aiInsightCard}>
                    <div style={styles.insightHeader}>
                      <span style={{display: 'flex', alignItems: 'center', gap: '8px', color: '#c084fc', fontWeight: 'bold'}}>
                        ✨ AI Error Diagnosis
                      </span>
                    </div>
                    <p style={styles.insightText}>{aiAnalysis.reason}</p>
                    <button style={styles.fixButton}>
                      {aiAnalysis.actionText}
                    </button>
                  </motion.div>
                )}

                <textarea 
                  readOnly 
                  style={styles.responseEditor} 
                  value={JSON.stringify(response.data, null, 2)}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    height: '100vh',
    backgroundColor: '#050811',
    color: '#e2e8f0',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
  },
  sidebar: {
    width: '280px',
    backgroundColor: '#0a0e1a',
    borderRight: '1px solid #1e293b',
    display: 'flex',
    flexDirection: 'column'
  },
  brandContainer: {
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    borderBottom: '1px solid #1e293b'
  },
  logoBadge: {
    background: 'linear-gradient(135deg, #a855f7, #3b82f6)',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#fff'
  },
  brandText: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#fff',
    margin: 0
  },
  historySection: {
    padding: '20px'
  },
  historyTitle: {
    fontSize: '11px',
    color: '#64748b',
    fontWeight: 'bold',
    letterSpacing: '1px',
    marginBottom: '15px'
  },
  historyItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px',
    color: '#94a3b8',
    cursor: 'pointer',
    borderRadius: '6px',
    transition: 'all 0.2s',
    fontSize: '14px',
    marginBottom: '4px'
  },
  composerWrapper: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '20px',
    gap: '20px',
    overflow: 'hidden'
  },
  aiPromptContainer: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.05)',
    border: '1px solid rgba(168, 85, 247, 0.3)',
    borderRadius: '12px',
    padding: '8px 16px',
    gap: '12px'
  },
  aiInput: {
    flex: 1,
    backgroundColor: 'transparent',
    border: 'none',
    color: '#e2e8f0',
    outline: 'none',
    fontSize: '14px'
  },
  aiButton: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    color: '#c084fc',
    border: '1px solid rgba(168, 85, 247, 0.4)',
    padding: '6px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '13px',
    transition: 'all 0.2s'
  },
  urlBarContainer: {
    display: 'flex',
    gap: '1px',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    border: '1px solid #1e293b'
  },
  methodSelect: {
    backgroundColor: '#1e293b',
    color: '#3b82f6',
    border: 'none',
    padding: '16px 20px',
    fontWeight: 'bold',
    fontSize: '14px',
    outline: 'none',
    cursor: 'pointer'
  },
  urlInput: {
    flex: 1,
    backgroundColor: '#0a0e1a',
    border: 'none',
    color: '#fff',
    padding: '16px 20px',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'monospace'
  },
  sendButton: {
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    padding: '0 30px',
    fontWeight: 'bold',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'background 0.2s'
  },
  panelsContainer: {
    display: 'flex',
    gap: '20px',
    flex: 1,
    minHeight: 0
  },
  panel: {
    flex: 1,
    backgroundColor: '#0a0e1a',
    borderRadius: '12px',
    border: '1px solid #1e293b',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  tabsHeader: {
    display: 'flex',
    borderBottom: '1px solid #1e293b',
    backgroundColor: '#090c15'
  },
  tab: {
    padding: '12px 20px',
    fontSize: '13px',
    color: '#94a3b8',
    cursor: 'pointer',
    borderBottom: '2px solid transparent'
  },
  activeTab: {
    padding: '12px 20px',
    fontSize: '13px',
    color: '#fff',
    cursor: 'pointer',
    borderBottom: '2px solid #3b82f6',
    backgroundColor: '#0a0e1a'
  },
  aiActiveTab: {
    padding: '12px 20px',
    fontSize: '13px',
    color: '#a855f7',
    fontWeight: 'bold',
    cursor: 'pointer',
    borderBottom: '2px solid #a855f7',
    backgroundColor: 'rgba(168, 85, 247, 0.05)'
  },
  countBadge: {
    backgroundColor: '#1e293b',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '11px',
    marginLeft: '6px'
  },
  editorArea: {
    flex: 1,
    padding: '0',
    backgroundColor: '#0a0e1a'
  },
  codeEditor: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#cbd5e1',
    fontFamily: '"Fira Code", monospace',
    fontSize: '14px',
    padding: '20px',
    resize: 'none',
    outline: 'none',
    lineHeight: '1.6'
  },
  aiSuiteArea: {
    padding: '30px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    textAlign: 'center'
  },
  generateTestsBtn: {
    backgroundColor: '#a855f7',
    color: '#fff',
    border: 'none',
    padding: '10px 24px',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  emptyResponse: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#64748b'
  },
  responseHeader: {
    display: 'flex',
    justifyContent: 'flex-start',
    gap: '20px',
    padding: '12px 20px',
    borderBottom: '1px solid #1e293b',
    backgroundColor: '#090c15'
  },
  responseEditor: {
    flex: 1,
    backgroundColor: 'transparent',
    border: 'none',
    color: '#10b981',
    fontFamily: '"Fira Code", monospace',
    fontSize: '14px',
    padding: '20px',
    resize: 'none',
    outline: 'none'
  },
  aiInsightCard: {
    backgroundColor: 'rgba(168, 85, 247, 0.05)',
    borderBottom: '1px solid #1e293b',
    padding: '16px 20px',
    borderLeft: '4px solid #a855f7'
  },
  insightHeader: {
    marginBottom: '8px'
  },
  insightText: {
    fontSize: '13px',
    color: '#e2e8f0',
    lineHeight: '1.5',
    marginBottom: '12px'
  },
  fixButton: {
    backgroundColor: '#a855f7',
    color: '#fff',
    border: 'none',
    padding: '6px 14px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer'
  }
};
