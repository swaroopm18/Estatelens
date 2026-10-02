# EstateLens — Detailed R23 Project Mapping

## Academic core named by the supplied problem statement

### DMGT — Discrete Mathematics & Graph Theory
- Buyer preferences are represented as sets.
- Locality, price, size and optional amenity/property-type constraints are intersected.
- The resulting intersection is the final search set.

### ADSA — Advanced Data Structures & Algorithm Analysis
- Property prices are indexed in a balanced AVL tree.
- Buy and rent prices are kept separate.
- Range traversal supports price-window search.
- Rotation and height maintenance demonstrate balancing.

### OOPJ / OOPS — Object-Oriented Programming Through JAVA
- Listing is the base abstraction.
- ResidentialListing and CommercialListing demonstrate inheritance.
- Listing state is encapsulated.
- Polymorphic listing behavior is used where listing type changes the presentation or workflow.

### Python Programming
- Java exports listing data to CSV.
- Python prepares area, locality and amenity features.
- A regularized multiple linear regression estimates a fair BUY price.
- Predictions are written back for Java to consume.

## Supporting implementation areas

The remaining cards in the R23 Project Lab describe supporting engineering areas used to turn the four named academic subjects into a working product. They are intentionally labeled as project implementation mappings, not as additional claims about the supplied problem statement.

- Java application/API engineering
- Data persistence and marketplace state
- Web and API integration
- Finance and decision support
- Listing/marketplace lifecycle

## Reviewer trace

Buyer preference → DMGT set intersection → ADSA AVL search → OOPJ listing objects → Java service → CSV export → Python regression → Java price insight → recommendation → buyer/seller workflow.

## Source note
The R23 CSE syllabus published by JNTU-GV lists Discrete Mathematics & Graph Theory, Advanced Data Structures & Algorithms Analysis, Object-Oriented Programming Through JAVA and Python Programming among the II Year I Semester subjects. The EstateLens mapping uses the names supplied in the project problem statement as the authoritative project scope.
