package com.fooddit.report;

import com.fooddit.report.dto.CreateReportRequest;
import com.fooddit.report.dto.ReportDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * PoC report endpoints. Reporting requires auth; reading all reports is also
 * authenticated (a full moderation dashboard/UI is explicitly out of scope).
 */
@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ReportDto create(@Valid @RequestBody CreateReportRequest request,
                            @AuthenticationPrincipal UUID currentUserId) {
        return reportService.create(currentUserId, request);
    }

    @GetMapping
    public List<ReportDto> list(@AuthenticationPrincipal UUID currentUserId) {
        return reportService.list();
    }
}
