import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.*;
import java.security.spec.KeySpec;
import java.time.*;
import java.util.*;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;

public class MarketplaceStore {
    public static final String BUYER = "BUYER";
    public static final String SELLER = "SELLER";
    private static final int PBKDF2_ITERATIONS = 120_000;
    private static final int SALT_BYTES = 16;
    private static final int HASH_BYTES = 32;
    private final Path file;
    private State state;
    private final Map<String, User> sessionUsers = new HashMap<>();

    public MarketplaceStore(Path root) {
        String configured = System.getenv().getOrDefault("ESTATE_DATA_DIR", root.resolve("data").toString());
        Path dataDir = Paths.get(configured).toAbsolutePath().normalize();
        this.file = dataDir.resolve("marketplace.db");
        load();
    }

    public synchronized void initialize(ListingRepository repo) {
        boolean changed = false;
        if (state.users.isEmpty()) {
            createSeedUser("buyer-review", "EstateLens Reviewer", "review.buyer@estatelens.local", "9999999999", "review123", BUYER);
            createSeedUser("seller-ravi", "Ravi Estates", "seller@estatelens.local", "9000000001", "seller123", SELLER);
            createSeedUser("seller-priya", "Priya Properties", "seller2@estatelens.local", "9000000002", "seller456", SELLER);
            createSeedUser("seller-showcase", "EstateLens Showcase Seller", "showcase.seller@estatelens.local", "9000000010", "showcase123", SELLER);
            changed = true;
        } else {
            changed |= ensureSeedUser("buyer-review", "EstateLens Reviewer", "review.buyer@estatelens.local", "9999999999", "review123", BUYER);
            changed |= ensureSeedUser("seller-ravi", "Ravi Estates", "seller@estatelens.local", "9000000001", "seller123", SELLER);
            changed |= ensureSeedUser("seller-priya", "Priya Properties", "seller2@estatelens.local", "9000000002", "seller456", SELLER);
            changed |= ensureSeedUser("seller-showcase", "EstateLens Showcase Seller", "showcase.seller@estatelens.local", "9000000010", "showcase123", SELLER);
        }
        int[] sellerOne = {101,102,103,104,105,106,201,202,203};
        int[] sellerTwo = {107,108,109,110,111,112,113,114,115,116,117,118,119,120,204,205,206};
        String s1 = state.usersByEmail().get("seller@estatelens.local").id;
        String s2 = state.usersByEmail().get("seller2@estatelens.local").id;
        String sd = state.usersByEmail().get("showcase.seller@estatelens.local").id;
        // Keep the normal seller accounts available for real seller sign-in, but make the
        // preloaded academic properties route to the dedicated demo seller. This guarantees
        // the reviewer demo flow works no matter which preloaded property the buyer selects.
        for (int id : sellerOne) if (!Objects.equals(state.ownerByListing.get(id), sd)) { state.ownerByListing.put(id, sd); changed = true; }
        for (int id : sellerTwo) if (!Objects.equals(state.ownerByListing.get(id), sd)) { state.ownerByListing.put(id, sd); changed = true; }
        // Migrate any previously-created review inquiries for those preloaded listings
        // so an existing database still demonstrates the dedicated demo seller flow.
        Set<Integer> demoListingIds = new HashSet<>();
        for (int id : sellerOne) demoListingIds.add(id);
        for (int id : sellerTwo) demoListingIds.add(id);
        for (Inquiry q : state.inquiries) {
            if (demoListingIds.contains(q.listingId) && !Objects.equals(q.sellerId, sd)) {
                q.sellerId = sd;
                changed = true;
            }
        }

        // Seed a dedicated demo seller with buyer-visible properties for review.
        if (!state.properties.values().stream().anyMatch(p -> sd.equals(p.sellerId))) {
            seedDemoProperty(repo, sd, "Showcase Seller · MVP Residency", "MVP Colony", "Apartment", "BUY", 7800000, 1280, 2, List.of("Parking","Security","Gym"), "Preloaded showcase seller listing for the buyer-to-seller showcase review flow.");
            seedDemoProperty(repo, sd, "Showcase Seller · Rushikonda View", "Rushikonda", "Apartment", "BUY", 12400000, 1920, 3, List.of("Parking","Pool","Security"), "Preloaded showcase seller listing near the Rushikonda locality reference.");
            seedDemoProperty(repo, sd, "Showcase Seller · Madhurawada Tech Home", "Madhurawada", "Apartment", "BUY", 6500000, 1120, 2, List.of("Parking","Security"), "Preloaded showcase listing for buyer search, comparison and enquiry.");
            seedDemoProperty(repo, sd, "Showcase Seller · Yendada Garden Home", "Yendada", "Villa", "BUY", 9800000, 1540, 3, List.of("Parking","Garden","Security"), "Preloaded showcase villa for the seller-to-buyer workflow demonstration.");
            seedDemoProperty(repo, sd, "Showcase Seller · Dwaraka Central Flat", "Dwaraka Nagar", "Apartment", "BUY", 7200000, 1250, 2, List.of("Parking","Gym","Security"), "Preloaded showcase listing for buyer enquiry and messaging.");
            seedDemoProperty(repo, sd, "Showcase Seller · PM Palem Rental", "PM Palem", "Apartment", "RENT", 26000, 1200, 2, List.of("Parking","Security"), "Preloaded monthly rental showcase listing for the showcase review flow.");
            changed = true;
        }

        // Restore seller-created properties into the live Java repository.
        for (PropertyRecord p : state.properties.values()) {
            if (repo.get(p.id) == null) {
                Listing listing = toListing(p);
                repo.add(listing);
            }
        }
        if (changed) persist();
    }

