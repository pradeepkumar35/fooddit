package com.fooddit.auth;

import com.fooddit.auth.repository.PasswordResetTokenRepository;
import com.fooddit.support.IntegrationTestBase;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.http.MediaType;

import java.time.Instant;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The forgot-password flow: requesting a code prints it to the server console
 * (the console email transport), and resetting the password with that code
 * changes the credentials — verified by logging in with the new password.
 */
@ExtendWith(OutputCaptureExtension.class)
class PasswordResetApiIntegrationTest extends IntegrationTestBase {

    @Autowired
    private PasswordResetTokenRepository tokenRepository;

    private static final Pattern OTP_PATTERN = Pattern.compile("one-time password is: (\\d{6})",
            Pattern.CASE_INSENSITIVE);

    private String captureOtp(CapturedOutput output) {
        Matcher matcher = OTP_PATTERN.matcher(output.getAll());
        assertThat(matcher.find()).as("OTP should be logged to the console").isTrue();
        return matcher.group(1);
    }

    @Test
    void resetPasswordWithConsoleOtpAllowsLoginWithNewPassword(CapturedOutput output) throws Exception {
        Signup user = signup(uniqueEmail());

        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\"}".formatted(user.email())))
                .andExpect(status().isNoContent());

        String otp = captureOtp(output);

        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\",\"otp\":\"%s\",\"newPassword\":\"brandNewPassword123\"}"
                                .formatted(user.email(), otp)))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\",\"password\":\"brandNewPassword123\"}"
                                .formatted(user.email())))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\",\"password\":\"password123\"}"
                                .formatted(user.email())))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void unknownEmailStillReturnsNoContent() throws Exception {
        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"nobody@example.com\"}"))
                .andExpect(status().isNoContent());
    }

    @Test
    void wrongOtpIsRejected(CapturedOutput output) throws Exception {
        Signup user = signup(uniqueEmail());

        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\"}".formatted(user.email())))
                .andExpect(status().isNoContent());

        captureOtp(output);

        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\",\"otp\":\"000000\",\"newPassword\":\"brandNewPassword123\"}"
                                .formatted(user.email())))
                .andExpect(status().isBadRequest());
    }

    @Test
    void expiredOtpIsRejected(CapturedOutput output) throws Exception {
        Signup user = signup(uniqueEmail());

        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\"}".formatted(user.email())))
                .andExpect(status().isNoContent());

        String otp = captureOtp(output);

        tokenRepository.findAll().forEach(token -> {
            token.setExpiresAt(Instant.now().minusSeconds(60));
            tokenRepository.save(token);
        });

        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\",\"otp\":\"%s\",\"newPassword\":\"brandNewPassword123\"}"
                                .formatted(user.email(), otp)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void reusingCurrentPasswordIsRejected(CapturedOutput output) throws Exception {
        Signup user = signup(uniqueEmail());

        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\"}".formatted(user.email())))
                .andExpect(status().isNoContent());

        String otp = captureOtp(output);

        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\",\"otp\":\"%s\",\"newPassword\":\"password123\"}"
                                .formatted(user.email(), otp)))
                .andExpect(status().isBadRequest());

        // The old password must still work because nothing changed.
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\",\"password\":\"password123\"}"
                                .formatted(user.email())))
                .andExpect(status().isOk());
    }

    @Test
    void malformedOtpIsRejectedByValidation(CapturedOutput output) throws Exception {
        Signup user = signup(uniqueEmail());

        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\"}".formatted(user.email())))
                .andExpect(status().isNoContent());

        captureOtp(output);

        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\",\"otp\":\"12\",\"newPassword\":\"brandNewPassword123\"}"
                                .formatted(user.email())))
                .andExpect(status().isBadRequest());
    }
}
