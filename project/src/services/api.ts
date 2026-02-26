import axios from 'axios';

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------
const api = axios.create({
    baseURL: '/api',
    headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken) {
                try {
                    const { data } = await axios.post(
                        '/api/token/refresh/',
                        { refresh: refreshToken }
                    );
                    localStorage.setItem('access_token', data.access);
                    api.defaults.headers.common['Authorization'] = `Bearer ${data.access}`;
                    return api(originalRequest);
                } catch {
                    // Refresh failed — fall through to logout
                }
            }
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// ---------------------------------------------------------------------------
// Helper: build multipart headers when data is FormData
// ---------------------------------------------------------------------------
const multipartHeaders = (data: unknown) =>
    data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined;

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------
export const projectService = {
    getProjects: (params?: Record<string, unknown>) => api.get('/projects/', { params }),
    createProject: (data: unknown) => api.post('/projects/', data),
    updateProject: (id: string | number, data: unknown) => api.patch(`/projects/${id}/`, data),
    deleteProject: (id: string | number) => api.delete(`/projects/${id}/`),
};

export const campaignService = {
    getCampaigns: (params?: Record<string, unknown> | string) => {
        const config = typeof params === 'string'
            ? { params: { project: params } }
            : { params };
        return api.get('/campaigns/', config);
    },
    createCampaign: (data: FormData) =>
        api.post('/campaigns/', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
    updateCampaign: (id: string, data: FormData | Record<string, unknown>) =>
        api.patch(`/campaigns/${id}/`, data, { headers: multipartHeaders(data) }),
    deleteCampaign: (id: string) => api.delete(`/campaigns/${id}/`),
};

export const executionService = {
    getExecutions: (params?: Record<string, unknown>) => api.get('/testcases/', { params }),
    createExecution: (data: FormData | Record<string, unknown>) =>
        api.post('/testcases/', data, { headers: multipartHeaders(data) }),
    updateExecution: (id: string, data: FormData | Record<string, unknown>) =>
        api.patch(`/testcases/${id}/`, data, { headers: multipartHeaders(data) }),
    deleteExecution: (id: string) => api.delete(`/testcases/${id}/`),
};

export const anomalyService = {
    getAnomalies: (params?: Record<string, unknown>) => api.get('/anomalies/', { params }),
    createAnomaly: (data: FormData | Record<string, unknown>) =>
        api.post('/anomalies/', data, { headers: multipartHeaders(data) }),
    updateAnomaly: (id: string, data: Record<string, unknown>) => api.patch(`/anomalies/${id}/`, data),
    deleteAnomaly: (id: string) => api.delete(`/anomalies/${id}/`),
};

export const commentService = {
    getComments: (params?: Record<string, unknown>) => api.get('/comments/', { params }),
    createComment: (data: FormData | Record<string, unknown>) =>
        api.post('/comments/', data, { headers: multipartHeaders(data) }),
    deleteComment: (id: string) => api.delete(`/comments/${id}/`),
};

export const emailService = {
    getEmails: (params?: Record<string, unknown>) => api.get('/emails/', { params }),
    sendEmail: (data: FormData | Record<string, unknown>) =>
        api.post('/emails/', data, { headers: multipartHeaders(data) }),
    markAsRead: (id: number) => api.post(`/emails/${id}/mark_read/`),
};

export const userService = {
    getUsers: (params?: Record<string, unknown>) => api.get('/users/', { params }),
};

export const aiService = {
    reformulate: (message: string, isSubject = false) =>
        api.post('/analytics/reformulate/', { message, is_subject: isSubject }),
    getTimelineGuard: (campaignId: string) =>
        api.get(`/analytics/timeline-guard/${campaignId}/`),
};

export default api;
