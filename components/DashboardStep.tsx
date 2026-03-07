"use client";

import { useState } from "react";

// Mock Data
const MOCK_REMITENTES = [
    { id: "zara", email: "marketing@zara.com", count: 142 },
    { id: "medium", email: "newsletter@medium.com", count: 85 },
    { id: "uber", email: "promotions@uber.com", count: 64 },
];

const MOCK_FANTASMAS = [
    { id: "linkedin_archive", email: "archive@linkedin.com", count: 210 },
];

const MOCK_DESUSCRIPCIONES = [
    { id: "spotify", email: "news@spotify.com", entity: "Spotify", status: "Suscripción activa" },
    { id: "amazon", email: "no-reply@amazon.es", entity: "Amazon", status: "Suscripción activa" },
];

interface DashboardStepProps {
    onBack: () => void;
}

export default function DashboardStep({ onBack }: DashboardStepProps) {
    // Estado inicial en null: Todos los paneles colapsados por defecto
    const [openPanel, setOpenPanel] = useState<string | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [selectedItems, setSelectedItems] = useState<string[]>(["zara", "medium"]);

    const handleTogglePanel = (panel: string) => {
        setOpenPanel(openPanel === panel ? null : panel);
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
        // Prevent event bubbling to the accordion
        e.stopPropagation();
        setSelectedItems(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleUnsubscribeClick = (e: React.MouseEvent, name: string) => {
        // Prevent event bubbling to the accordion
        e.stopPropagation();
        console.log(`Desuscribiendo de ${name}...`);
    };

    // Cálculos dinámicos
    const totalRemitentes = MOCK_REMITENTES.reduce((acc, curr) => acc + curr.count, 0);
    const totalFantasmas = MOCK_FANTASMAS.reduce((acc, curr) => acc + curr.count, 0);
    const totalDesuscripciones = MOCK_DESUSCRIPCIONES.length;

    return (
        <>
            {/* Header Section */}
            <header className="sticky top-0 z-40 bg-slate-900/60 backdrop-blur-md border-b border-white/10 px-6 py-4 flex items-center gap-4">
                <button
                    onClick={onBack}
                    className="flex items-center justify-center size-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                >
                    <span className="material-symbols-outlined text-slate-300">arrow_back</span>
                </button>
                <h1 className="text-xl font-bold tracking-tight text-white">Análisis Completado</h1>
            </header>

            <main className="p-6 pb-40 space-y-6 max-w-2xl mx-auto w-full">
                {/* Progress Card */}
                <section className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-6 shadow-2xl">
                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <h2 className="text-slate-400 text-sm font-medium uppercase tracking-wider">Estado del Escaneo</h2>
                            <p className="text-2xl font-bold text-white">Limpieza Lista</p>
                        </div>
                        <span className="text-primary font-bold text-xl">100%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                        <div className="bg-primary h-full rounded-full shadow-[0_0_15px_rgba(20,184,166,0.6)] w-full"></div>
                    </div>
                    <p className="mt-4 text-slate-300 text-sm leading-relaxed">
                        Se han identificado <span className="text-white font-semibold">2,450 correos</span> que están ocupando espacio innecesario en tu bandeja.
                    </p>
                </section>

                {/* Accordion Section */}
                <div className="space-y-4">
                    {/* Panel 1: Clan de Remitentes */}
                    <details
                        className="group bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl overflow-hidden"
                        open={openPanel === "remitentes"}
                        onClick={(e) => {
                            e.preventDefault();
                            handleTogglePanel("remitentes");
                        }}
                    >
                        <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                            <div className="flex items-center gap-4">
                                <div className="size-10 rounded-2xl bg-primary/20 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-primary">group</span>
                                </div>
                                <div className="flex flex-col flex-1">
                                    <h3 className="text-lg font-bold text-white">Clan de Remitentes</h3>
                                    <span className="text-xs text-slate-400 font-normal">Newsletters masivas detectadas</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="bg-teal-500/20 text-teal-300 px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap">
                                    {totalRemitentes} correos
                                </span>
                                <span className={`material-symbols-outlined text-slate-400 transition-transform ${openPanel === "remitentes" ? "rotate-180" : ""}`}>expand_more</span>
                            </div>
                        </summary>
                        {openPanel === "remitentes" && (
                            <div className="px-6 pb-6 pt-2 space-y-1">
                                {MOCK_REMITENTES.map((item) => (
                                    <label key={item.id} className="flex items-center justify-between py-4 border-t border-white/5 group/row cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex flex-col">
                                            <span className="text-white font-medium">{item.email}</span>
                                            <span className="text-slate-400 text-xs">{item.count} correos encontrados</span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={selectedItems.includes(item.id)}
                                            onChange={(e) => handleCheckboxChange(e, item.id)}
                                            className="size-8 rounded-xl border-white/20 bg-white/5 text-primary focus:ring-primary focus:ring-offset-slate-900 cursor-pointer transition-all"
                                        />
                                    </label>
                                ))}
                            </div>
                        )}
                    </details>

                    {/* Panel 2: Pueblos Fantasma */}
                    <details
                        className="group bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl overflow-hidden"
                        open={openPanel === "fantasmas"}
                        onClick={(e) => {
                            e.preventDefault();
                            handleTogglePanel("fantasmas");
                        }}
                    >
                        <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                            <div className="flex items-center gap-4">
                                <div className="size-10 rounded-2xl bg-amber-500/20 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-amber-500">history</span>
                                </div>
                                <div className="flex flex-col flex-1">
                                    <h3 className="text-lg font-bold text-white">Pueblos Fantasma</h3>
                                    <span className="text-xs text-slate-400 font-normal">Correos de hace más de 2 años</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="bg-teal-500/20 text-teal-300 px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap">
                                    {totalFantasmas} correos
                                </span>
                                <span className={`material-symbols-outlined text-slate-400 transition-transform ${openPanel === "fantasmas" ? "rotate-180" : ""}`}>expand_more</span>
                            </div>
                        </summary>
                        {openPanel === "fantasmas" && (
                            <div className="px-6 pb-6 pt-2 space-y-1">
                                {MOCK_FANTASMAS.map((item) => (
                                    <label key={item.id} className="flex items-center justify-between py-4 border-t border-white/5 group/row cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex flex-col">
                                            <span className="text-white font-medium">{item.email}</span>
                                            <span className="text-slate-400 text-xs">{item.count} correos antiguos</span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={selectedItems.includes(item.id)}
                                            onChange={(e) => handleCheckboxChange(e, item.id)}
                                            className="size-8 rounded-xl border-white/20 bg-white/5 text-primary focus:ring-primary focus:ring-offset-slate-900 cursor-pointer transition-all"
                                        />
                                    </label>
                                ))}
                            </div>
                        )}
                    </details>

                    {/* Panel 3: Hub de Desuscripción */}
                    <details
                        className="group bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl overflow-hidden"
                        open={openPanel === "desuscripcion"}
                        onClick={(e) => {
                            e.preventDefault();
                            handleTogglePanel("desuscripcion");
                        }}
                    >
                        <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                            <div className="flex items-center gap-4">
                                <div className="size-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-indigo-400">mail_lock</span>
                                </div>
                                <div className="flex flex-col flex-1">
                                    <h3 className="text-lg font-bold text-white">Hub de Desuscripción</h3>
                                    <span className="text-xs text-slate-400 font-normal">Correos comerciales y promociones</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="bg-teal-500/20 text-teal-300 px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap">
                                    {totalDesuscripciones} envíos
                                </span>
                                <span className={`material-symbols-outlined text-slate-400 transition-transform ${openPanel === "desuscripcion" ? "rotate-180" : ""}`}>expand_more</span>
                            </div>
                        </summary>
                        {openPanel === "desuscripcion" && (
                            <div className="px-6 pb-6 pt-2 space-y-1">
                                {MOCK_DESUSCRIPCIONES.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between py-4 border-t border-white/5">
                                        <div className="flex flex-col">
                                            <span className="text-white font-medium">{item.email}</span>
                                            <span className="text-slate-400 text-xs">{item.status}</span>
                                        </div>
                                        <button
                                            onClick={(e) => handleUnsubscribeClick(e, item.entity)}
                                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition-colors border border-white/5"
                                        >
                                            Desuscribir
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </details>
                </div>
            </main>

            {/* Fixed Global Action Footer */}
            <footer className="fixed bottom-0 left-0 right-0 p-6 bg-slate-900/80 backdrop-blur-xl border-t border-white/10 z-50">
                <div className="max-w-2xl mx-auto flex flex-col items-center gap-3">
                    <button
                        onClick={() => setIsConfirmModalOpen(true)}
                        className="w-full py-5 bg-red-500/80 hover:bg-red-500 text-white font-bold text-lg rounded-2xl transition-all shadow-lg shadow-red-500/20 active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined">delete_sweep</span>
                        Eliminar Correos Seleccionados
                    </button>
                    <p className="text-slate-400 text-xs text-center flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">info</span>
                        Tranquilo, los correos solo se moverán a tu Papelera.
                    </p>
                </div>
            </footer>

            {/* Confirmation Modal Overlay */}
            {isConfirmModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
                    <div className="relative w-full max-w-sm bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
                        <div className="size-16 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-6">
                            <span className="material-symbols-outlined text-red-500 text-3xl">warning</span>
                        </div>
                        <h2 className="text-xl font-bold text-white text-center mb-3">¿Seguro que quieres limpiar esto?</h2>
                        <p className="text-slate-300 text-center text-sm leading-relaxed mb-8">
                            Se moverán <span className="text-white font-bold">{selectedItems.length * 105 || 227} correos</span> a la papelera. Podrás recuperarlos desde tu proveedor de correo en los próximos 30 días.
                        </p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => {
                                    console.log("Moviendo a papelera...");
                                    setIsConfirmModalOpen(false);
                                    // Normalmente limpiaríamos el estado aquí
                                }}
                                className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-2xl transition-colors"
                            >
                                Sí, Enviar a Papelera
                            </button>
                            <button
                                onClick={() => setIsConfirmModalOpen(false)}
                                className="w-full py-4 bg-white/5 hover:bg-white/10 text-slate-300 font-medium rounded-2xl transition-colors border border-white/10"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
