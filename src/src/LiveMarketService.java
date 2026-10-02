import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Server-side proxy for live real-estate data.
 * Default provider: AVnester's public evaluation API (no token required).
 * The UI always labels the provider and exposes the source handoff URL.
 */
public final class LiveMarketService {
    private static final String BASE_URL = System.getenv().getOrDefault(
            "LIVE_MARKET_BASE_URL", "https://api.avnester.com/public/v1");
    private static final HttpClient CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(12))
            .build();

    public static String providerName() { return System.getenv().getOrDefault("LIVE_MARKET_PROVIDER", "AVnester"); }
    public static String defaultCity() { return System.getenv().getOrDefault("LIVE_MARKET_CITY", "Coimbatore"); }
    public static String[] supportedCities() {
        return new String[]{"Coimbatore","Chennai","Madurai","Tiruchirappalli","Tiruppur","Erode","Tirunelveli","Vellore"};
    }
    public static String attributionText() { return "AVnester"; }
    public static String baseUrl() { return BASE_URL; }
    public static String attributionUrl() { return "https://developers.avnester.com/"; }

    public static Response post(String endpoint, String jsonBody) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create(BASE_URL + endpoint))
                .timeout(Duration.ofSeconds(20))
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                .build();
        HttpResponse<String> response = CLIENT.send(request, HttpResponse.BodyHandlers.ofString());
        return new Response(response.statusCode(), response.body());
    }

    public record Response(int statusCode, String body) {}
}
