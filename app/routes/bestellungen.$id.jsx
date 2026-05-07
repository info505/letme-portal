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
import PortalLayout from "../components/PortalLayout.jsx";

const ui = {
  bg: "#f7f4ee",
  card: "#ffffff",
  soft: "#fbf8f2",
  text: "#171717",
  muted: "#756b5f",
  line: "#e8decd",
  gold: "#c8a96a",
  goldDark: "#a9823c",
  green: "#2f6a4a",
  red: "#8b2222",
  blue: "#285ea8",
  orange: "#8a5a00",
};

export async function loader({ request, params }) {
  const locale = getLocaleFromRequest(request);
  const sessionUser = await getUserFromRequest(request);

  if (!sessionUser) {
    throw redirect(`/login?lang=${locale}`);
  }

  const orderId = String(params.id || "");

  if (!orderId) {
    throw redirect(`/bestellungen?lang=${locale}`);
  }

  const orderRaw = await prisma.portalOrder.findFirst({
    where: {
      id: orderId,
      userId: sessionUser.id,
    },
    include: {
      items: true,
      costCenter: true,
      deliveryAddress: true,
      location: true,
      contact: true,
    },
  });

  if (!orderRaw) {
    throw redirect(`/bestellungen?lang=${locale}`);
  }

  const order = serializeOrder(orderRaw);

  return { user: sessionUser, locale, order };
}

export async function action({ request, params }) {
  const locale = getLocaleFromRequest(request);
  const user = await getUserFromRequest(request);

  if (!user) {
    throw redirect(`/login?lang=${locale}`);
  }

  const orderId = String(params.id || "");

  if (!orderId) {
    throw redirect(`/bestellungen?lang=${locale}`);
  }

  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");

  if (intent !== "cancel") {
    return {
      ok: false,
      message: locale === "de" ? "Ungültige Aktion." : "Invalid action.",
    };
  }

  const existingOrder = await prisma.portalOrder.findFirst({
    where: {
      id: orderId,
      userId: user.id,
    },
  });

  if (!existingOrder) {
    throw redirect(`/bestellungen?lang=${locale}`);
  }

  if (existingOrder.status === "CANCELLED") {
    return {
      ok: false,
      message:
        locale === "de"
          ? "Diese Bestellung wurde bereits storniert."
          : "This order has already been cancelled.",
    };
  }

  if (existingOrder.status === "DELIVERED") {
    return {
      ok: false,
      message:
        locale === "de"
          ? "Gelieferte Bestellungen können nicht mehr storniert werden."
          : "Delivered orders can no longer be cancelled.",
    };
  }

  await prisma.portalOrder.update({
    where: { id: existingOrder.id },
    data: {
      status: "CANCELLED",
    },
  });

  return {
    ok: true,
    message:
      locale === "de"
        ? "Die Bestellung wurde storniert."
        : "The order has been cancelled.",
  };
}

