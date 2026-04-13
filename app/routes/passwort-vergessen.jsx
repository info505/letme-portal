import {
  Form,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
import { prisma } from "../lib/prisma.server.js";
import { getUserFromRequest } from "../lib/auth.server.js";
import { getLocaleFromRequest, dict, withLang } from "../lib/i18n.js";
import {
  createPasswordResetToken,
  invalidateAllUserResetTokens,
} from "../lib/password-reset.server.js";
import { card, button, input, colors, layout } from "../lib/ui.js";
import LanguageSwitch from "../components/LanguageSwitch.jsx";

export async function loader({ request }) {
  const locale = getLocaleFromRequest(request);
  const user = await getUserFromRequest(request);

  if (user) {
    throw redirect(`/dashboard?lang=${locale}`);
  }

  return { locale };
}

export async function action({ request }) {
  const locale = getLocaleFromRequest(request);
  const t = dict[locale] || dict.de;

  const formData = await request.formData();
  const email = String(formData.get("email") || "").trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return {
      ok: false,
      message: t.forgotPasswordInvalidEmail,
    };
  }

  const user = await prisma.portalUser.findUnique({
    where: { email },
  });

  if (user) {
    await invalidateAllUserResetTokens(user.id);
    const { rawToken } = await createPasswordResetToken(user.id);

    // TEMPORÄR: Mailversand deaktiviert, damit wir prüfen können, ob SMTP das Problem ist
    console.log("PASSWORD_RESET_TEST_TOKEN:", rawToken);
    console.log("PASSWORD_RESET_TEST_EMAIL:", user.email);
  }

  return {
    ok: true,
    message: t.forgotPasswordMailSent,
  };
}

export default function ForgotPasswordPage() {
  const { locale } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const t = dict[locale] || dict.de;

  const isSubmitting = navigation.state === "submitting";

  return (
    <div style={layout.page}>
      <style>{`
        .auth-wrap {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 24px;
          background:
            radial-gradient(circle at top right, rgba(200,169,106,0.08), transparent 28%),
            ${colors.bg};
        }
      `}</style>

      <div className="auth-wrap">
        <div
          style={{
            ...card.base,
            width: "100%",
            maxWidth: "520px",
            padding: "34px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "16px",
              alignItems: "center",
              marginBottom: "24px",
              flexWrap: "wrap",
            }}
          >
            <a
              href="https://letmebowl-catering.de"
              style={{
                textDecoration: "none",
                color: colors.text,
                fontWeight: 800,
                letterSpacing: "0.08em",
                fontSize: "15px",
              }}
            >
              LET ME BOWL
            </a>

            <LanguageSwitch />
          </div>

          <h1
            style={{
              margin: "0 0 10px",
              fontSize: "30px",
              color: colors.text,
            }}
          >
            {t.forgotPasswordTitle}
          </h1>

          <p
            style={{
              margin: "0 0 20px",
              color: colors.muted,
              lineHeight: 1.7,
              fontSize: "15px",
            }}
          >
            {t.forgotPasswordLiveText}
          </p>

          {actionData?.message ? (
            <div
              style={{
                marginBottom: "18px",
                padding: "14px 16px",
                borderRadius: "14px",
                background: actionData.ok ? "#edf7ee" : "#fff4f4",
                color: actionData.ok ? "#1f6b36" : "#8b2222",
                border: actionData.ok ? "1px solid #cfe8d4" : "1px solid #efcaca",
                fontWeight: 700,
              }}
            >
              {actionData.message}
            </div>
          ) : null}

          <Form method="post">
            <label style={{ display: "block", marginBottom: "16px" }}>
              <span
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: 700,
                  color: colors.text,
                  fontSize: "14px",
                }}
              >
                {t.resetEmailLabel}
              </span>

              <input
                name="email"
                type="email"
                placeholder={t.emailPlaceholder}
                style={input.base}
              />
            </label>

            <button
              type="submit"
              style={{
                ...button.primary,
                width: "100%",
                background: "linear-gradient(135deg, #c8a96a, #b8934f)",
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? t.sendingInstructions : t.sendInstructions}
            </button>
          </Form>

          <div
            style={{
              marginTop: "16px",
              fontSize: "14px",
            }}
          >
            <a
              href={withLang("/login", locale)}
              style={{
                color: colors.text,
                textDecoration: "none",
                fontWeight: 700,
              }}
            >
              {t.backToLogin}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}