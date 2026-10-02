# EstateLens — Real-Estate Price & Filter Search

EstateLens is a Java + Python academic real-estate portal built around the supplied problem statement and the JNTUK R23 subject mapping.

## Exact core processing

Java applies set-operation filters for **locality AND price AND size** over an **AVL price index**. Java exports listing data to CSV. Python regresses a fair purchase price from **area/locality/amenities** and writes predictions back. Java flags sale listings as **Above estimate**, **Below estimate** or **Near estimate**.

## Extended portal features

1. Explicit **Buyer Login**, **Buyer Sign In**, and separate **Seller Login** role entry points on the home page.
2. Property detail page with listing facts, amenities and locality map.
3. Favorites persisted in localStorage.
4. Compare up to three properties side-by-side.
5. Interactive OpenStreetMap/Leaflet locality map.
6. Buy / Rent mode and workflow.
7. Site-visit booking / seller-contact demo enquiry endpoint.
8. Transparent recommendation score.
9. Personalized ranking from the saved profile.
10. Locality price-trend chart (clearly labelled as an academic demo index, not live market data).
11. Mortgage / EMI calculator.

## Data note

The 20 original sale listings from the initial academic build are preserved. Six additional rental entries were added for the rent workflow and are explicitly labelled as monthly demonstration listings. The locality names are real Visakhapatnam-area locality names. The portal does not claim these sample property names or sample prices are live marketplace offers. Map markers are locality-level reference points rather than exact addresses.

## Run on Windows

Requirements:
- JDK 17+
- Python 3.10+

From the project folder:

```powershell
.\run.bat
```

Then open:

```text
http://localhost:8080
```

## Demo login

```text
Email: demo@estatelens.local
Password: demo123
```

Authentication is handled by the Java server. Passwords are PBKDF2-HMAC-SHA256 hashed; browser storage holds only a session token. This is a college/demo deployment, not a production identity service.

## Viva / reviewer focus

- DMGT: explicit set intersections for buyer preferences.
- ADSA: separate AVL trees for sale price and monthly rent; sale AVL metrics are exposed on the dashboard.
- OOPJ: `Listing`, `ResidentialListing`, `CommercialListing`, encapsulation, inheritance and polymorphism.
- Python: CSV handling + one-hot locality features + amenity count + regularized multiple linear regression.
- Integration: Java export → Python regression → prediction CSV → Java write-back.


## Live market data (final integration)

The portal now separates **live marketplace data** from the **JNTUK academic dataset** instead of mixing them. The Live Market switch queries the AVnester public REST API from the Java server; the browser never receives provider credentials. The current live-city selector includes the cities documented by AVnester's public site: Coimbatore, Chennai, Madurai, Tiruchirappalli, Tiruppur, Erode, Tirunelveli and Vellore. The provider exposes current listing search, property-detail lookup and locality insights; its anonymous tier requires no signup/token and is rate-limited, while the current search endpoint returns at most 20 listings per request.

### What is live
- Current provider listing fields: title, price, listing type, area, BHK, price/sqft, verification flag, RERA reference (when supplied), source URL and property details.
- Locality insights when that locality/city is covered: average price/sqft, supply, growth/trend information and other provider-reported indicators.
- Source attribution and hand-off links are shown in the UI so reviewers can verify a live listing.
- Live map markers are city/locality reference points, not exact property addresses.

### What stays academic
The original Visakhapatnam sale dataset and the six rental demonstration records remain unchanged for the JNTUK R23 demonstration. The academic mode preserves the exact DMGT set intersections, AVL indexing, OOPJ hierarchy and Python regression flow.

### Important coverage note
The provider's own public site currently describes its marketplace coverage as Tamil-Nadu-focused and lists the live cities above. **Visakhapatnam is therefore not presented as a live marketplace city in this final build.** The project keeps Visakhapatnam in the academic dataset and provides a direct link to the official Andhra Pradesh RERA project registry for regulatory verification. This avoids presenting fabricated Visakhapatnam listings as live market offers.

### Environment variables
Optional environment overrides:
- `LIVE_MARKET_CITY` — default `Coimbatore`
- `LIVE_MARKET_BASE_URL` — default `https://api.avnester.com/public/v1`
- `LIVE_MARKET_PROVIDER` — default `AVnester`
- `PORT` — default `8080`

For a production/college deployment, use a data provider or licence arrangement that permits the intended redistribution and display of live listing data.

## Buyer–seller marketplace extension

The final build also includes a server-backed buyer/seller workflow. Buyer accounts use the existing Login and Sign In flow. A separate **Seller Login** opens a seller dashboard where sellers can view seeded seller-owned properties, publish new listings, set prices, edit listing details and monitor buyer inquiries.

