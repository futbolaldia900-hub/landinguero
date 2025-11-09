// meta-purchase.js
import crypto from "crypto";
import fetch from "node-fetch";

// ⚙️ Configuración
const ACCESS_TOKEN = "TU_ACCESS_TOKEN_DE_META"; // <- cámbialo
const PIXEL_ID = "TU_PIXEL_ID"; // <- cámbialo
const TEST_EVENT_CODE = "TEST14318"; // <- tu código de test actual

// 🔒 Helper: SHA256 hash para normalizar datos personales
function sha256(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

// 🔧 Endpoint principal
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { firstName, lastName, phone, amount, event_time } = req.body;

    // Validaciones básicas
    if (!firstName || !lastName || !phone || !amount) {
      return res.status(400).json({ error: "Faltan datos obligatorios" });
    }

    // ⏱️ Timestamp UNIX (si no viene uno del form)
    const unixTime = event_time
      ? Math.floor(new Date(event_time).getTime() / 1000)
      : Math.floor(Date.now() / 1000);

    // 🧩 Estructura del evento de compra
    const eventData = {
      data: [
        {
          event_name: "Purchase",
          event_time: unixTime,
          action_source: "website",
          user_data: {
            fn: sha256(firstName.toLowerCase().trim()),
            ln: sha256(lastName.toLowerCase().trim()),
            ph: sha256(phone.replace(/\s|\+|-/g, "")), // hash del teléfono
            country: sha256("ar"), // 🇦🇷 Argentina (hash obligatorio)
          },
          custom_data: {
            currency: "ARS",
            value: parseFloat(amount),
          },
          event_source_url: "https://tusitio.com/checkout", // opcional
          test_event_code: TEST_EVENT_CODE,
        },
      ],
    };

    // 🚀 Envío a Meta CAPI
    const metaResponse = await fetch(
      `https://graph.facebook.com/v18.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      }
    );

    const metaResult = await metaResponse.json();

    // ✅ Respuesta hacia el admin
    return res.status(200).json({
      status: "ok",
      sent_data: eventData,
      metaResponse: metaResult,
      fbtrace_id: metaResult.fbtrace_id || "sin_fbtrace_id",
    });
  } catch (err) {
    console.error("Error en Meta Purchase:", err);
    return res.status(500).json({
      error: "Error interno del servidor",
      details: err.message,
    });
  }
}
