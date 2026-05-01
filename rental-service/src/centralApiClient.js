import axios from 'axios';

const CENTRAL_API_BASE = process.env.CENTRAL_API_URL || 'https://technocracy.brittoo.xyz';
const MAX_RETRIES = 3;

const centralApi = axios.create({
  baseURL: CENTRAL_API_BASE,
  timeout: 10000,
});

async function centralApiGet(path, params = {}, attempt = 0) {
  try {
    const response = await centralApi.get(path, {
      params,
      headers: { Authorization: `Bearer ${process.env.CENTRAL_API_TOKEN}` },
    });
    return response.data;
  } catch (err) {
    if (err.response?.status === 429) {
      if (attempt >= MAX_RETRIES) {
        const retryAfter = err.response.data?.retryAfterSeconds || 60;
        throw {
          status: 503,
          body: {
            error: 'Central API unavailable after 3 retries',
            lastRetryAfter: retryAfter,
            suggestion: 'Try again in ~2 minutes',
          },
        };
      }
      const retryAfterSeconds = err.response.data?.retryAfterSeconds || 10;
      const jitter = 1 + (Math.random() * 0.4 - 0.2);
      const waitMs = retryAfterSeconds * Math.pow(2, attempt) * jitter * 1000;
      console.log(`[retry ${attempt + 1}/${MAX_RETRIES}] waiting ${Math.round(waitMs / 1000)}s before retrying GET ${path}`);
      await new Promise((r) => setTimeout(r, waitMs));
      return centralApiGet(path, params, attempt + 1);
    }
    if (err.response?.status === 404) {
      throw { status: 404, body: err.response.data };
    }
    if (err.response?.status >= 500) {
      throw { status: 502, body: { error: 'Upstream service error' } };
    }
    if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
      throw { status: 503, body: { error: 'Central API unreachable' } };
    }
    throw err;
  }
}

export { centralApiGet };
