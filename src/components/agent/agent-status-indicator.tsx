'use client'

interface AgentStatusIndicatorProps {
  status: 'typing' | 'waiting_for_owner'
}

export function AgentStatusIndicator({ status }: AgentStatusIndicatorProps) {
  if (status === 'typing') {
    return (
      <div className="flex items-start gap-2">
        <div className="bg-[#f3f4f6] text-[#78716c] rounded-2xl rounded-tl-md px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <span
                className="w-1.5 h-1.5 bg-[#a8a29e] rounded-full animate-bounce"
                style={{ animationDelay: '0ms' }}
              />
              <span
                className="w-1.5 h-1.5 bg-[#a8a29e] rounded-full animate-bounce"
                style={{ animationDelay: '150ms' }}
              />
              <span
                className="w-1.5 h-1.5 bg-[#a8a29e] rounded-full animate-bounce"
                style={{ animationDelay: '300ms' }}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2">
      <div className="bg-[#f3f4f6] text-[#78716c] rounded-2xl rounded-tl-md px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-sm">Väntar på svar från lokalen...</span>
        </div>
      </div>
    </div>
  )
}
