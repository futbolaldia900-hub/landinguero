import crypto from "crypto";
import fetch from "node-fetch";

const ACCESS_TOKEN = "EAALLZCqbPuaUBP7ZCIZAUZB3iSd7jrCeBASeHhhQ5aiOhXWL2CE6ehfipQmgnpPjPghfRQPL4WOvoqGxMlIwhwTJzRy9wXXM2fZAvqffzMUtInWHDkEwScc2iTHUnt96Nqk1CCLLEZAW33yY2ZA7O1ZCwZBY1bl2kNbTiNpNSQJRDYk8iLiO6qMZCE5ol2ckpN4jezaAZDZD";
const PIXEL_ID = "1946841772846486";


// helper: hash
function sha256(s) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { email, phone, amount, event_time } = req.body;

    if (!email || !phone || !amount) {
      return res.status(400).json({ error: "Faltan datos obligatorios" });
    }

    const unixTime = event_time
      ? Math.floor(new Date(event_time).getTime() / 1000)
      : Math.floor(Date.now() / 1000);

    const data = {
      data: [
        {
          event_name: "Purchase",
          event_time: unixTime,
          action_source: "website",
          user_data: {
            em: sha256(email.toLowerCase().trim()),
            ph: sha256(phone.replace(/\s|\+|-/g, "")),
          },
          custom_data: {
            currency: "ARS",
            value: parseFloat(amount),
        },
      ],
    };

    const metaRes = await fetch(
      `https://graph.facebook.com/v18.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );

    const metaJson = await metaRes.json();

    return res.status(200).json({
      status: "ok",
      metaResponse: metaJson,
      fbtrace_id: metaJson.fbtrace_id || null,
    });
  } catch (err) {
    console.error("Error Meta Purchase:", err);
    return res.status(500).json({
      error: "Error interno del servidor",
      details: err.message,
    });
  }
}
