
# Fix Lease Creation Failure and Enhance Lease Detail Generation

## Problem Summary

The "Create Lease" button fails at Step 7 because the database insert includes a column (`lease_number`) that doesn't exist in the `leases` table. Additionally, the AI-generated lease clauses could be more detailed and comprehensive.

## Root Cause Analysis

### Issue 1: Non-Existent Column in Insert

The `handleSubmit` function in `LeaseWizard.tsx` (line 179) attempts to insert a `lease_number` column:

```typescript
const { error } = await (supabase as any)
  .from('leases')
  .insert({
    // ...
    lease_number: leaseNumber,  // ← This column doesn't exist!
    // ...
  });
```

However, querying the database schema confirms there is **no `lease_number` column** in the `leases` table:

| Existing Columns | Missing |
|------------------|---------|
| id, organization_id, unit_id, tenant_id, lease_type, start_date, end_date, monthly_rent, security_deposit, payment_due_day, late_fee_amount, grace_period_days, special_terms, status, created_at, updated_at, country, state, city, template_source, lease_document | **lease_number** |

This causes a Supabase error that silently fails the insert.

### Issue 2: AI Prompt Could Be More Detailed

The current AI prompt generates basic clauses, but they could be significantly more comprehensive with:
- Utilities and services responsibilities
- Pet policies
- Noise and disturbance rules
- Insurance requirements
- Entry and inspection rights
- Alterations and modifications
- Subletting policies
- Emergency contact procedures

---

## Solution

### Phase 1: Fix Database Insert

**Option A: Remove the lease_number field from the insert** (Simpler)

Remove the `lease_number` line from the insert statement since the column doesn't exist.

**Option B: Add lease_number column via migration** (More complete)

Add the `lease_number` column to the database to enable lease tracking by number.

**Recommended: Option B** - A lease number is useful for reference and legal documentation.

### Phase 2: Enhance AI-Generated Lease Clauses

Update the `LeaseClausesData` interface and AI prompt to generate more comprehensive clauses:

| Current Clause | Enhanced Additions |
|----------------|-------------------|
| legalNotices | Keep as-is |
| rentTerms | Add payment methods, prorated rent info |
| securityDepositRules | Add itemization, interest, walkthrough |
| lateFeePolicy | Add cure periods, escalation |
| maintenanceResponsibilities | Add emergency repairs, HVAC, appliances |
| terminationConditions | Add early termination fees, buyout options |
| **NEW** utilitiesAndServices | Who pays for what utilities |
| **NEW** petPolicy | Pet deposits, restrictions, violations |
| **NEW** noiseAndConduct | Quiet hours, nuisance behavior |
| **NEW** entryAndInspection | Landlord access rights, notice periods |
| **NEW** insuranceRequirements | Renter's insurance requirements |
| **NEW** alterationsPolicy | What modifications require approval |
| **NEW** sublettingPolicy | Rules for subletting or assignment |

---

## Implementation Details

### Step 1: Database Migration

Add `lease_number` column to `leases` table:

```sql
ALTER TABLE public.leases 
  ADD COLUMN lease_number TEXT;

-- Add index for faster lookups
CREATE INDEX idx_leases_lease_number ON public.leases(lease_number);
```

### Step 2: Update LeaseClausesData Interface

**File:** `src/components/property/LeaseGenerationStep.tsx`

```typescript
export interface LeaseClausesData {
  // Existing
  legalNotices: string[];
  rentTerms: string;
  securityDepositRules: string;
  lateFeePolicy: string;
  maintenanceResponsibilities: string;
  terminationConditions: string;
  additionalClauses: string[];
  
  // New enhanced clauses
  utilitiesAndServices: string;
  petPolicy: string;
  noiseAndConduct: string;
  entryAndInspection: string;
  insuranceRequirements: string;
  alterationsPolicy: string;
  sublettingPolicy: string;
}
```

### Step 3: Update AI Edge Function Prompt

**File:** `supabase/functions/ai-lease-generator/index.ts`

Enhance the prompt to request more detailed clauses:

```typescript
const userPrompt = `Generate comprehensive lease clauses for a residential property...

Generate the following lease clauses in JSON format. Each clause should be:
1. Jurisdiction-appropriate with specific law references
2. Detailed and comprehensive (2-3 paragraphs per section)
3. Legally sound and enforceable

{
  "legalNotices": ["array of 3-4 legal notice statements with specific law citations"],
  "rentTerms": "Comprehensive paragraph covering: payment amount, due dates, accepted payment methods, prorated rent calculations, and consequences of bounced checks",
  "securityDepositRules": "Detailed section covering: deposit amount, where held, interest requirements, itemized deductions allowed, walkthrough procedures, and return timeline per local law",
  "lateFeePolicy": "Clear statement covering: grace period, fee amount, calculation method, cure period, and escalation procedures",
  "maintenanceResponsibilities": "Thorough division covering: landlord duties (structural, plumbing, HVAC, appliances), tenant duties (routine upkeep, filters, light bulbs), emergency repair procedures, and reporting requirements",
  "terminationConditions": "Complete coverage of: lease end procedures, early termination options/fees, buyout provisions, notice requirements, and holdover terms",
  "utilitiesAndServices": "Specify: which utilities landlord provides vs tenant, meter transfer requirements, and trash/recycling responsibilities",
  "petPolicy": "Cover: whether pets allowed, breed/size restrictions, pet deposit amount, monthly pet rent, violation consequences, and service animal exceptions",
  "noiseAndConduct": "Include: quiet hours, prohibited activities, guest policies, and nuisance behavior definitions",
  "entryAndInspection": "Specify: landlord's right to enter, required notice period, emergency access rights, and inspection schedules",
  "insuranceRequirements": "Cover: renter's insurance requirements, minimum coverage amounts, and proof of insurance requirements",
  "alterationsPolicy": "Explain: what modifications require written approval, reversibility requirements, and landlord's right to approve/deny",
  "sublettingPolicy": "Cover: whether subletting/assignment allowed, approval process, and fees if applicable",
  "additionalClauses": ["array of any other jurisdiction-specific required clauses such as mold disclosure, lead paint, etc."]
}
```

### Step 4: Update LeaseGenerationStep UI

Add accordion sections for the new clause types:

- Utilities & Services (with Zap icon)
- Pet Policy (with PawPrint icon)
- Noise & Conduct (with Volume icon)
- Entry & Inspection (with Key icon)
- Insurance Requirements (with Shield icon)
- Alterations Policy (with Hammer icon)
- Subletting Policy (with Users icon)

### Step 5: Update Fallback Clauses

Update the fallback clause generation to include sensible defaults for all new fields.

---

## Files to Modify

| File | Changes |
|------|---------|
| Database Migration | Add `lease_number` column |
| `src/components/property/LeaseGenerationStep.tsx` | Expand interface, add new accordion sections, update fallback |
| `supabase/functions/ai-lease-generator/index.ts` | Enhance prompt for more detailed clauses |
| `src/components/property/LeaseWizard.tsx` | No change needed (lease_number insert will work after migration) |

---

## Expected Results

After implementation:
1. **Create Lease button works** - No more database error
2. **Lease number tracking** - Each lease gets a unique identifier like "LS-2026-0042"
3. **Comprehensive lease documents** - AI generates detailed clauses covering:
   - All legal requirements
   - Utility responsibilities
   - Pet policies
   - Conduct rules
   - Entry rights
   - Insurance requirements
   - Modification policies
   - Subletting rules
4. **Editable clauses** - All sections remain fully editable before saving
5. **Jurisdiction-specific content** - Clauses reference actual local laws (e.g., Ghana Rent Control Act, California Civil Code)
