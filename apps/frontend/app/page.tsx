"use client";

import { useAuth } from "@/lib/auth-context";
import LoginPage from "@/components/login-page";
import StudentChat from "./student-chat";
import TeacherDashboard from "./dashboard/page";
import { useEffect } from "react";

function AppContent() {
  const { user, isLoading } = useAuth();

  // Log pour débogage
  useEffect(() => {
    if (!isLoading) {
      console.log("[DRAM App] Current User State:", user);
    }
  }, [user, isLoading]);

  // 1. Attendre que le chargement soit fini
  if (isLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-black">
        <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
        <p className="animate-pulse font-bold tracking-widest text-zinc-500 uppercase">
          Chargement de la session...
        </p>
      </div>
    );
  }

  // 2. Si pas d'utilisateur -> Login
  if (!user) {
    return <LoginPage />;
  }

  // 3. Si prof -> Dashboard
  if (user.role === "teacher") {
    console.log("[DRAM App] Rendering Teacher Dashboard");
    return <TeacherDashboard />;
  }

  // 4. Si élève -> Chat
  if (user.role === "student") {
    console.log("[DRAM App] Rendering Student Chat");
    return <StudentChat />;
  }

  // Fallback au cas où le rôle serait corrompu
  return <LoginPage />;
}

export default function Home() {
  return <AppContent />;
}
