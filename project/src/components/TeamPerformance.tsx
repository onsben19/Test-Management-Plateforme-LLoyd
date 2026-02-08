import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const productivityData = [
    { name: 'Thomas A.', tests: 45, bugs: 2 },
    { name: 'Sarah C.', tests: 38, bugs: 5 },
    { name: 'Ellen R.', tests: 52, bugs: 1 },
    { name: 'John D.', tests: 29, bugs: 3 },
    { name: 'Jane S.', tests: 41, bugs: 0 },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const TeamPerformance = () => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Productivity Chart */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                <h3 className="text-lg font-medium text-white mb-6">Productivité des Testeurs (Tests vs Bugs)</h3>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={productivityData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                            <XAxis dataKey="name" stroke="#94a3b8" />
                            <YAxis stroke="#94a3b8" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                itemStyle={{ color: '#f8fafc' }}
                                cursor={{ fill: 'rgba(51, 65, 85, 0.4)' }}
                            />
                            <Bar dataKey="tests" name="Tests Exécutés" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="bugs" name="Bugs Trouvés" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Success Ratio */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                <h3 className="text-lg font-medium text-white mb-6">Répartition de la Charge</h3>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={productivityData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="tests"
                            >
                                {productivityData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                itemStyle={{ color: '#f8fafc' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-4 mt-4">
                    {productivityData.map((entry, index) => (
                        <div key={entry.name} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                            <span className="text-sm text-slate-400">{entry.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TeamPerformance;
