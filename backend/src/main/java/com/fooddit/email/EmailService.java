package com.fooddit.email;

/**
 * Outbound email. The only current implementation logs the message to the
 * server console, which is ideal for local development (the OTP is visible in
 * the backend log). A real SMTP/transactional implementation can be added later
 * without touching the password-reset flow.
 */
public interface EmailService {

    void sendPasswordResetOtp(String to, String otp);
}