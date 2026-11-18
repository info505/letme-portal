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


      <div className="cost-shell">
        <section
          className={["cost-card", "lmb-ui-kostenstellen-1"].filter(Boolean).join(" ")}

        >
          <div className="cost-head">
            <div>
              <h2 className="cost-title">{t.addCostCenter}</h2>
              <p className="cost-text">{t.costCentersIntro}</p>
            </div>
          </div>

          {actionData?.error ? <div className="lmb-ui-kostenstellen-2">{actionData.error}</div> : null}
          {actionData?.success ? <div className="lmb-ui-kostenstellen-3">{actionData.success}</div> : null}

          <Form method="post">
            <input type="hidden" name="intent" value="create" />

            <div
              className="lmb-ui-kostenstellen-4"
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

            <div className="lmb-ui-kostenstellen-5">
              <label
                className="lmb-ui-kostenstellen-6"
              >
                <span className="lmb-ui-kostenstellen-7">{t.description}</span>

                <textarea
                  name="description"
                  placeholder={t.costCenterDescriptionPlaceholder}
                  rows={4}
                  className="lmb-ui-kostenstellen-8"
                />
              </label>
            </div>

            <label className="checkbox-row">
              <input type="checkbox" name="isActive" />
              {locale === "en"
                ? "Use as active cost center"
                : "Als aktive Kostenstelle verwenden"}
            </label>

            <div className="lmb-ui-kostenstellen-9">
              <button
                type="submit"
                className="lmb-ui-kostenstellen-10"
                disabled={isSubmitting}
              >
                {isSubmitting ? t.saving : t.addCostCenter}
              </button>
            </div>
          </Form>
        </section>

        <section
          className={["cost-card", "lmb-ui-kostenstellen-11"].filter(Boolean).join(" ")}

        >
          <div className="lmb-ui-kostenstellen-12">
            <h2 className="cost-title">{t.existingCostCenters}</h2>
            <p className="cost-text">{t.costCentersListText}</p>
          </div>

          {costCenters.length === 0 ? (
            <div
              className="lmb-ui-kostenstellen-13"
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
                        <div className="lmb-ui-kostenstellen-14">
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
                        <button type="submit" className="lmb-ui-kostenstellen-15">
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
                        className="lmb-ui-kostenstellen-16"
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
      className="lmb-ui-kostenstellen-17"
    >
      <span className="lmb-ui-kostenstellen-18">
        {label}
        {required ? " *" : ""}
      </span>

      <input
        name={name}
        placeholder={placeholder}
        required={required}
        className="lmb-ui-kostenstellen-19"
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