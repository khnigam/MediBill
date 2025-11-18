package com.ujjwalMedical.controller;

import com.ujjwalMedical.dto.MedicineSummaryDTO;
import com.ujjwalMedical.service.MedicineService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/medicines")
@CrossOrigin(origins = "*")
public class MedicineController {

    private final MedicineService service;

    public MedicineController(MedicineService service) {
        this.service = service;
    }

    @GetMapping("/summary")
    public List<MedicineSummaryDTO> getMedicineSummary() {
        return service.getSummary();
    }

    @GetMapping("/forSearch")
    public List<Map<String, Object>> searchMedicines(@RequestParam(defaultValue = "") String query) {
        return service.searchMedicines(query);
    }



}