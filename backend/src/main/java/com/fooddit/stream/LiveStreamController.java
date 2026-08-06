package com.fooddit.stream;

import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.UUID;

/**
 * Public, anonymous Server-Sent Events endpoint. Any page viewing a restaurant
 * opens {@code /api/stream/restaurants/{id}} and receives realtime comment and
 * vote events for that restaurant (the content is already public via the
 * read-only GET endpoints, so no auth is required to subscribe).
 */
@RestController
@RequestMapping("/api/stream")
@RequiredArgsConstructor
public class LiveStreamController {

    private final LiveEventPublisher liveEventPublisher;

    @GetMapping(value = "/restaurants/{restaurantId}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@PathVariable UUID restaurantId) {
        return liveEventPublisher.subscribe(restaurantId);
    }
}