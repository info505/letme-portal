import nodemailer from "nodemailer";

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP configuration is missing.");
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  return transporter;
}

export async function sendMail({ to, subject, html, text }) {
  const from =
    process.env.MAIL_FROM ||
    process.env.SMTP_USER ||
    "no-reply@letmebowl-catering.de";

  const tx = getTransporter();

  return tx.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
}