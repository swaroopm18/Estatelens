# Buyer–Seller Marketplace Workflow

The marketplace layer extends the JNTUK R23 academic search application into an end-to-end buyer–seller demonstration.

## Buyer role

The buyer can log in, search Buy or Rent listings, open property details, compare/favorite listings, and submit a purchase or rental inquiry. The inquiry collects contact number, email, preferred date, interest type and a message.

## Seller role

A seller logs in to the seller dashboard, manages seller-owned listings, publishes a new property, sets or updates the price, enters locality/area/amenities and can use browser geolocation to fill map coordinates for the demo listing.

## Inquiry and notification flow

1. Buyer selects a seller-owned property.
2. Buyer clicks **Buy / Contact Seller** or the Rent workflow.
3. Buyer submits the inquiry.
4. Java stores the inquiry in the server-side marketplace datastore.
5. Seller dashboard polls the inquiry endpoint every three seconds.
6. A new inquiry count appears on the seller dashboard.
7. Seller opens the inquiry and sees buyer name, phone, email, interest type, preferred date and message.
8. Seller replies through the conversation panel.
9. Buyer opens **Inbox** and receives the seller reply.

The same conversation is persisted by inquiry ID, so the review can be demonstrated with two browser sessions or two devices on the same running server.

## Demo accounts

Buyer:
- Email: `demo@estatelens.local`
- Password: `demo123`

Seller:
- Email: `seller@estatelens.local`
- Password: `seller123`

Second seller:
- Email: `seller2@estatelens.local`
- Password: `seller456`

## Storage and security notes

- Credentials are stored on the Java server rather than in browser local storage.
- Passwords are salted and hashed with PBKDF2-HMAC-SHA256 before storage.
- The browser stores only a session token for the current login.
- Seller-owned properties, inquiries and messages are kept in the embedded `data/marketplace.db` application datastore.
- Buyer contact information is shown to the relevant seller only after the buyer submits an inquiry for that seller's property.
- This is a local academic/demo marketplace. A production deployment should use HTTPS, a managed database, secret management, access controls, backups, audit logging and a production-grade identity provider.
