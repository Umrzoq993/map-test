// src/App.jsx
import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import SidebarMenu from "./components/SidebarMenu";
import Dashboard from "./pages/Dashboard";
import LoginPage from "./pages/LoginPage";
import MapPage from "./pages/MapPage";
import OrgManager from "./pages/OrgManager";
import OrgTablePage from "./pages/OrgTablePage";
import ProtectedRoute from "./routes/ProtectedRoute";
import HeaderBar from "./components/layout/HeaderBar";

// ⬇️ Yangi: persistent tema
import { useTheme } from "./hooks/useTheme";
import GenericFacilityPage from "./pages/facilities/GenericFacilityPage";

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

  // ⬇️ useTheme: default=dark, localStorage’da saqlanadi, html[data-theme] va .dark classni qo‘yadi
  const { isDark, toggle } = useTheme();

  useEffect(() => {
    if (isMobile) setCollapsed(false);
  }, [isMobile]);

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
                    dark={isDark}
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
                      dark={isDark}
                      collapsed={false}
                      toggled={toggled}
                      setToggled={setToggled}
                    />
                  </div>
                </div>
              )}

              {/* Main */}
              <main className="app-main">
                <HeaderBar
                  dark={isDark}
                  onToggleTheme={toggle} // ⬅️ endi persistent toggle
                  onHamburger={onHamburger}
                />

                <div className="app-content">
                  <Routes>
                    <Route
                      path="/"
                      element={<Navigate to="/dashboard" replace />}
                    />
                    <Route
                      path="/dashboard"
                      element={<Dashboard dark={isDark} />}
                    />
                    <Route
                      path="/map"
                      element={
                        <MapPage
                          headerHeight={60}
                          dark={isDark}
                          sidebarOpen={isMobile && toggled}
                        />
                      }
                    />
                    <Route path="/orgs" element={<OrgManager />} />
                    <Route path="/orgs-table" element={<OrgTablePage />} />
                    {/* Facilities */}
                    <Route
                      path="/facilities"
                      element={<Navigate to="/facilities/greenhouse" replace />}
                    />
                    <Route
                      path="/facilities/:type"
                      element={<GenericFacilityPage />}
                    />

                    {/* /facilities ni mavjud bir sahifaga yo‘naltiramiz */}
                    <Route
                      path="/facilities"
                      element={<Navigate to="/facilities/greenhouse" replace />}
                    />

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
