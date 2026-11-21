/** Official European Commission VIES public REST endpoint. No third-party credit scoring. */
const VIES_URL = "https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number";
const EU_CODES = new Set("AT BE BG CY CZ DE DK EE EL ES FI FR HR HU IE IT LT LU LV MT NL PL PT RO SE SI SK XI".split(" "));

/** Canonicalize VAT ID but never repair missing/ambiguous country codes silently. */
export function normalizeVatId(raw) {
  if (typeof raw !== "string" || raw.length > 48) return null;
  const normalized = raw.toUpperCase().replace(/[\s.\-]/g, "");
  const countryCode = normalized.slice(0, 2) === "GR" ? "EL" : normalized.slice(0, 2);
  const vatNumber = normalized.slice(2);
  if (!EU_CODES.has(countryCode) || !/^[A-Z0-9]{2,14}$/.test(vatNumber)) return null;
  return { countryCode, vatNumber, complete: countryCode + vatNumber };
}

/** Return only verifiable status plus limited non-sensitive provenance. */
export async function checkViesVat(id, client = fetch) {
  const vat = normalizeVatId(id);
  if (!vat) return { status: "invalid_format", reference: null };
  try {
    const res = await client(VIES_URL, {
      method: "POST", redirect: "error", cache: "no-store",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ countryCode: vat.countryCode, vatNumber: vat.vatNumber }),
      signal: AbortSignal.timeout(9500),
    });
    if (!res.ok) return { status: "unavailable", reference: null };
    const json = await res.json();
    if (!json || typeof json !== "object" || Array.isArray(json) ||
        json.actionSucceed === false ||
        Array.isArray(json.errorWrappers) && json.errorWrappers.length > 0 ||
        typeof json.userError === "string" && !["VALID","INVALID",""].includes(json.userError) ||
        typeof json.valid !== "boolean") return { status: "unavailable", reference: null };
    // Reject a mismatching response rather than associating a different VAT number to the customer.
    if (json.countryCode && json.countryCode !== vat.countryCode ||
        json.vatNumber && String(json.vatNumber).replace(/[\s.\-]/g,"") !== vat.vatNumber)
      return { status: "unavailable", reference: null };
    return {
      status: json.valid ? "valid" : "invalid",
      reference: typeof json.requestIdentifier === "string" && /^[a-zA-Z0-9/._:-]{1,150}$/.test(json.requestIdentifier)
        ? json.requestIdentifier : null,
    };
  } catch {
    return { status: "unavailable", reference: null };
  }
}
