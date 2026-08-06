package com.fooddit.auth.repository;

import com.fooddit.auth.entity.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {

    Optional<PasswordResetToken> findByUserId(UUID userId);

    void deleteByUserId(UUID userId);
}