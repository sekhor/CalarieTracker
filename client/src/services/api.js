import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchMeals = async (params = {}) => {
  const res = await api.get('/meals', { params });
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
  const res = await axios.post(`${API_BASE_URL}/analyze`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
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

export default api;
