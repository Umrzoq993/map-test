// src/main.jsx
import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { FacilityTypesProvider } from "./hooks/useFacilityTypes";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./leaflet.fix.js";

// Leaflet CSS
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import "@geoman-io/leaflet-geoman-free";

// ✅ Faqat umumiy SCSS kirish fayli:
import "./styles/index.scss";

// Vite’da marker ikonlarini to‘g‘rilash (qoldiring)
import L from "leaflet";
import marker2x from "leaflet/dist/images/marker-icon-2x.png";
import marker from "leaflet/dist/images/marker-icon.png";
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: marker2x,
  iconUrl: marker,
  // shadowUrl removed (shadow effect disabled)
});

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch() {
    // Avoid leaking details to user; could send to logging endpoint
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32 }}>
          <h2>Bir xatolik yuz berdi</h2>
          <p>Ilova vaqtincha mavjud emas. Sahifani yangilab ko'ring.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <FacilityTypesProvider>
          <Suspense
            fallback={<div style={{ padding: 16 }}>Yuklanmoqda...</div>}
          >
            <App />
          </Suspense>
          <ToastContainer
            position="top-right"
            autoClose={4000}
            newestOnTop
            closeOnClick
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="colored"
          />
        </FacilityTypesProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
