package com.premium.essai.service;

import com.premium.essai.model.PeriodeEvaluation;
import com.premium.essai.model.User;
import com.premium.essai.model.enums.RecommandationEvaluateur;

public interface MailService {
    boolean sendRappelJ21(PeriodeEvaluation periode);
    boolean sendRappelJ14(PeriodeEvaluation periode);
    boolean sendRappelJ7(PeriodeEvaluation periode);
    boolean sendAlerteRetard(PeriodeEvaluation periode, int joursRetard);
    /* E-mail à TOUS les administrateurs actifs quand un responsable remplit l'évaluation. */
    void sendNotificationFormulaireRempliAuxAdmins(PeriodeEvaluation periode, RecommandationEvaluateur recommandation);
    /* Confirmation au responsable qui vient de remplir l'évaluation. */
    void sendConfirmationSoumissionAuResponsable(PeriodeEvaluation periode);
    void sendConfirmationRH(PeriodeEvaluation periode, String decision);
    boolean sendInvitationResponsable(User user, String motDePasseTemporaire);
    boolean sendReinitialisationMotDePasse(User user, String jeton);
    boolean sendInvitationAdmin(User user, String jeton);
}
