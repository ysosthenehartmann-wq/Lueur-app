// netlify/functions/create-payment.js
//
// Reçoit { plan: 'monthly' | 'lifetime', customer: { name, phone } } depuis l'app,
// initialise une transaction CinetPay, et renvoie l'URL de paiement à ouvrir.
//
// Variables d'environnement à configurer dans Netlify (Site settings > Environment variables) :
//   CINETPAY_APIKEY   -> ta clé API (backoffice CinetPay > Intégration)
//   CINETPAY_SITE_ID  -> ton identifiant de site marchand
//
// URL exposée si tu utilises le netlify.toml fourni : /api/create-payment

import { getStore } from "@netlify/blobs";

const PRICES = {
  monthly: { amount: 1500, description: "Lueur - Abonnement mensuel" },
  lifetime: { amount: 12000, description: "Lueur - Accès illimité" },
};

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Méthode non autorisée", { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const { plan, customer } = body || {};
  const priceInfo = PRICES[plan];
  if (!priceInfo) {
    return Response.json({ error: "Plan inconnu" }, { status: 400 });
  }

  const siteUrl = process.env.URL || "http://localhost:8888";
  const transaction_id = `lueur_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

  const payload = {
    apikey: process.env.CINETPAY_APIKEY,
    site_id: process.env.CINETPAY_SITE_ID,
    transaction_id,
    amount: priceInfo.amount,
    currency: "XOF",
    description: priceInfo.description,
    customer_name: customer?.name || "Utilisatrice",
    customer_surname: "Lueur",
    customer_email: `client+${transaction_id}@lueur.app`,
    customer_phone_number: customer?.phone || "0000000000",
    customer_address: "Abidjan",
    customer_city: "Abidjan",
    customer_country: "CI",
    customer_state: "CI",
    customer_zip_code: "00225",
    notify_url: `${siteUrl}/api/notify`,
    return_url: `${siteUrl}/?transaction_id=${transaction_id}`,
    channels: "ALL",
    metadata: plan,
  };

  const cinetpayRes = await fetch("https://api-checkout.cinetpay.com/v2/payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await cinetpayRes.json();

  if (data.code !== "201") {
    return Response.json({ error: data.description || data.message || "Erreur CinetPay" }, { status: 400 });
  }

  // On enregistre la transaction comme "pending" pour pouvoir la vérifier plus tard.
  const store = getStore("lueur-transactions");
  await store.setJSON(transaction_id, { plan, amount: priceInfo.amount, status: "PENDING", createdAt: Date.now() });

  return Response.json({ payment_url: data.data.payment_url, transaction_id });
};
