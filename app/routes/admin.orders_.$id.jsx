import { redirect, useLoaderData } from "react-router";
import { prisma } from "../lib/prisma.server.js";
import { getUserFromRequest } from "../lib/auth.server.js";
import AdminLayout from "../components/AdminLayout.jsx";

function euro(value) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
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
    },
  });

  if (!order) {
    throw new Response("Bestellung nicht gefunden", {
      status: 404,
    });
  }

  return { order };
}

export default function AdminOrderDetailPage() {
  const { order } = useLoaderData();

  return (
    <AdminLayout>
      <style>{`
        .orderDetailPage {
          display: grid;
          gap: 20px;
        }

        .orderDetailBack {
          display: inline-flex;
          width: fit-content;
          color: #121826;
          text-decoration: none;
          font-weight: 800;
        }

        .orderDetailCard {
          padding: 26px;
          border-radius: 26px;
          border: 1px solid rgba(18, 24, 38, 0.09);
          background: #fffdfa;
          box-shadow: 0 14px 34px rgba(18, 24, 38, 0.05);
        }

        .orderDetailHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
        }

        .orderDetailNumber {
          margin: 0;
          font-size: 32px;
          line-height: 1.1;
          color: #121826;
        }

        .orderDetailAmount {
          font-size: 26px;
          font-weight: 900;
          color: #121826;
        }

        .orderDetailGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-top: 24px;
        }

        .orderDetailMeta {
          padding: 14px;
          border-radius: 16px;
          background: #f8f5ef;
        }

        .orderDetailMeta span {
          display: block;
          margin-bottom: 5px;
          color: rgba(18, 24, 38, 0.58);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .orderDetailMeta strong {
          color: #121826;
          word-break: break-word;
        }

        .orderDetailItems {
          display: grid;
          gap: 10px;
          margin-top: 18px;
        }

        .orderDetailItem {
          display: grid;
          grid-template-columns: 70px minmax(0, 1fr) auto;
          gap: 14px;
          align-items: center;
          padding: 15px;
          border-radius: 18px;
          border: 1px solid rgba(18, 24, 38, 0.08);
          background: #fff;
        }

        .orderDetailQty {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          border-radius: 14px;
          background: #f1eadc;
          color: #80602f;
          font-weight: 900;
        }

        .orderDetailItemTitle {
          color: #121826;
          font-weight: 900;
        }

        .orderDetailItemMeta {
          margin-top: 4px;
          color: rgba(18, 24, 38, 0.58);
          font-size: 13px;
        }

        .orderDetailItemPrice {
          color: #121826;
          font-weight: 900;
          white-space: nowrap;
        }

        .orderDetailTotals {
          display: grid;
          gap: 9px;
          margin-top: 20px;
          margin-left: auto;
          max-width: 420px;
        }

        .orderDetailTotals > div {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          padding: 10px 0;
          border-bottom: 1px solid rgba(18, 24, 38, 0.08);
        }

        .orderDetailTotalFinal {
          font-size: 18px;
          font-weight: 900;
        }

        .orderDetailNotes {
          margin-top: 18px;
          padding: 18px;
          border-radius: 18px;
          background: #f8f5ef;
          white-space: pre-wrap;
          color: #333;
          line-height: 1.65;
        }

        @media (max-width: 850px) {
          .orderDetailGrid {
            grid-template-columns: 1fr;
          }

          .orderDetailItem {
            grid-template-columns: 56px minmax(0, 1fr);
          }

          .orderDetailItemPrice {
            grid-column: 2;
          }
        }
      `}</style>

      <div className="orderDetailPage">
        <div
          className="orderDetailActions"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "14px",
            flexWrap: "wrap",
          }}
        >
          <a href="/admin/orders" className="orderDetailBack">
            ← Zurück zu den Bestellungen
          </a>

          <button
            type="button"
            onClick={() => window.print()}
            style={{
              position: "fixed",
              top: "92px",
              right: "28px",
              zIndex: 99999,
              minHeight: "48px",
              padding: "0 22px",
              border: "1px solid #b78d43",
              borderRadius: "999px",
              background: "linear-gradient(180deg, #d6b676 0%, #c7a05f 100%)",
              color: "#ffffff",
              font: "inherit",
              fontWeight: 900,
              cursor: "pointer",
              boxShadow: "0 12px 28px rgba(0, 0, 0, 0.22)",
}}
          >
            Bestellung drucken / PDF
          </button>
        </div>

        <section className="orderDetailCard">
          <div className="orderDetailHeader">
            <div>
              <div style={{ color: "#9b773d", fontWeight: 900, marginBottom: 8 }}>
                BESTELLDETAILS
              </div>

              <h1 className="orderDetailNumber">
                {order.orderNumber}
              </h1>

              <div style={{ marginTop: 8, color: "rgba(18,24,38,.62)" }}>
                Eingegangen am {formatDate(order.orderedAt || order.createdAt)}
              </div>
            </div>

            <div className="orderDetailAmount">
              {euro(order.totalAmount)}
            </div>
          </div>

          <div className="orderDetailGrid">
            <Meta label="Firma" value={order.user?.companyName || order.billingCompanyName} />
            <Meta label="Kontakt" value={order.billingContactName} />
            <Meta label="E-Mail" value={order.billingEmail || order.user?.email} />
            <Meta label="Telefon" value={order.billingPhone} />
            <Meta label="Lieferdatum" value={formatDate(order.deliveryDate)} />
            <Meta label="Lieferart" value={order.orderType} />
            <Meta label="Kostenstelle" value={order.costCenter?.name || order.referenceNumber} />
            <Meta label="Status" value={order.status} />
            <Meta label="Positionen" value={String(order.items?.length || 0)} />
          </div>
        </section>

        <section className="orderDetailCard">
          <h2 style={{ margin: 0, color: "#121826" }}>
            Bestellte Positionen
          </h2>

          <div className="orderDetailItems">
            {order.items?.length ? (
              order.items.map((item) => (
                <div key={item.id} className="orderDetailItem">
                  <div className="orderDetailQty">
                    {item.quantity} ×
                  </div>

                  <div>
                    <div className="orderDetailItemTitle">
                      {item.title}
                    </div>

                    <div className="orderDetailItemMeta">
                      {item.variantTitle || item.sku || "Bestellposition"}
                    </div>
                  </div>

                  <div className="orderDetailItemPrice">
                    {euro(item.totalPrice)}
                  </div>
                </div>
              ))
            ) : (
              <p>Für diese Bestellung sind keine Positionen gespeichert.</p>
            )}
          </div>

          <div className="orderDetailTotals">
            <div>
              <span>Zwischensumme</span>
              <strong>{euro(order.subtotalAmount)}</strong>
            </div>

            <div>
              <span>Enthaltene Steuer</span>
              <strong>{euro(order.taxAmount)}</strong>
            </div>

            <div className="orderDetailTotalFinal">
              <span>Gesamtbetrag</span>
              <strong>{euro(order.totalAmount)}</strong>
            </div>
          </div>

          {order.notes ? (
            <div className="orderDetailNotes">
              {order.notes}
            </div>
          ) : null}
        </section>
      </div>
    </AdminLayout>
  );
}

function Meta({ label, value }) {
  return (
    <div className="orderDetailMeta">
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}
