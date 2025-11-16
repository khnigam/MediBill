package com.ujjwalMedical.repository;

import com.ujjwalMedical.dto.MedicineSummaryDTO;
import com.ujjwalMedical.entity.Medicine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

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
            MAX(b.mrp)
        )
        FROM Medicine m
        LEFT JOIN m.batches b
        GROUP BY m.id, m.name, m.brand
    """)
    List<MedicineSummaryDTO> getMedicineSummary();
}
