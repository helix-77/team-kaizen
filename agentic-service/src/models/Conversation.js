import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const conversationSchema = new mongoose.Schema({
  sessionId: { type: String, index: true, unique: true, sparse: true },
  name: { type: String, default: 'New Chat' },
  userId: { type: String, index: true },
  messages: [messageSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

conversationSchema.pre('save', function () {
  this.updatedAt = new Date();
});

export default mongoose.model('Conversation', conversationSchema);
