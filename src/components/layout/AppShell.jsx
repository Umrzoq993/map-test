// src/components/layout/AppShell.jsx
import HeaderBar from "./HeaderBar";
import { Outlet } from "react-router-dom";
import { useEffect } from "react";
import { toast } from "react-toastify";

export default function AppShell({ admin = false }) {
  // Sessiya tugashidan oldin ogohlantirish (sessionManager dispatch qiladi)
  useEffect(() => {
    const handler = (e) => {
      const ms = e?.detail?.inMs || 60000;
      const sec = Math.round(ms / 1000);
      toast.warn(
        `Sessiya ${sec} soniyadan so'ng tugaydi. Faollashtirish uchun sahifada harakat qiling.`
      );
    };
    window.addEventListener("session:expiring", handler);
    return () => window.removeEventListener("session:expiring", handler);
  }, []);
  // admin flag’ini data-attribut sifatida bersak, ichki komponentlarda CSS orqali tugmalarni yashirishimiz mumkin
  return (
    <div className="appshell" data-admin={admin ? "true" : "false"}>
      <HeaderBar />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
