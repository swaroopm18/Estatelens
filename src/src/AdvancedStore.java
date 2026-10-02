import java.io.*;
import java.nio.file.*;
import java.time.*;
import java.util.*;

/** Additional marketplace intelligence kept separate from the existing marketplace database
 * so existing user accounts remain compatible while new features persist independently. */
public class AdvancedStore {
    private final Path file;
    private State state;

    private static final Map<String, double[]> LOCALITY_COORDS = Map.ofEntries(
        Map.entry("MVP Colony", new double[]{17.7428,83.3206}),
        Map.entry("Rushikonda", new double[]{17.7864,83.3847}),
        Map.entry("Madhurawada", new double[]{17.8136,83.3542}),
        Map.entry("Yendada", new double[]{17.7757,83.3576}),
        Map.entry("Dwaraka Nagar", new double[]{17.7197,83.3099}),
        Map.entry("PM Palem", new double[]{17.8337,83.3639}),
        Map.entry("Seethammadhara", new double[]{17.7354,83.2950}),
        Map.entry("Akkayyapalem", new double[]{17.7385,83.2885}),
        Map.entry("Kancharapalem", new double[]{17.7388,83.2550}),
        Map.entry("Gajuwaka", new double[]{17.6904,83.2185}),
        Map.entry("Pendurthi", new double[]{17.8103,83.2041}),
        Map.entry("Sujatha Nagar", new double[]{17.7445,83.2500})
    );

    public AdvancedStore(Path root) {
        String configured = System.getenv().getOrDefault("ESTATE_DATA_DIR", root.resolve("data").toString());
        Path dataDir = Paths.get(configured).toAbsolutePath().normalize();
        this.file = dataDir.resolve("advanced.db");
        load();
    }

    public synchronized void initialize(ListingRepository repo, MarketplaceStore store) {
        boolean changed = false;
        for (Listing l : repo.all()) {
            Meta m = state.meta.computeIfAbsent(l.getId(), id -> new Meta(id));
            if (m.priceHistory.isEmpty()) {
                m.priceHistory.add(new PricePoint(Instant.now().minus(Duration.ofDays(90)).toString(), l.getPrice()));
                changed = true;
            }
            MarketplaceStore.User seller = store.sellerForListing(l.getId());
            if (seller != null && "seller-showcase".equals(seller.id)) {
                if (!"SHOWCASE VERIFIED".equals(m.verificationStatus)) { m.verificationStatus = "SHOWCASE VERIFIED"; changed = true; }
            }
            boolean dup = detectDuplicate(l, store.ownerId(l.getId()), repo, store);
            if (m.duplicateFlag != dup) { m.duplicateFlag = dup; changed = true; }
        }
        if (changed) persist();
    }

    public synchronized Meta meta(int listingId) { return state.meta.get(listingId); }

    public synchronized Analysis analysis(Listing l, MarketplaceStore store, ListingRepository repo) {
        Meta m = state.meta.computeIfAbsent(l.getId(), id -> new Meta(id));
        if (m.priceHistory.isEmpty()) m.priceHistory.add(new PricePoint(Instant.now().toString(), l.getPrice()));
        MarketplaceStore.User seller = store.sellerForListing(l.getId());
        String verification = m.verificationStatus;
        if (verification == null || verification.isBlank()) verification = seller != null && seller.id.equals("seller-showcase") ? "SHOWCASE VERIFIED" : "PENDING REVIEW";
        int completeness = completenessScore(l, seller, store, repo);
        int localityScore = localityScore(l.getLocality());
        boolean duplicate = detectDuplicate(l, seller == null ? null : seller.id, repo, store);
        m.duplicateFlag = duplicate;
        int trustScore = Math.max(0, Math.min(100, completeness + ("SHOWCASE VERIFIED".equals(verification) ? 7 : -10) + (duplicate ? -20 : 3)));
        double deltaPct = 0;
        String priceAlert = "Rental / model not applied";
        if ("BUY".equalsIgnoreCase(l.getListingMode()) && l.getEstimatedPrice() > 0) {
            deltaPct = ((l.getPrice() - l.getEstimatedPrice()) / l.getEstimatedPrice()) * 100.0;
            if (deltaPct >= 15) priceAlert = "Potentially overpriced";
            else if (deltaPct <= -10) priceAlert = "Potential value";
            else priceAlert = "Within estimate band";
        }
        return new Analysis(
            l.getId(), verification, completeness, trustScore, duplicate,
            localityScore, priceAlert, deltaPct, new ArrayList<>(m.priceHistory),
            seller == null ? "Marketplace seller" : seller.name,
            seller == null ? false : seller.id.equals("seller-showcase")
        );
    }

