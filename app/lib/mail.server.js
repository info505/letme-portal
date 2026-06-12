function getMailjetConfig() {
  const apiKey = process.env.MAILJET_API_KEY;
  const secretKey = process.env.MAILJET_SECRET_KEY;

  const fromEmail =
    process.env.MAIL_FROM_EMAIL ||
    process.env.MAILJET_FROM_EMAIL ||
    "info@letmebowl-catering.de";

  const fromName =
    process.env.MAIL_FROM_NAME ||
    process.env.MAILJET_FROM_NAME ||
    "Let Me Bowl";

  if (!apiKey) {
    throw new Error("MAILJET_API_KEY fehlt.");
  }

  if (!secretKey) {
    throw new Error("MAILJET_SECRET_KEY fehlt.");
  }

  return {
    apiKey,
    secretKey,
    fromEmail,
    fromName,
  };
}

function normalizeRecipients(to) {
  const recipients = Array.isArray(to) ? to : [to];

  return recipients
    .map((recipient) => {
      if (typeof recipient === "string") {
        return {
          Email: recipient.trim(),
        };
      }

      if (recipient && typeof recipient === "object") {
        return {
          Email: String(recipient.email || recipient.Email || "").trim(),
          Name: String(recipient.name || recipient.Name || "").trim(),
        };
      }

      return null;
    })
    .filter((recipient) => recipient?.Email);
}

export async function sendMail({
  to,
  subject,
  html,
  text,
  replyTo,
  cc,
  bcc,
}) {
  const config = getMailjetConfig();
  const recipients = normalizeRecipients(to);

  if (!recipients.length) {
    throw new Error("Kein gültiger E-Mail-Empfänger angegeben.");
  }

  const message = {
    From: {
      Email: config.fromEmail,
      Name: config.fromName,
    },
    To: recipients,
    Subject: String(subject || "").trim(),
    TextPart: String(text || ""),
    HTMLPart: String(html || ""),
  };

  const ccRecipients = normalizeRecipients(cc || []);
  const bccRecipients = normalizeRecipients(bcc || []);

  if (ccRecipients.length) {
    message.Cc = ccRecipients;
  }

  if (bccRecipients.length) {
    message.Bcc = bccRecipients;
  }

  if (replyTo) {
    const replyRecipients = normalizeRecipients(replyTo);

    if (replyRecipients.length) {
      message.ReplyTo = replyRecipients[0];
    }
  }

  const authorization = Buffer.from(
    `${config.apiKey}:${config.secretKey}`
  ).toString("base64");

  const response = await fetch("https://api.mailjet.com/v3.1/send", {
    method: "POST",
    headers: {
      Authorization: `Basic ${authorization}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      Messages: [message],
    }),
  });

  const responseText = await response.text();

  let result;

  try {
    result = responseText ? JSON.parse(responseText) : {};
  } catch {
    result = {
      rawResponse: responseText,
    };
  }

  if (!response.ok) {
    console.error("MAILJET ERROR:", {
      status: response.status,
      result,
    });

    throw new Error(
      result?.ErrorMessage ||
        result?.Messages?.[0]?.Errors?.[0]?.ErrorMessage ||
        `Mailjet-Versand fehlgeschlagen (${response.status}).`
    );
  }

  console.log("MAILJET MAIL SENT:", {
    recipients: recipients.map((recipient) => recipient.Email),
    subject: message.Subject,
    status: response.status,
  });

  return result;
}
