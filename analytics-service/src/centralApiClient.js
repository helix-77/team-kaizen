import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const CENTRAL_API_URL = process.env.CENTRAL_API_URL || 'https://technocracy.brittoo.xyz';
const CENTRAL_API_TOKEN = process.env.CENTRAL_API_TOKEN;

const client = axios.create({
  baseURL: CENTRAL_API_URL,
  headers: {
    Authorization: `Bearer ${CENTRAL_API_TOKEN}`,
  },
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(config, attempt = 0) {
  try {
    const response = await client(config);
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 429 && attempt < 3) {
      const retryAfterSeconds = parseInt(error.response.data.retryAfterSeconds) || 1;
      const waitTime = retryAfterSeconds * Math.pow(2, attempt);
      const jitter = waitTime * (Math.random() * 0.4 - 0.2);
      const finalWait = Math.max(0, waitTime + jitter) * 1000;
      
      console.log(`[retry ${attempt + 1}/3] waiting ${Math.round(finalWait / 1000)}s before retrying ${config.method.toUpperCase()} ${config.url}`);
      await sleep(finalWait);
      return request(config, attempt + 1);
    }
    if (attempt >= 3) {
      const err = new Error('Central API unavailable after 3 retries');
      err.status = 503;
      throw err;
    }
    throw error;
  }
}

export default {
  get: (url, params) => request({ method: 'get', url, params }),
};
