package com.fooddit.location;

import com.fooddit.config.exception.NotFoundException;
import com.fooddit.restaurant.repository.RestaurantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class LocationService {

    private final RestaurantRepository restaurantRepository;

    /** All serviceable cities as (slug, name) pairs. */
    @Transactional(readOnly = true)
    public List<CityDto> listCities() {
        return restaurantRepository.findDistinctCitySlugs().stream()
                .map(row -> new CityDto((String) row[0], (String) row[1]))
                .toList();
    }

    /** Localities within a city; 404 (not serviceable) if the city has no restaurants. */
    @Transactional(readOnly = true)
    public List<String> listLocalities(String citySlug) {
        if (citySlug == null || citySlug.isBlank() || !restaurantRepository.existsByCitySlug(citySlug)) {
            throw new NotFoundException("We don't deliver to this location yet");
        }
        return restaurantRepository.findDistinctLocalities(citySlug);
    }
}