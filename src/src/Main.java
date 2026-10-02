import com.sun.net.httpserver.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

public class Main {
    static final int PORT = Integer.parseInt(System.getenv().getOrDefault("PORT", "8080"));
    static final Path ROOT = Paths.get(".").toAbsolutePath().normalize();
    static final ListingRepository REPO = DataLoader.load();
    static final EstimatorService ESTIMATOR = new EstimatorService(ROOT, REPO);
    static final MarketplaceStore STORE = new MarketplaceStore(ROOT);
    static final AdvancedStore ADVANCED = new AdvancedStore(ROOT);
    static final AtomicLong INQUIRY_SEQ = new AtomicLong(1000);

    public static void main(String[] args) throws Exception {
        System.out.println("Starting EstateLens — Real-Estate Price & Filter Search...");
        STORE.initialize(REPO);
        ADVANCED.initialize(REPO, STORE);
        try {
            ESTIMATOR.runEstimator();
            System.out.println("Python regression completed. Estimates loaded into Java.");
        } catch (Exception e) {
            System.err.println("Estimator warning: " + e.getMessage());
        }

        HttpServer server = HttpServer.create(new InetSocketAddress(PORT), 0);
        server.createContext("/api/search", Main::handleSearch);
        server.createContext("/api/all", Main::handleAll);
        server.createContext("/api/summary", Main::handleSummary);
        server.createContext("/api/property", Main::handleProperty);
        server.createContext("/api/retrain", Main::handleRetrain);
        server.createContext("/api/inquiry", Main::handleInquiry);
        server.createContext("/api/auth/login", Main::handleLogin);
        server.createContext("/api/auth/register", Main::handleRegister);
        server.createContext("/api/auth/demo-seller", Main::handleDemoSeller);
        server.createContext("/api/auth/logout", Main::handleLogout);
        server.createContext("/api/me", Main::handleMe);
        server.createContext("/api/seller/properties", Main::handleSellerProperties);
        server.createContext("/api/seller/inquiries", Main::handleSellerInquiries);
        server.createContext("/api/seller/inquiries/read", Main::handleSellerInquiryRead);
        server.createContext("/api/buyer/inquiries", Main::handleBuyerInquiries);
        server.createContext("/api/messages", Main::handleMessages);
        server.createContext("/api/advanced/analysis", Main::handleAdvancedAnalysis);
        server.createContext("/api/advanced/visits", Main::handleAdvancedVisits);
        server.createContext("/api/advanced/offers", Main::handleAdvancedOffers);
        server.createContext("/api/live/status", Main::handleLiveStatus);
        server.createContext("/api/live/search", Main::handleLiveSearch);
        server.createContext("/api/live/property", Main::handleLiveProperty);
        server.createContext("/api/live/insights", Main::handleLiveInsights);
        server.createContext("/", Main::handleStatic);
        server.setExecutor(java.util.concurrent.Executors.newCachedThreadPool());
        server.start();
        System.out.println("Dashboard: http://localhost:" + PORT);
        System.out.println("Press Ctrl+C to stop.");
    }

    static void handleSearch(HttpExchange ex) throws IOException {
        Map<String,String> q = query(ex.getRequestURI().getRawQuery());
        String mode = q.getOrDefault("mode", "BUY");
        String locality = q.getOrDefault("locality", "All");
        int defaultMin = mode.equalsIgnoreCase("RENT") ? 10000 : 3500000;
        int defaultMax = mode.equalsIgnoreCase("RENT") ? 150000 : 20000000;
        int minPrice = parseInt(q.get("minPrice"), defaultMin);
        int maxPrice = parseInt(q.get("maxPrice"), defaultMax);
        int minSize = parseInt(q.get("minSize"), 600);
        int maxSize = parseInt(q.get("maxSize"), 4000);
        String amenity = q.getOrDefault("amenity", "All");
        String propertyType = q.getOrDefault("propertyType", "All");
        List<Listing> results = REPO.search(locality, minPrice, maxPrice, minSize, maxSize, amenity, mode, propertyType);
        sendJson(ex, searchJson(results, locality, minPrice, maxPrice, minSize, maxSize, amenity, mode, propertyType));
    }

    static void handleAll(HttpExchange ex) throws IOException {
        Map<String,String> q = query(ex.getRequestURI().getRawQuery());
        String mode = q.getOrDefault("mode", "BUY");
        List<Listing> items = new ArrayList<>(REPO.all(mode));
        items.sort(Comparator.comparingInt(Listing::getPrice));
        sendJson(ex, searchJson(items, "All", 0, Integer.MAX_VALUE, 0, Integer.MAX_VALUE, "All", mode, "All"));
    }

