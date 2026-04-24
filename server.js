import express from "express";
import { createRequestHandler } from "@react-router/express";
import { Resend } from "resend";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const resend = new Resend(process.env.RESEND_API_KEY);

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/password-forgot", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        ok: false,
        message: "E-Mail fehlt",
      });
    }

    const resetLink = `${process.env.APP_URL}/passwort-zuruecksetzen?email=${encodeURIComponent(email)}`;

    await resend.emails.send({
      from: process.env.MAIL_FROM || "Let Me Bowl <onboarding@resend.dev>",
      to: email,
      bcc: process.env.MAIL_BCC || undefined,
      subject: "Passwort zurücksetzen",
      html: `
        <h2>Passwort zurücksetzen</h2>
        <p>Für diese E-Mail wurde ein Passwort-Reset angefragt:</p>
        <p><strong>${email}</strong></p>
        <p>Klicke auf den Link:</p>
        <a href="${resetLink}">${resetLink}</a>
      `,
    });

    return res.json({ ok: true, message: "E-Mail wurde gesendet" });
  } catch (error) {
    console.error("Password forgot error:", error);
    return res.status(500).json({
      ok: false,
      message: "Fehler beim Senden der E-Mail",
    });
  }
});

const build = await import("./build/server/index.js");

// 🔥 WICHTIG: Hochgeladene PDFs öffentlich machen
app.use("/uploads", express.static("uploads"));

app.use(express.static("build/client"));

app.all("*", createRequestHandler({ build }));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server läuft auf Port ${PORT}`);
});