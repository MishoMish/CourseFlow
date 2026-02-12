import { create } from 'zustand';
import api from '../lib/api';

export const useAuthStore = create((set, get) => ({
  token: localStorage.getItem('fmi_token') || null,
  user: JSON.parse(localStorage.getItem('fmi_user') || 'null'),

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('fmi_token', data.token);
    localStorage.setItem('fmi_user', JSON.stringify(data.user));
    set({ token: data.token, user: data.user });
    return data;
  },

  logout: () => {
    localStorage.removeItem('fmi_token');
    localStorage.removeItem('fmi_user');
    set({ token: null, user: null });
  },

  refreshUser: async () => {
    try {
      const { data } = await api.get('/auth/me');
      localStorage.setItem('fmi_user', JSON.stringify(data.user));
      set({ user: data.user });
    } catch (_) {
      get().logout();
    }
  },

  isSuperAdmin: () => get().user?.role === 'super_admin',
  isAdmin: () => ['super_admin', 'admin'].includes(get().user?.role),
}));
