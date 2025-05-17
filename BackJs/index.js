const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect('mongodb://localhost:27017/PF', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const messageSchema = new mongoose.Schema({
  eventoId: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: String, required: true },
  user: { type: String, required: true },
  userId: { type: String, required: true },
  profileImageUrl: { type: String, default: '' }
});
const Message = mongoose.model('Message', messageSchema);

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  ws.eventoId = null;

  ws.on('message', async (message) => {
    try {
      const parsed = JSON.parse(message);

      if (parsed.type === 'join') {
        ws.eventoId = parsed.eventoId;
        console.log(`🟢 Cliente unido a evento ${ws.eventoId} como ${parsed.user}`);
        return;
      }

      if (parsed.type === 'chat') {
        const { eventoId, user, content, createdAt, userId } = parsed;

        if (!eventoId || !user || !content?.trim() || !createdAt || !userId) {
          console.warn('❌ Mensaje incompleto o vacío, ignorado');
          return;
        }

        console.log('📩 Mensaje recibido:', parsed);

        const savedMessage = await Message.create(parsed);

        // Convertimos a objeto y añadimos el type
        const outgoing = {
          type: 'chat',
          ...savedMessage.toObject()
        };

        wss.clients.forEach((client) => {
          if (
            client.readyState === WebSocket.OPEN &&
            client.eventoId === eventoId
          ) {
            client.send(JSON.stringify(outgoing));
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


app.get('/mensajes/:eventoId', async (req, res) => {
  try {
    const mensajes = await Message.find({
      eventoId: req.params.eventoId,
      content: { $nin: [null, ''] }
    }).sort({ createdAt: 1 });

    res.json(mensajes);
  } catch (err) {
    console.error('Error al obtener historial:', err);
    res.status(500).send('Error al obtener mensajes');
  }
});

app.put('/api/chat/update-profile-image', async (req, res) => {
  const { userId, newProfileImageUrl } = req.body;
  try {
    await Message.updateMany(
      { userId: userId },
      { $set: { profileImageUrl: newProfileImageUrl } }
    );

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

app.post('/api/chat/create-room', (req, res) => {
  const { fallaCode } = req.body;
  if (!fallaCode) {
    return res.status(400).json({ error: 'FallaCode requerido' });
  }

  console.log(`📦 Sala de chat privada creada para la falla: ${fallaCode}`);
  res.status(201).json({ message: `Sala creada para falla ${fallaCode}` });
});

app.get('/', (req, res) => {
  res.send('Servidor de chat activo');
});

const PORT = 4000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor WebSocket corriendo en http://localhost:${PORT}`);
});
