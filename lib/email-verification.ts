import { randomBytes } from 'node:crypto'
import { db } from '@/lib/db'
import { sendEmail } from '@/lib/brevo'

const APP_URL = process.env.NEXTAUTH_URL || 'https://app.atline.ai'
const TTL = 24 * 60 * 60 * 1000 // 24 h

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

function verifyHtml(firstName: string, url: string): string {
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#26282d">
  <h1 style="font-size:20px;font-weight:700;margin:0 0 12px">Bonjour ${escapeHtml(firstName)},</h1>
  <p style="font-size:15px;line-height:1.5;color:#4b4f57;margin:0 0 20px">Bienvenue chez Atline. Confirme ton adresse email pour sécuriser ton compte.</p>
  <a href="${url}" style="display:inline-block;background:#F97316;color:#fff;font-weight:600;font-size:15px;text-decoration:none;padding:12px 22px;border-radius:12px">Confirmer mon adresse</a>
  <p style="font-size:12px;line-height:1.5;color:#9096a0;margin:20px 0 0">Ce lien expire dans 24 h. Si tu n'es pas à l'origine de cette inscription, ignore cet email.</p>
</div>`
}

// Crée un token de vérification (24 h) et envoie le mail « confirme ton adresse ». Best-effort :
// renvoie false si l'envoi échoue (ou si Brevo n'est pas configuré) sans jamais lever d'exception.
export async function sendVerificationEmail(userId: string, email: string, firstName: string): Promise<boolean> {
  try {
    const token = randomBytes(32).toString('hex')
    await db.emailVerificationToken.create({ data: { userId, token, expiresAt: new Date(Date.now() + TTL) } })
    const url = `${APP_URL}/api/auth/verify-email?token=${token}`
    return await sendEmail({ to: email, toName: firstName, subject: 'Confirme ton adresse email', html: verifyHtml(firstName, url) })
  } catch (e) {
    console.error('[email-verification] échec', e)
    return false
  }
}
