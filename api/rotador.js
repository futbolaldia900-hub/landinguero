// Pega esto en el nuevo archivo:  api/rotador.js

export default function handler(request, response) {

  // --- 1. CONFIGURA TUS LÍNEAS AQUÍ ---
  // Agrega todas las líneas de WhatsApp que quieras rotar.
  const misLineas = [
    '5492236735372', // Tu línea actual
    '5492230000001', // Línea de ejemplo 2
    '5492230000002'  // Línea de ejemplo 3
  ];
  // ---------------------------------


  // 2. Lógica para elegir una línea al azar
  const lineaElegida = misLineas[Math.floor(Math.random() * misLineas.length)];

  // 3. El mensaje de WhatsApp (¡el mejorado!)
  const mensaje = encodeURIComponent('Hola, quiero crear mi usuario en Circo Online.');

  // 4. Genera la URL final
  const urlFinal = `https://wa.me/${lineaElegida}?text=${mensaje}`;

  // 5. Redirige al usuario a esa URL de WhatsApp
  response.redirect(307, urlFinal);
}
