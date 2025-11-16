package com.ujjwalMedical.controller;

import com.ujjwalMedical.entity.Customer;
import com.ujjwalMedical.repository.CustomerRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/customers")
@CrossOrigin(origins = "*")
public class CustomerController {

    private final CustomerRepository repo;

    public CustomerController(CustomerRepository repo) {
        this.repo = repo;
    }

    // Get all customers
    @GetMapping
    public List<Customer> getAll() {
        return repo.findAll();
    }

    // Create or Update (same endpoint)
    @PostMapping
    public Customer saveCustomer(@RequestBody Customer req) {

        if (req.getId() != null) {
            // UPDATE
            Customer existing = repo.findById(req.getId())
                    .orElseThrow(() -> new RuntimeException("Customer not found"));
            existing.setName(req.getName());
            existing.setAddress(req.getAddress());
            existing.setPhoneNumber(req.getPhoneNumber());
            existing.setGstNumber(req.getGstNumber());
            existing.setLicenseNumber(req.getLicenseNumber());
            return repo.save(existing);
        } else {
            // CREATE
            return repo.save(req);
        }
    }

    // Delete customer
    @DeleteMapping("/{id}")
    public void deleteCustomer(@PathVariable Long id) {
        repo.deleteById(id);
    }
}
