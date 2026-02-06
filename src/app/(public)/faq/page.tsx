import { generateFAQSchema, jsonLdScript } from '@/lib/structured-data'

export default function FAQPage() {
  const faqs = [
    {
      q: 'Är det gratis att söka efter lokaler?',
      a: 'Ja, helt gratis! Du betalar ingenting för att söka, chatta med agenten eller skicka förfrågningar till lokaler.',
    },
    {
      q: 'Hur fungerar AI-agenten?',
      a: 'Beskriv ditt event med egna ord – antal gäster, typ av tillfälle, önskad stil. Agenten analyserar alla lokaler och presenterar de som bäst matchar dina behov.',
    },
    {
      q: 'Kan jag lita på agentens rekommendationer?',
      a: 'Agenten rankar lokaler baserat på hur väl de matchar dina krav, inte på vem som betalar mest. Transparens är viktigt för oss.',
    },
    {
      q: 'Hur bokar jag en lokal?',
      a: 'När du hittat en lokal du gillar skickar du en förfrågan direkt till lokalägaren. De svarar vanligtvis inom 24 timmar.',
    },
    {
      q: 'Vad kostar det att boka via Tryffle?',
      a: 'Det är gratis att söka och skicka förfrågningar. Vid genomförd bokning kan en mindre serviceavgift tillkomma, som alltid visas tydligt innan du bekräftar.',
    },
    {
      q: 'Jag äger en lokal – hur lägger jag upp den?',
      a: 'Klicka på "Lista eventlokal" i menyn och skapa ett företagskonto. Som företag kan du både boka och lista lokaler.',
    },
    {
      q: 'Hur kontaktar jag supporten?',
      a: 'Skicka ett mejl till hej@venueagent.se så återkommer vi så snart vi kan.',
    },
  ]

  const faqSchema = generateFAQSchema(faqs.map((item) => ({ question: item.q, answer: item.a })))

  return (
    <div className="px-4 sm:px-6 py-12 sm:py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(faqSchema) }}
      />
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-sm uppercase tracking-widest text-[#c45a3b] mb-4">
            Hjälp
          </p>
          <h1 className="text-3xl sm:text-4xl text-[#1a1a1a] mb-4">
            Vanliga frågor
          </h1>
          <p className="text-[#78716c]">
            Hittar du inte svaret? Kontakta oss på{' '}
            <a href="mailto:hej@venueagent.se" className="text-[#c45a3b] hover:underline">
              hej@venueagent.se
            </a>
          </p>
        </div>

        {/* FAQ List */}
        <div className="space-y-4">
          {faqs.map((item, i) => (
            <details
              key={i}
              className="group bg-[#f5f3f0] rounded-xl overflow-hidden"
            >
              <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
                <span className="font-medium text-[#1a1a1a] pr-4">{item.q}</span>
                <svg
                  className="w-5 h-5 text-[#78716c] transition-transform group-open:rotate-180 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-4 pb-4 text-[#78716c]">
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  )
}

export const metadata = {
  title: 'FAQ - Tryffle',
  description: 'Vanliga frågor om Tryffle och hur tjänsten fungerar.',
}
