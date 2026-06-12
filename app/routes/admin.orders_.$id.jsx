import { redirect, useLoaderData } from "react-router";
import { prisma } from "../lib/prisma.server.js";
import { getUserFromRequest } from "../lib/auth.server.js";
import AdminLayout from "../components/AdminLayout.jsx";

function safeText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function formatDateOnly(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatCreatedAt(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function normalizeLines(value) {
  return safeText(value)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim());
}

function getNoteValue(notes, labels) {
  const lines = normalizeLines(notes);
  const normalizedLabels = labels.map((label) => label.toLowerCase());

  for (const line of lines) {
    const separatorIndex = line.indexOf(":");

    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim().toLowerCase();
    const value = line.slice(separatorIndex + 1).trim();

    if (normalizedLabels.includes(key) && value && value !== "-") {
      return value;
    }
  }

  return "";
}

function getNoteSection(notes, heading, stopHeadings = []) {
  const lines = normalizeLines(notes);
  const normalizedHeading = heading.toLowerCase();
  const normalizedStops = stopHeadings.map((value) => value.toLowerCase());

  const startIndex = lines.findIndex((line) => {
    return line.replace(/:$/, "").toLowerCase() === normalizedHeading;
  });

  if (startIndex === -1) return [];

  const result = [];

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];

    if (!line) {
      if (result.length) break;
      continue;
    }

    const possibleHeading = line.replace(/:$/, "").toLowerCase();

    if (normalizedStops.includes(possibleHeading)) {
      break;
    }

    result.push(line);
  }

  return result.filter((line) => line && line !== "-");
}

function isDeliveryFeeItem(item) {
  const title = safeText(item?.title).toLowerCase();
  const handle = safeText(item?.shopifyHandle).toLowerCase();

  return (
    title.includes("lieferkosten") ||
    title.includes("anlieferung") ||
    title.includes("zustellung") ||
    title.includes("delivery fee") ||
    title.includes("abholpauschale") ||
    handle.includes("lieferkosten") ||
    handle.includes("anlieferung") ||
    handle.includes("zustellung") ||
    handle.includes("abholpauschale")
  );
}

function cleanOrderNotes(notes) {
  const raw = safeText(notes);

  if (!raw) return "";

  const lines = normalizeLines(raw);
  const markerIndex = lines.findIndex((line) => {
    const normalized = line.toLowerCase();

    return (
      normalized === "hinweise / interne referenz:" ||
      normalized === "hinweise / interne referenz" ||
      normalized === "hinweis:" ||
      normalized === "hinweis"
    );
  });

  if (markerIndex === -1) {
    return "";
  }

  const result = [];

  for (let index = markerIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];

    if (!line) {
      if (result.length) break;
      continue;
    }

    if (
      line.toLowerCase().startsWith("technische bestellnotiz") ||
      line.toLowerCase().startsWith("portal:")
    ) {
      break;
    }

    if (line !== "-") {
      result.push(line);
    }
  }

  return result.join("\n").trim();
}

export async function loader({ request, params }) {
  const user = await getUserFromRequest(request);

  if (!user) {
    throw redirect("/login?lang=de");
  }

  if (!user.isAdmin) {
    throw redirect("/dashboard?lang=de");
  }

  const order = await prisma.portalOrder.findUnique({
    where: {
      id: params.id,
    },
    include: {
      user: true,
      items: true,
      costCenter: true,
      deliveryAddress: true,
    },
  });

  if (!order) {
    throw new Response("Bestellung nicht gefunden", {
      status: 404,
    });
  }

  return { order };
}

