import nodemailer from "nodemailer";

/**
 * Sends the sign-in link. Without SMTP_HOST (local development) the link is
 * written to the server log instead.
 */
export async function sendSignInLink(to: string, url: string): Promise<void> {
  if (!process.env.SMTP_HOST) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SMTP_HOST is not configured");
    }
    console.log(`[dev] Sign-in link for ${to}: ${url}`);
    return;
  }

  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });

  await transport.sendMail({
    from: process.env.SMTP_FROM ?? "kcpersonal <noreply@localhost>",
    to,
    subject: "Logga in på kcpersonal",
    text: [
      "Hej!",
      "",
      "Klicka på länken för att logga in på kcpersonal:",
      url,
      "",
      "Länken gäller i 15 minuter och kan bara användas en gång.",
      "Har du inte bett om att logga in kan du ignorera det här mejlet.",
    ].join("\n"),
  });
}
