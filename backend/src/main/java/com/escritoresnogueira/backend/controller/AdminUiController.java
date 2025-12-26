package com.escritoresnogueira.backend.controller;

import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.InputStream;

@Controller
public class AdminUiController {

    // Serve the SPA index directly from the classpath to avoid forward loops
    @GetMapping({"/admin-ui", "/admin-ui/"})
    public void adminUi(HttpServletResponse response) throws IOException {
        ClassPathResource index = new ClassPathResource("static/admin-ui/index.html");
        if (!index.exists()) {
            response.sendError(HttpStatus.NOT_FOUND.value(), "Admin UI not found");
            return;
        }

        response.setContentType("text/html;charset=UTF-8");
        try (InputStream in = index.getInputStream()) {
            in.transferTo(response.getOutputStream());
        }
    }
}
