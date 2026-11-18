export default function PortalBrand({ subtitle = "Kundenkonto", href = "https://letmebowl-catering.de" }) {
  return <a className="lmb-portal-brand" href={href}>
    <img src="/brand/let-me-bowl-logo.webp" alt="Let Me Bowl" width="72" height="60" />
    <span><strong>Let Me Bowl</strong><small>{subtitle}</small></span>
  </a>;
}
