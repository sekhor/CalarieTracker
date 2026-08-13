import axios from 'axios';

const AUTH_TOKEN_KEY = 'calorie_tracker_token';
const AUTH_USER_KEY = 'calorie_tracker_user';

//const API_BASE_URL = 'http://localhost:5000/api';

const getApiUrl = () => {
  const hostname = window.location.hostname;
  if (hostname === 'localhost') {
    return 'http://localhost:5000/api';
  } else if (hostname === 'agreeable-bush-057734510.7.azurestaticapps.net') {
    return 'https://calarie-api-faedf7akcfdrgtdf.southeastasia-01.azurewebsites.net/api';
  }
  // Default to production URL
  return '/calarie-api-faedf7akcfdrgtdf.southeastasia-01.azurewebsites.net/api';
};
 const API_BASE_URL = getApiUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getApiBaseUrl = () => API_BASE_URL;

export const getStoredToken = () => window.localStorage.getItem(AUTH_TOKEN_KEY);

export const getStoredUser = () => {
  const raw = window.localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const setAuthSession = ({ token, user }) => {
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
};

export const clearAuthSession = () => {
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.localStorage.removeItem(AUTH_USER_KEY);
};

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuthSession();
    }
    return Promise.reject(error);
  }
);

export const registerUser = async (payload) => {
  const res = await api.post('/auth/register', payload);
  return res.data;
};

export const loginUser = async (payload) => {
  const res = await api.post('/auth/login', payload);
  return res.data;
};

export const fetchCurrentUser = async () => {
  const res = await api.get('/auth/me');
  return res.data;
};

export const fetchMeals = async (params = {}) => {
  const res = await api.get('/meals', { params });
  return res.data;
};

export const fetchMealPhotoBlob = async (imageUrl) => {
  const relativePath = imageUrl.startsWith('/api') ? imageUrl.replace(/^\/api/, '') : imageUrl;
  const res = await api.get(relativePath, { responseType: 'blob' });
  return res.data;
};

export const createMeal = async (mealData) => {
  const res = await api.post('/meals', mealData);
  return res.data;
};

export const updateMeal = async (id, mealData) => {
  const res = await api.put(`/meals/${id}`, mealData);
  return res.data;
};

export const deleteMeal = async (id) => {
  const res = await api.delete(`/meals/${id}`);
  return res.data;
};

export const analyzeMealPhoto = async (formData) => {
  const token = getStoredToken();
  const res = await axios.post(`${API_BASE_URL}/analyze`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  return res.data;
};

export const fetchDashboardStats = async () => {
  const res = await api.get('/dashboard/stats');
  return res.data;
};

export const fetchSettings = async () => {
  const res = await api.get('/settings');
  return res.data;
};

export const saveAzureSettings = async (settings) => {
  const res = await api.post('/settings/azure', settings);
  return res.data;
};

export const saveMssqlSettings = async (settings) => {
  const res = await api.post('/settings/mssql', settings);
  return res.data;
};

export const saveGoalSettings = async (goals) => {
  const res = await api.post('/settings/goals', goals);
  return res.data;
};

export const fetchChatSessions = async () => {
  const res = await api.get('/chat/sessions');
  return res.data;
};

export const fetchChatSessionMessages = async (sessionId) => {
  const res = await api.get(`/chat/sessions/${sessionId}/messages`);
  return res.data;
};

export const sendChatMessage = async (payload) => {
  const res = await api.post('/chat/message', payload);
  return res.data;
};

export default api;