    static void handleSummary(HttpExchange ex) throws IOException {
        Set<String> localities = new TreeSet<>();
        Set<String> amenities = new TreeSet<>();
        Set<String> propertyTypes = new TreeSet<>();
        long total = 0, above = 0, below = 0, near = 0;
        double totalGap = 0;
        int buyCount = 0, rentCount = 0;
        for (Listing l : REPO.all()) {
            localities.add(l.getLocality());
            propertyTypes.add(l.getPropertyType());
            amenities.addAll(l.getAmenities());
            if (l.getListingMode().equals("BUY")) {
                buyCount++;
                total += l.getPrice();
                if (l.getPriceFlag().equals("Above estimate")) above++;
                else if (l.getPriceFlag().equals("Below estimate")) below++;
                else if (l.getPriceFlag().equals("Near estimate")) near++;
                totalGap += Math.abs(l.getPrice() - l.getEstimatedPrice());
            } else {
                rentCount++;
            }
        }
        String json = "{" +
            "\"count\":" + REPO.all().size() + "," +
            "\"buyCount\":" + buyCount + ",\"rentCount\":" + rentCount + "," +
            "\"localities\":[" + localities.stream().map(Main::quote).reduce((a,b)->a+","+b).orElse("") + "]," +
            "\"amenities\":[" + amenities.stream().map(Main::quote).reduce((a,b)->a+","+b).orElse("") + "]," +
            "\"propertyTypes\":[" + propertyTypes.stream().map(Main::quote).reduce((a,b)->a+","+b).orElse("") + "]," +
            "\"avgPrice\":" + (buyCount==0?0:total/buyCount) + "," +
            "\"above\":" + above + ",\"below\":" + below + ",\"near\":" + near + "," +
            "\"avgAbsGap\":" + (buyCount==0?0:Math.round(totalGap/buyCount)) + "," +
            "\"avlHeight\":" + REPO.getPriceIndex("BUY").height() + "," +
            "\"avlNodes\":" + REPO.getPriceIndex("BUY").nodeCount() +
            "}";
        sendJson(ex, json);
    }

    static void handleProperty(HttpExchange ex) throws IOException {
        Map<String,String> q = query(ex.getRequestURI().getRawQuery());
        Listing l = REPO.get(parseInt(q.get("id"), -1));
        if (l == null) { sendStatus(ex, 404, "Property not found"); return; }
        String[] meta = localityMeta(l.getLocality());
        StringBuilder sb = new StringBuilder("{");
        sb.append("\"id\":").append(l.getId()).append(',')
          .append("\"title\":").append(quote(l.getTitle())).append(',')
          .append("\"locality\":").append(quote(l.getLocality())).append(',')
          .append("\"propertyType\":").append(quote(l.getPropertyType())).append(',')
          .append("\"listingClass\":").append(quote(l.listingClass())).append(',')
          .append("\"listingMode\":").append(quote(l.getListingMode())).append(',')
          .append("\"pricePeriod\":").append(quote(l.getPricePeriod())).append(',')
          .append("\"price\":").append(l.getPrice()).append(',')
          .append("\"estimatedPrice\":").append(Math.round(l.getEstimatedPrice())).append(',')
          .append("\"priceFlag\":").append(quote(l.getPriceFlag())).append(',')
          .append("\"areaSqFt\":").append(l.getAreaSqFt()).append(',')
          .append("\"bedrooms\":").append(l.getBedrooms()).append(',')
          .append("\"amenities\":[");
        for (int i=0;i<l.getAmenities().size();i++) { if (i>0) sb.append(','); sb.append(quote(l.getAmenities().get(i))); }
        sb.append("],")
          .append("\"mapLat\":").append(meta[0]).append(',')
          .append("\"mapLng\":").append(meta[1]).append(',')
          .append("\"mapLabel\":").append(quote(meta[2])).append(',')
          .append("\"locationNote\":").append(quote("Locality-level map pin for the named area; it is not an exact property address."));
        MarketplaceStore.User seller = STORE.sellerForListing(l.getId());
        sb.append(",\"sellerName\":").append(quote(seller == null ? "Marketplace seller" : seller.name));
        sb.append(",\"sellerId\":").append(quote(STORE.ownerId(l.getId())));
        sb.append(",\"sellerOwned\":").append(STORE.ownerId(l.getId()) != null);
        if (l.getId() >= 901) {
            MarketplaceStore.PropertyRecord p = STORE.sellerProperties(seller == null ? "" : seller.id, REPO).stream().filter(x -> x.id == l.getId()).findFirst().orElse(null);
            if (p != null) {
                sb.append(",\"description\":").append(quote(p.description));
                sb.append(",\"address\":").append(quote(p.address));
                if (p.lat != 0 || p.lng != 0) { sb.append(",\"mapLat\":").append(p.lat).append(",\"mapLng\":").append(p.lng); }
            }
        }
        sb.append(",\"advanced\":").append(advancedJson(l));
        sb.append("}");
        sendJson(ex, sb.toString());
    }

    static String[] localityMeta(String locality) {
        return switch (locality) {
            case "MVP Colony" -> new String[]{"17.7428","83.3206","MVP Colony, Visakhapatnam"};
            case "Rushikonda" -> new String[]{"17.7864","83.3847","Rushikonda, Visakhapatnam"};
            case "Dwaraka Nagar" -> new String[]{"17.7197","83.3099","Dwaraka Nagar, Visakhapatnam"};
            case "Madhurawada" -> new String[]{"17.8136","83.3542","Madhurawada, Visakhapatnam"};
            case "Yendada" -> new String[]{"17.7757","83.3576","Yendada, Visakhapatnam"};
            case "PM Palem" -> new String[]{"17.8337","83.3639","PM Palem, Visakhapatnam"};
            case "Seethammadhara" -> new String[]{"17.7354","83.2950","Seethammadhara, Visakhapatnam"};
            case "Akkayyapalem" -> new String[]{"17.7385","83.2885","Akkayyapalem, Visakhapatnam"};
            case "Kancharapalem" -> new String[]{"17.7388","83.2550","Kancharapalem, Visakhapatnam"};
            case "Gajuwaka" -> new String[]{"17.6904","83.2185","Gajuwaka, Visakhapatnam"};
            case "Pendurthi" -> new String[]{"17.8103","83.2041","Pendurthi, Visakhapatnam"};
            case "Sujatha Nagar" -> new String[]{"17.7445","83.2500","Sujatha Nagar, Visakhapatnam"};
            default -> new String[]{"17.7231","83.3013","Visakhapatnam"};
        };
    }

