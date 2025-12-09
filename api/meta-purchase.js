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
    // Nota: Aceptamos test_event_code si viene del Sheet, pero si no viene, es PRODUCCIÓN.
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
      click_id,
      test_event_code 
    } = payload;

    // --- 🛡️ LIMPIEZA DE ESPACIOS ---
    if (fbc) fbc = String(fbc).trim();
    if (fbp) fbp = String(fbp).trim();
    if (event_id) event_id = String(event_id).trim();
    if (click_id) click_id = String(click_id).trim();
    if (test_event_code) test_event_code = String(test_event_code).trim();

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

    // 5. Lógica de Fecha
    let final_event_time = Math.floor(Date.now() / 1000);

    if (event_time) {
      const d = new Date(event_time);
      if (!isNaN(d.getTime())) {
        final_event_time = Math.floor(d.getTime() / 1000);
      } else {
        console.warn(`[WARN] Fecha inválida recibida: ${event_time}. Usando AHORA.`);
      }
    }

    // 6. Lógica de Modos (Anuncio vs Offline)
    const isModoAnuncio = event_id && (fbp || fbc);
    let final_event_id;
    let user_data_payload;

    if (isModoAnuncio) {
      // --- MODO ANUNCIO ---
      final_event_id = event_id; 
      
      user_data_payload = {
        ph: [hashedPhone],
        fn: [hashedName],
        ln: [hashedSurname],
        fbp: fbp || undefined,
        fbc: fbc || undefined 
      };

    } else {
      // --- MODO OFFLINE (Respaldo) ---
      final_event_id = `purchase_offline_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      
      user_data_payload = {
        ph: [hashedPhone],
        fn: [hashedName],
        ln: [hashedSurname]
      };
    }

    // 7. Variables de Entorno
    const PIXEL_ID = process.env.META_PIXEL_ID;
    const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
    
    if (!PIXEL_ID || !ACCESS_TOKEN) {
      return res.status(500).json({ success: false, error: "Faltan vars de entorno" });
    }

    // 8. Construir Body para Meta CAPI (PRODUCCIÓN - SYSTEM GENERATED)
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
          // VOLVEMOS A SYSTEM GENERATED COMO PEDISTE
          action_source: "system_generated", 
          event_source_url: undefined 
        }
      ]
    };

    // Solo agregamos modo test si AppsScript lo solicita explícitamente.
    // Como tu AppsScript ya no lo envía, esto se ignora (PRODUCCIÓN).
    if (test_event_code) {
        eventBody.test_event_code = test_event_code;
    }

    // 9. Enviar a Meta
    const graphUrl = `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;
    const metaResp = await fetch(graphUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventBody)
    });

    const metaJson = await metaResp.json();

    // 10. Logging
    console.log(
      `[CAPI PROD] Phone: ${normalizedPhone} | Amount: ${amount} | ID: ${final_event_id}`,
      `| Resp: ${metaJson.id ? 'OK' : 'ERROR'}`
    );
    
    if (metaJson.error) {
       return res.status(400).json({ success: false, message: "Meta rechazó el evento", metaError: metaJson.error });
    }

    return res.status(200).json({ success: true, metaResponse: metaJson, event_id: final_event_id });

  } catch (error) {
    console.error("meta-purchase error:", error);
    return res.status(500).json({ success: false, error: error?.message || "error desconocido" });
  }
}
