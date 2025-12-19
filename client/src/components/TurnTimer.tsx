
import React, { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';

interface TurnTimerProps {
    deadline?: number;
    totalDuration?: number; // Optional, for progress bar if needed
    onTimeout?: () => void;
    active: boolean;
    serverNow?: number; // Optional sync
    className?: string; // Add className prop
}

export const TurnTimer: React.FC<TurnTimerProps> = ({ deadline, active, className }) => {
    const [timeLeft, setTimeLeft] = useState(0);

    useEffect(() => {
        if (!active || !deadline) {
            setTimeLeft(0);
            return;
        }

        const interval = setInterval(() => {
            const now = Date.now();
            const remain = Math.max(0, deadline - now);

            setTimeLeft(Math.ceil(remain / 1000));
            // Simple calculation for now: assume 30s or 45s standard max? 
            // Better to rely on just visual count.

            if (remain <= 0) {
                clearInterval(interval);
            }
        }, 200);

        return () => clearInterval(interval);
    }, [deadline, active]);

    if (!active || !deadline || timeLeft <= 0) return null;

    // Visual styles based on urgency
    const isUrgent = timeLeft <= 10;
    const color = isUrgent ? "text-red-400 animate-pulse" : "text-white";
    const bgColor = isUrgent ? "bg-red-500/20 border-red-500/50" : "bg-black/60 border-white/10";

    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-md shadow-lg transition-all ${bgColor} ${className}`}>
            <Timer size={14} className={color} />
            <span className={`font-mono font-bold text-sm ${color}`}>
                00:{timeLeft.toString().padStart(2, '0')}
            </span>
        </div>
    );
};
