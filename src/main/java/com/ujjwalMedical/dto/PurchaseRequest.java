package com.ujjwalMedical.dto;

import lombok.*;
import java.time.LocalDate;
import java.util.List;

@Data
public class PurchaseRequest {
    private LocalDate purchase_date;
    private String invoice_number;
    private Long distributor_id;

    private String purchase_type;
    private String payment_type;
    private String rate_type;
    private String tax_type;

    private List<PurchaseItemRequest> medicines;
}