    private void seedDemoProperty(ListingRepository repo, String sellerId, String title, String locality, String propertyType, String mode, int price, int area, int bedrooms, List<String> amenities, String description) {
        int id = nextPropertyId(repo);
        String period = "RENT".equalsIgnoreCase(mode) ? "MONTHLY" : "ONE_TIME";
        Listing l = "Commercial".equalsIgnoreCase(propertyType)
                ? new CommercialListing(id,title,locality,propertyType,price,area,bedrooms,amenities,"RENT".equalsIgnoreCase(mode)?"RENT":"BUY",period)
                : new ResidentialListing(id,title,locality,propertyType,price,area,bedrooms,amenities,"RENT".equalsIgnoreCase(mode)?"RENT":"BUY",period);
        repo.add(l);
        PropertyRecord p = fromListing(l, sellerId, description);
        p.address = locality + ", Visakhapatnam";
        double[] meta = switch (locality) {
            case "MVP Colony" -> new double[]{17.7428,83.3206};
            case "Rushikonda" -> new double[]{17.7864,83.3847};
            case "Madhurawada" -> new double[]{17.8136,83.3542};
            case "Yendada" -> new double[]{17.7757,83.3576};
            case "Dwaraka Nagar" -> new double[]{17.7197,83.3099};
            case "PM Palem" -> new double[]{17.8337,83.3639};
            default -> new double[]{17.6868,83.2185};
        };
        p.lat=meta[0]; p.lng=meta[1];
        state.properties.put(id,p);
        state.ownerByListing.put(id,sellerId);
    }

    public synchronized String loginDemoSeller() {
        User u = userByEmail("showcase.seller@estatelens.local");
        if(u==null) throw new IllegalStateException("Showcase seller account is not initialized.");
        String token=randomToken(); sessionUsers.put(token,u); return token;
    }

    private void createSeedUser(String id, String name, String email, String phone, String password, String role) {
        User u = new User(id, name, email, phone, role);
        setPassword(u, password);
        state.users.add(u);
    }
    private boolean ensureSeedUser(String id, String name, String email, String phone, String password, String role) {
        for (User u : state.users) {
            if (id.equals(u.id)) {
                boolean changed = false;
                if (!Objects.equals(u.name, name)) { u.name = name; changed = true; }
                if (!Objects.equals(u.email, email)) { u.email = email; changed = true; }
                if (!Objects.equals(u.phone, phone)) { u.phone = phone; changed = true; }
                if (!Objects.equals(u.role, role)) { u.role = role; changed = true; }
                return changed;
            }
        }
        createSeedUser(id,name,email,phone,password,role); return true;
    }

    public synchronized String login(String email, String password) {
        User user = userByEmail(email);
        if (user == null || !verifyPassword(user, password)) return null;
        String token = randomToken();
        sessionUsers.put(token, user);
        return token;
    }

    public synchronized User session(String token) { return token == null ? null : sessionUsers.get(token); }
    public synchronized void logout(String token) { if (token != null) sessionUsers.remove(token); }

