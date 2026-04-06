package com.ujjwalMedical.repository;

import com.ujjwalMedical.entity.Sale;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface SaleRepository extends JpaRepository<Sale, Long> {

    @Query("""
        SELECT COALESCE(SUM(s.totalAmount), 0)
        FROM Sale s
        WHERE s.saleDate >= :startDate
          AND s.saleDate < :endDate
    """)
    Double sumTotalAmountBetween(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    List<Sale> findTop10ByOrderBySaleDateDescIdDesc();
}

