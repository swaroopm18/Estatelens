# EstateLens — Detailed Academic Subject Mapping

## 1. DMGT — Discrete Mathematics & Graph Theory
Buyer preferences are represented as sets. Locality, price-range results from the AVL index, size and optional amenity sets are intersected to produce the final matching property IDs.

## 2. ADSA — Advanced Data Structures & Algorithm Analysis
Property prices are indexed in an AVL tree. The tree is balanced through rotations and supports structured price-range retrieval. Buy and rent prices are maintained separately because their units differ.

## 3. OOPJ / OOPS — Object-Oriented Programming through Java
The project models `Listing` as a shared abstraction with `ResidentialListing` and `CommercialListing` subclasses. Encapsulation, inheritance and polymorphism are visible in the Java implementation.

## 4. Java
Java is the application/backend layer. It provides the HTTP server, API endpoints, role-based authentication, seller listing APIs, buyer inquiry APIs, persistence, Java/Python integration and the marketplace workflow.

## 5. Python Programming
Python reads Java-exported CSV listing data, prepares area/locality/amenity features, performs regression for BUY listings, writes predictions, and allows Java to compare listed price with the estimated fair price.

## 6. Listing & Marketplace Architecture
A listing is the central marketplace entity connecting seller publishing and buyer discovery. The workflow is:

Seller publishes listing → Java stores listing → buyer searches/filter/compares → buyer sends inquiry → seller receives notification → seller replies → buyer receives response.

This layer is an application extension built around the required JNTUK academic processing pipeline.