    static void handleRetrain(HttpExchange ex) throws IOException {
        STORE.initialize(REPO);
        ADVANCED.initialize(REPO, STORE);
        try {
            ESTIMATOR.runEstimator();
            sendJson(ex, "{\"ok\":true,\"message\":\"Python regression re-ran and Java flags were refreshed.\"}");
        } catch (Exception e) {
            sendJson(ex, "{\"ok\":false,\"message\":" + quote(e.getMessage() == null ? e.toString() : e.getMessage()) + "}");
        }
    }


    static void handleLiveStatus(HttpExchange ex) throws IOException {
        Map<String,String> q = query(ex.getRequestURI().getRawQuery());
        String city = q.getOrDefault("city", LiveMarketService.defaultCity());
        StringBuilder cities = new StringBuilder("[");
        String[] supported = LiveMarketService.supportedCities();
        for (int i=0;i<supported.length;i++) { if(i>0) cities.append(','); cities.append(quote(supported[i])); }
        cities.append(']');
        String json = "{" +
                "\"provider\":" + quote(LiveMarketService.providerName()) + "," +
                "\"city\":" + quote(city) + "," +
                "\"baseUrl\":" + quote(LiveMarketService.baseUrl()) + "," +
                "\"attributionUrl\":" + quote(LiveMarketService.attributionUrl()) + "," +
                "\"evaluationTier\":true," +
                "\"supportedCities\":" + cities + "," +
                "\"coverageNote\":\"Marketplace live listings are currently exposed through the configured provider for its documented covered cities. Visakhapatnam is retained in the academic dataset and linked to the official AP RERA registry for regulatory verification.\"," +
                "\"officialReraUrl\":\"https://rera.ap.gov.in/RERA/Views/Project.aspx\"" +
                "}";
        sendJson(ex, json);
    }

    static void handleLiveSearch(HttpExchange ex) throws IOException {
        Map<String,String> q = query(ex.getRequestURI().getRawQuery());
        String mode = q.getOrDefault("mode", "BUY");
        String locality = q.getOrDefault("locality", "All");
        int minPrice = parseInt(q.get("minPrice"), mode.equalsIgnoreCase("RENT") ? 10000 : 3500000);
        int maxPrice = parseInt(q.get("maxPrice"), mode.equalsIgnoreCase("RENT") ? 150000 : 20000000);
        int bedrooms = parseInt(q.get("bedrooms"), 0);
        String propertyType = q.getOrDefault("propertyType", "All");

        StringBuilder body = new StringBuilder("{");
        String liveCity = q.getOrDefault("city", LiveMarketService.defaultCity());
        body.append("\"city\":").append(quote(liveCity));
        if (!locality.equalsIgnoreCase("All")) body.append(",\"locality\":").append(quote(locality));
        if (!propertyType.equalsIgnoreCase("All") && !propertyType.equalsIgnoreCase("Commercial")) {
            String pt = propertyType.equalsIgnoreCase("Apartment") ? "apartment" : propertyType.equalsIgnoreCase("Villa") ? "villa" : propertyType.toLowerCase(Locale.ROOT);
            body.append(",\"propertyType\":").append(quote(pt));
        }
        if (bedrooms > 0) body.append(",\"bedrooms\":").append(bedrooms == 4 ? 4 : bedrooms);
        body.append(",\"transactionType\":").append(quote(mode.equalsIgnoreCase("RENT") ? "rent" : "sale"));
        if (mode.equalsIgnoreCase("RENT")) body.append(",\"rentalStructure\":\"monthly\"");
        body.append(",\"minPrice\":").append(minPrice);
        body.append(",\"maxPrice\":").append(maxPrice);
        body.append(",\"limit\":20}");

        try {
            LiveMarketService.Response r = LiveMarketService.post("/search_properties", body.toString());
            forwardJson(ex, r.statusCode(), r.body());
        } catch (Exception e) {
            forwardJson(ex, 502, "{\"supported\":false,\"liveError\":" + quote(e.getMessage() == null ? e.toString() : e.getMessage()) + "}");
        }
    }

    static void handleLiveProperty(HttpExchange ex) throws IOException {
        Map<String,String> q = query(ex.getRequestURI().getRawQuery());
        String listingId = q.getOrDefault("listingId", "");
        if (listingId.isBlank()) { forwardJson(ex, 400, "{\"supported\":false,\"message\":\"Missing listingId\"}"); return; }
        try {
            LiveMarketService.Response r = LiveMarketService.post("/get_property_details", "{\"listingId\":" + quote(listingId) + "}");
            forwardJson(ex, r.statusCode(), r.body());
        } catch (Exception e) {
            forwardJson(ex, 502, "{\"supported\":false,\"liveError\":" + quote(e.getMessage() == null ? e.toString() : e.getMessage()) + "}");
        }
    }

