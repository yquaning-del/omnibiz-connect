import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PageErrorBoundary } from "@/components/PageErrorBoundary";
import { AdminRouteGuard } from "@/components/auth/AdminRouteGuard";
import { CookieConsent } from "@/components/CookieConsent";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import React, { Suspense } from "react";

// Eagerly loaded (used on initial navigation)
import Index from "./pages/Index";
import Auth from "./pages/Auth";

// Lazy-loaded pages for code splitting
const ForgotPassword = React.lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = React.lazy(() => import("./pages/ResetPassword"));
const Onboarding = React.lazy(() => import("./pages/Onboarding"));
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const POS = React.lazy(() => import("./pages/POS"));
const Products = React.lazy(() => import("./pages/Products"));
const Customers = React.lazy(() => import("./pages/Customers"));
const Orders = React.lazy(() => import("./pages/Orders"));
const Inventory = React.lazy(() => import("./pages/Inventory"));
const Reports = React.lazy(() => import("./pages/Reports"));
const Staff = React.lazy(() => import("./pages/Staff"));
const Tables = React.lazy(() => import("./pages/Tables"));
const Rooms = React.lazy(() => import("./pages/Rooms"));
const Kitchen = React.lazy(() => import("./pages/Kitchen"));
const Reservations = React.lazy(() => import("./pages/Reservations"));
const Housekeeping = React.lazy(() => import("./pages/Housekeeping"));
const Pharmacy = React.lazy(() => import("./pages/Pharmacy"));
const PharmacyPrescriptions = React.lazy(() => import("./pages/PharmacyPrescriptions"));
const PharmacyPatients = React.lazy(() => import("./pages/PharmacyPatients"));
const PharmacyMedications = React.lazy(() => import("./pages/PharmacyMedications"));
const PharmacyInsurance = React.lazy(() => import("./pages/PharmacyInsurance"));
const PharmacyControlled = React.lazy(() => import("./pages/PharmacyControlled"));
const PharmacyInteractions = React.lazy(() => import("./pages/PharmacyInteractions"));
const Settings = React.lazy(() => import("./pages/Settings"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const FrontDesk = React.lazy(() => import("./pages/FrontDesk"));
const Maintenance = React.lazy(() => import("./pages/Maintenance"));
const GuestServices = React.lazy(() => import("./pages/GuestServices"));
const GuestProfiles = React.lazy(() => import("./pages/GuestProfiles"));
const Billing = React.lazy(() => import("./pages/Billing"));
const Subscription = React.lazy(() => import("./pages/Subscription"));
const Pricing = React.lazy(() => import("./pages/Pricing"));
const Terms = React.lazy(() => import("./pages/legal/Terms"));
const Privacy = React.lazy(() => import("./pages/legal/Privacy"));
const Documentation = React.lazy(() => import("./pages/Documentation"));
const AdminDashboard = React.lazy(() => import("./pages/admin/AdminDashboard"));
const AdminOrganizations = React.lazy(() => import("./pages/admin/AdminOrganizations"));
const AdminUsers = React.lazy(() => import("./pages/admin/AdminUsers"));
const AdminSubscriptions = React.lazy(() => import("./pages/admin/AdminSubscriptions"));
const AdminSupport = React.lazy(() => import("./pages/admin/AdminSupport"));
const AdminAnalytics = React.lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminAuditLogs = React.lazy(() => import("./pages/admin/AdminAuditLogs"));
const AdminUATSetup = React.lazy(() => import("./pages/admin/AdminUATSetup"));
// Property Management
const PropertyUnits = React.lazy(() => import("./pages/property/Units"));
const PropertyTenants = React.lazy(() => import("./pages/property/Tenants"));
const PropertyLeases = React.lazy(() => import("./pages/property/Leases"));
const PropertyRent = React.lazy(() => import("./pages/property/RentCollection"));
const PropertyApplications = React.lazy(() => import("./pages/property/Applications"));
const PropertyMaintenance = React.lazy(() => import("./pages/property/Maintenance"));
const PropertyReports = React.lazy(() => import("./pages/property/Reports"));
// Tenant Portal
const TenantLayout = React.lazy(() => import("./components/layout/TenantLayout").then(m => ({ default: m.TenantLayout })));
const TenantAuth = React.lazy(() => import("./pages/tenant/TenantAuth"));
const AcceptInvite = React.lazy(() => import("./pages/tenant/AcceptInvite"));
const TenantDashboard = React.lazy(() => import("./pages/tenant/TenantDashboard"));
const TenantLeases = React.lazy(() => import("./pages/tenant/TenantLeases"));
const TenantLeaseDetails = React.lazy(() => import("./pages/tenant/TenantLeaseDetails"));
const TenantPayments = React.lazy(() => import("./pages/tenant/TenantPayments"));
const TenantMaintenance = React.lazy(() => import("./pages/tenant/TenantMaintenance"));
const TenantProfile = React.lazy(() => import("./pages/tenant/TenantProfile"));
const AcceptStaffInvite = React.lazy(() => import("./pages/staff/AcceptStaffInvite"));
// Online Orders Management
const OnlineOrders = React.lazy(() => import("./pages/OnlineOrders"));
// Customer Menu (QR ordering)
const CustomerMenu = React.lazy(() => import("./pages/menu/CustomerMenu"));
// E-commerce Store
const StoreCatalog = React.lazy(() => import("./pages/store/StoreCatalog"));
const StoreCheckout = React.lazy(() => import("./pages/store/StoreCheckout"));
// Public Business Portals
const HotelBooking = React.lazy(() => import("./pages/public/HotelBooking"));
const PropertyListings = React.lazy(() => import("./pages/public/PropertyListings"));
const PharmacyRefillPortal = React.lazy(() => import("./pages/public/PharmacyRefillPortal"));
const BusinessSite = React.lazy(() => import("./pages/public/BusinessSite"));

const queryClient = new QueryClient();

// Suspense fallback for lazy-loaded routes
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]" role="status" aria-label="Loading page">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <ErrorBoundary>
          <Sonner />
          <ServiceWorkerRegistration />
          <InstallPrompt />
          <BrowserRouter>
            <AuthProvider>
              <Suspense fallback={<PageLoader />}>
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
                    <Route path="/dashboard" element={<PageErrorBoundary pageName="Dashboard"><Dashboard /></PageErrorBoundary>} />
                    <Route path="/pos" element={<PageErrorBoundary pageName="POS"><POS /></PageErrorBoundary>} />
                    <Route path="/products" element={<PageErrorBoundary pageName="Products"><Products /></PageErrorBoundary>} />
                    <Route path="/products/new" element={<PageErrorBoundary pageName="Products"><Products /></PageErrorBoundary>} />
                    <Route path="/customers" element={<PageErrorBoundary pageName="Customers"><Customers /></PageErrorBoundary>} />
                    <Route path="/customers/new" element={<PageErrorBoundary pageName="Customers"><Customers /></PageErrorBoundary>} />
                    <Route path="/orders" element={<PageErrorBoundary pageName="Orders"><Orders /></PageErrorBoundary>} />
                    <Route path="/orders/:id" element={<PageErrorBoundary pageName="Orders"><Orders /></PageErrorBoundary>} />
                    <Route path="/inventory" element={<PageErrorBoundary pageName="Inventory"><Inventory /></PageErrorBoundary>} />
                    <Route path="/online-orders" element={<PageErrorBoundary pageName="Online Orders"><OnlineOrders /></PageErrorBoundary>} />
                    <Route path="/reports" element={<PageErrorBoundary pageName="Reports"><Reports /></PageErrorBoundary>} />
                    <Route path="/staff" element={<PageErrorBoundary pageName="Staff"><Staff /></PageErrorBoundary>} />
                    <Route path="/tables" element={<PageErrorBoundary pageName="Tables"><Tables /></PageErrorBoundary>} />
                    <Route path="/rooms" element={<PageErrorBoundary pageName="Rooms"><Rooms /></PageErrorBoundary>} />
                    <Route path="/kitchen" element={<PageErrorBoundary pageName="Kitchen"><Kitchen /></PageErrorBoundary>} />
                    <Route path="/reservations" element={<PageErrorBoundary pageName="Reservations"><Reservations /></PageErrorBoundary>} />
                    <Route path="/housekeeping" element={<PageErrorBoundary pageName="Housekeeping"><Housekeeping /></PageErrorBoundary>} />
                    <Route path="/pharmacy" element={<PageErrorBoundary pageName="Pharmacy"><Pharmacy /></PageErrorBoundary>} />
                    <Route path="/pharmacy/prescriptions" element={<PageErrorBoundary pageName="Prescriptions"><PharmacyPrescriptions /></PageErrorBoundary>} />
                    <Route path="/pharmacy/patients" element={<PageErrorBoundary pageName="Patients"><PharmacyPatients /></PageErrorBoundary>} />
                    <Route path="/pharmacy/medications" element={<PageErrorBoundary pageName="Medications"><PharmacyMedications /></PageErrorBoundary>} />
                    <Route path="/pharmacy/insurance" element={<PageErrorBoundary pageName="Insurance"><PharmacyInsurance /></PageErrorBoundary>} />
                    <Route path="/pharmacy/controlled" element={<PageErrorBoundary pageName="Controlled"><PharmacyControlled /></PageErrorBoundary>} />
                    <Route path="/pharmacy/interactions" element={<PageErrorBoundary pageName="Interactions"><PharmacyInteractions /></PageErrorBoundary>} />
                    <Route path="/front-desk" element={<PageErrorBoundary pageName="Front Desk"><FrontDesk /></PageErrorBoundary>} />
                    <Route path="/maintenance" element={<PageErrorBoundary pageName="Maintenance"><Maintenance /></PageErrorBoundary>} />
                    <Route path="/guest-services" element={<PageErrorBoundary pageName="Guest Services"><GuestServices /></PageErrorBoundary>} />
                    <Route path="/guest-profiles" element={<PageErrorBoundary pageName="Guest Profiles"><GuestProfiles /></PageErrorBoundary>} />
                    <Route path="/billing" element={<PageErrorBoundary pageName="Billing"><Billing /></PageErrorBoundary>} />
                    <Route path="/subscription" element={<PageErrorBoundary pageName="Subscription"><Subscription /></PageErrorBoundary>} />
                    <Route path="/settings" element={<PageErrorBoundary pageName="Settings"><Settings /></PageErrorBoundary>} />
                    {/* Property Management Routes */}
                    <Route path="/property/units" element={<PageErrorBoundary pageName="Units"><PropertyUnits /></PageErrorBoundary>} />
                    <Route path="/property/tenants" element={<PageErrorBoundary pageName="Tenants"><PropertyTenants /></PageErrorBoundary>} />
                    <Route path="/property/leases" element={<PageErrorBoundary pageName="Leases"><PropertyLeases /></PageErrorBoundary>} />
                    <Route path="/property/rent" element={<PageErrorBoundary pageName="Rent Collection"><PropertyRent /></PageErrorBoundary>} />
                    <Route path="/property/applications" element={<PageErrorBoundary pageName="Applications"><PropertyApplications /></PageErrorBoundary>} />
                    <Route path="/property/maintenance" element={<PageErrorBoundary pageName="Property Maintenance"><PropertyMaintenance /></PageErrorBoundary>} />
                    <Route path="/property/reports" element={<PageErrorBoundary pageName="Property Reports"><PropertyReports /></PageErrorBoundary>} />
                    {/* Admin Routes (inside AppLayout for auth guard + sidebar) */}
                    <Route path="/admin" element={<PageErrorBoundary pageName="Admin Dashboard"><AdminDashboard /></PageErrorBoundary>} />
                    <Route path="/admin/organizations" element={<PageErrorBoundary pageName="Organizations"><AdminOrganizations /></PageErrorBoundary>} />
                    <Route path="/admin/users" element={<PageErrorBoundary pageName="Admin Users"><AdminUsers /></PageErrorBoundary>} />
                    <Route path="/admin/subscriptions" element={<PageErrorBoundary pageName="Admin Subscriptions"><AdminSubscriptions /></PageErrorBoundary>} />
                    <Route path="/admin/support" element={<PageErrorBoundary pageName="Support"><AdminSupport /></PageErrorBoundary>} />
                    <Route path="/admin/analytics" element={<PageErrorBoundary pageName="Analytics"><AdminAnalytics /></PageErrorBoundary>} />
                    <Route path="/admin/audit-logs" element={<PageErrorBoundary pageName="Audit Logs"><AdminAuditLogs /></PageErrorBoundary>} />
                    <Route path="/admin/uat-setup" element={<PageErrorBoundary pageName="UAT Setup"><AdminUATSetup /></PageErrorBoundary>} />
                  </Route>

                  {/* Staff Invitation Route */}
                  <Route path="/staff/accept-invite/:token" element={<AcceptStaffInvite />} />

                  {/* Tenant Portal Routes */}
                  <Route path="/tenant/auth" element={<TenantAuth />} />
                  <Route path="/tenant/accept-invite/:token" element={<AcceptInvite />} />
                  <Route element={
                    <Suspense fallback={<PageLoader />}>
                      <TenantLayout />
                    </Suspense>
                  }>
                    <Route path="/tenant/dashboard" element={<TenantDashboard />} />
                    <Route path="/tenant/leases" element={<TenantLeases />} />
                    <Route path="/tenant/leases/:id" element={<TenantLeaseDetails />} />
                    <Route path="/tenant/payments" element={<TenantPayments />} />
                    <Route path="/tenant/maintenance" element={<TenantMaintenance />} />
                    <Route path="/tenant/profile" element={<TenantProfile />} />
                  </Route>

                  {/* Public Customer Menu (QR ordering) */}
                  <Route path="/menu/:orgSlug/:locationId" element={<CustomerMenu />} />

                  {/* Public E-commerce Store */}
                  <Route path="/store/:orgSlug" element={<StoreCatalog />} />
                  <Route path="/store/:orgSlug/checkout" element={<StoreCheckout />} />

                  {/* Public Business Portals */}
                  <Route path="/site/:orgSlug" element={<BusinessSite />} />
                  <Route path="/book/:orgSlug" element={<HotelBooking />} />
                  <Route path="/rentals/:orgSlug" element={<PropertyListings />} />
                  <Route path="/pharmacy/:orgSlug/refills" element={<PharmacyRefillPortal />} />

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              <CookieConsent />
            </AuthProvider>
          </BrowserRouter>
        </ErrorBoundary>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
