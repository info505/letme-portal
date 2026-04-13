import nodemailer from "nodemailer";

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
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
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

  return transporter;
}

export async function sendMail({ to, subject, html, text }) {
  const from =
    process.env.SMTP_FROM ||
    process.env.MAIL_FROM ||
    process.env.SMTP_USER ||
    "no-reply@letmebowl-catering.de";

  const tx = getTransporter();

  try {
    console.log("MAIL_DEBUG_FROM:", from);
    console.log("MAIL_DEBUG_TO:", to);
    console.log("MAIL_DEBUG_HOST:", process.env.SMTP_HOST);
    console.log("MAIL_DEBUG_PORT:", process.env.SMTP_PORT);

    const info = await tx.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });

    console.log("MAIL_SENT_OK:", info.messageId);
    return info;
  } catch (error) {
    console.error("MAIL_SEND_ERROR:", error);
    throw error;
  }
}