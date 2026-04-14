package com.ujjwalMedical.repository;

import com.ujjwalMedical.dto.MedicineSummaryDTO;
import com.ujjwalMedical.entity.Medicine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface MedicineRepository extends JpaRepository<Medicine, Long> {

    @Query("""
        SELECT new com.ujjwalMedical.dto.MedicineSummaryDTO(
            m.id,
            m.name,
            m.brand,
            COALESCE(SUM(b.quantity), 0),
            MIN(b.expiryDate),
            MAX(b.purchaseRate),
            MAX(b.mrp),
            COALESCE(m.active, true)
        )
        FROM Medicine m
        LEFT JOIN m.batches b
        GROUP BY m.id, m.name, m.brand
    """)
    List<MedicineSummaryDTO> getMedicineSummary();

    @Query("SELECT m FROM Medicine m WHERE LOWER(m.name) LIKE %:query% AND (m.active = true OR m.active IS NULL)")
    List<Medicine> searchByName(@Param("query") String query);

    @Query("""
        SELECT COUNT(m)
        FROM Medicine m
        WHERE (
            SELECT COALESCE(SUM(b.quantity), 0)
            FROM Batch b
            WHERE b.medicine = m
        ) < :threshold
    """)
    long countMedicinesWithTotalQuantityLessThan(@Param("threshold") long threshold);

    @Query("""
        SELECT COUNT(m)
        FROM Medicine m
        WHERE (
            SELECT MIN(b.expiryDate)
            FROM Batch b
            WHERE b.medicine = m
        ) <= :cutoffDate
    """)
    long countMedicinesExpiringOnOrBefore(@Param("cutoffDate") LocalDate cutoffDate);

    @Query("""
        SELECT m.name, COALESCE(SUM(b.quantity), 0)
        FROM Medicine m
        LEFT JOIN m.batches b
        GROUP BY m.id, m.name
        HAVING COALESCE(SUM(b.quantity), 0) < :threshold
        ORDER BY COALESCE(SUM(b.quantity), 0) ASC
    """)
    List<Object[]> findLowStockMedicineRows(@Param("threshold") long threshold);
}
