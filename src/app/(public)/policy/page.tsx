export default function PolicyPage() {
  return (
    <div className="px-4 sm:px-6 py-12 sm:py-20">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-sm uppercase tracking-widest text-[#c45a3b] mb-4">
            Juridiskt
          </p>
          <h1 className="text-3xl sm:text-4xl text-[#1a1a1a]">
            Villkor &amp; Integritet
          </h1>
        </div>

        {/* Privacy Policy */}
        <section className="mb-12">
          <h2 className="text-xl font-medium text-[#1a1a1a] mb-4 pb-2 border-b border-[#e7e5e4]">
            Integritetspolicy
          </h2>
          <div className="space-y-4 text-[#78716c] leading-relaxed">
            <p>
              <strong className="text-[#1a1a1a]">Vilka uppgifter samlar vi in?</strong><br />
              När du använder Venue Agent kan vi samla in: e-postadress och namn (vid registrering),
              sökhistorik och chattmeddelanden (för att förbättra våra rekommendationer),
              samt teknisk information som IP-adress och webbläsartyp.
            </p>
            <p>
              <strong className="text-[#1a1a1a]">Hur använder vi uppgifterna?</strong><br />
              Dina uppgifter används för att: ge dig relevanta lokalförslag, hantera bokningsförfrågningar
              mellan dig och lokalägare, förbättra vår AI-agent, samt skicka viktig information om din bokning.
            </p>
            <p>
              <strong className="text-[#1a1a1a]">Delar vi uppgifter med tredje part?</strong><br />
              Vi delar aldrig dina personuppgifter med tredje part i marknadsföringssyfte.
              Lokalägare får endast den information som krävs för att hantera din förfrågan.
              Vi använder säkra tjänsteleverantörer för hosting och datalagring.
            </p>
            <p>
              <strong className="text-[#1a1a1a]">Dina rättigheter</strong><br />
              Du har rätt att begära tillgång till, rättelse av, eller radering av dina personuppgifter.
              Kontakta oss på hej@venueagent.se för att utöva dessa rättigheter.
            </p>
            <p>
              <strong className="text-[#1a1a1a]">Cookies</strong><br />
              Vi använder cookies för att hålla dig inloggad och förbättra din upplevelse.
              Du kan hantera cookies i din webbläsares inställningar.
            </p>
          </div>
        </section>

        {/* Terms of Service */}
        <section className="mb-12">
          <h2 className="text-xl font-medium text-[#1a1a1a] mb-4 pb-2 border-b border-[#e7e5e4]">
            Användarvillkor
          </h2>
          <div className="space-y-4 text-[#78716c] leading-relaxed">
            <p>
              <strong className="text-[#1a1a1a]">Tjänsten</strong><br />
              Venue Agent är en plattform som kopplar samman eventarrangörer med lokalägare.
              Vi tillhandahåller AI-driven sökning och förmedling, men är inte part i eventuella
              avtal mellan dig och lokalägaren.
            </p>
            <p>
              <strong className="text-[#1a1a1a]">Ditt ansvar</strong><br />
              Du ansvarar för att den information du lämnar är korrekt och att du har rätt att
              ingå avtal om bokning. Missbruk av tjänsten, inklusive falska förfrågningar eller
              bedrägligt beteende, kan leda till avstängning.
            </p>
            <p>
              <strong className="text-[#1a1a1a]">Lokalägarens ansvar</strong><br />
              Lokalägare ansvarar för att deras lokalinformation är korrekt och uppdaterad,
              samt för att hantera bokningsförfrågningar på ett professionellt sätt.
            </p>
            <p>
              <strong className="text-[#1a1a1a]">Avgifter</strong><br />
              Det är gratis att söka efter lokaler och skicka förfrågningar. Vid genomförd
              bokning kan en serviceavgift tillkomma. Eventuella avgifter visas tydligt
              innan du bekräftar en bokning.
            </p>
            <p>
              <strong className="text-[#1a1a1a]">Ansvarsbegränsning</strong><br />
              Venue Agent ansvarar inte för lokalernas kvalitet, tillgänglighet eller
              lokalägarens agerande. Vi rekommenderar att alltid bekräfta detaljer direkt
              med lokalägaren innan bokning.
            </p>
            <p>
              <strong className="text-[#1a1a1a]">Ändringar</strong><br />
              Vi kan uppdatera dessa villkor. Väsentliga ändringar meddelas via e-post
              eller på webbplatsen. Fortsatt användning efter ändringar innebär att du
              accepterar de nya villkoren.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section className="bg-[#f5f3f0] rounded-2xl p-6 text-center">
          <h2 className="text-lg font-medium text-[#1a1a1a] mb-2">
            Frågor?
          </h2>
          <p className="text-[#78716c] mb-4">
            Kontakta oss om du har frågor om våra villkor eller din integritet.
          </p>
          <a
            href="mailto:hej@venueagent.se"
            className="text-[#c45a3b] hover:underline"
          >
            hej@venueagent.se
          </a>
        </section>

        {/* Last updated */}
        <p className="text-sm text-[#a8a29e] text-center mt-8">
          Senast uppdaterad: januari 2026
        </p>
      </div>
    </div>
  )
}

export const metadata = {
  title: 'Villkor & Integritet - Venue Agent',
  description: 'Läs om Venue Agents integritetspolicy och användarvillkor.',
}
