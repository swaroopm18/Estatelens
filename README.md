# EstateLens — Final Review Build

**EstateLens: An Intelligent Real-Estate Price, Search & Recommendation System**

## First screen
When the website opens, the first screen contains only the EstateLens introduction and two large role choices:

- **Buyer**
- **Seller**

Selecting a role reveals **Login** and **Sign In / Create Account**. The rest of the project is hidden until authentication succeeds.

## Buyer account
Buyer Login uses email and password. Buyer Sign In / Create Account collects:

- Full name
- Contact number
- Email
- Password
- Re-enter password
- Preferred Buy/Rent mode
- Preferred locality
- Budget range

After login, the Buyer Workspace opens with sidebar sections rather than one long scrolling page:

1. Overview
2. Property Search
3. Favorites & Compare
4. Market Intelligence
5. Finance & Enquiry
6. R23 Project Lab
7. Inbox

## Seller account
Seller Login and Seller Sign In / Create Account use the same basic account process. After authentication, the Seller Workspace provides:

1. Overview
2. My Listings
3. Post Property
4. Buyer Inquiries
5. Market Data
6. Account

Seller users can publish/edit listings, set prices and location, and receive buyer inquiries.

## Buyer → Seller workflow
1. Seller logs in and publishes/maintains a property.
2. Buyer logs in and searches for the property.
3. Buyer opens property details and clicks **Buy / Contact Seller** (or Rent).
4. Buyer enters contact number, email, interest type, preferred date and message.
5. The inquiry is persisted by the Java server.
6. Seller receives a **NEW** inquiry notification in the Seller workspace.
7. Seller opens the inquiry, sees buyer details and replies.
8. Buyer sees the seller response in the Buyer Inbox and can continue the conversation.

## JNTUK R23 core
The marketplace layer does not replace the academic implementation:

- **DMGT:** locality/price/size/amenity set intersections.
- **ADSA:** AVL price indexing for range search.
- **OOPJ:** Java classes, encapsulation, inheritance and polymorphism.
- **Python:** CSV processing, regression and fair-price estimation.

## Demo accounts

### Buyer
`demo@estatelens.local` / `demo123`

### Seller
`seller@estatelens.local` / `seller123`

### Seller 2
`seller2@estatelens.local` / `seller456`

## Run on Windows
From the project root:

```powershell
.\\run.bat
```

Then open:

`http://localhost:8080`

Requirements: JDK 17+ and Python 3.10+.

## Fresh-data behavior
The final ZIP intentionally does **not** include a runtime `data/marketplace.db`. On first run, the Java server creates the database and seeds the demo buyer/seller accounts and seller properties. This prevents temporary test accounts from appearing in the submitted project.

## Seller enhancement for review

The latest build includes a dedicated preloaded **Demo Seller Account** in addition to normal Seller Login and Seller Sign In/Create Account.

### Demo seller shortcut
1. Open EstateLens.
2. Choose **Seller**.
3. Choose **Demo Seller Account**.
4. The seller workspace opens with buyer-visible demo listings already loaded.

Demo seller credentials: `demo.seller@estatelens.local` / `demoSeller123`.
The shortcut is preferred for the review; the credential pair is included only for verification.

### Preloaded demo listings
The Demo Seller owns six academic/demo listings across MVP Colony, Rushikonda, Madhurawada, Yendada, Dwaraka Nagar and PM Palem. They are searchable from the buyer side, and buyers can send inquiries to the Demo Seller.

### Buyer-to-seller workflow
Buyer search -> open demo listing -> Buy / Contact Seller -> submit phone/email/message -> Seller Buyer Inquiries -> seller reply -> Buyer Inbox.

### Detailed academic mapping
The seller and buyer dashboards now explain:
- DMGT mathematical set operations.
- ADSA AVL price indexing.
- OOPJ/OOPS concepts through Java classes.
- Java backend, API and authentication implementation.
- Python regression and Java/Python integration.
- Listing and marketplace architecture connecting sellers and buyers.

Demo properties are labelled as academic/demo data; they are not represented as live market listings.

## Render Option A deployment

The repository includes `Dockerfile`, `render.yaml`, `.dockerignore`, and `DEPLOY_RENDER.md` for deploying the complete Java + Python EstateLens application as a single Render web service. The Java server reads Render's `PORT` variable. For persistence of buyer/seller accounts, listings, inquiries and messages, configure `ESTATE_DATA_DIR=/var/data` and attach a Render persistent disk at `/var/data`.

## Next-level real-world extensions

This version keeps the Buyer/Seller role model and adds a real-world decision and transaction-support layer:

- Explainable recommendation reasons (why a property matched).
- Property information-completeness and listing-confidence signals.
- Demo verification vs pending-review status, without claiming legal verification.
- Duplicate-listing detection using seller/locality/type/price/area/title signals.
- Price-vs-fair-estimate alerts (potentially overpriced / potential value / within estimate band).
- Locality quality score and a locality-to-locality distance helper.
- Price-history tracking for seeded and seller-created listings.
- Site-visit requests with seller accept/decline actions.
- Purchase-offer workflow with seller accept/reject/counter-offer.
- Normal seller-created listings immediately become buyer-searchable and remain persisted across server restarts when the configured data directory is persistent.
- Demo Seller Account uses the same seller APIs and capabilities as normal seller accounts; it is preloaded only so reviewers can demonstrate the complete buyer-to-seller workflow without external sellers.

These features are implemented as a marketplace extension around the original JNTUK R23 academic core. They do not replace the DMGT, ADSA, OOPJ and Python processing requirements.
