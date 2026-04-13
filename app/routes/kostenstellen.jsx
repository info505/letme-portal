import { redirect, useActionData, useLoaderData, useNavigation } from "react-router";
import { getUserFromRequest } from "../lib/auth.server.js";
import { getLocaleFromRequest, dict } from "../lib/i18n.js";
import { prisma } from "../lib/db.server.js";
import { card, button, colors } from "../lib/ui.js";
import PortalLayout from "../components/PortalLayout.jsx";

export async function loader({ request }) {
  const locale = getLocaleFromRequest(request);
  const user = await getUserFromRequest(request);

  if (!user) {
    throw redirect(`/login?lang=${locale}`);
  }

  const costCenters = await prisma.costCenter.findMany({
    where: { userId: user.id },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  });

  return { user, locale, costCenters };
}

export async function action({ request }) {
  const locale = getLocaleFromRequest(request);
  const user = await getUserFromRequest(request);

  if (!user) {
    throw redirect(`/login?lang=${locale}`);
  }

  const t = dict[locale] || dict.de;
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");

  if (intent === "create") {
    const name = String(formData.get("name") || "").trim();
    const code = String(formData.get("code") || "").trim();
    const description = String(formData.get("description") || "").trim();

    if (!name) {
      return {
        error: t.costCenterNameRequired,
      };
    }

    await prisma.costCenter.create({
      data: {
        userId: user.id,
        name,
        code: code || null,
        description: description || null,
      },
    });

    return {
      success: t.costCenterCreated,
    };
  }

  if (intent === "delete") {
    const id = String(formData.get("id") || "");

    if (!id) {
      return {
        error: t.generalError,
      };
    }

    const existing = await prisma.costCenter.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existing) {
      return {
        error: t.generalError,
      };
    }

    await prisma.costCenter.delete({
      where: { id },
    });

    return {
      success: t.costCenterDeleted,
    };
  }

  return {
    error: t.generalError,
  };
}