    public synchronized void recordPriceIfChanged(int listingId, int price) {
        Meta m = state.meta.computeIfAbsent(listingId, Meta::new);
        int last = m.priceHistory.isEmpty() ? Integer.MIN_VALUE : m.priceHistory.get(m.priceHistory.size()-1).price;
        if (last != price) {
            m.priceHistory.add(new PricePoint(Instant.now().toString(), price));
            if (m.priceHistory.size() > 12) m.priceHistory.remove(0);
            persist();
        }
    }

    public synchronized SiteVisit ensureVisitForInquiry(String buyerId, String sellerId, int listingId, String date, String message) {
        for (SiteVisit v : state.visits) {
            if (v.buyerId.equals(buyerId) && v.sellerId.equals(sellerId) && v.listingId == listingId && Objects.equals(v.date, date == null ? "" : date)) return v;
        }
        return createVisit(buyerId, sellerId, listingId, date, message);
    }

    public synchronized SiteVisit createVisit(String buyerId, String sellerId, int listingId, String date, String message) {
        SiteVisit v = new SiteVisit("VIS-" + (++state.visitSeq), buyerId, sellerId, listingId, date == null ? "" : date, "REQUESTED", message == null ? "" : message, Instant.now().toString());
        state.visits.add(v); persist(); return v;
    }
    public synchronized List<SiteVisit> visitsFor(String userId, String role) {
        List<SiteVisit> out = new ArrayList<>();
        for (SiteVisit v: state.visits) if ("SELLER".equals(role) ? v.sellerId.equals(userId) : v.buyerId.equals(userId)) out.add(v);
        out.sort(Comparator.comparing((SiteVisit v)->v.createdAt).reversed()); return out;
    }
    public synchronized SiteVisit updateVisit(String actorId, String visitId, String status) {
        for (SiteVisit v: state.visits) if (v.id.equals(visitId)) {
            if (!v.sellerId.equals(actorId) && !v.buyerId.equals(actorId)) throw new SecurityException("Not a participant in this site visit.");
            v.status = status == null ? v.status : status.toUpperCase(Locale.ROOT); persist(); return v;
        }
        throw new IllegalArgumentException("Site visit not found.");
    }

    public synchronized Offer createOffer(String buyerId, String sellerId, int listingId, int amount, String message) {
        if (amount <= 0) throw new IllegalArgumentException("Offer amount must be greater than zero.");
        Offer o = new Offer("OFF-" + (++state.offerSeq), buyerId, sellerId, listingId, amount, amount, "PENDING", message == null ? "" : message, Instant.now().toString());
        state.offers.add(o); persist(); return o;
    }
    public synchronized List<Offer> offersFor(String userId, String role) {
        List<Offer> out = new ArrayList<>();
        for (Offer o: state.offers) if ("SELLER".equals(role) ? o.sellerId.equals(userId) : o.buyerId.equals(userId)) out.add(o);
        out.sort(Comparator.comparing((Offer o)->o.createdAt).reversed()); return out;
    }
    public synchronized Offer respondOffer(String sellerId, String offerId, String status, int counterAmount, String message) {
        for (Offer o: state.offers) if (o.id.equals(offerId)) {
            if (!o.sellerId.equals(sellerId)) throw new SecurityException("You cannot respond to this offer.");
            o.status = status == null ? o.status : status.toUpperCase(Locale.ROOT);
            if (counterAmount > 0) o.counterAmount = counterAmount;
            if (message != null) o.message = message;
            persist(); return o;
        }
        throw new IllegalArgumentException("Offer not found.");
    }

    private int completenessScore(Listing l, MarketplaceStore.User seller, MarketplaceStore store, ListingRepository repo) {
        int score = 0;
        if (seller != null && seller.name != null && !seller.name.isBlank()) score += 20;
        if (seller != null && seller.email != null && seller.email.contains("@")) score += 10;
        if (seller != null && seller.phone != null && seller.phone.length() >= 10) score += 10;
        if (l.getTitle() != null && l.getTitle().length() >= 8) score += 10;
        if (l.getAreaSqFt() > 0) score += 10;
        if (l.getPrice() > 0) score += 10;
        if (l.getBedrooms() >= 0) score += 5;
        if (!l.getAmenities().isEmpty()) score += 10;
        MarketplaceStore.PropertyRecord p = seller == null ? null : store.sellerProperties(seller.id, repo).stream().filter(x -> x.id == l.getId()).findFirst().orElse(null);
        if (p != null && p.description != null && p.description.length() >= 25) score += 10;
        if (p != null && (p.lat != 0 || p.lng != 0)) score += 5;
        return Math.min(100, score);
    }

