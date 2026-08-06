package com.fooddit.save.entity;

import com.fooddit.restaurant.entity.Restaurant;
import com.fooddit.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * A user's bookmark of a restaurant. One save per user/restaurant pair
 * (enforced by the unique constraint); re-saving is idempotent.
 */
@Entity
@Table(
        name = "saved_restaurants",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_saved_user_restaurant",
                columnNames = {"user_id", "restaurant_id"}
        )
)
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SavedRestaurant {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "restaurant_id", nullable = false)
    private Restaurant restaurant;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public SavedRestaurant(User user, Restaurant restaurant) {
        this.user = user;
        this.restaurant = restaurant;
    }
}
