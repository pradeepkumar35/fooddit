package com.fooddit.stream;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.SmartLifecycle;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * A small in-memory fan-out bus for per-restaurant realtime events delivered as
 * Server-Sent Events. Clients subscribe to {@code /api/stream/restaurants/{id}};
 * service methods publish {@code comment.created} / {@code vote.updated} events
 * every time the underlying DB transaction commits.
 *
 * <p>Broadcasts are best-effort and intentionally isolated from the caller's
 * transaction: {@link #afterCommit} defers publishing until the transaction has
 * committed (so a disconnected subscriber can never roll back a comment or a
 * vote), the heartbeat keeps idle connections alive, and a slow or dead client
 * is dropped without raising an error. Because it is per-instance and held in
 * memory, it is scoped to a single backend instance - fine for this deployment.
 *
 * <p>It is a {@link SmartLifecycle} with the highest phase so that, on shutdown,
 * its {@code stop()} (which completes every open emitter) runs before the web
 * server begins its graceful shutdown - otherwise Tomcat would wait for the
 * still-open SSE async requests to finish.
 */
@Component
@Slf4j
public class LiveEventPublisher implements SmartLifecycle {

    private static final long EMITTER_TIMEOUT_MS = 60_000L;
    private static final long HEARTBEAT_INTERVAL_MS = 25_000L;

    private final Map<UUID, Set<SseEmitter>> subscribers = new ConcurrentHashMap<>();
    private final ScheduledExecutorService heartbeat = Executors.newSingleThreadScheduledExecutor(task -> {
        Thread thread = new Thread(task, "sse-heartbeat");
        thread.setDaemon(true);
        return thread;
    });
    private volatile boolean running;

    /**
     * Registers and returns a new SSE connection for a restaurant. The emitter
     * is auto-removed when the client disconnects or the connection times out.
     */
    public SseEmitter subscribe(UUID restaurantId) {
        SseEmitter emitter = new SseEmitter(EMITTER_TIMEOUT_MS);
        emitter.onCompletion(() -> remove(restaurantId, emitter));
        emitter.onTimeout(() -> remove(restaurantId, emitter));
        emitter.onError(error -> remove(restaurantId, emitter));
        subscribers.computeIfAbsent(restaurantId, key -> new CopyOnWriteArraySet<>()).add(emitter);
        // Queues a handshake event; it flushes when the SSE handler initializes,
        // immediately committing the response headers so browsers connect fast.
        try {
            emitter.send(SseEmitter.event().name("connected").data("{}"));
        } catch (IOException | IllegalStateException ignored) {
            // subscriber already gone
        }
        return emitter;
    }

    /**
     * Publishes an event once the caller's transaction commits. If there is no
     * active transaction (e.g. outside a service method) it publishes
     * immediately.
     */
    public void afterCommit(UUID restaurantId, String eventName, Object payload) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    publish(restaurantId, eventName, payload);
                }
            });
        } else {
            publish(restaurantId, eventName, payload);
        }
    }

    /** Sends a named event to every connected subscriber of that restaurant. */
    public void publish(UUID restaurantId, String eventName, Object payload) {
        Set<SseEmitter> emitters = subscribers.get(restaurantId);
        if (emitters == null || emitters.isEmpty()) {
            return;
        }
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name(eventName).data(payload));
            } catch (IOException | IllegalStateException e) {
                remove(restaurantId, emitter);
            }
        }
    }

    private void beat() {
        subscribers.values().forEach(emitters -> emitters.forEach(emitter -> {
            try {
                emitter.send(SseEmitter.event().comment("keep-alive"));
            } catch (Exception ignored) {
                // disconnected subscriber; cleaned up on the next event send
            }
        }));
    }

    private void remove(UUID restaurantId, SseEmitter emitter) {
        Set<SseEmitter> emitters = subscribers.get(restaurantId);
        if (emitters != null) {
            emitters.remove(emitter);
            if (emitters.isEmpty()) {
                subscribers.remove(restaurantId);
            }
        }
    }

    // ---- SmartLifecycle ----------------------------------------------------

    @Override
    public void start() {
        heartbeat.scheduleWithFixedDelay(this::beat, HEARTBEAT_INTERVAL_MS, HEARTBEAT_INTERVAL_MS, TimeUnit.MILLISECONDS);
        running = true;
    }

    @Override
    public void stop() {
        running = false;
        heartbeat.shutdownNow();
        subscribers.values().forEach(emitters -> emitters.forEach(SseEmitter::complete));
        subscribers.clear();
    }

    @Override
    public void stop(Runnable callback) {
        stop();
        callback.run();
    }

    @Override
    public boolean isRunning() {
        return running;
    }

    @Override
    public boolean isAutoStartup() {
        return true;
    }

    @Override
    public int getPhase() {
        return Integer.MAX_VALUE;
    }
}