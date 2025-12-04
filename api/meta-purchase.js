import crypto from "crypto";

// --- FUNCIÓN AUXILIAR: Normalizar Teléfonos Argentinos ---
function normalizeArgentinePhone(rawPhone) {
  let p = String(rawPhone).replace(/\D/g, "");
  
  if (p.startsWith("549")) return p;
  
  if (p.startsWith("54") && !p.startsWith("549") && p.length >= 12) {
     return "549" + p.substring(2);
  }

  if (p.startsWith("0")) p = p.substring(1);
  
  if (p.length === 10) {
    return "549" + p;
  }

  return p;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ success: false, message: "Método no permitido" });
    }

    // 1. Autenticación
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.split(" ")[1] : null;
    if (!token || token !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ success: false, error: "No autorizado" });
    }

    // 2. Recibir Payload
    const payload = req.body || {};
    let { 
      nombre, 
      apellido, 
      phone, 
      amount, 
      event_time,
      event_id, 
      fbp,       
      fbc,       
      click_id 
    } = payload;

    // --- 🛡️ LIMPIEZA DE ESPACIOS ---
    if (fbc) fbc = String(fbc).trim();
    if (fbp) fbp = String(fbp).trim();
    if (event_id) event_id = String(event_id).trim();
    if (click_id) click_id = String(click_id).trim();

    // 3. Validación Mínima
    if (!nombre || !apellido || !phone || !amount) {
      return res.status(400).json({ 
        success: false, 
        error: "Faltan datos obligatorios: nombre, apellido, phone, amount" 
      });
    }

    // 4. Normalizar y Hashear Datos
    const normalizedPhone = normalizeArgentinePhone(phone);
    const normalizedName = String(nombre).trim().toLowerCase();
    const normalizedSurname = String(apellido).trim().toLowerCase();

    const hash = (str) => crypto.createHash("sha256").update(str).digest("hex");

    const hashedPhone = hash(normalizedPhone);
    const hashedName = hash(normalizedName);
    const hashedSurname = hash(normalizedSurname);

    // 5. Lógica de Modos (Para definir user_data)
    // Aceptamos Modo Anuncio si hay event_id Y (fbp O fbc)
    const isModoAnuncio = event_id && (fbp || fbc);
    
    let final_event_id;
    let final_event_time;
    let user_data_payload;

    if (isModoAnuncio) {
      // --- MODO ANUNCIO (Tenemos datos de rastreo) ---
      final_event_id = event_id; 
      
      if (event_time) {
        const d = new Date(event_time);
        final_event_time = !isNaN(d.getTime()) ? Math.floor(d.getTime() / 1000) : Math.floor(Date.now() / 1000);
      } else {
        final_event_time = Math.floor(Date.now() / 1000);
      }

      user_data_payload = {
        ph: [hashedPhone],
        fn: [hashedName],
        ln: [hashedSurname],
        fbp: fbp || undefined,
        fbc: fbc || undefined 
      };

    } else {
      // --- MODO OFFLINE (Venta orgánica o sin datos de rastreo) ---
      final_event_id = `purchase_offline_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      final_event_time = Math.floor(Date.now() / 1000);

      user_data_payload = {
        ph: [hashedPhone],
        fn: [hashedName],
        ln: [hashedSurname]
      };
    }

    // 6. Variables de Entorno
    const PIXEL_ID = process.env.META_PIXEL_ID;
    const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
    
    if (!PIXEL_ID || !ACCESS_TOKEN) {
      return res.status(500).json({ success: false, error: "Faltan vars de entorno (META_PIXEL_ID o TOKEN)" });
    }

    // 7. Construir Body para Meta CAPI
    // CORRECCIÓN CRÍTICA APLICADA: action_source forzado a "system_generated"
    const eventBody = {
      data: [
        {
          event_name: "Purchase",
          event_time: final_event_time,
          event_id: final_event_id,
          user_data: user_data_payload,
          custom_data: {
            currency: "ARS",
            value: parseFloat(amount)
          },
          // ESTO SOLUCIONA EL CONFLICTO DE IP:
          action_source: "system_generated",
          event_source_url: undefined // No es necesario en system_generated
        }
      ]
    };

    // 8. Enviar a Meta
    const graphUrl = `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;
    const metaResp = await fetch(graphUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventBody)
    });

    const metaJson = await metaResp.json();

    // 9. Logging
    console.log(
      `[CAPI] Phone: ${normalizedPhone} | Mode: ${isModoAnuncio ? 'ANUNCIO (System Gen)' : 'OFFLINE'}`,
      `| FBP: ${fbp ? 'OK' : 'NO'} | FBC: ${fbc ? 'OK' : 'NO'}`,
      `| Meta Resp: ${metaJson.id ? 'OK' : JSON.stringify(metaJson)}`
    );
    
    return res.status(200).json({ success: true, metaResponse: metaJson, event_id: final_event_id });

  } catch (error) {
    console.error("meta-purchase error:", error);
    return res.status(500).json({ success: false, error: error?.message || "error desconocido" });
  }
}
