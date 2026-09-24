import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import JoinPage from "./pages/customer/JoinPage";
import TrackingPage from "./pages/customer/TrackingPage";
import Dashboard from "./pages/admin/Dashboard";
import QueueManagement from "./pages/admin/QueueManagement";
import QRPage from "./pages/admin/QRPage";
import LoginPage from "./pages/admin/LoginPage";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";
import { Toaster } from "sonner";
import { useEffect } from "react";
import { socketService } from "./lib/socket";

function App() {
  useEffect(() => {
    socketService.connect();
    return () => {
      socketService.disconnect();
    };
  }, []);

  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Customer Routes (Public) */}
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="/join/:queueId" element={<JoinPage />} />
          <Route path="/queue/:entryId" element={<TrackingPage />} />

          {/* Admin Routes (Auth Required) */}
          <Route path="/admin/login" element={<LoginPage />} />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/queues/:queueId" 
            element={
              <ProtectedRoute>
                <QueueManagement />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/queues/:queueId/qr" 
            element={
              <ProtectedRoute>
                <QRPage />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Router>
      <Toaster />
    </AuthProvider>
  );
}

export default App;