export default function KostenstellenPage() {
  const { user, locale, costCenters } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const t = dict[locale] || dict.de;

  const isSubmitting = navigation.state === "submitting";

  return (
    <PortalLayout
      title={t.costCentersTitle}
      subtitle={t.costCentersText}
    >
      <div style={{ display: "grid", gap: "18px" }}>
        <section
          style={{
            ...card.base,
            padding: "28px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "20px",
              flexWrap: "wrap",
              marginBottom: "22px",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "22px",
                  color: colors.text,
                }}
              >
                {t.addCostCenter}
              </h2>

              <p
                style={{
                  margin: "8px 0 0",
                  color: colors.muted,
                  fontSize: "14px",
                  lineHeight: 1.6,
                  maxWidth: "720px",
                }}
              >
                {t.costCentersIntro}
              </p>
            </div>
          </div>

          {actionData?.error ? (
            <div style={messageError}>
              {actionData.error}
            </div>
          ) : null}

          {actionData?.success ? (
            <div style={messageSuccess}>
              {actionData.success}
            </div>
          ) : null}

          <form method="post">
            <input type="hidden" name="intent" value="create" />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "14px",
              }}
            >
              <Field
                label={t.costCenterName}
                name="name"
                placeholder={t.costCenterNamePlaceholder}
                required
              />

              <Field
                label={t.costCenterCode}
                name="code"
                placeholder={t.costCenterCodePlaceholder}
              />
            </div>

            <div style={{ marginTop: "14px" }}>
              <label
                style={{
                  display: "grid",
                  gap: "8px",
                }}
              >
                <span style={labelStyle}>{t.description}</span>

                <textarea
                  name="description"
                  placeholder={t.costCenterDescriptionPlaceholder}
                  rows={4}
                  style={textareaStyle}
                />
              </label>
            </div>

            <div style={{ marginTop: "18px" }}>
              <button
                type="submit"
                style={button.primary}
                disabled={isSubmitting}
              >
                {isSubmitting ? t.saving : t.addCostCenter}
              </button>
            </div>
          </form>
        </section>

        <section
          style={{
            ...card.base,
            padding: "28px",
          }}
        >
          <div style={{ marginBottom: "20px" }}>
            <h2
              style={{
                margin: 0,
                fontSize: "22px",
                color: colors.text,
              }}
            >
              {t.existingCostCenters}
            </h2>

            <p
              style={{
                margin: "8px 0 0",
                color: colors.muted,
                fontSize: "14px",
                lineHeight: 1.6,
              }}
            >
              {t.costCentersListText}
            </p>
          </div>

          {costCenters.length === 0 ? (
            <div
              style={{
                border: `1px solid ${colors.border}`,
                borderRadius: "18px",
                padding: "18px",
                background: "#fff",
                color: colors.muted,
                fontSize: "15px",
              }}
            >
              {t.noCostCenters}
            </div>
          ) : (
            <div style={{ display: "grid", gap: "14px" }}>
              {costCenters.map((item) => (
                <div
                  key={item.id}
                  style={{
                    border: `1px solid ${colors.border}`,
                    borderRadius: "18px",
                    padding: "18px",
                    background: "#fff",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "18px",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ minWidth: 0, flex: "1 1 320px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        flexWrap: "wrap",
                        marginBottom: "8px",
                      }}
                    >
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "18px",
                          color: colors.text,
                        }}
                      >
                        {item.name}
                      </h3>

                      {item.code ? (
                        <span style={badgeStyle}>
                          {t.costCenterCode}: {item.code}
                        </span>
                      ) : null}
                    </div>

                    {item.description ? (
                      <p
                        style={{
                          margin: "0 0 10px",
                          color: colors.muted,
                          fontSize: "14px",
                          lineHeight: 1.6,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {item.description}
                      </p>
                    ) : null}

                    <div
                      style={{
                        color: colors.muted,
                        fontSize: "13px",
                      }}
                    >
                      {t.createdAtLabel}: {formatDate(item.createdAt, locale)}
                    </div>
                  </div>

                  <form method="post">
                    <input type="hidden" name="intent" value="delete" />
                    <input type="hidden" name="id" value={item.id} />

                    <button
                      type="submit"
                      style={dangerButton}
                      onClick={(event) => {
                        const ok = window.confirm(t.confirmDeleteCostCenter);
                        if (!ok) {
                          event.preventDefault();
                        }
                      }}
                    >
                      {t.delete}
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </PortalLayout>
  );
}

function Field({ label, name, placeholder, required = false }) {
  return (
    <label
      style={{
        display: "grid",
        gap: "8px",
      }}
    >
      <span style={labelStyle}>
        {label}
        {required ? " *" : ""}
      </span>

      <input
        name={name}
        placeholder={placeholder}
        required={required}
        style={inputStyle}
      />
    </label>
  );
}

function formatDate(value, locale) {
  try {
    return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

const labelStyle = {
  fontSize: "13px",
  fontWeight: 800,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: colors.muted,
};

const inputStyle = {
  width: "100%",
  border: `1px solid ${colors.border}`,
  borderRadius: "14px",
  padding: "14px 14px",
  fontSize: "15px",
  color: colors.text,
  background: "#fff",
  outline: "none",
  boxSizing: "border-box",
};

const textareaStyle = {
  width: "100%",
  border: `1px solid ${colors.border}`,
  borderRadius: "14px",
  padding: "14px 14px",
  fontSize: "15px",
  color: colors.text,
  background: "#fff",
  outline: "none",
  boxSizing: "border-box",
  resize: "vertical",
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

const badgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: "999px",
  background: "#f6f1e8",
  border: "1px solid #eadfc8",
  fontSize: "12px",
  fontWeight: 700,
  color: "#8d6a2f",
};

const messageSuccess = {
  marginBottom: "16px",
  padding: "12px 14px",
  borderRadius: "14px",
  background: "#eef7f0",
  border: "1px solid #cfe7d4",
  color: "#235c2f",
  fontWeight: 600,
  fontSize: "14px",
};

const messageError = {
  marginBottom: "16px",
  padding: "12px 14px",
  borderRadius: "14px",
  background: "#fff3f3",
  border: "1px solid #f0d2d2",
  color: "#8b2222",
  fontWeight: 600,
  fontSize: "14px",
};

const dangerButton = {
  ...button.secondary,
  color: "#8b2222",
  border: "1px solid #efd3d3",
  background: "#fff",
};