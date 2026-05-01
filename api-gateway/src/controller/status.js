import axios from 'axios';
import { configDotenv } from 'dotenv';
configDotenv()

export const getStatus = async (req, res) => {
  const services = {
    'user-service': process.env.USER_SERVICE_URL || 'http://user-service:8001',
    'rental-service': process.env.RENTAL_SERVICE_URL || 'http://rental-service:8002',
    'analytics-service': process.env.ANALYTICS_SERVICE_URL || 'http://analytics-service:8003',
    'agentic-service': process.env.AGENTIC_SERVICE_URL || 'http://agentic-service:8004',
  };

  const downstream = {};
  await Promise.all(
    Object.entries(services).map(async ([name, url]) => {
      try {
        await axios.get(`${url}/status`, { timeout: 2000 });
        downstream[name] = 'OK';
      } catch {
        downstream[name] = 'UNREACHABLE';
      }
    })
  );

  res.json({ service: 'api-gateway', status: 'OK', downstream });
};
