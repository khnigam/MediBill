package com.ujjwalMedical.repository;

import com.ujjwalMedical.entity.Purchase;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PurchaseRepository extends JpaRepository<Purchase, Long> {}
