const WebSocket = require('ws');

const socket = new WebSocket('ws://localhost:4000');

// Datos del usuario (admin)
const username = 'admin';
const userId = '67e722c1b5b557622769bead';
const eventoId = '67f65b514817b4601bd944eb'; // <- evento real
const content = 'Hola chicos como estais';
const createdAt = new Date().toISOString();

socket.on('open', () => {
  console.log('✅ Conectado al servidor WebSocket');

  // Mensaje de tipo join
  socket.send(JSON.stringify({
    type: 'join',
    username,
    eventoId
  }));

  // Espera antes de enviar el mensaje
  setTimeout(() => {
    const message = {
      eventoId,
      content,
      createdAt,
      user: username,
      userId, // ✅ Incluimos el ID del usuario
    };

    socket.send(JSON.stringify(message));
    console.log('📨 Mensaje enviado:', message);
  }, 1000);
});

socket.on('message', (data) => {
  try {
    const parsed = JSON.parse(data.toString());
    console.log('📥 Mensaje recibido:', parsed);
  } catch (e) {
    console.log('📥 Mensaje (sin parsear):', data.toString());
  }
});

socket.on('error', (err) => {
  console.error('❌ Error en WebSocket:', err);
});

socket.on('close', () => {
  console.log('🔌 Conexión cerrada');
});
