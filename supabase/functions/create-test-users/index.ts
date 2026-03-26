import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestUser {
  email: string;
  password: string;
  fullName: string;
  vertical: "restaurant" | "hotel" | "pharmacy" | "retail";
  tier: "starter" | "professional" | "enterprise";
  role: "super_admin" | "org_admin" | "location_manager" | "pharmacist" | "front_desk" | "staff";
}

const testUsers: TestUser[] = [
  // Restaurant users
  { email: "restaurant.starter@test.com", password: "Test123!", fullName: "Restaurant Starter Admin", vertical: "restaurant", tier: "starter", role: "org_admin" },
  { email: "restaurant.pro@test.com", password: "Test123!", fullName: "Restaurant Pro Admin", vertical: "restaurant", tier: "professional", role: "org_admin" },
  { email: "restaurant.enterprise@test.com", password: "Test123!", fullName: "Restaurant Enterprise Admin", vertical: "restaurant", tier: "enterprise", role: "org_admin" },
  
  // Hotel users
  { email: "hotel.starter@test.com", password: "Test123!", fullName: "Hotel Starter Admin", vertical: "hotel", tier: "starter", role: "org_admin" },
  { email: "hotel.pro@test.com", password: "Test123!", fullName: "Hotel Pro Admin", vertical: "hotel", tier: "professional", role: "org_admin" },
  { email: "hotel.enterprise@test.com", password: "Test123!", fullName: "Hotel Enterprise Admin", vertical: "hotel", tier: "enterprise", role: "org_admin" },
  
  // Pharmacy users
  { email: "pharmacy.starter@test.com", password: "Test123!", fullName: "Pharmacy Starter Admin", vertical: "pharmacy", tier: "starter", role: "org_admin" },
  { email: "pharmacy.pro@test.com", password: "Test123!", fullName: "Pharmacy Pro Admin", vertical: "pharmacy", tier: "professional", role: "org_admin" },
  { email: "pharmacy.enterprise@test.com", password: "Test123!", fullName: "Pharmacy Enterprise Admin", vertical: "pharmacy", tier: "enterprise", role: "org_admin" },
  
  // Retail users
  { email: "retail.starter@test.com", password: "Test123!", fullName: "Retail Starter Admin", vertical: "retail", tier: "starter", role: "org_admin" },
  { email: "retail.pro@test.com", password: "Test123!", fullName: "Retail Pro Admin", vertical: "retail", tier: "professional", role: "org_admin" },
  { email: "retail.enterprise@test.com", password: "Test123!", fullName: "Retail Enterprise Admin", vertical: "retail", tier: "enterprise", role: "org_admin" },
  
  // Role-specific test users (all in Professional tier for feature access)
  { email: "pharmacist@test.com", password: "Test123!", fullName: "Test Pharmacist", vertical: "pharmacy", tier: "professional", role: "pharmacist" },
  { email: "frontdesk@test.com", password: "Test123!", fullName: "Test Front Desk", vertical: "hotel", tier: "professional", role: "front_desk" },
  { email: "manager@test.com", password: "Test123!", fullName: "Test Manager", vertical: "retail", tier: "professional", role: "location_manager" },
  { email: "staff@test.com", password: "Test123!", fullName: "Test Staff", vertical: "restaurant", tier: "professional", role: "staff" },
];

