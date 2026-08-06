package com.fooddit.user.me;

import com.fooddit.user.me.dto.MeDto;
import com.fooddit.user.me.dto.UpdateNameRequest;
import com.fooddit.user.me.dto.UpdatePreferencesRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/me")
@RequiredArgsConstructor
public class MeController {

    private final MeService meService;

    /** The acting user's account details and preferences. */
    @GetMapping
    public MeDto get(@AuthenticationPrincipal UUID currentUserId) {
        return meService.get(currentUserId);
    }

    @PatchMapping
    public MeDto updateName(@Valid @RequestBody UpdateNameRequest request,
                            @AuthenticationPrincipal UUID currentUserId) {
        return meService.updateName(currentUserId, request);
    }

    @PatchMapping("/preferences")
    public MeDto updatePreferences(@RequestBody UpdatePreferencesRequest request,
                                   @AuthenticationPrincipal UUID currentUserId) {
        return meService.updatePreferences(currentUserId, request);
    }
}