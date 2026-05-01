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

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://api-gateway:8000';

const ANALYTICS_SERVICE_URL = GATEWAY_URL; // Routes via /analytics
const RENTAL_SERVICE_URL = GATEWAY_URL;    // Routes via /rentals
const USER_SERVICE_URL = GATEWAY_URL;      // Routes via /users

function isOnTopic(message) {
  const lower = message.toLowerCase();
  return RENTPI_KEYWORDS.some(kw => lower.includes(kw));
}

const TOOLS_DEFINITION = [
  {
    type: 'function',
    function: {
      name: 'get_category_stats',
      description: 'Get rental statistics grouped by category from the central data API.',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_recommendations',
      description: 'Get top trending product recommendations for a specific date.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'The date in YYYY-MM-DD format.' },
          limit: { type: 'number', description: 'Number of recommendations to fetch.', default: 5 }
        },
        required: ['date']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_peak_window',
      description: 'Find the peak historical rental window (busiest months).',
      parameters: {
        type: 'object',
        properties: {
          from: { type: 'string', description: 'Start month in YYYY-MM format (e.g. 2023-01)' },
          to: { type: 'string', description: 'End month in YYYY-MM format (e.g. 2024-12)' }
        },
        required: ['from', 'to']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_surge_days',
      description: 'Predict busy/surge days for a specific month.',
      parameters: {
        type: 'object',
        properties: {
          month: { type: 'string', description: 'The month in YYYY-MM format (e.g. 2025-05).' }
        },
        required: ['month']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'check_availability',
      description: 'Check if a specific product is available for a date range. Returns a list of busy dates. If the list is empty, the product is 100% available.',
      parameters: {
        type: 'object',
        properties: {
          productId: { type: 'string', description: 'The product ID number.' },
          from: { type: 'string', description: 'Start date YYYY-MM-DD' },
          to: { type: 'string', description: 'End date YYYY-MM-DD' }
        },
        required: ['productId', 'from', 'to']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_user_discount',
      description: 'Get the loyalty score and discount tier for a specific user ID.',
      parameters: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: 'The user numeric ID.' }
        },
        required: ['userId']
      }
    }
  }
];

const toolHandlers = {
  get_category_stats: async () => {
    const response = await axios.get('https://technocracy.brittoo.xyz/api/data/rentals/stats', { 
      params: { group_by: 'category' },
      headers: { Authorization: `Bearer ${process.env.CENTRAL_API_TOKEN}` },
      timeout: 5000 
    });
    return response.data;
  },
  get_recommendations: async ({ date, limit = 5 }) => {
    const response = await axios.get(`${ANALYTICS_SERVICE_URL}/analytics/recommendations`, { 
      params: { date, limit },
      headers: { Authorization: `Bearer ${process.env.CENTRAL_API_TOKEN}` },
      timeout: 5000 
    });
    return response.data;
  },
  get_peak_window: async ({ from, to }) => {
    const response = await axios.get(`${ANALYTICS_SERVICE_URL}/analytics/peak-window`, { 
      params: { from, to },
      headers: { Authorization: `Bearer ${process.env.CENTRAL_API_TOKEN}` },
      timeout: 5000 
    });
    return response.data;
  },
  get_surge_days: async ({ month }) => {
    const response = await axios.get(`${ANALYTICS_SERVICE_URL}/analytics/surge-days`, { 
      params: { month },
      headers: { Authorization: `Bearer ${process.env.CENTRAL_API_TOKEN}` },
      timeout: 5000 
    });
    return response.data;
  },
  check_availability: async ({ productId, from, to }) => {
    const response = await axios.get(`${RENTAL_SERVICE_URL}/rentals/products/${productId}/availability`, { 
      params: { from, to },
      headers: { Authorization: `Bearer ${process.env.CENTRAL_API_TOKEN}` },
      timeout: 5000 
    });
    return response.data;
  },
  get_user_discount: async ({ userId }) => {
    const response = await axios.get(`${USER_SERVICE_URL}/users/${userId}/discount`, { 
      headers: { Authorization: `Bearer ${process.env.CENTRAL_API_TOKEN}` },
      timeout: 5000 
    });
    return response.data;
  }
};

const SYSTEM_PROMPT = `You are the RentPi Smart Assistant.
You have access to several tools to fetch real-time data about rentals, products, users, and analytics.

RULES:
1. Use the tools whenever a user asks for specific data (stats, availability, recommendations, etc.).
2. Be conversational but precise.
3. If a tool returns an empty list for availability, it means the product is FULLY AVAILABLE.
4. Mention your sources (e.g. "Our analytics show...").
5. If you need a parameter (like a Product ID or User ID) that wasn't provided, ask the user for it.
6. Discount Tiers: 80-100 score = 20%, 60-79 = 15%, 40-59 = 10%, 20-39 = 5%, 0-19 = 0%.
7. NEVER hallucinate numbers. If a tool call fails, inform the user you're having trouble reaching that data source.`;

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

    let currentSessionId = sessionId || uuidv4();
    let session = await Session.findOne({ sessionId: currentSessionId });
    let isNewSession = false;

    if (!session) {
      session = new Session({ sessionId: currentSessionId });
      isNewSession = true;
    }

    const history = await Message.find({ sessionId: currentSessionId }).sort('timestamp');
    
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ];

    // Initial Call to Groq with Tools
    let groqResponse = await groq.chatCompletion(messages, TOOLS_DEFINITION);
    let toolsUsed = [];

    // Handle Tool Calls
    if (groqResponse.tool_calls) {
      messages.push(groqResponse); // Add assistant's tool call message
      
      for (const toolCall of groqResponse.tool_calls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);
        
        const handler = toolHandlers[functionName];
        if (handler) {
          try {
            const result = await handler(functionArgs);
            toolsUsed.push({ tool: functionName, params: functionArgs, success: true });
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              name: functionName,
              content: JSON.stringify(result)
            });
          } catch (err) {
            console.error(`[agent] Tool ${functionName} failed:`, err.message);
            toolsUsed.push({ tool: functionName, params: functionArgs, success: false, error: err.message });
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              name: functionName,
              content: JSON.stringify({ error: `Tool execution failed: ${err.message}` })
            });
          }
        }
      }
      
      // Final Call with Tool Results
      groqResponse = await groq.chatCompletion(messages);
    }

    const reply = groqResponse.content;

    // Persist
    await new Message({ sessionId: currentSessionId, role: 'user', content: message }).save();
    await new Message({ sessionId: currentSessionId, role: 'assistant', content: reply }).save();

    session.lastMessageAt = new Date();
    if (isNewSession) {
      session.name = await groq.generateSessionName(message);
    }
    await session.save();

    res.json({ 
      sessionId: currentSessionId, 
      reply,
      toolsUsed
    });
  } catch (error) {
    console.error('[agent] Critical error:', error);
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
