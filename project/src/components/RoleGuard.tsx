
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

interface RoleGuardProps {
    children: React.ReactNode;
    allowedRoles: string[];
}

const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedRoles }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="flex justify-center items-center h-screen text-slate-300">Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (!allowedRoles.includes(user.role)) {
        return <Navigate to="/unauthorized" replace />;
    }

    return <>{children}</>;
};

export default RoleGuard;
