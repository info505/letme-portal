import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendMail({ to, subject, html, text }) {
  return await resend.emails.send({
    from: "Let Me Bowl <info@letmebowl-catering.de>",
    to,
    subject,
    html,
    text,
  });
}