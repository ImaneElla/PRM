package com.premium.essai.controller;

import com.premium.essai.dto.AdminDTO;
import com.premium.essai.model.User;
import com.premium.essai.service.AdminService;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admins")
@RequiredArgsConstructor
public class AdminController {

    public record InvitationAdminRequest(@NotBlank String prenom, @NotBlank String nom, @NotBlank String email) {
    }

    private final AdminService adminService;

    @GetMapping
    public List<AdminDTO> lister() {
        return adminService.lister();
    }

    @PostMapping("/invitations")
    public ResponseEntity<AdminDTO> inviter(@RequestBody InvitationAdminRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(adminService.inviter(request.prenom(), request.nom(), request.email()));
    }

    @PostMapping("/{id}/invitation")
    public AdminDTO renvoyerInvitation(@PathVariable Long id) {
        return adminService.renvoyerInvitation(id);
    }

    @PostMapping("/{id}/desactivation")
    public AdminDTO desactiver(@PathVariable Long id, @AuthenticationPrincipal User demandeur) {
        return adminService.desactiver(id, demandeur);
    }

    @PostMapping("/{id}/reactivation")
    public AdminDTO reactiver(@PathVariable Long id, @AuthenticationPrincipal User demandeur) {
        return adminService.reactiver(id, demandeur);
    }
}
