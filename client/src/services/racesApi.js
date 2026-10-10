import api from '../api';

const unwrap = (res) => res.data?.data ?? res.data;

export const listRaces = () => api.get('/races').then(unwrap);

export const getRace = (id) => api.get(`/races/${id}`).then(unwrap);

export const createRace = (input) => api.post('/races', input).then(unwrap);

export const updateRace = (id, input) => api.put(`/races/${id}`, input).then(unwrap);

export const deleteRace = (id) => api.delete(`/races/${id}`).then(unwrap);

export const getNutritionProfile = () => api.get('/user/nutrition-profile').then(unwrap);

export const saveNutritionProfile = (profile) => api.put('/user/nutrition-profile', profile).then(unwrap);

export const getTrainingSummary = () => api.get('/user/training-summary').then(unwrap);
