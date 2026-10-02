# EstateLens Final QA Check

## Buyer-to-demo-seller review flow

1. Open `http://localhost:8080`.
2. Choose **Buyer → Login** (or create a buyer account).
3. Open **Property Search** and select a preloaded property such as **Sea Breeze 2BHK (MVP Colony)**.
4. Click **Buy / Contact Seller** and submit an inquiry.
5. Choose **Seller → Demo Seller Account** in a second browser/session.
6. Open **Buyer Inquiries**. The inquiry appears as **NEW** because all preloaded academic listing IDs (101–120 and 201–206) are routed to the dedicated review demo seller.
7. Open the inquiry, view buyer name/phone/email/message, and send a reply.
8. Return to the buyer session and open **Inbox** to verify the seller reply.

## Verified checks for this build

- Java compilation: passed.
- Python estimator startup: passed.
- Buyer login: passed.
- Buyer account registration + subsequent login persistence: passed.
- Seller login: passed.
- Demo Seller shortcut login: passed.
- Demo seller preloaded listings: passed (32 buyer-visible listings: IDs 101–120, 201–206 and demo listings 901–906).
- Preloaded listing ownership routing: passed; property 102 reports seller `EstateLens Demo Seller`.
- Inquiry creation for property 102: passed.
- Seller unread inquiry notification/count: passed.
- Seller reply through messaging API: passed.
- Buyer inbox receives seller reply: passed.
- JavaScript syntax check: passed.
- Static UI button/event audit: passed for direct static controls; form submit buttons are handled by their form handlers; dynamic controls are bound when generated.

## Important review note

The preloaded academic properties are demo/review listings. They are not presented as live-market listings. The live-market mode remains separately labelled and depends on the configured live provider.
