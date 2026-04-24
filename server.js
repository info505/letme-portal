import express from "express";
import { createRequestHandler } from "@react-router/express";
import { Resend } from "resend";

const app = express();
const PORT = process.env.PORT || 8080;

// 🔥 Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔥 Resend init
const resend = new Resend(process.env.RESEND_API_KEY);

// 🔥 TEST ROUTE (optional – zum prüfen ob Server läuft)
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// 🔥 PASSWORT VERGESSEN
app.post("/api/password-forgot", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        ok: false,
        message: "E-Mail fehlt",
      });
    }

    // 👉 später: DB check + Token speichern
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
        <br><br>
        <p>Falls du das nicht warst, ignoriere diese Mail.</p>
      `,
    });

    return res.json({
      ok: true,
      message: "E-Mail wurde gesendet",
    });
  } catch (error) {
    console.error("Password forgot error:", error);

    return res.status(500).json({
      ok: false,
      message: "Fehler beim Senden der E-Mail",
    });
  }
});

// 🔥 BUILD laden (React Router)
const build = await import("./build/server/index.js");

// 🔥 Static Files
app.use(express.static("build/client"));

// 🔥 React Router (IMMER ganz unten!)
app.all("*", createRequestHandler({ build }));

// 🔥 Server starten
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server läuft auf Port ${PORT}`);
});