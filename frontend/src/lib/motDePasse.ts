/** Même règle que le backend : au moins 8 caractères, dont une lettre et un chiffre. */
export const REGLE_MOT_DE_PASSE = "Au moins 8 caractères, dont une lettre et un chiffre.";

export function erreurNouveauMotDePasse(motDePasse: string, confirmation: string): {
  nouveau?: string;
  confirmation?: string;
} {
  const erreurs: { nouveau?: string; confirmation?: string } = {};
  if (!motDePasse) {
    erreurs.nouveau = "Saisissez un nouveau mot de passe.";
  } else if (motDePasse.length < 8 || !/[A-Za-z]/.test(motDePasse) || !/\d/.test(motDePasse)) {
    erreurs.nouveau = REGLE_MOT_DE_PASSE;
  }
  if (!confirmation) {
    erreurs.confirmation = "Confirmez le nouveau mot de passe.";
  } else if (confirmation !== motDePasse) {
    erreurs.confirmation = "Les deux mots de passe ne correspondent pas.";
  }
  return erreurs;
}
