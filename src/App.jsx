import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import SidebarMenu from "./components/SidebarMenu";
import Dashboard from "./pages/Dashboard";
import LoginPage from "./pages/LoginPage";
import MapPage from "./pages/MapPage";
import OrgManager from "./pages/OrgManager";
import OrgTablePage from "./pages/OrgTablePage";
import ProtectedRoute from "./routes/ProtectedRoute";
import AdminRoute from "./routes/AdminRoute";
import HeaderBar from "./components/layout/HeaderBar";
import { useTheme } from "./hooks/useTheme";
import GenericFacilityPage from "./pages/facilities/GenericFacilityPage";
import { startHeartbeat } from "./boot/heartbeat";
import { startSessionManager } from "./boot/sessionManager";
import SessionsPage from "./pages/admin/SessionsPage";
import AuditPage from "./pages/admin/AuditPage";
import UsersPage from "./pages/admin/UsersPage";

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
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [toggled, setToggled] = useState(false);
  const { isDark, toggle } = useTheme();

  useEffect(() => {
    if (isMobile) setCollapsed(false);
  }, [isMobile]);

  const onHamburger = () => {
    if (isMobile) setToggled((t) => !t);
    else setCollapsed((c) => !c);
  };

  useEffect(() => {
    const stop = startHeartbeat(40000);
    const stopSessionManager = startSessionManager();
    return () => {
      stop && stop();
      stopSessionManager && stopSessionManager();
    };
  }, []);

  // Global event: org:open-table -> jadval sahifasiga o'tish
  useEffect(() => {
    function onOpen(e) {
      const id = e?.detail?.id;
      if (id != null) {
        navigate(`/orgs-table?focus=${id}`);
      } else navigate("/orgs-table");
    }
    window.addEventListener("org:open-table", onOpen);
    return () => window.removeEventListener("org:open-table", onOpen);
  }, [navigate]);

  const sidebarWidth = isMobile ? 0 : collapsed ? "80px" : "260px";

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route
          path="/*"
          element={
            <div className="app-layout" style={{ "--sidebar-w": sidebarWidth }}>
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

              <main className="app-main">
                <HeaderBar
                  dark={isDark}
                  onToggleTheme={toggle}
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

                    {/* Admin – faqat ADMIN roli */}
                    <Route
                      path="/admin/sessions"
                      element={
                        <AdminRoute>
                          <SessionsPage />
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="/admin/audit"
                      element={
                        <AdminRoute>
                          <AuditPage />
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="/admin/users"
                      element={
                        <AdminRoute>
                          <UsersPage />
                        </AdminRoute>
                      }
                    />

                    {/* Facilities: kanonik yo‘llar */}
                    <Route
                      path="/facilities"
                      element={<Navigate to="/facilities/greenhouse" replace />}
                    />
                    <Route
                      path="/facilities/:type"
                      element={<GenericFacilityPage />}
                    />

                    {/* Legacy -> canonical */}
                    <Route
                      path="/facilities/poultry"
                      element={
                        <Navigate to="/facilities/poultry-meat" replace />
                      }
                    />
                    <Route
                      path="/facilities/workshops"
                      element={
                        <Navigate to="/facilities/workshops-sausage" replace />
                      }
                    />
                    <Route
                      path="/facilities/fur-farm"
                      element={<Navigate to="/facilities/turkey" replace />}
                    />
                    <Route
                      path="/facilities/fish-farm"
                      element={<Navigate to="/facilities/fish-ponds" replace />}
                    />
                    <Route
                      path="/facilities/aux-land"
                      element={<Navigate to="/facilities/aux-lands" replace />}
                    />
                    <Route
                      path="/facilities/border-land"
                      element={
                        <Navigate to="/facilities/border-lands" replace />
                      }
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
