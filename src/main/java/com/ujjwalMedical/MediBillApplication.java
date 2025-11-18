package com.ujjwalMedical;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.ComponentScan;

@SpringBootApplication
@EnableJpaRepositories("com.ujjwalMedical.repository")
@EntityScan("com.ujjwalMedical.entity")
@ComponentScan("com.ujjwalMedical")
public class MediBillApplication {
	public static void main(String[] args) {
		SpringApplication.run(MediBillApplication.class, args);
	}
}
