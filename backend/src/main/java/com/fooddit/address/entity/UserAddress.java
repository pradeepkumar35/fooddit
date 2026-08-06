package com.fooddit.address.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
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
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_addresses")
@Getter
@Setter
public class UserAddress {
    public UserAddress() {
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Short label shown in the switcher (e.g. "Home", "Office"). */
    @Column(length = 50)
    private String label;

    @Column(name = "address_line", nullable = false)
    private String addressLine;

    @Column
    private String locality;

    @Column(name = "city_name", nullable = false)
    private String cityName;

    @Column(name = "city_slug", nullable = false)
    private String citySlug;

    @Column(precision = 9, scale = 6)
    private BigDecimal latitude;

    @Column(precision = 9, scale = 6)
    private BigDecimal longitude;

    @Column(name = "is_default", nullable = false)
    private boolean isDefault;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}