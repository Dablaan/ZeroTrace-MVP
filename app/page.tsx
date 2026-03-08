"use client";

import { useState } from "react";
import AuthStep from "@/components/AuthStep";
import DashboardStep from "@/components/DashboardStep";

export default function Home() {
  const [step, setStep] = useState<"auth" | "dashboard">("auth");
  // Stateless Credentials living only in React Memory
  const [credentials, setCredentials] = useState({ email: "", appPassword: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanData, setScanData] = useState<any>(null); // We will pass this to DashboardStep
  const [progress, setProgress] = useState(0);

  const handleScan = async (email: string, appPassword: string) => {
    setIsLoading(true);
    setError(null);
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const increment = prev < 60 ? Math.floor(Math.random() * 12) + 3 : Math.floor(Math.random() * 4) + 1;
        const next = prev + increment;
        return next > 95 ? 95 : next;
      });
    }, 700);

    try {
      const response = await fetch("/api/imap/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, appPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al conectar con el servidor IMAP");
      }

      clearInterval(progressInterval);
      setProgress(100);

      // In memory only, matching Zero-Data Retention policy
      setCredentials({ email, appPassword });
      setScanData(data); // { clan: [...], pueblos: [...], hub: [...] }

      setTimeout(() => {
        setStep("dashboard");
        setIsLoading(false);
      }, 800);
    } catch (err: any) {
      clearInterval(progressInterval);
      setProgress(0);
      setIsLoading(false);
      setError(err.message || "Credenciales incorrectas o cuenta no soportada");
    }
  };

  const handleBack = () => {
    // Clean memory completely when going back
    setCredentials({ email: "", appPassword: "" });
    setScanData(null);
    setStep("auth");
  };

  const handleRefresh = () => {
    if (credentials.email && credentials.appPassword) {
      handleScan(credentials.email, credentials.appPassword);
    }
  };

  return (
    <div className="bg-slate-900 font-display min-h-screen text-slate-100 flex flex-col items-center">
      {step === "auth" ? (
        <AuthStep onConnect={handleScan} isLoading={isLoading} error={error} progress={progress} />
      ) : (
        <DashboardStep
          onBack={handleBack}
          scanData={scanData}
          credentials={credentials}
          onRefresh={handleRefresh}
          isRefreshing={isLoading}
        />
      )}
    </div>
  );
}