    public synchronized User registerBuyer(String name, String email, String phone, String password,
                                            String mode, String locality, int minBudget, int maxBudget) throws Exception {
        if (userByEmail(email) != null) throw new IllegalArgumentException("An account with that email already exists.");
        User u = new User("buyer-" + UUID.randomUUID(), name, email, phone, BUYER);
        u.preferredMode = mode == null ? "BUY" : mode.toUpperCase(Locale.ROOT);
        u.locality = locality == null ? "All" : locality;
        u.minBudget = minBudget; u.maxBudget = maxBudget;
        setPassword(u, password);
        state.users.add(u); persist();
        return u;
    }

    public synchronized User registerSeller(String name, String email, String phone, String password, String locality) throws Exception {
        if (userByEmail(email) != null) throw new IllegalArgumentException("An account with that email already exists.");
        User u = new User("seller-" + UUID.randomUUID(), name, email, phone, SELLER);
        u.locality = locality == null || locality.isBlank() ? "All" : locality;
        setPassword(u, password);
        state.users.add(u);
        persist();
        return u;
    }

    public synchronized User userByEmail(String email) {
        if (email == null) return null;
        for (User u : state.users) if (u.email.equalsIgnoreCase(email.trim())) return u;
        return null;
    }

    public synchronized String sellerNameForListing(int listingId) {
        String sellerId = state.ownerByListing.get(listingId);
        User u = userById(sellerId);
        return u == null ? "Marketplace seller" : u.name;
    }
    public synchronized User sellerForListing(int listingId) { return userById(state.ownerByListing.get(listingId)); }
    public synchronized String ownerId(int listingId) { return state.ownerByListing.get(listingId); }

    public synchronized List<PropertyRecord> sellerProperties(String sellerId, ListingRepository repo) {
        List<PropertyRecord> out = new ArrayList<>();
        for (Listing l : repo.all()) {
            String owner = state.ownerByListing.get(l.getId());
            if (!sellerId.equals(owner)) continue;
            PropertyRecord p = state.properties.get(l.getId());
            if (p == null) {
                p = fromListing(l, owner, "Seed marketplace listing");
            } else {
                syncFromListing(p,l);
            }
            out.add(p);
        }
        out.sort(Comparator.comparingInt(x -> x.id));
        return out;
    }

    public synchronized PropertyRecord addProperty(String sellerId, ListingRepository repo, String title, String locality,
                                                    String propertyType, String mode, int price, int area, int bedrooms,
                                                    List<String> amenities, String description, String address,
                                                    double lat, double lng) {
        int id = nextPropertyId(repo);
        String cleanMode = "RENT".equalsIgnoreCase(mode) ? "RENT" : "BUY";
        String pricePeriod = cleanMode.equals("RENT") ? "MONTHLY" : "ONE_TIME";
        Listing l = propertyType.equalsIgnoreCase("Commercial")
                ? new CommercialListing(id,title,locality,propertyType,price,area,bedrooms,amenities,cleanMode,pricePeriod)
                : new ResidentialListing(id,title,locality,propertyType,price,area,bedrooms,amenities,cleanMode,pricePeriod);
        repo.add(l);
        PropertyRecord p = fromListing(l, sellerId, description);
        p.address = address == null ? "" : address;
        p.lat = lat; p.lng = lng;
        p.description = description == null ? "Seller-published listing" : description;
        state.properties.put(id,p);
        state.ownerByListing.put(id,sellerId);
        persist();
        return p;
    }

    public synchronized PropertyRecord updateProperty(String sellerId, int id, ListingRepository repo, String title, String locality,
                                                       String propertyType, int price, int area, int bedrooms, List<String> amenities,
                                                       String description, String address, double lat, double lng) {
        if (!sellerId.equals(state.ownerByListing.get(id))) throw new SecurityException("You do not own this listing.");
        Listing l = repo.get(id);
        if (l == null) throw new IllegalArgumentException("Property not found.");
        l.setTitle(title); l.setLocality(locality); l.setPropertyType(propertyType); l.setPrice(price); l.setAreaSqFt(area); l.setBedrooms(bedrooms); l.setAmenities(amenities);
        repo.rebuildIndexes();
        PropertyRecord p = state.properties.get(id);
        if (p == null) p = fromListing(l,sellerId,description);
        syncFromListing(p,l); p.description=description; p.address=address; p.lat=lat; p.lng=lng;
        state.properties.put(id,p); persist();
        return p;
    }

