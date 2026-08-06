package com.fooddit.notification.repository;

import com.fooddit.notification.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    java.util.List<Notification> findByUserIdOrderByCreatedAtDesc(UUID userId);

    long countByUserIdAndReadAtIsNull(UUID userId);

    void deleteAllByUserId(UUID userId);

    Collection<Notification> findAllByUserIdAndIdIn(UUID userId, Collection<UUID> ids);
}