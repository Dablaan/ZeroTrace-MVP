"use client";

import { useState } from "react";

interface AuthStepProps {
    onConnect: (email: string, appPassword: string) => void;
    isLoading: boolean;
    error: string | null;
    progress?: number;
}

export default function AuthStep({ onConnect, isLoading, error, progress = 0 }: AuthStepProps) {
    const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
    const [email, setEmail] = useState("");
    const [appPassword, setAppPassword] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConnect(email, appPassword);
    };

    return (
        <>
            {/* Background Decoration */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-blue-500/10 rounded-full blur-[100px]"></div>

            {/* Main Content Panel */}
            <main className="relative z-10 w-full max-w-xl">
                <div className="glass-panel p-8 md:p-12 rounded-3xl shadow-2xl flex flex-col items-center text-center">
                    {/* Trust Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8">
                        <span className="text-sm font-medium text-slate-300">🛡️ 100% Gratis. 100% Privado.</span>
                    </div>

                    {/* Hero Section */}
                    <div className="space-y-4 mb-10">
                        <h1 className="text-white text-4xl md:text-5xl font-black leading-tight tracking-tight">
                            Limpia tu correo en segundos. <span className="text-primary">Sin dejar rastro.</span>
                        </h1>
                        <p className="text-slate-400 text-lg">La herramienta definitiva para desuscribirse masivamente sin comprometer tu privacidad.</p>

                        <div className="flex flex-wrap justify-center gap-3 mt-8">
                            <div className="glass-panel bg-white/5 backdrop-blur-md px-4 py-3 rounded-2xl border-0 flex flex-col items-center min-w-[110px]">
                                <span className="text-primary font-bold text-sm">2.4M</span>
                                <span className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Mails Limpiados</span>
                            </div>
                            <div className="glass-panel bg-white/5 backdrop-blur-md px-4 py-3 rounded-2xl border-0 flex flex-col items-center min-w-[110px]">
                                <span className="text-primary font-bold text-sm">12.5 TB</span>
                                <span className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Liberados</span>
                            </div>
                            <div className="glass-panel bg-white/5 backdrop-blur-md px-4 py-3 rounded-2xl border-0 flex flex-col items-center min-w-[110px]">
                                <span className="text-primary font-bold text-sm">850 Kg</span>
                                <span className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">CO2 Ahorrado</span>
                            </div>
                        </div>
                    </div>

                    {/* Dynamic View: Form OR Progress Section */}
                    {!isLoading ? (
                        <form onSubmit={handleSubmit} className="w-full space-y-6 animate-in fade-in zoom-in duration-300">
                            <div className="space-y-4 text-left">
                                <div className="flex flex-col gap-2">
                                    <label className="text-slate-300 text-sm font-semibold ml-1">Correo Electrónico</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-primary transition-colors">
                                            <span className="material-symbols-outlined text-xl">mail</span>
                                        </div>
                                        <input
                                            type="email"
                                            className="glass-input w-full h-14 pl-12 pr-4 rounded-2xl transition-all text-base"
                                            placeholder="nombre@ejemplo.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-slate-300 text-sm font-semibold ml-1">Contraseña de Aplicación</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-primary transition-colors">
                                            <span className="material-symbols-outlined text-xl">key</span>
                                        </div>
                                        <input
                                            type="password"
                                            className="glass-input w-full h-14 pl-12 pr-4 rounded-2xl transition-all text-base"
                                            placeholder="Introduce tu App Password"
                                            value={appPassword}
                                            onChange={(e) => setAppPassword(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-14 rounded-2xl transition-all transform active:-translate-y-px active:scale-[0.98] shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                            >
                                <span>Limpiar Correo Ahora</span>
                                <span className="material-symbols-outlined">cleaning</span>
                            </button>

                            {error && (
                                <div className="p-3 mt-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center gap-2 text-red-400 text-sm animate-in fade-in slide-in-from-top-2">
                                    <span className="material-symbols-outlined text-[18px]">error</span>
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="pt-4 text-center">
                                <button
                                    type="button"
                                    onClick={() => setIsPrivacyModalOpen(true)}
                                    className="text-slate-400 hover:text-primary text-sm font-medium underline underline-offset-4 transition-colors"
                                >
                                    ¿Cuál es el truco?
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="w-full bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl p-8 shadow-2xl animate-in fade-in duration-500">
                            <div className="flex justify-between items-end mb-4 text-left">
                                <div className="flex flex-col">
                                    <h2 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-1">Estado del Escaneo</h2>
                                    <p className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                                        Analizando 2000 correos
                                        {progress < 100 && <span className="material-symbols-outlined animate-spin text-primary text-md">refresh</span>}
                                    </p>
                                </div>
                                <span className="text-primary font-bold text-2xl mb-1">{progress}%</span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-4 overflow-hidden shadow-inner my-6">
                                <div
                                    className="bg-primary h-full rounded-full shadow-[0_0_15px_rgba(20,184,166,0.8)] transition-all duration-700 ease-out"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                            <p className="mt-2 text-slate-400 text-sm leading-relaxed text-center">
                                Extrayendo metadatos con el motor <i>Zero-Data</i>.<br /><span className="text-primary/80">Ningún correo se guarda en disco.</span>
                            </p>
                        </div>
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer className="mt-12 text-slate-500 text-xs text-center z-10">
                <p>© 2024 ZeroTrace. No almacenamos tus credenciales.</p>
            </footer>

            {/* Privacy Modal Overlay */}
            {isPrivacyModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" id="privacy-modal">
                    <div className="glass-panel w-full max-w-md rounded-3xl p-8 border border-white/20 shadow-2xl relative">
                        <button
                            className="absolute top-4 right-4 text-slate-400 hover:text-white"
                            onClick={() => setIsPrivacyModalOpen(false)}
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                        <div className="flex flex-col items-center text-center">
                            <div className="size-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-6">
                                <span className="material-symbols-outlined text-4xl">security</span>
                            </div>
                            <h3 className="text-white text-2xl font-bold mb-4">Cero Retención de Datos</h3>
                            <div className="text-slate-400 leading-relaxed mb-8">
                                <i>Tu información se procesa en la memoria volátil (RAM) de nuestros servidores seguros y se autodestruye milisegundos después de limpiar tu bandeja. No guardamos tus correos, credenciales ni metadatos. El único rastro que queda de tu paso por ZeroTrace es una suma anónima en nuestros contadores globales de impacto (correos borrados y CO2 ahorrado), totalmente desvinculada de tu identidad. Eres el único dueño de tu basura digital.</i>
                            </div>
                            <button
                                className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-colors"
                                onClick={() => setIsPrivacyModalOpen(false)}
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
