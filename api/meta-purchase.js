// /api/meta-purchase.js
import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Método no permitido" });
  }

  const { nombre, apellido, phone, amount, event_time, event_id } = req.body;

  if (!nombre || !apellido || !phone || !amount) {
    return res.status(400).json({ message: "Faltan datos obligatorios" });
  }

  const PIXEL_ID = process.env.META_PIXEL_ID;
  const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

  if (!PIXEL_ID || !ACCESS_TOKEN) {
    return res.status(500).json({ message: "Variables de entorno no configuradas" });
  }

  try {
    // Encriptar los datos personales (requisito de Meta)
    const hashedPhone = crypto.createHash("sha256").update(phone.trim()).digest("hex");
    const hashedName = crypto.createHash("sha256").update(nombre.trim().toLowerCase()).digest("hex");
    const hashedSurname = crypto.createHash("sha256").update(apellido.trim().toLowerCase()).digest("hex");

    const payload = {
      data: [
        {
          event_name: "Purchase",
          event_time: event_time
            ? Math.floor(new Date(event_time).getTime() / 1000)
            : Math.floor(Date.now() / 1000),
          event_id: event_id || `manual_${Date.now()}`,
          user_data: {
            ph: [hashedPhone],
            fn: [hashedName],
            ln: [hashedSurname],
          },
          custom_data: {
            currency: "ARS",
            value: parseFloat(amount),
          },
          action_source: "chat",
        },
      ],
    };

    const response = await fetch(
      `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();
    return res.status(200).json({ success: true, metaResponse: data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
