import { NextResponse } from 'next/server';

interface CriterionInput {
  nom: string;
  note: string;
  commentaire: string;
}

interface EvaluationInput {
  salarieName?: string;
  poste: string;
  criteres: CriterionInput[];
  appreciationGenerale: string;
  pointsForts: string;
  axesAmelioration: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isText = (value: unknown, maxLength: number): value is string =>
  typeof value === 'string' && value.length <= maxLength;

const isOptionalText = (value: unknown, maxLength: number): value is string | undefined =>
  value === undefined || (typeof value === 'string' && value.length <= maxLength);

function validateEvaluation(value: unknown): EvaluationInput | null {
  if (
    !isRecord(value) ||
    !Array.isArray(value.criteres) ||
    value.criteres.length === 0 ||
    value.criteres.length > 50
  ) {
    return null;
  }

  const criteres: CriterionInput[] = [];
  for (const criterion of value.criteres) {
    if (
      !isRecord(criterion) ||
      !isText(criterion.nom, 200) ||
      !isText(criterion.note, 40) ||
      !isOptionalText(criterion.commentaire, 1000)
    ) {
      return null;
    }

    criteres.push({
      nom: criterion.nom,
      note: criterion.note,
      commentaire: typeof criterion.commentaire === 'string' ? criterion.commentaire : '',
    });
  }

  const salarieName = typeof value.salarieName === 'string' ? value.salarieName.slice(0, 100) : 'Le salarié';
  const poste = typeof value.poste === 'string' ? value.poste.slice(0, 200) : 'Poste non renseigné';
  const appreciationGenerale = typeof value.appreciationGenerale === 'string' ? value.appreciationGenerale.slice(0, 3000) : '';
  const pointsForts = typeof value.pointsForts === 'string' ? value.pointsForts.slice(0, 2000) : '';
  const axesAmelioration = typeof value.axesAmelioration === 'string' ? value.axesAmelioration.slice(0, 2000) : '';

  return {
    salarieName,
    poste,
    criteres,
    appreciationGenerale,
    pointsForts,
    axesAmelioration,
  };
}

const BACKEND_API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api').replace(/\/$/, '');


async function utilisateurConnecte(request: Request): Promise<boolean> {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return false;
  try {
    const reponse = await fetch(`${BACKEND_API_URL}/admins`, {
      headers: { Authorization: authorization },
      cache: 'no-store',
    });
    return reponse.ok;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!(await utilisateurConnecte(request))) {
    return NextResponse.json({ error: 'Analyse IA réservée aux administrateurs.' }, { status: 403 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'La requête reçue est invalide.' }, { status: 400 });
  }

  const evaluation = validateEvaluation(body);
  if (!evaluation) {
    return NextResponse.json(
      { error: 'Renseignez au moins une note, un commentaire ou une appréciation avant de lancer l’analyse.' },
      { status: 400 }
    );
  }

  // Calcul direct de la moyenne à partir des notes reçues
  const validNotes = evaluation.criteres
    .map(c => {
      const match = c.note.match(/(\d+(\.\d+)?)/);
      return match ? parseFloat(match[1]) : null;
    })
    .filter((n): n is number => n !== null && !isNaN(n));

  const moyenneCalculee = validNotes.length > 0
    ? parseFloat((validNotes.reduce((a, b) => a + b, 0) / validNotes.length).toFixed(2))
    : 3.5;

  const apiKey = process.env.OPENAI_API_KEY;

  // Si pas de clé OpenAI, génération d'analyse intelligente locale sans erreur
  if (!apiKey) {
    // Top notes (points forts)
    const sortedCriteres = [...evaluation.criteres]
      .filter(c => !c.note.includes('Non évalué'))
      .sort((a, b) => (parseFloat(b.note) || 0) - (parseFloat(a.note) || 0));

    const topPoints = sortedCriteres.slice(0, 3).map(c => `${c.nom} (${c.note}) - Démontre une solide régularité opérationnelle.`);
    const bottomPoints = [...sortedCriteres].reverse().slice(0, 3).map(c => `${c.nom} (${c.note}) - Nécessite un suivi et un accompagnement ciblé.`);

    const fallbackResult = {
      source: 'modele-local', // pas d'IA : texte générique, seule la moyenne et le classement des notes sont calculés
      moyenneGlobale: moyenneCalculee,
      pointsForts: topPoints.length > 0 ? topPoints : [
        "Compréhension des objectifs et intégration professionnelle",
        "Rigueur dans l'exécution et respect des délais",
        "Sens de la collaboration et esprit d'équipe"
      ],
      axesAmelioration: bottomPoints.length > 0 ? bottomPoints : [
        "Développement de l'autonomie sur les dossiers complexes",
        "Communication proactive lors d'imprévus ou de blocages",
        "Approfondissement de la maîtrise des outils métier"
      ],
      planAccompagnement: [
        {
          action: "Point d'étape bimensuel avec le manager",
          objectif: "Suivre la montée en compétences et lever les blocages",
          echeance: "1 mois",
          moyens: "Entretien N+1 (30 min tous les 15j)"
        },
        {
          action: "Formation pratique et partage de bonnes pratiques",
          objectif: "Consolider la méthodologie et l'autonomie",
          echeance: "2 mois",
          moyens: "Binôme tuteur / module e-learning"
        },
        {
          action: "Bilan intermédiaire de progression",
          objectif: "Mesurer l'atteinte des jalons fixés",
          echeance: "3 mois",
          moyens: "Fiche d'objectifs réajustée"
        }
      ],
      syntheseTableau: [
        {
          salarie: evaluation.salarieName || 'Collaborateur',
          point1_pointsForts: topPoints[0] || 'Maîtrise technique et sens du service',
          point2_axesAmelioration: bottomPoints[0] || 'Autonomie et gestion des priorités',
          point3_syntheseMoyenne: `Moyenne : ${moyenneCalculee}/5 — Profil en progression favorable avec potentiel confirmé.`
        }
      ]
    };

    return NextResponse.json(fallbackResult);
  }

  // Appel OpenAI avec JSON Schema complet
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Tu es un expert RH de haut niveau. À partir des 24 critères d\'évaluation et commentaires remplis par le responsable, tu dois obligatoirement générer :\n1. L\'identification précise des 3 points forts clés.\n2. La détection des 3 axes d\'amélioration prioritaires et la moyenne globale calculée.\n3. Une synthèse générale concise présentée sous forme de tableau (1 Salarié, 1 Points forts, 2 Axes d\'amélioration, 3 Synthèse globale).\n4. Un plan d\'accompagnement en 3 actions concrètes.\nRéponds en français avec un ton professionnel et constructif.',
          },
          { role: 'user', content: JSON.stringify({ ...evaluation, moyenneCalculee }) },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'evaluation_analysis',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                moyenneGlobale: { type: 'number' },
                pointsForts: { type: 'array', items: { type: 'string' } },
                axesAmelioration: { type: 'array', items: { type: 'string' } },
                planAccompagnement: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      action: { type: 'string' },
                      objectif: { type: 'string' },
                      echeance: { type: 'string' },
                      moyens: { type: 'string' },
                    },
                    required: ['action', 'objectif', 'echeance', 'moyens'],
                    additionalProperties: false,
                  },
                },
                syntheseTableau: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      salarie: { type: 'string' },
                      point1_pointsForts: { type: 'string' },
                      point2_axesAmelioration: { type: 'string' },
                      point3_syntheseMoyenne: { type: 'string' },
                    },
                    required: ['salarie', 'point1_pointsForts', 'point2_axesAmelioration', 'point3_syntheseMoyenne'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['moyenneGlobale', 'pointsForts', 'axesAmelioration', 'planAccompagnement', 'syntheseTableau'],
              additionalProperties: false,
            },
          },
        },
        max_tokens: 1400,
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      throw new Error('Erreur API OpenAI');
    }

    const completion = await response.json();
    const content = completion.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content);
    return NextResponse.json({ ...parsed, source: 'ia', moyenneGlobale: parsed.moyenneGlobale || moyenneCalculee });
  } catch {
    // L'appel à l'IA a échoué : résultat générique, signalé comme tel à l'utilisateur
    return NextResponse.json({
      source: 'modele-local',
      moyenneGlobale: moyenneCalculee,
      pointsForts: [
        "Compréhension des objectifs et intégration professionnelle",
        "Rigueur dans l'exécution et respect des délais",
        "Sens de la collaboration et esprit d'équipe"
      ],
      axesAmelioration: [
        "Développement de l'autonomie sur les dossiers complexes",
        "Communication proactive lors d'imprévus ou de blocages",
        "Approfondissement de la maîtrise des outils métier"
      ],
      planAccompagnement: [
        {
          action: "Point d'étape bimensuel avec le manager",
          objectif: "Suivre la montée en compétences et lever les blocages",
          echeance: "1 mois",
          moyens: "Entretien N+1 (30 min tous les 15j)"
        },
        {
          action: "Formation pratique et partage de bonnes pratiques",
          objectif: "Consolider la méthodologie et l'autonomie",
          echeance: "2 mois",
          moyens: "Binôme tuteur / module e-learning"
        }
      ],
      syntheseTableau: [
        {
          salarie: evaluation.salarieName || 'Collaborateur',
          point1_pointsForts: "Rigueur technique, bonne adhésion aux processus et implication dans l'équipe.",
          point2_axesAmelioration: "Renforcer l'autonomie décisionnelle et optimiser la gestion du temps.",
          point3_syntheseMoyenne: `Moyenne générale : ${moyenneCalculee}/5 — Bilan positif avec perspectives de confirmation.`
        }
      ]
    });
  }
}
