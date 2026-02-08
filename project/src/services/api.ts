import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
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
    async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken) {
                try {
                    const response = await axios.post(`${API_URL}/token/refresh/`, {
                        refresh: refreshToken,
                    });
                    localStorage.setItem('access_token', response.data.access);
                    api.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;
                    return api(originalRequest);
                } catch (refreshError) {
                    console.error('RefreshToken expired or invalid', refreshError);
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    window.location.href = '/login';
                }
            } else {
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);


export const projectService = {
    getProjects: (params?: any) => api.get('/projects/', { params }),
    createProject: (data: any) => api.post('/projects/', data),
    updateProject: (id: any, data: any) => api.patch(`/projects/${id}/`, data),
    deleteProject: (id: any) => api.delete(`/projects/${id}/`),
};

export const campaignService = {
    getCampaigns: (params?: any) => {
        // Handle both simple project_id string (legacy) and params object
        const config = typeof params === 'string'
            ? { params: { project: params } }
            : { params };
        return api.get('/campaigns/', config);
    },
    createCampaign: (data: FormData) => api.post('/campaigns/', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    updateCampaign: (id: string, data: FormData | any) => {
        const isFormData = data instanceof FormData;
        return api.patch(`/campaigns/${id}/`, data, {
            headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined
        });
    },
    deleteCampaign: (id: string) => api.delete(`/campaigns/${id}/`),
};

export const executionService = {
    getExecutions: (params?: any) => api.get('/testcases/', { params }),
    createExecution: (data: any) => {
        const isFormData = data instanceof FormData;
        return api.post('/testcases/', data, {
            headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined
        });
    },
    updateExecution: (id: string, data: any) => {
        const isFormData = data instanceof FormData;
        return api.patch(`/testcases/${id}/`, data, {
            headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined
        });
    },
    deleteExecution: (id: string) => api.delete(`/testcases/${id}/`),
};

export const anomalyService = {
    getAnomalies: (params?: any) => api.get('/anomalies/', { params }),
    createAnomaly: (data: any) => {
        const isFormData = data instanceof FormData;
        return api.post('/anomalies/', data, {
            headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined
        });
    },
    updateAnomaly: (id: string, data: any) => api.patch(`/anomalies/${id}/`, data),
    deleteAnomaly: (id: string) => api.delete(`/anomalies/${id}/`),
};

export const commentService = {
    getComments: (params?: any) => api.get('/comments/', { params }),
    createComment: (data: any) => api.post('/comments/', data),
    deleteComment: (id: string) => api.delete(`/comments/${id}/`),
};

export const userService = {
    getUsers: (params?: any) => api.get('/users/', { params }),
};

export default api;
