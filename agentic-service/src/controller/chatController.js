import { Session, Message } from '../models/Chat.js';
import * as groq from '../services/groqService.js';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const RENTPI_KEYWORDS = [
  "rental", "product", "category", "price", "discount",
  "available", "availability", "renter", "owner", "rentpi",
  "booking", "gear", "surge", "peak", "trending",
];

const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL || 'http://analytics-service:8003';
const RENTAL_SERVICE_URL = process.env.RENTAL_SERVICE_URL || 'http://rental-service:8002';

function isOnTopic(message) {
  const lower = message.toLowerCase();
  return RENTPI_KEYWORDS.some(kw => lower.includes(kw));
}

async function getGroundingContext(message) {
  const lower = message.toLowerCase();
  let context = "";

  try {
    if (lower.includes('category') && lower.includes('most')) {
      const stats = await axios.get('https://technocracy.brittoo.xyz/api/data/rentals/stats?group_by=category', {
        headers: { Authorization: `Bearer ${process.env.CENTRAL_API_TOKEN}` }
      });
      context = `Current rental stats by category: ${JSON.stringify(stats.data.data)}`;
    } else if (lower.includes('trending') || lower.includes('recommend')) {
      const today = new Date().toISOString().split('T')[0];
      const recs = await axios.get(`${ANALYTICS_SERVICE_URL}/analytics/recommendations?date=${today}&limit=5`);
      context = `Today's trending recommendations: ${JSON.stringify(recs.data.recommendations)}`;
    } else if (lower.includes('peak')) {
      const peak = await axios.get(`${ANALYTICS_SERVICE_URL}/analytics/peak-window?from=2023-01&to=2024-12`);
      context = `Historical peak rental window: ${JSON.stringify(peak.data.peakWindow)}`;
    }
  } catch (err) {
    console.warn('[grounding] Failed to fetch context:', err.message);
  }

  return context;
}

export const chat = async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    if (!isOnTopic(message)) {
      return res.json({ reply: "I'm sorry, I can only assist with questions related to RentPi (rentals, products, pricing, availability, etc.)." });
    }

    let currentSessionId = sessionId;
    let isNewSession = false;

    if (!currentSessionId) {
      currentSessionId = uuidv4();
      isNewSession = true;
    }

    let session = await Session.findOne({ sessionId: currentSessionId });
    if (!session) {
      session = new Session({ sessionId: currentSessionId });
      isNewSession = true;
    }

    const history = await Message.find({ sessionId: currentSessionId }).sort('timestamp');
    const groundingContext = await getGroundingContext(message);

    const messages = [
      { role: 'system', content: `You are the RentPi Assistant. Grounded context: ${groundingContext}. Only answer based on context or general RentPi knowledge. No hallucinations.` },
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ];

    const reply = await groq.chatCompletion(messages);

    // Persist
    await new Message({ sessionId: currentSessionId, role: 'user', content: message }).save();
    await new Message({ sessionId: currentSessionId, role: 'assistant', content: reply }).save();

    session.lastMessageAt = new Date();
    if (isNewSession) {
      session.name = await groq.generateSessionName(message);
    }
    await session.save();

    res.json({ sessionId: currentSessionId, reply });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getSessions = async (req, res) => {
  try {
    const sessions = await Session.find().sort({ lastMessageAt: -1 });
    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await Session.findOne({ sessionId });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    const messages = await Message.find({ sessionId }).sort('timestamp');
    res.json({ sessionId, name: session.name, messages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    await Session.deleteOne({ sessionId });
    await Message.deleteMany({ sessionId });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getStatus = (req, res) => res.json({ service: 'agentic-service', status: 'OK' });
