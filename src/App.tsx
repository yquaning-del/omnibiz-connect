import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CookieConsent } from "@/components/CookieConsent";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
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
import Pricing from "./pages/Pricing";
import Terms from "./pages/legal/Terms";
import Privacy from "./pages/legal/Privacy";
import Documentation from "./pages/Documentation";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOrganizations from "./pages/admin/AdminOrganizations";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminSupport from "./pages/admin/AdminSupport";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminAuditLogs from "./pages/admin/AdminAuditLogs";
// Property Management
import PropertyUnits from "./pages/property/Units";
import PropertyTenants from "./pages/property/Tenants";
import PropertyLeases from "./pages/property/Leases";
import PropertyRent from "./pages/property/RentCollection";
import PropertyApplications from "./pages/property/Applications";
import PropertyMaintenance from "./pages/property/Maintenance";
import PropertyReports from "./pages/property/Reports";
// Tenant Portal
import { TenantLayout } from "./components/layout/TenantLayout";
import TenantAuth from "./pages/tenant/TenantAuth";
import AcceptInvite from "./pages/tenant/AcceptInvite";
import TenantDashboard from "./pages/tenant/TenantDashboard";
import TenantLeases from "./pages/tenant/TenantLeases";
import TenantLeaseDetails from "./pages/tenant/TenantLeaseDetails";
import TenantPayments from "./pages/tenant/TenantPayments";
import TenantMaintenance from "./pages/tenant/TenantMaintenance";
import TenantProfile from "./pages/tenant/TenantProfile";
// Staff Portal
import AcceptStaffInvite from "./pages/staff/AcceptStaffInvite";
// Customer Menu (QR ordering)
import CustomerMenu from "./pages/menu/CustomerMenu";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <ErrorBoundary>
          <Toaster />
          <Sonner />
          <ServiceWorkerRegistration />
          <BrowserRouter>
            <AuthProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/docs" element={<Documentation />} />
                
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
                  {/* Property Management Routes */}
                  <Route path="/property/units" element={<PropertyUnits />} />
                  <Route path="/property/tenants" element={<PropertyTenants />} />
                  <Route path="/property/leases" element={<PropertyLeases />} />
                  <Route path="/property/rent" element={<PropertyRent />} />
                  <Route path="/property/applications" element={<PropertyApplications />} />
                  <Route path="/property/maintenance" element={<PropertyMaintenance />} />
                  <Route path="/property/reports" element={<PropertyReports />} />
                </Route>

                {/* Admin Routes */}
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/organizations" element={<AdminOrganizations />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
                <Route path="/admin/support" element={<AdminSupport />} />
                <Route path="/admin/analytics" element={<AdminAnalytics />} />
                <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />

                {/* Staff Invitation Route */}
                <Route path="/staff/accept-invite/:token" element={<AcceptStaffInvite />} />

                {/* Tenant Portal Routes */}
                <Route path="/tenant/auth" element={<TenantAuth />} />
                <Route path="/tenant/accept-invite/:token" element={<AcceptInvite />} />
                <Route element={<TenantLayout />}>
                  <Route path="/tenant/dashboard" element={<TenantDashboard />} />
                  <Route path="/tenant/leases" element={<TenantLeases />} />
                  <Route path="/tenant/leases/:id" element={<TenantLeaseDetails />} />
                  <Route path="/tenant/payments" element={<TenantPayments />} />
                  <Route path="/tenant/maintenance" element={<TenantMaintenance />} />
                  <Route path="/tenant/profile" element={<TenantProfile />} />
                </Route>

                {/* Public Customer Menu (QR ordering) */}
                <Route path="/menu/:orgSlug/:locationId" element={<CustomerMenu />} />

                <Route path="*" element={<NotFound />} />
              </Routes>
              <CookieConsent />
            </AuthProvider>
          </BrowserRouter>
        </ErrorBoundary>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
