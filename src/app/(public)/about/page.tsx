export default function AboutPage() {
  return (
    <div className="px-4 sm:px-6 py-12 sm:py-20">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-sm uppercase tracking-widest text-[#c45a3b] mb-4">
            Om oss
          </p>
          <h1 className="text-3xl sm:text-4xl text-[#1a1a1a] mb-4">
            Människan bakom agenten
          </h1>
          <p className="text-[#78716c]">
            (Och agenten bakom människan)
          </p>
        </div>

        {/* Founder section */}
        <section className="mb-16">
          <div className="bg-[#f5f3f0] rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
              <div className="w-24 h-24 bg-[#e7e5e4] rounded-full flex items-center justify-center text-3xl flex-shrink-0">
                G
              </div>
              <div>
                <h2 className="text-xl font-medium text-[#1a1a1a] mb-2 text-center sm:text-left">
                  Gustaf Holmer
                </h2>
                <p className="text-sm text-[#c45a3b] mb-4 text-center sm:text-left">
                  Grundare
                </p>
                <p className="text-[#78716c] leading-relaxed">
                  Trött på att scrolla genom hundratals eventlokaler utan att hitta rätt?
                  Det var jag också. Därför byggde jag Tryffle &ndash; en AI-assistent som
                  faktiskt förstår vad du letar efter och hittar lokalen åt dig.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Mission */}
        <section className="text-center">
          <h2 className="text-sm uppercase tracking-widest text-[#78716c] mb-4">
            Vår mission
          </h2>
          <p className="text-xl sm:text-2xl text-[#1a1a1a] leading-relaxed">
            Att bli Sveriges självklara plattform för eventlokaler &ndash; där varje bokning börjar.
          </p>
          <p className="text-[#78716c] mt-4 leading-relaxed">
            Vi bygger infrastrukturen som kopplar samman lokaler med de som behöver dem. Smartare sök, bättre matchning, enklare bokning.
          </p>
        </section>
      </div>
    </div>
  )
}

export const metadata = {
  title: 'Om oss - Tryffle',
  description: 'Lär känna teamet bakom Tryffle och vår mission att förenkla lokalsökning.',
}
