
# Location-Based Lease Creation Implementation Plan

## Overview

Implement a comprehensive location-based lease generation system that dynamically creates legally-compliant lease templates based on the unit's geographic location (United States, Ghana, or other countries), with optional AI-assisted clause generation.

---

## Current State Analysis

### Existing Schema Gaps

| Table | Current Columns | Missing Columns |
|-------|-----------------|-----------------|
| `property_units` | unit_number, unit_type, floor, bedrooms, etc. | **country, state, city, address** |
| `leases` | unit_id, tenant_id, monthly_rent, etc. | **country, state, city, template_source, lease_document** |
| `locations` | address, city, country | Already has city/country (can inherit) |

### Current LeaseWizard Flow
5 steps: Select Unit → Select Tenant → Lease Terms → Payment Details → Review

### Required Changes
Expand the wizard to include location detection and template-based generation with AI assistance.

---

## Implementation Plan

### Phase 1: Database Schema Updates

**1.1 Add Location Columns to `property_units` Table**

```sql
ALTER TABLE public.property_units
  ADD COLUMN address TEXT,
  ADD COLUMN city TEXT,
  ADD COLUMN state TEXT,
  ADD COLUMN country TEXT DEFAULT 'US';
```

**1.2 Add Location & Template Columns to `leases` Table**

```sql
ALTER TABLE public.leases
  ADD COLUMN country TEXT,
  ADD COLUMN state TEXT,
  ADD COLUMN city TEXT,
  ADD COLUMN template_source TEXT,
  ADD COLUMN lease_document JSONB;
```

**1.3 Create `lease_templates` Reference Table**

```sql
CREATE TABLE public.lease_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id),
  country TEXT NOT NULL,
  state TEXT,
  city TEXT,
  template_name TEXT NOT NULL,
  template_content JSONB NOT NULL, -- Stores clause structure
  required_clauses TEXT[] DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### Phase 2: Frontend Updates

**2.1 Update Units Page (`src/pages/property/Units.tsx`)**

Add address/location fields to the Add Unit form:
- Address (text input)
- City (text input)
- State/Region (dropdown - dynamic based on country)
- Country (dropdown - US, Ghana, Other)

**2.2 Create Enhanced LeaseWizard with Location Step**

Replace the existing LeaseWizard with an expanded 7-step flow:

| Step | Title | Description |
|------|-------|-------------|
| 1 | Select Unit | Choose available unit (unchanged) |
| 2 | **Confirm Location** | Auto-load location from unit, allow landlord to edit Country/State/City |
| 3 | Select Tenant | Choose tenant (unchanged) |
| 4 | Lease Terms | Start/end date, lease type (unchanged) |
| 5 | Payment Details | Rent, deposit, late fees (unchanged) |
| 6 | **Generate Lease** | AI generates location-specific clauses or loads template |
| 7 | Review & Create | Final review with editable clauses |

**2.3 Create LocationConfirmStep Component**

New component for Step 2:
- Display unit details with pre-filled location
- Country dropdown (US, Ghana, Other countries)
- State dropdown (conditional - required for US)
- City input (required for Ghana)
- Validation: Block "Next" if required fields are missing

**2.4 Create LeaseGenerationStep Component**

New component for Step 6:
- Shows loading spinner while AI generates
- Displays generated clauses in editable sections:
  - Legal Clauses (based on jurisdiction)
  - Rent Terms
  - Security Deposit Rules
  - Late Fee Policy
  - Maintenance Responsibilities
  - Termination Conditions
- "Regenerate" button to retry AI generation
- Manual override option

---

### Phase 3: AI-Assisted Lease Generation Edge Function

**3.1 Create `ai-lease-generator` Edge Function**

Path: `supabase/functions/ai-lease-generator/index.ts`

**Input:**
```typescript
interface LeaseGenerationRequest {
  country: string;
  state?: string;
  city?: string;
  unitDetails: {
    type: string;
    bedrooms: number;
    address: string;
  };
  leaseTerms: {
    startDate: string;
    endDate?: string;
    monthlyRent: number;
    securityDeposit: number;
    lateFee: number;
    gracePeriod: number;
  };
  tenantInfo: {
    name: string;
  };
}
```

**Output:**
```typescript
interface LeaseGenerationResponse {
  success: boolean;
  data: {
    templateSource: string; // "US-CA", "GH-ACCRA", "GENERIC"
    clauses: {
      legalNotices: string[];
      rentTerms: string;
      securityDepositRules: string;
      lateFeePolicy: string;
      maintenanceResponsibilities: string;
      terminationConditions: string;
      additionalClauses: string[];
    };
    jurisdiction: {
      country: string;
      state?: string;
      city?: string;
      applicableLaws: string[];
    };
    confidence: "high" | "medium" | "low";
  };
}
```

**AI Prompt Strategy:**
- US: Generate state-specific clauses (e.g., California security deposit limits, Texas landlord-tenant laws)
- Ghana: Generate Ghana Rent Control Act compliant clauses with city-specific variations
- Other: Generate generic international lease with local law disclaimer

---

### Phase 4: Location Data Configuration

**4.1 Create Location Constants**

Path: `src/lib/leaseLocations.ts`

```typescript
export const LEASE_COUNTRIES = [
  { code: 'US', name: 'United States', requiresState: true },
  { code: 'GH', name: 'Ghana', requiresCity: true },
  { code: 'OTHER', name: 'Other Country', requiresState: false },
];

