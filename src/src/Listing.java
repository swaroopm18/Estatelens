import java.util.*;

public abstract class Listing {
    protected final int id;
    protected String title;
    protected String locality;
    protected String propertyType;
    protected int price;
    protected int areaSqFt;
    protected int bedrooms;
    protected List<String> amenities;
    protected final String listingMode;   // BUY or RENT
    protected final String pricePeriod;   // ONE_TIME or MONTHLY
    protected double estimatedPrice;
    protected String priceFlag = "Pending";

    protected Listing(int id, String title, String locality, String propertyType, int price,
                      int areaSqFt, int bedrooms, List<String> amenities) {
        this(id, title, locality, propertyType, price, areaSqFt, bedrooms, amenities, "BUY", "ONE_TIME");
    }

    protected Listing(int id, String title, String locality, String propertyType, int price,
                      int areaSqFt, int bedrooms, List<String> amenities,
                      String listingMode, String pricePeriod) {
        this.id = id;
        this.title = title;
        this.locality = locality;
        this.propertyType = propertyType;
        this.price = price;
        this.areaSqFt = areaSqFt;
        this.bedrooms = bedrooms;
        this.amenities = new ArrayList<>(amenities);
        this.listingMode = listingMode == null ? "BUY" : listingMode.toUpperCase(Locale.ROOT);
        this.pricePeriod = pricePeriod == null ? (this.listingMode.equals("RENT") ? "MONTHLY" : "ONE_TIME") : pricePeriod.toUpperCase(Locale.ROOT);
    }

    public int getId() { return id; }
    public String getTitle() { return title; }
    public String getLocality() { return locality; }
    public String getPropertyType() { return propertyType; }
    public int getPrice() { return price; }
    public int getAreaSqFt() { return areaSqFt; }
    public int getBedrooms() { return bedrooms; }
    public List<String> getAmenities() { return Collections.unmodifiableList(amenities); }
    public String getListingMode() { return listingMode; }
    public String getPricePeriod() { return pricePeriod; }
    public double getEstimatedPrice() { return estimatedPrice; }
    public String getPriceFlag() { return priceFlag; }

    public void applyEstimate(double estimate) {
        if (!"BUY".equals(listingMode)) return;
        this.estimatedPrice = estimate;
        double tolerance = Math.max(150000, estimate * 0.035);
        if (price > estimate + tolerance) priceFlag = "Above estimate";
        else if (price < estimate - tolerance) priceFlag = "Below estimate";
        else priceFlag = "Near estimate";
    }

    public int amenityCount() { return amenities.size(); }
    public void setTitle(String v){ title=v; }
    public void setLocality(String v){ locality=v; }
    public void setPropertyType(String v){ propertyType=v; }
    public void setPrice(int v){ price=v; }
    public void setAreaSqFt(int v){ areaSqFt=v; }
    public void setBedrooms(int v){ bedrooms=v; }
    public void setAmenities(List<String> v){ amenities=new ArrayList<>(v); }

    public abstract String listingClass();
}
