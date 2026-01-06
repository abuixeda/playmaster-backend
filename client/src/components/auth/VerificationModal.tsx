
import { useState } from 'react';
import { API_URL } from '../../config';
import { ShieldCheck, Mail, AlertTriangle } from 'lucide-react';

interface VerificationModalProps {
    isOpen: boolean;
    onClose: () => void; // Should probably not be closeable if mandatory, but for now yes.
    onSuccess: () => void;
    token: string;
}

export function VerificationModal({ isOpen, onClose, onSuccess, token }: VerificationModalProps) {
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleVerify = async () => {
        if (code.length !== 6) {
            setError('El código debe tener 6 dígitos');
            return;
        }
        setLoading(true);
        setError('');

        try {
            const res = await fetch(`${API_URL}/api/auth/verify-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ code })
            });

            const data = await res.json();

            if (res.ok) {
                onSuccess();
                onClose();
            } else {
                setError(data.error || 'Error al verificar');
            }
        } catch (err) {
            setError('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#1e1b4b] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-fade-in-up">
                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mb-4 text-purple-400">
                        <Mail size={32} />
                    </div>

                    <h2 className="text-2xl font-black text-white mb-2">Verifica tu Email</h2>
                    <p className="text-slate-400 text-sm mb-6">
                        Hemos enviado un código de 6 dígitos a tu correo. <br />
                        <span className="text-xs opacity-50">(Revisa la consola del servidor si es dev)</span>
                    </p>

                    <div className="w-full space-y-4">
                        <input
                            type="text"
                            maxLength={6}
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                            placeholder="123456"
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-center text-2xl font-mono tracking-[0.5em] text-white focus:outline-none focus:border-purple-500 transition-colors"
                        />

                        {error && (
                            <div className="text-red-400 text-xs font-bold flex items-center justify-center gap-2 bg-red-500/10 p-2 rounded-lg">
                                <AlertTriangle size={12} /> {error}
                            </div>
                        )}

                        <button
                            onClick={handleVerify}
                            disabled={loading}
                            className={`w-full py-3 rounded-xl font-bold uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 ${loading ? 'bg-slate-700 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:scale-105 active:scale-95 transition-all text-white'}`}
                        >
                            {loading ? 'Verificando...' : <><ShieldCheck size={18} /> Verificar</>}
                        </button>
                    </div>

                    <button onClick={onClose} className="mt-6 text-xs text-slate-500 hover:text-white underline">
                        Cerrar sesión / Hacerlo más tarde
                    </button>
                </div>
            </div>
        </div>
    );
}
