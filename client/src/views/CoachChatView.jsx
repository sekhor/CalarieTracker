import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, LoaderCircle, SendHorizonal, Sparkles, User } from 'lucide-react';
import { fetchChatSessionMessages, fetchChatSessions, sendChatMessage } from '../services/api';

const QUICK_PROMPTS = [
  'Summarize my day',
  'Review my week',
  'Am I hitting protein?',
  'Why am I going over calories?',
  'Suggest a dinner under 600 kcal',
  'What should I eat next?',
];

export default function CoachChatView() {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const threadRef = useRef(null);

  const activeSession = useMemo(
    () => sessions.find((session) => String(session.id) === String(activeSessionId)) || null,
    [sessions, activeSessionId]
  );

  const loadSessions = async () => {
    try {
      const response = await fetchChatSessions();
      const sessionList = response.sessions || [];
      setSessions(sessionList);
      if (!activeSessionId && sessionList.length) {
        setActiveSessionId(sessionList[0].id);
      }
    } catch (loadError) {
      setError(loadError.response?.data?.error || 'Failed to load coach sessions.');
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    const loadMessages = async () => {
      if (!activeSessionId) {
        setMessages([]);
        return;
      }

      try {
        const response = await fetchChatSessionMessages(activeSessionId);
        setMessages(response.messages || []);
      } catch (loadError) {
        setError(loadError.response?.data?.error || 'Failed to load coach messages.');
      }
    };

    loadMessages();
  }, [activeSessionId]);

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages, isSending]);

  const handleSend = async (messageText = draft) => {
    const trimmed = String(messageText || '').trim();
    if (!trimmed || isSending) return;

    setError('');
    setIsSending(true);

    const optimisticUserMessage = {
      id: `temp-user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      created_at: new Date().toISOString(),
    };

    setMessages((current) => [...current, optimisticUserMessage]);
    setDraft('');

    try {
      const response = await sendChatMessage({ session_id: activeSessionId, message: trimmed });
      if (!activeSessionId && response.session_id) {
        setActiveSessionId(response.session_id);
      }

      await loadSessions();
      setMessages((current) => {
        const withoutOptimistic = current.filter((message) => message.id !== optimisticUserMessage.id);
        return [
          ...withoutOptimistic,
          {
            ...optimisticUserMessage,
            id: `user-${Date.now()}`,
          },
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: response.reply,
            sources: response.sources || [],
            insights: response.insights || [],
            plan: response.plan || null,
            created_at: new Date().toISOString(),
          },
        ];
      });
    } catch (sendError) {
      setError(sendError.response?.data?.error || 'Failed to send message to the coach.');
      setMessages((current) => current.filter((message) => message.id !== optimisticUserMessage.id));
      setDraft(trimmed);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = async (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      await handleSend();
    }
  };

  return (
    <div className="page-space animate-fadeIn coach-layout">
      <aside className="glass-panel coach-sidebar">
        <div className="coach-sidebar-header">
          <div>
            <h2 className="section-title">Coach Sessions</h2>
            <p className="text-sm text-muted">Ask about calories, macros, habits, and meal ideas.</p>
          </div>
        </div>

        <div className="coach-session-list">
          {sessions.length === 0 ? (
            <div className="coach-empty-sidebar text-sm text-muted">Your first message will create a new session.</div>
          ) : (
            sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => setActiveSessionId(session.id)}
                className={`coach-session-item ${String(activeSessionId) === String(session.id) ? 'coach-session-item-active' : ''}`}
              >
                <span className="coach-session-title">{session.title || `Session ${session.id}`}</span>
                <span className="coach-session-date">{new Date(session.updated_at || session.created_at).toLocaleString()}</span>
              </button>
            ))
          )}
        </div>
      </aside>

      <section className="glass-panel coach-main">
        <div className="coach-header">
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <Sparkles size={22} style={{ color: 'var(--primary-light)' }} />
              Nutrition Coach
            </h1>
            <p className="text-sm text-muted">
              Grounded in your tracked meals, goals, and recent eating trends.
            </p>
          </div>
          {activeSession ? <span className="badge badge-violet">Session #{activeSession.id}</span> : null}
        </div>

        <div className="coach-quick-prompts">
          {QUICK_PROMPTS.map((prompt) => (
            <button key={prompt} className="btn btn-secondary btn-xs" onClick={() => handleSend(prompt)} disabled={isSending}>
              {prompt}
            </button>
          ))}
        </div>

        {error ? <div className="info-box info-box-error">{error}</div> : null}

        <div className="coach-thread" ref={threadRef}>
          {messages.length === 0 ? (
            <div className="coach-empty-state">
              <Bot size={42} style={{ color: 'var(--primary-light)', opacity: 0.8 }} />
              <h3 className="section-title">Ready when you are</h3>
              <p className="text-sm text-muted">Try asking: “How am I doing today?” or “Suggest a high-protein dinner.”</p>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className={`coach-message-row ${message.role === 'user' ? 'coach-message-row-user' : ''}`}>
                <div className={`coach-avatar ${message.role === 'user' ? 'coach-avatar-user' : 'coach-avatar-assistant'}`}>
                  {message.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className={`coach-message-bubble ${message.role === 'user' ? 'coach-message-bubble-user' : ''}`}>
                  <div className="coach-message-text">{message.content}</div>
                  {Array.isArray(message.insights) && message.insights.length > 0 ? (
                    <div className="coach-inline-insights">
                      {message.insights.slice(0, 2).map((insight) => (
                        <div key={insight.id} className="coach-inline-insight-card">
                          <strong>{insight.title}</strong>
                          <span>{insight.recommendation}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {message.plan ? (
                    <div className="coach-plan-card">
                      <strong>{message.plan.title}</strong>
                      <span>{message.plan.summary}</span>
                      <div className="coach-source-list">
                        {(message.plan.shopping_list || []).slice(0, 5).map((item) => (
                          <span key={item} className="item-tag">{item}</span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {Array.isArray(message.sources) && message.sources.length > 0 ? (
                    <div className="coach-source-list">
                      {message.sources.map((source, index) => (
                        <span key={`${source.type}-${index}`} className="item-tag">{source.label}</span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ))
          )}

          {isSending ? (
            <div className="coach-message-row">
              <div className="coach-avatar coach-avatar-assistant"><Bot size={16} /></div>
              <div className="coach-message-bubble">
                <div className="coach-loading"><LoaderCircle size={16} className="animate-spin" /> Thinking…</div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="coach-composer">
          <textarea
            rows="3"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about calories, habits, macros, or what to eat next..."
            className="form-textarea coach-composer-input"
          />
          <button className="btn btn-primary" onClick={() => handleSend()} disabled={isSending || !draft.trim()}>
            <SendHorizonal size={15} /> Send
          </button>
        </div>
      </section>
    </div>
  );
}