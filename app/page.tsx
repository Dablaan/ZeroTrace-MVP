"use client";

import { useState } from "react";
import AuthStep from "@/components/AuthStep";
import DashboardStep from "@/components/DashboardStep";

export default function Home() {
  const [step, setStep] = useState<"auth" | "dashboard">("auth");
  // Stateless Credentials living only in React Memory
  const [credentials, setCredentials] = useState({ email: "", appPassword: "" });

  const handleConnect = (email: string, appPassword: string) => {
    // In memory only, matching Zero-Data Retention policy
    setCredentials({ email, appPassword });
    console.log("Connect requested with:", email); // Emulating connection for now
    setStep("dashboard");
  };

  const handleBack = () => {
    // Clean memory completely when going back
    setCredentials({ email: "", appPassword: "" });
    setStep("auth");
  };

  return (
    <div className="bg-slate-900 font-display min-h-screen text-slate-100 flex flex-col items-center">
      {step === "auth" ? (
        <AuthStep onConnect={handleConnect} />
      ) : (
        <DashboardStep onBack={handleBack} />
      )}
    </div>
  );
}
