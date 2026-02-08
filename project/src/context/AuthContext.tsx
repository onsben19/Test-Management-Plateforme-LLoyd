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

interface AuthContextType {
    user: User | null;
    login: (email: string, pass: string) => Promise<void>;
    logout: () => void;
    loading: boolean;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchUser = async (userId: number) => {
        try {
            const response = await api.get(`/users/${userId}/`);
            setUser(response.data);
        } catch (error) {
            console.error("Failed to fetch user", error);
            logout();
        }
    };

    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('access_token');
            if (token) {
                try {
                    const decoded: any = jwtDecode(token);
                    // Check expiry
                    if (decoded.exp * 1000 < Date.now()) {
                        // Token expired, try refresh or logout
                        // For simplicity in init, let's rely on api interceptor or just logout if heavily expired
                        // Ideally we try to use the token by fetching user
                        await fetchUser(decoded.user_id);
                    } else {
                        await fetchUser(decoded.user_id);
                    }
                } catch (error) {
                    console.error("Invalid token", error);
                    logout();
                }
            }
            setLoading(false);
        };
        initAuth();
    }, []);

    const login = async (username: string, pass: string) => {
        // Note: Backend might expect 'username' or 'email'. Standard Django auth uses username.
        // The Login page has "Email" field. 
        // We should check if the backend handles email as username or if we need to send username.
        // Assuming 'username' field in request body is mapped to what the user types.
        const response = await api.post('/login/', { username, password: pass });
        const { access, refresh } = response.data;

        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);

        const decoded: any = jwtDecode(access);
        await fetchUser(decoded.user_id);
    };

    const logout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setUser(null);
        window.location.href = '/login';
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
