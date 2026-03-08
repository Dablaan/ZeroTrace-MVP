"use client";

import { useState, useEffect } from "react";

// Interfaces para tipar la data real
interface ClanRemitente {
    email: string;
    count: number;
    uids: number[];
}

interface PuebloFantasma {
    email: string;
    subject: string;
    date: string;
    uid: number;
}

interface HubDesuscripcion {
    name: string;
    email: string;
    unsubscribeUrl: string;
    uid: number;
}

interface ScanData {
    clan: ClanRemitente[];
    pueblos: PuebloFantasma[];
    hub: HubDesuscripcion[];
}

interface DashboardStepProps {
    onBack: () => void;
    scanData: ScanData;
    credentials: { email: string; appPassword: string };
    onRefresh: () => void;
    isRefreshing: boolean;
}

export default function DashboardStep({ onBack, scanData, credentials, onRefresh, isRefreshing }: DashboardStepProps) {
    // Estado inicial en null: Todos los paneles colapsados por defecto
    const [openPanel, setOpenPanel] = useState<string | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [localData, setLocalData] = useState<ScanData>(scanData);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

    // Sync updated data when scanData prop changes via Refresh
    useEffect(() => {
        setLocalData(scanData);
    }, [scanData]);

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

    const handleDelete = async () => {
        setIsDeleting(true);
        setDeleteSuccess(null);
        let uidsToDelete: number[] = [];

        selectedItems.forEach(id => {
            if (id.startsWith("clan-")) {
                const index = parseInt(id.split("-")[1], 10);
                if (localData.clan[index]) uidsToDelete.push(...localData.clan[index].uids);
            } else if (id.startsWith("pueblo-")) {
                const index = parseInt(id.split("-")[1], 10);
                if (localData.pueblos[index]) uidsToDelete.push(localData.pueblos[index].uid);
            }
        });

        if (uidsToDelete.length === 0) {
            setIsDeleting(false);
            setIsConfirmModalOpen(false);
            return;
        }

        try {
            const response = await fetch("/api/imap/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: credentials.email,
                    appPassword: credentials.appPassword,
                    uids: uidsToDelete
                })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error);

            // Remove deleted items from local state
            const newClan = localData.clan.filter((_, index) => !selectedItems.includes(`clan-${index}`));
            const newPueblos = localData.pueblos.filter((_, index) => !selectedItems.includes(`pueblo-${index}`));

            setLocalData({ ...localData, clan: newClan, pueblos: newPueblos });
            setSelectedItems([]);
            setIsConfirmModalOpen(false);
            setDeleteSuccess(`¡Limpieza completada! ${result.count} correos están en tu papelera.`);

            setTimeout(() => setDeleteSuccess(null), 5000);
        } catch (error) {
            console.error(error);
            alert("Error al intentar borrar correos.");
        } finally {
            setIsDeleting(false);
        }
    };

    // Cálculos dinámicos reales basados en localData (para que se actualice al borrar)
    const totalRemitentes = localData?.clan?.reduce((acc, curr) => acc + curr.count, 0) || 0;
    const totalFantasmas = localData?.pueblos?.length || 0;
    const totalDesuscripciones = localData?.hub?.length || 0;
    const globalTotal = totalRemitentes + totalFantasmas + totalDesuscripciones;

    return (
        <>
            {/* Header Section */}
            <header className="sticky top-0 z-40 bg-slate-900/60 backdrop-blur-md border-b border-white/10 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="flex items-center justify-center size-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                        <span className="material-symbols-outlined text-slate-300">arrow_back</span>
                    </button>
                    <h1 className="text-xl font-bold tracking-tight text-white">Análisis Completado</h1>
                </div>
                <button
                    onClick={onRefresh}
                    disabled={isRefreshing}
                    className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-full border transition-all ${isRefreshing
                        ? "bg-primary/20 border-primary/30 text-primary cursor-not-allowed"
                        : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-slate-300"
                        }`}
                >
                    <span className={`material-symbols-outlined text-[18px] ${isRefreshing ? "animate-spin" : ""}`}>
                        refresh
                    </span>
                    <span className="hidden md:inline">{isRefreshing ? 'Escaneando...' : 'Actualizar'}</span>
                </button>
            </header>

            <main className="p-6 pb-40 space-y-6 max-w-2xl mx-auto w-full">
                {deleteSuccess && (
                    <div className="bg-teal-500/10 border border-teal-500/20 text-teal-400 px-6 py-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 shadow-lg shadow-teal-500/10">
                        <span className="material-symbols-outlined text-2xl">check_circle</span>
                        <span className="font-semibold">{deleteSuccess}</span>
                    </div>
                )}
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
                        Se han identificado <span className="text-white font-semibold">{globalTotal.toLocaleString()} correos</span> que están ocupando espacio innecesario en tu bandeja.
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
                                {localData?.clan?.length === 0 && (
                                    <p className="text-slate-400 text-sm py-2">No se encontraron remitentes masivos.</p>
                                )}
                                {localData?.clan?.map((item, index) => {
                                    const id = `clan-${index}`;
                                    return (
                                        <label key={id} className="flex items-center justify-between py-4 border-t border-white/5 group/row cursor-pointer animate-in fade-in slide-in-from-top-2 duration-300" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex flex-col">
                                                <span className="text-white font-medium truncate max-w-[200px] md:max-w-xs">{item.email}</span>
                                                <span className="text-slate-400 text-xs">{item.count} correos encontrados</span>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={selectedItems.includes(id)}
                                                onChange={(e) => handleCheckboxChange(e, id)}
                                                className="size-8 rounded-xl border-white/20 bg-white/5 text-primary focus:ring-primary focus:ring-offset-slate-900 cursor-pointer transition-all flex-shrink-0 ml-4"
                                            />
                                        </label>
                                    );
                                })}
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
                                {localData?.pueblos?.length === 0 && (
                                    <p className="text-slate-400 text-sm py-2">No tienes correos antiguos polvorientos.</p>
                                )}
                                {localData?.pueblos?.map((item, index) => {
                                    const id = `pueblo-${index}`;
                                    return (
                                        <label key={id} className="flex items-center justify-between py-4 border-t border-white/5 group/row cursor-pointer animate-in fade-in slide-in-from-top-2 duration-300" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex flex-col">
                                                <span className="text-white font-medium truncate max-w-[200px] md:max-w-xs">{item.email}</span>
                                                <span className="text-slate-400 text-xs truncate max-w-[200px] md:max-w-xs">{item.subject}</span>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={selectedItems.includes(id)}
                                                onChange={(e) => handleCheckboxChange(e, id)}
                                                className="size-8 rounded-xl border-white/20 bg-white/5 text-primary focus:ring-primary focus:ring-offset-slate-900 cursor-pointer transition-all flex-shrink-0 ml-4"
                                            />
                                        </label>
                                    );
                                })}
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
                                {localData?.hub?.length === 0 && (
                                    <p className="text-slate-400 text-sm py-2">No se detectaron subscripciones comerciales.</p>
                                )}
                                {localData?.hub?.map((item, index) => (
                                    <div key={index} className="flex items-center justify-between py-4 border-t border-white/5 gap-2">
                                        <div className="flex flex-col flex-1 min-w-0">
                                            <span className="text-white font-medium truncate">{item.name || item.email}</span>
                                            <span className="text-slate-400 text-xs truncate">{item.email}</span>
                                        </div>
                                        <button
                                            onClick={(e) => handleUnsubscribeClick(e, item.name || item.email)}
                                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition-colors border border-white/5 flex-shrink-0"
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
                            Se moverán a la papelera todos los correos de las listas seleccionadas. Podrás recuperarlos desde tu proveedor de correo en los próximos 30 días.
                        </p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className={`w-full py-4 text-white font-bold rounded-2xl transition-colors flex items-center justify-center gap-2 ${isDeleting ? 'bg-red-600/50 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500'
                                    }`}
                            >
                                {isDeleting ? (
                                    <>
                                        <span>Borrando...</span>
                                        <span className="material-symbols-outlined animate-spin">refresh</span>
                                    </>
                                ) : (
                                    "Sí, Enviar a Papelera"
                                )}
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
