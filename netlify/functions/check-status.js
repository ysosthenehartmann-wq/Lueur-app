// netlify/functions/check-status.js
//
// Appelée par l'app quand l'utilisatrice revient du guichet CinetPay
// (?transaction_id=...). Renvoie le statut vérifié, jamais un statut
// deviné côté client.
//
// URL exposée : /api/check-status?transaction_id=...

import { getStore } from "@netlify/blobs";

export default async (req) => {
  const url = new URL(req.url);
  const transaction_id = url.searchParams.get("transaction_id");
  if (!transaction_id) {
    return Response.json({ error: "transaction_id manquant" }, { status: 400 });
  }

  const store = getStore("lueur-transactions");
  let record = await store.get(transaction_id, { type: "json" });

  // Si le webhook notify n'est pas encore passé, on vérifie nous-mêmes en direct.
  if (!record || record.status === "PENDING") {
    const checkRes = await fetch("https://api-checkout.cinetpay.com/v2/payment/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transaction_id,
        site_id: process.env.CINETPAY_SITE_ID,
        apikey: process.env.CINETPAY_APIKEY,
      }),
    });
    const checkData = await checkRes.json();
    const status = checkData?.data?.status || "REFUSED";
    record = { ...(record || {}), status, verifiedAt: Date.now() };
    await store.setJSON(transaction_id, record);
  }

  return Response.json({ status: record.status, plan: record.plan });
};
