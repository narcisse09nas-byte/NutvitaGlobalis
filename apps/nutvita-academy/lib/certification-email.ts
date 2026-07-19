type EmailInput = { to: string; subject: string; text: string; actionUrl?: string; actionLabel?: string };

export async function sendCertificationEmail(input: EmailInput): Promise<"sent" | "skipped"> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY absent: certification email skipped");
    return "skipped";
  }
  const action = input.actionUrl
    ? `<p style="margin:28px 0"><a href="${input.actionUrl}" style="background:#0B5D3B;color:white;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:700">${input.actionLabel ?? "Ouvrir"}</a></p>`
    : "";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.MAIL_FROM ?? "NutVitaGlobalis <contact@nutvitaglobalis.com>",
      to: [input.to],
      subject: input.subject,
      text: `${input.text}${input.actionUrl ? `\n\n${input.actionUrl}` : ""}`,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.65;color:#16352d;max-width:640px;margin:auto"><h1 style="color:#0B5D3B">${input.subject}</h1><p>${input.text.replace(/\n/g, "<br>")}</p>${action}<p>Equipe NutVitaGlobalis Academy</p></div>`,
    }),
  });
  if (!response.ok) throw new Error(`Resend ${response.status}: ${await response.text()}`);
  return "sent";
}
