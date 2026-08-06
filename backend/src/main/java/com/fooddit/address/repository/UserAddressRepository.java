package com.fooddit.address.repository;

import com.fooddit.address.entity.UserAddress;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface UserAddressRepository extends JpaRepository<UserAddress, UUID> {

    List<UserAddress> findByUserIdOrderByIsDefaultDescCreatedAtDesc(UUID userId);

    long countByUserId(UUID userId);
}