import axios from 'axios';

const API_URL = import.meta.env.VITE_GATEWAY_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const login = async (credentials: any) => {
  const res = await api.post('/users/login', credentials);
  if (res.data.token) {
    localStorage.setItem('token', res.data.token);
  }
  return res.data;
};

export const register = async (userData: any) => {
  const res = await api.post('/users/register', userData);
  if (res.data.token) {
    localStorage.setItem('token', res.data.token);
  }
  return res.data;
};

export const logout = () => {
  localStorage.removeItem('token');
  window.location.href = '/login';
};

export const getSystemStatus = async () => {
  const res = await api.get('/status');
  return res.data;
};

export const getProducts = async (category?: string, page = 1) => {
  const params = new URLSearchParams({ page: page.toString() });
  if (category) params.append('category', category);
  const res = await api.get(`/rentals/products?${params.toString()}`);
  return res.data;
};

export const checkAvailability = async (productId: string, from: string, to: string) => {
  const res = await api.get(`/rentals/products/${productId}/availability?from=${from}&to=${to}`);
  return res.data;
};

export const getRecommendations = async (date: string) => {
  const res = await api.get(`/analytics/recommendations?date=${date}&limit=10`);
  return res.data;
};

const CHAT_URL = import.meta.env.VITE_CHAT_URL || `/chat`;

export const chatWithAgent = async (sessionId: string, message: string) => {
  const res = await api.post(CHAT_URL, { sessionId, message });
  return res.data;
};
