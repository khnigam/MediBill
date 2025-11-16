package com.ujjwalMedical.repository;

import com.ujjwalMedical.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerRepository extends JpaRepository<Customer, Long> {
}