// Plan IDs from the database (non-GH versions for simplicity)
const planIds: Record<string, Record<string, string>> = {
  restaurant: {
    starter: "e3c23ce4-5d34-4882-aa82-f87595447cf9",
    professional: "80d28649-feb5-4297-bebc-1eb31c5e9ed4",
    enterprise: "c4b6ccbf-7880-4b00-b8d4-d8fa3a9b517c",
  },
  hotel: {
    starter: "15698c80-828a-47ee-a49d-62ae122c1992",
    professional: "3e8f0c16-99ff-43b1-ab38-4e2aeccde1dc",
    enterprise: "ffc8b9fd-1661-4f14-869d-0c9d64374506",
  },
  pharmacy: {
    starter: "e1db3187-b34a-4349-9124-0593243588f1",
    professional: "8ae088b7-671a-453d-8352-40c1d21a3eb1",
    enterprise: "a8353b20-c6e0-4e5d-99ac-826e113419ad",
  },
  retail: {
    starter: "f66fb708-498a-471c-ac59-ce4059bec2f5",
    professional: "c291cc8b-6281-4101-aa14-4f75b672eeb4",
    enterprise: "50334935-2747-4703-8783-7602e4c5e638",
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check for admin authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: callingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !callingUser) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if calling user is super_admin
    const { data: isSuperAdmin } = await supabaseAdmin.rpc("is_super_admin", { _user_id: callingUser.id });
    
    if (!isSuperAdmin) {
      return new Response(JSON.stringify({ error: "Only super admins can create test users" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { email: string; success: boolean; error?: string; userId?: string }[] = [];
    const createdOrganizations: Map<string, string> = new Map(); // key: vertical_tier, value: org_id

    for (const testUser of testUsers) {
      try {
        // Creating test user
        
        // Check if user already exists
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email === testUser.email);
        
        let userId: string;
        
        if (existingUser) {
          // User already exists, updating
          userId = existingUser.id;
          
          // Update password
          await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: testUser.password,
            email_confirm: true,
          });
        } else {
          // Create new user
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: testUser.email,
            password: testUser.password,
            email_confirm: true,
            user_metadata: { full_name: testUser.fullName },
          });

          if (createError) {
            throw createError;
          }
          
          userId = newUser.user.id;
          // User created
        }

        // Create or get organization for this vertical/tier combo
        const orgKey = `${testUser.vertical}_${testUser.tier}`;
        let orgId = createdOrganizations.get(orgKey);
        
        if (!orgId) {
          const orgName = `Test ${testUser.vertical.charAt(0).toUpperCase() + testUser.vertical.slice(1)} ${testUser.tier.charAt(0).toUpperCase() + testUser.tier.slice(1)}`;
          const orgSlug = `test-${testUser.vertical}-${testUser.tier}`;
          
          // Check if org exists
          const { data: existingOrg } = await supabaseAdmin
            .from("organizations")
            .select("id")
            .eq("slug", orgSlug)
            .single();
          
          if (existingOrg) {
            orgId = existingOrg.id;
          } else {
            // Create organization
            const { data: newOrg, error: orgError } = await supabaseAdmin
              .from("organizations")
              .insert({
                name: orgName,
                slug: orgSlug,
                primary_vertical: testUser.vertical,
                created_by: userId,
              })
              .select("id")
              .single();

            if (orgError) {
              throw orgError;
            }
            
            orgId = newOrg.id;
            // Organization created
            
            // Create location for organization
            const { error: locError } = await supabaseAdmin
              .from("locations")
              .insert({
                name: `${orgName} - Main Location`,
                organization_id: orgId,
                vertical: testUser.vertical,
                address: "123 Test Street",
                city: "Test City",
                country: "Ghana",
                is_active: true,
              });

            if (locError) {
              console.error(`Failed to create location: ${locError.message}`);
            }
            
            // Create subscription
            const planId = planIds[testUser.vertical]?.[testUser.tier];
            if (planId) {
              const { error: subError } = await supabaseAdmin
                .from("organization_subscriptions")
                .insert({
                  organization_id: orgId,
                  plan_id: planId,
                  status: "active",
                  current_period_start: new Date().toISOString(),
                  current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
                });

              if (subError) {
                console.error(`Failed to create subscription: ${subError.message}`);
              }
            }
          }
          
          createdOrganizations.set(orgKey, orgId!);
        }

        // Ensure orgId is defined before using
        if (!orgId) {
          throw new Error(`Failed to get/create organization for ${orgKey}`);
        }

        // Assign user role
        const { error: roleError } = await supabaseAdmin
          .from("user_roles")
          .upsert({
            user_id: userId,
            organization_id: orgId,
            role: testUser.role,
          }, { onConflict: "user_id,organization_id" });

        if (roleError) {
          console.error(`Failed to assign role: ${roleError.message}`);
        }

        results.push({ email: testUser.email, success: true, userId });
        
      } catch (error) {
        console.error(`Error creating user ${testUser.email}:`, error);
        results.push({ 
          email: testUser.email, 
          success: false, 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }

    // Create sample data for each organization
    await createSampleData(supabaseAdmin, createdOrganizations);

    return new Response(
      JSON.stringify({ 
        message: "Test users creation completed",
        results,
        totalCreated: results.filter(r => r.success).length,
        totalFailed: results.filter(r => !r.success).length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error in create-test-users:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function createSampleData(supabase: any, organizations: Map<string, string>) {
  console.log("Creating sample data for organizations...");
  
  for (const [key, orgId] of organizations) {
    const [vertical] = key.split("_");
    
    // Get location for this org
    const { data: location } = await supabase
      .from("locations")
      .select("id")
      .eq("organization_id", orgId)
      .single();
    
    if (!location) continue;
    
    const locationId = location.id;
    
    try {
      // Create sample customers
      const customers = [
        { full_name: "John Test Customer", email: "john@test.com", phone: "+233201234567", organization_id: orgId },
        { full_name: "Jane Sample Customer", email: "jane@test.com", phone: "+233207654321", organization_id: orgId },
        { full_name: "Bob Demo User", email: "bob@test.com", phone: "+233209999999", organization_id: orgId },
      ];
      
      const { data: createdCustomers, error: custError } = await supabase
        .from("customers")
        .upsert(customers, { onConflict: "organization_id,email" })
        .select("id");
      
      if (custError) {
        console.log(`Customers may already exist for org ${orgId}`);
      }
      
      // Create sample products based on vertical
      const products = getSampleProducts(vertical, orgId, locationId);
      const { error: prodError } = await supabase
        .from("products")
        .upsert(products, { onConflict: "organization_id,sku" });
      
      if (prodError) {
        console.log(`Products may already exist for org ${orgId}`);
      }
      
      // Vertical-specific sample data
      if (vertical === "hotel") {
        await createHotelSampleData(supabase, orgId, locationId);
      } else if (vertical === "pharmacy") {
        await createPharmacySampleData(supabase, orgId, locationId);
      } else if (vertical === "restaurant") {
        await createRestaurantSampleData(supabase, orgId, locationId);
      }
      
      console.log(`Created sample data for ${vertical} org: ${orgId}`);
    } catch (error) {
      console.error(`Error creating sample data for ${key}:`, error);
    }
  }
}

function getSampleProducts(vertical: string, orgId: string, locationId: string) {
  const baseProducts = {
    restaurant: [
      { name: "Jollof Rice", sku: "REST-001", unit_price: 25.00, category: "Main Course", stock_quantity: 100 },
      { name: "Grilled Tilapia", sku: "REST-002", unit_price: 45.00, category: "Main Course", stock_quantity: 50 },
      { name: "Banku with Okro", sku: "REST-003", unit_price: 20.00, category: "Traditional", stock_quantity: 80 },
      { name: "Coca Cola", sku: "REST-004", unit_price: 5.00, category: "Beverages", stock_quantity: 200 },
      { name: "Kelewele", sku: "REST-005", unit_price: 10.00, category: "Sides", stock_quantity: 150 },
    ],
    hotel: [
      { name: "Room Service - Breakfast", sku: "HTL-001", unit_price: 35.00, category: "Room Service", stock_quantity: 999 },
      { name: "Laundry Service", sku: "HTL-002", unit_price: 15.00, category: "Services", stock_quantity: 999 },
      { name: "Mini Bar - Water", sku: "HTL-003", unit_price: 3.00, category: "Mini Bar", stock_quantity: 500 },
      { name: "Spa Treatment", sku: "HTL-004", unit_price: 100.00, category: "Wellness", stock_quantity: 999 },
      { name: "Airport Transfer", sku: "HTL-005", unit_price: 80.00, category: "Transport", stock_quantity: 999 },
    ],
    pharmacy: [
      { name: "Paracetamol 500mg", sku: "PHM-001", unit_price: 5.00, category: "Pain Relief", stock_quantity: 500 },
      { name: "Amoxicillin 250mg", sku: "PHM-002", unit_price: 15.00, category: "Antibiotics", stock_quantity: 200 },
      { name: "Vitamin C 1000mg", sku: "PHM-003", unit_price: 12.00, category: "Vitamins", stock_quantity: 300 },
      { name: "Cough Syrup", sku: "PHM-004", unit_price: 8.00, category: "Cold & Flu", stock_quantity: 150 },
      { name: "Blood Pressure Monitor", sku: "PHM-005", unit_price: 120.00, category: "Equipment", stock_quantity: 20 },
    ],
    retail: [
      { name: "Premium T-Shirt", sku: "RTL-001", unit_price: 35.00, category: "Clothing", stock_quantity: 100 },
      { name: "Wireless Earbuds", sku: "RTL-002", unit_price: 75.00, category: "Electronics", stock_quantity: 50 },
      { name: "Leather Wallet", sku: "RTL-003", unit_price: 45.00, category: "Accessories", stock_quantity: 80 },
      { name: "Sneakers", sku: "RTL-004", unit_price: 120.00, category: "Footwear", stock_quantity: 60 },
      { name: "Backpack", sku: "RTL-005", unit_price: 55.00, category: "Bags", stock_quantity: 40 },
    ],
  };
  
  return (baseProducts[vertical as keyof typeof baseProducts] || baseProducts.retail).map(p => ({
    ...p,
    organization_id: orgId,
    location_id: locationId,
    vertical: vertical,
    is_active: true,
    low_stock_threshold: 10,
  }));
}

async function createHotelSampleData(supabase: any, orgId: string, locationId: string) {
  // Create hotel rooms
  const rooms = [
    { room_number: "101", room_type: "Standard", capacity: 2, price_per_night: 80, floor: 1 },
    { room_number: "102", room_type: "Standard", capacity: 2, price_per_night: 80, floor: 1 },
    { room_number: "201", room_type: "Deluxe", capacity: 2, price_per_night: 120, floor: 2 },
    { room_number: "202", room_type: "Deluxe", capacity: 3, price_per_night: 140, floor: 2 },
    { room_number: "301", room_type: "Suite", capacity: 4, price_per_night: 200, floor: 3 },
  ].map(r => ({
    ...r,
    location_id: locationId,
    status: "available",
    housekeeping_status: "clean",
    amenities: ["WiFi", "AC", "TV"],
  }));
  
  await supabase.from("hotel_rooms").upsert(rooms, { onConflict: "location_id,room_number" });
}

async function createPharmacySampleData(supabase: any, orgId: string, locationId: string) {
  // Create medications
  const medications = [
    { name: "Paracetamol", generic_name: "Acetaminophen", drug_class: "Analgesic", requires_prescription: false, strengths: ["500mg", "1000mg"] },
    { name: "Amoxicillin", generic_name: "Amoxicillin", drug_class: "Antibiotic", requires_prescription: true, strengths: ["250mg", "500mg"] },
    { name: "Metformin", generic_name: "Metformin HCL", drug_class: "Antidiabetic", requires_prescription: true, strengths: ["500mg", "850mg"] },
    { name: "Omeprazole", generic_name: "Omeprazole", drug_class: "PPI", requires_prescription: true, strengths: ["20mg", "40mg"] },
    { name: "Loratadine", generic_name: "Loratadine", drug_class: "Antihistamine", requires_prescription: false, strengths: ["10mg"] },
  ].map(m => ({
    ...m,
    organization_id: orgId,
    is_active: true,
    dosage_forms: ["Tablet", "Capsule"],
  }));
  
  await supabase.from("medications").upsert(medications, { onConflict: "organization_id,name" });
}

async function createRestaurantSampleData(supabase: any, orgId: string, locationId: string) {
  // Create restaurant tables
  const tables = [
    { table_number: "T1", capacity: 2, shape: "square", position_x: 100, position_y: 100 },
    { table_number: "T2", capacity: 4, shape: "rectangle", position_x: 200, position_y: 100 },
    { table_number: "T3", capacity: 4, shape: "rectangle", position_x: 300, position_y: 100 },
    { table_number: "T4", capacity: 6, shape: "rectangle", position_x: 100, position_y: 200 },
    { table_number: "T5", capacity: 8, shape: "round", position_x: 250, position_y: 250 },
  ].map(t => ({
    ...t,
    location_id: locationId,
    status: "available",
  }));
  
  await supabase.from("restaurant_tables").upsert(tables, { onConflict: "location_id,table_number" });
}
