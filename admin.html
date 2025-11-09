<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Registrar Compra (Meta CAPI) — Admin</title>
  <style>
    :root{
      --bg:#080808;
      --panel:#151515;
      --panel-2:#1c1c1c;
      --accent:#4db8ff;
      --accent-2:#80ccff;
      --muted:#bdbdbd;
      --success:#8ef08e;
      --danger:#ff6b6b;
    }
    html,body{height:100%;margin:0;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,"Helvetica Neue",Arial;}
    body{background:var(--bg);color:#fff;display:flex;align-items:center;justify-content:center;padding:24px}
    .card{width:100%;max-width:420px;background:linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));border-radius:12px;padding:20px;box-shadow:0 8px 30px rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.02)}
    h1{margin:0 0 12px;font-size:20px;color:var(--accent)}
    .small{font-size:13px;color:var(--muted);margin-bottom:12px}
    label{display:block;font-size:13px;color:var(--muted);margin-top:10px;margin-bottom:6px}
    input,button,select{width:100%;box-sizing:border-box}
    input[type="text"], input[type="number"], input[type="datetime-local"]{
      padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.04);background:var(--panel);color:#fff;font-size:15px;
    }
    input::placeholder{color:#8b8b8b}
    .row{display:flex;gap:10px}
    .row .half{flex:1}
    button{
      margin-top:14px;padding:12px;border-radius:10px;border:none;background:var(--accent);color:#000;font-weight:700;cursor:pointer;font-size:15px;
    }
    button.secondary{background:transparent;border:1px solid rgba(255,255,255,0.04);color:var(--muted);font-weight:600}
    #response{margin-top:14px;background:#0b0b0b;padding:12px;border-radius:8px;color:var(--success);font-family:monospace;white-space:pre-wrap;max-height:220px;overflow:auto;border:1px solid rgba(77,184,255,0.06)}
    .hidden{display:none}
    /* simple modal */
    .modal{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:linear-gradient(rgba(0,0,0,0.6),rgba(0,0,0,0.6))}
    .modal .mcard{background:var(--panel-2);padding:20px;border-radius:12px;width:320px;border:1px solid rgba(255,255,255,0.03)}
    .note{font-size:13px;color:var(--muted);margin-top:8px}
    .warn{color:var(--danger);font-weight:700;margin-top:8px}
  </style>
</head>
<body>
  <!-- PASSWORD MODAL -->
  <div id="loginModal" class="modal" aria-hidden="false">
    <div class="mcard">
      <h2 style="color:var(--accent);margin:0 0 8px;font-size:18px">Acceso Administrador</h2>
      <p class="small" style="margin:0 0 10px">Ingrese la contraseña para acceder al panel.</p>
      <input id="adminPasswordInput" type="password" placeholder="Contraseña" style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.04);background:#111;color:#fff;font-size:15px" />
      <button id="btnLogin" style="margin-top:12px;background:var(--accent);color:#000">Entrar</button>
      <p class="note">Contraseña configurable en la variable <code>ADMIN_PASSWORD</code> dentro de este archivo.</p>
    </div>
  </div>

  <div class="card" id="adminCard" style="display:none">
    <h1>Registrar Compra (Meta CAPI)</h1>
    <p class="small">Formulario para reportar compras manuales al Pixel (solo uso interno).</p>

    <form id="purchaseForm">
      <label for="firstName">Nombre del comprador</label>
      <input type="text" id="firstName" placeholder="Ej: Juan" required />

      <label for="lastName">Apellido del comprador</label>
      <input type="text" id="lastName" placeholder="Ej: Pérez" required />

      <label for="phone">Teléfono del comprador (ej: +5491122334455)</label>
      <input type="text" id="phone" placeholder="+5491122334455" required />

      <label for="amount">Monto en ARS (ej: 26000)</label>
      <input type="number" id="amount" placeholder="26000" min="1" required />

      <label for="event_time">Fecha y hora de compra (opcional)</label>
      <input type="datetime-local" id="event_time" />

      <div style="display:flex;gap:8px;margin-top:10px">
        <button type="submit">Enviar compra a Meta</button>
        <button type="button" id="btnClear" class="secondary">Limpiar</button>
      </div>
    </form>

    <div id="response" aria-live="polite" class="hidden"></div>

    <p class="note" style="margin-top:12px">Notas: 1) Teléfono con prefijo internacional (+549...) recomendada. 2) Esta contraseña es de protección rápida; para máxima seguridad usa auth en servidor o IP allowlist.</p>
  </div>

  <script>
    /********** CONFIGURACIÓN **********
     * Cambiá la contraseña aquí:
     *  - poné una contraseña larga y segura, p.ej: "MiClaveSegura_2025!"
     * **********************************/
    const ADMIN_PASSWORD = "tu_contraseña_aqui"; // ← CAMBIALA AHORA

    // Helper: sanitize phone keep + and digits
    function sanitizePhoneRaw(s){
      if(!s) return s;
      s = s.trim();
      // keep leading + if exists, then digits
      const hasPlus = s.startsWith('+');
      const digits = s.replace(/\D/g,'');
      return (hasPlus ? '+' : '') + digits;
    }

    // LOGIN handling
    const loginModal = document.getElementById('loginModal');
    const adminCard = document.getElementById('adminCard');
    document.getElementById('btnLogin').addEventListener('click', () => {
      const v = document.getElementById('adminPasswordInput').value;
      if (v === ADMIN_PASSWORD) {
        loginModal.style.display = 'none';
        adminCard.style.display = 'block';
        document.getElementById('firstName').focus();
      } else {
        alert('Contraseña incorrecta');
      }
    });

    // allow Enter key on password field
    document.getElementById('adminPasswordInput').addEventListener('keydown', (e)=>{
      if(e.key === 'Enter') document.getElementById('btnLogin').click();
    });

    // Form submit
    const form = document.getElementById('purchaseForm');
    const responseBox = document.getElementById('response');
    const btnClear = document.getElementById('btnClear');

    btnClear.addEventListener('click', () => {
      form.reset();
      responseBox.classList.add('hidden');
      responseBox.textContent = '';
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      responseBox.classList.remove('hidden');
      responseBox.style.color = 'var(--muted)';
      responseBox.textContent = '⏳ Enviando compra a Meta...';

      const firstName = document.getElementById('firstName').value.trim();
      const lastName = document.getElementById('lastName').value.trim();
      let phoneRaw = document.getElementById('phone').value.trim();
      const amount = document.getElementById('amount').value;
      const event_time = document.getElementById('event_time').value || null;

      // sanitize phone: keep leading + and digits
      phoneRaw = sanitizePhoneRaw(phoneRaw);

      // validations
      if (!firstName || !lastName) {
        responseBox.style.color = 'var(--danger)';
        responseBox.textContent = 'Completa nombre y apellido.';
        return;
      }
      if (!phoneRaw || !/^\+?\d{8,15}$/.test(phoneRaw)) {
        responseBox.style.color = 'var(--danger)';
        responseBox.textContent = 'Teléfono inválido. Usá formato +5491122334455 o similar.';
        return;
      }
      if (!amount || Number(amount) <= 0) {
        responseBox.style.color = 'var(--danger)';
        responseBox.textContent = 'Monto inválido. Ingresá un número mayor a 0.';
        return;
      }

      const payload = {
        firstName,
        lastName,
        phone: phoneRaw,
        amount: String(amount),
        event_time: event_time ? event_time : null
      };

      try {
        const res = await fetch('/api/meta-purchase', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify(payload)
        });

        const json = await res.json();
        if (json && json.metaResponse && json.metaResponse.events_received === 1) {
          responseBox.style.color = 'var(--success)';
          responseBox.textContent = '✅ Compra enviada correctamente a Meta\n\n' + JSON.stringify(json.metaResponse, null, 2);
        } else if (json && json.metaResponse && json.metaResponse.error) {
          responseBox.style.color = 'var(--danger)';
          responseBox.textContent = '❌ Error desde Meta:\n' + JSON.stringify(json.metaResponse.error, null, 2);
        } else if (json && json.success === false) {
          responseBox.style.color = 'var(--danger)';
          responseBox.textContent = '❌ Error:\n' + JSON.stringify(json, null, 2);
        } else {
          responseBox.style.color = 'var(--muted)';
          responseBox.textContent = 'Respuesta desconocida:\n' + JSON.stringify(json, null, 2);
        }
      } catch (err) {
        responseBox.style.color = 'var(--danger)';
        responseBox.textContent = '❌ Error de red: ' + err.message;
      }
    });
  </script>
</body>
</html>
