package com.fooddit.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fooddit.config.exception.ApiError;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Writes a structured JSON 401 response when an unauthenticated request hits a
 * protected endpoint (instead of Spring's default redirect to a login page).
 */
@Component
@RequiredArgsConstructor
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    @Override
    public void commence(HttpServletRequest request,
                         HttpServletResponse response,
                         AuthenticationException authException) throws IOException {
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        ApiError body = ApiError.of(HttpStatus.UNAUTHORIZED, "Authentication required", request.getRequestURI(), null);
        objectMapper.writeValue(response.getOutputStream(), body);
    }
}
