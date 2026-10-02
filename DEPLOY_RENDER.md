# EstateLens — Render Option A deployment

This deployment runs the complete EstateLens application as one Docker-based Render web service: Java HTTP server + Python estimator + marketplace data + web UI.

## Why Docker
Render supports Docker services, which is the recommended path for JVM/Java applications. The application listens on the Render `PORT` environment variable and serves the web UI and API from the same service.

## Recommended Render setup

1. Push this project to a GitHub repository.
2. In Render, choose **New -> Web Service** and connect the repository.
3. Runtime: **Docker**.
4. Dockerfile path: `./Dockerfile`.
5. The service must use the generated `PORT` environment variable. The Java application already reads `PORT`.
6. Add environment variable:
   - `ESTATE_DATA_DIR=/var/data`
7. Add a **Persistent Disk** mounted at `/var/data` so buyer/seller accounts, seller listings, inquiries and messages survive deploys/restarts.
8. Keep the service at one instance because the app uses file-backed marketplace state. Render documents that persistent disks are single-instance storage.
9. Use health check path `/api/summary`.
10. Deploy, then open the generated `https://<service-name>.onrender.com` URL.

## Important data note

Render web services have an ephemeral filesystem by default. A persistent disk is required if this application is going to keep its current file-backed `marketplace.db` across restarts and deploys. Render currently documents persistent disks as available to paid web services, and recommends managed Postgres for relational applications when practical.

## First public smoke test

1. Open the public URL.
2. Confirm the landing page shows only EstateLens + Buyer + Seller.
3. Buyer -> Sign In -> create an account.
4. Logout/reopen -> Buyer -> Login with the new account.
5. Seller -> Demo Seller Account.
6. In a second browser/incognito window, Buyer -> Property Search -> open a demo seller property -> Buy / Contact Seller -> Send Inquiry.
7. Return to the seller window -> Buyer Inquiries -> confirm the NEW inquiry appears.
8. Seller replies -> Buyer Inbox -> confirm the reply.
9. Create a seller listing -> verify it appears in buyer search.
10. Restart/redeploy after persistence is configured -> verify the accounts/listings/inquiries still exist.

## Live market note

The live market integration is external-provider based. A public deployment needs outbound internet access from the Render service. If the external provider is unavailable, the application should present its fallback/coverage state rather than calling academic data live.
