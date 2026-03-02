

# FOOVA FOODS LLP -- Complete Website Update Plan

This is a major update covering UI improvements, company details, and extensive admin portal features. Due to the scope, the work is organized into **3 phases**, implemented sequentially.

---

## Phase 1: UI/Design Updates + Company Details

### 1A. Remove Mouse Cursor Icon, Add Smooth Motion Effects
- Remove any custom cursor styles
- Add subtle floating particle/glow animations at the top of the hero section using Framer Motion
- Ensure all hover effects work on both mouse and touch

### 1B. Dark Mode / Light Mode Toggle
- Add a light theme CSS variable set under a `.light` class in `index.css`
- Create a `ThemeProvider` using `next-themes` (already installed)
- Add a toggle button (Sun/Moon icon) in the Navbar
- Smooth CSS transitions between themes

### 1C. Update Company Details
- **Footer**: Replace placeholder address with the full address (Building 4 249/1, Menala, Ajjavara, Sulya, Dakshina Kannada, Karnataka 574239)
- **Footer**: Update phone numbers to +91 89511 82561 and +91 91871 48561
- **Footer**: Add "Design & Distribution Partner: adscroll360.com" link
- **Contact component**: Update all contact cards with the real numbers and WhatsApp link to +91 89511 82561
- Update WhatsApp integration href to `https://wa.me/918951182561`

---

## Phase 2: Database Schema Changes (Single Migration)

A single SQL migration will create the following new tables:

### 2A. Coupons Table
```text
coupons:
  id (uuid, PK)
  code (text, unique, not null)
  discount_type (text: 'percentage' | 'fixed')
  discount_value (numeric)
  min_order_amount (numeric, nullable)
  max_uses (integer, nullable)
  used_count (integer, default 0)
  expires_at (timestamptz, nullable)
  is_active (boolean, default true)
  created_at, updated_at
```

### 2B. Testimonials Table
```text
testimonials:
  id (uuid, PK)
  customer_name (text)
  customer_image_url (text, nullable)
  text (text)
  rating (integer, default 5)
  is_visible (boolean, default true)
  created_at, updated_at
```

### 2C. Products Table Updates
- Add `stock_quantity` (integer, default 0) column
- Add `images` (jsonb, default '[]') column for multiple images
- Add `tracking_number` (text, nullable) -- stored on orders, not products

### 2D. Orders Table Updates
- Add `tracking_number` (text, nullable)
- Add `tracking_link` (text, nullable)
- Add `coupon_code` (text, nullable)
- Add `discount_amount` (numeric, default 0)
- Update status options to include: pending, confirmed, packed, dispatched, out_for_delivery, delivered, cancelled

### 2E. Payment Settings Table
```text
payment_settings:
  id (uuid, PK)
  provider (text: 'razorpay')
  key_id (text, nullable)
  is_enabled (boolean, default false)
  is_test_mode (boolean, default true)
  created_at, updated_at
```
Note: The Razorpay Secret Key will be stored as a backend secret, not in the database.

### 2F. RLS Policies
- Coupons: Public read (active only), admin full access
- Testimonials: Public read (visible only), admin full access
- Payment settings: Admin-only access
- Enable realtime on orders table for live status sync

### 2G. Storage Bucket
- Create a `product-images` public storage bucket for product image uploads
- Create a `testimonial-images` public storage bucket
- RLS: Authenticated admins can upload, public can read

---

## Phase 3: Admin Portal Features + User-Facing Updates

### 3A. Coupon & Discount System (Admin Tab)
- New "Coupons" tab in Admin Dashboard
- CRUD interface for coupon codes with fields: code, discount type, value, min order amount, max uses, expiry date, active toggle
- Cart page: Add coupon code input field that validates and applies discount

### 3B. Payment Gateway Section (Admin Tab)
- New "Payments" tab in Admin Dashboard
- Form for Razorpay Key ID configuration
- Enable/Disable toggle and Test/Live mode toggle
- Secret Key will be requested via the secrets tool and stored securely
- Note: Full Razorpay checkout integration is structural -- actual payment processing requires the Razorpay SDK and a backend function

### 3C. Testimonials Management (Admin Tab)
- New "Testimonials" tab in Admin Dashboard
- CRUD for testimonials: name, text, rating, image upload, visibility toggle
- Update the public Testimonials component to fetch from the database instead of hardcoded data

### 3D. Product Stock Control
- Add `stock_quantity` field to the product form in admin
- Product listing pages show "Only X left" badge when stock is 1-10
- Show "Out of Stock" and disable "Add to Cart" when stock is 0
- Stock automatically decrements when an order is placed (via a database trigger or in the checkout logic)

### 3E. Product Image Management
- Create storage bucket for product images
- Admin product form: multi-image upload with drag-and-drop
- Set primary image selection
- Display image size recommendation (1000x1000px) in the upload UI
- Show all product images in a gallery on the product detail page

### 3F. Advanced Delivery Control (Admin Orders)
- Update the order status dropdown to include: Pending, Confirmed, Packed, Dispatched, Out for Delivery, Delivered, Cancelled
- Add visual status stepper/timeline in user dashboard order view
- Add tracking number and tracking link input fields in admin order view

### 3G. Live Order Status Sync (Realtime)
- Enable Supabase Realtime on the `orders` and `products` tables
- User dashboard subscribes to order changes for live status updates
- Product pages subscribe to stock changes

### 3H. User Dashboard Enhancements
- Show order status timeline with all delivery stages
- Display tracking number and tracking link (clickable) when available
- Show applied coupon on order details

---

## Technical Details

### Files to Create
- `src/contexts/ThemeContext.tsx` -- Theme provider (or integrate `next-themes`)
- `src/components/ThemeToggle.tsx` -- Dark/Light mode toggle button

### Files to Modify
- `src/index.css` -- Add light theme variables
- `src/App.tsx` -- Wrap with ThemeProvider
- `src/components/Navbar.tsx` -- Add theme toggle button
- `src/components/Footer.tsx` -- Update company details and address
- `src/components/Contact.tsx` -- Update contact info
- `src/components/Testimonials.tsx` -- Fetch from database
- `src/pages/AdminDashboard.tsx` -- Add Coupons, Payments, Testimonials tabs; update Products and Orders tabs
- `src/pages/Dashboard.tsx` -- Add order timeline, tracking info
- `src/pages/Cart.tsx` -- Add coupon code input
- `src/pages/Products.tsx` -- Show stock badges
- `src/pages/ProductDetail.tsx` -- Show stock info, image gallery
- `src/contexts/CartContext.tsx` -- Add coupon logic

### Database Migration
- One SQL migration covering all new tables, columns, RLS policies, storage buckets, and realtime setup

### Secrets Needed
- Razorpay Secret Key (will be requested when implementing the payment section)

### Important Notes
- Razorpay full integration requires a backend function to create payment orders and verify signatures. The admin UI will be built for configuration, and a backend function will be created for the payment flow.
- Image uploads will use Cloud storage buckets with proper access control.
- All admin changes (stock, order status, tracking) will reflect live on the user portal via realtime subscriptions.

