package com.ujjwalMedical.dto;

public class SupplierResponse {

    private Long id;
    private String name;
    private String contact;  // frontend wants this
    private String phone;    // frontend wants this
    private String email;

    public SupplierResponse() {}

    public SupplierResponse(Long id, String name, String contact, String phone, String email) {
        this.id = id;
        this.name = name;
        this.contact = contact;
        this.phone = phone;
        this.email = email;
    }

    // getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getContact() { return contact; }
    public void setContact(String contact) { this.contact = contact; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
}
