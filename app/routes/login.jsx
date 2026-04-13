import {
  Form,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
import { prisma } from "../lib/prisma.server.js";
import {
  verifyPassword,
  createPortalSession,
  createSessionCookie,
  getUserFromRequest,
} from "../lib/auth.server.js";
import { getLocaleFromRequest, dict, withLang } from "../lib/i18n.js";
import {
  layout,
  textStyles,
  buttonStyles,
  inputStyles,
} from "../lib/ui.js";

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

  const login = String(formData.get("login") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  const values = { login };

  if (!login || !password) {
    return {
      ok: false,
      locale,
      message: t.loginFieldsMissing,
      values,
    };
  }

  const user = await prisma.portalUser.findFirst({
    where: {
      OR: [{ email: login }, { username: login }],
    },
  });

  if (!user) {
    return {
      ok: false,
      locale,
      message: t.userNotFound,
      values,
    };
  }

  if (!user.isActive) {
    return {
      ok: false,
      locale,
      message: t.accessDisabled,
      values,
    };
  }

  const passwordOk = await verifyPassword(password, user.passwordHash);

  if (!passwordOk) {
    return {
      ok: false,
      locale,
      message: t.passwordWrong,
      values,
    };
  }

  const { sessionToken, expiresAt } = await createPortalSession(user.id);

  return redirect(`/dashboard?lang=${locale}`, {
    headers: {
      "Set-Cookie": createSessionCookie(sessionToken, expiresAt),
    },
  });
}

export default function LoginPage() {
  const { locale } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const values = actionData?.values || {};
  const t = dict[locale] || dict.de;

  return (
    <div style={layout.page}>
      <main style={layout.mainWrap}>
        <div style={{ ...layout.shellCard, maxWidth: 760, margin: "0 auto" }}>
          <div style={textStyles.eyebrow}>{t.brand}</div>
          <h1 style={textStyles.headline}>{t.loginTitle}</h1>
          <p style={textStyles.subline}>{t.loginText}</p>

          <div style={{ marginBottom: 20, display: "flex", justifyContent: "flex-end" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#efede7",
                border: "1px solid #e2d7c3",
                borderRadius: 12,
                padding: "8px 10px",
              }}
            >
              <a
                href={withLang("/login", "de")}
                style={{
                  textDecoration: "none",
                  fontWeight: locale === "de" ? 800 : 600,
                  color: "#111",
                  opacity: locale === "de" ? 1 : 0.6,
                }}
              >
                DE
              </a>

              <span style={{ color: "#b8934f" }}>|</span>

              <a
                href={withLang("/login", "en")}
                style={{
                  textDecoration: "none",
                  fontWeight: locale === "en" ? 800 : 600,
                  color: "#111",
                  opacity: locale === "en" ? 1 : 0.6,
                }}
              >
                EN
              </a>
            </div>
          </div>

          {actionData?.message ? (
            <div
              style={{
                marginBottom: 16,
                padding: "14px 16px",
                borderRadius: 14,
                background: "#fff1f1",
                color: "#8b2222",
                border: "1px solid #f1caca",
                fontWeight: 600,
              }}
            >
              {actionData.message}
            </div>
          ) : null}

          <Form method="post">
            <div style={{ display: "grid", gap: 16 }}>
              <Field
                label={t.loginField}
                name="login"
                defaultValue={values.login}
                placeholder={t.loginPlaceholder}
              />

              <Field
                label={t.password}
                name="password"
                type="password"
                placeholder={t.passwordPlaceholder}
              />
            </div>

            <div style={{ marginTop: 20, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button type="submit" style={buttonStyles.primary} disabled={isSubmitting}>
                {isSubmitting ? t.signingIn : t.signInNow}
              </button>
            </div>
          </Form>

          <div style={{ marginTop: 16 }}>
            <a
              href={withLang("/forgot-password", locale)}
              style={{ color: "#5a5348", fontWeight: 700, textDecoration: "none" }}
            >
              {t.forgotPassword}
            </a>
          </div>

          <div style={{ marginTop: 18, color: "#5a5348" }}>
            {t.noAccountYet}{" "}
            <a
              href={withLang("/register", locale)}
              style={{ color: "#111", fontWeight: 700, textDecoration: "none" }}
            >
              {t.registerNow}
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder = "",
  defaultValue = "",
}) {
  return (
    <label style={inputStyles.wrap}>
      <span style={inputStyles.label}>{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        style={inputStyles.input}
      />
    </label>
  );
}