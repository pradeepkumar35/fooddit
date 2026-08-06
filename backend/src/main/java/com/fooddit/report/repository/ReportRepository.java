package com.fooddit.report.repository;

import com.fooddit.report.entity.Report;
import com.fooddit.report.entity.ReportTargetType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface ReportRepository extends JpaRepository<Report, UUID> {

    boolean existsByReporterIdAndTargetTypeAndTargetId(
            UUID reporterId, ReportTargetType targetType, UUID targetId);

    /**
     * All reports, newest first, with the reporter eagerly fetched for the
     * PoC moderation read endpoint.
     */
    @Query("""
            select r from Report r
            join fetch r.reporter
            order by r.createdAt desc
            """)
    List<Report> findAllWithReporter();
}
