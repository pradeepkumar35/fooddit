package com.fooddit.location;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Location lookup for the Swiggy/Zomato-style location switcher. Public read
 * endpoints: the list of serviceable cities, and the localities within one.
 */
@RestController
@RequestMapping("/api/cities")
@RequiredArgsConstructor
public class LocationController {

    private final LocationService locationService;

    @GetMapping
    public List<CityDto> cities() {
        return locationService.listCities();
    }

    @GetMapping("/{citySlug}/localities")
    public List<String> localities(@PathVariable String citySlug) {
        return locationService.listLocalities(citySlug);
    }
}