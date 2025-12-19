
import React from 'react';

// Simplified Actions for now
interface ControlsProps {
    onAction: (action: string) => void;
    availableActions: string[]; // List of allowed actions strings
    disabledActions?: string[]; // List of disabled actions strings
    isMyTurn: boolean;
}

export const Controls: React.FC<ControlsProps> = ({ onAction, availableActions, disabledActions = [], isMyTurn }) => {
    if (!isMyTurn) return <div className="text-white/50 text-sm">Esperando turno...</div>;

    if (availableActions.length === 0 && disabledActions.length === 0) return null;

    const actionLabels: { [key: string]: string } = {
        "CALL_ENVIDO": "Envido",
        "CALL_REAL_ENVIDO": "Real Envido",
        "CALL_FALTA_ENVIDO": "Falta Envido",
        "CALL_FLOR": "Flor",
        "CALL_CONTRAFLOR": "Contraflor",
        "CALL_CONTRAFLOR_AL_RESTO": "Al Resto",
        "CALL_TRUCO": "Truco",
        "CALL_RETRUCO": "Retruco",
        "CALL_VALE4": "Vale 4",
        "GO_TO_DECK": "Ir al Mazo",
        "ACCEPT": "Quiero",
        "REJECT": "No Quiero",
        "REMATCH": "Revancha"
    };

    return (
        <div className="absolute bottom-24 right-4 flex flex-col space-y-2 items-end z-50">
            <div className="glass-panel p-4 rounded-xl flex flex-wrap gap-2 justify-end max-w-sm">
                {[...availableActions, ...disabledActions].map(action => {
                    let label = actionLabels[action] || action;
                    // Safety override: Force correct label for Falta Envido if map fails
                    if (action === "CALL_FALTA_ENVIDO") label = "Falta Envido";

                    const isDisabled = disabledActions.includes(action);

                    return (
                        <button
                            key={action}
                            disabled={isDisabled}
                            onClick={() => !isDisabled && onAction(action)}
                            className={`
                                px-4 py-2 rounded-lg font-bold text-sm shadow-lg transition-all
                                ${isDisabled
                                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-50 border border-slate-600'
                                    : action === 'ACCEPT'
                                        ? 'bg-green-600 hover:bg-green-500 text-white'
                                        : action === 'REJECT'
                                            ? 'bg-red-600 hover:bg-red-500 text-white'
                                            : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:scale-105'
                                }
                            `}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
