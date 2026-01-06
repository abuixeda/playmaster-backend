
import { useState } from 'react';
import { VerificationModal } from './VerificationModal';
import { KycWizard } from './KycWizard';
import { ShieldCheck, UserPlus, CheckCircle } from 'lucide-react';

interface AuthWizardProps {
    onClose: () => void;
    onLoginSuccess: (token: string, user: any) => void;
}

export function AuthWizard({ onClose, onLoginSuccess }: AuthWizardProps) {
    const [step, setStep] = useState(1); // 1: Register, 2: Email Verify, 3: KYC, 4: Done

    // Form Data
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // Auth Data
    const [token, setToken] = useState<string | null>(null);

    // STEP 1: REGISTER
    const handleRegister = async () => {
        setLoading(true);
        try {
            const endpoint = `/api/auth/register`;
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, username, password })
            });
            const data = await res.json();

            if (res.ok) {
                // Success
                setToken(data.token);
                // Don't finish yet. Go to verify.
                setStep(2);
            } else {
                alert(data.error || "Error de registro");
            }
        } catch (e) {
            alert("Error conectando con el servidor");
        } finally {
            setLoading(false);
        }
    };

    // Render Steps
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-md">
            {/* Background Animation */}
            <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px] animate-pulse-slow"></div>
            </div>

            <div className="relative z-10 w-full max-w-4xl">
                {/* Step 1: Inline Register Form (or simplified) */}
                {step === 1 && (
                    <div className="bg-slate-900 border border-white/10 p-8 rounded-2xl max-w-md mx-auto shadow-2xl">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-400">
                                <UserPlus size={32} />
                            </div>
                            <h2 className="text-2xl font-bold text-white">Crear Cuenta</h2>
                            <p className="text-slate-400 text-sm">Únete a PlayMaster y comienza a ganar.</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Usuario</label>
                                <input value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-purple-500 outline-none" placeholder="MasterPlayer" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                                <input value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-purple-500 outline-none" placeholder="correo@ejemplo.com" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Contraseña</label>
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-purple-500 outline-none" placeholder="******" />
                            </div>

                            <button onClick={handleRegister} disabled={loading} className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl font-bold text-white hover:scale-[1.02] transition-transform shadow-lg">
                                {loading ? 'Creando...' : 'Registrarme y Verificar'}
                            </button>

                            <button onClick={onClose} className="w-full py-2 text-slate-500 text-xs font-bold hover:text-white">Cancelar</button>
                        </div>
                    </div>
                )}

                {/* Step 2: Email Verify */}
                {step === 2 && token && (
                    <VerificationModal
                        isOpen={true}
                        token={token}
                        onClose={() => { }} // Can't close without verifying? Allowed for now to not trap, but effectively creates unverified user.
                        onSuccess={() => setStep(3)} // Next: KYC
                    />
                )}

                {/* Step 3: KYC */}
                {step === 3 && (
                    <KycWizard
                        onClose={() => { }} // Mandatory. Maybe alert logic?
                        onComplete={() => setStep(4)}
                    />
                )}

                {/* Step 4: Success */}
                {step === 4 && (
                    <div className="bg-slate-900 border border-white/10 p-8 rounded-2xl max-w-sm mx-auto shadow-2xl text-center animate-fade-in-up">
                        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-green-400">
                            <CheckCircle size={48} />
                        </div>
                        <h2 className="text-3xl font-black text-white mb-2">¡Todo Listo!</h2>
                        <p className="text-slate-400 mb-6">Tu identidad ha sido verificada y tu cuenta está activa.</p>
                        <button onClick={() => {
                            // Fetch fresh user data just in case
                            // Actually we just passed verification
                            // We should probably rely on onLoginSuccess to refresh app
                            // But we need the USER object. 
                            // Let's refetch or just mock it.
                            // Reloading is safest since token is set.

                            // Hard reload to init app state
                            localStorage.setItem('token', token!);
                            // We need to set user in localstorage?
                            // VerificationModal/KycWizard might handle state but localstorage 'user' might be stale (unverified).
                            // We force reload which calls /auth/me in App.ts
                            window.location.reload();

                        }} className="w-full py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors">
                            Ingresar al Lobby
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
