const colors = {
  bg: "#f7f4ee",
  card: "#ffffff",
  text: "#171717",
  muted: "#756b5f",
  line: "#e8decd",
  gold: "#c8a96a",
  dark: "#151515",
};

function go(to) {
  window.location.href = to;
}

export default function AdminLayout({ title, subtitle, user, children }) {
  const pathname =
    typeof window !== "undefined" ? window.location.pathname : "";

  const items = [
    {
      label: "Dashboard",
      shortLabel: "Dashboard",
      icon: "▦",
      href: "/admin",
      match: pathname === "/admin",
    },
    {
      label: "Firmenkunden",
      shortLabel: "Kunden",
      icon: "◎",
      href: "/admin/customers",
      match:
        pathname.startsWith("/admin/customers") ||
        pathname.startsWith("/admin/customer-detail"),
    },
    {
      label: "Rechnungen",
      shortLabel: "Rechnungen",
      icon: "◧",
      href: "/admin/invoices",
      match: pathname.startsWith("/admin/invoices"),
    },
  ];

  return (
    <>
      <style>{`
        .lmbAdminLayout {
          min-height: 100vh;
          background: ${colors.bg};
          display: grid;
          grid-template-columns: 280px minmax(0, 1fr);
          font-family: Inter, Arial, sans-serif;
          color: ${colors.text};
        }

        .lmbAdminSidebar {
          position: sticky;
          top: 0;
          height: 100vh;
          background: linear-gradient(180deg, #151515 0%, #222018 100%);
          padding: 30px 20px;
          color: #fff;
          overflow-y: auto;
        }

        .lmbAdminBrand {
          display: grid;
          gap: 6px;
        }

        .lmbAdminBrandTitle {
          font-size: 18px;
          font-weight: 950;
          letter-spacing: 0.08em;
          line-height: 1.1;
        }

        .lmbAdminBrandSub {
          font-size: 12px;
          color: #d8c391;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-weight: 850;
        }

        .lmbAdminNav {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 34px;
        }

        .lmbAdminNavButton {
          display: flex;
          align-items: center;
          gap: 10px;
          color: rgba(255,255,255,0.78);
          padding: 13px 14px;
          border-radius: 16px;
          font-size: 14px;
          font-weight: 850;
          border: 1px solid transparent;
          background: transparent;
          cursor: pointer;
          width: 100%;
          text-align: left;
          transition: 0.18s ease;
        }

        .lmbAdminNavButton:hover {
          background: rgba(255,255,255,0.07);
          color: #fff;
        }

        .lmbAdminNavButton.isActive {
          background: rgba(200,169,106,0.16);
          color: #fff;
          border-color: rgba(200,169,106,0.36);
        }

        .lmbAdminNavIcon {
          width: 24px;
          height: 24px;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.06);
          color: #d8c391;
          flex-shrink: 0;
        }

        .lmbAdminSidebarFooter {
          margin-top: 34px;
          padding: 16px;
          border-radius: 18px;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.10);
          color: rgba(255,255,255,0.72);
          font-size: 13px;
          line-height: 1.5;
          font-weight: 600;
        }

        .lmbAdminMain {
          min-width: 0;
          padding: 30px;
        }

        .lmbAdminMobileBar {
          display: none;
        }

        .lmbAdminTopbar {
          background: ${colors.card};
          border: 1px solid ${colors.line};
          border-radius: 26px;
          padding: 22px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 22px;
          margin-bottom: 24px;
          box-shadow: 0 18px 45px rgba(30,20,10,0.06);
          min-width: 0;
        }

        .lmbAdminTopbarTextWrap {
          min-width: 0;
        }

        .lmbAdminKicker {
          font-size: 12px;
          font-weight: 950;
          letter-spacing: 0.12em;
          color: ${colors.gold};
          text-transform: uppercase;
          margin-bottom: 6px;
        }

        .lmbAdminTitle {
          margin: 0;
          font-size: 28px;
          line-height: 1.15;
          color: ${colors.text};
          letter-spacing: -0.035em;
          font-weight: 950;
          overflow-wrap: anywhere;
        }

        .lmbAdminSubtitle {
          margin: 7px 0 0;
          font-size: 14px;
          color: ${colors.muted};
          line-height: 1.55;
          font-weight: 600;
          overflow-wrap: anywhere;
        }

        .lmbAdminUserActions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .lmbAdminUserBox {
          max-width: 280px;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 14px;
          color: ${colors.text};
          background: #faf6ee;
          border: 1px solid ${colors.line};
          padding: 11px 15px;
          border-radius: 999px;
          font-weight: 850;
          white-space: nowrap;
        }

        .lmbAdminLogout {
          text-decoration: none;
          background: #111;
          color: #fff;
          padding: 11px 15px;
          border-radius: 999px;
          font-size: 14px;
          font-weight: 850;
          white-space: nowrap;
        }

        .lmbAdminContent {
          display: flex;
          flex-direction: column;
          gap: 22px;
          min-width: 0;
        }

        @media (max-width: 1100px) {
          .lmbAdminLayout {
            grid-template-columns: 240px minmax(0, 1fr);
          }

          .lmbAdminSidebar {
            padding: 24px 16px;
          }

          .lmbAdminMain {
            padding: 24px;
          }

          .lmbAdminTopbar {
            align-items: flex-start;
          }

          .lmbAdminUserActions {
            flex-direction: column;
            align-items: flex-end;
          }

          .lmbAdminUserBox {
            max-width: 220px;
          }
        }

        @media (max-width: 860px) {
          .lmbAdminLayout {
            display: block;
          }

          .lmbAdminSidebar {
            display: none;
          }

          .lmbAdminMain {
            padding: 14px;
          }

          .lmbAdminMobileBar {
            display: block;
            position: sticky;
            top: 0;
            z-index: 50;
            margin: -14px -14px 14px;
            padding: 12px 14px 10px;
            background: linear-gradient(180deg, #151515 0%, #222018 100%);
            box-shadow: 0 14px 30px rgba(0,0,0,0.12);
          }

          .lmbAdminMobileTop {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 14px;
            color: #fff;
            margin-bottom: 12px;
          }

          .lmbAdminMobileBrand {
            min-width: 0;
          }

          .lmbAdminMobileBrandTitle {
            font-size: 15px;
            font-weight: 950;
            letter-spacing: 0.08em;
            line-height: 1.1;
          }

          .lmbAdminMobileBrandSub {
            margin-top: 4px;
            font-size: 10.5px;
            color: #d8c391;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            font-weight: 850;
          }

          .lmbAdminMobileLogout {
            text-decoration: none;
            background: rgba(255,255,255,0.09);
            color: #fff;
            border: 1px solid rgba(255,255,255,0.12);
            padding: 9px 12px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 900;
            white-space: nowrap;
          }

          .lmbAdminMobileNav {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 8px;
          }

          .lmbAdminMobileNavButton {
            min-width: 0;
            min-height: 42px;
            border-radius: 14px;
            border: 1px solid rgba(255,255,255,0.10);
            background: rgba(255,255,255,0.06);
            color: rgba(255,255,255,0.78);
            font-size: 12px;
            font-weight: 900;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            cursor: pointer;
            padding: 0 8px;
          }

          .lmbAdminMobileNavButton.isActive {
            background: rgba(200,169,106,0.18);
            color: #fff;
            border-color: rgba(200,169,106,0.38);
          }

          .lmbAdminTopbar {
            border-radius: 22px;
            padding: 18px;
            display: grid;
            grid-template-columns: 1fr;
            gap: 16px;
            margin-bottom: 16px;
          }

          .lmbAdminTitle {
            font-size: 25px;
          }

          .lmbAdminSubtitle {
            font-size: 13.5px;
          }

          .lmbAdminUserActions {
            display: grid;
            grid-template-columns: 1fr;
            align-items: stretch;
          }

          .lmbAdminUserBox,
          .lmbAdminLogout {
            max-width: none;
            width: 100%;
            text-align: center;
            justify-content: center;
          }

          .lmbAdminLogout {
            display: none;
          }

          .lmbAdminContent {
            gap: 16px;
          }
        }

        @media (max-width: 430px) {
          .lmbAdminMain {
            padding: 12px;
          }

          .lmbAdminMobileBar {
            margin: -12px -12px 12px;
            padding: 11px 12px 10px;
          }

          .lmbAdminMobileNav {
            gap: 6px;
          }

          .lmbAdminMobileNavButton {
            font-size: 11.5px;
            padding: 0 6px;
          }

          .lmbAdminTopbar {
            padding: 16px;
            border-radius: 20px;
          }

          .lmbAdminKicker {
            font-size: 10.5px;
          }

          .lmbAdminTitle {
            font-size: 23px;
          }

          .lmbAdminUserBox {
            font-size: 13px;
            padding: 10px 12px;
          }
        }
      `}</style>

      <div className="lmbAdminLayout">
        <aside className="lmbAdminSidebar">
          <div className="lmbAdminBrand">
            <div className="lmbAdminBrandTitle">LET ME BOWL</div>
            <div className="lmbAdminBrandSub">Adminbereich</div>
          </div>

          <nav className="lmbAdminNav">
            {items.map((item) => (
              <button
                key={item.href}
                type="button"
                onClick={() => go(item.href)}
                className={`lmbAdminNavButton ${item.match ? "isActive" : ""}`}
              >
                <span className="lmbAdminNavIcon">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="lmbAdminSidebarFooter">
            Verwalte Firmenkunden, Rechnungen und interne Abläufe zentral im
            Let Me Bowl Portal.
          </div>
        </aside>

        <main className="lmbAdminMain">
          <div className="lmbAdminMobileBar">
            <div className="lmbAdminMobileTop">
              <div className="lmbAdminMobileBrand">
                <div className="lmbAdminMobileBrandTitle">LET ME BOWL</div>
                <div className="lmbAdminMobileBrandSub">Adminbereich</div>
              </div>

              <a href="/logout" className="lmbAdminMobileLogout">
                Abmelden
              </a>
            </div>

            <nav className="lmbAdminMobileNav">
              {items.map((item) => (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => go(item.href)}
                  className={`lmbAdminMobileNavButton ${
                    item.match ? "isActive" : ""
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.shortLabel}
                </button>
              ))}
            </nav>
          </div>

          <div className="lmbAdminTopbar">
            <div className="lmbAdminTopbarTextWrap">
              <div className="lmbAdminKicker">Let Me Bowl Portal</div>
              <h1 className="lmbAdminTitle">{title}</h1>
              {subtitle ? (
                <p className="lmbAdminSubtitle">{subtitle}</p>
              ) : null}
            </div>

            <div className="lmbAdminUserActions">
              <div className="lmbAdminUserBox">{user?.email || "Admin"}</div>

              <a href="/logout" className="lmbAdminLogout">
                Abmelden
              </a>
            </div>
          </div>

          <div className="lmbAdminContent">{children}</div>
        </main>
      </div>
    </>
  );
}