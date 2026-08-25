package com.fooddit.user.profile;

import com.fooddit.security.CurrentUser;
import com.fooddit.user.profile.dto.UserProfileDto;
import com.fooddit.user.profile.UserProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserProfileController {

    private final UserProfileService userProfileService;

    /**
     * Public profile for any user. Anonymous and authenticated callers both
     * work; votes are enriched for the acting user when present.
     */
    @GetMapping("/{userId}/profile")
    public UserProfileDto getProfile(@PathVariable UUID userId,
                                     @AuthenticationPrincipal Object principal) {
        return userProfileService.getProfile(userId, CurrentUser.orNull(principal));
    }

    /**
     * Batched lifetime reputation (net upvotes across a user's reviews and
     * comments) for a set of author ids — powers the REP badges on review and
     * comment cards without an N+1 per card.
     */
    @GetMapping("/reputations")
    public Map<UUID, Long> reputations(@RequestParam List<UUID> ids) {
        return userProfileService.reputations(ids);
    }
}
