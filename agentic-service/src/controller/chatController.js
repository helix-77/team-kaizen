import { Session, Message } from '../models/Chat.js';
import * as groq from '../services/groqService.js';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const RENTPI_KEYWORDS = [
  "rental", "product", "category", "price", "discount",
  "available", "availability", "renter", "owner", "rentpi",
  "booking", "gear", "surge", "peak", "trending", "recommend",
  "history", "stats", "busiest", "busy", "trend", "season", "top", "record"
];

const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL || 'http://analytics-service:8003';
const RENTAL_SERVICE_URL = process.env.RENTAL_SERVICE_URL || 'http://rental-service:8002';
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://user-service:8001';

function isOnTopic(message) {
  const lower = message.toLowerCase();
  return RENTPI_KEYWORDS.some(kw => lower.includes(kw));
}

/**
 * Intelligent Grounding Engine
 * Detects intent and fetches real-time data from microservices.
 * Returns both the text context and the "proof" (API calls made).
 */
async function getGroundingContext(message) {
  const lower = message.toLowerCase();
  let context = "";
  let toolsUsed = [];

  const addCall = async (desc, url, params = {}) => {
    try {
      toolsUsed.push({ tool: desc, url, params });
      const response = await axios.get(url, { 
        params,
        headers: { Authorization: `Bearer ${process.env.CENTRAL_API_TOKEN}` },
        timeout: 5000 
      });
      return response.data;
    } catch (err) {
      console.warn(`[grounding] ${desc} failed:`, err.message);
      return null;
    }
  };

  try {
    // 1. Intent: Category Stats
    if (lower.includes('category') && (lower.includes('most') || lower.includes('stats'))) {
      const data = await addCall('Central API: Category Stats', 'https://technocracy.brittoo.xyz/api/data/rentals/stats', { group_by: 'category' });
      if (data) context += `Current rental stats by category: ${JSON.stringify(data.data)}. `;
    }

    // 2. Intent: Trending / Recommendations
    if (lower.includes('trending') || lower.includes('recommend')) {
      const today = new Date().toISOString().split('T')[0];
      const data = await addCall('Analytics: Recommendations', `${ANALYTICS_SERVICE_URL}/analytics/recommendations`, { date: today, limit: 5 });
      if (data) context += `Today's trending recommendations: ${JSON.stringify(data.recommendations)}. `;
    }

    // 3. Intent: Peak Window
    if (lower.includes('peak')) {
      const data = await addCall('Analytics: Peak Window', `${ANALYTICS_SERVICE_URL}/analytics/peak-window`, { from: '2023-01', to: '2024-12' });
      if (data) context += `Historical peak rental window: ${JSON.stringify(data.peakWindow)}. `;
    }

    // 4. Intent: Discounts
    if (lower.includes('discount')) {
      context += `RentPi Discount Tiers: 80-100 score = 20%, 60-79 = 15%, 40-59 = 10%, 20-39 = 5%, 0-19 = 0%. `;
      // If a user ID is mentioned, try to fetch it
      const userIdMatch = lower.match(/user\s*(\d+)/i) || lower.match(/id\s*(\d+)/i);
      if (userIdMatch) {
        const data = await addCall('User Service: Discount Lookup', `${USER_SERVICE_URL}/users/${userIdMatch[1]}/discount`);
        if (data) context += `Specific user ${userIdMatch[1]} discount data: ${JSON.stringify(data)}. `;
      }
    }

    // 5. Intent: Availability
    if (lower.includes('available') || lower.includes('availability') || lower.includes('free')) {
      const productIdMatch = lower.match(/product\s*(\d+)/i) || lower.match(/id\s*(\d+)/i) || lower.match(/#(\d+)/);
      if (productIdMatch) {
        const today = new Date().toISOString().split('T')[0];
        const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const data = await addCall('Rental Service: Availability', `${RENTAL_SERVICE_URL}/rentals/products/${productIdMatch[1]}/availability`, { from: today, to: nextMonth });
        if (data) context += `Product ${productIdMatch[1]} availability for the next 30 days: ${JSON.stringify(data)}. `;
      } else {
        context += "User asked about availability but no product ID was detected. Remind user to provide a product ID. ";
      }
    }

    // 6. Intent: Surge
    if (lower.includes('surge') || lower.includes('busy')) {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const data = await addCall('Analytics: Surge Days', `${ANALYTICS_SERVICE_URL}/analytics/surge-days`, { month: currentMonth });
      if (data) context += `Surge day predictions for ${currentMonth}: ${JSON.stringify(data.data)}. `;
    }

  } catch (err) {
    console.error('[grounding] Critical error:', err.message);
  }

  return { context, toolsUsed };
}

export const chat = async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    if (!isOnTopic(message)) {
      return res.json({ 
        reply: "I'm sorry, I can only assist with questions related to RentPi (rentals, products, pricing, availability, etc.).",
        toolsUsed: []
      });
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
    
    // Get Intelligent Grounding
    const { context, toolsUsed } = await getGroundingContext(message);

    const messages = [
      { 
        role: 'system', 
        content: `You are the RentPi Smart Assistant. 
        GROUNDED DATA: ${context || "No specific data found for this query."}
        
        RULES:
        1. Use the GROUNDED DATA to provide accurate, factual answers.
        2. DO NOT use scripted responses. Be conversational but precise.
        3. If data is missing (e.g. no product ID provided for availability), ask the user for the missing details.
        4. Mention your sources if they help the user trust the data (e.g. "According to our analytics...").
        5. NEVER hallucinate numbers.` 
      },
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

    // Return the reply along with PROOF of tools used
    res.json({ 
      sessionId: currentSessionId, 
      reply,
      toolsUsed // PROOF of all API calls made
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getSessions = async (req, res) => {
  try {
    const sessions = await Session.find().sort({ lastMessageAt: -1 });
    res.json({ 
      sessions: sessions.map(s => ({
        sessionId: s.sessionId,
        name: s.name,
        lastMessageAt: s.lastMessageAt
      }))
    });
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
    res.json({ 
      sessionId, 
      name: session.name, 
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp
      }))
    });
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
