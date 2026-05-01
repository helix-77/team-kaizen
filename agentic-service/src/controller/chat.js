import Groq from 'groq-sdk';
import Conversation from '../models/Conversation.js';
import { groundWithDeviceData } from '../grounding.js';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are RentPi Assistant, an AI helper for the RentPi IoT device rental marketplace.
You help users find devices, understand pricing, check availability, and answer questions about IoT rentals.
Be concise, friendly, and helpful. Use the provided device data to give accurate recommendations.
If you don't have specific information, say so honestly rather than making things up.`;

const RENTPI_KEYWORDS = [
  'rental', 'product', 'category', 'price', 'discount', 'available', 'availability',
  'renter', 'owner', 'rentpi', 'booking', 'gear', 'surge', 'peak', 'trending',
];

function isOnTopic(message) {
  const lower = message.toLowerCase();
  return RENTPI_KEYWORDS.some((keyword) => lower.includes(keyword));
}

function fallbackTitle(message) {
  return message.split(/\s+/).filter(Boolean).slice(0, 5).join(' ') || 'RentPi Chat';
}

export const sendMessage = async (req, res) => {
  try {
    const { message, userId = 'anonymous', conversationId, sessionId } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required and must be a non-empty string' });
    }

    const activeSessionId = sessionId || conversationId;
    if (!isOnTopic(message)) {
      return res.json({
        sessionId: activeSessionId,
        reply: 'I can help with RentPi rentals, products, categories, pricing, discounts, availability, trends, and bookings.',
        grounded: false,
      });
    }

    const grounding = await groundWithDeviceData(message);

    let conversation;
    if (activeSessionId) {
      conversation = await Conversation.findOne({ sessionId: activeSessionId });
      if (!conversation && /^[a-f\d]{24}$/i.test(activeSessionId)) {
        conversation = await Conversation.findById(activeSessionId);
      }
    }
    if (!conversation) {
      conversation = new Conversation({
        sessionId: activeSessionId || `session-${Date.now()}`,
        name: fallbackTitle(message),
        userId,
        messages: [],
      });
    }

    const groqMessages = [
      { role: 'system', content: `${SYSTEM_PROMPT}\n\nCurrent device catalog:\n${grounding.context}` },
    ];

    const recentHistory = conversation.messages.slice(-10);
    for (const msg of recentHistory) {
      groqMessages.push({ role: msg.role, content: msg.content });
    }

    groqMessages.push({ role: 'user', content: message });

    let assistantMessage;
    try {
      const completion = await groq.chat.completions.create({
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        messages: groqMessages,
        temperature: 0.7,
        max_tokens: 1024,
      });
      assistantMessage = completion.choices[0]?.message?.content || 'I apologize, I could not generate a response.';
    } catch (groqErr) {
      console.error('[groq] Error:', groqErr.message);
      assistantMessage = 'I\'m having trouble connecting to my AI backend right now. Please try again in a moment.';
    }

    conversation.messages.push({ role: 'user', content: message });
    conversation.messages.push({ role: 'assistant', content: assistantMessage });
    await conversation.save();

    res.json({
      sessionId: conversation.sessionId || String(conversation._id),
      reply: assistantMessage,
      conversationId: conversation._id,
      grounded: grounding.deviceCount > 0,
    });
  } catch (err) {
    console.error('[chat]', err.message || err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
};

export const getSessions = async (req, res) => {
  try {
    const conversations = await Conversation.find({})
      .select('sessionId name updatedAt')
      .sort({ updatedAt: -1 })
      .limit(50);
    res.json({
      sessions: conversations.map((conversation) => ({
        sessionId: conversation.sessionId || String(conversation._id),
        name: conversation.name || 'New Chat',
        lastMessageAt: conversation.updatedAt,
      })),
    });
  } catch (err) {
    console.error('[sessions]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSessionHistory = async (req, res) => {
  try {
    const conversation = await Conversation.findOne({ sessionId: req.params.sessionId });
    if (!conversation) return res.status(404).json({ error: 'Session not found' });
    res.json({
      sessionId: conversation.sessionId,
      name: conversation.name || 'New Chat',
      messages: conversation.messages,
    });
  } catch (err) {
    console.error('[session-history]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteSession = async (req, res) => {
  try {
    await Conversation.deleteOne({ sessionId: req.params.sessionId });
    res.status(204).send();
  } catch (err) {
    console.error('[delete-session]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getHistory = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    res.json({
      conversationId: conversation._id,
      userId: conversation.userId,
      messages: conversation.messages,
      createdAt: conversation.createdAt,
    });
  } catch (err) {
    console.error('[history]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({ userId: req.params.userId })
      .select('_id createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(20);
    res.json({ conversations });
  } catch (err) {
    console.error('[conversations]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};
