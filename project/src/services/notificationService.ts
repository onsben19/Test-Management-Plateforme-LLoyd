import api from './api';

export interface Notification {
    id: number;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
    type: string;
    related_campaign?: number;
}

export const notificationService = {
    getNotifications: () => api.get<Notification[]>('/notifications/'),
    markAsRead: (id: number) => api.post(`/notifications/${id}/mark_read/`),
    markAllAsRead: () => api.post('/notifications/mark_all_read/'),
};
