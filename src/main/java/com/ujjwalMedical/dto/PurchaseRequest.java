package com.ujjwalMedical.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class PurchaseRequest {
    @JsonProperty("purchase_date")
    private LocalDate purchase_date;

    @JsonProperty("invoice_number")
    private String invoice_number;

    /** Supplier FK — frontend sends snake_case; also accept camelCase aliases. */
    @JsonProperty("distributor_id")
    @JsonAlias({"supplierId", "supplier_id"})
    private Long distributor_id;

    @JsonProperty("purchase_type")
    private String purchase_type;

    @JsonProperty("payment_type")
    private String payment_type;

    @JsonProperty("rate_type")
    private String rate_type;

    @JsonProperty("tax_type")
    private String tax_type;

    private List<PurchaseItemRequest> medicines;
}
