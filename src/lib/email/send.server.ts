/*
 * Transactional email sent by Misaeng itself (Resend REST API, no SDK). Sign-up / password-reset codes are sent by
 * Supabase Auth through the same Resend account (SMTP, configured in the Supabase dashboard); this module sends the
 * mails Misaeng owns: school / work email verification codes.
 * Env: RESEND_API_KEY, EMAIL_FROM (default "미생 <no-reply@misaeng.com>"), EMAIL_REPLY_TO (optional).
 */

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim())
}

export class EmailSendError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'EmailSendError'
  }
}

export async function sendEmail(input: { to: string; subject: string; html: string; text: string }) {
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) throw new EmailSendError('RESEND_API_KEY is not set.', 503)
  const from = process.env.EMAIL_FROM?.trim() || '미생 <no-reply@misaeng.com>'
  const replyTo = process.env.EMAIL_REPLY_TO?.trim()
  let res: Response
  try {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    })
  } catch (error) {
    throw new EmailSendError(`Email provider unreachable: ${(error as Error)?.message || 'network error'}`, 503)
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new EmailSendError(`Email send failed (${res.status}): ${body.slice(0, 200)}`, res.status >= 500 ? 503 : 400)
  }
}

const escape = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** A short mail with one big code (verification codes). `lines` are plain sentences above the code. */
export function codeEmail(input: { title: string; lines: string[]; code: string; footer: string }) {
  const html = `<!doctype html><html><body style="margin:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Pretendard',sans-serif;color:#0f172a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:20px;padding:32px 28px">
<tr><td style="font-size:20px;font-weight:700;padding-bottom:12px">${escape(input.title)}</td></tr>
${input.lines.map((line) => `<tr><td style="font-size:15px;line-height:1.6;color:#475569;padding-bottom:6px">${escape(line)}</td></tr>`).join('')}
<tr><td style="padding:20px 0"><div style="font-size:32px;font-weight:700;letter-spacing:8px;text-align:center;background:#fff1ed;color:#ea4a12;border-radius:14px;padding:18px 0">${escape(input.code)}</div></td></tr>
<tr><td style="font-size:12px;line-height:1.6;color:#94a3b8">${escape(input.footer)}</td></tr>
</table></td></tr></table></body></html>`
  const text = [input.title, '', ...input.lines, '', input.code, '', input.footer].join('\n')
  return { html, text }
}