export default function AdminOrderDeliveryNotePage() {
  const { order } = useLoaderData();

  const notes = safeText(order.notes);

  const deliveryTime =
    getNoteValue(notes, ["Lieferzeit", "Zeit"]) || "-";

  const eventTime =
    getNoteValue(notes, ["Eventbeginn", "Eventzeit"]) || "-";

  const deliveryType =
    getNoteValue(notes, ["Lieferart"]) ||
    safeText(order.orderType) ||
    "Lieferung";

  const noteDeliveryAddress = getNoteSection(
    notes,
    "Lieferadresse",
    [
      "Rechnungsadresse",
      "Portal",
      "Hinweise / interne Referenz",
      "Technische Bestellnotiz",
    ]
  );

  const relationDeliveryAddress = [
    safeText(order.deliveryAddress?.companyName),
    safeText(order.deliveryAddress?.street),
    [
      safeText(order.deliveryAddress?.postalCode),
      safeText(order.deliveryAddress?.city),
    ]
      .filter(Boolean)
      .join(" "),
    safeText(order.deliveryAddress?.addressExtra),
  ].filter(Boolean);

  const deliveryAddress =
    relationDeliveryAddress.length > 0
      ? relationDeliveryAddress
      : noteDeliveryAddress;

  const companyName =
    safeText(order.user?.companyName) ||
    safeText(order.billingCompanyName) ||
    deliveryAddress[0] ||
    "-";

  const contactName =
    safeText(order.billingContactName) ||
    [
      safeText(order.user?.firstName),
      safeText(order.user?.lastName),
    ]
      .filter(Boolean)
      .join(" ") ||
    "-";

  const email =
    safeText(order.billingEmail) ||
    safeText(order.user?.email) ||
    "-";

  const phone = safeText(order.billingPhone) || "-";

  const costCenter =
    safeText(order.costCenter?.name) ||
    safeText(order.referenceNumber) ||
    "-";

  const customerReference = cleanOrderNotes(notes);

  const productItems = Array.isArray(order.items)
    ? order.items.filter((item) => !isDeliveryFeeItem(item))
    : [];

  return (
    <AdminLayout>
      <style>{`
        .deliveryNotePage,
        .deliveryNotePage * {
          box-sizing: border-box;
        }

        .deliveryNoteActions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
          flex-wrap: wrap;
        }

        .deliveryNoteBack {
          color: #121826;
          text-decoration: none;
          font-weight: 800;
        }

        .deliveryNotePrintButton {
          min-height: 46px;
          padding: 0 22px;
          border: 1px solid #b78d43;
          border-radius: 999px;
          background: linear-gradient(180deg, #d6b676 0%, #c7a05f 100%);
          color: #ffffff;
          font: inherit;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 10px 24px rgba(184, 146, 86, 0.22);
        }

        .deliveryNotePaper {
          width: 100%;
          max-width: 900px;
          min-height: 1120px;
          margin: 0 auto;
          padding: 42px 46px;
          background: #ffffff;
          color: #111827;
          border: 1px solid rgba(18, 24, 38, 0.1);
          border-radius: 20px;
          box-shadow: 0 18px 45px rgba(18, 24, 38, 0.08);
        }

        .deliveryNoteHeader {
          display: flex;
          justify-content: space-between;
          gap: 30px;
          padding-bottom: 28px;
          border-bottom: 2px solid #111827;
        }

        .deliveryNoteBrand {
          font-size: 24px;
          font-weight: 950;
          letter-spacing: 0.08em;
        }

        .deliveryNoteBrandSubline {
          margin-top: 7px;
          color: #80602f;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.14em;
        }

        .deliveryNoteSender {
          margin-top: 18px;
          font-size: 12px;
          line-height: 1.65;
          color: #4b5563;
        }

        .deliveryNoteDocumentInfo {
          min-width: 260px;
          text-align: right;
        }

        .deliveryNoteTitle {
          margin: 0 0 16px;
          font-size: 34px;
          line-height: 1;
          letter-spacing: -0.03em;
        }

        .deliveryNoteDocumentRow {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          padding: 5px 0;
          font-size: 13px;
        }

        .deliveryNoteDocumentRow span {
          color: #6b7280;
        }

        .deliveryNoteDocumentRow strong {
          text-align: right;
        }

        .deliveryNoteDeliveryBox {
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(260px, 0.85fr);
          gap: 26px;
          margin-top: 30px;
        }

        .deliveryNoteBox {
          padding: 20px;
          border: 1px solid #d9dde4;
          border-radius: 14px;
          background: #ffffff;
        }

        .deliveryNoteBoxTitle {
          margin-bottom: 13px;
          color: #80602f;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .deliveryNoteAddress {
          font-size: 15px;
          line-height: 1.65;
          font-weight: 650;
          white-space: pre-line;
        }

        .deliveryNoteMetaList {
          display: grid;
          gap: 10px;
        }

        .deliveryNoteMetaRow {
          display: grid;
          grid-template-columns: 112px minmax(0, 1fr);
          gap: 12px;
          font-size: 13px;
          line-height: 1.45;
        }

        .deliveryNoteMetaRow span {
          color: #6b7280;
        }

        .deliveryNoteMetaRow strong {
          color: #111827;
        }

        .deliveryNoteItemsSection {
          margin-top: 34px;
        }

        .deliveryNoteSectionTitle {
          margin: 0 0 14px;
          font-size: 19px;
        }

        .deliveryNoteTable {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }

        .deliveryNoteTable th {
          padding: 11px 12px;
          border-top: 1px solid #111827;
          border-bottom: 1px solid #111827;
          background: #f5f2eb;
          color: #374151;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.08em;
          text-align: left;
          text-transform: uppercase;
        }

        .deliveryNoteTable td {
          padding: 15px 12px;
          border-bottom: 1px solid #d9dde4;
          vertical-align: top;
          font-size: 14px;
        }

        .deliveryNoteTable th:first-child,
        .deliveryNoteTable td:first-child {
          width: 74px;
          text-align: center;
        }

        .deliveryNoteTable th:last-child,
        .deliveryNoteTable td:last-child {
          width: 110px;
          text-align: center;
        }

        .deliveryNoteProductTitle {
          font-weight: 850;
          color: #111827;
        }

        .deliveryNoteProductMeta {
          margin-top: 4px;
          color: #6b7280;
          font-size: 12px;
          line-height: 1.4;
        }

        .deliveryNoteQuantity {
          font-size: 16px;
          font-weight: 950;
        }

        .deliveryNoteReference {
          margin-top: 28px;
          padding: 18px 20px;
          border: 1px solid #d9dde4;
          border-radius: 14px;
          background: #faf9f6;
        }

        .deliveryNoteReferenceText {
          white-space: pre-wrap;
          font-size: 13px;
          line-height: 1.65;
        }

        .deliveryNoteSignatures {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 50px;
          margin-top: 74px;
        }

        .deliveryNoteSignatureLine {
          border-top: 1px solid #111827;
          padding-top: 8px;
          color: #6b7280;
          font-size: 11px;
        }

        .deliveryNoteFooter {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          margin-top: 56px;
          padding-top: 16px;
          border-top: 1px solid #d9dde4;
          color: #6b7280;
          font-size: 10px;
          line-height: 1.5;
        }

        @media (max-width: 760px) {
          .deliveryNotePaper {
            min-height: auto;
            padding: 24px 20px;
            border-radius: 14px;
          }

          .deliveryNoteHeader,
          .deliveryNoteDeliveryBox,
          .deliveryNoteSignatures {
            grid-template-columns: 1fr;
            display: grid;
          }

          .deliveryNoteDocumentInfo {
            min-width: 0;
            text-align: left;
          }

          .deliveryNoteDocumentRow strong {
            text-align: left;
          }

          .deliveryNoteMetaRow {
            grid-template-columns: 1fr;
            gap: 2px;
          }

          .deliveryNoteTable th:first-child,
          .deliveryNoteTable td:first-child {
            width: 54px;
          }

          .deliveryNoteTable th:last-child,
          .deliveryNoteTable td:last-child {
            width: 72px;
          }
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }

          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }

          body * {
            visibility: hidden !important;
          }

          .deliveryNotePaper,
          .deliveryNotePaper * {
            visibility: visible !important;
          }

          .deliveryNotePaper {
            position: absolute;
            top: 0;
            left: 0;
            width: 100% !important;
            max-width: none !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 8mm !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }

          .deliveryNoteActions {
            display: none !important;
          }

          .deliveryNoteHeader {
            padding-bottom: 18px;
          }

          .deliveryNoteDeliveryBox {
            margin-top: 20px;
          }

          .deliveryNoteItemsSection {
            margin-top: 24px;
          }

          .deliveryNoteTable tr,
          .deliveryNoteBox,
          .deliveryNoteReference {
            break-inside: avoid;
          }

          .deliveryNoteFooter {
            margin-top: 35px;
          }
        }
      `}</style>

      <div className="deliveryNotePage">
        <div className="deliveryNoteActions">
          <a href="/admin/orders" className="deliveryNoteBack">
            ← Zurück zu den Bestellungen
          </a>

          <button
            type="button"
            className="deliveryNotePrintButton"
            onClick={() => window.print()}
          >
            Lieferschein drucken / PDF
          </button>
        </div>

        <article className="deliveryNotePaper">
          <header className="deliveryNoteHeader">
            <div>
              <div className="deliveryNoteBrand">LET ME BOWL</div>
              <div className="deliveryNoteBrandSubline">
                BUSINESS CATERING
              </div>

              <div className="deliveryNoteSender">
                Edis Gastrobetriebe GmbH &amp; Co. KG
                <br />
                Goerzallee 299
                <br />
                14167 Berlin
                <br />
                info@letmebowl-catering.de
                <br />
                030 46996295
              </div>
            </div>

            <div className="deliveryNoteDocumentInfo">
              <h1 className="deliveryNoteTitle">Lieferschein</h1>

              <div className="deliveryNoteDocumentRow">
                <span>Lieferschein-Nr.</span>
                <strong>{order.orderNumber || "-"}</strong>
              </div>

              <div className="deliveryNoteDocumentRow">
                <span>Bestelldatum</span>
                <strong>
                  {formatCreatedAt(order.orderedAt || order.createdAt)}
                </strong>
              </div>

              <div className="deliveryNoteDocumentRow">
                <span>Lieferdatum</span>
                <strong>{formatDateOnly(order.deliveryDate)}</strong>
              </div>
            </div>
          </header>

          <section className="deliveryNoteDeliveryBox">
            <div className="deliveryNoteBox">
              <div className="deliveryNoteBoxTitle">Lieferadresse</div>

              <div className="deliveryNoteAddress">
                {deliveryAddress.length
                  ? deliveryAddress.map((line, index) => (
                      <div key={`${line}-${index}`}>{line}</div>
                    ))
                  : "Keine Lieferadresse gespeichert"}
              </div>
            </div>

            <div className="deliveryNoteBox">
              <div className="deliveryNoteBoxTitle">Lieferinformationen</div>

              <div className="deliveryNoteMetaList">
                <InfoRow label="Firma" value={companyName} />
                <InfoRow label="Kontakt" value={contactName} />
                <InfoRow label="Telefon" value={phone} />
                <InfoRow label="E-Mail" value={email} />
                <InfoRow
                  label="Datum"
                  value={formatDateOnly(order.deliveryDate)}
                />
                <InfoRow label="Lieferzeit" value={deliveryTime} />
                <InfoRow label="Eventbeginn" value={eventTime} />
                <InfoRow label="Lieferart" value={deliveryType} />
                <InfoRow label="Kostenstelle" value={costCenter} />
              </div>
            </div>
          </section>

          <section className="deliveryNoteItemsSection">
            <h2 className="deliveryNoteSectionTitle">
              Gelieferte Produkte
            </h2>

            <table className="deliveryNoteTable">
              <thead>
                <tr>
                  <th>Pos.</th>
                  <th>Produkt</th>
                  <th>Menge</th>
                </tr>
              </thead>

              <tbody>
                {productItems.length ? (
                  productItems.map((item, index) => (
                    <tr key={item.id || `${item.title}-${index}`}>
                      <td>{index + 1}</td>

                      <td>
                        <div className="deliveryNoteProductTitle">
                          {safeText(item.title) || "Artikel"}
                        </div>

                        {safeText(item.variantTitle) ||
                        safeText(item.sku) ||
                        safeText(item.notes) ? (
                          <div className="deliveryNoteProductMeta">
                            {[
                              safeText(item.variantTitle),
                              safeText(item.sku)
                                ? `SKU: ${safeText(item.sku)}`
                                : "",
                              safeText(item.notes),
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </div>
                        ) : null}
                      </td>

                      <td>
                        <span className="deliveryNoteQuantity">
                          {Number(item.quantity || 1)}
                          {safeText(item.unit)
                            ? ` ${safeText(item.unit)}`
                            : ""}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3">
                      Keine auslieferbaren Produkte gespeichert.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          {customerReference ? (
            <section className="deliveryNoteReference">
              <div className="deliveryNoteBoxTitle">
                Hinweise / interne Referenz
              </div>

              <div className="deliveryNoteReferenceText">
                {customerReference}
              </div>
            </section>
          ) : null}

          <section className="deliveryNoteSignatures">
            <div className="deliveryNoteSignatureLine">
              Datum / Unterschrift Auslieferung
            </div>

            <div className="deliveryNoteSignatureLine">
              Datum / Unterschrift Empfänger
            </div>
          </section>

          <footer className="deliveryNoteFooter">
            <div>
              Edis Gastrobetriebe GmbH &amp; Co. KG
              <br />
              Goerzallee 299 · 14167 Berlin
            </div>

            <div>
              Let Me Bowl Catering
              <br />
              info@letmebowl-catering.de · 030 46996295
            </div>
          </footer>
        </article>
      </div>
    </AdminLayout>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="deliveryNoteMetaRow">
      <span>{label}</span>
      <strong>{safeText(value) || "-"}</strong>
    </div>
  );
}