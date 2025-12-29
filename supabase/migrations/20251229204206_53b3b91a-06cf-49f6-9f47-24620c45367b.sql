-- Create app roles enum for user hierarchy
CREATE TYPE public.app_role AS ENUM ('super_admin', 'org_admin', 'location_manager', 'department_lead', 'staff');

-- Create business vertical enum
CREATE TYPE public.business_vertical AS ENUM ('restaurant', 'hotel', 'pharmacy', 'retail');

-- Organizations table (multi-tenant root)
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  primary_vertical business_vertical NOT NULL DEFAULT 'restaurant',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Locations table (branches/outlets)
CREATE TABLE public.locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  country TEXT,
  phone TEXT,
  email TEXT,
  vertical business_vertical NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id, location_id, role)
);

-- Products/Items table (unified for all verticals)
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT,
  barcode TEXT,
  category TEXT,
  subcategory TEXT,
  vertical business_vertical NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  cost_price DECIMAL(10,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  stock_quantity INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  image_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Customers/Guests table
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  loyalty_points INTEGER DEFAULT 0,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Orders/Transactions table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  order_number TEXT NOT NULL,
  vertical business_vertical NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending',
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Order items table
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Staff schedules table
CREATE TABLE public.staff_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_schedules ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get user's organization IDs
CREATE OR REPLACE FUNCTION public.get_user_org_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT organization_id FROM public.user_roles
  WHERE user_id = _user_id AND organization_id IS NOT NULL
$$;

-- Function to get user's location IDs
CREATE OR REPLACE FUNCTION public.get_user_location_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT location_id FROM public.user_roles
  WHERE user_id = _user_id AND location_id IS NOT NULL
$$;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Organizations policies
CREATE POLICY "Users can view their organizations" ON public.organizations
  FOR SELECT USING (id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "Org admins can update organizations" ON public.organizations
  FOR UPDATE USING (
    id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'org_admin'))
  );

CREATE POLICY "Super admins can insert organizations" ON public.organizations
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()));

-- Locations policies
CREATE POLICY "Users can view their locations" ON public.locations
  FOR SELECT USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "Org admins can manage locations" ON public.locations
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'org_admin'))
  );

-- User roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Org admins can manage roles" ON public.user_roles
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'org_admin'))
  );

-- Products policies
CREATE POLICY "Users can view products in their org" ON public.products
  FOR SELECT USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "Managers can manage products" ON public.products
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'org_admin', 'location_manager'))
  );

-- Customers policies
CREATE POLICY "Users can view customers in their org" ON public.customers
  FOR SELECT USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "Staff can manage customers" ON public.customers
  FOR ALL USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

-- Orders policies
CREATE POLICY "Users can view orders in their org" ON public.orders
  FOR SELECT USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "Staff can create orders" ON public.orders
  FOR INSERT WITH CHECK (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "Staff can update orders" ON public.orders
  FOR UPDATE USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

-- Order items policies
CREATE POLICY "Users can view order items" ON public.order_items
  FOR SELECT USING (
    order_id IN (SELECT id FROM public.orders WHERE organization_id IN (SELECT public.get_user_org_ids(auth.uid())))
  );

CREATE POLICY "Staff can manage order items" ON public.order_items
  FOR ALL USING (
    order_id IN (SELECT id FROM public.orders WHERE organization_id IN (SELECT public.get_user_org_ids(auth.uid())))
  );

-- Staff schedules policies
CREATE POLICY "Users can view own schedules" ON public.staff_schedules
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Managers can view all schedules in location" ON public.staff_schedules
  FOR SELECT USING (location_id IN (SELECT public.get_user_location_ids(auth.uid())));

CREATE POLICY "Managers can manage schedules" ON public.staff_schedules
  FOR ALL USING (
    location_id IN (SELECT location_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'org_admin', 'location_manager'))
  );

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  RETURN new;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_staff_schedules_updated_at BEFORE UPDATE ON public.staff_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_locations_org ON public.locations(organization_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_org ON public.user_roles(organization_id);
CREATE INDEX idx_products_org ON public.products(organization_id);
CREATE INDEX idx_products_location ON public.products(location_id);
CREATE INDEX idx_customers_org ON public.customers(organization_id);
CREATE INDEX idx_orders_org ON public.orders(organization_id);
CREATE INDEX idx_orders_location ON public.orders(location_id);
CREATE INDEX idx_order_items_order ON public.order_items(order_id);