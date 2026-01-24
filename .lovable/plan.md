

# AI Enhancement Implementation Plan

This plan implements 5 new AI-powered features across all verticals: **Demand Forecasting**, **Dynamic Pricing**, **Customer Insights**, **Predictive Maintenance**, and **Pharmacy Adherence Prediction**.

---

## Overview

Each feature follows the established pattern from `ai-insights` and `drug-interactions`:
- Backend Edge Function using Lovable AI Gateway (no external API keys needed)
- Frontend component for user interaction
- Integration into relevant dashboards

---

## Phase 1: New Edge Functions

### 1.1 AI Demand Forecast (`ai-demand-forecast`)

Predicts customer demand for Restaurant and Hotel verticals.

**Location:** `supabase/functions/ai-demand-forecast/index.ts`

**Functionality:**
- Analyzes historical reservation/order patterns
- Factors in day-of-week, seasonality, special events
- Returns staffing recommendations and prep quantities
- Supports both `restaurant` and `hotel` modes

**Data Sources:**
- `reservations` table (check_in dates, guest counts)
- `orders` table (timestamps, amounts)
- Historical patterns from last 30-90 days

**Response Format:**
```text
{
  "demandLevel": "high" | "medium" | "low",
  "predictedCovers": number,
  "peakHours": ["12:00", "19:00"],
  "staffingRecommendation": "Schedule 2 additional servers",
  "prepRecommendations": ["Increase prep for popular items"],
  "confidence": "high" | "medium" | "low"
}
```

---

### 1.2 AI Dynamic Pricing (`ai-dynamic-pricing`)

Optimizes room rates for Hotel and unit pricing for Property.

**Location:** `supabase/functions/ai-dynamic-pricing/index.ts`

**Functionality:**
- Analyzes current occupancy and booking velocity
- Considers competitor pricing signals (simulated)
- Adjusts recommendations based on lead time
- Provides rate suggestions per room type

**Data Sources:**
- `hotel_rooms` table (current rates, occupancy)
- `reservations` table (booking patterns)
- `property_units` table (for property mode)

**Response Format:**
```text
{
  "recommendations": [
    {
      "roomType": "Standard",
      "currentRate": 120,
      "suggestedRate": 145,
      "changePercent": 21,
      "reason": "High demand detected"
    }
  ],
  "overallStrategy": "Increase rates by 15-20%",
  "demandOutlook": "Strong bookings expected",
  "confidence": "high"
}
```

---

### 1.3 AI Customer Insights (`ai-customer-insights`)

Generates customer behavior analysis for Retail and Restaurant.

**Location:** `supabase/functions/ai-customer-insights/index.ts`

**Functionality:**
- Segments customers by purchase behavior
- Identifies high-value and at-risk customers
- Suggests personalized offers
- Predicts churn likelihood

**Data Sources:**
- `customers` table
- `orders` table (purchase history)
- `reservations` table (visit frequency)

**Response Format:**
```text
{
  "segments": [
    { "name": "VIP", "count": 45, "avgSpend": 250 },
    { "name": "Regular", "count": 180, "avgSpend": 75 }
  ],
  "atRiskCustomers": 12,
  "reactivationSuggestions": ["Send 10% discount to dormant customers"],
  "topPerformers": [{ "name": "John Doe", "totalSpend": 2500 }],
  "insights": "Customer retention is strong at 78%"
}
```

---

### 1.4 AI Predictive Maintenance (`ai-maintenance-predictor`)

Predicts equipment failures for Hotel and Property.

**Location:** `supabase/functions/ai-maintenance-predictor/index.ts`

**Functionality:**
- Analyzes maintenance request patterns
- Identifies units/rooms with recurring issues
- Predicts upcoming failures
- Prioritizes preventive maintenance

**Data Sources:**
- `maintenance_requests` table (history, categories)
- `hotel_rooms` / `property_units` (equipment age)

**Response Format:**
```text
{
  "predictions": [
    {
      "location": "Room 205 HVAC",
      "riskLevel": "high",
      "predictedFailure": "Within 2 weeks",
      "preventiveAction": "Schedule HVAC inspection"
    }
  ],
  "costSavingPotential": "$2,400 avoided repairs",
  "maintenanceSchedule": ["HVAC checks due", "Plumbing inspection"],
  "insights": "HVAC issues spike in summer months"
}
```

---

### 1.5 AI Pharmacy Adherence (`ai-pharmacy-adherence`)

Predicts patient medication adherence and refill likelihood.

**Location:** `supabase/functions/ai-pharmacy-adherence/index.ts`

**Functionality:**
- Analyzes prescription fill patterns
- Identifies patients with adherence gaps
- Predicts refill dates
- Suggests intervention timing

**Data Sources:**
- `prescriptions` table (fill dates, quantities)
- `patient_profiles` table
- `prescription_items` table

**Response Format:**
```text
{
  "adherenceRate": 72,
  "patientsAtRisk": [
    {
      "patientName": "Jane Smith",
      "medication": "Metformin",
      "daysOverdue": 5,
      "riskLevel": "high"
    }
  ],
  "upcomingRefills": 23,
  "interventionRecommendations": ["Call patients 3 days before refill"],
  "insights": "Adherence improves with reminder calls"
}
```

---

## Phase 2: Frontend Components

