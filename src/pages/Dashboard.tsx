import { useAuth } from '@/contexts/AuthContext';
import RestaurantDashboard from './dashboards/RestaurantDashboard';
import HotelDashboard from './dashboards/HotelDashboard';
import PharmacyDashboard from './dashboards/PharmacyDashboard';
import RetailDashboard from './dashboards/RetailDashboard';

export default function Dashboard() {
  const { currentOrganization, currentLocation } = useAuth();
  
  const vertical = currentLocation?.vertical || currentOrganization?.primary_vertical || 'retail';

  // Route to vertical-specific dashboard
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
}
