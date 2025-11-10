import crypto from "crypto";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ success: false, message: "Método no permitido" });
    }

    // 1. Autenticación (Sin cambios)
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.split(" ")[1] : null;
    if (!token || token !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ success: false, error: "No autorizado" });
    }

    // 2. Recibir el Payload COMPLETO desde admin.html
    const payload = req.body || {};
    const { 
        nombre, 
        apellido, 
        phone, 
        amount, 
        event_time,
        event_id, // CAMBIO: Recibido desde el form
        fbp,      // CAMBIO: Recibido desde el form
        fbc,      // CAMBIO: Recibido desde el form
        click_id  // CAMBIO: Recibido para logging
    } = payload;

    // 3. Validación de campos obligatorios
    // fbc es opcional, fbp es MUY recomendado, event_id es obligatorio
    if (!nombre || !apellido || !phone || !amount || !event_id || !fbp) {
      return res.status(400).json({ 
            success: false, 
            error: "Faltan datos obligatorios. Se requiere: nombre, apellido, phone, amount, event_id, fbp" 
        });
    }

    // 4. Hashear solo los datos del usuario (Nombre, Teléfono)
    const phoneDigits = String(phone).replace(/\D/g, "");
    if (phoneDigits.length < 7) {
      return res.status(400).json({ success: false, error: "Teléfono inválido" });
    }

    const hash = (str) =>
      crypto.createHash("sha256").update(String(str).trim().toLowerCase()).digest("hex");

    const hashedPhone = hash(phoneDigits);
    const hashedName = hash(nombre);
    const hashedSurname = hash(apellido);

    // 5. Preparar hora del evento (Sin cambios)
    let eventTimeUnix = Math.floor(Date.now() / 1000);
    if (event_time) {
      const d = new Date(event_time);
      if (!isNaN(d.getTime())) {
        eventTimeUnix = Math.floor(d.getTime() / 1000);
      }
    }

    // 6. Obtener variables de entorno (Sin cambios)
    const PIXEL_ID = process.env.META_PIXEL_ID;
    const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

    if (!PIXEL_ID || !ACCESS_TOKEN) {
      return res.status(500).json({ success: false, error: "Variables de entorno META no configuradas" });
    }

    // 7. Construir el NUEVO Body para CAPI (La fusión clave)
    const eventBody = {
      data: [
        {
          event_name: "Purchase",
          event_time: eventTimeUnix,
            event_id: event_id, // CAMBIO: Se usa el event_id manual para deduplicación
          user_data: {
              // --- Datos hasheados ---
            ph: [hashedPhone],
            fn: [hashedName],
            ln: [hashedSurname],
              
              // --- Datos de navegador (en crudo) ---
              // CAMBIO: Se pasan sin hashear, como espera Meta
              fbp: fbp, 
              fbc: fbc || undefined // Enviar undefined si está vacío
          },
          custom_data: {
            currency: "ARS",
            value: parseFloat(amount)
          },
          action_source: "chat"
        }
      ]
    };

    // 8. Enviar a Meta Graph API (Sin cambios)
    const graphUrl = `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;

    const metaResp = await fetch(graphUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventBody)
    });

    const metaJson = await metaResp.json();

    // 9. Logging (Mejorado para incluir click_id)
    console.log(
      "[meta-purchase] event_id:", event_id, 
      "click_id:", click_id, 
      "amount:", amount, 
      "metaResp:", JSON.stringify(metaJson)
    );
    
    // (El logging a /tmp se mantiene igual, no es necesario cambiarlo)

    return res.status(200).json({ success: true, metaResponse: metaJson, event_id: event_id });

  } catch (error) {
    console.error("meta-purchase error:", error);
    return res.status(500).json({ success: false, error: error?.message || "error desconocido" });
  }
}
