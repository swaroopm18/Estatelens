# EstateLens — Live Market Testing Checklist

## 1. Prerequisites
- JDK 17+
- Python 3.10+
- Internet access on the machine running the Java server

## 2. Start
Windows PowerShell:
```powershell
cd C:\Users\swaro\Downloads\RealEstate_Price_Filter_Search_JNTUK_R23
.\run.bat
```
Then open `http://localhost:8080`.

## 3. Verify the live layer
1. Keep **Live market** selected.
2. In **Live market city**, choose a documented supported city such as `Coimbatore`.
3. Click **Refresh live data**.
4. The live status pill should show the provider and a recent refresh time.
5. Run **Run property search** with `All` locality and a broad price range.
6. Each live result should show `LIVE MARKET`, a provider-source link, and any returned RERA/verified fields.
7. Open a property. The detail page should fetch the provider detail record and show source verification.
8. Change the live city and repeat.

## 4. Verify locality intelligence
1. After a live search, choose one of the returned live localities in the **Price Trends** locality selector.
2. The live snapshot should populate when the provider has locality insight coverage.
3. The chart label must say `LIVE MARKET` when provider trend data is present.
4. If the provider does not cover the locality, the UI must clearly show that the live insight is unavailable; it must not silently substitute a fake live figure.

## 5. Verify academic/JNTUK mode
1. Switch **Academic dataset**.
2. Select `MVP Colony`.
3. Use a sale price range and size range.
4. Click **Run property search**.
5. Confirm that the results show `ACADEMIC`, Python fair-price estimates and `Above estimate / Below estimate / Near estimate` flags.
6. Scroll to the ADSA and JNTUK R23 sections.

## 6. Verify the complete portal
- Login button
- Sign In button
- Favorites
- Compare (up to 3)
- Property details
- Buy/Rent workflow
- Site visit / Contact seller demo reference
- Personalized ranking
- Map
- Price trend chart
- Mortgage/EMI calculator

## 7. Demo account
Email: `demo@estatelens.local`
Password: `demo123`

## 8. Important review note
The live marketplace source has documented city coverage and request limits. The website therefore labels live data and shows source links. Visakhapatnam remains in the academic dataset and is linked to the official Andhra Pradesh RERA registry for regulatory verification rather than being presented as a live marketplace feed.
