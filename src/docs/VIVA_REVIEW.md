# Viva / Reviewer Notes — EstateLens

## One-minute explanation

EstateLens is a real-estate price and filter search system. A buyer or renter selects locality, budget, property size, property type, bedrooms and amenities. Java represents each property as an object, stores prices in a balanced AVL index and intersects independent preference sets. For sale properties, Java exports the listing dataset to Python, Python estimates a fair price using area, locality and amenities, and Java writes the prediction back and flags the listing. The portal then adds favorites, comparison, maps, personalized ranking, a buy/rent enquiry workflow, trend visualization and EMI calculation.

## The four JNTUK R23 subject connections

### DMGT
Locality, price, size and amenity constraints are represented by ID sets. The final search result is their intersection.

### ADSA
Prices are indexed with AVL trees. Sale and rental trees are separate because their units differ.

### OOPJ
The abstract `Listing` class stores shared state and behaviour. `ResidentialListing` and `CommercialListing` inherit it and implement the polymorphic `listingClass()` method.

### Python
Python reads CSV, builds one-hot locality features, includes area and amenity count, fits a ridge-style linear regression and writes predicted prices.

## Reviewable portal features

- Login / Sign In buttons.
- Property details page.
- Favorites.
- Compare up to three listings.
- Map at locality level.
- Buy and Rent workflow.
- Site-visit / seller-contact demo enquiry.
- Transparent recommendation score.
- Profile-based personalized ranking.
- Trend chart marked as illustrative academic data.
- EMI calculator with an explicit illustrative disclaimer.
