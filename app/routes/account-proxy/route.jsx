export const loader = async () => {
  return new Response("OK");
};

export default function AccountProxyPage() {
  return (
    <div style={{ padding: 40 }}>
      <h1>Proxy funktioniert 🚀</h1>
    </div>
  );
}