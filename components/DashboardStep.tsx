"use client";

import { useState, useEffect } from "react";

// Interfaces para tipar la data real
interface ClanRemitente {
    email: string;
    count: number;
    uids: number[];
    sizeBytes: number;
}

interface PuebloFantasma {
    email: string;
    subject: string;
    date: string;
    uid: number;
    sizeBytes: number;
}

interface HubDesuscripcion {
    name: string;
    email: string;
    listUnsubscribe: string;
    uids: number[];
    sizeBytes: number;
}

export interface ScanData {
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
    onLogout: () => void;
}

export default function DashboardStep({ onBack, scanData, credentials, onRefresh, isRefreshing, onLogout }: DashboardStepProps) {
    // Estado inicial en null: Todos los paneles colapsados por defecto
    const [openPanel, setOpenPanel] = useState<string | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [localData, setLocalData] = useState<ScanData>(scanData);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);
    const [unsubscribedIds, setUnsubscribedIds] = useState<Set<string>>(new Set());
    const [savedUnsubsCount, setSavedUnsubsCount] = useState(0);
    const [showSummary, setShowSummary] = useState(false);
    const [sessionStats, setSessionStats] = useState({ mails: 0, bytes: 0 });
    const [toast, setToast] = useState<string | null>(null);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const formatBytes = (bytes: number) => {
        if (!bytes || bytes === 0) return '0 KB';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const getNameFromEmail = (email: string) => {
        if (!email || !email.includes('@')) return 'Desconocido';
        const domainParts = email.split('@')[1].split('.');
        const name = domainParts.length > 2 ? domainParts[domainParts.length - 2] : domainParts[0];
        return name.charAt(0).toUpperCase() + name.slice(1);
    };

    // Sync updated data when scanData prop changes via Refresh
    useEffect(() => {
        const sortedData = {
            clan: [...scanData.clan].sort((a, b) => b.count - a.count),
            pueblos: [...scanData.pueblos].sort((a, b) => b.sizeBytes - a.sizeBytes),
            hub: [...scanData.hub].sort((a, b) => b.uids.length - a.uids.length)
        };
        setLocalData(sortedData);
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

    const getUnsubscribeLinks = (headerStr: string | null | undefined) => {
        if (!headerStr) return { httpLink: null, mailtoLink: null, hasValidLink: false };

        // Find ANY http/https link, even outside brackets
        const httpMatch = headerStr.match(/https?:\/\/[^\s>"]+/i);
        const httpLink = httpMatch ? httpMatch[0] : null;

        // Find ANY mailto link, even outside brackets
        const mailtoMatch = headerStr.match(/mailto:[^\s>"]+/i);
        const mailtoLink = mailtoMatch ? mailtoMatch[0] : null;

        // Detector de Falsos Positivos: Ignorar si el header declara ser un mail transaccional u orientativo
        const isTransactionalFake = /opinion-request|transactional|receipt|invoice|reset-password/i.test(headerStr);
        if (isTransactionalFake) {
            return { httpLink: null, mailtoLink: null, hasValidLink: false };
        }

        return { httpLink, mailtoLink, hasValidLink: !!(httpLink || mailtoLink) };
    };

    const handleUnsubscribeClick = (item: HubDesuscripcion) => {
        const headerString = item.listUnsubscribe; // O la propiedad exacta que venga del backend

        if (!headerString) {
            setToast("Este remitente oculta su baja. Selecciónalo y bórralo manualmente.");
            return;
        }

        const { httpLink, mailtoLink } = getUnsubscribeLinks(headerString);

        if (httpLink) {
            window.open(httpLink, '_blank');
            setUnsubscribedIds(prev => new Set(prev).add(item.email));
        } else if (mailtoLink) {
            window.location.href = mailtoLink;
            setUnsubscribedIds(prev => new Set(prev).add(item.email));
        } else {
            setToast("Formato de baja no reconocido. Bórralo manualmente.");
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        const bytesToDelete = selectedItems.reduce((acc, id) => {
            if (id.startsWith("clan-")) {
                const index = parseInt(id.split("-")[1], 10);
                return acc + (localData.clan[index]?.sizeBytes || 0);
            } else if (id.startsWith("pueblo-")) {
                const index = parseInt(id.split("-")[1], 10);
                return acc + (localData.pueblos[index]?.sizeBytes || 0);
            } else if (id.startsWith("hub-")) {
                const index = parseInt(id.split("-")[1], 10);
                return acc + (localData.hub[index]?.sizeBytes || 0);
            }
            return acc;
        }, 0);

        const uidsToDelete: number[] = [];

        selectedItems.forEach(id => {
            if (id.startsWith("clan-")) {
                const index = parseInt(id.split("-")[1], 10);
                if (localData.clan[index]) uidsToDelete.push(...localData.clan[index].uids);
            } else if (id.startsWith("pueblo-")) {
                const index = parseInt(id.split("-")[1], 10);
                if (localData.pueblos[index]) uidsToDelete.push(localData.pueblos[index].uid);
            } else if (id.startsWith("hub-")) {
                const index = parseInt(id.split("-")[1], 10);
                if (localData.hub[index]) uidsToDelete.push(...localData.hub[index].uids);
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
            const newClan = localData.clan.filter((item, index) => !selectedItems.includes(`clan-${index}`));
            const newPueblos = localData.pueblos.filter((item, index) => !selectedItems.includes(`pueblo-${index}`));
            const newHub = localData.hub.filter((item, index) => !selectedItems.includes(`hub-${index}`));

            setLocalData({ ...localData, clan: newClan, pueblos: newPueblos, hub: newHub });
            setSelectedItems([]);
            setIsConfirmModalOpen(false);

            const deletedMails = uidsToDelete.length;
            setSessionStats(prev => ({ mails: prev.mails + deletedMails, bytes: prev.bytes + bytesToDelete }));

            // Update Global LocalStorage
            try {
                const globalStats = JSON.parse(localStorage.getItem("zeroTraceGlobalStats") || '{"mails": 0, "bytes": 0}');
                globalStats.mails += deletedMails;
                globalStats.bytes += bytesToDelete;
                localStorage.setItem("zeroTraceGlobalStats", JSON.stringify(globalStats));

                const currentUnsubs = parseInt(localStorage.getItem("zeroTrace_unsubs") || "0", 10);
                const unsubsToAdd = unsubscribedIds.size - savedUnsubsCount;
                if (unsubsToAdd > 0) {
                    localStorage.setItem("zeroTrace_unsubs", (currentUnsubs + unsubsToAdd).toString());
                    setSavedUnsubsCount(unsubscribedIds.size);
                }
            } catch (err) {
                console.error("Local storage error", err);
            }

            const savedMb = (bytesToDelete / (1024 * 1024)).toFixed(1);
            const savedCo2 = (bytesToDelete / (1024 * 1024) * 0.3).toFixed(1);

            if (bytesToDelete > 0) {
                setDeleteSuccess(`¡Limpieza completada! Has liberado ${savedMb} MB y reducido tu huella de carbono en ${savedCo2} gramos.`);
            } else {
                setDeleteSuccess(`¡Limpieza completada! ${result.count} correos están en tu papelera.`);
            }

            setTimeout(() => setDeleteSuccess(null), 5000);
        } catch (error) {
            console.error(error);
            setToast("Error al intentar borrar correos.");
        } finally {
            setIsDeleting(false);
        }
    };

    // Cálculos dinámicos reales basados en localData (para que se actualice al borrar)
    const totalRemitentes = localData?.clan?.reduce((acc, curr) => acc + curr.count, 0) || 0;
    const totalFantasmas = localData?.pueblos?.length || 0;
    const totalDesuscripciones = localData?.hub?.length || 0;
    const globalTotal = totalRemitentes + totalFantasmas + totalDesuscripciones;

    const { totalMails: totalSelectedMails, totalBytes: totalSelectedBytes } = selectedItems.reduce((acc, id) => {
        if (id.startsWith("clan-")) {
            const index = parseInt(id.split("-")[1], 10);
            const item = localData.clan[index];
            if (item) {
                acc.totalMails += item.uids.length;
                acc.totalBytes += item.sizeBytes;
            }
        } else if (id.startsWith("pueblo-")) {
            const index = parseInt(id.split("-")[1], 10);
            const item = localData.pueblos[index];
            if (item) {
                acc.totalMails += 1;
                acc.totalBytes += item.sizeBytes;
            }
        } else if (id.startsWith("hub-")) {
            const index = parseInt(id.split("-")[1], 10);
            const item = localData.hub[index];
            if (item) {
                acc.totalMails += item.uids.length;
                acc.totalBytes += item.sizeBytes;
            }
        }
        return acc;
    }, { totalMails: 0, totalBytes: 0 });



    return (
        <>
            {/* Header Section */}
            <header className="sticky top-0 left-0 w-full z-50 bg-slate-900/80 backdrop-blur-md border-b border-white/5">
                <div className="max-w-2xl w-full mx-auto px-6 flex justify-between items-center py-4">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onBack}
                            className="flex items-center justify-center size-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                        >
                            <span className="material-symbols-outlined text-slate-300">arrow_back</span>
                        </button>
                        <button
                            onClick={onRefresh}
                            disabled={isRefreshing}
                            className={`flex items-center justify-center size-10 rounded-full border transition-all ${isRefreshing
                                ? "bg-primary/20 border-primary/30 text-primary cursor-not-allowed"
                                : "bg-white/5 border-white/10 hover:bg-white/10 text-slate-300"
                                }`}
                        >
                            <span className={`material-symbols-outlined text-[18px] ${isRefreshing ? "animate-spin" : ""}`}>
                                refresh
                            </span>
                        </button>
                    </div>
                    <div>
                        <button onClick={() => setShowSummary(true)} className="text-sm text-red-400 hover:text-red-300 transition-colors">
                            Finalizar Limpieza y Salir
                        </button>
                    </div>
                </div>
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
                                            <div className="flex flex-col flex-1 pr-4 min-w-0">
                                                <span className="text-lg font-bold text-white whitespace-normal break-words">
                                                    {getNameFromEmail(item.email)}
                                                </span>
                                                <span className="text-sm text-slate-400 whitespace-normal break-words">
                                                    {item.email} • {item.count} correos - {formatBytes(item.sizeBytes)}
                                                </span>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={selectedItems.includes(id)}
                                                onChange={(e) => handleCheckboxChange(e, id)}
                                                onClick={(e) => e.stopPropagation()}
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
                                            <div className="flex flex-col flex-1 pr-4 min-w-0">
                                                <span className="text-lg font-bold text-white whitespace-normal break-words">
                                                    {getNameFromEmail(item.email)}
                                                </span>
                                                <span className="text-sm text-slate-400 whitespace-normal break-words">
                                                    {item.email} • 1 correo - {formatBytes(item.sizeBytes)}
                                                </span>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={selectedItems.includes(id)}
                                                onChange={(e) => handleCheckboxChange(e, id)}
                                                onClick={(e) => e.stopPropagation()}
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
                            <div className="px-6 pb-6 pt-2 space-y-4">
                                {localData.hub.length === 0 && (
                                    <p className="text-slate-400 text-sm py-2">No se encontraron suscripciones.</p>
                                )}
                                <div className="space-y-1">
                                    {localData.hub.map((item, index) => {
                                        const id = `hub-${index}`;
                                        const { hasValidLink } = getUnsubscribeLinks(item.listUnsubscribe);
                                        const isUnsubscribed = hasValidLink && unsubscribedIds.has(item.email);
                                        return (
                                            <label key={item.email} className="flex items-center justify-between py-4 border-t border-white/5 group/row cursor-pointer animate-in fade-in slide-in-from-top-2 duration-300" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex flex-col flex-1 pr-4 min-w-0">
                                                    <span className="text-lg font-bold text-white whitespace-normal break-words">
                                                        {getNameFromEmail(item.email)}
                                                    </span>
                                                    <span className="text-sm text-slate-400 whitespace-normal break-words">
                                                        {item.email} • {item.uids.length} correos - {formatBytes(item.sizeBytes)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 ml-4">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleUnsubscribeClick(item); }}
                                                        disabled={!hasValidLink || isUnsubscribed}
                                                        className={`px-4 py-2 text-sm font-bold rounded-xl transition-colors border flex-shrink-0 ${!hasValidLink
                                                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed border-none'
                                                            : isUnsubscribed
                                                                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                                                : 'bg-slate-700 hover:bg-slate-600 text-white border-white/5'
                                                            }`}
                                                    >
                                                        {!hasValidLink ? "Sin baja" : isUnsubscribed ? "Desuscrito ✓" : "Desuscribir"}
                                                    </button>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedItems.includes(id)}
                                                        onChange={(e) => handleCheckboxChange(e, id)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="size-8 rounded-xl border-white/20 bg-white/5 text-primary focus:ring-primary focus:ring-offset-slate-900 cursor-pointer transition-all flex-shrink-0"
                                                    />
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </details>
                </div>

            </main>

            {/* Fixed Global Action Footer */}
            <footer className="fixed bottom-0 left-0 right-0 p-6 bg-slate-900/80 backdrop-blur-xl border-t border-white/10 z-50">
                <div className="max-w-2xl mx-auto flex flex-col items-center gap-3">

                    {totalSelectedMails > 0 ? (
                        <button
                            onClick={() => setIsConfirmModalOpen(true)}
                            className="w-full py-5 bg-red-500/80 hover:bg-red-500 text-white font-bold text-lg rounded-2xl transition-all shadow-lg shadow-red-500/20 active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined">delete_sweep</span>
                            Eliminar {totalSelectedMails} correos ({formatBytes(totalSelectedBytes)})
                        </button>
                    ) : (
                        <button
                            disabled
                            className="w-full py-5 bg-slate-700/50 text-slate-400 font-bold text-lg rounded-2xl cursor-not-allowed flex items-center justify-center gap-2 border border-white/5"
                        >
                            <span className="material-symbols-outlined">delete_sweep</span>
                            Selecciona correos para limpiar
                        </button>
                    )}
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

            {/* Final Summary Modal overlay */}
            {showSummary && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="relative w-full max-w-md bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-500 flex flex-col items-center">
                        <div className="size-20 rounded-full bg-gradient-to-tr from-teal-400/20 to-emerald-400/20 border border-emerald-400/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(52,211,153,0.3)]">
                            <span className="material-symbols-outlined text-emerald-400 text-4xl">emoji_events</span>
                        </div>

                        <h2 className="text-2xl font-black text-white text-center mb-2">¡Enhorabuena!</h2>
                        <p className="text-slate-300 text-center text-sm mb-8 leading-relaxed">
                            Has completado tu sesión de limpieza. Estás haciendo de internet un lugar más rápido y ecológico.
                        </p>

                        <div className="w-full flex flex-col gap-4 mb-8">
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center"><span className="material-symbols-outlined text-slate-300">mail</span></div>
                                    <span className="text-slate-300 font-medium text-sm">Correos eliminados</span>
                                </div>
                                <span className="text-xl font-bold text-white">{sessionStats.mails.toLocaleString()}</span>
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center"><span className="material-symbols-outlined text-indigo-400">cloud_done</span></div>
                                    <span className="text-slate-300 font-medium text-sm">Espacio liberado</span>
                                </div>
                                <span className="text-xl font-bold text-white text-right">{(sessionStats.bytes / (1024 * 1024)).toFixed(1)} MB</span>
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center"><span className="material-symbols-outlined text-emerald-400">eco</span></div>
                                    <span className="text-slate-300 font-medium text-sm">CO2 evitado</span>
                                </div>
                                <span className="text-xl font-bold text-emerald-400">{(sessionStats.bytes / (1024 * 1024) * 0.3).toFixed(1)} g</span>
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-xl bg-indigo-500/20 flex items-center justify-center"><span className="material-symbols-outlined text-indigo-400">link_off</span></div>
                                    <span className="text-slate-300 font-medium text-sm">Newsletters Canceladas</span>
                                </div>
                                <span className="text-xl font-bold text-indigo-400">{unsubscribedIds.size}</span>
                            </div>
                        </div>

                        <button
                            onClick={onLogout}
                            className="w-full py-4 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 active:scale-[0.98]"
                        >
                            <span>Cerrar sesión y volver al inicio</span>
                            <span className="material-symbols-outlined text-[20px]">logout</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Global Toast */}
            {toast && (
                <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-[70] px-6 py-3 bg-slate-800/90 backdrop-blur-md border border-white/10 rounded-full shadow-2xl text-sm text-white animate-in fade-in slide-in-from-bottom-4 duration-300 whitespace-nowrap">
                    {toast}
                </div>
            )}
        </>
    );
}
