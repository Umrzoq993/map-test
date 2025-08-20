import { useEffect, useState } from "react";
import { LuMoon, LuSun } from "react-icons/lu";
import { Navigate, Route, Routes } from "react-router-dom";
import SidebarMenu from "./components/SidebarMenu";
import Dashboard from "./pages/Dashboard";
import LoginPage from "./pages/LoginPage"; // ✅ qo‘shildi
import MapPage from "./pages/MapPage";
import OrgManager from "./pages/OrgManager";
import OrgTablePage from "./pages/OrgTablePage";
import ProtectedRoute from "./routes/ProtectedRoute"; // ✅ qo‘shildi

function useIsMobile(query = "(max-width: 1024px)") {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const m = window.matchMedia(query);
    const onChange = () => setIsMobile(m.matches);
    onChange();
    m.addEventListener("change", onChange);
    return () => m.removeEventListener("change", onChange);
  }, [query]);
  return isMobile;
}

export default function App() {
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [toggled, setToggled] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    if (isMobile) setCollapsed(false);
  }, [isMobile]);

  useEffect(() => {
    const cls = "theme-dark";
    if (dark) document.body.classList.add(cls);
    else document.body.classList.remove(cls);
  }, [dark]);

  const onHamburger = () => {
    if (isMobile) setToggled((t) => !t);
    else setCollapsed((c) => !c);
  };

  const sidebarWidth = isMobile ? 0 : collapsed ? "80px" : "260px";

  return (
    <Routes>
      {/* 🔑 Login sahifasi doim ochiq */}
      <Route path="/login" element={<LoginPage />} />

      {/* 🔐 Himoyalangan layout */}
      <Route element={<ProtectedRoute />}>
        <Route
          path="/*"
          element={
            <div className="app-layout" style={{ "--sidebar-w": sidebarWidth }}>
              {/* Desktop sidebar */}
              {!isMobile && (
                <div style={{ height: "100vh" }}>
                  <SidebarMenu
                    dark={dark}
                    collapsed={collapsed}
                    toggled={false}
                    setToggled={setToggled}
                  />
                </div>
              )}

              {/* Mobile drawer */}
              {isMobile && (
                <div className={`mobile-overlay ${toggled ? "is-open" : ""}`}>
                  <div
                    className="mobile-overlay__backdrop"
                    onClick={() => setToggled(false)}
                  />
                  <div className="mobile-overlay__panel">
                    <SidebarMenu
                      dark={dark}
                      collapsed={false}
                      toggled={toggled}
                      setToggled={setToggled}
                    />
                  </div>
                </div>
              )}

              {/* Main */}
              <main className="app-main">
                <div className="app-header">
                  <button
                    className="hamburger"
                    onClick={onHamburger}
                    aria-label="Toggle sidebar"
                  >
                    ☰
                  </button>
                  <div className="brand">Agro Map</div>

                  <button
                    className="hamburger"
                    onClick={() => setDark((d) => !d)}
                    aria-label="Toggle theme"
                    title={dark ? "Light mode" : "Dark mode"}
                  >
                    {dark ? <LuSun size={18} /> : <LuMoon size={18} />}
                  </button>

                  <div className="spacer">Logged in</div>
                </div>

                <div className="app-content">
                  <Routes>
                    <Route
                      path="/"
                      element={<Navigate to="/dashboard" replace />}
                    />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route
                      path="/map"
                      element={
                        <MapPage
                          headerHeight={60}
                          dark={dark}
                          sidebarOpen={isMobile && toggled}
                        />
                      }
                    />
                    <Route path="/orgs" element={<OrgManager />} />
                    <Route path="/orgs-table" element={<OrgTablePage />} />
                    <Route
                      path="*"
                      element={<div className="card">Not Found</div>}
                    />
                  </Routes>
                </div>
              </main>
            </div>
          }
        />
      </Route>

      {/* Agar boshqa noma’lum url bo‘lsa */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
