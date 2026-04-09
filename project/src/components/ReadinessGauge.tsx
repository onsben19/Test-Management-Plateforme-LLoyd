import React from 'react';
import { motion } from 'framer-motion';

interface ReadinessGaugeProps {
    score: number;
    size?: number;
    label?: string;
}

const ReadinessGauge: React.FC<ReadinessGaugeProps> = ({ score, size = 120, label = "Readiness" }) => {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    const getColor = (s: number) => {
        if (s >= 80) return '#10b981'; // Green
        if (s >= 40) return '#f59e0b'; // Amber
        return '#ef4444'; // Red
    };

    const color = getColor(score);

    return (
        <div className="flex flex-col items-center justify-center gap-2">
            <div className="relative" style={{ width: size, height: size }}>
                <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                    {/* Background Circle */}
                    <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.05)"
                        strokeWidth="8"
                    />
                    {/* Progress Circle */}
                    <motion.circle
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="none"
                        stroke={color}
                        strokeWidth="8"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: offset }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                    <span
                        className="font-black tracking-tighter leading-none"
                        style={{ fontSize: size * 0.28 }}
                    >
                        {score}%
                    </span>
                    {label && (
                        <span
                            className="uppercase font-bold text-slate-500 tracking-widest mt-0.5"
                            style={{ fontSize: size * 0.1 }}
                        >
                            {label}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReadinessGauge;
