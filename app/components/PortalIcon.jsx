export default function PortalIcon({ name }) {
  const paths = {
    home: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    orders: <><path d="M8 4H5v17h14V4h-3" /><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M8 11h8M8 15h8" /></>,
    billing: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h4" /></>,
    address: <><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    cost: <><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M8 7V3h8v4M3 13h18M10 13v3h4v-3" /></>,
    invoice: <><path d="M6 3h9l4 4v14H6Z" /><path d="M14 3v5h5M9 12h7M9 16h5" /></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3" /></>,
    logout: <><path d="M9 4H4v16h5M8 12h13m-5-5 5 5-5 5" /></>,
    plus: <path d="M12 4v16M4 12h16" />,
    users: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M17 5a3 3 0 0 1 0 6M21 21v-3a6 6 0 0 0-3-5" /></>,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  };
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.home}</svg>;
}
