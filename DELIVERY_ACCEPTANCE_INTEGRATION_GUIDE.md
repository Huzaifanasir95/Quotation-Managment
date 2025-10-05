# Delivery Acceptance & Rejection Management Integration Guide

## Overview
This guide covers the implementation of comprehensive Delivery Acceptance Tracking (Step 14) and Rejection & Return Management (Step 15) systems for the RFQ-to-Invoice workflow.

## Files Created

### 1. DeliveryAcceptanceModal.tsx
**Location**: `/qms-frontend/app/components/sales/DeliveryAcceptanceModal.tsx`

**Key Features**:
- **Item-Level Acceptance**: Individual quantity acceptance/rejection per item
- **Digital Signature Capture**: Canvas-based signature collection
- **Acceptance Certificate Generation**: Automated certificate creation
- **Multi-Tab Interface**: Acceptance, Signature, and Certificate tabs
- **Real-Time Status Calculation**: Automatic overall status determination

**Core Components**:a
- **Acceptance Tab**: Item quantity management, acceptance notes, accepted-by information
- **Signature Tab**: Digital signature canvas with clear functionality
- **Certificate Tab**: Optional certificate generation with company branding

### 2. RejectionHandlingModal.tsx
**Location**: `/qms-frontend/app/components/sales/RejectionHandlingModal.tsx`

**Key Features**:
- **Return Status Management**: Track return approvals, returns, replacements
- **Vendor Communication**: Multi-channel vendor contact (email, phone, WhatsApp)
- **Inventory Impact Tracking**: Non-returnable items inventory management
- **Cost Impact Analysis**: Financial impact calculation for rejected items

**Core Components**:
- **Items Tab**: Rejection status management and action tracking
- **Vendor Tab**: Communication history and vendor contact tools
- **Inventory Tab**: Non-returnable items storage and cost impact

### 3. API Extensions
**Location**: `/qms-frontend/app/lib/api.ts`

**New Methods Added**:
```typescript
// Delivery Acceptance methods
async getDeliveryAcceptance(deliveryId: string)
async updateDeliveryAcceptance(acceptanceId: string, data: any)

// Rejection Handling methods
async getRejectionHandling(rejectionId: string)
async updateRejectionHandling(rejectionId: string, data: any)
async contactVendorForRejection(rejectionId: string, communication: any)
async generateAcceptanceCertificate(acceptanceId: string)
```

## Integration Steps

### Step 1: Import Components
Add imports to your delivery management pages:

```typescript
import DeliveryAcceptanceModal from '../components/sales/DeliveryAcceptanceModal';
import RejectionHandlingModal from '../components/sales/RejectionHandlingModal';
```

### Step 2: Add State Management
Add state variables for modal management:

```typescript
const [showAcceptanceModal, setShowAcceptanceModal] = useState(false);
const [showRejectionModal, setShowRejectionModal] = useState(false);
const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null);
const [selectedRejectionId, setSelectedRejectionId] = useState<string | null>(null);
```

### Step 3: Add Action Buttons
Add buttons to your delivery challan list/details:

```typescript
// In delivery challan row or details
<button
  onClick={() => {
    setSelectedDeliveryId(delivery.id);
    setShowAcceptanceModal(true);
  }}
  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
>
  Manage Acceptance
</button>

<button
  onClick={() => {
    setSelectedRejectionId(rejection.id);
    setShowRejectionModal(true);
  }}
  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
>
  Handle Rejections
</button>
```

### Step 4: Render Modals
Add modal components to your JSX:

```typescript
{/* Delivery Acceptance Modal */}
<DeliveryAcceptanceModal
  isOpen={showAcceptanceModal}
  onClose={() => {
    setShowAcceptanceModal(false);
    setSelectedDeliveryId(null);
  }}
  deliveryId={selectedDeliveryId}
  onAcceptanceUpdated={() => {
    // Refresh your delivery data
    fetchDeliveries();
  }}
/>

{/* Rejection Handling Modal */}
<RejectionHandlingModal
  isOpen={showRejectionModal}
  onClose={() => {
    setShowRejectionModal(false);
    setSelectedRejectionId(null);
  }}
  rejectionId={selectedRejectionId}
  onRejectionUpdated={() => {
    // Refresh your rejection data
    fetchRejections();
  }}
/>
```

## Database Schema Requirements

### Delivery Acceptance Table
```sql
CREATE TABLE delivery_acceptance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_challan_id UUID NOT NULL REFERENCES delivery_challans(id),
  acceptance_status VARCHAR CHECK (acceptance_status IN ('pending', 'accepted', 'partially_accepted', 'rejected')),
  acceptance_date TIMESTAMP,
  customer_signature TEXT,
  acceptance_notes TEXT,
  rejection_notes TEXT,
  accepted_by_name VARCHAR,
  accepted_by_designation VARCHAR,
  accepted_by_contact VARCHAR,
  acceptance_certificate_url VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Delivery Acceptance Items Table
```sql
CREATE TABLE delivery_acceptance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_acceptance_id UUID NOT NULL REFERENCES delivery_acceptance(id),
  item_description TEXT NOT NULL,
  delivered_quantity NUMERIC NOT NULL,
  accepted_quantity NUMERIC DEFAULT 0,
  rejected_quantity NUMERIC DEFAULT 0,
  rejection_reason TEXT,
  acceptance_status VARCHAR DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Rejection Handling Table
