// index.js mejorado
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json()); // Para parsear JSON en los endpoints

// Conexión MongoDB
mongoose.connect('mongodb://localhost:27017/PF', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Modelo de mensaje unificado (actualizado)
const messageSchema = new mongoose.Schema({
  eventoId: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: String, required: true },
  user: { type: String, required: true },
  userId: { type: String, required: true },
  profileImageUrl: { type: String, default: '' } // Campo para la imagen de perfil que se actualizará
});

const Message = mongoose.model('Message', messageSchema);

// Servidor HTTP + WebSocket
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  ws.eventoId = null;

  ws.on('message', async (message) => {
    try {
      const parsed = JSON.parse(message);

      // Cliente se une a un evento
      if (parsed.type === 'join') {
        ws.eventoId = parsed.eventoId;
        console.log(`🟢 Cliente unido a evento ${ws.eventoId} como ${parsed.user}`);
        return;
      }

      // Si es un mensaje de chat, se valida y se almacena
      if (parsed.type === 'chat') {
        const { eventoId, user, content, createdAt, userId } = parsed;
        if (!eventoId || !user || !content || !createdAt || !userId) {
          console.warn('❌ Mensaje incompleto, no se guarda ni reenvía');
          return;
        }

        console.log('📩 Mensaje recibido:', parsed);

        // Guardar el mensaje en la BD (con la URL de imagen enviada en ese momento)
        const savedMessage = await Message.create(parsed);

        // Reenviar solo a los clientes del mismo evento
        wss.clients.forEach((client) => {
          if (
            client.readyState === WebSocket.OPEN &&
            client.eventoId === eventoId
          ) {
            client.send(JSON.stringify(savedMessage));
          }
        });
      }
    } catch (err) {
      console.warn('❌ Mensaje no válido o JSON incorrecto:', message);
    }
  });

  ws.on('close', () => {
    console.log(`🔴 Cliente desconectado del evento ${ws.eventoId || 'desconocido'}`);
  });
});

// Endpoint para obtener el historial de mensajes de un evento
app.get('/mensajes/:eventoId', async (req, res) => {
  try {
    const mensajes = await Message.find({ eventoId: req.params.eventoId }).sort({ createdAt: 1 });
    res.json(mensajes);
  } catch (err) {
    console.error('Error al obtener historial:', err);
    res.status(500).send('Error al obtener mensajes');
  }
});

// Nuevo endpoint: Actualización de la imagen de perfil en todos los mensajes de un usuario
app.put('/api/chat/update-profile-image', async (req, res) => {
  const { userId, newProfileImageUrl } = req.body;
  try {
    // Actualizar en masa los mensajes de ese usuario
    await Message.updateMany(
      { userId: userId },
      { $set: { profileImageUrl: newProfileImageUrl } }
    );

    // Notificar a todos los clientes (a través de WS) que la imagen se ha actualizado
    const updateMsg = JSON.stringify({
      type: 'update_profile_image',
      userId,
      newProfileImageUrl
    });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(updateMsg);
      }
    });

    res.json({ message: 'Mensajes actualizados correctamente' });
  } catch (e) {
    console.error('Error actualizando imagen de perfil en mensajes:', e);
    res.status(500).send("Error updating messages: " + e.message);
  }
});

// Endpoint de prueba
app.get('/', (req, res) => {
  res.send('Servidor de chat activo');
});

const PORT = 4000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor WebSocket corriendo en http://localhost:${PORT}`);
});
