import java.io.*;
import java.nio.file.*;
import java.util.*;

public class ListingRepository {
    private final Map<Integer, Listing> byId = new LinkedHashMap<>();
    private final AVLPriceIndex buyPriceIndex = new AVLPriceIndex();
    private final AVLPriceIndex rentPriceIndex = new AVLPriceIndex();

    public void add(Listing listing) {
        byId.put(listing.getId(), listing);
        priceIndex(listing.getListingMode()).insert(listing.getPrice(), listing.getId());
    }

    public Listing get(int id) { return byId.get(id); }
    public void rebuildIndexes() { buyPriceIndex.clear(); rentPriceIndex.clear(); for (Listing l : byId.values()) priceIndex(l.getListingMode()).insert(l.getPrice(), l.getId()); }
    public Collection<Listing> all() { return byId.values(); }
    public Collection<Listing> all(String mode) {
        String normalized = mode == null ? "BUY" : mode.toUpperCase(Locale.ROOT);
        List<Listing> out = new ArrayList<>();
        for (Listing l : all()) if (l.getListingMode().equals(normalized)) out.add(l);
        return out;
    }

    public AVLPriceIndex getPriceIndex() { return buyPriceIndex; }
    public AVLPriceIndex getPriceIndex(String mode) { return priceIndex(mode); }
    private AVLPriceIndex priceIndex(String mode) { return "RENT".equalsIgnoreCase(mode) ? rentPriceIndex : buyPriceIndex; }

    public Set<Integer> localitySet(String locality, String mode) {
        Set<Integer> ids = new HashSet<>();
        if (locality == null || locality.isBlank() || locality.equalsIgnoreCase("All")) {
            for (Listing l : all()) if (l.getListingMode().equalsIgnoreCase(mode)) ids.add(l.getId());
            return ids;
        }
        for (Listing l : all()) {
            if (l.getListingMode().equalsIgnoreCase(mode) && l.getLocality().equalsIgnoreCase(locality)) ids.add(l.getId());
        }
        return ids;
    }

    public Set<Integer> sizeSet(int minSize, int maxSize, String mode) {
        Set<Integer> ids = new HashSet<>();
        for (Listing l : all()) if (l.getListingMode().equalsIgnoreCase(mode) && l.getAreaSqFt() >= minSize && l.getAreaSqFt() <= maxSize) ids.add(l.getId());
        return ids;
    }

    public Set<Integer> amenitySet(String amenity, String mode) {
        Set<Integer> ids = new HashSet<>();
        if (amenity == null || amenity.isBlank() || amenity.equalsIgnoreCase("All")) {
            for (Listing l : all()) if (l.getListingMode().equalsIgnoreCase(mode)) ids.add(l.getId());
            return ids;
        }
        for (Listing l : all()) if (l.getListingMode().equalsIgnoreCase(mode)) {
            for (String a : l.getAmenities()) if (a.equalsIgnoreCase(amenity)) { ids.add(l.getId()); break; }
        }
        return ids;
    }

    /** DMGT set-operation core: locality AND price AND size (and optional amenity). */
    public List<Listing> search(String locality, int minPrice, int maxPrice, int minSize, int maxSize,
                                String amenity, String mode, String propertyType) {
        String normalizedMode = mode == null ? "BUY" : mode.toUpperCase(Locale.ROOT);
        Set<Integer> result = localitySet(locality, normalizedMode);
        result.retainAll(priceIndex(normalizedMode).idsBetween(minPrice, maxPrice));
        result.retainAll(sizeSet(minSize, maxSize, normalizedMode));
        if (amenity != null && !amenity.isBlank() && !amenity.equalsIgnoreCase("All")) {
            result.retainAll(amenitySet(amenity, normalizedMode));
        }
        List<Listing> list = new ArrayList<>();
        for (int id : result) {
            Listing l = byId.get(id);
            if (l != null && (propertyType == null || propertyType.isBlank() || propertyType.equalsIgnoreCase("All") || l.getPropertyType().equalsIgnoreCase(propertyType))) {
                list.add(l);
            }
        }
        list.sort(Comparator.comparingInt(Listing::getPrice));
        return list;
    }

    public void exportCsv(Path path) throws IOException {
        Files.createDirectories(path.getParent());
        try (BufferedWriter w = Files.newBufferedWriter(path)) {
            w.write("id,title,locality,property_type,price,area_sqft,bedrooms,amenities,listing_class,listing_mode,price_period\n");
            for (Listing l : all()) {
                w.write(csv(l.getId()) + "," + csv(l.getTitle()) + "," + csv(l.getLocality()) + "," +
                        csv(l.getPropertyType()) + "," + l.getPrice() + "," + l.getAreaSqFt() + "," + l.getBedrooms() + "," +
                        csv(String.join("|", l.getAmenities())) + "," + csv(l.listingClass()) + "," + csv(l.getListingMode()) + "," + csv(l.getPricePeriod()) + "\n");
            }
        }
    }

    private String csv(Object value) {
        String s = String.valueOf(value).replace("\"", "\"\"");
        return "\"" + s + "\"";
    }
}
