# EstateLens — Next-Level Real-World Features

The original JNTUK R23 problem statement remains the academic core:

- DMGT: buyer-preference set intersection
- ADSA: AVL price index
- OOPJ/OOPS: Java listing classes, inheritance and polymorphism
- Python: fair-price regression

This version adds a real-world marketplace layer without changing that core.

## Buyer ↔ Seller lifecycle

1. A seller can create a normal seller account or use the preloaded Demo Seller Account for review.
2. A seller posts a BUY or RENT listing with price, locality, size, amenities, description and map coordinates.
3. The listing is saved by the Java backend and immediately added to the buyer search repository.
4. Buyers can discover that listing through the same search, compare and recommendation pipeline.
5. A buyer can send a site-visit or purchase enquiry to the listing owner.
6. The seller receives the enquiry in the Seller Inbox and can reply.
7. Site visits can be accepted or declined.
8. Buyers can submit purchase offers for BUY listings.
9. Sellers can accept, reject or counter an offer.

## Trust and decision support

- Listing information-completeness score
- Seller/listing verification status
- Duplicate-listing flag using seller + locality + property type + price/area signals
- Locality score
- Price-vs-model estimate alert
- Price history for seller-created listings
- Explainable recommendation reasons
- Locality-to-locality distance helper

These are decision aids, not legal verification or guaranteed market valuations.

## Live seller accounts vs Demo Seller Account

Normal seller accounts and the Demo Seller Account use the same publishing, search visibility, enquiry, visit and offer workflows. The Demo Seller is preloaded only so a reviewer can demonstrate the full buyer-to-seller flow without needing external sellers.

## Real deployment behavior

A seller-created property is persisted in the marketplace data store, added to the Java repository and therefore becomes visible to subsequent buyer searches. This is the intended production-style connection between seller inventory and buyer discovery in the academic build.