    public synchronized Inquiry createInquiry(String buyerId, int listingId, String phone, String email, String message, String kind, String date) {
        User seller = sellerForListing(listingId);
        if (seller == null) throw new IllegalArgumentException("This listing is not connected to a seller account.");
        User buyer = userById(buyerId);
        if (buyer == null) throw new SecurityException("Buyer session expired.");
        Inquiry q = new Inquiry("EL-" + LocalDate.now().toString().replace("-", "") + "-" + (++state.inquirySeq), listingId,
                buyerId, seller.id, buyer.name, phone, email, message, kind, date, "NEW", Instant.now().toString());
        state.inquiries.add(q); persist(); return q;
    }

    public synchronized List<Inquiry> sellerInquiries(String sellerId) {
        List<Inquiry> out = new ArrayList<>(); for(Inquiry q:state.inquiries) if(q.sellerId.equals(sellerId)) out.add(q);
        out.sort(Comparator.comparing((Inquiry q)->q.createdAt).reversed()); return out;
    }
    public synchronized List<Inquiry> buyerInquiries(String buyerId) {
        List<Inquiry> out = new ArrayList<>(); for(Inquiry q:state.inquiries) if(q.buyerId.equals(buyerId)) out.add(q);
        out.sort(Comparator.comparing((Inquiry q)->q.createdAt).reversed()); return out;
    }
    public synchronized int unreadSellerInquiries(String sellerId) { int n=0; for(Inquiry q:state.inquiries) if(q.sellerId.equals(sellerId)&&q.status.equals("NEW")) n++; return n; }
    public synchronized Inquiry inquiry(String id) { for(Inquiry q:state.inquiries) if(q.id.equals(id)) return q; return null; }
    public synchronized void markInquiryRead(String actorId, String inquiryId) { Inquiry q=inquiry(inquiryId); if(q==null) return; if(q.sellerId.equals(actorId)&&q.status.equals("NEW")) {q.status="READ";persist();} }

    public synchronized Message sendMessage(String senderId, String inquiryId, String text) {
        Inquiry q = inquiry(inquiryId); if(q==null) throw new IllegalArgumentException("Inquiry not found.");
        if(!q.buyerId.equals(senderId)&&!q.sellerId.equals(senderId)) throw new SecurityException("Not a participant in this conversation.");
        String receiver=q.buyerId.equals(senderId)?q.sellerId:q.buyerId;
        Message m=new Message("MSG-"+(++state.messageSeq),inquiryId,senderId,receiver,text,Instant.now().toString());
        state.messages.add(m); q.status="CONTACTED"; persist(); return m;
    }
    public synchronized List<Message> messages(String actorId, String inquiryId) {
        Inquiry q=inquiry(inquiryId); if(q==null) throw new IllegalArgumentException("Inquiry not found.");
        if(!q.buyerId.equals(actorId)&&!q.sellerId.equals(actorId)) throw new SecurityException("Not a participant.");
        List<Message> out=new ArrayList<>(); for(Message m:state.messages) if(m.inquiryId.equals(inquiryId)) out.add(m);
        out.sort(Comparator.comparing(m->m.createdAt)); return out;
    }

    public synchronized void clearMessages(String actorId, String inquiryId) {
        Inquiry q=inquiry(inquiryId);
        if(q==null) throw new IllegalArgumentException("Inquiry not found.");
        if(!q.buyerId.equals(actorId)&&!q.sellerId.equals(actorId)) throw new SecurityException("Not a participant.");
        state.messages.removeIf(m -> m.inquiryId.equals(inquiryId));
        persist();
    }

    public synchronized void persist() { try { Files.createDirectories(file.getParent()); try(ObjectOutputStream out=new ObjectOutputStream(Files.newOutputStream(file))) { out.writeObject(state); } } catch(IOException e){ throw new RuntimeException("Could not save marketplace data",e); } }
    @SuppressWarnings("unchecked") private void load() {
        try { if(Files.exists(file)) { try(ObjectInputStream in=new ObjectInputStream(Files.newInputStream(file))) { state=(State)in.readObject(); } return; } }
        catch(Exception e){ System.err.println("Marketplace store reset: "+e.getMessage()); }
        state=new State();
    }

