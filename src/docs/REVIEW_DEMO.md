# Practical Buyer–Seller Review Demo

## Demo accounts

The home page intentionally shows three separate role actions: **Buyer Login**, **Buyer Sign In**, and **Seller Login**.


### Buyer
- Email: `demo@estatelens.local`
- Password: `demo123`

### Seller
- Email: `seller@estatelens.local`
- Password: `seller123`

A second seller is also seeded:
- Email: `seller2@estatelens.local`
- Password: `seller456`

## Two-browser demonstration

Use two browser sessions so both roles remain logged in at the same time.

### Browser A — Seller

1. Open `http://localhost:8080`.
2. Click **Seller Login**.
3. Sign in with `seller@estatelens.local` / `seller123`.
4. Open **Seller Dashboard**.
5. Open **My Listings** to show the seeded seller-owned properties.
6. Open **Add Property**, enter a title, price, locality, area and amenities, and click **Publish property**. The property becomes available in buyer search.
7. Open **Buyer Inquiries** and leave the dashboard open. The unread counter is checked every three seconds.

### Browser B — Buyer

1. Open `http://localhost:8080` in a second browser session or private window.
2. Click **Login**.
3. Sign in with `demo@estatelens.local` / `demo123`.
4. Switch to **Academic Dataset** so the seeded marketplace listings are visible.
5. Use **Buy** and the normal filters to find a property, or open a seller-owned card such as `Skyline 3BHK` in MVP Colony.
6. Click **View details**.
7. Click **Buy / Contact Seller**.
8. Enter or confirm the buyer's phone number and email.
9. Choose one of the three interest types:
   - Schedule site visit
   - Direct purchase interest
   - Contact seller
10. Enter a message and click **Submit enquiry**.
11. The buyer receives an inquiry reference and is taken to the buyer inbox.

### Back to Browser A — Seller notification

Within a few seconds, the Seller Dashboard notification count changes to show the new inquiry.

Open the inquiry. The seller can see:
- buyer name
- phone number
- email
- property
- interest type
- preferred date
- buyer message

Select the inquiry conversation and send a reply.

### Back to Browser B — Buyer messaging

Open **Inbox**.

The seller reply is visible in the same conversation thread. The buyer can send another message, and the seller can continue the conversation from the Seller Dashboard.

## Academic project verification

After the marketplace workflow, switch the site back to **Academic Dataset** and show:

1. DMGT set intersection: locality AND price AND size.
2. ADSA AVL price index.
3. OOPJ `Listing` inheritance hierarchy.
4. Python fair-price regression.
5. Above / Below / Near estimate flags.

Then switch to **Live Market** to demonstrate the external live listing feed separately from the academic dataset.
