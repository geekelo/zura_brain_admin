import { Navigate, Route, Routes } from "react-router-dom";
import { getAdminCode } from "./api";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Overview from "./pages/Overview";
import Clients from "./pages/Clients";
import Sessions from "./pages/Sessions";
import Therapists from "./pages/Therapists";
import Account from "./pages/Account";

function RequireAdmin() {
  if (!getAdminCode()) return <Navigate to="/login" replace />;
  return <Layout />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAdmin />}>
        <Route index element={<Overview />} />
        <Route path="clients" element={<Clients />} />
        <Route path="sessions" element={<Sessions />} />
        <Route path="therapists" element={<Therapists />} />
        <Route path="accounts/:account" element={<Account />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
