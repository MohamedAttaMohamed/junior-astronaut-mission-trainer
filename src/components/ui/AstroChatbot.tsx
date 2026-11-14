import { useCallback, useEffect, useRef, useState } from 'react'
import { askAstroBot, type BotResponse } from '../../science/astroBotService'

export interface ChatMessage {
  id: string
  sender: 'cadet' | 'bot'
  text: string
  responseDetails?: BotResponse
  timestamp: string
}

interface AstroChatbotProps {
  isOpen: boolean
  onClose: () => void
  currentMissionContext: string
  initialPrompt?: string | null
  onClearInitialPrompt?: () => void
}

export function AstroChatbot({
  isOpen,
  onClose,
  currentMissionContext,
  initialPrompt,
  onClearInitialPrompt,
}: AstroChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text:
        'Greetings Cadet! I am AstroBot, your NASA AI flight science guide. Ask me any space science questions or click a mission hint button while you explore Aster Base on Mars!',
      timestamp: 'NOW',
    },
  ])
  const [inputText, setInputText] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSend = useCallback(async (questionToSend?: string) => {
    const text = (questionToSend ?? inputText).trim()
    if (!text || isThinking) return

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'cadet',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    setInputText('')
    setIsThinking(true)

    try {
      const botResponse = await askAstroBot(text, currentMissionContext)
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: botResponse.answer,
        responseDetails: botResponse,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, botMsg])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          sender: 'bot',
          text:
            'AstroBot experienced radio interference with Aster Base telemetry. Try asking again!',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } finally {
      setIsThinking(false)
    }
  }, [inputText, isThinking, currentMissionContext])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150)
      scrollToBottom()
    }
  }, [isOpen])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isThinking])

  // Handle triggered prompts from gameplay
  useEffect(() => {
    if (isOpen && initialPrompt) {
      const timer = setTimeout(() => {
        handleSend(initialPrompt)
        onClearInitialPrompt?.()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [isOpen, initialPrompt, handleSend, onClearInitialPrompt])

  if (!isOpen) return null

  return (
    <div className="astro-chatbot-overlay" role="presentation">
      <section
        className="astro-chatbot-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="astro-chat-title"
      >
        {/* Header */}
        <header className="astro-chatbot-header">
          <div className="astro-chatbot-brand">
            <span className="astro-chatbot-avatar">🤖</span>
            <div>
              <div className="astro-chatbot-title-row">
                <h2 id="astro-chat-title">AstroBot AI Assistant</h2>
                <span className="astro-status-badge">ONLINE · NASA GROUNDED</span>
              </div>
              <small className="astro-chatbot-sub">
                Telemetry Context: {currentMissionContext}
              </small>
            </div>
          </div>
          <button
            type="button"
            className="astro-chatbot-close"
            onClick={onClose}
            aria-label="Close AstroBot dialog"
          >
            ×
          </button>
        </header>

        {/* Quick Suggestion Chips */}
        <div className="astro-quick-chips">
          <button
            type="button"
            className="astro-chip"
            onClick={() =>
              handleSend(
                `Give me a tactical engineering hint for our current mission objective: ${currentMissionContext}`
              )
            }
          >
            💡 Mission Hint
          </button>
          <button
            type="button"
            className="astro-chip"
            onClick={() => handleSend('What is the Sun doing right now?')}
          >
            ☀️ Live Solar Activity
          </button>
          <button
            type="button"
            className="astro-chip"
            onClick={() => handleSend('How does NASA MOXIE make breathable oxygen on Mars?')}
          >
            💨 Oxygen on Mars
          </button>
          <button
            type="button"
            className="astro-chip"
            onClick={() => handleSend('How do astronauts protect against cosmic radiation?')}
          >
            🛡️ Radiation Shielding
          </button>
          <button
            type="button"
            className="astro-chip"
            onClick={() => handleSend('How does Martian hydroponics grow food without soil?')}
          >
            🌱 Martian Greenhouse
          </button>
        </div>

        {/* Message Stream */}
        <div className="astro-chatbot-messages" tabIndex={0}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`astro-message-row ${
                msg.sender === 'cadet' ? 'astro-message-row--cadet' : 'astro-message-row--bot'
              }`}
            >
              <div className="astro-message-bubble">
                <div className="astro-message-meta">
                  <strong>{msg.sender === 'cadet' ? 'Cadet Explorer' : 'AstroBot'}</strong>
                  <span>{msg.timestamp}</span>
                </div>
                <p className="astro-message-text">{msg.text}</p>

                {/* Bot Grounded Citations & Jargon */}
                {msg.responseDetails && (
                  <div className="astro-message-extra">
                    {msg.responseDetails.jargon.length > 0 && (
                      <div className="astro-jargon-box">
                        <span className="astro-extra-title">🪐 SCIENCE TERMS</span>
                        <div className="astro-jargon-tags">
                          {msg.responseDetails.jargon.map((item, i) => (
                            <span key={i} className="astro-jargon-pill">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {msg.responseDetails.sources.length > 0 && (
                      <div className="astro-sources-box">
                        <span className="astro-extra-title">
                          📡 {msg.responseDetails.live ? 'LIVE NASA DATA' : 'OFFICIAL NASA SOURCE'}
                        </span>
                        <div className="astro-sources-list">
                          {msg.responseDetails.sources.map((src, i) => (
                            <a
                              key={i}
                              href={src.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="astro-source-link"
                            >
                              <span>{src.title}</span>
                              <small>{src.dataset || 'NASA Science Data'}</small>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="astro-message-row astro-message-row--bot">
              <div className="astro-message-bubble astro-thinking-bubble">
                <span className="astro-pulse" /> AstroBot is querying NASA mission files...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          className="astro-chatbot-input-bar"
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
        >
          <input
            ref={inputRef}
            type="text"
            className="astro-chat-input"
            placeholder="Ask AstroBot about systems, science, or mission hints..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isThinking}
          />
          <button
            type="submit"
            className="primary-button astro-chat-submit"
            disabled={!inputText.trim() || isThinking}
          >
            Ask <span aria-hidden="true">→</span>
          </button>
        </form>
      </section>
    </div>
  )
}
