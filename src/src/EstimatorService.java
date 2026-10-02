import java.io.*;
import java.nio.file.*;
import java.util.*;

public class EstimatorService {
    private final Path projectRoot;
    private final ListingRepository repo;
    private Path predictionsPath;

    public EstimatorService(Path projectRoot, ListingRepository repo) {
        this.projectRoot = projectRoot;
        this.repo = repo;
    }

    public void runEstimator() throws Exception {
        Path input = projectRoot.resolve("data/listings_export.csv");
        predictionsPath = projectRoot.resolve("data/price_predictions.csv");
        repo.exportCsv(input);

        String command = System.getenv().getOrDefault("PYTHON_CMD", isWindows() ? "python" : "python3");
        Path script = projectRoot.resolve("python/estimate.py");
        ProcessBuilder pb = new ProcessBuilder(command, script.toString(), input.toString(), predictionsPath.toString());
        pb.directory(projectRoot.toFile());
        pb.redirectErrorStream(true);
        Process process = pb.start();
        String output = new String(process.getInputStream().readAllBytes());
        int exit = process.waitFor();
        if (exit != 0) throw new IOException("Python estimator failed (exit " + exit + "): " + output);
        applyPredictions(predictionsPath);
    }

    private void applyPredictions(Path path) throws IOException {
        try (BufferedReader r = Files.newBufferedReader(path)) {
            String header = r.readLine();
            if (header == null) return;
            String line;
            while ((line = r.readLine()) != null) {
                String[] parts = line.split(",");
                if (parts.length < 2) continue;
                int id = Integer.parseInt(parts[0].trim());
                double estimate = Double.parseDouble(parts[1].trim());
                Listing listing = repo.get(id);
                if (listing != null) listing.applyEstimate(estimate);
            }
        }
    }

    public String getPredictionFile() { return predictionsPath == null ? "data/price_predictions.csv" : projectRoot.relativize(predictionsPath).toString().replace('\\','/'); }
    private static boolean isWindows() { return System.getProperty("os.name").toLowerCase(Locale.ROOT).contains("win"); }
}
