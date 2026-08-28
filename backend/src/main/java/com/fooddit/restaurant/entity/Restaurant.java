package com.fooddit.restaurant.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "restaurants")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Restaurant {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String address;

    @Column(name = "cuisine_type")
    private String cuisineType;

    @Column(name = "price_range")
    private String priceRange;

    /** The city this restaurant operates in, e.g. Chennai, Mumbai, Delhi. */
    @Column(name = "city_name", nullable = false)
    private String cityName;

    @Column(name = "city_slug")
    private String citySlug;

    @Column(name = "external_id")
    private String externalId;

    @Column
    private String area;

    @Column
    private String locality;

    @Column(precision = 9, scale = 6)
    private BigDecimal latitude;

    @Column(precision = 9, scale = 6)
    private BigDecimal longitude;

    @Column(name = "avg_rating", nullable = false)
    private Double avgRating = 0.0;

    @Column(name = "total_ratings")
    private Integer totalRatings;

    @Column(name = "cost_for_two")
    private Integer costForTwo;

    @Column(name = "delivery_time_mins")
    private Integer deliveryTimeMins;

    @Column(name = "is_veg")
    private Boolean isVeg;

    @Column(name = "is_open")
    private Boolean isOpen;

    @Column(name = "menu_category_count")
    private Integer menuCategoryCount;

    @Column(name = "menu_item_count")
    private Integer menuItemCount;

    /** Resolved imagery (external CDN link or self-hosted placeholder path). */
    @Column(name = "image_url")
    private String imageUrl;

    /** How imageUrl was resolved: DIRECT / BRANCH_FALLBACK / CUISINE_PLACEHOLDER / NONE. */
    @Column(name = "image_source", nullable = false, length = 20)
    private String imageSource = "NONE";

    @ElementCollection(fetch = FetchType.EAGER)
    @BatchSize(size = 500)
    @CollectionTable(name = "restaurant_cuisines", joinColumns = @JoinColumn(name = "restaurant_id"))
    @Column(name = "cuisine")
    private List<String> cuisines = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public Restaurant(String name, String address, String cuisineType, String priceRange, String cityName) {
        this.name = name;
        this.address = address;
        this.cuisineType = cuisineType;
        this.priceRange = priceRange;
        this.cityName = cityName;
    }
}