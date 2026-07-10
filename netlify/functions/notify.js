// netlify/functions/notify.js
//
// CinetPay appelle cette URL en arrière-plan après chaque paiement, même si
// l'utilisatrice ferme l'app. Par sécurité, on NE FAIT JAMAIS confiance aux
// données reçues ici : on récupère seulement le transaction_id, puis on
// interroge nous-mêmes l'API CinetPay pour connaître le vrai statut.
//
// URL à donner à CinetPay (déjà passée automatiquement via notify_url) :
//   https://<ton-site>.netlify.app/api/notify

import { getStore } from "@netlify/blobs";

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Méthode non autorisée", { status: 405 });
  }

  let transaction_id;
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = await req.json();
    transaction_id = body.cpm_trans_id || body.transaction_id;
  } else {
    const formData = await req.formData();
    transaction_id = formData.get("cpm_trans_id") || formData.get("transaction_id");
  }

  if (!transaction_id) {
    return new Response("transaction_id manquant", { status: 400 });
  }

  const store = getStore("lueur-transactions");
  const existing = await store.get(transaction_id, { type: "json" });

  // Si on a déjà validé cette transaction, on ne refait pas le travail (anti-rejeu).
  if (existing?.status === "ACCEPTED") {
    return new Response("OK", { status: 200 });
  }

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

  await store.setJSON(transaction_id, {
    ...(existing || {}),
    status,
    verifiedAt: Date.now(),
    paymentMethod: checkData?.data?.payment_method,
  });

  return new Response("OK", { status: 200 });
};
