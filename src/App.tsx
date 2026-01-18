import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AppLayout } from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import Products from "./pages/Products";
import Customers from "./pages/Customers";
import Orders from "./pages/Orders";
import Inventory from "./pages/Inventory";
import Reports from "./pages/Reports";
import Staff from "./pages/Staff";
import Tables from "./pages/Tables";
import Rooms from "./pages/Rooms";
import Kitchen from "./pages/Kitchen";
import Reservations from "./pages/Reservations";
import Housekeeping from "./pages/Housekeeping";
import Pharmacy from "./pages/Pharmacy";
import PharmacyPrescriptions from "./pages/PharmacyPrescriptions";
import PharmacyPatients from "./pages/PharmacyPatients";
import PharmacyMedications from "./pages/PharmacyMedications";
import PharmacyInsurance from "./pages/PharmacyInsurance";
import PharmacyControlled from "./pages/PharmacyControlled";
import PharmacyInteractions from "./pages/PharmacyInteractions";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import FrontDesk from "./pages/FrontDesk";
import Maintenance from "./pages/Maintenance";
import GuestServices from "./pages/GuestServices";
import GuestProfiles from "./pages/GuestProfiles";
import Billing from "./pages/Billing";
import Subscription from "./pages/Subscription";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/onboarding" element={<Onboarding />} />
              
              {/* Protected routes with AppLayout */}
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/pos" element={<POS />} />
                <Route path="/products" element={<Products />} />
                <Route path="/products/new" element={<Products />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/customers/new" element={<Customers />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/orders/:id" element={<Orders />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/staff" element={<Staff />} />
                <Route path="/tables" element={<Tables />} />
                <Route path="/rooms" element={<Rooms />} />
                <Route path="/kitchen" element={<Kitchen />} />
                <Route path="/reservations" element={<Reservations />} />
                <Route path="/housekeeping" element={<Housekeeping />} />
                <Route path="/pharmacy" element={<Pharmacy />} />
                <Route path="/pharmacy/prescriptions" element={<PharmacyPrescriptions />} />
                <Route path="/pharmacy/patients" element={<PharmacyPatients />} />
                <Route path="/pharmacy/medications" element={<PharmacyMedications />} />
                <Route path="/pharmacy/insurance" element={<PharmacyInsurance />} />
                <Route path="/pharmacy/controlled" element={<PharmacyControlled />} />
                <Route path="/pharmacy/interactions" element={<PharmacyInteractions />} />
                <Route path="/front-desk" element={<FrontDesk />} />
                <Route path="/maintenance" element={<Maintenance />} />
                <Route path="/guest-services" element={<GuestServices />} />
                <Route path="/guest-profiles" element={<GuestProfiles />} />
                <Route path="/billing" element={<Billing />} />
                <Route path="/subscription" element={<Subscription />} />
                <Route path="/settings" element={<Settings />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
