import type { ReactNode } from 'react';
import bgPattern from '../../assets/bg-pattern.png';

interface LayoutProps {
    children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
    return (
        <div className="min-h-screen w-full relative overflow-hidden bg-[--color-page-dark] text-white font-sans selection:bg-[--color-primary] selection:text-white">
            {/* Background Layer with Pattern */}
            <div
                className="absolute inset-0 z-0 opacity-40 pointer-events-none"
                style={{
                    backgroundImage: `url(${bgPattern})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                }}
            />

            {/* Content Container - Mobile Optimized */}
            <div className="relative z-10 w-full max-w-md mx-auto min-h-screen flex flex-col pb-24">
                {children}
            </div>
        </div>
    );
}
