import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:2005/api', //  backend URL
});

// Automatically attach token to every request
API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// Auth endpoints
export const register = (userData) => API.post('/auth/register', userData);
export const login = (userData) => API.post('/auth/login', userData);

// Protected endpoints (we'll add more later)
export const getProfile = () => API.get('/auth/profile');
export const getAllUsers = () => API.get('/auth/users'); // admin only