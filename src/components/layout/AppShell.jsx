import HeaderBar from "./HeaderBar";
import { Outlet } from "react-router-dom";

export default function AppShell({ admin = false }) {
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
