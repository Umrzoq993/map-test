import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import SidebarMenu from "./components/SidebarMenu";
import Dashboard from "./pages/Dashboard";
import LoginPage from "./pages/LoginPage";
import MapPage from "./pages/MapPage";
import OrgManager from "./pages/OrgManager";
import OrgTablePage from "./pages/OrgTablePage";
import ProtectedRoute from "./routes/ProtectedRoute";

// ⬇️ YANGI IMPORT
import HeaderBar from "./components/layout/HeaderBar";

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

  // Siz avval body.ga .theme-dark qo'ygan edingiz — shu saqlanib qoladi:
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
      <Route path="/login" element={<LoginPage />} />

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
                {/* ⬇️ INLINE HEADER O‘RNIGA ALOHIDA KOMPONENT */}
                <HeaderBar
                  dark={dark}
                  onToggleTheme={() => setDark((d) => !d)}
                  onHamburger={onHamburger}
                />

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

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
