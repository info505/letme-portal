const colors = {
  bg: "#f7f4ee",
  card: "#ffffff",
  text: "#171717",
  muted: "#756b5f",
  line: "#e8decd",
  gold: "#c8a96a",
  goldDark: "#b8934f",
  dark: "#151515",
};

function go(to) {
  window.location.href = to;
}

function getInitials(user) {
  const email = user?.email || "Admin";
  const name = user?.firstName || user?.companyName || email;

  return String(name)
    .trim()
    .slice(0, 2)
    .toUpperCase();
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
    label: "Bestellungen",
    shortLabel: "Bestellungen",
    icon: "◫",
    href: "/admin/orders",
    match: pathname.startsWith("/admin/orders"),
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
          background:
            radial-gradient(circle at top left, rgba(200,169,106,0.10), transparent 28%),
            linear-gradient(180deg, ${colors.bg} 0%, #efe9dd 100%);
          display: grid;
          grid-template-columns: 292px minmax(0, 1fr);
          font-family: Inter, Arial, sans-serif;
          color: ${colors.text};
        }

        .lmbAdminSidebar {
          position: sticky;
          top: 0;
          height: 100vh;
          background:
            radial-gradient(circle at top left, rgba(200,169,106,0.17), transparent 34%),
            linear-gradient(180deg, #111111 0%, #1d1b16 54%, #252016 100%);
          padding: 24px 18px;
          color: #fff;
          overflow-y: auto;
          border-right: 1px solid rgba(255,255,255,0.08);
          display: flex;
          flex-direction: column;
        }

        .lmbAdminBrandCard {
          padding: 18px;
          border-radius: 24px;
          background: rgba(255,255,255,0.055);
          border: 1px solid rgba(255,255,255,0.10);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
        }

        .lmbAdminBrand {
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .lmbAdminBrandMark {
          width: 44px;
          height: 44px;
          border-radius: 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, ${colors.gold}, ${colors.goldDark});
          color: #111;
          font-weight: 950;
          box-shadow: 0 14px 28px rgba(200,169,106,0.18);
          flex-shrink: 0;
        }

        .lmbAdminBrandText {
          min-width: 0;
        }

        .lmbAdminBrandTitle {
          font-size: 16px;
          font-weight: 950;
          letter-spacing: 0.075em;
          line-height: 1.1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .lmbAdminBrandSub {
          margin-top: 5px;
          font-size: 11px;
          color: #d8c391;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          font-weight: 850;
        }

        .lmbAdminNavLabel {
          margin: 28px 10px 10px;
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.42);
          font-weight: 900;
        }

        .lmbAdminNav {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .lmbAdminNavButton {
          position: relative;
          display: flex;
          align-items: center;
          gap: 12px;
          color: rgba(255,255,255,0.75);
          padding: 13px 13px;
          border-radius: 18px;
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
          background: rgba(255,255,255,0.075);
          color: #fff;
          transform: translateX(2px);
        }

        .lmbAdminNavButton.isActive {
          background: linear-gradient(135deg, rgba(200,169,106,0.22), rgba(200,169,106,0.10));
          color: #fff;
          border-color: rgba(200,169,106,0.34);
          box-shadow: 0 14px 30px rgba(0,0,0,0.16);
        }

        .lmbAdminNavButton.isActive::before {
          content: "";
          position: absolute;
          left: -18px;
          top: 14px;
          bottom: 14px;
          width: 4px;
          border-radius: 999px;
          background: ${colors.gold};
        }

        .lmbAdminNavIcon {
          width: 32px;
          height: 32px;
          border-radius: 13px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.07);
          color: #d8c391;
          flex-shrink: 0;
          font-size: 16px;
        }

        .lmbAdminNavButton.isActive .lmbAdminNavIcon {
          background: rgba(200,169,106,0.20);
          color: #fff;
        }

        .lmbAdminSidebarFooter {
          margin-top: auto;
          padding-top: 22px;
        }

        .lmbAdminHelpBox {
          padding: 16px;
          border-radius: 20px;
          background: rgba(255,255,255,0.065);
          border: 1px solid rgba(255,255,255,0.10);
          color: rgba(255,255,255,0.72);
          font-size: 13px;
          line-height: 1.55;
          font-weight: 600;
        }

        .lmbAdminHelpTitle {
          color: #fff;
          font-weight: 900;
          margin-bottom: 6px;
        }

        .lmbAdminMain {
          min-width: 0;
          padding: 28px;
        }

        .lmbAdminMobileHeader {
          display: none;
        }

        .lmbAdminTopbar {
          background: rgba(255,255,255,0.88);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(232,222,205,0.92);
          border-radius: 30px;
          padding: 20px 22px;
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
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.14em;
          color: ${colors.goldDark};
          text-transform: uppercase;
          margin-bottom: 7px;
        }

        .lmbAdminTitle {
          margin: 0;
          font-size: clamp(25px, 2.7vw, 34px);
          line-height: 1.08;
          color: ${colors.text};
          letter-spacing: -0.045em;
          font-weight: 950;
          overflow-wrap: anywhere;
        }

        .lmbAdminSubtitle {
          margin: 8px 0 0;
          font-size: 14px;
          color: ${colors.muted};
          line-height: 1.58;
          font-weight: 620;
          overflow-wrap: anywhere;
          max-width: 760px;
        }

        .lmbAdminUserActions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .lmbAdminUserBox {
          display: flex;
          align-items: center;
          gap: 10px;
          max-width: 310px;
          min-width: 0;
          color: ${colors.text};
          background: #faf6ee;
          border: 1px solid ${colors.line};
          padding: 8px 12px 8px 8px;
          border-radius: 999px;
          font-weight: 850;
          white-space: nowrap;
        }

        .lmbAdminAvatar {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #111;
          color: #fff;
          font-size: 12px;
          font-weight: 950;
          flex-shrink: 0;
        }

        .lmbAdminUserText {
          min-width: 0;
          display: grid;
          gap: 1px;
        }

        .lmbAdminUserRole {
          font-size: 11px;
          color: ${colors.muted};
          font-weight: 800;
          line-height: 1;
        }

        .lmbAdminUserEmail {
          font-size: 13px;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 220px;
        }

        .lmbAdminLogout {
          text-decoration: none;
          background: #111;
          color: #fff;
          padding: 12px 15px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 900;
          white-space: nowrap;
          transition: 0.18s ease;
        }

        .lmbAdminLogout:hover {
          transform: translateY(-1px);
          background: #000;
        }

        .lmbAdminContent {
          display: flex;
          flex-direction: column;
          gap: 22px;
          min-width: 0;
          padding-bottom: 12px;
        }

        .lmbAdminMobileBottomNav {
          display: none;
        }

        @media (max-width: 1180px) {
          .lmbAdminLayout {
            grid-template-columns: 250px minmax(0, 1fr);
          }

          .lmbAdminSidebar {
            padding: 20px 14px;
          }

          .lmbAdminMain {
            padding: 22px;
          }

          .lmbAdminTopbar {
            align-items: flex-start;
          }

          .lmbAdminUserActions {
            flex-direction: column;
            align-items: flex-end;
          }

          .lmbAdminUserBox {
            max-width: 240px;
          }

          .lmbAdminUserEmail {
            max-width: 165px;
          }
        }

        @media (max-width: 900px) {
          .lmbAdminLayout {
            display: block;
            min-height: 100vh;
            padding-bottom: 86px;
          }

          .lmbAdminSidebar {
            display: none;
          }

          .lmbAdminMain {
            padding: 14px;
          }

          .lmbAdminMobileHeader {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            position: sticky;
            top: 0;
            z-index: 40;
            margin: -14px -14px 14px;
            padding: 12px 14px;
            background:
              radial-gradient(circle at top left, rgba(200,169,106,0.16), transparent 34%),
              linear-gradient(180deg, #111111 0%, #201d17 100%);
            border-bottom: 1px solid rgba(255,255,255,0.08);
            box-shadow: 0 14px 32px rgba(0,0,0,0.14);
          }

          .lmbAdminMobileBrand {
            display: flex;
            align-items: center;
            gap: 10px;
            min-width: 0;
            color: #fff;
          }

          .lmbAdminMobileMark {
            width: 36px;
            height: 36px;
            border-radius: 13px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, ${colors.gold}, ${colors.goldDark});
            color: #111;
            font-size: 12px;
            font-weight: 950;
            flex-shrink: 0;
          }

          .lmbAdminMobileBrandTitle {
            font-size: 14px;
            font-weight: 950;
            letter-spacing: 0.075em;
            line-height: 1.1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .lmbAdminMobileBrandSub {
            margin-top: 3px;
            font-size: 10px;
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

          .lmbAdminTopbar {
            border-radius: 24px;
            padding: 18px;
            display: grid;
            grid-template-columns: 1fr;
            gap: 16px;
            margin-bottom: 16px;
          }

          .lmbAdminKicker {
            font-size: 10.5px;
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

          .lmbAdminUserBox {
            max-width: none;
            width: 100%;
            box-sizing: border-box;
          }

          .lmbAdminUserEmail {
            max-width: none;
          }

          .lmbAdminLogout {
            display: none;
          }

          .lmbAdminContent {
            gap: 16px;
          }

          .lmbAdminMobileBottomNav {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 7px;
            position: fixed;
            left: 10px;
            right: 10px;
            bottom: 10px;
            z-index: 90;
            padding: 8px;
            border-radius: 24px;
            background: rgba(17,17,17,0.94);
            border: 1px solid rgba(255,255,255,0.10);
            box-shadow: 0 18px 48px rgba(0,0,0,0.26);
            backdrop-filter: blur(14px);
            -webkit-backdrop-filter: blur(14px);
          }

          .lmbAdminMobileNavButton {
            min-width: 0;
            min-height: 54px;
            border-radius: 18px;
            border: 1px solid transparent;
            background: transparent;
            color: rgba(255,255,255,0.66);
            font-size: 11px;
            font-weight: 900;
            display: grid;
            align-items: center;
            justify-items: center;
            gap: 4px;
            cursor: pointer;
            padding: 6px 4px;
          }

          .lmbAdminMobileNavButton span:first-child {
            font-size: 18px;
            line-height: 1;
            color: #d8c391;
          }

          .lmbAdminMobileNavButton.isActive {
            background: rgba(200,169,106,0.18);
            color: #fff;
            border-color: rgba(200,169,106,0.35);
          }
        }

        @media (max-width: 430px) {
          .lmbAdminMain {
            padding: 12px;
          }

          .lmbAdminMobileHeader {
            margin: -12px -12px 12px;
            padding: 11px 12px;
          }

          .lmbAdminMobileBrandTitle {
            font-size: 13px;
          }

          .lmbAdminMobileLogout {
            font-size: 11.5px;
            padding: 8px 10px;
          }

          .lmbAdminTopbar {
            padding: 16px;
            border-radius: 22px;
          }

          .lmbAdminTitle {
            font-size: 23px;
          }

          .lmbAdminUserBox {
            font-size: 13px;
          }

          .lmbAdminMobileBottomNav {
            left: 8px;
            right: 8px;
            bottom: 8px;
            border-radius: 22px;
            gap: 5px;
          }

          .lmbAdminMobileNavButton {
            min-height: 51px;
            border-radius: 16px;
            font-size: 10.5px;
          }
        }
      `}</style>

      <div className="lmbAdminLayout">
        <aside className="lmbAdminSidebar">
          <div className="lmbAdminBrandCard">
            <div className="lmbAdminBrand">
              <div className="lmbAdminBrandMark">LMB</div>
              <div className="lmbAdminBrandText">
                <div className="lmbAdminBrandTitle">LET ME BOWL</div>
                <div className="lmbAdminBrandSub">Adminbereich</div>
              </div>
            </div>
          </div>

          <div className="lmbAdminNavLabel">Navigation</div>

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
            <div className="lmbAdminHelpBox">
              <div className="lmbAdminHelpTitle">Portal-Zentrale</div>
              Verwalte Firmenkunden, Bestellungen, Rechnungen und interne Abläufe
              zentral im Let Me Bowl Portal.
            </div>
          </div>
        </aside>

        <main className="lmbAdminMain">
          <div className="lmbAdminMobileHeader">
            <div className="lmbAdminMobileBrand">
              <div className="lmbAdminMobileMark">LMB</div>
              <div>
                <div className="lmbAdminMobileBrandTitle">LET ME BOWL</div>
                <div className="lmbAdminMobileBrandSub">Adminbereich</div>
              </div>
            </div>

            <a href="/logout" className="lmbAdminMobileLogout">
              Abmelden
            </a>
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
              <div className="lmbAdminUserBox">
                <span className="lmbAdminAvatar">{getInitials(user)}</span>
                <span className="lmbAdminUserText">
                  <span className="lmbAdminUserRole">Admin</span>
                  <span className="lmbAdminUserEmail">
                    {user?.email || "Admin"}
                  </span>
                </span>
              </div>

              <a href="/logout" className="lmbAdminLogout">
                Abmelden
              </a>
            </div>
          </div>

          <div className="lmbAdminContent">{children}</div>

          <nav className="lmbAdminMobileBottomNav">
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
                <span>{item.shortLabel}</span>
              </button>
            ))}
          </nav>
        </main>
      </div>
    </>
  );
}