When a buyer clicks **Buy / Contact Seller** (or the Rent workflow), the platform stores the inquiry with the buyer's contact number, email, interest type, preferred date and message. The seller dashboard polls every three seconds for new inquiries and shows a notification count. Sellers can open the inquiry, see the buyer details and reply. Buyers can open their **Inbox** and continue the conversation.

Demo credentials are documented in `docs/BUYER_SELLER_WORKFLOW.md`. The Java server uses PBKDF2-HMAC-SHA256 password hashing, random session tokens and a persisted `data/marketplace.db` datastore. On a first run, the datastore is created automatically with the seeded buyer/seller demo accounts and seller-owned properties.

## Final buyer and seller workflow

The current build includes the following end-to-end marketplace features:

- Buyer Login and buyer Sign In registration.
- Separate Seller Login.
- Seeded seller accounts and seller-owned property records for review.
- Seller Add Property, Edit Property and price management.
- Buyer Buy/Rent inquiry form with phone, email, interest type, preferred date and message.
- Server-side inquiry persistence and seller notification polling.
- Seller Inbox with buyer contact information and inquiry details.
- Buyer Inbox for seller replies.
- Two-way conversation thread stored against the inquiry.
- Browser geolocation option for a seller-posted listing location.

The recommended review setup uses two browser sessions: one seller session and one buyer session. See `docs/REVIEW_DEMO.md` for the exact step-by-step demonstration.

## Explicit role login demo

The home page now has a visible **Account Roles** panel with separate Buyer and Seller entry points.

- **Buyer Login** → existing buyer account login.
- **Buyer Sign In** → create a new buyer account and save preferences.
- **Seller Login** → seller-only login and seller dashboard.

For a clean reviewer run, use a freshly extracted copy of the ZIP. On first start the Java server creates `data/marketplace.db` and seeds the demo accounts automatically.

## Updated reviewer-friendly workspace navigation

The UI now uses a role-gated entry flow instead of exposing the entire project on first load.

1. The first screen is a clean EstateLens landing page showing only the project identity, a short explanation, and two large role choices: Buyer and Seller.
2. After selecting Buyer, a role-specific panel appears with Buyer Login and Buyer Sign In / Create Account. The user must choose one before entering the buyer workspace.
3. After selecting Seller, the same role-specific panel appears with Seller Login and Seller Sign In / Create Account. The user must choose one before entering the seller workspace.
4. After Buyer login, only the buyer workspace is opened. The project is split into Overview, Property Search, Favorites & Compare, Market Intelligence, Finance & Enquiry, R23 Project Lab, and Inbox. Clicking a sidebar section reveals only that section's content.
5. After Seller login, the seller workspace opens with Overview, My Listings, Post Property, Buyer Inquiries, Market Data, and Account.
6. The academic JNTUK R23 functionality, live-market separation, and buyer-seller communication workflow are preserved.

### Demo accounts

Buyer:
- `demo@estatelens.local`
- `demo123`

Seller:
- `seller@estatelens.local`
- `seller123`

Second seller:
- `seller2@estatelens.local`
- `seller456`

### Recommended practical review demo

Seller browser/session: Seller Login -> Overview -> My Listings -> Post Property -> publish/update a property -> Buyer Inquiries.

Buyer browser/session: Buyer Login -> Search -> open the seller property -> Buy/Contact Seller -> choose Site Visit or Direct Purchase Interest -> enter buyer phone/message -> Send Inquiry.

Return to the seller session: the unread inquiry count updates; open Buyer Inquiries -> select the enquiry -> read buyer details and message -> send a reply.

Return to buyer session: open Inbox -> open the same inquiry -> read the seller response and continue the conversation.


## Final role-first UI update

The application now opens to a clean light EstateLens landing page with only the project introduction and two role choices: Buyer and Seller. Selecting a role reveals Login and Sign In / Create Account actions. Login opens an email/password form; Sign In / Create Account opens a profile form with full name, contact number, email, password, and password confirmation.

After authentication, users enter a role-specific workspace. Buyer sections and Seller sections are separated into a persistent sidebar so the complete project is not shown as one long scrolling page. Buyer and Seller inquiry messaging remains integrated.

For a clean review demo, delete any old `data/marketplace.db` before first run (the server recreates seeded demo accounts and seller data). Demo accounts:
- Buyer: demo@estatelens.local / demo123
- Seller: seller@estatelens.local / seller123
- Seller 2: seller2@estatelens.local / seller456
