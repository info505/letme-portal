import { redirect } from "react-router";
import { getUserFromRequest } from "../lib/auth.server.js";
import { getLocaleFromRequest, dict, withLang } from "../lib/i18n.js";
import {
  layout,
  textStyles,
  cardStyles,
  buttonStyles,
  dropdownStyles,
} from "../lib/ui.js";

export async function loader({ request }) {
  const user = await getUserFromRequest(request);

  if (!user) {
    throw redirect("/login");
  }

  const locale = getLocaleFromRequest(request);
  return { user, locale };
}

export default function DashboardPage({ loaderData }) {
  const { user, locale } = loaderData;
  const t = dict[locale];

  return (
    <div style={layout.page}>
      <header style={layout.header}>
        <div style={layout.headerInner}>
          <a href="https://letmebowl-catering.de" style={textStyles.logo}>
            LET ME BOWL
          </a>

          <div style={dropdownStyles.wrap}>
            <details style={dropdownStyles.details}>
              <summary style={buttonStyles.menuTrigger}>
                {t.menu}
                <span style={{ fontSize: 12 }}>▾</span>
              </summary>

              <div style={dropdownStyles.menu}>
                <a href={withLang("/dashboard", locale)} style={dropdownStyles.active}>
                  {t.account}
                </a>

                <a href={withLang("/rechnungen", locale)} style={dropdownStyles.link}>
                  {t.invoices}
                </a>

                <a href={withLang("/adressen", locale)} style={dropdownStyles.link}>
                  {t.addresses}
                </a>

                <a href="https://letmebowl-catering.de" style={dropdownStyles.link}>
                  {t.homepage}
                </a>

                <a href="https://letmebowl-catering.de" style={dropdownStyles.link}>
                  {t.orderNow}
                </a>

                <a href={withLang("/logout", locale)} style={buttonStyles.logout}>
                  {t.logout}
                </a>
              </div>
            </details>
          </div>
        </div>
      </header>

      <main style={layout.mainWrap}>
        <div style={layout.shellCard}>
          <div style={textStyles.eyebrow}>{t.brand}</div>
          <h1 style={textStyles.headline}>
            {t.welcome}, {user.firstName}
          </h1>
          <p style={textStyles.subline}>{t.accountText}</p>

          <div style={layout.grid}>
            <div style={cardStyles.info}>
              <h3 style={textStyles.cardTitle}>{t.company}</h3>
              <p style={textStyles.body}>{user.companyName}</p>
            </div>

            <div style={cardStyles.info}>
              <h3 style={textStyles.cardTitle}>{t.username}</h3>
              <p style={textStyles.body}>{user.username}</p>
            </div>

            <div style={cardStyles.info}>
              <h3 style={textStyles.cardTitle}>{t.email}</h3>
              <p style={textStyles.body}>{user.email}</p>
            </div>

            <div style={cardStyles.info}>
              <h3 style={textStyles.cardTitle}>{t.phone}</h3>
              <p style={textStyles.body}>{user.phone || "—"}</p>
            </div>
          </div>

          <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a href={withLang("/adressen", locale)} style={buttonStyles.secondary}>
              {t.addresses}
            </a>

            <a href={withLang("/rechnungen", locale)} style={buttonStyles.secondary}>
              {t.invoices}
            </a>

            <a href="https://letmebowl-catering.de" style={buttonStyles.primary}>
              {t.orderNow}
            </a>

            <a
              href={withLang(`/dashboard`, locale === "de" ? "en" : "de")}
              style={buttonStyles.secondary}
            >
              {locale === "de" ? t.english : t.german}
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}