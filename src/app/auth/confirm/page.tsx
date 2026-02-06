export default function ConfirmPage() {
  return (
    <main className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl text-[#111827] mb-4">
          Kolla din e-post
        </h1>
        <p className="text-[#6b7280] mb-8">
          Vi har skickat en bekräftelselänk till din e-postadress. Klicka på länken för att aktivera ditt konto.
        </p>
        <a
          href="/auth/sign-in"
          className="text-[#1e3a8a] hover:underline text-sm"
        >
          Tillbaka till inloggning
        </a>
      </div>
    </main>
  )
}
