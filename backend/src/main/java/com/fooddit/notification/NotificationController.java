package com.fooddit.notification;

import com.fooddit.notification.dto.NotificationDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    /** The acting user's notifications, newest first, with the unread count. */
    @GetMapping("/me/notifications")
    public NotificationDto.NotificationsResponse list(@AuthenticationPrincipal UUID currentUserId) {
        return notificationService.listFor(currentUserId);
    }

    @PatchMapping("/notifications/{id}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markRead(@PathVariable UUID id, @AuthenticationPrincipal UUID currentUserId) {
        notificationService.markRead(currentUserId, id);
    }

    @PostMapping("/notifications/read-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markAllRead(@AuthenticationPrincipal UUID currentUserId) {
        notificationService.markAllRead(currentUserId);
    }

    @DeleteMapping("/me/notifications")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void clear(@AuthenticationPrincipal UUID currentUserId) {
        notificationService.clear(currentUserId);
    }
}