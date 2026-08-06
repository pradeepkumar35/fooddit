package com.fooddit.vote;

import com.fooddit.vote.dto.VoteRequest;
import com.fooddit.vote.dto.VoteResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/votes")
@RequiredArgsConstructor
public class VoteController {

    private final VoteService voteService;

    @PostMapping
    public VoteResponse cast(@Valid @RequestBody VoteRequest request,
                             @AuthenticationPrincipal UUID currentUserId) {
        return voteService.cast(currentUserId, request);
    }
}
