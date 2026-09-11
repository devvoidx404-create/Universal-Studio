import nodemailer from "nodemailer";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface SendEmailResult {
  success: boolean;
  provider?: "resend" | "smtp" | "simulation";
  error?: string;
}

/**
 * Sends a real email using Resend (prefers API) or Nodemailer (SMTP fallback).
 * If no keys are configured, it gracefully falls back to simulation mode.
 */
export async function sendEmail({ to, subject, html, text }: SendEmailParams): Promise<SendEmailResult> {
  // 1. Check for Resend API key
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "Universal Code Studio <onboarding@resend.dev>",
          to,
          subject,
          html,
          text,
        }),
      });

      if (response.ok) {
        console.log(`Email successfully sent to ${to} via Resend.`);
        return { success: true, provider: "resend" };
      } else {
        const errText = await response.text();
        console.error("Resend API response error:", errText);
        return { success: false, provider: "resend", error: errText };
      }
    } catch (e: any) {
      console.error("Resend delivery failed:", e);
      return { success: false, provider: "resend", error: e?.message || String(e) };
    }
  }

  // 2. Check for standard SMTP configuration
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpHost && smtpPort && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort, 10),
        secure: smtpPort === "465", // true for port 465, false for other ports
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || `"Universal Code Studio" <${smtpUser}>`,
        to,
        subject,
        html,
        text,
      });

      console.log(`Email successfully sent to ${to} via SMTP.`);
      return { success: true, provider: "smtp" };
    } catch (e: any) {
      console.error("SMTP delivery failed:", e);
      return { success: false, provider: "smtp", error: e?.message || String(e) };
    }
  }

  // 3. Graceful simulation fallback
  console.log("==================================================");
  console.log(`SIMULATED EMAIL TO: ${to}`);
  console.log(`SUBJECT: ${subject}`);
  console.log(`BODY:\n${text}`);
  console.log("==================================================");

  return { success: true, provider: "simulation" };
}
