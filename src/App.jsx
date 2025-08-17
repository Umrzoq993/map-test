import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import SidebarMenu from "./components/SidebarMenu";
import Dashboard from "./pages/Dashboard";
import MapPage from "./pages/MapPage";
import { LuSun, LuMoon } from "react-icons/lu";

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
  const [collapsed, setCollapsed] = useState(false); // desktop collapse
  const [toggled, setToggled] = useState(false); // mobile drawer
  const [dark, setDark] = useState(false); // theme

  useEffect(() => {
    if (isMobile) setCollapsed(false);
  }, [isMobile]);

  // Bodyga theme class
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

      {/* Mobile drawer (overlay) */}
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

          {/* Theme toggle */}
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
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
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
            <Route path="*" element={<div className="card">Not Found</div>} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
