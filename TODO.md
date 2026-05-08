# TODO: Add Admin Custom Sales View with Search/Scan

## Task Overview
Add a view for admin to be able to search to select, scan to find items to add to sales with ability to set custom sale date which will be for created_at inside sale_items table

## Steps to Complete

### Step 1: Database Migration
- [ ] Create migration to add created_at column to sale_items table
- [ ] Run migration

### Step 2: Backend Updates
- [ ] Update SaleItem model to include created_at in $fillable
- [ ] Update SaleController to accept optional created_at parameter
- [ ] Add API route for item search by name/barcode

### Step 3: Frontend - Admin Item Search Component
- [ ] Create new component for item selection (search and scan)
- [ ] Add search functionality (search by name/barcode)
- [ ] Add scanner integration
- [ ] Add item list display with selection checkboxes

### Step 4: Frontend - Add to Sales Component  
- [ ] Add selected items list with quantity inputs
- [ ] Add custom date picker
- [ ] Add create sale button

### Step 5: Update Admin Routing
- [ ] Add new route for add-to-sales view

### Step 6: Testing
- [ ] Test search functionality
- [ ] Test scanner integration
- [ ] Test custom date creation
- [ ] Test sale creation with custom date

## Dependent Files
- app/Models/SaleItem.php
- app/Http/Controllers/SaleController.php
- app/Http/Controllers/ItemController.php
- routes/api.php
- src/app/admin/admin.module.ts
- src/app/admin/admin-routing.module.ts

## Followup Steps
- Install any new dependencies if needed
- Test the full flow
