export interface CriterionItem {
  id: string;
  label: string;
}

export const competencesProItems: CriterionItem[] = [
  { id: 'cp1', label: 'Compréhension du poste, des missions et du périmètre' },
  { id: 'cp2', label: 'Qualité du travail rendu' },
  { id: 'cp3', label: 'Respect des délais et rythme d’exécution' },
  { id: 'cp4', label: 'Capacité d’analyse et de résolution des problèmes' },
  { id: 'cp5', label: 'Prise en main des outils et méthodes de travail' },
  { id: 'cp6', label: 'Application des procédures et consignes internes' },
  { id: 'cp7', label: 'Organisation et gestion des priorités' },
  { id: 'cp8', label: 'Fiabilité des informations transmises' },
  { id: 'cp9', label: 'Capacité à proposer des améliorations' },
  { id: 'cp10', label: 'Adaptation aux exigences du poste' },
];

export const aptitudesPersoItems: CriterionItem[] = [
  { id: 'ap1', label: 'Adaptation à l’environnement de travail' },
  { id: 'ap2', label: 'Implication et engagement dans le travail' },
  { id: 'ap3', label: 'Sens du service et orientation client' },
  { id: 'ap4', label: 'Réactivité et prise d’initiative' },
  { id: 'ap5', label: 'Autonomie progressive' },
  { id: 'ap6', label: 'Ponctualité et assiduité' },
  { id: 'ap7', label: 'Conscience professionnelle' },
  { id: 'ap8', label: 'Maîtrise de soi et posture professionnelle' },
  { id: 'ap9', label: 'Esprit d’équipe et collaboration' },
  { id: 'ap10', label: 'Qualité de la communication' },
  { id: 'ap11', label: 'Respect de la hiérarchie et du cadre' },
];

export const qseItems: CriterionItem[] = [
  { id: 'qse1', label: 'Connaissance des règles et procédures QSE' },
  { id: 'qse2', label: 'Respect des consignes de sécurité' },
  { id: 'qse3', label: 'Respect de l’environnement et du matériel' },
];