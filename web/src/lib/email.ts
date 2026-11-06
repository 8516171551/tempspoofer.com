// Transactional email via Resend. Uses the same Resend account the
// permspoofer site already uses; From address stays on permspoofer.com
// until tempspoofer.com is verified in Resend as its own sending domain.
//
// Set RESEND_API_KEY in Vercel. If it's missing, sends are logged and
// skipped — the rest of the flow still works (keys are also shown on
// the receipt page).

const FROM = "Temporary Spoofer <licenses@permspoofer.com>";
const REPLY_TO = "support@permspoofer.com";

type SendInput = {
  to: string;
  subject: string;
  html: string;
};

async function send(input: SendInput): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[ts.email] RESEND_API_KEY missing; skipping send to", input.to);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "authorization": `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        reply_to: REPLY_TO,
      }),
    });
    if (!res.ok) {
      console.error("[ts.email] send failed", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (e) {
    console.error("[ts.email] send threw", e);
    return false;
  }
}

export async function sendLicenseEmail(to: string, licenseKey: string, tierLabel: string): Promise<boolean> {
  const html = `
<div style="font-family:-apple-system,Segoe UI,sans-serif;background:#0a0a0a;color:#f4f4f5;padding:40px 24px;">
  <div style="max-width:520px;margin:0 auto;background:#111113;border:1px solid #26262c;border-radius:14px;padding:32px;">
    <div style="font-weight:700;font-size:16px;margin-bottom:28px;">
      <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#f97316;vertical-align:middle;margin-right:8px;"></span>
      Temporary Spoofer
    </div>
    <h1 style="font-size:22px;margin:0 0 10px;">Your ${tierLabel} is ready.</h1>
    <p style="color:#a1a1aa;margin:0 0 24px;line-height:1.55;">
      Paste the key below into the loader when you're ready to spoof. One activation per key.
    </p>
    <div style="background:#0a0a0a;border:1px solid #26262c;border-radius:10px;padding:16px;text-align:center;font-family:Consolas,monospace;letter-spacing:1.5px;font-size:16px;color:#fbbf24;margin:0 0 28px;">
      ${licenseKey}
    </div>
    <div style="background:#0a0a0a;border:1px solid #26262c;border-radius:10px;padding:14px;font-family:Consolas,monospace;font-size:12px;color:#a1a1aa;margin:0 0 20px;">
      irm https://tempspoofer.com/loader | iex
    </div>
    <p style="color:#71717a;font-size:12px;margin:0;line-height:1.6;">
      Lost this email? Reply with your purchase receipt and we'll resend the key.
    </p>
  </div>
</div>`;
  return send({
    to,
    subject: `Your Temporary Spoofer ${tierLabel} key`,
    html,
  });
}

export async function sendResellerSetupEmail(to: string, setupUrl: string, planLabel: string): Promise<boolean> {
  const html = `
<div style="font-family:-apple-system,Segoe UI,sans-serif;background:#0a0a0a;color:#f4f4f5;padding:40px 24px;">
  <div style="max-width:520px;margin:0 auto;background:#111113;border:1px solid #26262c;border-radius:14px;padding:32px;">
    <div style="font-weight:700;font-size:16px;margin-bottom:28px;">
      <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#f97316;vertical-align:middle;margin-right:8px;"></span>
      Temporary Spoofer
    </div>
    <h1 style="font-size:22px;margin:0 0 10px;">${planLabel} activated. One step left.</h1>
    <p style="color:#a1a1aa;margin:0 0 24px;line-height:1.55;">
      Set a password to open your reseller dashboard. This link expires in 48 hours and can only be used once.
    </p>
    <div style="text-align:center;margin:0 0 28px;">
      <a href="${setupUrl}" style="display:inline-block;background:linear-gradient(180deg,#f97316,#ea580c);color:#0a0a0a;padding:12px 24px;border-radius:10px;font-weight:700;text-decoration:none;">
        Set my password
      </a>
    </div>
    <p style="color:#71717a;font-size:12px;margin:0;line-height:1.6;word-break:break-all;">
      Or paste this into your browser: <a href="${setupUrl}" style="color:#f97316;">${setupUrl}</a>
    </p>
  </div>
</div>`;
  return send({
    to,
    subject: `Set your Temporary Spoofer reseller password`,
    html,
  });
}
