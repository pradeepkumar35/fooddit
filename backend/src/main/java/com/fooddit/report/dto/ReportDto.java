package com.fooddit.report.dto;

import com.fooddit.report.entity.Report;
import com.fooddit.report.entity.ReportReason;
import com.fooddit.report.entity.ReportStatus;
import com.fooddit.report.entity.ReportTargetType;
import com.fooddit.user.dto.UserDto;

import java.time.Instant;
import java.util.UUID;

/**
 * A report as returned by the moderation read endpoint. Includes the reporter
 * so a future dashboard can show who flagged what.
 */
public record ReportDto(
        UUID id,
        UserDto reporter,
        ReportTargetType targetType,
        UUID targetId,
        ReportReason reason,
        ReportStatus status,
        Instant createdAt
) {

    public static ReportDto from(Report report) {
        return new ReportDto(
                report.getId(),
                UserDto.from(report.getReporter()),
                report.getTargetType(),
                report.getTargetId(),
                report.getReason(),
                report.getStatus(),
                report.getCreatedAt());
    }
}
