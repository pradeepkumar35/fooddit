package com.fooddit.restaurant;

import com.fooddit.config.exception.BadRequestException;
import com.fooddit.restaurant.dto.LedgerPageDto;
import com.fooddit.restaurant.dto.RestaurantDto;
import com.fooddit.restaurant.dto.RestaurantStatsDto;
import com.fooddit.restaurant.dto.RestaurantSuggestionDto;
import com.fooddit.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/restaurants")
@RequiredArgsConstructor
public class RestaurantController {

    private final RestaurantService restaurantService;

    /**
     * Feed list, always scoped to a serviceable city ({@code city} = city_slug,
     * required). {@code locality} optionally narrows within the city. {@code sort}
     * is name (default), top/rating (avg star rating desc), new (created desc) or
     * mostdiscussed (comment count desc); {@code rating} is a minimum star rating
     * (e.g. 4 means 4+ stars). The acting user's save state is included when
     * authenticated.
     */
    @GetMapping
    public List<RestaurantDto> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String cuisine,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String locality,
            @RequestParam(required = false) Double rating,
            @RequestParam(required = false, defaultValue = "name") String sort,
            @AuthenticationPrincipal Object principal) {
        if (city == null || city.isBlank()) {
            throw new BadRequestException("city is required");
        }
        return restaurantService.list(q, cuisine, city, locality, rating, sort, CurrentUser.orNull(principal));
    }

    /**
     * Distinct cuisine names for the filter dropdown. Public (matched before the
     * authenticated /saved rule via REST, both under /api/restaurants/**).
     */
    @GetMapping("/cuisines")
    public List<String> cuisines() {
        return restaurantService.listCuisines();
    }

    /**
     * The City Ledger: server-paginated enriched rows (rank/tier standing,
     * discussion aggregates, monthly vote delta). {@code sort} is
     * mostdiscussed (default — discussion is the product's headline),
     * rating or new; {@code page} is 0-based and {@code size} defaults to 30.
     * Slicing happens here, never client-side.
     */
    @GetMapping("/ledger")
    public LedgerPageDto ledger(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String cuisine,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String locality,
            @RequestParam(required = false) Double rating,
            @RequestParam(required = false, defaultValue = "mostdiscussed") String sort,
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "30") int size,
            @AuthenticationPrincipal Object principal) {
        return restaurantService.ledger(q, cuisine, city, locality, rating, sort,
                page, size, CurrentUser.orNull(principal));
    }

    /**
     * Fact-sheet payload for the restaurant Dossier: city rank seal, star
     * distribution histogram, review count and first-reviewed date.
     */
    @GetMapping("/{id}/stats")
    public RestaurantStatsDto stats(@PathVariable UUID id) {
        return restaurantService.stats(id);
    }

    /**
     * Lightweight name suggestions for the search autocomplete, scoped to a
     * city. Returns at most 8 {@code {id, name, locality}} rows.
     */
    @GetMapping("/suggestions")
    public List<RestaurantSuggestionDto> suggestions(
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String q) {
        return restaurantService.suggest(city == null ? "" : city, q == null ? "" : q);
    }

    /**
     * The current user's saved restaurants, newest save first. Requires auth
     * (matched in SecurityConfig before the public /api/restaurants/** rule).
     */
    @GetMapping("/saved")
    public List<RestaurantDto> saved(@AuthenticationPrincipal UUID currentUserId) {
        return restaurantService.listSaved(currentUserId);
    }

    @GetMapping("/{id}")
    public RestaurantDto get(@PathVariable UUID id,
                             @AuthenticationPrincipal Object principal) {
        return restaurantService.getById(id, CurrentUser.orNull(principal));
    }

    @PostMapping("/{id}/save")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void save(@PathVariable UUID id, @AuthenticationPrincipal UUID currentUserId) {
        restaurantService.save(id, currentUserId);
    }

    @DeleteMapping("/{id}/save")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unsave(@PathVariable UUID id, @AuthenticationPrincipal UUID currentUserId) {
        restaurantService.unsave(id, currentUserId);
    }
}
