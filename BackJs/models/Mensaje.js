const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  eventoId: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: String, required: true },
  user: { type: String, required: true },
  userId: { type: String, required: true },
  profileImageUrl: { type: String, default: '' }
});

module.exports = mongoose.model('Message', messageSchema);