### 2.1 Generic AI Panel Component Enhancement

**File:** `src/components/ai/AIInsightsPanel.tsx`

Extend the existing component to support new insight types:
- `demand_forecast`
- `dynamic_pricing`
- `customer_insights`
- `maintenance_prediction`
- `adherence_prediction`

Add visual renderers for each response type.

---

### 2.2 Specialized AI Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `DemandForecastPanel` | `src/components/ai/DemandForecastPanel.tsx` | Shows predicted covers, staffing needs |
| `DynamicPricingPanel` | `src/components/ai/DynamicPricingPanel.tsx` | Rate recommendations with apply button |
| `CustomerInsightsPanel` | `src/components/ai/CustomerInsightsPanel.tsx` | Segment visualization, at-risk alerts |
| `MaintenancePredictorPanel` | `src/components/ai/MaintenancePredictorPanel.tsx` | Risk timeline, preventive actions |
| `AdherencePanel` | `src/components/ai/AdherencePanel.tsx` | Patient adherence dashboard |

---

## Phase 3: Dashboard Integration

### 3.1 Restaurant Dashboard

Add to `src/pages/dashboards/RestaurantDashboard.tsx`:
- **DemandForecastPanel** - Predicted covers and staffing
- **CustomerInsightsPanel** - Diner behavior patterns

### 3.2 Hotel Dashboard

Add to `src/pages/dashboards/HotelDashboard.tsx`:
- **DemandForecastPanel** - Occupancy predictions
- **DynamicPricingPanel** - Rate optimization
- **MaintenancePredictorPanel** - Equipment health

### 3.3 Pharmacy Dashboard

Add to `src/pages/dashboards/PharmacyDashboard.tsx`:
- **AdherencePanel** - Patient compliance tracking
- Link from existing Drug Interaction alerts

### 3.4 Retail Dashboard

Add to `src/pages/dashboards/RetailDashboard.tsx`:
- **CustomerInsightsPanel** - Shopper segmentation
- **AIInsightsPanel** (sales_forecast) - Already supported

### 3.5 Property Dashboard

Add to `src/pages/dashboards/PropertyDashboard.tsx`:
- **DynamicPricingPanel** - Rent optimization
- **MaintenancePredictorPanel** - Building maintenance

---

## Phase 4: Configuration Updates

### 4.1 Edge Function Config

Update `supabase/config.toml`:

```text
[functions.ai-demand-forecast]
verify_jwt = true

[functions.ai-dynamic-pricing]
verify_jwt = true

[functions.ai-customer-insights]
verify_jwt = true

[functions.ai-maintenance-predictor]
verify_jwt = true

[functions.ai-pharmacy-adherence]
verify_jwt = true
```

---

## Technical Details

### Edge Function Pattern

All functions follow this structure:

1. **CORS handling** - Standard headers for browser access
2. **Authentication** - JWT verification via config
3. **Data fetching** - Query relevant tables using service role
4. **AI prompt** - Structured prompt with JSON response format
5. **Lovable AI Gateway** - Uses `google/gemini-2.5-flash` model
6. **Response parsing** - Extract JSON from AI response
7. **Error handling** - Graceful fallbacks

### Model Selection

Using `google/gemini-2.5-flash` for:
- Fast response times (user-facing)
- Cost efficiency
- Good reasoning for structured analysis
- Reliable JSON output

### Security Considerations

- All functions require JWT authentication
- Service role used only for data access
- No PHI/PII included in AI prompts (only aggregated stats)
- Audit logging for pharmacy-related insights

---

## Implementation Order

1. **Edge Functions** (Day 1)
   - Create all 5 new edge functions
   - Update config.toml
   - Test with curl

2. **Frontend Components** (Day 2)
   - Build AI panel components
   - Create visualizations for each type

3. **Dashboard Integration** (Day 3)
   - Add panels to each vertical dashboard
   - Ensure responsive layout

4. **Testing & Polish** (Day 4)
   - End-to-end testing
   - Loading states and error handling
   - Performance optimization

---

## Files to Create

| File | Type |
|------|------|
| `supabase/functions/ai-demand-forecast/index.ts` | Edge Function |
| `supabase/functions/ai-dynamic-pricing/index.ts` | Edge Function |
| `supabase/functions/ai-customer-insights/index.ts` | Edge Function |
| `supabase/functions/ai-maintenance-predictor/index.ts` | Edge Function |
| `supabase/functions/ai-pharmacy-adherence/index.ts` | Edge Function |
| `src/components/ai/DemandForecastPanel.tsx` | React Component |
| `src/components/ai/DynamicPricingPanel.tsx` | React Component |
| `src/components/ai/CustomerInsightsPanel.tsx` | React Component |
| `src/components/ai/MaintenancePredictorPanel.tsx` | React Component |
| `src/components/ai/AdherencePanel.tsx` | React Component |

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/config.toml` | Add 5 new function configs |
| `src/pages/dashboards/RestaurantDashboard.tsx` | Add AI panels |
| `src/pages/dashboards/HotelDashboard.tsx` | Add AI panels |
| `src/pages/dashboards/PharmacyDashboard.tsx` | Add adherence panel |
| `src/pages/dashboards/RetailDashboard.tsx` | Add customer insights |
| `src/pages/dashboards/PropertyDashboard.tsx` | Add pricing & maintenance |

