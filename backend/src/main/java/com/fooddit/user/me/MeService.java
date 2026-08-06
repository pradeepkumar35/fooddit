package com.fooddit.user.me;

import com.fooddit.config.exception.BadRequestException;
import com.fooddit.config.exception.NotFoundException;
import com.fooddit.user.entity.User;
import com.fooddit.user.me.dto.MeDto;
import com.fooddit.user.me.dto.UpdateNameRequest;
import com.fooddit.user.me.dto.UpdatePreferencesRequest;
import com.fooddit.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MeService {

    private static final Set<String> DISPLAY_MODES = Set.of("LIGHT", "DARK", "SYSTEM");

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public MeDto get(UUID userId) {
        return MeDto.from(find(userId));
    }

    @Transactional
    public MeDto updateName(UUID userId, UpdateNameRequest request) {
        User user = find(userId);
        user.setName(request.name().trim());
        return MeDto.from(user);
    }

    @Transactional
    public MeDto updatePreferences(UUID userId, UpdatePreferencesRequest request) {
        User user = find(userId);

        if (request.displayMode() != null) {
            String mode = request.displayMode().toUpperCase(Locale.ROOT);
            if (!DISPLAY_MODES.contains(mode)) {
                throw new BadRequestException("displayMode must be one of LIGHT, DARK or SYSTEM");
            }
            user.setDisplayMode(mode);
        }
        if (request.notifyOnReviewReply() != null) {
            user.setNotifyOnReviewReply(request.notifyOnReviewReply());
        }
        if (request.notifyOnCommentReply() != null) {
            user.setNotifyOnCommentReply(request.notifyOnCommentReply());
        }
        return MeDto.from(user);
    }

    private User find(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));
    }
}