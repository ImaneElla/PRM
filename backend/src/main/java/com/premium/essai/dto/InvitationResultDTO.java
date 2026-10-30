package com.premium.essai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InvitationResultDTO {

    private String statut;
    private Long responsableId;
    private String email;
    private String nomComplet;
    private String message;
    private boolean emailEnvoye;
    private String motDePasseTemporaire;
    private Integer ligne;
}
