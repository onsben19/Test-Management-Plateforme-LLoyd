import axios from 'axios';

const API_BASE_URL = `${(import.meta.env.VITE_API_BASE_URL || 'https://api.insuretb.tech/api').replace(/\/+$/, '')}/`;

const api = axios.create({
    baseURL: API_BASE_URL,
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
                        `${API_BASE_URL}/token/refresh/`,
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
    data instanceof FormData ? { 'Content-Type': undefined } : undefined;

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------
export const projectService = {
    getProjects: (params?: Record<string, unknown>) => api.get('/projects/', { params }),
    createProject: (data: unknown) => api.post('/projects/', data),
    updateProject: (id: string | number, data: unknown) => api.patch(`/projects/${id}/`, data),
    deleteProject: (id: string | number) => api.delete(`/projects/${id}/`),
};

export const businessProjectService = {
    getBusinessProjects: (params?: Record<string, unknown>) => api.get('/business-projects/', { params }),
    createBusinessProject: (data: unknown) => api.post('/business-projects/', data),
    updateBusinessProject: (id: string | number, data: unknown) => api.patch(`/business-projects/${id}/`, data),
    deleteBusinessProject: (id: string | number) => api.delete(`/business-projects/${id}/`),
};

export const campaignService = {
    getCampaigns: (params?: Record<string, unknown> | string) => {
        const config = typeof params === 'string'
            ? { params: { project: params } }
            : { params };
        return api.get('/campaigns/', config);
    },
    createCampaign: (data: FormData) =>
        api.post('/campaigns/', data, { headers: { 'Content-Type': undefined } }),
    updateCampaign: (id: string, data: FormData | Record<string, unknown>) =>
        api.patch(`/campaigns/${id}/`, data, { headers: multipartHeaders(data) }),
    deleteCampaign: (id: string) => api.delete(`/campaigns/${id}/`),
    getCampaignDashboard: (id: string | number) => api.get(`/campaigns/${id}/dashboard/`),
};

export const executionService = {
    getExecutions: (params?: Record<string, unknown>) => api.get('/testcases/', { params }),
    getExecution: (id: string | number) => api.get(`/testcases/${id}/`),
    createExecution: (data: FormData | Record<string, unknown>) =>
        api.post('/testcases/', data, { headers: multipartHeaders(data) }),
    updateExecution: (id: string, data: FormData | Record<string, unknown>) =>
        api.patch(`/testcases/${id}/`, data, { headers: multipartHeaders(data) }),
    deleteExecution: (id: string) => api.delete(`/testcases/${id}/`),
    generateScript: (id: string | number, manual_data?: string) => api.post(`/testcases/${id}/generate-script/`, { manual_data }),
    generateScriptStandalone: (data: { title: string, manual_data: string }) => api.post('/testcases/generate-script-standalone/', data),
    saveScript: (id: string | number, code: string) => api.post(`/testcases/${id}/save-script/`, { code }),
    executeScript: (id: string | number, mode: 'headless' | 'headed' | 'ui' = 'headless') => api.post(`/testcases/${id}/execute-script/`, { execution_mode: mode }),
    getLiveLogs: (id: string | number) => api.get(`/testcases/${id}/live-logs/`),
    getVideoUrl: (id: string | number) => {
        const token = localStorage.getItem('access_token') || '';
        const qs = token ? `?token=${encodeURIComponent(token)}` : '';
        return `${API_BASE_URL}testcases/${id}/serve-video/${qs}`;
    },
};

export const anomalyService = {
    getAnomalies: (params?: Record<string, unknown>) => api.get('/anomalies/', { params }),
    getAnomaly: (id: string | number) => api.get(`/anomalies/${id}/`),
    createAnomaly: (data: FormData | Record<string, unknown>) =>
        api.post('/anomalies/', data, { headers: multipartHeaders(data) }),
    updateAnomaly: (id: string, data: FormData | Record<string, unknown>) =>
        api.patch(`/anomalies/${id}/`, data, { headers: multipartHeaders(data) }),
    exportAnomaliesPdf: (params?: Record<string, unknown>) =>
        api.get('/anomalies/export_pdf/', { params, responseType: 'blob' }),
    exportAnomaliesXlsx: (params?: Record<string, unknown>) =>
        api.get('/anomalies/export_xlsx/', { params, responseType: 'blob' }),
    diagnoseExternalLogs: (data: { logs: string; code?: string }) =>
        api.post('/anomalies/diagnose_external_logs/', data),
    deleteAnomaly: (id: string) => api.delete(`/anomalies/${id}/`),
};

export const commentService = {
    getComments: (params?: Record<string, unknown>) => api.get('/comments/', { params }),
    createComment: (data: FormData | Record<string, unknown>) =>
        api.post('/comments/', data, { headers: multipartHeaders(data) }),
    updateComment: (id: string, data: Record<string, unknown>) =>
        api.patch(`/comments/${id}/`, data),
    deleteComment: (id: string) => api.delete(`/comments/${id}/`),
};

export const chatService = {
    getConversations: () => api.get('/chat/conversations/'),
    createConversation: (data: any) => api.post('/chat/conversations/', data),
    getMessages: (params?: Record<string, unknown>) => api.get('/chat/messages/', { params }),
    sendMessage: (data: any) => api.post('/chat/messages/', data, {
        headers: data instanceof FormData ? { 'Content-Type': undefined } : undefined
    }),
    updateMessage: (id: string, data: any) => api.patch(`/chat/messages/${id}/`, data),
    deleteMessage: (id: string) => api.delete(`/chat/messages/${id}/`),
    forwardMessage: (id: string, targetConvId: string) => api.post(`/chat/messages/${id}/forward/`, { target_conversation: targetConvId }),
    markConversationRead: (conversationId: string, lastMessageId?: string | number) =>
        api.post(`/chat/conversations/${conversationId}/mark_read/`, {
            last_message_id: lastMessageId ?? undefined,
        }),
};

export const emailService = {
    getEmails: (params?: Record<string, unknown>) => api.get('/emails/', { params }),
    sendEmail: (data: FormData | Record<string, unknown>) =>
        api.post('/emails/', data, { headers: multipartHeaders(data) }),
    markAsRead: (id: number) => api.post(`/emails/${id}/mark_read/`),
    deleteEmail: (id: number) => api.delete(`/emails/${id}/`),
};

export const userService = {
    getUsers: (params?: Record<string, unknown>) => api.get('/users/', { params }),
    updateProfile: (data: FormData) =>
        api.patch('/profile/', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
    requestPasswordReset: (identifier: string) =>
        api.post('/forgot-password/', { identifier }),
};

export const aiService = {
    reformulate: (message: string, isSubject = false, isTestSteps = false, isChat = false, isEmail = false) =>
        api.post('/analytics/reformulate/', {
            message,
            is_subject: isSubject,
            is_test_steps: isTestSteps,
            is_chat: isChat,
            is_email: isEmail,
        }),
    getTimelineGuard: (campaignId: string) =>
        api.get(`/analytics/timeline-guard/${campaignId}/`),
    getMessages: (conversationId: string) =>
        api.get(`/analytics/conversations/${conversationId}/messages/`),
    ask: (data: FormData) =>
        api.post('/analytics/ask/', data, { headers: { 'Content-Type': undefined } }),
    getReadinessScore: (campaignId: string | number) =>
        api.get(`/analytics/readiness-score/${campaignId}/`),
    getReadinessScoreByProject: (projectId: string | number) =>
        api.get(`/analytics/readiness-score/project/${projectId}/`),
    exportClosureReport: (campaignId: string | number) =>
        api.get(`/analytics/closure-report/${campaignId}/`, { responseType: 'blob' }),
    getDashboardBrief: (stats: Record<string, unknown>) =>
        api.post('/analytics/dashboard-brief/', { stats }),
    getCatchupPlan: (campaignId: string | number) =>
        api.get(`/analytics/catchup-plan/${campaignId}/`),
    notifyCatchupPlan: (campaignId: string | number, testerIds: number[]) =>
        api.post(`/analytics/catchup-plan/${campaignId}/notify/`, { tester_ids: testerIds }),
    applyCatchupPlan: (campaignId: string | number, assignments: { tester_id: number; test_count: number }[]) =>
        api.post(`/analytics/catchup-plan/${campaignId}/`, { tester_ids: assignments }),
    applyRecommendation: (campaignId: string | number, actionId: string) =>
        api.post('/analytics/apply-recommendation/', { campaign_id: campaignId, action_id: actionId }),
    getReinforcementStatus: (campaignId: string | number) =>
        api.get(`/analytics/reinforcement-status/${campaignId}/`),
    getPendingReinforcements: () =>
        api.get('/analytics/pending-reinforcements/'),
    acceptReinforcement: (campaignId: string | number, managerEmail: string) =>
        api.post('/analytics/respond-n8n/', { campaign_id: campaignId, statut: 'accepte', manager_email: managerEmail }),
    refuseReinforcement: (campaignId: string | number, managerEmail: string) =>
        api.post('/analytics/respond-n8n/', { campaign_id: campaignId, statut: 'refuse', manager_email: managerEmail }),
    ollamaChat: (query: string, context?: string) =>
        api.post('/analytics/ollama-chat/', { query, context }),
    executeSql: (sql: string, messageId: string | number) =>
        api.post('/analytics/execute-sql/', { sql, message_id: messageId }),
};

export const analyticsService = {
    getHistoricalReleases: (
        projectId: string | number,
        params?: { page?: number; page_size?: number }
    ) => api.get('/analytics/releases/', {
        params: { project_id: projectId, ...params },
    }),
    getHistoricalTesters: (projectId: string | number) => api.get('/analytics/testers/', { params: { project_id: projectId, period: '6_releases' } }),
    getHistoricalModules: (projectId: string | number) => api.get('/analytics/modules/', { params: { project_id: projectId } }),
    getQANews: () => api.get('/analytics/qa-news/'),
    deleteQANews: (id: string | number) => api.delete('/analytics/qa-news/', { params: { id } }),
    triggerQAScraping: () => api.post('/analytics/qa-news/'),
};

export const savedVisualizationService = {
    getSaved: () => api.get('/analytics/saved-visualizations/'),
    save: (data: { title: string; query: string; sql: string; type: string; data: any }) =>
        api.post('/analytics/saved-visualizations/', data),
    delete: (id: string | number) => api.delete(`/analytics/saved-visualizations/${id}/`),
    refresh: (id: string | number) => api.post(`/analytics/saved-visualizations/${id}/refresh/`),
};

export default api;
