export const loader = async () => {
  return Response.json({
    customer: {
      name: "Max Mustermann",
      company: "Musterfirma GmbH",
      email: "max@musterfirma.de",
      phone: "+49 170 1234567"
    },
    orders: [
      {
        id: "#1001",
        date: "12.04.2026",
        status: "Bezahlt",
        total: "189,50 €"
      },
      {
        id: "#1000",
        date: "02.04.2026",
        status: "Geliefert",
        total: "86,40 €"
      }
    ]
  });
};

export default function AccountProxyPage({ loaderData }) {
  const { customer, orders } = loaderData;

  return (
    <div
      style={{
        background: "#e9e5dc",
        minHeight: "100vh",
        padding: "40px 20px",
        fontFamily: "Arial, sans-serif"
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          background: "#f7f6f3",
          borderRadius: 24,
          padding: 40,
          boxShadow: "0 10px 30px rgba(0,0,0,0.05)"
        }}
      >
        <div style={{ marginBottom: 30 }}>
          <div
            style={{
              fontSize: 14,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#b8863b",
              fontWeight: 700,
              marginBottom: 16
            }}
          >
            Let Me Bowl Catering
          </div>

          <h1
            style={{
              fontSize: 52,
              lineHeight: 1.05,
              margin: 0,
              color: "#111"
            }}
          >
            Mein Kundenkonto
          </h1>

          <p
            style={{
              fontSize: 22,
              lineHeight: 1.5,
              color: "#333",
              maxWidth: 900,
              marginTop: 20
            }}
          >
            Hier sehen Kunden künftig ihre Stammdaten, Bestellungen und können
            bequem erneut bestellen.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 24,
            marginBottom: 24
          }}
        >
          <div
            style={{
              background: "#efede8",
              border: "1px solid #dcc9a3",
              borderRadius: 18,
              padding: 24
            }}
          >
            <h2 style={{ marginTop: 0, fontSize: 30 }}>Kundendaten</h2>
            <p><strong>Name:</strong> {customer.name}</p>
            <p><strong>Firma:</strong> {customer.company}</p>
            <p><strong>E-Mail:</strong> {customer.email}</p>
            <p><strong>Telefon:</strong> {customer.phone}</p>
          </div>

          <div
            style={{
              background: "#efede8",
              border: "1px solid #dcc9a3",
              borderRadius: 18,
              padding: 24
            }}
          >
            <h2 style={{ marginTop: 0, fontSize: 30 }}>Schnellaktionen</h2>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a
                href="https://letmebowl-catering.de"
                style={{
                  background: "#111",
                  color: "#fff",
                  textDecoration: "none",
                  padding: "12px 18px",
                  borderRadius: 10,
                  fontWeight: 700
                }}
              >
                Neu bestellen
              </a>

              <a
                href="https://letmebowl-catering.de/account"
                style={{
                  background: "#b8863b",
                  color: "#fff",
                  textDecoration: "none",
                  padding: "12px 18px",
                  borderRadius: 10,
                  fontWeight: 700
                }}
              >
                Daten bearbeiten
              </a>
            </div>
          </div>
        </div>

        <div
          style={{
            background: "#efede8",
            border: "1px solid #dcc9a3",
            borderRadius: 18,
            padding: 24
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: 30 }}>Vergangene Bestellungen</h2>

          <div style={{ display: "grid", gap: 16 }}>
            {orders.map((order) => (
              <div
                key={order.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 1fr 1fr 1fr",
                  gap: 12,
                  alignItems: "center",
                  background: "#f7f6f3",
                  borderRadius: 14,
                  padding: 16,
                  border: "1px solid #ddd6c8"
                }}
              >
                <div>
                  <strong>{order.id}</strong>
                </div>
                <div>{order.date}</div>
                <div>{order.status}</div>
                <div style={{ fontWeight: 700 }}>{order.total}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}