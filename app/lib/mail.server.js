import { Resend } from "resend";

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is missing.");
  }

  return new Resend(apiKey);
}

export async function sendMail({ to, subject, html, text }) {
  try {
    const resend = getResendClient();

    const response = await resend.emails.send({
      from: "Let Me Bowl <info@letmebowl-catering.de>",
      to,
      subject,
      html,
      text,
    });

    console.log("MAIL SENT:", response);
    return response;
  } catch (error) {
    console.error("MAIL ERROR:", error);
    throw error;
  }
}