    static void handleLiveInsights(HttpExchange ex) throws IOException {
        Map<String,String> q = query(ex.getRequestURI().getRawQuery());
        String locality = q.getOrDefault("locality", "MVP Colony");
        String liveCity = q.getOrDefault("city", LiveMarketService.defaultCity());
        String body = "{\"localityName\":" + quote(locality) + ",\"city\":" + quote(liveCity) + "}";
        try {
            LiveMarketService.Response r = LiveMarketService.post("/get_locality_insights", body);
            forwardJson(ex, r.statusCode(), r.body());
        } catch (Exception e) {
            forwardJson(ex, 502, "{\"supported\":false,\"liveError\":" + quote(e.getMessage() == null ? e.toString() : e.getMessage()) + "}");
        }
    }

    static void forwardJson(HttpExchange ex, int status, String body) throws IOException {
        byte[] data = body.getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        ex.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        ex.getResponseHeaders().set("Cache-Control", "no-store");
        ex.sendResponseHeaders(status, data.length);
        try (OutputStream os = ex.getResponseBody()) { os.write(data); }
    }

    static void handleInquiry(HttpExchange ex) throws IOException {
        if (!"POST".equalsIgnoreCase(ex.getRequestMethod())) { sendStatus(ex, 405, "POST required"); return; }
        Map<String,String> form = form(ex);
        MarketplaceStore.User buyer = STORE.session(form.get("token"));
        if (buyer == null || !MarketplaceStore.BUYER.equals(buyer.role)) { forwardJson(ex, 401, "{\"ok\":false,\"message\":\"Buyer login required.\"}"); return; }
        int listingId = parseInt(form.get("listingId"), -1);
        try {
            MarketplaceStore.Inquiry q = STORE.createInquiry(buyer.id, listingId, form.getOrDefault("phone", buyer.phone), form.getOrDefault("email", buyer.email),
                    form.getOrDefault("message", "I am interested in this property."), form.getOrDefault("kind", "SITE_VISIT"), form.getOrDefault("date", ""));
            MarketplaceStore.User seller = STORE.sellerForListing(listingId);
            String sellerName = seller == null ? "seller" : seller.name;
            if ("SITE_VISIT".equalsIgnoreCase(q.kind) && seller != null) {
                ADVANCED.createVisit(buyer.id, seller.id, listingId, q.date, q.message);
            }
            sendJson(ex, "{\"ok\":true,\"reference\":" + quote(q.id) + ",\"sellerName\":" + quote(sellerName) + ",\"message\":\"Inquiry sent to the seller dashboard.\"}");
        } catch (Exception e) {
            forwardJson(ex, 400, "{\"ok\":false,\"message\":" + quote(e.getMessage() == null ? "Could not send inquiry." : e.getMessage()) + "}");
        }
    }

    static void handleDemoSeller(HttpExchange ex) throws IOException {
        if (!"POST".equalsIgnoreCase(ex.getRequestMethod())) { sendStatus(ex,405,"POST required"); return; }
        try {
            String token = STORE.loginDemoSeller();
            MarketplaceStore.User u = STORE.session(token);
            sendJson(ex, "{\"ok\":true,\"token\":" + quote(token) + ",\"user\":" + userJson(u) + "}");
        } catch (Exception e) {
            forwardJson(ex, 400, "{\"ok\":false,\"message\":" + quote(e.getMessage()==null?"Showcase seller is unavailable.":e.getMessage()) + "}");
        }
    }

    static void handleLogin(HttpExchange ex) throws IOException {
        if (!"POST".equalsIgnoreCase(ex.getRequestMethod())) { sendStatus(ex,405,"POST required"); return; }
        Map<String,String> f=form(ex); String token=STORE.login(f.get("email"),f.get("password"));
        if(token==null){forwardJson(ex,401,"{\"ok\":false,\"message\":\"Invalid email or password.\"}");return;}
        MarketplaceStore.User u=STORE.session(token);
        String json="{\"ok\":true,\"token\":"+quote(token)+",\"user\":"+userJson(u)+"}"; sendJson(ex,json);
    }

    static void handleRegister(HttpExchange ex) throws IOException {
        if(!"POST".equalsIgnoreCase(ex.getRequestMethod())){sendStatus(ex,405,"POST required");return;}
        Map<String,String> f=form(ex);
        try{
            String role=f.getOrDefault("role","BUYER").toUpperCase(Locale.ROOT);
            MarketplaceStore.User u;
            if (MarketplaceStore.SELLER.equals(role)) {
                u=STORE.registerSeller(f.getOrDefault("name","Seller"),f.getOrDefault("email",""),f.getOrDefault("phone",""),f.getOrDefault("password",""),f.getOrDefault("locality","All"));
            } else {
                u=STORE.registerBuyer(f.getOrDefault("name","Buyer"),f.getOrDefault("email",""),f.getOrDefault("phone",""),f.getOrDefault("password",""),f.get("mode"),f.get("locality"),parseInt(f.get("minBudget"),0),parseInt(f.get("maxBudget"),0));
            }
            String token=STORE.login(u.email,f.get("password"));
            sendJson(ex,"{\"ok\":true,\"token\":"+quote(token)+",\"user\":"+userJson(u)+"}");
        }catch(Exception e){forwardJson(ex,400,"{\"ok\":false,\"message\":"+quote(e.getMessage())+"}");}
    }

    static void handleLogout(HttpExchange ex) throws IOException { Map<String,String> f=form(ex); STORE.logout(f.get("token")); sendJson(ex,"{\"ok\":true}"); }

    static void handleMe(HttpExchange ex) throws IOException {
        Map<String,String> q=query(ex.getRequestURI().getRawQuery()); MarketplaceStore.User u=STORE.session(q.get("token"));
        if(u==null){forwardJson(ex,401,"{\"ok\":false}");return;} sendJson(ex,"{\"ok\":true,\"user\":"+userJson(u)+"}");
    }

