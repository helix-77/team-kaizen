import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MODEL = 'llama-3.3-70b-versatile';

export async function chatCompletion(messages, tools = null) {
  try {
    const payload = {
      model: MODEL,
      messages,
      temperature: 0.2
    };
    if (tools) payload.tools = tools;

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      payload,
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data.choices[0].message;
  } catch (error) {
    console.error('[groq] API Error:', error.response?.data || error.message);
    throw new Error('LLM Service Unavailable');
  }
}

export async function generateSessionName(firstMessage) {
  const prompt = [
    { role: 'user', content: `Given this first user message, reply with ONLY a short 3-5 word title for this conversation. No punctuation.\n\nMessage: ${firstMessage}` }
  ];
  const message = await chatCompletion(prompt);
  return message.content;
}
