import java.util.*;

public final class DataLoader {
    private DataLoader() {}

    public static ListingRepository load() {
        ListingRepository repo = new ListingRepository();

        // Original academic sale dataset (kept intact).
        repo.add(new ResidentialListing(101, "Skyline 3BHK", "MVP Colony", "Apartment", 9200000, 1540, 3, List.of("Parking","Gym","Security")));
        repo.add(new ResidentialListing(102, "Sea Breeze 2BHK", "MVP Colony", "Apartment", 6800000, 1180, 2, List.of("Parking","Security")));
        repo.add(new ResidentialListing(103, "Palm Grove Villa", "Rushikonda", "Villa", 13500000, 2480, 4, List.of("Pool","Parking","Garden","Security")));
        repo.add(new ResidentialListing(104, "Coastal View Flat", "Rushikonda", "Apartment", 7900000, 1320, 2, List.of("Pool","Parking","Security")));
        repo.add(new ResidentialListing(105, "Harbor Heights", "Dwaraka Nagar", "Apartment", 6100000, 1060, 2, List.of("Parking","Gym")));
        repo.add(new ResidentialListing(106, "Central Park Home", "Dwaraka Nagar", "Apartment", 8400000, 1450, 3, List.of("Parking","Gym","Security")));
        repo.add(new ResidentialListing(107, "Green Valley Home", "Madhurawada", "Villa", 11200000, 2180, 4, List.of("Parking","Garden","Security")));
        repo.add(new ResidentialListing(108, "Tech Corridor 2BHK", "Madhurawada", "Apartment", 5900000, 1040, 2, List.of("Parking","Security")));
        repo.add(new ResidentialListing(109, "Hilltop Residence", "Yendada", "Villa", 14800000, 2660, 4, List.of("Pool","Parking","Garden","Gym")));
        repo.add(new ResidentialListing(110, "Sunset 3BHK", "Yendada", "Apartment", 8900000, 1520, 3, List.of("Pool","Parking","Security")));
        repo.add(new ResidentialListing(111, "Lakefront Apartment", "PM Palem", "Apartment", 7200000, 1260, 2, List.of("Parking","Garden")));
        repo.add(new ResidentialListing(112, "Family Nest", "PM Palem", "Apartment", 8150000, 1400, 3, List.of("Parking","Security","Gym")));
        repo.add(new CommercialListing(113, "Retail Corner", "Dwaraka Nagar", "Commercial", 15800000, 3100, 0, List.of("Parking","Security","Power Backup")));
        repo.add(new CommercialListing(114, "Office Hub", "Madhurawada", "Commercial", 12600000, 2750, 0, List.of("Parking","Power Backup","Security")));
        repo.add(new CommercialListing(115, "Beachside Cafe Space", "Rushikonda", "Commercial", 17800000, 3400, 0, List.of("Parking","Power Backup","Garden")));
        repo.add(new ResidentialListing(116, "Budget Starter", "Madhurawada", "Apartment", 4800000, 860, 1, List.of("Parking")));
        repo.add(new ResidentialListing(117, "Urban Nest", "MVP Colony", "Apartment", 10100000, 1680, 3, List.of("Parking","Gym","Security","Garden")));
        repo.add(new ResidentialListing(118, "Ocean Crest", "Yendada", "Apartment", 10900000, 1780, 3, List.of("Pool","Parking","Security")));
        repo.add(new ResidentialListing(119, "Garden Court", "PM Palem", "Villa", 11800000, 2150, 4, List.of("Parking","Garden","Security")));
        repo.add(new ResidentialListing(120, "Compact Comfort", "Dwaraka Nagar", "Apartment", 5600000, 980, 2, List.of("Parking","Security")));

        // Extended academic regions for broader filtering/comparison coverage.
        repo.add(new ResidentialListing(121, "Seethammadhara Heights", "Seethammadhara", "Apartment", 7600000, 1250, 2, List.of("Parking","Security","Gym")));
        repo.add(new ResidentialListing(122, "Seethammadhara Family Home", "Seethammadhara", "Apartment", 10400000, 1680, 3, List.of("Parking","Garden","Security")));
        repo.add(new ResidentialListing(123, "Akkayyapalem Urban Flat", "Akkayyapalem", "Apartment", 6300000, 1120, 2, List.of("Parking","Security")));
        repo.add(new ResidentialListing(124, "Akkayyapalem Corner Home", "Akkayyapalem", "Villa", 11800000, 2050, 4, List.of("Parking","Garden","Security")));
        repo.add(new ResidentialListing(125, "Kancharapalem Comfort", "Kancharapalem", "Apartment", 5400000, 980, 2, List.of("Parking","Security")));
        repo.add(new ResidentialListing(126, "Kancharapalem Family Flat", "Kancharapalem", "Apartment", 7100000, 1320, 3, List.of("Parking","Gym","Security")));
        repo.add(new ResidentialListing(127, "Gajuwaka Business Home", "Gajuwaka", "Apartment", 5900000, 1180, 2, List.of("Parking","Power Backup","Security")));
        repo.add(new CommercialListing(128, "Gajuwaka Trade Hub", "Gajuwaka", "Commercial", 13200000, 2900, 0, List.of("Parking","Power Backup","Security")));
        repo.add(new ResidentialListing(129, "Pendurthi Green Home", "Pendurthi", "Villa", 8800000, 1900, 3, List.of("Parking","Garden","Security")));
        repo.add(new ResidentialListing(130, "Pendurthi Budget Flat", "Pendurthi", "Apartment", 4700000, 920, 2, List.of("Parking","Security")));
        repo.add(new ResidentialListing(131, "Sujatha Nagar Residence", "Sujatha Nagar", "Apartment", 6700000, 1210, 2, List.of("Parking","Security","Gym")));
        repo.add(new ResidentialListing(132, "Sujatha Nagar Premium", "Sujatha Nagar", "Apartment", 9800000, 1580, 3, List.of("Parking","Garden","Security")));


        // Rental workflow dataset. Monthly academic reference listings.
        repo.add(new ResidentialListing(201, "Harbor View 2BHK", "MVP Colony", "Apartment", 28000, 1180, 2, List.of("Parking","Security"), "RENT", "MONTHLY"));
        repo.add(new ResidentialListing(202, "Green Park 3BHK", "Dwaraka Nagar", "Apartment", 32000, 1450, 3, List.of("Parking","Gym","Security"), "RENT", "MONTHLY"));
        repo.add(new ResidentialListing(203, "Rushikonda Sea View", "Rushikonda", "Apartment", 38000, 1320, 2, List.of("Pool","Parking","Security"), "RENT", "MONTHLY"));
        repo.add(new ResidentialListing(204, "Palm Court Villa", "PM Palem", "Villa", 42000, 2150, 4, List.of("Parking","Garden","Security"), "RENT", "MONTHLY"));
        repo.add(new ResidentialListing(205, "Yendada Family Home", "Yendada", "Apartment", 30000, 1520, 3, List.of("Parking","Security"), "RENT", "MONTHLY"));
        repo.add(new ResidentialListing(206, "Madhurawada Tech Home", "Madhurawada", "Apartment", 24000, 1040, 2, List.of("Parking","Security"), "RENT", "MONTHLY"));
        repo.add(new ResidentialListing(207, "Seethammadhara City Rent", "Seethammadhara", "Apartment", 29000, 1210, 2, List.of("Parking","Security"), "RENT", "MONTHLY"));
        repo.add(new ResidentialListing(208, "Akkayyapalem Family Rent", "Akkayyapalem", "Apartment", 27000, 1180, 2, List.of("Parking","Security"), "RENT", "MONTHLY"));
        repo.add(new ResidentialListing(209, "Kancharapalem Urban Rent", "Kancharapalem", "Apartment", 23000, 980, 2, List.of("Parking","Security"), "RENT", "MONTHLY"));
        repo.add(new ResidentialListing(210, "Gajuwaka Workday Home", "Gajuwaka", "Apartment", 25000, 1080, 2, List.of("Parking","Power Backup"), "RENT", "MONTHLY"));
        repo.add(new ResidentialListing(211, "Pendurthi Garden Rent", "Pendurthi", "Apartment", 22000, 1150, 2, List.of("Parking","Garden"), "RENT", "MONTHLY"));
        repo.add(new ResidentialListing(212, "Sujatha Nagar Family Rent", "Sujatha Nagar", "Apartment", 26000, 1260, 3, List.of("Parking","Security"), "RENT", "MONTHLY"));
        return repo;
    }
}