    static void handleSellerProperties(HttpExchange ex) throws IOException {
        Map<String,String> f="GET".equalsIgnoreCase(ex.getRequestMethod())?query(ex.getRequestURI().getRawQuery()):form(ex);
        MarketplaceStore.User seller=STORE.session(f.get("token"));
        if(seller==null||!MarketplaceStore.SELLER.equals(seller.role)){forwardJson(ex,403,"{\"ok\":false,\"message\":\"Seller login required.\"}");return;}
        if("GET".equalsIgnoreCase(ex.getRequestMethod())){
            List<MarketplaceStore.PropertyRecord> props=STORE.sellerProperties(seller.id,REPO); StringBuilder b=new StringBuilder("{\"ok\":true,\"items\":[");
            for(int i=0;i<props.size();i++){if(i>0)b.append(',');b.append(propertyRecordJson(props.get(i)));} b.append("]}");sendJson(ex,b.toString());return;
        }
        try{
            String action=f.getOrDefault("action","create"); List<String> amenities=splitList(f.get("amenities"));
            MarketplaceStore.PropertyRecord p;
            if("update".equalsIgnoreCase(action)) p=STORE.updateProperty(seller.id,parseInt(f.get("id"),-1),REPO,f.get("title"),f.get("locality"),f.get("propertyType"),parseInt(f.get("price"),0),parseInt(f.get("areaSqFt"),0),parseInt(f.get("bedrooms"),0),amenities,f.getOrDefault("description",""),f.getOrDefault("address",""),parseDouble(f.get("lat"),0),parseDouble(f.get("lng"),0));
            else p=STORE.addProperty(seller.id,REPO,f.get("title"),f.get("locality"),f.get("propertyType"),f.get("mode"),parseInt(f.get("price"),0),parseInt(f.get("areaSqFt"),0),parseInt(f.get("bedrooms"),0),amenities,f.getOrDefault("description",""),f.getOrDefault("address",""),parseDouble(f.get("lat"),0),parseDouble(f.get("lng"),0));
            try{ESTIMATOR.runEstimator();}catch(Exception ignored){}
            ADVANCED.initialize(REPO, STORE);
            ADVANCED.recordPriceIfChanged(p.id, p.price);
            sendJson(ex,"{\"ok\":true,\"item\":"+propertyRecordJson(p)+"}");
        }catch(Exception e){forwardJson(ex,400,"{\"ok\":false,\"message\":"+quote(e.getMessage())+"}");}
    }

    static void handleSellerInquiries(HttpExchange ex) throws IOException {
        Map<String,String> q=query(ex.getRequestURI().getRawQuery()); MarketplaceStore.User seller=STORE.session(q.get("token"));
        if(seller==null||!MarketplaceStore.SELLER.equals(seller.role)){forwardJson(ex,403,"{\"ok\":false,\"message\":\"Seller login required.\"}");return;}
        List<MarketplaceStore.Inquiry> list=STORE.sellerInquiries(seller.id); StringBuilder b=new StringBuilder("{\"ok\":true,\"unread\":").append(STORE.unreadSellerInquiries(seller.id)).append(",\"items\":[");
        for(int i=0;i<list.size();i++){if(i>0)b.append(',');b.append(inquiryJson(list.get(i)));}b.append("]}");sendJson(ex,b.toString());
    }

    static void handleSellerInquiryRead(HttpExchange ex) throws IOException { Map<String,String> f=form(ex); MarketplaceStore.User s=STORE.session(f.get("token")); if(s==null||!MarketplaceStore.SELLER.equals(s.role)){forwardJson(ex,403,"{\"ok\":false}");return;} STORE.markInquiryRead(s.id,f.get("inquiryId")); sendJson(ex,"{\"ok\":true}"); }

    static void handleBuyerInquiries(HttpExchange ex) throws IOException { Map<String,String> q=query(ex.getRequestURI().getRawQuery()); MarketplaceStore.User b=STORE.session(q.get("token")); if(b==null||!MarketplaceStore.BUYER.equals(b.role)){forwardJson(ex,403,"{\"ok\":false,\"message\":\"Buyer login required.\"}");return;} List<MarketplaceStore.Inquiry> list=STORE.buyerInquiries(b.id); StringBuilder s=new StringBuilder("{\"ok\":true,\"items\":[");for(int i=0;i<list.size();i++){if(i>0)s.append(',');s.append(inquiryJson(list.get(i)));}s.append("]}");sendJson(ex,s.toString()); }

    static void handleMessages(HttpExchange ex) throws IOException {
        Map<String,String> f="GET".equalsIgnoreCase(ex.getRequestMethod())?query(ex.getRequestURI().getRawQuery()):form(ex); MarketplaceStore.User u=STORE.session(f.get("token")); if(u==null){forwardJson(ex,401,"{\"ok\":false,\"message\":\"Login required.\"}");return;}
        try{ if("GET".equalsIgnoreCase(ex.getRequestMethod())){List<MarketplaceStore.Message> ms=STORE.messages(u.id,f.get("inquiryId"));StringBuilder b=new StringBuilder("{\"ok\":true,\"items\":[");for(int i=0;i<ms.size();i++){if(i>0)b.append(',');b.append(messageJson(ms.get(i)));}b.append("]}");sendJson(ex,b.toString());}
            else if("clear".equalsIgnoreCase(f.getOrDefault("action",""))){STORE.clearMessages(u.id,f.get("inquiryId"));sendJson(ex,"{\"ok\":true}");}
            else {MarketplaceStore.Message m=STORE.sendMessage(u.id,f.get("inquiryId"),f.getOrDefault("text",""));sendJson(ex,"{\"ok\":true,\"item\":"+messageJson(m)+"}");}
        }catch(Exception e){forwardJson(ex,400,"{\"ok\":false,\"message\":"+quote(e.getMessage())+"}");}
    }

