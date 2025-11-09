// api/rotador.cjs - Nuevo archivo con sintaxis CommonJS

// Importante: Usamos 'module.exports' en lugar de 'export default'
module.exports = (request, response) => {

  // 1. Tu lista de números de WhatsApp
  const misLineas = [
    '5492236735372', 
  ];

  // 2. Lógica de elección: Elegir un número al azar
  const lineaElegida = misLineas[Math.floor(Math.random() * misLineas.length)];

  // 3. El mensaje
  const mensaje = encodeURIComponent('Hola, quiero crear mi usuario en Circo Online.');

  // 4. La URL final
  const urlFinal = `https://wa.me/${lineaElegida}?text=${mensaje}`;

  // 5. Redirigir al usuario (código 307)
  response.writeHead(307, { Location: urlFinal });
  response.end();
};
