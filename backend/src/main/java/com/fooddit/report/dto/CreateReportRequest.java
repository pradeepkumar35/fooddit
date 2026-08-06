package com.fooddit.report.dto;

import com.fooddit.report.entity.ReportReason;
import com.fooddit.report.entity.ReportTargetType;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record CreateReportRequest(
        @NotNull(message = "Target type is required")
        ReportTargetType targetType,

        @NotNull(message = "Target id is required")
        UUID targetId,

        @NotNull(message = "Reason is required")
        ReportReason reason
) {
}
