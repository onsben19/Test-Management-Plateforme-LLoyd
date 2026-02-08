import React from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import TeamPerformance from '../components/TeamPerformance';

const TeamPerformancePage = () => {
    return (
        <div className="min-h-screen bg-slate-900">
            <Header />
            <div className="flex">
                <Sidebar />
                <main className="flex-1 lg:ml-64">
                    <div className="p-6 space-y-6">
                        <div className="mb-8">
                            <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">
                                <span className="text-gradient">Performance de l'Équipe</span>
                            </h1>
                            <p className="text-slate-400">Suivi détaillé de la productivité et de la qualité</p>
                        </div>
                        <TeamPerformance />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default TeamPerformancePage;
