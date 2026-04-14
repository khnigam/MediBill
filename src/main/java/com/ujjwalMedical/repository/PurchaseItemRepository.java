package com.ujjwalMedical.repository;

import com.ujjwalMedical.entity.PurchaseItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface PurchaseItemRepository extends JpaRepository<PurchaseItem, Long> {
    List<PurchaseItem> findByPurchaseIdOrderByIdAsc(Long purchaseId);

    @Transactional
    void deleteByPurchaseId(Long purchaseId);
}
