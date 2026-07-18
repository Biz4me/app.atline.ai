// Envoi transactionnel via Brevo (ex-Sendinblue).
// INERTE si BREVO_API_KEY / BREVO_SENDER absents : on log et on renvoie false, jamais d'exception
// — l'inscription ne casse donc pas tant que l'expéditeur n'est pas configuré côté Brevo.
// Prérequis côté Brevo (à faire une fois, hors code) :
//   - BREVO_API_KEY : clé API v3 (dashboard Brevo → SMTP & API)
//   - BREVO_SENDER : adresse expéditrice sur un domaine VÉRIFIÉ (SPF/DKIM), ex. no-reply@atline.online
//   - BREVO_SENDER_NAME (optionnel) : nom affiché, défaut « Atline »
type SendArgs = { to: string; toName?: string; subject: string; html: string }

export async function sendEmail({ to, toName, subject, html }: SendArgs): Promise<boolean> {
  const key = process.env.BREVO_API_KEY
  const sender = process.env.BREVO_SENDER
  const senderName = process.env.BREVO_SENDER_NAME || 'Atline'
  if (!key || !sender) {
    console.warn('[brevo] BREVO_API_KEY/BREVO_SENDER absents — email non envoyé :', subject)
    return false
  }
  try {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': key, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { email: sender, name: senderName },
        to: [{ email: to, ...(toName ? { name: toName } : {}) }],
        subject,
        htmlContent: html,
      }),
    })
    if (!r.ok) {
      console.error('[brevo] échec envoi', r.status, await r.text().catch(() => ''))
      return false
    }
    return true
  } catch (e) {
    console.error('[brevo] erreur envoi', e)
    return false
  }
}
