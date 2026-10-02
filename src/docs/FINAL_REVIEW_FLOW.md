# Final Reviewer Flow — EstateLens

## 1. First screen
Open `http://localhost:8080`.

The first screen intentionally shows only:
- EstateLens name
- What EstateLens does
- Buyer
- Seller

No project modules are exposed before role entry.

## 2. Buyer path
1. Click **Buyer**.
2. Click **Buyer Login** for the demo account or **Buyer Sign In / Create Account** for a new account.
3. Enter email and password.
4. After authentication, the buyer dashboard opens.
5. Use the left sidebar to switch between Overview, Property Search, Favorites & Compare, Market Intelligence, Finance & Enquiry, R23 Project Lab, and Inbox.

## 3. Seller path
1. Return to the landing page or use a second browser session.
2. Click **Seller**.
3. Click **Seller Login** or **Seller Sign In / Create Account**.
4. Enter email and password.
5. After authentication, the seller dashboard opens.
6. Use the seller sidebar to switch between Overview, My Listings, Post Property, Buyer Inquiries, Market Data, and Account.

## 4. Recommended buyer-seller demonstration
Use two browser sessions.

### Seller session
- Login: `seller@estatelens.local`
- Password: `seller123`
- Open **My Listings** to confirm seeded properties.
- Open **Buyer Inquiries** and leave it ready.

### Buyer session
- Login: `demo@estatelens.local`
- Password: `demo123`
- Open **Property Search**.
- Keep the search mode on Academic Dataset for a stable JNTUK review.
- Select **Buy** and choose a seller-owned property such as `Skyline 3BHK`.
- Open **View details**.
- Click **Buy / Contact Seller**.
- Select **Site Visit** or **Direct Purchase Interest**.
- Enter buyer phone number, email and message.
- Click **Send Inquiry**.

### Seller session again
- The seller dashboard polling checks for new enquiries every 3 seconds.
- **Buyer Inquiries** shows a new unread enquiry count.
- Open the enquiry to see buyer name, phone, email, interest type, date and message.
- Reply from the conversation panel.

### Buyer session again
- Open **Inbox**.
- Open the same enquiry thread.
- The seller reply is visible and the buyer can continue the conversation.

## 5. Academic explanation
Use **R23 Project Lab** to explain:
- DMGT: set intersection of locality, price, size and amenity constraints.
- ADSA: AVL price index and range-search target.
- OOPJ: `Listing`, `ResidentialListing`, `CommercialListing`, inheritance and polymorphism.
- Python: CSV processing and fair-price regression.

## 6. Final statement for the reviewer
“EstateLens first identifies suitable properties using buyer preferences and academic search algorithms, then adds price analysis and a marketplace workflow where a buyer can contact the seller and continue the conversation through the platform.”
