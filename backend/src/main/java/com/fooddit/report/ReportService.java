package com.fooddit.report;

import com.fooddit.comment.entity.Comment;
import com.fooddit.comment.repository.CommentRepository;
import com.fooddit.config.exception.BadRequestException;
import com.fooddit.config.exception.ConflictException;
import com.fooddit.config.exception.NotFoundException;
import com.fooddit.report.dto.CreateReportRequest;
import com.fooddit.report.dto.ReportDto;
import com.fooddit.report.entity.Report;
import com.fooddit.report.entity.ReportTargetType;
import com.fooddit.report.repository.ReportRepository;
import com.fooddit.review.repository.ReviewRepository;
import com.fooddit.user.entity.User;
import com.fooddit.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final ReportRepository reportRepository;
    private final ReviewRepository reviewRepository;
    private final CommentRepository commentRepository;
    private final UserRepository userRepository;

    @Transactional
    public ReportDto create(UUID userId, CreateReportRequest request) {
        User reporter = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        ensureTargetExists(request.targetType(), request.targetId());
        if (reportRepository.existsByReporterIdAndTargetTypeAndTargetId(
                userId, request.targetType(), request.targetId())) {
            throw new ConflictException("You have already reported this content");
        }
        Report report = reportRepository.save(
                new Report(reporter, request.targetType(), request.targetId(), request.reason()));
        return ReportDto.from(report);
    }

    @Transactional(readOnly = true)
    public List<ReportDto> list() {
        return reportRepository.findAllWithReporter().stream().map(ReportDto::from).toList();
    }

    private void ensureTargetExists(ReportTargetType type, UUID id) {
        switch (type) {
            case REVIEW -> reviewRepository.findById(id)
                    .orElseThrow(() -> new NotFoundException("Review not found"));
            case COMMENT -> {
                Comment comment = commentRepository.findById(id)
                        .orElseThrow(() -> new NotFoundException("Comment not found"));
                if (comment.isDeleted()) {
                    throw new BadRequestException("You cannot report a deleted comment");
                }
            }
        }
    }
}
