// /api/meta-purchase.js
import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Método no permitido" });
  }

  const { firstName, lastName, phone, amount, event_time } = req.body;

  if (!amount || !phone || !firstName || !lastName) {
    return res.status(400).json({ message: "Faltan datos requeridos" });
  }

  const PIXEL_ID = process.env.META_PIXEL_ID;
  const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

  if (!PIXEL_ID || !ACCESS_TOKEN) {
    return res.status(500).json({ message: "Faltan variables de entorno" });
  }

  try {
    // Hash obligatorio para privacidad según normas de Meta
    const hashedPhone = crypto.createHash("sha256").update(phone.trim()).digest("hex");
    const hashedFirst = crypto.createHash("sha256").update(firstName.trim().toLowerCase()).digest("hex");
    const hashedLast = crypto.createHash("sha256").update(lastName.trim().toLowerCase()).digest("hex");

    const payload = {
      data: [
        {
          event_name: "Purchase",
          event_time: event_time
            ? Math.floor(new Date(event_time).getTime() / 1000)
            : Math.floor(Date.now() / 1000),
          event_id: `manual_${Date.now()}`,
          action_source: "website",
          user_data: {
            fn: [hashedFirst],
            ln: [hashedLast],
            ph: [hashedPhone],
          },
          custom_data: {
            currency: "ARS",
            value: parseFloat(amount),
          },
        },
      ],
    };

    // Enviar evento a Meta
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();
    return res.status(200).json({ success: true, metaResponse: data, payload });
  } catch (error) {
    console.error("Error al enviar evento a Meta:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
