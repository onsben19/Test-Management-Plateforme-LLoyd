
import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

const Unauthorized = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-slate-100">
            <div className="p-8 max-w-md text-center bg-slate-800 rounded-lg shadow-xl border border-slate-700">
                <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h1 className="text-3xl font-bold mb-2 text-white">Accès Refusé</h1>
                <p className="text-slate-400 mb-6">
                    Vous n'avez pas les permissions nécessaires pour accéder à cette page.
                </p>
                <Link
                    to="/"
                    className="inline-flex items-center justify-center px-5 py-2 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Retour au Tableau de bord
                </Link>
            </div>
        </div>
    );
};

export default Unauthorized;
