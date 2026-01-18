import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Shield, ArrowRight } from 'lucide-react';
import RestaurantDashboard from './dashboards/RestaurantDashboard';
import HotelDashboard from './dashboards/HotelDashboard';
import PharmacyDashboard from './dashboards/PharmacyDashboard';
import RetailDashboard from './dashboards/RetailDashboard';

function AdminBanner() {
  return (
    <Link
      to="/admin"
      className="flex items-center justify-between p-4 mb-6 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/15 transition-colors group"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/20">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-medium text-foreground">Platform Admin</p>
          <p className="text-sm text-muted-foreground">
            Access the super admin dashboard to manage the entire platform
          </p>
        </div>
      </div>
      <ArrowRight className="h-5 w-5 text-primary group-hover:translate-x-1 transition-transform" />
    </Link>
  );
}

export default function Dashboard() {
  const { currentOrganization, currentLocation, hasRole } = useAuth();
  
  const vertical = currentLocation?.vertical || currentOrganization?.primary_vertical || 'retail';
  const isSuperAdmin = hasRole('super_admin');

  const renderDashboard = () => {
    switch (vertical) {
      case 'restaurant':
        return <RestaurantDashboard />;
      case 'hotel':
        return <HotelDashboard />;
      case 'pharmacy':
        return <PharmacyDashboard />;
      case 'retail':
      default:
        return <RetailDashboard />;
    }
  };

  return (
    <>
      {isSuperAdmin && <AdminBanner />}
      {renderDashboard()}
    </>
  );
}