    private User userById(String id){ if(id==null) return null; for(User u:state.users) if(u.id.equals(id)) return u; return null; }
    private String randomToken(){ byte[] b=new byte[32]; new SecureRandom().nextBytes(b); return Base64.getUrlEncoder().withoutPadding().encodeToString(b); }
    private void setPassword(User u,String password){
        try{ byte[] salt=new byte[SALT_BYTES]; new SecureRandom().nextBytes(salt); u.salt=hex(salt); u.iterations=PBKDF2_ITERATIONS; u.passwordHash=hex(hash(password.toCharArray(),salt,PBKDF2_ITERATIONS)); }
        catch(Exception e){throw new RuntimeException(e);}
    }
    private boolean verifyPassword(User u,String password){
        try{ return MessageDigest.isEqual(hash(password.toCharArray(),fromHex(u.salt),u.iterations),fromHex(u.passwordHash)); }catch(Exception e){return false;}
    }
    private byte[] hash(char[] password,byte[] salt,int iterations) throws Exception { KeySpec spec=new PBEKeySpec(password,salt,iterations,HASH_BYTES*8); SecretKeyFactory f=SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256"); return f.generateSecret(spec).getEncoded(); }
    private static String hex(byte[] b){StringBuilder s=new StringBuilder();for(byte x:b)s.append(String.format("%02x",x));return s.toString();}
    private static byte[] fromHex(String s){byte[] b=new byte[s.length()/2];for(int i=0;i<b.length;i++)b[i]=(byte)Integer.parseInt(s.substring(i*2,i*2+2),16);return b;}
    private int nextPropertyId(ListingRepository repo){int max=900;for(Listing l:repo.all())max=Math.max(max,l.getId());return max+1;}

    private Listing toListing(PropertyRecord p){
        String mode=p.listingMode; String period=mode.equals("RENT")?"MONTHLY":"ONE_TIME";
        return "Commercial".equalsIgnoreCase(p.propertyType)
                ? new CommercialListing(p.id,p.title,p.locality,p.propertyType,p.price,p.areaSqFt,p.bedrooms,p.amenities,mode,period)
                : new ResidentialListing(p.id,p.title,p.locality,p.propertyType,p.price,p.areaSqFt,p.bedrooms,p.amenities,mode,period);
    }
    private PropertyRecord fromListing(Listing l,String sellerId,String desc){PropertyRecord p=new PropertyRecord();p.id=l.getId();p.sellerId=sellerId;syncFromListing(p,l);p.description=desc;return p;}
    private void syncFromListing(PropertyRecord p,Listing l){p.id=l.getId();p.title=l.getTitle();p.locality=l.getLocality();p.propertyType=l.getPropertyType();p.price=l.getPrice();p.areaSqFt=l.getAreaSqFt();p.bedrooms=l.getBedrooms();p.amenities=new ArrayList<>(l.getAmenities());p.listingMode=l.getListingMode();p.pricePeriod=l.getPricePeriod();}

    public static class User implements Serializable { public String id,name,email,phone,role,passwordHash,salt; public int iterations; public String preferredMode="BUY",locality="All"; public int minBudget=0,maxBudget=0;
        User(){} User(String id,String name,String email,String phone,String role){this.id=id;this.name=name;this.email=email;this.phone=phone;this.role=role;}
    }
    public static class PropertyRecord implements Serializable { public int id; public String sellerId,title,locality,propertyType,listingMode="BUY",pricePeriod="ONE_TIME",description="",address=""; public int price,areaSqFt,bedrooms; public List<String> amenities=new ArrayList<>(); public double lat,lng; }
    public static class Inquiry implements Serializable { public String id;public int listingId;public String buyerId,sellerId,buyerName,phone,email,message,kind,date,status,createdAt; Inquiry(String id,int listingId,String buyerId,String sellerId,String buyerName,String phone,String email,String message,String kind,String date,String status,String createdAt){this.id=id;this.listingId=listingId;this.buyerId=buyerId;this.sellerId=sellerId;this.buyerName=buyerName;this.phone=phone;this.email=email;this.message=message;this.kind=kind;this.date=date;this.status=status;this.createdAt=createdAt;} }
    public static class Message implements Serializable { public String id,inquiryId,senderId,receiverId,text,createdAt; Message(String id,String inquiryId,String senderId,String receiverId,String text,String createdAt){this.id=id;this.inquiryId=inquiryId;this.senderId=senderId;this.receiverId=receiverId;this.text=text;this.createdAt=createdAt;} }
    public static class State implements Serializable { public List<User> users=new ArrayList<>(); public Map<Integer,String> ownerByListing=new HashMap<>(); public Map<Integer,PropertyRecord> properties=new HashMap<>(); public List<Inquiry> inquiries=new ArrayList<>(); public List<Message> messages=new ArrayList<>(); public long inquirySeq=1000,messageSeq=5000; Map<String,User> usersByEmail(){Map<String,User> m=new HashMap<>();for(User u:users)m.put(u.email.toLowerCase(Locale.ROOT),u);return m;} }
}
