import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

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

// Auth APIs
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// User APIs
export const userAPI = {
  getUsers: () => api.get('/users'),
  getUserById: (id) => api.get(`/users/${id}`),
  searchUsers: (query) => api.get(`/users/search/${query}`),
  updateProfile: (data) => api.put('/users/profile', data),
};

// File APIs
export const fileAPI = {
  uploadMedia: (formData) => api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  uploadProfilePicture: (formData) => api.post('/upload/profile-picture', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
};

// Message APIs
export const messageAPI = {
  sendMessage: (data) => api.post('/messages', data),
  getMessages: (userId) => api.get(`/messages/${userId}`),
  getConversations: () => api.get('/messages/conversations'),
  markAsDelivered: (userId) => api.put(`/messages/delivered/${userId}`),
  markAsRead: (userId) => api.put(`/messages/read/${userId}`),
  deleteMessage: (messageId) => api.delete(`/messages/${messageId}`),
};

export default api;