import java.util.List;

public class CommercialListing extends Listing {
    public CommercialListing(int id, String title, String locality, String propertyType, int price,
                             int areaSqFt, int bedrooms, List<String> amenities) {
        super(id, title, locality, propertyType, price, areaSqFt, bedrooms, amenities);
    }

    public CommercialListing(int id, String title, String locality, String propertyType, int price,
                             int areaSqFt, int bedrooms, List<String> amenities,
                             String listingMode, String pricePeriod) {
        super(id, title, locality, propertyType, price, areaSqFt, bedrooms, amenities, listingMode, pricePeriod);
    }

    @Override
    public String listingClass() { return "CommercialListing"; }
}
