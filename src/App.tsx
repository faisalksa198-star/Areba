import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AdminRoute } from "@/components/AdminRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import DataCenter from "./pages/DataCenter";
import Kits from "./pages/Kits";
import Orders from "./pages/Orders";
import LeaderPage from "./pages/LeaderPage";
import OrderStatus from "./pages/OrderStatus";
import StudentRegister from "./pages/StudentRegister";
import Employees from "./pages/Employees";
import NotFound from "./pages/NotFound";
import ShortRedirect from "./pages/ShortRedirect";
import CalculatorPage from "./pages/Calculator";
import PublicCalculatorPage from "./pages/PublicCalculatorPage";
import Invoices from "./pages/Invoices";
import SallaProducts from "./pages/SallaProducts";
import SallaOrders from "./pages/SallaOrders";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/data-center" element={<AdminRoute><DataCenter /></AdminRoute>} />
            <Route path="/kits" element={<AdminRoute><Kits /></AdminRoute>} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/my-orders" element={<Orders myOrdersOnly />} />
            <Route path="/employees" element={<AdminRoute><Employees /></AdminRoute>} />
            <Route path="/order/:orderId/leader" element={<LeaderPage />} />
            <Route path="/order/:orderId/register" element={<StudentRegister />} />
            <Route path="/order/:orderId/status" element={<OrderStatus />} />
            <Route path="/calculator" element={<PublicCalculatorPage />} />
            <Route path="/admin-calculator" element={<CalculatorPage />} />
            <Route path="/public-calculator" element={<PublicCalculatorPage />} />
            <Route path="/invoices" element={<Invoices />} />
            
            <Route path="/r/:code" element={<ShortRedirect />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