```sql
CREATE TABLE rejection_handling (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_acceptance_id UUID NOT NULL REFERENCES delivery_acceptance(id),
  rejection_date TIMESTAMP NOT NULL,
  total_rejected_items INTEGER DEFAULT 0,
  overall_status VARCHAR DEFAULT 'pending',
  vendor_contacted_date TIMESTAMP,
  vendor_response_date TIMESTAMP,
  resolution_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Rejected Items Table
```sql
CREATE TABLE rejected_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rejection_handling_id UUID NOT NULL REFERENCES rejection_handling(id),
  item_description TEXT NOT NULL,
  rejected_quantity NUMERIC NOT NULL,
  rejection_reason TEXT NOT NULL,
  return_status VARCHAR DEFAULT 'pending',
  vendor_response TEXT,
  return_date DATE,
  replacement_date DATE,
  inventory_location VARCHAR,
  cost_impact NUMERIC DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Backend API Endpoints Required

### Delivery Acceptance Endpoints
```javascript
// GET /api/v1/delivery-acceptance/:id
// PUT /api/v1/delivery-acceptance/:id
// POST /api/v1/delivery-acceptance/:id/certificate
```

### Rejection Handling Endpoints
```javascript
// GET /api/v1/rejection-handling/:id
// PUT /api/v1/rejection-handling/:id
// POST /api/v1/rejection-handling/:id/contact-vendor
```

## User Workflow

### Delivery Acceptance Process
1. **Delivery Received** → Open delivery challan details
2. **Click "Manage Acceptance"** → Opens DeliveryAcceptanceModal
3. **Review Items** → Set accepted/rejected quantities per item
4. **Add Notes** → Document acceptance/rejection reasons
5. **Capture Signature** → Digital signature on signature tab
6. **Generate Certificate** → Optional acceptance certificate
7. **Save Acceptance** → Updates delivery status and creates records

### Rejection Handling Process
1. **Items Rejected** → System creates rejection handling record
2. **Click "Handle Rejections"** → Opens RejectionHandlingModal
3. **Set Return Status** → Mark items as returnable/non-returnable
4. **Contact Vendor** → Send communication about rejections
5. **Track Inventory** → Manage non-returnable items in inventory
6. **Monitor Resolution** → Track vendor responses and actions
7. **Update Status** → Mark rejections as resolved

## Status Flow

### Acceptance Status Flow
```
pending → accepted/rejected/partially_accepted
```

### Return Status Flow
```
pending → approved → returned/replaced
pending → non_returnable → inventory_stored
```

## Integration with Existing Systems

### Sales Orders
- Links delivery acceptance to sales order fulfillment
- Updates order status based on acceptance results
- Triggers invoice generation for accepted items

### Purchase Orders
- Links rejections to original purchase orders
- Initiates vendor return processes
- Updates PO status based on rejection resolution

### Inventory Management
- Adds non-returnable rejected items to inventory
- Tracks storage locations and cost impacts
- Integrates with stock adjustment workflows

## Error Handling

### Common Scenarios
1. **Network Failures**: Graceful degradation with retry mechanisms
2. **Validation Errors**: Clear user feedback for invalid data
3. **Signature Issues**: Canvas reset and re-capture functionality
4. **Certificate Generation**: Fallback to manual certificate creation

### Best Practices
- Always validate quantity constraints (accepted + rejected ≤ delivered)
- Require signature for acceptance confirmation
- Maintain audit trail for all status changes
- Implement proper error boundaries in React components

## Testing Checklist

### Delivery Acceptance Testing
- [ ] Item quantity validation (cannot exceed delivered quantity)
- [ ] Signature capture and clear functionality
- [ ] Certificate generation and download
- [ ] Status calculation accuracy
- [ ] Notes and acceptance information saving

### Rejection Handling Testing
- [ ] Return status transitions
- [ ] Vendor communication functionality
- [ ] Inventory location tracking
- [ ] Cost impact calculations
- [ ] Resolution workflow completion

## Performance Considerations

### Optimization Tips
1. **Lazy Loading**: Load modals only when needed
2. **Data Caching**: Cache delivery and rejection data
3. **Signature Optimization**: Compress signature data before storage
4. **Certificate Generation**: Async generation with progress indicators

### Monitoring
- Track modal load times
- Monitor API response times
- Log signature capture success rates
- Monitor certificate generation completion rates

## Security Considerations

### Data Protection
- Encrypt signature data at rest
- Secure certificate storage and access
- Audit all acceptance and rejection actions
- Implement proper access controls

### Validation
- Server-side validation for all acceptance data
- Signature integrity verification
- Certificate authenticity measures
- Input sanitization for all text fields

## Deployment Notes

### Prerequisites
- Database schema updates deployed
- Backend API endpoints implemented
- File storage configured for certificates and signatures
- Email/communication services configured for vendor contact

### Configuration
- Set certificate template paths
- Configure signature storage settings
- Set up vendor communication channels
- Define inventory location codes

This implementation completes the RFQ-to-Invoice workflow by providing comprehensive delivery acceptance tracking and rejection management capabilities, ensuring full traceability and proper handling of all delivery scenarios.
