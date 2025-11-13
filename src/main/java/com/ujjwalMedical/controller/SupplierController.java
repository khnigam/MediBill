package com.ujjwalMedical.controller;

import com.ujjwalMedical.dto.SupplierRequest;
import com.ujjwalMedical.dto.SupplierResponse;
import com.ujjwalMedical.entity.Supplier;
import com.ujjwalMedical.repository.SupplierRepository;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/suppliers")
@CrossOrigin(origins = "*")

public class SupplierController {

    private final SupplierRepository supplierRepository;

    public SupplierController(SupplierRepository supplierRepository) {
        this.supplierRepository = supplierRepository;
    }

    @GetMapping
    public List<SupplierResponse> getSuppliers() {
        System.out.println("PACKAGE = " + this.getClass().getPackageName());
        return supplierRepository.findAll().stream().map(s ->
                new SupplierResponse(
                        s.getId(),
                        s.getName(),
                        s.getName(),
                        s.getContactNumber(),
                        s.getEmail()
                )
        ).collect(Collectors.toList());
    }

    @PostMapping
    public SupplierResponse createOrUpdateSupplier(@RequestBody SupplierRequest req) {

        Supplier supplier;

        if (req.getId() != null) {
            // UPDATE supplier
            supplier = supplierRepository.findById(req.getId())
                    .orElseThrow(() -> new RuntimeException("Supplier not found with id " + req.getId()));
        } else {
            // CREATE supplier
            supplier = new Supplier();
        }

        // Set fields
        supplier.setName(req.getName());
        supplier.setContactNumber(req.getPhone());  // mapping phone -> contactNumber
        supplier.setEmail(req.getEmail());
        supplier.setAddress(req.getAddress());

        // Save
        supplier = supplierRepository.save(supplier);

        // Return response object
        return new SupplierResponse(
                supplier.getId(),
                supplier.getName(),
                supplier.getName(),         // contact = name (based on your current frontend)
                supplier.getContactNumber(),
                supplier.getEmail()
        );
    }

}