    static void handleAdvancedAnalysis(HttpExchange ex) throws IOException {
        Map<String,String> q=query(ex.getRequestURI().getRawQuery());
        Listing l=REPO.get(parseInt(q.get("id"),-1));
        if(l==null){forwardJson(ex,404,"{\"ok\":false,\"message\":\"Property not found.\"}");return;}
        AdvancedStore.Analysis a=ADVANCED.analysis(l,STORE,REPO);
        StringBuilder b=new StringBuilder("{\"ok\":true,\"analysis\":").append(advancedJson(l));
        b.append(",\"locality\":").append(quote(l.getLocality()));
        b.append(",\"propertyTitle\":").append(quote(l.getTitle()));
        b.append("}"); sendJson(ex,b.toString());
    }

    static void handleAdvancedVisits(HttpExchange ex) throws IOException {
        Map<String,String> f="GET".equalsIgnoreCase(ex.getRequestMethod())?query(ex.getRequestURI().getRawQuery()):form(ex);
        MarketplaceStore.User u=STORE.session(f.get("token"));
        if(u==null){forwardJson(ex,401,"{\"ok\":false,\"message\":\"Login required.\"}");return;}
        try{
            if("GET".equalsIgnoreCase(ex.getRequestMethod())){
                if (MarketplaceStore.SELLER.equals(u.role)) {
                    for (MarketplaceStore.Inquiry q : STORE.sellerInquiries(u.id)) if ("SITE_VISIT".equalsIgnoreCase(q.kind)) ADVANCED.ensureVisitForInquiry(q.buyerId, q.sellerId, q.listingId, q.date, q.message);
                } else {
                    for (MarketplaceStore.Inquiry q : STORE.buyerInquiries(u.id)) if ("SITE_VISIT".equalsIgnoreCase(q.kind)) ADVANCED.ensureVisitForInquiry(q.buyerId, q.sellerId, q.listingId, q.date, q.message);
                }
                List<AdvancedStore.SiteVisit> vs=ADVANCED.visitsFor(u.id,u.role); StringBuilder b=new StringBuilder("{\"ok\":true,\"items\":[");
                for(int i=0;i<vs.size();i++){if(i>0)b.append(',');b.append(visitJson(vs.get(i)));} b.append("]}"); sendJson(ex,b.toString()); return;
            }
            AdvancedStore.SiteVisit v=ADVANCED.updateVisit(u.id,f.get("visitId"),f.get("status"));
            sendJson(ex,"{\"ok\":true,\"item\":"+visitJson(v)+"}");
        }catch(Exception e){forwardJson(ex,400,"{\"ok\":false,\"message\":"+quote(e.getMessage())+"}");}
    }

    static void handleAdvancedOffers(HttpExchange ex) throws IOException {
        Map<String,String> f="GET".equalsIgnoreCase(ex.getRequestMethod())?query(ex.getRequestURI().getRawQuery()):form(ex);
        MarketplaceStore.User u=STORE.session(f.get("token"));
        if(u==null){forwardJson(ex,401,"{\"ok\":false,\"message\":\"Login required.\"}");return;}
        try{
            if("GET".equalsIgnoreCase(ex.getRequestMethod())){
                List<AdvancedStore.Offer> os=ADVANCED.offersFor(u.id,u.role); StringBuilder b=new StringBuilder("{\"ok\":true,\"items\":[");
                for(int i=0;i<os.size();i++){if(i>0)b.append(',');b.append(offerJson(os.get(i)));} b.append("]}"); sendJson(ex,b.toString()); return;
            }
            String action=f.getOrDefault("action","create");
            AdvancedStore.Offer o;
            if("respond".equalsIgnoreCase(action)){
                if(!MarketplaceStore.SELLER.equals(u.role)) throw new SecurityException("Seller login required.");
                o=ADVANCED.respondOffer(u.id,f.get("offerId"),f.get("status"),parseInt(f.get("counterAmount"),0),f.getOrDefault("message",""));
            } else {
                if(!MarketplaceStore.BUYER.equals(u.role)) throw new SecurityException("Buyer login required.");
                int listingId=parseInt(f.get("listingId"),-1); MarketplaceStore.User seller=STORE.sellerForListing(listingId); if(seller==null) throw new IllegalArgumentException("This property has no seller account.");
                o=ADVANCED.createOffer(u.id,seller.id,listingId,parseInt(f.get("amount"),0),f.getOrDefault("message",""));
            }
            sendJson(ex,"{\"ok\":true,\"item\":"+offerJson(o)+"}");
        }catch(Exception e){forwardJson(ex,400,"{\"ok\":false,\"message\":"+quote(e.getMessage())+"}");}
    }

