import crypto from "crypto";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ success: false, message: "Método no permitido" });
    }

    // Autenticación simple: Bearer token en header
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.split(" ")[1] : null;
    if (!token || token !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ success: false, error: "No autorizado" });
    }

    const payload = req.body || {};
    const { nombre, apellido, phone, amount, event_time } = payload;

    if (!nombre || !apellido || !phone || !amount) {
      return res.status(400).json({ success: false, error: "Faltan datos obligatorios" });
    }

    // Normalizar teléfono: conservar solo dígitos (ej: 54911...)
    const phoneDigits = String(phone).replace(/\D/g, "");
    if (phoneDigits.length < 7) {
      return res.status(400).json({ success: false, error: "Teléfono inválido" });
    }

    // Normalizar texto y hashear (SHA-256 hex lowercase)
    const hash = (str) =>
      crypto.createHash("sha256").update(String(str).trim().toLowerCase()).digest("hex");

    const hashedPhone = hash(phoneDigits);
    const hashedName = hash(nombre);
    const hashedSurname = hash(apellido);

    // event_time: acepta datetime-local o timestamp; si no, usa now
    let eventTimeUnix = Math.floor(Date.now() / 1000);
    if (event_time) {
      const d = new Date(event_time);
      if (!isNaN(d.getTime())) {
        eventTimeUnix = Math.floor(d.getTime() / 1000);
      }
    }

    // event_id único (útil para evitar duplicados)
    const eventId = `purchase_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    const PIXEL_ID = process.env.META_PIXEL_ID;
    const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

    if (!PIXEL_ID || !ACCESS_TOKEN) {
      return res.status(500).json({ success: false, error: "Variables de entorno META no configuradas" });
    }

    // Construir body según CAPI
    const eventBody = {
      data: [
        {
          event_name: "Purchase",
          event_time: eventTimeUnix,
          event_id: eventId,
          user_data: {
            ph: [hashedPhone],
            fn: [hashedName],
            ln: [hashedSurname]
            // podés añadir em: [hashedEmail] si lo tenés
          },
          custom_data: {
            currency: "ARS",
            value: parseFloat(amount)
          },
          action_source: "chat"
        }
      ]
    };

    // Enviar a Meta Graph API
    const graphUrl = `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;

    const metaResp = await fetch(graphUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventBody)
    });

    const metaJson = await metaResp.json();

    // Log interno (console) para auditoría
    console.log("[meta-purchase] event_id:", eventId, "amount:", amount, "phone:", phoneDigits, "metaResp:", JSON.stringify(metaJson));

    // Intento de logging a archivo para debug (no persistente en serverless)
    try {
      const log = {
        ts: new Date().toISOString(),
        event_id: eventId,
        nombre: nombre,
        apellido: apellido,
        phone: phoneDigits,
        amount: amount,
        meta: metaJson
      };
      // /tmp es efímero; sólo para debugging local o temporal en serverless
      // No confiés en este archivo como almacenamiento permanente.
      const fs = await import("fs/promises");
      const path = "/tmp/purchase_log.json";
      try {
        const prev = JSON.parse(await fs.readFile(path, "utf8"));
        prev.push(log);
        await fs.writeFile(path, JSON.stringify(prev, null, 2));
      } catch {
        await fs.writeFile(path, JSON.stringify([log], null, 2));
      }
    } catch (err) {
      // No frenar por errores de logging
      console.warn("No se pudo escribir log a /tmp:", err?.message || err);
    }

    return res.status(200).json({ success: true, metaResponse: metaJson, event_id: eventId });
  } catch (error) {
    console.error("meta-purchase error:", error);
    return res.status(500).json({ success: false, error: error?.message || "error desconocido" });
  }
}
