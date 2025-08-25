"use client"
import { ReactNode, useEffect, useRef } from 'react'

export default function ChatBubble({
  role,
  children,
  avatar,
  avatarUrl,
  subtitle,
}: {
  role: 'user' | 'assistant'
  children: ReactNode
  avatar?: string
  avatarUrl?: string
  subtitle?: string
}) {
  const isUser = role === 'user'
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.animate([
      { transform: 'translateY(6px)', opacity: 0 },
      { transform: 'translateY(0)', opacity: 1 },
    ], { duration: 220, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' })
  }, [])
  return (
    <div ref={ref} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="mr-2 mt-1 h-8 w-8 rounded-full overflow-hidden bg-slate-200 flex items-center justify-center text-xs shadow-fp-1">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={avatar || 'AI'} className="h-full w-full object-cover" />
          ) : (
            <span>{avatar || 'AI'}</span>
          )}
        </div>
      )}
      <div className={`max-w-[85%] rounded-[16px] px-3 py-2 shadow-fp-1 transition-all ${isUser ? 'bg-fp-primary text-white' : 'bg-white border border-fp-border text-fp-text hover:shadow-md'}`}>
        {subtitle && <div className={`text-[11px] mb-1 ${isUser ? 'text-white/80' : 'text-slate-500'}`}>{subtitle}</div>}
        <div className="text-sm whitespace-pre-wrap leading-relaxed">{children}</div>
      </div>
      {isUser && (
        <div className="ml-2 mt-1 h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs shadow-fp-1">You</div>
      )}
    </div>
  )
}


