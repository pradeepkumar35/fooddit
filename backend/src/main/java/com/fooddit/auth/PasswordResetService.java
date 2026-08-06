package com.fooddit.auth;

import com.fooddit.auth.entity.PasswordResetToken;
import com.fooddit.auth.repository.PasswordResetTokenRepository;
import com.fooddit.config.exception.BadRequestException;
import com.fooddit.email.EmailService;
import com.fooddit.user.entity.User;
import com.fooddit.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
public class PasswordResetService {

    private static final Duration OTP_TTL = Duration.ofMinutes(10);
    private static final int OTP_LENGTH = 6;

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String CODE_REQUIRED = "The reset code is invalid or has expired";

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    /**
     * Starts a reset for the given email. To avoid leaking which addresses have
     * accounts, the response is identical whether or not the user exists. An
     * existing account gets a fresh code and (for now) the code is printed to
     * the server console.
     */
    @Transactional
    public void requestReset(String email) {
        String normalized = normalizeEmail(email);
        userRepository.findByEmail(normalized).ifPresent(user -> {
            String otp = generateOtp();
            tokenRepository.deleteByUserId(user.getId());
            tokenRepository.save(new PasswordResetToken(user, hash(otp), Instant.now().plus(OTP_TTL)));
            emailService.sendPasswordResetOtp(user.getEmail(), otp);
            log.info("[pw-reset] Issued reset code for user {}", user.getId());
        });
    }

    @Transactional
    public void resetPassword(String email, String otp, String newPassword) {
        String normalized = normalizeEmail(email);
        User user = userRepository.findByEmail(normalized)
                .orElseThrow(() -> new BadRequestException(CODE_REQUIRED));

        PasswordResetToken token = tokenRepository.findByUserId(user.getId())
                .orElseThrow(() -> new BadRequestException(CODE_REQUIRED));

        if (token.getExpiresAt().isBefore(Instant.now())) {
            tokenRepository.deleteByUserId(user.getId());
            throw new BadRequestException(CODE_REQUIRED);
        }
        if (!constantTimeEquals(token.getOtpHash(), hash(otp))) {
            throw new BadRequestException(CODE_REQUIRED);
        }
        if (passwordEncoder.matches(newPassword, user.getPasswordHash())) {
            throw new BadRequestException("You cannot reuse your current password");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        tokenRepository.deleteByUserId(user.getId());
        log.info("[pw-reset] Password changed for user {}", user.getId());
    }

    private String generateOtp() {
        int code = RANDOM.nextInt((int) Math.pow(10, OTP_LENGTH));
        return String.format(Locale.ROOT, "%0" + OTP_LENGTH + "d", code);
    }

    private static String hash(String otp) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(otp.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(bytes);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

    private static boolean constantTimeEquals(String a, String b) {
        return MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8));
    }

    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}