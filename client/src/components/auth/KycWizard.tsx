
import { useState, useRef } from 'react';
import { Camera, Upload, CheckCircle, ChevronRight, ChevronLeft, Shield } from 'lucide-react';

interface KycWizardProps {
    onClose: () => void;
    onComplete: () => void;
}

export function KycWizard({ onClose, onComplete }: KycWizardProps) {
    const [step, setStep] = useState(1); // 1: Intro, 2: ID, 3: Selfie, 4: Done
    const [idFront, setIdFront] = useState<File | null>(null);
    const [idBack, setIdBack] = useState<File | null>(null);
    const [selfie, setSelfie] = useState<string | null>(null);
    const [cameraActive, setCameraActive] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Camera Handlers
    const startCamera = async () => {
        try {
            setCameraActive(true);
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Camera error", err);
            alert("No se pudo acceder a la cámara. Revisa permisos.");
        }
    };

    const stopCamera = () => {
        if (videoRef.current?.srcObject) {
            const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
            tracks.forEach(track => track.stop());
            setCameraActive(false);
        }
    };

    const captureSelfie = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg');
            setSelfie(dataUrl);
            stopCamera();
        }
    };

    const handleSubmit = async () => {
        if (!idFront || !idBack || !selfie) return;

        try {
            const formData = new FormData();
            formData.append('idFront', idFront);
            formData.append('idBack', idBack);

            // Convert Base64 Selfie to File
            const res = await fetch(selfie);
            const blob = await res.blob();
            formData.append('selfie', new File([blob], "selfie.jpg", { type: "image/jpeg" }));

            const token = localStorage.getItem('token');
            const uploadRes = await fetch('/api/users/kyc', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await uploadRes.json();

            if (uploadRes.ok) {
                setStep(4);
                onComplete();
            } else {
                // Handle Error / Retry
                if (data.retry) {
                    alert("⚠️ " + data.error);
                    setSelfie(null);
                    setStep(3); // Ensure on Selfie step
                } else {
                    alert("Error: " + (data.error || "Intenta nuevamente."));
                }
            }
        } catch (error) {
            console.error(error);
            alert("Error de conexión uploading KYC.");
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-[#1e1b4b] border border-white/10 rounded-2xl flex flex-col overflow-hidden h-[600px] shadow-2xl relative">

                {/* Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#0f0720]/50">
                    <h2 className="text-xl font-black text-white flex items-center gap-2">
                        <Shield className="text-[#fbbf24]" /> Verificación de Identidad
                    </h2>
                    <div className="text-slate-500 text-xs font-bold uppercase tracking-wider">
                        Paso {step} de 4
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 p-8 overflow-y-auto">

                    {/* STEP 1: INTRO */}
                    {step === 1 && (
                        <div className="text-center h-full flex flex-col items-center justify-center space-y-6">
                            <div className="w-24 h-24 bg-[#fbbf24]/10 rounded-full flex items-center justify-center text-[#fbbf24] animate-pulse-slow">
                                <Shield size={48} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-2">Protegemos tu cuenta</h3>
                                <p className="text-slate-400 max-w-md mx-auto">
                                    Para cumplir con las regulaciones y asegurar que todos los jugadores sean reales y mayores de edad, necesitamos verificar tu identidad.
                                </p>
                            </div>
                            <ul className="text-left text-sm text-slate-300 space-y-3 bg-white/5 p-6 rounded-xl border border-white/5">
                                <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-400" /> Un documento de identidad (DNI/Pasaporte)</li>
                                <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-400" /> Una selfie en tiempo real</li>
                                <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-400" /> Menos de 2 minutos</li>
                            </ul>
                        </div>
                    )}

                    {/* STEP 2: ID UPLOAD */}
                    {step === 2 && (
                        <div className="space-y-8">
                            <h3 className="text-xl font-bold text-white text-center">Sube tu Documento (DNI)</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Front */}
                                <div className="border-2 border-dashed border-white/20 rounded-xl p-6 flex flex-col items-center justify-center gap-4 hover:border-[#fbbf24]/50 transition-colors bg-black/20 h-48 relative">
                                    {idFront ? (
                                        <>
                                            <div className="text-green-400 font-bold flex items-center gap-2"><CheckCircle /> Cargado</div>
                                            <div className="text-xs text-slate-500">{idFront.name}</div>
                                            <button onClick={() => setIdFront(null)} className="text-xs text-red-400 hover:underline">Cambiar</button>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="text-slate-400" size={32} />
                                            <div className="text-sm font-bold text-slate-300">Frente del DNI</div>
                                            <input type="file" accept="image/*" onChange={(e) => e.target.files && setIdFront(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
                                        </>
                                    )}
                                </div>

                                {/* Back */}
                                <div className="border-2 border-dashed border-white/20 rounded-xl p-6 flex flex-col items-center justify-center gap-4 hover:border-[#fbbf24]/50 transition-colors bg-black/20 h-48 relative">
                                    {idBack ? (
                                        <>
                                            <div className="text-green-400 font-bold flex items-center gap-2"><CheckCircle /> Cargado</div>
                                            <div className="text-xs text-slate-500">{idBack.name}</div>
                                            <button onClick={() => setIdBack(null)} className="text-xs text-red-400 hover:underline">Cambiar</button>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="text-slate-400" size={32} />
                                            <div className="text-sm font-bold text-slate-300">Dorso del DNI</div>
                                            <input type="file" accept="image/*" onChange={(e) => e.target.files && setIdBack(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: SELFIE */}
                    {step === 3 && (
                        <div className="flex flex-col items-center space-y-6">
                            <h3 className="text-xl font-bold text-white text-center">Tómate una Selfie</h3>

                            <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-[#fbbf24] shadow-[0_0_30px_rgba(251,191,36,0.2)] bg-black">
                                {selfie ? (
                                    <img src={selfie} alt="Selfie" className="w-full h-full object-cover transform scale-x-[-1]" />
                                ) : (
                                    cameraActive ? (
                                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-500">
                                            <Camera size={48} />
                                        </div>
                                    )
                                )}
                            </div>

                            <div className="flex gap-4">
                                {!selfie && !cameraActive && (
                                    <button onClick={startCamera} className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg font-bold">Activar Cámara</button>
                                )}
                                {!selfie && cameraActive && (
                                    <button onClick={captureSelfie} className="bg-[#fbbf24] hover:bg-[#d97706] text-black px-6 py-2 rounded-lg font-bold">Capturar</button>
                                )}
                                {selfie && (
                                    <button onClick={() => { setSelfie(null); startCamera(); }} className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg font-bold">Repetir</button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* STEP 4: SUCCESS */}
                    {step === 4 && (
                        <div className="text-center h-full flex flex-col items-center justify-center space-y-6 animate-fade-in-up">
                            <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center text-green-400 mb-4">
                                <CheckCircle size={48} />
                            </div>
                            <h3 className="text-3xl font-black text-white">¡Datos Recibidos!</h3>
                            <p className="text-slate-400">
                                Nuestro sistema está analizando tu identidad. Te notificaremos en unos minutos.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer / Controls */}
                <div className="p-6 border-t border-white/5 bg-[#0f0720]/50 flex justify-between">
                    {step > 1 && step < 4 && (
                        <button onClick={() => setStep(s => s - 1)} className="px-4 py-2 text-slate-400 hover:text-white font-bold flex items-center gap-2">
                            <ChevronLeft size={16} /> Atrás
                        </button>
                    )}
                    {step === 1 && (
                        <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white font-bold">Cancelar</button>
                    )}

                    <div className="flex-1"></div>

                    {step === 1 && (
                        <button onClick={() => setStep(2)} className="bg-white text-black px-6 py-2 rounded-lg font-bold hover:bg-slate-200 flex items-center gap-2">
                            Comenzar <ChevronRight size={16} />
                        </button>
                    )}
                    {step === 2 && (
                        <button
                            onClick={() => setStep(3)}
                            disabled={!idFront || !idBack}
                            className={`px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors ${idFront && idBack ? 'bg-white text-black hover:bg-slate-200' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
                        >
                            Siguiente <ChevronRight size={16} />
                        </button>
                    )}
                    {step === 3 && (
                        <button
                            onClick={handleSubmit}
                            disabled={!selfie}
                            className={`px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors ${selfie ? 'bg-[#fbbf24] text-black hover:bg-[#d97706]' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
                        >
                            Finalizar y Enviar
                        </button>
                    )}
                    {step === 4 && (
                        <button onClick={onComplete} className="bg-green-500 text-white px-8 py-2 rounded-lg font-bold hover:bg-green-600">
                            Entendido
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
}
