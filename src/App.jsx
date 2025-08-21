import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import SidebarMenu from "./components/SidebarMenu";
import Dashboard from "./pages/Dashboard";
import LoginPage from "./pages/LoginPage";
import MapPage from "./pages/MapPage";
import OrgManager from "./pages/OrgManager";
import OrgTablePage from "./pages/OrgTablePage";
import ProtectedRoute from "./routes/ProtectedRoute";

// ⬇️ OVERVIEW NI OLIB TASHLADIK (FacilitiesPage import yo‘q)

// Header
import HeaderBar from "./components/layout/HeaderBar";

// Barcha alohida sahifalar
import {
  AuxiliaryLandsPage,
  BorderLandsPage,
  CowshedPage,
  FishPondsPage,
  FurFarmPage,
  GreenhousePage,
  PoultryPage,
  SheepfoldPage,
  WorkshopsPage,
} from "./pages/facilities";

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

                    {/* /facilities ni mavjud bir sahifaga yo‘naltiryapmiz */}
                    <Route
                      path="/facilities"
                      element={<Navigate to="/facilities/greenhouse" replace />}
                    />

                    {/* Alohida CRUD sahifalar */}
                    <Route
                      path="/facilities/greenhouse"
                      element={<GreenhousePage />}
                    />
                    <Route
                      path="/facilities/poultry"
                      element={<PoultryPage />}
                    />
                    <Route
                      path="/facilities/cowshed"
                      element={<CowshedPage />}
                    />
                    <Route
                      path="/facilities/fur-farm"
                      element={<FurFarmPage />}
                    />
                    <Route
                      path="/facilities/sheepfold"
                      element={<SheepfoldPage />}
                    />
                    <Route
                      path="/facilities/workshops"
                      element={<WorkshopsPage />}
                    />
                    <Route
                      path="/facilities/aux-lands"
                      element={<AuxiliaryLandsPage />}
                    />
                    <Route
                      path="/facilities/border-lands"
                      element={<BorderLandsPage />}
                    />
                    <Route
                      path="/facilities/fish-ponds"
                      element={<FishPondsPage />}
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
