import {
  Form,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
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
    const isActive = String(formData.get("isActive") || "") === "on";

    if (!name) {
      return {
        error: t.costCenterNameRequired,
      };
    }

    if (isActive) {
      await prisma.costCenter.updateMany({
        where: {
          userId: user.id,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });
    }

    await prisma.costCenter.create({
      data: {
        userId: user.id,
        name,
        code: code || null,
        description: description || null,
        isActive,
      },
    });

    return {
      success: t.costCenterCreated,
    };
  }

  if (intent === "setActive") {
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

    await prisma.costCenter.updateMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    await prisma.costCenter.update({
      where: { id },
      data: {
        isActive: true,
      },
    });

    return {
      success:
        locale === "en"
          ? "Active cost center has been updated."
          : "Aktive Kostenstelle wurde aktualisiert.",
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
  const { locale, costCenters } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const t = dict[locale] || dict.de;

  const isSubmitting = navigation.state === "submitting";

  return (
    <PortalLayout title={t.costCentersTitle} subtitle={t.costCentersText}>
      <style>{`
        .cost-shell {
          display: grid;
          gap: 18px;
          max-width: 1080px;
        }

        .cost-card {
          padding: 28px;
          border-radius: 24px;
        }

        .cost-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
          margin-bottom: 22px;
        }

        .cost-title {
          margin: 0;
          font-size: 24px;
          color: ${colors.text};
          letter-spacing: -0.02em;
        }

        .cost-text {
          margin: 8px 0 0;
          color: ${colors.muted};
          font-size: 15px;
          line-height: 1.7;
          max-width: 760px;
        }

        .cost-list {
          display: grid;
          gap: 14px;
        }

        .cost-item {
          position: relative;
          border: 1px solid ${colors.border};
          border-radius: 22px;
          padding: 18px;
          background: #fff;
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        }

        .cost-item:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 36px rgba(24,24,24,0.05);
          border-color: #d8c49a;
        }

        .cost-item.active {
          background: linear-gradient(180deg, #fffdf8 0%, #fcf8ef 100%);
          border-color: #d8b46a;
          box-shadow: 0 18px 42px rgba(200,169,106,0.12);
        }

        .cost-item-top {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          align-items: flex-start;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }

        .cost-item-title {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 8px;
        }

        .cost-name {
          margin: 0;
          font-size: 19px;
          color: ${colors.text};
        }

        .cost-badge {
          display: inline-flex;
          align-items: center;
          padding: 6px 10px;
          border-radius: 999px;
          background: #f6f1e8;
          border: 1px solid #eadfc8;
          font-size: 12px;
          font-weight: 700;
          color: #8d6a2f;
        }

        .cost-active-badge {
          display: inline-flex;
          align-items: center;
          padding: 6px 10px;
          border-radius: 999px;
          background: #f2eadb;
          color: #8d6a2f;
          font-size: 12px;
          font-weight: 800;
        }

        .cost-meta {
          color: ${colors.muted};
          font-size: 13px;
          line-height: 1.6;
        }

        .cost-desc {
          margin: 0 0 10px;
          color: ${colors.muted};
          font-size: 14px;
          line-height: 1.7;
          white-space: pre-wrap;
        }

        .cost-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 14px;
          padding-top: 14px;
          border-top: 1px solid rgba(0,0,0,0.06);
        }

        .cost-select-form {
          margin: 0;
        }

        .cost-select-button {
          width: 100%;
          border: none;
          background: transparent;
          padding: 0;
          margin: 0;
          text-align: left;
          cursor: pointer;
          font: inherit;
        }

        .cost-hint {
          margin-top: 10px;
          color: ${colors.muted};
          font-size: 13px;
          line-height: 1.6;
        }

        .checkbox-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 16px;
          color: ${colors.text};
          font-weight: 600;
          font-size: 14px;
        }

        @media (max-width: 700px) {
          .cost-card {
            padding: 20px 16px;
            border-radius: 18px;
          }

          .cost-title {
            font-size: 22px;
          }

          .cost-item {
            padding: 16px;
            border-radius: 18px;
          }
        }
      `}</style>

      <div className="cost-shell">
        <section
          className="cost-card"
          style={{
            ...card.base,
          }}
        >
          <div className="cost-head">
            <div>
              <h2 className="cost-title">{t.addCostCenter}</h2>
              <p className="cost-text">{t.costCentersIntro}</p>
            </div>
          </div>

          {actionData?.error ? <div style={messageError}>{actionData.error}</div> : null}
          {actionData?.success ? <div style={messageSuccess}>{actionData.success}</div> : null}

          <Form method="post">
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

            <label className="checkbox-row">
              <input type="checkbox" name="isActive" />
              {locale === "en"
                ? "Use as active cost center"
                : "Als aktive Kostenstelle verwenden"}
            </label>

            <div style={{ marginTop: "18px" }}>
              <button
                type="submit"
                style={{
                  ...button.primary,
                  background: "linear-gradient(135deg, #c8a96a, #b8934f)",
                }}
                disabled={isSubmitting}
              >
                {isSubmitting ? t.saving : t.addCostCenter}
              </button>
            </div>
          </Form>
        </section>

        <section
          className="cost-card"
          style={{
            ...card.base,
          }}
        >
          <div style={{ marginBottom: "20px" }}>
            <h2 className="cost-title">{t.existingCostCenters}</h2>
            <p className="cost-text">{t.costCentersListText}</p>
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
            <div className="cost-list">
              {costCenters.map((item) => (
                <div
                  key={item.id}
                  className={`cost-item ${item.isActive ? "active" : ""}`}
                >
                  <Form method="post" className="cost-select-form">
                    <input type="hidden" name="intent" value="setActive" />
                    <input type="hidden" name="id" value={item.id} />

                    <button type="submit" className="cost-select-button">
                      <div className="cost-item-top">
                        <div style={{ minWidth: 0, flex: "1 1 320px" }}>
                          <div className="cost-item-title">
                            <h3 className="cost-name">{item.name}</h3>

                            {item.code ? (
                              <span className="cost-badge">
                                {t.costCenterCode}: {item.code}
                              </span>
                            ) : null}

                            {item.isActive ? (
                              <span className="cost-active-badge">
                                {locale === "en"
                                  ? "Active cost center"
                                  : "Aktive Kostenstelle"}
                              </span>
                            ) : null}
                          </div>

                          {item.description ? (
                            <p className="cost-desc">{item.description}</p>
                          ) : null}

                          <div className="cost-meta">
                            {t.createdAtLabel}: {formatDate(item.createdAt, locale)}
                          </div>

                          <div className="cost-hint">
                            {item.isActive
                              ? locale === "en"
                                ? "This cost center is currently used for future orders."
                                : "Diese Kostenstelle wird aktuell für künftige Bestellungen verwendet."
                              : locale === "en"
                              ? "Click to use this cost center for future orders."
                              : "Klicke, um diese Kostenstelle für künftige Bestellungen zu verwenden."}
                          </div>
                        </div>
                      </div>
                    </button>
                  </Form>

                  <div className="cost-actions">
                    {!item.isActive ? (
                      <Form method="post">
                        <input type="hidden" name="intent" value="setActive" />
                        <input type="hidden" name="id" value={item.id} />
                        <button type="submit" style={button.secondary}>
                          {locale === "en"
                            ? "Use this cost center"
                            : "Diese Kostenstelle nutzen"}
                        </button>
                      </Form>
                    ) : null}

                    <Form method="post">
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
                    </Form>
                  </div>
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