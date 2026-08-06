package com.fooddit.config;

import com.fooddit.restaurant.entity.Restaurant;
import com.fooddit.restaurant.repository.RestaurantRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Seeds a set of sample restaurants so the app is browseable immediately.
 *
 * <p>Runs only on the {@code dev} profile (the default), which uses a fresh H2
 * database per boot, so data is re-inserted each start. Production (PostgreSQL)
 * is not seeded — the check below makes this safe to run against a persistent
 * database too.
 */
@Component
@Profile("dev")
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final RestaurantRepository restaurantRepository;

    private record SeedRestaurant(String name, String address, String cuisineType, String priceRange, String city) {
    }

    @Override
    public void run(String... args) {
        if (restaurantRepository.count() > 0) {
            log.info("Skipping restaurant seed: database already contains data");
            return;
        }

        List<SeedRestaurant> seeds = List.of(
                new SeedRestaurant("Kebabs & Kurma", "14 Marine Drive, Mumbai", "North Indian", "₹₹", "Mumbai"),
                new SeedRestaurant("Dosa Dynasty", "2 MG Road, Mumbai", "South Indian", "₹", "Mumbai"),
                new SeedRestaurant("The Biryani Diaries", "45 T. Nagar, Chennai", "Hyderabadi", "₹₹", "Chennai"),
                new SeedRestaurant("Coastal Catch", "7 Marina Beach Rd, Chennai", "Kerala", "₹₹", "Chennai"),
                new SeedRestaurant("Amritsari Kulcha House", "19 Colaba Causeway, Mumbai", "Punjabi", "₹", "Mumbai"),
                new SeedRestaurant("Royal Thali", "3 Hauz Khas Village, Delhi", "Rajasthani", "₹₹", "Delhi"),
                new SeedRestaurant("Kolkata Kadai", "82 Chandni Chowk, Delhi", "Bengali", "₹₹", "Delhi"),
                new SeedRestaurant("Chettinad Spice Trail", "16 Adyar, Chennai", "Chettinad", "₹₹₹", "Chennai"),
                new SeedRestaurant("Varanasi Chaap", "9 Old Delhi, Delhi", "Street Food", "₹", "Delhi"),
                new SeedRestaurant("The Mughal Table", "23 Karol Bagh, Delhi", "Mughlai", "₹₹₹", "Delhi"),
                new SeedRestaurant("Parsi Achaari", "12 Colaba Causeway, Mumbai", "Parsi", "₹₹₹", "Mumbai"),
                new SeedRestaurant("Goan Prawn Shack", "31 Bandra West, Mumbai", "Goan", "₹₹", "Mumbai"),
                new SeedRestaurant("Saffron Satvik", "5 Anna Nagar, Chennai", "Maharashtrian", "₹₹", "Chennai"),
                new SeedRestaurant("Gujarati Ghar", "27 Powai, Mumbai", "Gujarati", "₹", "Mumbai"),
                new SeedRestaurant("The Dosa Corner", "44 Velachery, Chennai", "South Indian", "₹", "Chennai"),
                new SeedRestaurant("Awadhi Nizami", "8 Nizamuddin, Delhi", "Awadhi", "₹₹", "Delhi"),
                new SeedRestaurant("Chandni Chowk Chaat", "11 Chandni Chowk, Delhi", "Street Food", "₹", "Delhi"),
                new SeedRestaurant("Kashmiri Kahwa House", "52 Mylapore, Chennai", "Kashmiri", "₹₹", "Chennai")
        );

        for (SeedRestaurant seed : seeds) {
            Restaurant restaurant = new Restaurant(seed.name(), seed.address(), seed.cuisineType(), seed.priceRange(), seed.city());
            restaurant.setCitySlug(seed.city().toLowerCase());
            restaurant.setLocality(localityFrom(seed.address()));
            restaurant.setAvgRating(3.5 + (int) (Math.random() * 50) / 10.0);
            restaurant.getCuisines().add(seed.cuisineType());
            restaurantRepository.save(restaurant);
        }

        log.info("Seeded {} sample restaurants", seeds.size());
    }

    /** Derives a locality from an address like "14 Marine Drive, Mumbai" -> "Marine Drive". */
    private static String localityFrom(String address) {
        String head = address.split(",")[0].replaceAll("^[0-9\\s]+", "").trim();
        return head.isEmpty() ? null : head;
    }
}
