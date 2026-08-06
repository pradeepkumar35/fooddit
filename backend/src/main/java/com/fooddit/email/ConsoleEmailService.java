package com.fooddit.email;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Dev-friendly email delivery: prints the reset code to the server console so
 * the whole forgot-password flow can be exercised without an SMTP account.
 * Swap in a real implementation of {@link EmailService} to send actual mail.
 */
@Service
@Slf4j
public class ConsoleEmailService implements EmailService {

    @Override
    public void sendPasswordResetOtp(String to, String otp) {
        log.info("=== FOODDIT PASSWORD RESET ===");
        log.info("To: {}", to);
        log.info("Your one-time password is: {}", otp);
        log.info("It expires in 10 minutes. Use it on the reset page.");
        log.info("===============================");
    }
}