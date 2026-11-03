/**
 * Playground invitation email. Table layout + inline styles so it renders the
 * same in Gmail, Outlook and Apple Mail, and stacks cleanly on phones.
 */

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const initial = (name) => esc((name || '?').trim().charAt(0).toUpperCase() || '?');

export function playgroundInviteSubject({ inviterName, title }) {
  return `${inviterName} invited you to “${title}” on BroCode`;
}

export function playgroundInviteText({ inviterName, title, roomId, joinLink, message }) {
  return [
    `${inviterName} invited you to a live coding session on BroCode.`,
    '',
    `Session: ${title}`,
    `Room code: ${roomId}`,
    message ? `\nMessage from ${inviterName}:\n"${message}"\n` : '',
    `Join here: ${joinLink}`,
    '',
    'The room has a shared code editor, a scratchpad, voice and chat. You will need a BroCode account to join.',
  ]
    .filter((l) => l !== null)
    .join('\n');
}

export function playgroundInviteHtml({ inviterName, inviterEmail, title, roomId, joinLink, message, peopleInRoom }) {
  const year = new Date().getFullYear();
  const preheader = `${inviterName} is waiting for you in “${title}”. Shared editor, scratchpad, voice and chat.`;
  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const mono = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";

  const messageBlock = message
    ? `
          <tr>
            <td style="padding:0 24px 24px 24px;" class="px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-left:3px solid #6366f1;padding:4px 0 4px 14px;font-family:${font};font-size:15px;line-height:1.6;color:#374151;">
                    “${esc(message).replace(/\n/g, '<br>')}”
                    <div style="margin-top:6px;font-size:13px;color:#6b7280;">— ${esc(inviterName)}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${esc(playgroundInviteSubject({ inviterName, title }))}</title>
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; }
      .px { padding-left: 20px !important; padding-right: 20px !important; }
      .h1 { font-size: 22px !important; }
      .outer { padding: 20px 8px !important; }
    }
    a { color: #4f46e5; }
  </style>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f4f6;">
    <tr>
      <td align="center" style="padding:32px 12px;" class="outer">
        <table role="presentation" class="container" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px;max-width:560px;">
          <!-- brand -->
          <tr>
            <td style="padding:0 4px 16px 4px;font-family:${font};">
              <span style="display:inline-block;width:28px;height:28px;line-height:28px;text-align:center;border-radius:7px;background:#111827;color:#a5b4fc;font-weight:800;font-size:12px;letter-spacing:0.5px;vertical-align:middle;">BC</span>
              <span style="font-size:15px;font-weight:700;color:#111827;vertical-align:middle;margin-left:8px;">BroCode</span>
              <span style="font-size:13px;color:#9ca3af;vertical-align:middle;margin-left:6px;">Playground</span>
            </td>
          </tr>

          <!-- card -->
          <tr>
            <td style="background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <!-- accent -->
                <tr><td style="height:4px;background:#4f46e5;background-image:linear-gradient(90deg,#4f46e5,#6366f1 60%,#ec4899);font-size:0;line-height:0;">&nbsp;</td></tr>

                <!-- inviter -->
                <tr>
                  <td style="padding:28px 24px 8px 24px;" class="px">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="width:44px;height:44px;border-radius:22px;background:#6366f1;color:#ffffff;font-family:${font};font-size:18px;font-weight:700;text-align:center;vertical-align:middle;">${initial(inviterName)}</td>
                        <td style="padding-left:12px;font-family:${font};">
                          <div style="font-size:14px;font-weight:600;color:#111827;">${esc(inviterName)}</div>
                          <div style="font-size:13px;color:#6b7280;">${esc(inviterEmail || '')}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- heading -->
                <tr>
                  <td style="padding:16px 24px 8px 24px;font-family:${font};" class="px">
                    <div style="font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#6366f1;">You're invited</div>
                    <h1 class="h1" style="margin:6px 0 0 0;font-size:26px;line-height:1.25;font-weight:700;color:#111827;letter-spacing:-0.02em;">Join ${esc(inviterName)} in a live coding session</h1>
                    <p style="margin:10px 0 0 0;font-size:15px;line-height:1.6;color:#4b5563;">Work through problems together with a shared editor, a scratchpad, voice and chat in one browser tab.</p>
                  </td>
                </tr>

                <!-- session ticket: stacked rows, so it never overflows on phones -->
                <tr>
                  <td style="padding:20px 24px 24px 24px;" class="px">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;">
                      <tr>
                        <td style="padding:16px 18px 14px 18px;font-family:${font};">
                          <div style="font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#9ca3af;">Session</div>
                          <div style="margin-top:4px;font-size:17px;line-height:1.35;font-weight:700;color:#111827;word-break:break-word;">${esc(title)}</div>
                          <div style="margin-top:3px;font-size:13px;line-height:1.5;color:#6b7280;">Hosted by ${esc(inviterName)}</div>
                          ${peopleInRoom ? `<div style="font-size:13px;line-height:1.5;color:#6b7280;">${peopleInRoom} ${peopleInRoom === 1 ? 'person' : 'people'} in the room now</div>` : ''}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 18px;"><div style="border-top:1px dashed #d1d5db;height:0;line-height:0;font-size:0;">&nbsp;</div></td>
                      </tr>
                      <tr>
                        <td style="padding:12px 18px 16px 18px;font-family:${font};">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="font-family:${font};font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#9ca3af;vertical-align:middle;">Room code</td>
                              <td align="right" style="font-family:${mono};font-size:16px;font-weight:700;color:#4f46e5;letter-spacing:0.04em;vertical-align:middle;word-break:break-all;">${esc(roomId)}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                ${messageBlock}

                <!-- cta: full-width table button renders the same in every client -->
                <tr>
                  <td style="padding:0 24px 12px 24px;" class="px">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" bgcolor="#4f46e5" style="border-radius:9px;background:#4f46e5;">
                          <a href="${esc(joinLink)}" style="display:block;padding:14px 20px;font-family:${font};font-size:15px;font-weight:600;line-height:1.2;color:#ffffff;text-decoration:none;text-align:center;border-radius:9px;">Join the session &rarr;</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 24px 24px 24px;font-family:${font};font-size:12px;line-height:1.6;color:#9ca3af;" class="px">
                    Or open this link: <a href="${esc(joinLink)}" style="color:#4f46e5;word-break:break-all;">${esc(joinLink)}</a>
                  </td>
                </tr>

                <!-- features: one line that wraps naturally -->
                <tr>
                  <td style="padding:16px 24px 22px 24px;border-top:1px solid #f3f4f6;font-family:${font};font-size:12px;line-height:1.7;color:#6b7280;" class="px">
                    Shared editor in 5 languages &nbsp;&middot;&nbsp; Scratchpad &nbsp;&middot;&nbsp; Voice &amp; chat &nbsp;&middot;&nbsp; Runs in your browser
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- footer -->
          <tr>
            <td style="padding:18px 8px 0 8px;font-family:${font};font-size:12px;line-height:1.6;color:#9ca3af;text-align:center;">
              ${esc(inviterName)} sent this invite from BroCode and is cc'd so they know it reached you.<br>
              You'll need a BroCode account to join. The session closes when the host ends it.<br>
              &copy; ${year} BroCode
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Sends one invite per recipient so addresses aren't shared; the sender is cc'd on each. */
let transporter = null;
async function getTransport() {
  if (transporter) return transporter;
  const nodemailer = (await import('nodemailer')).default;
  transporter = nodemailer.createTransport({
    service: 'gmail',
    pool: true, // reuse one SMTP connection for a batch of invites
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD },
  });
  return transporter;
}

export async function sendPlaygroundInvite({ to, cc, replyTo, ...data }) {
  const t = await getTransport();
  await t.sendMail({
    from: `"${data.inviterName.replace(/["\r\n]/g, '')} via BroCode" <${process.env.EMAIL_USER}>`,
    to,
    cc: cc || undefined,
    replyTo: replyTo || undefined,
    subject: playgroundInviteSubject(data),
    text: playgroundInviteText(data),
    html: playgroundInviteHtml(data),
  });
}
