package com.fooddit.auth;

import com.fooddit.auth.dto.AuthResponse;
import com.fooddit.auth.dto.LoginRequest;
import com.fooddit.auth.dto.SignupRequest;
import com.fooddit.config.exception.ConflictException;
import com.fooddit.config.exception.UnauthorizedException;
import com.fooddit.security.JwtService;
import com.fooddit.user.dto.UserDto;
import com.fooddit.user.entity.User;
import com.fooddit.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Transactional
    public AuthResponse signup(SignupRequest request) {
        String email = normalizeEmail(request.email());
        if (userRepository.existsByEmail(email)) {
            throw new ConflictException("An account with this email already exists");
        }

        User user = new User(request.name().trim(), email, passwordEncoder.encode(request.password()));
        userRepository.save(user);

        return AuthResponse.of(UserDto.from(user), jwtService.generateToken(user.getId()));
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(normalizeEmail(request.email()))
                .orElseThrow(() -> new UnauthorizedException("No account found with this email"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new UnauthorizedException("Incorrect password");
        }

        return AuthResponse.of(UserDto.from(user), jwtService.generateToken(user.getId()));
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
