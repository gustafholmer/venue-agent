import { Suspense } from 'react'
import { AgentChat } from '@/components/search/agent-chat'
import { getOrCreateSession } from '@/actions/agent/create-session'
import { getSessionMessages } from '@/actions/agent/process-message'
import { cookies } from 'next/headers'
import { isDemoMode } from '@/lib/demo-mode'
import { isSupabaseConfigured } from '@/lib/supabase/server'

interface SearchPageProps {
  searchParams: Promise<{ q?: string; session?: string }>
}

async function SearchContent({ searchParams }: SearchPageProps) {
  const params = await searchParams
  const initialQuery = params.q || ''
  const existingSessionId = params.session

  // Check if we're in demo mode (no Supabase configured)
  const inDemoMode = isDemoMode() || !isSupabaseConfigured()

  if (inDemoMode) {
    // Use a mock session ID for demo mode
    return (
      <AgentChat
        sessionId="demo-session"
        initialQuery={initialQuery || undefined}
        initialMessages={[]}
        initialState="idle"
        demoMode={true}
      />
    )
  }

  // Get session ID from cookie or create new session
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('agent_session_id')?.value

  // Try to use existing session or create new one
  const sessionResult = await getOrCreateSession(existingSessionId || sessionCookie)

  if (!sessionResult.success || !sessionResult.sessionId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-[#1a1a1a] mb-2">
            Något gick fel
          </h1>
          <p className="text-[#78716c]">
            {sessionResult.error || 'Kunde inte starta sökning. Försök igen.'}
          </p>
        </div>
      </div>
    )
  }

  const sessionId = sessionResult.sessionId

  // Get existing messages for this session
  const messagesResult = await getSessionMessages(sessionId)
  const initialMessages = messagesResult.success ? messagesResult.messages || [] : []
  const initialState = messagesResult.success ? messagesResult.state || 'idle' : 'idle'

  return (
    <AgentChat
      sessionId={sessionId}
      initialQuery={initialMessages.length === 0 ? initialQuery : undefined}
      initialMessages={initialMessages}
      initialState={initialState}
    />
  )
}

function SearchLoading() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="flex gap-1">
          <span className="w-3 h-3 bg-[#c45a3b] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-3 h-3 bg-[#c45a3b] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-3 h-3 bg-[#c45a3b] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <p className="text-[#78716c]">Laddar...</p>
      </div>
    </div>
  )
}

export default async function SearchPage(props: SearchPageProps) {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-white">
      <Suspense fallback={<SearchLoading />}>
        <SearchContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  )
}

export const metadata = {
  title: 'Sök lokal - Tryffle',
  description: 'Beskriv ditt event och låt vår AI hitta matchande lokaler.',
  robots: {
    index: false,
    follow: true,
  },
}
