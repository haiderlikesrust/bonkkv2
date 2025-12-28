import axios from 'axios';

// Use environment variable or default to localhost for development
// In production with nginx proxy, VITE_API_URL should be empty for relative URLs
const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:3001');

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const register = (email, password) => api.post('/api/auth/register', { email, password });
export const login = (email, password) => api.post('/api/auth/login', { email, password });
export const getMe = () => api.get('/api/auth/me');
export const connectWallet = (secretKey) => api.post('/api/auth/connect-wallet', { secretKey });
export const getPrivateKey = () => api.get('/api/auth/private-key');

// Wallets
export const createWallet = () => api.post('/api/wallets/create');
export const createDevWallet = () => api.post('/api/wallets/dev');

// Tokens
export const getNewTokens = (limit) => api.get('/api/tokens/new', { params: { limit } });
export const getToken = (mint) => api.get(`/api/tokens/${mint}`);
export const getTokenChart = (mint, timeframe = '1h', limit = 100) => 
  api.get(`/api/tokens/${mint}/chart`, { params: { timeframe, limit } });
export const getTokenTransactions = (mint, limit = 50) => 
  api.get(`/api/tokens/${mint}/transactions`, { params: { limit } });
export const getTokenTransfers = (mint, limit = 50) => 
  api.get(`/api/tokens/${mint}/transfers`, { params: { limit } });
export const getCreatorActivity = (mint) => 
  api.get(`/api/tokens/${mint}/creator-activity`);
export const getFeeHistory = (mint) => 
  api.get(`/api/tokens/${mint}/fee-history`);
export const uploadTokenImage = (data) => api.post('/api/tokens/upload-image', data);
export const createToken = (data) => api.post('/api/tokens/create', data);
export const getBuyTransaction = (mint, data) => api.post(`/api/tokens/${mint}/buy`, data);
export const getSellTransaction = (mint, data) => api.post(`/api/tokens/${mint}/sell`, data);

export default api;

