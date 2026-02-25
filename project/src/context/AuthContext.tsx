import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { jwtDecode } from 'jwt-decode';

interface User {
    id: number;
    username: string;
    email: string;
    role: string;
    first_name: string;
    last_name: string;
}

interface DecodedToken {
    user_id: number;
    exp: number;
}

interface AuthContextType {
    user: User | null;
    login: (username: string, pass: string) => Promise<void>;
    logout: () => void;
    loading: boolean;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const logout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setUser(null);
        window.location.href = '/login';
    };

    const fetchUser = async (userId: number) => {
        try {
            const response = await api.get(`/users/${userId}/`);
            setUser(response.data);
        } catch {
            logout();
        }
    };

    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('access_token');
            if (token) {
                try {
                    const decoded = jwtDecode<DecodedToken>(token);
                    await fetchUser(decoded.user_id);
                } catch {
                    logout();
                }
            }
            setLoading(false);
        };
        initAuth();
    }, []);

    const login = async (username: string, pass: string) => {
        const response = await api.post('/login/', { username, password: pass });
        const { access, refresh } = response.data;

        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);

        const decoded = jwtDecode<DecodedToken>(access);
        await fetchUser(decoded.user_id);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
