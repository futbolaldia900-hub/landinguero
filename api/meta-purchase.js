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

    // 2. Recibir el Payload COMPLETO (puede tener campos vacíos)
    const payload = req.body || {};
    const { 
      nombre, 
      apellido, 
      phone, 
      amount, 
      event_time,
      event_id, // Puede estar vacío
      fbp,      // Puede estar vacío
      fbc,      // Puede estar vacío
      click_id  // Para logging
    } = payload;

    // 3. Validación MÍNIMA (solo datos del usuario)
    if (!nombre || !apellido || !phone || !amount) {
      return res.status(400).json({ 
        success: false, 
        error: "Faltan datos obligatorios: nombre, apellido, phone, amount" 
      });
    }

    // 4. Hashear datos del usuario (Siempre se hace)
    const phoneDigits = String(phone).replace(/\D/g, "");
    if (phoneDigits.length < 7) {
      return res.status(400).json({ success: false, error: "Teléfono inválido" });
    }
    const hash = (str) =>
      crypto.createHash("sha256").update(String(str).trim().toLowerCase()).digest("hex");

    const hashedPhone = hash(phoneDigits);
    const hashedName = hash(nombre);
    const hashedSurname = hash(apellido);

    // 5. Lógica de Modos (El "cerebro" nuevo)
    const isModoAnuncio = fbp && event_id;
    let final_event_id;
    let final_event_time;
    let user_data_payload;

    if (isModoAnuncio) {
      // --- MODO ANUNCIO (EMQ 10/10) ---
      final_event_id = event_id; // Usamos el event_id del form
      
      // Usar hora del form, o generar una si está vacía
      if (event_time) {
        const d = new Date(event_time);
        final_event_time = !isNaN(d.getTime()) ? Math.floor(d.getTime() / 1000) : Math.floor(Date.now() / 1000);
      } else {
        final_event_time = Math.floor(Date.now() / 1000);
      }

      // Payload de EMQ completo
      user_data_payload = {
        ph: [hashedPhone],
        fn: [hashedName],
        ln: [hashedSurname],
        fbp: fbp,
        fbc: fbc || undefined // Enviar undefined si fbc está vacío
      };

    } else {
      // --- MODO OFFLINE (EMQ 7/10) ---
      // Generamos un event_id en el servidor para evitar duplicados
      final_event_id = `purchase_offline_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      
      // La compra se registra AHORA
      final_event_time = Math.floor(Date.now() / 1000);

      // Payload de EMQ simple
      user_data_payload = {
        ph: [hashedPhone],
        fn: [hashedName],
        ln: [hashedSurname]
      };
    }

    // 6. Obtener variables de entorno (Sin cambios)
    const PIXEL_ID = process.env.META_PIXEL_ID;
    const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
    if (!PIXEL_ID || !ACCESS_TOKEN) {
      return res.status(500).json({ success: false, error: "Variables de entorno META no configuradas" });
    }

    // 7. Construir el Body Dinámico para CAPI
    const eventBody = {
      data: [
        {
          event_name: "Purchase",
          event_time: final_event_time,
          event_id: final_event_id,
          user_data: user_data_payload, // <-- Aquí va el payload dinámico
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

    // 9. Logging
    console.log(
      `[meta-purchase] Modo: ${isModoAnuncio ? 'Anuncio' : 'Offline'}`, 
      "event_id:", final_event_id, 
      "click_id:", click_id || 'N/A', 
      "metaResp:", JSON.stringify(metaJson)
    );
    
    return res.status(200).json({ success: true, metaResponse: metaJson, event_id: final_event_id });

  } catch (error) {
    console.error("meta-purchase error:", error);
    return res.status(500).json({ success: false, error: error?.message || "error desconocido" });
  }
}
