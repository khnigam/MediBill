package com.ujjwalMedical.repository;

import com.ujjwalMedical.entity.SaleItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SaleItemRepository extends JpaRepository<SaleItem, Long> {
    boolean existsByBatchId(Long batchId);
}

