import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import KnowledgeGraphPage from "./pages/KnowledgeGraphPage.jsx";
import TimelinePage from "./pages/TimelinePage.jsx";
import CommitmentsPage from "./pages/CommitmentsPage.jsx";
import DigestPage from "./pages/DigestPage.jsx";
import { getToken, saveTokenFromUrl } from "./services/api.js";

function AppShell({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [hasSession, setHasSession] = useState(() => saveTokenFromUrl() || Boolean(getToken()));

  useEffect(() => {
    if (saveTokenFromUrl()) {
      setHasSession(true);
      navigate(location.pathname, { replace: true });
    }
  }, [location.pathname, navigate]);

  if (!hasSession) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <section className="app-workspace">{children}</section>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <AppShell>
            <DashboardPage />
          </AppShell>
        }
      />
      <Route
        path="/dashboard"
        element={
          <AppShell>
            <DashboardPage />
          </AppShell>
        }
      />
      <Route
        path="/chat"
        element={
          <AppShell>
            <ChatPage />
          </AppShell>
        }
      />
      <Route
        path="/graph"
        element={
          <AppShell>
            <KnowledgeGraphPage />
          </AppShell>
        }
      />
      <Route
        path="/timeline"
        element={
          <AppShell>
            <TimelinePage />
          </AppShell>
        }
      />
      <Route
        path="/commitments"
        element={
          <AppShell>
            <CommitmentsPage />
          </AppShell>
        }
      />
      <Route
        path="/digest"
        element={
          <AppShell>
            <DigestPage />
          </AppShell>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
