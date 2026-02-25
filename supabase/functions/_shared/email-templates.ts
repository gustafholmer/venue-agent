// Base email template with Tryffle branding
const SITE_URL = "https://tryffle.se";

const baseTemplate = (content: string) => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: #1a1a1a;
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
        background-color: #faf9f7;
      }
      .container {
        background-color: white;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
      }
      .header {
        background-color: #c45a3b;
        color: white;
        padding: 28px 24px 24px;
      }
      .wordmark {
        font-family: 'DM Serif Display', Georgia, 'Times New Roman', serif;
        font-size: 20px;
        font-weight: 400;
        margin: 0 0 8px 0;
        opacity: 0.9;
      }
      .header h1 {
        margin: 0;
        font-family: 'DM Serif Display', Georgia, 'Times New Roman', serif;
        font-size: 22px;
        font-weight: 400;
      }
      .content {
        padding: 32px 24px;
      }
      .content-footer {
        margin-top: 24px;
        padding-top: 20px;
        border-top: 1px solid #e7e5e4;
        color: #78716c;
        font-size: 13px;
      }
      .info-box {
        background: #f5f3f0;
        padding: 16px;
        border-radius: 8px;
        margin: 20px 0;
      }
      .info-row {
        display: flex;
        margin: 8px 0;
      }
      .info-label {
        color: #78716c;
        min-width: 100px;
      }
      .message-box {
        background: #f5f3f0;
        padding: 16px;
        border-radius: 8px;
        border-left: 4px solid #c45a3b;
        margin: 20px 0;
        font-style: italic;
        color: #4b5563;
      }
      .button {
        display: inline-block;
        background: #c45a3b;
        color: white;
        padding: 14px 28px;
        text-decoration: none;
        border-radius: 8px;
        font-weight: 500;
        margin: 16px 0;
      }
      a { color: #c45a3b; }
      .email-footer {
        text-align: center;
        padding: 20px 24px;
        color: #78716c;
        font-size: 12px;
      }
      .email-footer a {
        color: #c45a3b;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <div class="container">
      ${content}
    </div>
    <div class="email-footer">
      <p>&copy; 2026 Tryffle &middot; <a href="${SITE_URL}">tryffle.se</a></p>
    </div>
  </body>
</html>
`;

// Escape HTML to prevent XSS
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

export const bookingRequestEmail = (
  customerName: string,
  venueName: string,
  eventType: string,
  eventDate: string,
  guestCount: number
) =>
  baseTemplate(`
  <div class="header">
    <p class="wordmark">Tryffle</p>
    <h1>Ny bokningsförfrågan</h1>
  </div>
  <div class="content">
    <p><strong>${escapeHtml(customerName)}</strong> vill boka <strong>${escapeHtml(venueName)}</strong>.</p>
    <div class="info-box">
      <div class="info-row"><span class="info-label">Event:</span> ${escapeHtml(eventType)}</div>
      <div class="info-row"><span class="info-label">Datum:</span> ${escapeHtml(eventDate)}</div>
      <div class="info-row"><span class="info-label">Antal gäster:</span> ${guestCount}</div>
    </div>
    <p>Logga in för att granska och svara på förfrågan.</p>
    <p style="text-align: center;"><a href="${SITE_URL}" class="button" style="display:inline-block;background-color:#c45a3b;color:white;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:500;">Gå till Tryffle</a></p>
    <div class="content-footer">
      <p>Svara gärna inom 24 timmar för bästa kundupplevelse.</p>
    </div>
  </div>
`);

export const bookingAcceptedEmail = (venueName: string, eventDate: string, ownerName: string) =>
  baseTemplate(`
  <div class="header">
    <p class="wordmark">Tryffle</p>
    <h1>Bokning accepterad!</h1>
  </div>
  <div class="content">
    <p>Goda nyheter! Din bokningsförfrågan för <strong>${escapeHtml(venueName)}</strong> har accepterats av ${escapeHtml(ownerName)}.</p>
    <div class="info-box">
      <div class="info-row"><span class="info-label">Lokal:</span> ${escapeHtml(venueName)}</div>
      <div class="info-row"><span class="info-label">Datum:</span> ${escapeHtml(eventDate)}</div>
    </div>
    <p>Logga in för att se detaljer och kommunicera med lokalägaren.</p>
    <p style="text-align: center;"><a href="${SITE_URL}/account/bookings" class="button" style="display:inline-block;background-color:#c45a3b;color:white;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:500;">Se din bokning</a></p>
    <div class="content-footer">
      <p>Tack för att du använder Tryffle!</p>
    </div>
  </div>
`);

export const bookingDeclinedEmail = (venueName: string, eventDate: string, reason?: string) =>
  baseTemplate(`
  <div class="header">
    <p class="wordmark">Tryffle</p>
    <h1>Bokning kunde inte accepteras</h1>
  </div>
  <div class="content">
    <p>Tyvärr kunde din bokningsförfrågan för <strong>${escapeHtml(venueName)}</strong> den ${escapeHtml(eventDate)} inte accepteras.</p>
    ${reason ? `<p><strong>Anledning:</strong> ${escapeHtml(reason)}</p>` : ""}
    <p>Sök gärna vidare bland våra andra lokaler för att hitta den perfekta platsen för ditt event.</p>
    <p style="text-align: center;"><a href="${SITE_URL}/venues" class="button" style="display:inline-block;background-color:#c45a3b;color:white;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:500;">Hitta andra lokaler</a></p>
    <div class="content-footer">
      <p>Behöver du hjälp? Kontakta oss så hjälper vi dig hitta rätt lokal.</p>
    </div>
  </div>
`);

export const newMessageEmail = (senderName: string, venueName: string, messagePreview: string) =>
  baseTemplate(`
  <div class="header">
    <p class="wordmark">Tryffle</p>
    <h1>Nytt meddelande</h1>
  </div>
  <div class="content">
    <p><strong>${escapeHtml(senderName)}</strong> skickade ett meddelande angående <strong>${escapeHtml(venueName)}</strong>:</p>
    <div class="message-box">
      "${escapeHtml(messagePreview)}"
    </div>
    <p>Logga in för att svara.</p>
    <p style="text-align: center;"><a href="${SITE_URL}" class="button" style="display:inline-block;background-color:#c45a3b;color:white;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:500;">Gå till Tryffle</a></p>
    <div class="content-footer">
      <p>Du får detta mejl för att du har en aktiv bokningsförfrågan.</p>
    </div>
  </div>
`);

export const confirmationEmail = (confirmationUrl: string) =>
  baseTemplate(`
  <div class="header">
    <p class="wordmark">Tryffle</p>
    <h1>Bekräfta din e-postadress</h1>
  </div>
  <div class="content">
    <p>Välkommen till Tryffle!</p>
    <p>Klicka på knappen nedan för att bekräfta din e-postadress och aktivera ditt konto:</p>
    <p style="text-align: center;">
      <a href="${escapeHtml(confirmationUrl)}" class="button" style="display:inline-block;background-color:#c45a3b;color:white;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:500;">Bekräfta e-postadress</a>
    </p>
    <p style="color: #78716c; font-size: 14px;">Om du inte skapade ett konto kan du ignorera detta mejl.</p>
    <div class="content-footer">
      <p>Länken är giltig i 24 timmar.</p>
    </div>
  </div>
`);

export const passwordResetEmail = (resetUrl: string) =>
  baseTemplate(`
  <div class="header">
    <p class="wordmark">Tryffle</p>
    <h1>Återställ ditt lösenord</h1>
  </div>
  <div class="content">
    <p>Vi har fått en begäran om att återställa lösenordet för ditt konto.</p>
    <p>Klicka på knappen nedan för att välja ett nytt lösenord:</p>
    <p style="text-align: center;">
      <a href="${escapeHtml(resetUrl)}" class="button" style="display:inline-block;background-color:#c45a3b;color:white;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:500;">Återställ lösenord</a>
    </p>
    <p style="color: #78716c; font-size: 14px;">Om du inte begärde detta kan du ignorera mejlet. Ditt lösenord förblir oförändrat.</p>
    <div class="content-footer">
      <p>Länken är giltig i 24 timmar.</p>
    </div>
  </div>
`);

export function modificationProposedEmail(
  venueName: string,
  eventDate: string,
  changes: string
): string {
  return baseTemplate(`
    <h1>Ändringsförslag</h1>
    <p>Ett ändringsförslag har skapats för din bokning av <strong>${escapeHtml(venueName)}</strong>.</p>
    <div class="info-box">
      <p><strong>Nuvarande datum:</strong> ${escapeHtml(eventDate)}</p>
      <p><strong>Föreslagna ändringar:</strong></p>
      ${changes}
    </div>
    <p>Logga in på Tryffle för att granska och godkänna eller neka förslaget.</p>
    <a href="${SITE_URL}/account/bookings" class="button">Granska ändringsförslag</a>
  `)
}

export function modificationAcceptedEmail(
  venueName: string,
  eventDate: string
): string {
  return baseTemplate(`
    <h1>Ändringsförslag godkänt</h1>
    <p>Ditt ändringsförslag för bokningen av <strong>${escapeHtml(venueName)}</strong> har godkänts.</p>
    <div class="info-box">
      <p><strong>Uppdaterat datum:</strong> ${escapeHtml(eventDate)}</p>
    </div>
    <p>Logga in på Tryffle för att se den uppdaterade bokningen.</p>
    <a href="${SITE_URL}/account/bookings" class="button">Se bokning</a>
  `)
}
