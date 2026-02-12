import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — auto logout
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const { pathname } = window.location;
      if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
        useAuthStore.getState().logout();
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
