package com.ujjwalMedical.dto;

import lombok.Data;

@Data
public class PurchaseItemRequest {
    private Long medicine_id;
    private String medicine_name;
    private String batch;
    private Integer qty;
    private Double unit_price;
    private Double net_unit_price;
    private Double tax;
    private String expiry;
}
