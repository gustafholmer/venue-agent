import { redirect } from 'next/navigation'

// This page was from the bostadsagent codebase.
// In venue-agent, results are shown on the search page instead.
export default function ResultsPage() {
  // Redirect to the search page for venue searches
  redirect('/search')
}