    private boolean detectDuplicate(Listing candidate, String ownerId, ListingRepository repo, MarketplaceStore store) {
        for (Listing other : repo.all()) {
            if (other.getId() == candidate.getId()) continue;
            if (!other.getListingMode().equalsIgnoreCase(candidate.getListingMode())) continue;
            if (!other.getLocality().equalsIgnoreCase(candidate.getLocality())) continue;
            if (!other.getPropertyType().equalsIgnoreCase(candidate.getPropertyType())) continue;
            int areaDiff = Math.abs(other.getAreaSqFt() - candidate.getAreaSqFt());
            double priceDiff = candidate.getPrice() == 0 ? 1 : Math.abs(other.getPrice() - candidate.getPrice()) / (double)candidate.getPrice();
            boolean sameOwner = ownerId != null && ownerId.equals(store.ownerId(other.getId()));
            if (areaDiff <= Math.max(50, candidate.getAreaSqFt() / 50) && priceDiff <= 0.03 && (sameOwner || normalize(other.getTitle()).equals(normalize(candidate.getTitle())))) return true;
        }
        return false;
    }

    private String normalize(String s) { return s == null ? "" : s.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", ""); }

    public static int localityScore(String locality) {
        return switch (locality == null ? "" : locality) {
            case "MVP Colony" -> 91; case "Rushikonda" -> 88; case "Madhurawada" -> 84;
            case "Yendada" -> 86; case "Dwaraka Nagar" -> 90; case "PM Palem" -> 82;
            case "Seethammadhara" -> 87; case "Akkayyapalem" -> 83; case "Kancharapalem" -> 80;
            case "Gajuwaka" -> 78; case "Pendurthi" -> 81; case "Sujatha Nagar" -> 85; default -> 75;
        };
    }

    public static double distanceKm(String from, String to) {
        double[] a = LOCALITY_COORDS.get(from), b = LOCALITY_COORDS.get(to);
        if (a == null || b == null) return -1;
        double R=6371.0, dLat=Math.toRadians(b[0]-a[0]), dLon=Math.toRadians(b[1]-a[1]);
        double x=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(Math.toRadians(a[0]))*Math.cos(Math.toRadians(b[0]))*Math.sin(dLon/2)*Math.sin(dLon/2);
        return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
    }

    public synchronized void persist() {
        try { Files.createDirectories(file.getParent()); try(ObjectOutputStream out=new ObjectOutputStream(Files.newOutputStream(file))){out.writeObject(state);} }
        catch(IOException e){ throw new RuntimeException("Could not save advanced marketplace data", e); }
    }
    @SuppressWarnings("unchecked") private void load() {
        try { if(Files.exists(file)){try(ObjectInputStream in=new ObjectInputStream(Files.newInputStream(file))){state=(State)in.readObject();} return;} }
        catch(Exception e){System.err.println("Advanced store reset: "+e.getMessage());}
        state=new State();
    }

    public static class State implements Serializable { private static final long serialVersionUID=1L; Map<Integer,Meta> meta=new HashMap<>(); List<SiteVisit> visits=new ArrayList<>(); List<Offer> offers=new ArrayList<>(); long visitSeq=100,offerSeq=100; }
    public static class Meta implements Serializable { private static final long serialVersionUID=1L; public int listingId; public String verificationStatus="PENDING REVIEW"; public boolean duplicateFlag; public List<PricePoint> priceHistory=new ArrayList<>(); Meta(int id){listingId=id;} }
    public static class PricePoint implements Serializable { private static final long serialVersionUID=1L; public String time; public int price; PricePoint(String time,int price){this.time=time;this.price=price;} }
    public static class SiteVisit implements Serializable { private static final long serialVersionUID=1L; public String id,buyerId,sellerId,date,status,message,createdAt; public int listingId; SiteVisit(String id,String b,String s,int l,String d,String st,String m,String c){this.id=id;buyerId=b;sellerId=s;listingId=l;date=d;status=st;message=m;createdAt=c;} }
    public static class Offer implements Serializable { private static final long serialVersionUID=1L; public String id,buyerId,sellerId,status,message,createdAt; public int listingId,amount,counterAmount; Offer(String id,String b,String s,int l,int a,int c,String st,String m,String t){this.id=id;buyerId=b;sellerId=s;listingId=l;amount=a;counterAmount=c;status=st;message=m;createdAt=t;} }
    public static class Analysis { public int listingId, completenessScore, trustScore, localityScore; public String verificationStatus,priceAlert,sellerName; public boolean duplicateFlag,demoSeller; public double priceDeltaPct; public List<PricePoint> priceHistory; Analysis(int id,String vs,int cs,int ts,boolean dup,int ls,String pa,double dp,List<PricePoint> ph,String sn,boolean ds){listingId=id;verificationStatus=vs;completenessScore=cs;trustScore=ts;duplicateFlag=dup;localityScore=ls;priceAlert=pa;priceDeltaPct=dp;priceHistory=ph;sellerName=sn;demoSeller=ds;} }
}
