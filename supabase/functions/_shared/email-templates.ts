// Base email template with Venue Agent branding
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
        background-color: #f9fafb;
      }
      .container {
        background-color: white;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }
      .header {
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        color: white;
        padding: 24px;
      }
      .header h1 {
        margin: 0;
        font-size: 22px;
        font-weight: 600;
      }
      .content {
        padding: 32px 24px;
      }
      .footer {
        margin-top: 24px;
        padding-top: 20px;
        border-top: 1px solid #e5e7eb;
        color: #6b7280;
        font-size: 13px;
      }
      .info-box {
        background: #f3f4f6;
        padding: 16px;
        border-radius: 8px;
        margin: 20px 0;
      }
      .info-row {
        display: flex;
        margin: 8px 0;
      }
      .info-label {
        color: #6b7280;
        min-width: 100px;
      }
      .message-box {
        background: #fafafa;
        padding: 16px;
        border-radius: 8px;
        border-left: 4px solid #6366f1;
        margin: 20px 0;
        font-style: italic;
        color: #4b5563;
      }
      .button {
        display: inline-block;
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        color: white;
        padding: 14px 28px;
        text-decoration: none;
        border-radius: 8px;
        font-weight: 500;
        margin: 16px 0;
      }
      a { color: #6366f1; }
    </style>
  </head>
  <body>
    <div class="container">
      ${content}
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
    <div class="footer">
      <p>Svara gärna inom 24 timmar för bästa kundupplevelse.</p>
    </div>
  </div>
`);

export const bookingAcceptedEmail = (venueName: string, eventDate: string, ownerName: string) =>
  baseTemplate(`
  <div class="header">
    <h1>Bokning accepterad!</h1>
  </div>
  <div class="content">
    <p>Goda nyheter! Din bokningsförfrågan för <strong>${escapeHtml(venueName)}</strong> har accepterats av ${escapeHtml(ownerName)}.</p>
    <div class="info-box">
      <div class="info-row"><span class="info-label">Lokal:</span> ${escapeHtml(venueName)}</div>
      <div class="info-row"><span class="info-label">Datum:</span> ${escapeHtml(eventDate)}</div>
    </div>
    <p>Logga in för att se detaljer och kommunicera med lokalägaren.</p>
    <div class="footer">
      <p>Tack för att du använder Venue Agent!</p>
    </div>
  </div>
`);

export const bookingDeclinedEmail = (venueName: string, eventDate: string, reason?: string) =>
  baseTemplate(`
  <div class="header">
    <h1>Bokning kunde inte accepteras</h1>
  </div>
  <div class="content">
    <p>Tyvärr kunde din bokningsförfrågan för <strong>${escapeHtml(venueName)}</strong> den ${escapeHtml(eventDate)} inte accepteras.</p>
    ${reason ? `<p><strong>Anledning:</strong> ${escapeHtml(reason)}</p>` : ""}
    <p>Sök gärna vidare bland våra andra lokaler för att hitta den perfekta platsen för ditt event.</p>
    <div class="footer">
      <p>Behöver du hjälp? Kontakta oss så hjälper vi dig hitta rätt lokal.</p>
    </div>
  </div>
`);

export const newMessageEmail = (senderName: string, venueName: string, messagePreview: string) =>
  baseTemplate(`
  <div class="header">
    <h1>Nytt meddelande</h1>
  </div>
  <div class="content">
    <p><strong>${escapeHtml(senderName)}</strong> skickade ett meddelande angående <strong>${escapeHtml(venueName)}</strong>:</p>
    <div class="message-box">
      "${escapeHtml(messagePreview)}"
    </div>
    <p>Logga in för att svara.</p>
    <div class="footer">
      <p>Du får detta mejl för att du har en aktiv bokningsförfrågan.</p>
    </div>
  </div>
`);

export const confirmationEmail = (confirmationUrl: string) =>
  baseTemplate(`
  <div class="header">
    <h1>Bekräfta din e-postadress</h1>
  </div>
  <div class="content">
    <p>Välkommen till Venue Agent!</p>
    <p>Klicka på knappen nedan för att bekräfta din e-postadress och aktivera ditt konto:</p>
    <p style="text-align: center;">
      <a href="${escapeHtml(confirmationUrl)}" class="button">Bekräfta e-postadress</a>
    </p>
    <p style="color: #6b7280; font-size: 14px;">Om du inte skapade ett konto kan du ignorera detta mejl.</p>
    <div class="footer">
      <p>Länken är giltig i 24 timmar.</p>
    </div>
  </div>
`);

export const passwordResetEmail = (resetUrl: string) =>
  baseTemplate(`
  <div class="header">
    <h1>Återställ ditt lösenord</h1>
  </div>
  <div class="content">
    <p>Vi har fått en begäran om att återställa lösenordet för ditt konto.</p>
    <p>Klicka på knappen nedan för att välja ett nytt lösenord:</p>
    <p style="text-align: center;">
      <a href="${escapeHtml(resetUrl)}" class="button">Återställ lösenord</a>
    </p>
    <p style="color: #6b7280; font-size: 14px;">Om du inte begärde detta kan du ignorera mejlet. Ditt lösenord förblir oförändrat.</p>
    <div class="footer">
      <p>Länken är giltig i 24 timmar.</p>
    </div>
  </div>
`);
