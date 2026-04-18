package com.ujjwalMedical.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class PurchaseItemRequest {

    @JsonProperty("actual_price")
    private Double actual_price;

    @JsonProperty("medicine_id")
    private Long medicine_id;

    @JsonProperty("medicine_name")
    private String medicine_name;

    private String batch;

    private Integer qty;

    private Double mrp;

    @JsonProperty("unit_price")
    private Double unit_price;

    @JsonProperty("net_unit_price")
    private Double net_unit_price;

    private Double tax;

    private String expiry;
}
