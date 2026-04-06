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

    @GetMapping("/dashboardStats")
    public Map<String, Object> getDashboardStats() {
        // Total Sales (This Month)
        double totalSalesThisMonth = service.getTotalSalesThisMonth();

        // Low Stock Alerts
        int lowStockCount = service.countLowStockMedicines();

        // Expiring Soon (in 3 months or less)
        int expiringSoonCount = service.countExpiringSoonMedicines(3);

        return Map.of(
                "totalSalesThisMonth", totalSalesThisMonth,
                "lowStockCount", lowStockCount,
                "expiringSoon", expiringSoonCount
        );
    }

    @GetMapping("/dashboard/lowStock")
    public List<Map<String, Object>> getDashboardLowStock() {
        return service.getLowStockAlerts(50);
    }

    @GetMapping("/dashboard/recentSales")
    public List<Map<String, Object>> getDashboardRecentSales() {
        return service.getRecentSales();
    }



}