    static String visitJson(AdvancedStore.SiteVisit v){
        Listing l=REPO.get(v.listingId);
        return "{\"id\":"+quote(v.id)+",\"listingId\":"+v.listingId+",\"propertyTitle\":"+quote(l==null?"Property":l.getTitle())+",\"buyerId\":"+quote(v.buyerId)+",\"sellerId\":"+quote(v.sellerId)+",\"date\":"+quote(v.date)+",\"status\":"+quote(v.status)+",\"message\":"+quote(v.message)+",\"createdAt\":"+quote(v.createdAt)+"}";
    }
    static String offerJson(AdvancedStore.Offer o){
        Listing l=REPO.get(o.listingId);
        return "{\"id\":"+quote(o.id)+",\"listingId\":"+o.listingId+",\"propertyTitle\":"+quote(l==null?"Property":l.getTitle())+",\"buyerId\":"+quote(o.buyerId)+",\"sellerId\":"+quote(o.sellerId)+",\"amount\":"+o.amount+",\"counterAmount\":"+o.counterAmount+",\"status\":"+quote(o.status)+",\"message\":"+quote(o.message)+",\"createdAt\":"+quote(o.createdAt)+"}";
    }

    static String userJson(MarketplaceStore.User u){return "{\"id\":"+quote(u.id)+",\"name\":"+quote(u.name)+",\"email\":"+quote(u.email)+",\"phone\":"+quote(u.phone)+",\"role\":"+quote(u.role)+",\"preferredMode\":"+quote(u.preferredMode)+",\"locality\":"+quote(u.locality)+",\"minBudget\":"+u.minBudget+",\"maxBudget\":"+u.maxBudget+",\"isDemo\":"+((u.id!=null&&u.id.equals("seller-showcase"))?"true":"false")+"}";}
    static String propertyRecordJson(MarketplaceStore.PropertyRecord p){
        Listing l=REPO.get(p.id);
        StringBuilder b=new StringBuilder("{\"id\":").append(p.id).append(",\"sellerId\":").append(quote(p.sellerId)).append(",\"title\":").append(quote(p.title)).append(",\"locality\":").append(quote(p.locality)).append(",\"propertyType\":").append(quote(p.propertyType)).append(",\"listingMode\":").append(quote(p.listingMode)).append(",\"price\":").append(p.price).append(",\"areaSqFt\":").append(p.areaSqFt).append(",\"bedrooms\":").append(p.bedrooms).append(",\"description\":").append(quote(p.description)).append(",\"address\":").append(quote(p.address)).append(",\"lat\":").append(p.lat).append(",\"lng\":").append(p.lng).append(",\"amenities\":[");
        for(int i=0;i<p.amenities.size();i++){if(i>0)b.append(',');b.append(quote(p.amenities.get(i)));}
        b.append("],\"advanced\":").append(l==null?"null":advancedJson(l));
        return b.append("}").toString();
    }
    static String advancedJson(Listing l){
        AdvancedStore.Analysis a=ADVANCED.analysis(l, STORE, REPO);
        StringBuilder b=new StringBuilder("{\"verificationStatus\":").append(quote(a.verificationStatus))
            .append(",\"completenessScore\":").append(a.completenessScore)
            .append(",\"trustScore\":").append(a.trustScore)
            .append(",\"duplicateFlag\":").append(a.duplicateFlag)
            .append(",\"localityScore\":").append(a.localityScore)
            .append(",\"priceAlert\":").append(quote(a.priceAlert))
            .append(",\"priceDeltaPct\":").append(Math.round(a.priceDeltaPct*10.0)/10.0)
            .append(",\"sellerName\":").append(quote(a.sellerName))
            .append(",\"demoSeller\":").append(a.demoSeller)
            .append(",\"priceHistory\":[");
        for(int i=0;i<a.priceHistory.size();i++){if(i>0)b.append(',');AdvancedStore.PricePoint pp=a.priceHistory.get(i);b.append("{\"time\":").append(quote(pp.time)).append(",\"price\":").append(pp.price).append('}');}
        return b.append("]}").toString();
    }
    static String inquiryJson(MarketplaceStore.Inquiry q){return "{\"id\":"+quote(q.id)+",\"listingId\":"+q.listingId+",\"buyerId\":"+quote(q.buyerId)+",\"sellerId\":"+quote(q.sellerId)+",\"buyerName\":"+quote(q.buyerName)+",\"phone\":"+quote(q.phone)+",\"email\":"+quote(q.email)+",\"message\":"+quote(q.message)+",\"kind\":"+quote(q.kind)+",\"date\":"+quote(q.date)+",\"status\":"+quote(q.status)+",\"createdAt\":"+quote(q.createdAt)+",\"propertyTitle\":"+quote(REPO.get(q.listingId)==null?"Property":REPO.get(q.listingId).getTitle())+",\"locality\":"+quote(REPO.get(q.listingId)==null?"":REPO.get(q.listingId).getLocality())+"}";}
    static String messageJson(MarketplaceStore.Message m){return "{\"id\":"+quote(m.id)+",\"inquiryId\":"+quote(m.inquiryId)+",\"senderId\":"+quote(m.senderId)+",\"receiverId\":"+quote(m.receiverId)+",\"text\":"+quote(m.text)+",\"createdAt\":"+quote(m.createdAt)+"}";}

