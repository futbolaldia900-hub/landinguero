// /api/meta-purchase.js
import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Método no permitido" });
  }

  const { phone, firstName, lastName, email, amount, event_time, event_id } = req.body;

  if (!amount || (!phone && !email)) {
    return res.status(400).json({ message: "Faltan datos (teléfono o monto)" });
  }

  const PIXEL_ID = process.env.META_PIXEL_ID;
  const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

  if (!PIXEL_ID || !ACCESS_TOKEN) {
    return res.status(500).json({ message: "Variables de entorno no configuradas" });
  }

  try {
    // 🔒 Hash de datos personales (SHA256)
    const hashedPhone = phone
      ? crypto.createHash("sha256").update(phone.trim()).digest("hex")
      : null;

    const hashedEmail = email
      ? crypto.createHash("sha256").update(email.trim().toLowerCase()).digest("hex")
      : null;

    const hashedFirstName = firstName
      ? crypto.createHash("sha256").update(firstName.trim().toLowerCase()).digest("hex")
      : null;

    const hashedLastName = lastName
      ? crypto.createHash("sha256").update(lastName.trim().toLowerCase()).digest("hex")
      : null;

    // 🧾 Cuerpo del evento enviado a Meta
    const payload = {
      data: [
        {
          event_name: "Purchase",
          event_time: event_time
            ? Math.floor(new Date(event_time).getTime() / 1000)
            : Math.floor(Date.now() / 1000),
          event_id: event_id || `manual_${Date.now()}`,
          user_data: {
            ph: hashedPhone ? [hashedPhone] : [],
            em: hashedEmail ? [hashedEmail] : [],
            fn: hashedFirstName ? [hashedFirstName] : [],
            ln: hashedLastName ? [hashedLastName] : [],
            country: ["ar"], // todos los compradores desde Argentina
          },
          custom_data: {
            currency: "ARS",
            value: parseFloat(amount),
          },
          action_source: "website",
        },
      ],
      // ⚙️ Código de prueba: quitar o comentar al pasar a producción
      test_event_code: "TEST14318",
    };

    // 🚀 Envío a Meta Conversion API
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    // 📬 Respuesta al panel admin
    return res.status(200).json({
      success: true,
      metaResponse: data,
      sent_payload: payload,
    });
  } catch (error) {
    console.error("❌ Error enviando evento a Meta:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