export const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  // ... all 50 states
  { code: 'WY', name: 'Wyoming' },
];

export const GHANA_CITIES = [
  { name: 'Accra', region: 'Greater Accra' },
  { name: 'Kumasi', region: 'Ashanti' },
  { name: 'Tamale', region: 'Northern' },
  { name: 'Tema', region: 'Greater Accra' },
  { name: 'Cape Coast', region: 'Central' },
  // ... other major cities
];
```

---

### Phase 5: Validation Logic

**5.1 Update LeaseWizard Validation**

The "Create Lease" button remains **disabled** until:

| Condition | Validation Rule |
|-----------|-----------------|
| Unit Selected | `formData.unitId` is not empty |
| Country Present | `formData.country` is not empty |
| State Required (US) | If country === 'US', state must be selected |
| City Required (GH) | If country === 'GH', city must be provided |
| Tenant Selected | `formData.tenantId` is not empty |
| Rent Provided | `formData.monthlyRent` > 0 |

**Error Messages:**
- "Please select a country for this lease"
- "State is required for U.S. properties"
- "City is required for Ghana properties"

---

### Phase 6: Data Storage Updates

**6.1 Updated Lease Insert**

When creating a lease, store all location and template data:

```typescript
const { error } = await supabase.from('leases').insert({
  organization_id: currentOrganization.id,
  unit_id: formData.unitId,
  tenant_id: formData.tenantId,
  lease_number: generateLeaseNumber(),
  // ... existing fields
  // New location fields:
  country: formData.country,
  state: formData.state,
  city: formData.city,
  template_source: generatedLease.templateSource,
  lease_document: generatedLease.clauses,
  status: 'active',
});
```

---

## Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `src/lib/leaseLocations.ts` | Country/state/city constants |
| `src/components/property/LocationConfirmStep.tsx` | Location confirmation wizard step |
| `src/components/property/LeaseGenerationStep.tsx` | AI generation step with clause editor |
| `src/components/property/LeaseClauseEditor.tsx` | Editable clause sections |
| `supabase/functions/ai-lease-generator/index.ts` | AI-powered lease generation |

### Modified Files
| File | Changes |
|------|---------|
| `src/pages/property/Units.tsx` | Add address/location fields to Add Unit form |
| `src/components/property/LeaseWizard.tsx` | Expand to 7 steps with location and generation |
| `src/pages/property/Leases.tsx` | Display location info in lease cards |

### Database Migration
New migration file adding location columns and lease_templates table.

---

## User Flow Summary

```text
1. Landlord clicks "Create Lease"
2. Selects an available unit
3. System auto-loads unit's location (country/state/city)
4. Landlord confirms or edits location
5. System validates: State required for US, City required for Ghana
6. Landlord selects tenant
7. Landlord sets lease terms (dates, rent, deposit, late fees)
8. System calls AI to generate location-specific lease
9. Landlord reviews and edits generated clauses
10. Landlord clicks "Create Lease"
11. Lease saved with all location and template data
12. Unit status updated to "occupied"
```

---

## Technical Considerations

### AI Model Selection
Use `google/gemini-2.5-flash` via Lovable AI Gateway (no API key required).

### Error Handling
- If AI generation fails, fallback to generic template
- Show "AI unavailable" message with manual entry option
- Log all generation attempts for debugging

### Performance
- Cache country/state data in frontend
- Lazy-load city lists based on country selection
- Debounce AI generation requests

### Security
- All lease data protected by existing organization-based RLS
- AI function validates user authentication
- No PII sent to AI (only anonymized unit/term data)

---

## Testing Checklist

After implementation:
- [ ] US property: State dropdown appears and is required
- [ ] Ghana property: City field appears and is required
- [ ] Other country: Basic country selection works
- [ ] Location auto-fills from unit when available
- [ ] AI generates jurisdiction-specific clauses
- [ ] Generated clauses are editable before saving
- [ ] Lease saves with all location data
- [ ] Existing leases continue to work (backward compatible)
- [ ] Error states handled gracefully
