import {
  Form,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
import { hashPassword, getUserFromRequest } from "../lib/auth.server.js";
import { getLocaleFromRequest, dict, withLang } from "../lib/i18n.js";
import {
  findValidPasswordResetToken,
  markPasswordResetTokenUsed,
  invalidateAllUserResetTokens,
} from "../lib/password-reset.server.js";
import { prisma } from "../lib/prisma.server.js";
import { card, button, input, colors, layout } from "../lib/ui.js";
import LanguageSwitch from "../components/LanguageSwitch.jsx";

export async function loader({ request }) {
  const locale = getLocaleFromRequest(request);
  const user = await getUserFromRequest(request);

  if (user) {
    throw redirect(`/dashboard?lang=${locale}`);
  }

  const url = new URL(request.url);
  const token = String(url.searchParams.get("token") || "");

  if (!token) {
    return {
      locale,
      token,
      valid: false,
    };
  }

  const resetToken = await findValidPasswordResetToken(token);

  return {
    locale,
    token,
    valid: Boolean(resetToken),
  };
}

export async function action({ request }) {
  const locale = getLocaleFromRequest(request);
  const t = dict[locale] || dict.de;

  const formData = await request.formData();
  const token = String(formData.get("token") || "");
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (!token) {
    return { ok: false, message: t.resetTokenInvalid };
  }

  if (password.length < 8) {
    return { ok: false, message: t.registerPasswordShort, tokenValid: true };
  }

  if (password !== confirmPassword) {
    return { ok: false, message: t.registerPasswordMismatch, tokenValid: true };
  }

  const resetToken = await findValidPasswordResetToken(token);

  if (!resetToken) {
    return { ok: false, message: t.resetTokenInvalid, tokenValid: false };
  }

  const passwordHash = await hashPassword(password);

  await prisma.portalUser.update({
    where: { id: resetToken.userId },
    data: {
      passwordHash,
      mustResetPassword: false,
    },
  });

  await markPasswordResetTokenUsed(resetToken.id);
  await invalidateAllUserResetTokens(resetToken.userId);

  return redirect(withLang("/login", locale));
}

export default function ResetPasswordPage() {
  const { locale, token, valid } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const t = dict[locale] || dict.de;

  const isSubmitting = navigation.state === "submitting";
  const tokenStillValid =
    actionData?.tokenValid !== undefined ? actionData.tokenValid : valid;

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
            {t.resetPasswordFormTitle}
          </h1>

          <p
            style={{
              margin: "0 0 20px",
              color: colors.muted,
              lineHeight: 1.7,
              fontSize: "15px",
            }}
          >
            {tokenStillValid ? t.resetPasswordFormText : t.resetTokenInvalid}
          </p>

          {actionData?.message ? (
            <div
              style={{
                marginBottom: "18px",
                padding: "14px 16px",
                borderRadius: "14px",
                background: "#fff4f4",
                color: "#8b2222",
                border: "1px solid #efcaca",
                fontWeight: 700,
              }}
            >
              {actionData.message}
            </div>
          ) : null}

          {tokenStillValid ? (
            <Form method="post">
              <input type="hidden" name="token" value={token} />

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
                  {t.password}
                </span>

                <input
                  name="password"
                  type="password"
                  placeholder={t.passwordRegisterPlaceholder}
                  style={input.base}
                />
              </label>

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
                  {t.confirmPassword}
                </span>

                <input
                  name="confirmPassword"
                  type="password"
                  placeholder={t.confirmPasswordPlaceholder}
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
                {isSubmitting ? t.saving : t.resetPasswordButton}
              </button>
            </Form>
          ) : (
            <a
              href={withLang("/passwort-vergessen", locale)}
              style={{
                ...button.secondary,
                textDecoration: "none",
                color: colors.text,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {t.requestResetLink}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}