# EstateLens Role-First UI

## First screen
The public landing page shows only:
- EstateLens name and a short explanation
- Buyer
- Seller

No search results, charts, project modules, market data, or property listings are shown until a user enters a role.

## Buyer path
Buyer -> Buyer Login OR Buyer Sign In / Create Account -> Buyer workspace.

Buyer workspace sidebar:
1. Overview
2. Property Search
3. Favorites & Compare
4. Market Intelligence
5. Finance & Enquiry
6. R23 Project Lab
7. Inbox

## Seller path
Seller -> Seller Login OR Seller Sign In / Create Account -> Seller workspace.

Seller workspace sidebar:
1. Overview
2. My Listings
3. Post Property
4. Buyer Inquiries
5. Market Data
6. Account

Seller Overview also explains EstateLens and maps DMGT, ADSA, OOPJ and Python to the implementation.

## Buyer -> Seller enquiry demo
1. Sign in as Seller in one browser using `seller@estatelens.local` / `seller123`.
2. Keep Seller Dashboard -> Buyer Inquiries available.
3. Open the site in a second browser/incognito window.
4. Sign in as Buyer using `demo@estatelens.local` / `demo123`.
5. Go to Property Search -> choose a seller-owned property -> View Details -> Buy / Contact Seller.
6. Enter contact number, email, interest type and message.
7. Send Inquiry.
8. Seller Dashboard receives a new inquiry and notification count.
9. Seller opens the inquiry, sees buyer details, and replies.
10. Buyer opens Inbox and receives the seller response.

Passwords are stored as PBKDF2-HMAC-SHA256 hashes in the local marketplace store. This is an academic/demo security design, not a production identity service.