    static String searchJson(List<Listing> results, String locality, int minPrice, int maxPrice, int minSize, int maxSize,
                             String amenity, String mode, String propertyType) {
        StringBuilder sb = new StringBuilder();
        sb.append("{\"filters\":{")
          .append("\"locality\":").append(quote(locality)).append(",")
          .append("\"minPrice\":").append(minPrice).append(",\"maxPrice\":").append(maxPrice).append(",")
          .append("\"minSize\":").append(minSize).append(",\"maxSize\":").append(maxSize).append(",")
          .append("\"amenity\":").append(quote(amenity)).append(",")
          .append("\"mode\":").append(quote(mode)).append(",")
          .append("\"propertyType\":").append(quote(propertyType)).append("},")
          .append("\"count\":").append(results.size()).append(",\"items\":[");
        for (int i=0;i<results.size();i++) {
            Listing l=results.get(i);
            if (i>0) sb.append(',');
            sb.append("{")
              .append("\"id\":").append(l.getId()).append(',')
              .append("\"title\":").append(quote(l.getTitle())).append(',')
              .append("\"locality\":").append(quote(l.getLocality())).append(',')
              .append("\"propertyType\":").append(quote(l.getPropertyType())).append(',')
              .append("\"listingClass\":").append(quote(l.listingClass())).append(',')
              .append("\"listingMode\":").append(quote(l.getListingMode())).append(',')
              .append("\"pricePeriod\":").append(quote(l.getPricePeriod())).append(',')
              .append("\"price\":").append(l.getPrice()).append(',')
              .append("\"estimatedPrice\":").append(Math.round(l.getEstimatedPrice())).append(',')
              .append("\"priceFlag\":").append(quote(l.getPriceFlag())).append(',')
              .append("\"areaSqFt\":").append(l.getAreaSqFt()).append(',')
              .append("\"bedrooms\":").append(l.getBedrooms()).append(',')
              .append("\"amenities\":[");
            for (int j=0;j<l.getAmenities().size();j++) { if (j>0) sb.append(','); sb.append(quote(l.getAmenities().get(j))); }
            sb.append("],\"sellerName\":").append(quote(STORE.sellerNameForListing(l.getId())));
            sb.append(",\"sellerOwned\":").append(STORE.ownerId(l.getId()) != null);
            sb.append(",\"advanced\":").append(advancedJson(l));
            sb.append("}");
        }
        sb.append("]}");
        return sb.toString();
    }

    static void handleStatic(HttpExchange ex) throws IOException {
        if (!"GET".equalsIgnoreCase(ex.getRequestMethod())) { ex.sendResponseHeaders(405,-1); return; }
        String path = ex.getRequestURI().getPath();
        if (path.equals("/")) path = "/index.html";
        Path file = ROOT.resolve("web" + path).normalize();
        if (!file.startsWith(ROOT.resolve("web")) || !Files.exists(file) || Files.isDirectory(file)) {
            ex.sendResponseHeaders(404,0); ex.getResponseBody().write("Not found".getBytes(StandardCharsets.UTF_8)); ex.close(); return;
        }
        String contentType = contentType(file);
        byte[] body = Files.readAllBytes(file);
        ex.getResponseHeaders().set("Content-Type", contentType);
        ex.getResponseHeaders().set("Cache-Control", "no-store");
        ex.sendResponseHeaders(200, body.length);
        try (OutputStream os=ex.getResponseBody()) { os.write(body); }
    }

    static Map<String,String> form(HttpExchange ex) throws IOException { return query(new String(ex.getRequestBody().readAllBytes(), StandardCharsets.UTF_8)); }
    static List<String> splitList(String raw){List<String> out=new ArrayList<>();if(raw==null)return out;for(String x:raw.split(",")){String v=x.trim();if(!v.isBlank())out.add(v);}return out;}
    static double parseDouble(String value,double fallback){try{return value==null||value.isBlank()?fallback:Double.parseDouble(value);}catch(Exception e){return fallback;}}

    static String contentType(Path p) {
        String f=p.getFileName().toString().toLowerCase(Locale.ROOT);
        if (f.endsWith(".html")) return "text/html; charset=utf-8";
        if (f.endsWith(".css")) return "text/css; charset=utf-8";
        if (f.endsWith(".js")) return "application/javascript; charset=utf-8";
        if (f.endsWith(".svg")) return "image/svg+xml";
        if (f.endsWith(".png")) return "image/png";
        if (f.endsWith(".jpg") || f.endsWith(".jpeg")) return "image/jpeg";
        return "application/octet-stream";
    }

    static int parseInt(String value, int fallback) { try { return value == null ? fallback : Integer.parseInt(value); } catch(Exception e) { return fallback; } }

    static Map<String,String> query(String raw) throws UnsupportedEncodingException {
        Map<String,String> out=new HashMap<>(); if (raw==null||raw.isBlank()) return out;
        for(String pair:raw.split("&")) { String[] kv=pair.split("=",2); if(kv.length==2) out.put(URLDecoder.decode(kv[0],"UTF-8"),URLDecoder.decode(kv[1],"UTF-8")); }
        return out;
    }

    static void sendJson(HttpExchange ex, String body) throws IOException {
        byte[] data=body.getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().set("Content-Type","application/json; charset=utf-8");
        ex.getResponseHeaders().set("Access-Control-Allow-Origin","*");
        ex.sendResponseHeaders(200,data.length);
        try(OutputStream os=ex.getResponseBody()){os.write(data);}
    }

    static void sendStatus(HttpExchange ex, int status, String body) throws IOException {
        byte[] data=body.getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().set("Content-Type","text/plain; charset=utf-8");
        ex.sendResponseHeaders(status,data.length);
        try(OutputStream os=ex.getResponseBody()){os.write(data);}
    }

    static String quote(String s) {
        if (s==null) return "null";
        return "\""+s.replace("\\","\\\\").replace("\"","\\\"").replace("\n","\\n").replace("\r","\\r")+"\"";
    }
}