export default function BestellungDetailPage() {
  const { locale, order } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const t = dict[locale] || dict.de;

  const statusLabel = getStatusLabel(order.status, locale);
  const statusStyle = getStatusStyle(order.status);

  const reorderableItems = (order.items || []).filter(
    (item) => item.shopifyVariantId && Number(item.quantity || 0) > 0
  );

  const hasReorderableItems = reorderableItems.length > 0;
  const reorderUrl = hasReorderableItems
    ? buildShopifyCartPermalink(reorderableItems)
    : null;

  const canCancel =
    order.status !== "CANCELLED" && order.status !== "DELIVERED";

  const isCancelling =
    navigation.state === "submitting" &&
    navigation.formData?.get("intent") === "cancel";

  const contactName = order.contact
    ? [order.contact.firstName, order.contact.lastName].filter(Boolean).join(" ")
    : order.billingContactName || "—";

  const deliveryAddressText = order.deliveryAddress
    ? [
        order.deliveryAddress.label,
        order.deliveryAddress.companyName,
        order.deliveryAddress.contactName,
        [order.deliveryAddress.street, order.deliveryAddress.houseNumber]
          .filter(Boolean)
          .join(" "),
        [order.deliveryAddress.postalCode, order.deliveryAddress.city]
          .filter(Boolean)
          .join(" "),
        order.deliveryAddress.country,
      ]
        .filter(Boolean)
        .join("\n")
    : order.orderType?.toLowerCase().includes("abhol")
    ? locale === "de"
      ? "Abholung im Geschäft"
      : "Pickup at store"
    : "—";

  const orderDate = order.orderedAt || order.createdAt;

  return (
    <PortalLayout
      title={`${t.orderNumber || (locale === "de" ? "Bestellung" : "Order")} ${
        order.orderNumber
      }`}
      subtitle={
        locale === "de"
          ? "Alle wichtigen Informationen zu dieser Bestellung auf einen Blick."
          : "All important information for this order at a glance."
      }
    >
      <style>{`
        .orderDetailPage {
          width: 100%;
          max-width: 1280px;
          display: grid;
          gap: 22px;
        }

        .orderHero {
          position: relative;
          overflow: hidden;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 24px;
          align-items: start;
          padding: 30px;
          border-radius: 30px;
          background:
            radial-gradient(circle at top right, rgba(200,169,106,0.22), transparent 36%),
            linear-gradient(135deg, #fffdf8 0%, #f6efe2 100%);
          border: 1px solid ${ui.line};
          box-shadow: 0 24px 60px rgba(30,20,10,0.07);
        }

        .orderHero::after {
          content: "";
          position: absolute;
          right: -70px;
          bottom: -90px;
          width: 230px;
          height: 230px;
          border-radius: 999px;
          background: rgba(200,169,106,0.12);
          pointer-events: none;
        }

        .orderHeroInner {
          position: relative;
          z-index: 2;
          min-width: 0;
        }

        .orderKicker {
          display: inline-flex;
          width: fit-content;
          min-height: 30px;
          padding: 0 12px;
          border-radius: 999px;
          align-items: center;
          justify-content: center;
          background: rgba(47,106,74,0.08);
          border: 1px solid rgba(47,106,74,0.18);
          color: ${ui.green};
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 14px;
        }

        .orderHeroTitle {
          margin: 0;
          color: ${ui.text};
          font-size: clamp(30px, 4.5vw, 54px);
          line-height: 1.02;
          letter-spacing: -0.055em;
          font-weight: 950;
          word-break: break-word;
        }

        .orderHeroText {
          margin: 14px 0 0;
          max-width: 800px;
          color: ${ui.muted};
          font-size: 15px;
          line-height: 1.75;
          font-weight: 650;
        }

        .orderHeroActions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 22px;
        }

        .orderHeroRight {
          position: relative;
          z-index: 2;
          display: grid;
          gap: 12px;
          justify-items: end;
          min-width: 220px;
        }

        .orderStatusBadge {
          min-height: 40px;
          padding: 0 14px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 950;
          white-space: nowrap;
        }

        .orderTotalBox {
          width: 100%;
          padding: 18px;
          border-radius: 22px;
          background: rgba(255,255,255,0.72);
          border: 1px solid ${ui.line};
          text-align: right;
        }

        .orderTotalLabel {
          color: ${ui.muted};
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 7px;
        }

        .orderTotalValue {
          color: ${ui.text};
          font-size: 30px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -0.045em;
        }

        .orderBtnPrimary,
        .orderBtnSecondary,
        .orderBtnDanger,
        .orderBtnDisabled {
          min-height: 52px;
          padding: 0 20px;
          border-radius: 999px;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 950;
          white-space: nowrap;
          cursor: pointer;
          border: 0;
          font-family: inherit;
        }

        .orderBtnPrimary {
          border: 1px solid rgba(169,130,60,0.24);
          background: linear-gradient(135deg, ${ui.gold}, ${ui.goldDark});
          color: #fff;
          box-shadow: 0 14px 30px rgba(200,169,106,0.24);
        }

        .orderBtnSecondary {
          border: 1px solid ${ui.line};
          background: #fff;
          color: ${ui.text};
        }

        .orderBtnDanger {
          width: 100%;
          border: 1px solid #efcaca;
          background: #fff8f8;
          color: ${ui.red};
        }

        .orderBtnDisabled {
          background: #c9c1b0;
          color: #fff;
          cursor: not-allowed;
          opacity: 0.85;
        }

        .noticeBox {
          padding: 15px 16px;
          border-radius: 18px;
          font-size: 14px;
          line-height: 1.6;
          font-weight: 850;
        }

        .noticeBox.isOk {
          background: #edf7ee;
          color: #1f6b36;
          border: 1px solid #cfe8d4;
        }

        .noticeBox.isError {
          background: #fff1f1;
          color: #8b2222;
          border: 1px solid #efcaca;
        }

        .quickStats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .quickStat {
          padding: 18px;
          border-radius: 24px;
          background: #fff;
          border: 1px solid ${ui.line};
          box-shadow: 0 12px 34px rgba(30,20,10,0.04);
        }

        .quickStatLabel {
          color: ${ui.muted};
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .quickStatValue {
          color: ${ui.text};
          font-size: 16px;
          line-height: 1.45;
          font-weight: 850;
          word-break: break-word;
        }

        .orderMainGrid {
          display: grid;
          grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.65fr);
          gap: 18px;
          align-items: start;
        }

        .panel {
          padding: 24px;
          border-radius: 28px;
          background: #fff;
          border: 1px solid ${ui.line};
          box-shadow: 0 14px 40px rgba(30,20,10,0.045);
        }

        .panelTitle {
          margin: 0 0 18px;
          color: ${ui.text};
          font-size: 25px;
          line-height: 1.1;
          letter-spacing: -0.04em;
          font-weight: 950;
        }

        .detailGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .detailBox {
          border: 1px solid ${ui.line};
          border-radius: 20px;
          padding: 16px;
          background: ${ui.soft};
        }

        .detailBox.isWide {
          grid-column: 1 / -1;
        }

        .detailLabel {
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: ${ui.muted};
          margin-bottom: 8px;
        }

        .detailValue {
          font-size: 14px;
          font-weight: 800;
          color: ${ui.text};
          line-height: 1.55;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .itemsList {
          display: grid;
          gap: 12px;
        }

        .itemCard {
          border: 1px solid ${ui.line};
          border-radius: 22px;
          padding: 18px;
          background:
            radial-gradient(circle at top right, rgba(200,169,106,0.07), transparent 34%),
            #fff;
        }

        .itemHead {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 16px;
          align-items: start;
        }

        .itemTitle {
          color: ${ui.text};
          font-size: 17px;
          line-height: 1.35;
          font-weight: 950;
          word-break: break-word;
        }

        .itemMeta {
          margin-top: 6px;
          color: ${ui.muted};
          font-size: 13px;
          line-height: 1.55;
          font-weight: 650;
        }

        .itemPriceBox {
          min-width: 130px;
          text-align: right;
        }

        .itemUnit {
          color: ${ui.muted};
          font-size: 12px;
          line-height: 1.4;
          font-weight: 750;
          margin-bottom: 5px;
        }

        .itemTotal {
          color: ${ui.text};
          font-size: 18px;
          line-height: 1.1;
          font-weight: 950;
          white-space: nowrap;
        }

        .badgeRow {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }

        .smallBadge {
          display: inline-flex;
          align-items: center;
          min-height: 28px;
          padding: 0 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
        }

        .smallBadge.ok {
          background: #edf7ee;
          color: #1f6b36;
          border: 1px solid #cfe8d4;
        }

        .smallBadge.muted {
          background: #f3f3f3;
          color: #666;
          border: 1px solid #dfdfdf;
        }

        .sidePanel {
          position: sticky;
          top: 22px;
          display: grid;
          gap: 18px;
        }

        .actionPanel {
          padding: 24px;
          border-radius: 28px;
          background:
            radial-gradient(circle at top right, rgba(200,169,106,0.18), transparent 34%),
            linear-gradient(180deg, #f8f1e5 0%, #efe5d3 100%);
          border: 1px solid #ece2d0;
          box-shadow: 0 14px 40px rgba(30,20,10,0.05);
        }

        .actionTitle {
          margin: 0;
          color: ${ui.text};
          font-size: 24px;
          line-height: 1.1;
          letter-spacing: -0.04em;
          font-weight: 950;
        }

        .actionText {
          margin: 10px 0 18px;
          color: ${ui.muted};
          font-size: 13px;
          line-height: 1.7;
          font-weight: 650;
        }

        .actionStack {
          display: grid;
          gap: 10px;
        }

        .summaryRows {
          display: grid;
          border-top: 1px solid ${ui.line};
        }

        .summaryRow {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 12px;
          align-items: center;
          padding: 14px 0;
          border-bottom: 1px solid ${ui.line};
        }

        .summaryRow span {
          color: ${ui.muted};
          font-size: 13px;
          font-weight: 750;
        }

        .summaryRow strong {
          color: ${ui.text};
          font-size: 14px;
          font-weight: 950;
          text-align: right;
        }

        .summaryRow.total strong {
          font-size: 22px;
          letter-spacing: -0.035em;
        }

        .emptyBox {
          border: 1px dashed ${ui.line};
          border-radius: 22px;
          padding: 22px;
          background: #fff;
          color: ${ui.muted};
          font-size: 15px;
          line-height: 1.65;
          font-weight: 650;
        }

        @media (max-width: 1180px) {
          .orderHero,
          .orderMainGrid {
            grid-template-columns: 1fr;
          }

          .orderHeroRight {
            justify-items: start;
            min-width: 0;
          }

          .orderTotalBox {
            text-align: left;
          }

          .sidePanel {
            position: static;
          }

          .quickStats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 720px) {
          .orderDetailPage {
            gap: 16px;
          }

          .orderHero,
          .panel,
          .actionPanel {
            border-radius: 22px;
            padding: 18px;
          }

          .quickStats,
          .detailGrid {
            grid-template-columns: 1fr;
          }

          .detailBox.isWide {
            grid-column: auto;
          }

          .itemHead {
            grid-template-columns: 1fr;
          }

          .itemPriceBox {
            min-width: 0;
            text-align: left;
          }

          .itemTotal {
            white-space: normal;
          }

          .orderHeroActions,
          .actionStack {
            display: grid;
            width: 100%;
          }

          .orderBtnPrimary,
          .orderBtnSecondary,
          .orderBtnDanger,
          .orderBtnDisabled {
            width: 100%;
          }

          .summaryRow {
            grid-template-columns: 1fr;
            gap: 4px;
          }

          .summaryRow strong {
            text-align: left;
          }
        }
      `}</style>

      <div className="orderDetailPage">
        {actionData?.message ? (
          <div className={`noticeBox ${actionData.ok ? "isOk" : "isError"}`}>
            {actionData.message}
          </div>
        ) : null}

        <section className="orderHero">
          <div className="orderHeroInner">
            <div className="orderKicker">
              {locale === "de" ? "Bestelldetail" : "Order detail"}
            </div>

            <h1 className="orderHeroTitle">{order.orderNumber}</h1>

            <p className="orderHeroText">
              {locale === "de"
                ? "Hier findest du Status, Positionen, Betrag, Kontaktinformationen und alle zugeordneten Bestelldaten."
                : "Here you can find status, items, amount, contact information and all linked order data."}
            </p>

            <div className="orderHeroActions">
              <a href={withLang("/bestellungen", locale)} className="orderBtnSecondary">
                {locale === "de" ? "Zurück zu Bestellungen" : "Back to orders"}
              </a>

              {hasReorderableItems ? (
                <a href={reorderUrl} className="orderBtnPrimary">
                  {locale === "de" ? "Erneut bestellen" : "Reorder"}
                </a>
              ) : null}
            </div>
          </div>

          <div className="orderHeroRight">
            <span className="orderStatusBadge" style={statusStyle}>
              {statusLabel}
            </span>

            <div className="orderTotalBox">
              <div className="orderTotalLabel">
                {locale === "de" ? "Gesamtbetrag" : "Total amount"}
              </div>
              <div className="orderTotalValue">
                {formatMoney(order.totalAmount, order.currency || "EUR", locale)}
              </div>
            </div>
          </div>
        </section>

        <section className="quickStats">
          <QuickStat
            label={locale === "de" ? "Bestellt am" : "Ordered on"}
            value={formatDate(orderDate, locale)}
          />
          <QuickStat
            label={locale === "de" ? "Lieferdatum" : "Delivery date"}
            value={order.deliveryDate ? formatDate(order.deliveryDate, locale) : "—"}
          />
          <QuickStat
            label={locale === "de" ? "Bestellart" : "Order type"}
            value={order.orderType || "—"}
          />
          <QuickStat
            label={locale === "de" ? "Positionen" : "Items"}
            value={String(order.items?.length || 0)}
          />
        </section>

        <div className="orderMainGrid">
          <div style={{ display: "grid", gap: "18px" }}>
            <section className="panel">
              <h2 className="panelTitle">
                {locale === "de" ? "Bestellinformationen" : "Order information"}
              </h2>

              <div className="detailGrid">
                <DetailBox
                  label={locale === "de" ? "Bestellnummer" : "Order number"}
                  value={order.orderNumber}
                />
                <DetailBox
                  label={locale === "de" ? "Status" : "Status"}
                  value={statusLabel}
                />
                <DetailBox
                  label={locale === "de" ? "Kostenstelle" : "Cost center"}
                  value={
                    order.costCenter
                      ? `${order.costCenter.name}${
                          order.costCenter.code ? ` · ${order.costCenter.code}` : ""
                        }`
                      : "—"
                  }
                />
                <DetailBox
                  label={locale === "de" ? "Referenz" : "Reference"}
                  value={order.referenceNumber || "—"}
                />
                <DetailBox
                  wide
                  label={locale === "de" ? "Hinweise" : "Notes"}
                  value={order.notes || "—"}
                />
              </div>
            </section>

            <section className="panel">
              <h2 className="panelTitle">
                {locale === "de" ? "Kontakt & Lieferung" : "Contact & delivery"}
              </h2>

              <div className="detailGrid">
                <DetailBox
                  label={locale === "de" ? "Kontakt" : "Contact"}
                  value={contactName}
                />
                <DetailBox
                  label={locale === "de" ? "E-Mail" : "Email"}
                  value={order.billingEmail || "—"}
                />
                <DetailBox
                  label={locale === "de" ? "Telefon" : "Phone"}
                  value={order.billingPhone || "—"}
                />
                <DetailBox
                  label={locale === "de" ? "Rechnungsfirma" : "Billing company"}
                  value={order.billingCompanyName || "—"}
                />
                <DetailBox
                  label={locale === "de" ? "Standort" : "Location"}
                  value={order.location?.name || "—"}
                />
                <DetailBox
                  wide
                  label={locale === "de" ? "Lieferadresse" : "Delivery address"}
                  value={deliveryAddressText}
                />
              </div>
            </section>

            <section className="panel">
              <h2 className="panelTitle">
                {locale === "de" ? "Positionen" : "Items"}
              </h2>

              {order.items?.length ? (
                <div className="itemsList">
                  {order.items.map((item) => {
                    const isReorderable = Boolean(item.shopifyVariantId);

                    return (
                      <div key={item.id} className="itemCard">
                        <div className="itemHead">
                          <div>
                            <div className="itemTitle">{item.title}</div>

                            <div className="itemMeta">
                              {locale === "de" ? "Menge" : "Quantity"}:{" "}
                              {item.quantity}
                              {item.unit ? ` ${item.unit}` : ""}
                            </div>

                            {item.variantTitle ? (
                              <div className="itemMeta">
                                {locale === "de" ? "Variante" : "Variant"}:{" "}
                                {item.variantTitle}
                              </div>
                            ) : null}

                            {item.notes ? (
                              <div
                                className="itemMeta"
                                style={{ whiteSpace: "pre-wrap" }}
                              >
                                {item.notes}
                              </div>
                            ) : null}

                            <div className="badgeRow">
                              {isReorderable ? (
                                <span className="smallBadge ok">
                                  {locale === "de"
                                    ? "Für Reorder verfügbar"
                                    : "Available for reorder"}
                                </span>
                              ) : (
                                <span className="smallBadge muted">
                                  {locale === "de"
                                    ? "Nicht für Reorder verfügbar"
                                    : "Not available for reorder"}
                                </span>
                              )}

                              {item.sku ? (
                                <span className="smallBadge muted">
                                  SKU: {item.sku}
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <div className="itemPriceBox">
                            {item.unitPrice != null ? (
                              <div className="itemUnit">
                                {formatMoney(
                                  item.unitPrice,
                                  order.currency || "EUR",
                                  locale
                                )}
                              </div>
                            ) : null}

                            <div className="itemTotal">
                              {formatMoney(
                                item.totalPrice || 0,
                                order.currency || "EUR",
                                locale
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="emptyBox">
                  {locale === "de"
                    ? "Für diese Bestellung sind aktuell keine Positionen hinterlegt."
                    : "There are currently no items stored for this order."}
                </div>
              )}
            </section>
          </div>

          <aside className="sidePanel">
            <section className="actionPanel">
              <h2 className="actionTitle">
                {locale === "de" ? "Aktionen" : "Actions"}
              </h2>

              <p className="actionText">
                {locale === "de"
                  ? "Du kannst diese Bestellung erneut in den Warenkorb legen oder — falls noch möglich — stornieren."
                  : "You can add this order to the cart again or — if still possible — cancel it."}
              </p>

              <div className="actionStack">
                {hasReorderableItems ? (
                  <a href={reorderUrl} className="orderBtnPrimary">
                    {locale === "de" ? "Erneut bestellen" : "Reorder"}
                  </a>
                ) : (
                  <span className="orderBtnDisabled">
                    {locale === "de" ? "Erneut bestellen" : "Reorder"}
                  </span>
                )}

                {canCancel ? (
                  <Form method="post">
                    <input type="hidden" name="intent" value="cancel" />
                    <button
                      type="submit"
                      className="orderBtnDanger"
                      disabled={isCancelling}
                      onClick={(event) => {
                        const ok = window.confirm(
                          locale === "de"
                            ? "Möchtest du diese Bestellung wirklich stornieren?"
                            : "Do you really want to cancel this order?"
                        );

                        if (!ok) {
                          event.preventDefault();
                        }
                      }}
                    >
                      {isCancelling
                        ? locale === "de"
                          ? "Wird storniert..."
                          : "Cancelling..."
                        : locale === "de"
                        ? "Bestellung stornieren"
                        : "Cancel order"}
                    </button>
                  </Form>
                ) : (
                  <span className="orderBtnSecondary" style={{ opacity: 0.72 }}>
                    {locale === "de" ? "Nicht stornierbar" : "Cannot be cancelled"}
                  </span>
                )}
              </div>

              <p className="actionText" style={{ marginBottom: 0 }}>
                {hasReorderableItems
                  ? locale === "de"
                    ? `${reorderableItems.length} Position(en) können erneut in den Shopify-Warenkorb gelegt werden.`
                    : `${reorderableItems.length} item(s) can be added to the Shopify cart again.`
                  : locale === "de"
                  ? "Für diese Bestellung fehlen Shopify-Variant-IDs für den Reorder."
                  : "This order does not include Shopify variant IDs for reorder."}
              </p>
            </section>

            <section className="panel">
              <h2 className="panelTitle">
                {locale === "de" ? "Preisübersicht" : "Price summary"}
              </h2>

              <div className="summaryRows">
                <div className="summaryRow">
                  <span>{locale === "de" ? "Zwischensumme" : "Subtotal"}</span>
                  <strong>
                    {formatMoney(
                      order.subtotalAmount || 0,
                      order.currency || "EUR",
                      locale
                    )}
                  </strong>
                </div>

                <div className="summaryRow">
                  <span>{locale === "de" ? "Steuern" : "Tax"}</span>
                  <strong>
                    {formatMoney(order.taxAmount || 0, order.currency || "EUR", locale)}
                  </strong>
                </div>

                <div className="summaryRow total">
                  <span>{locale === "de" ? "Gesamt" : "Total"}</span>
                  <strong>
                    {formatMoney(
                      order.totalAmount || 0,
                      order.currency || "EUR",
                      locale
                    )}
                  </strong>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </PortalLayout>
  );
}

function serializeOrder(order) {
  return {
    ...order,
    createdAt: order.createdAt?.toISOString(),
    updatedAt: order.updatedAt?.toISOString(),
    orderedAt: order.orderedAt?.toISOString(),
    deliveryDate: order.deliveryDate?.toISOString() || null,
    subtotalAmount: order.subtotalAmount ? Number(order.subtotalAmount) : 0,
    taxAmount: order.taxAmount ? Number(order.taxAmount) : 0,
    totalAmount: order.totalAmount ? Number(order.totalAmount) : 0,
    items: (order.items || []).map((item) => ({
      ...item,
      unitPrice: item.unitPrice ? Number(item.unitPrice) : 0,
      totalPrice: item.totalPrice ? Number(item.totalPrice) : 0,
      createdAt: item.createdAt?.toISOString(),
      updatedAt: item.updatedAt?.toISOString(),
    })),
  };
}

function QuickStat({ label, value }) {
  return (
    <div className="quickStat">
      <div className="quickStatLabel">{label}</div>
      <div className="quickStatValue">{value || "—"}</div>
    </div>
  );
}

function DetailBox({ label, value, wide = false }) {
  return (
    <div className={`detailBox ${wide ? "isWide" : ""}`}>
      <div className="detailLabel">{label}</div>
      <div className="detailValue">{value || "—"}</div>
    </div>
  );
}

function buildShopifyCartPermalink(items) {
  const lineItems = items
    .filter((item) => item.shopifyVariantId && Number(item.quantity || 0) > 0)
    .map((item) => {
      const variantId = encodeURIComponent(String(item.shopifyVariantId));
      const qty = Math.max(1, Number(item.quantity || 1));
      return `${variantId}:${qty}`;
    });

  return `https://letmebowl-catering.de/cart/${lineItems.join(",")}`;
}

function formatDate(value, locale) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatMoney(value, currency = "EUR", locale) {
  const num = Number(value || 0);

  return new Intl.NumberFormat(locale === "en" ? "en-GB" : "de-DE", {
    style: "currency",
    currency,
  }).format(num);
}

function getStatusLabel(status, locale) {
  const map = {
    OPEN: locale === "en" ? "Open" : "Offen",
    CONFIRMED: locale === "en" ? "Confirmed" : "Bestätigt",
    IN_PREPARATION: locale === "en" ? "In preparation" : "In Vorbereitung",
    DELIVERED: locale === "en" ? "Delivered" : "Geliefert",
    CANCELLED: locale === "en" ? "Cancelled" : "Storniert",
  };

  return map[status] || status || "—";
}

function getStatusStyle(status) {
  switch (status) {
    case "DELIVERED":
      return {
        background: "#edf7ee",
        color: "#1f6b36",
        border: "1px solid #cfe8d4",
      };

    case "CONFIRMED":
      return {
        background: "#eef4ff",
        color: "#285ea8",
        border: "1px solid #cfddf6",
      };

    case "IN_PREPARATION":
      return {
        background: "#fff6e9",
        color: "#8a5a00",
        border: "1px solid #f0dfbf",
      };

    case "CANCELLED":
      return {
        background: "#fff1f1",
        color: "#8b2222",
        border: "1px solid #efcaca",
      };

    default:
      return {
        background: "#f3f3f3",
        color: "#555",
        border: "1px solid #dfdfdf",
      };
  }
}