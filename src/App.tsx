import { useEffect, useRef, useState } from 'react'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../amplify/data/resource'
import './App.css'

const client = generateClient<Schema>()

type Message = Schema['Message']['type']

function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // observeQuery: 初回に全件を取得し、以降は mutation のたびに差分が push される
    const sub = client.models.Message.observeQuery().subscribe({
      next: ({ items }) => {
        // 古い順に並べ、新しいメッセージが下に来るようにする（チャット表示）
        const sorted = [...items].sort((a, b) =>
          a.createdAt.localeCompare(b.createdAt),
        )
        setMessages(sorted)
      },
      error: (err) => console.error('subscription error', err),
    })
    return () => sub.unsubscribe()
  }, [])

  // メッセージが増えたら一番下へスクロール
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="app">
      <header className="app__header">受信メッセージ</header>
      <ul className="messages">
        {messages.length === 0 && (
          <li className="messages__empty">
            LINE でメッセージを送ると、ここにリアルタイムで表示されます
          </li>
        )}
        {messages.map((m) => (
          <li key={m.lineWebhookEventId} className="message">
            {m.pictureUrl ? (
              <img className="message__avatar" src={m.pictureUrl} alt="" />
            ) : (
              <div className="message__avatar" />
            )}
            <div className="message__body">
              <div className="message__name">
                {m.displayName ?? m.senderId.slice(-6)}
              </div>
              <div className="message__bubble">{m.text}</div>
              <time className="message__time">
                {new Date(m.createdAt).toLocaleTimeString('ja-JP')}
              </time>
            </div>
          </li>
        ))}
        <div ref={bottomRef} />
      </ul>
    </div>
  )
}

export default App
