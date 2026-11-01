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

  // Analyse par un modèle Llama exécuté en local avec Ollama (aucune donnée ne quitte le serveur)
  const ollamaUrl = (process.env.OLLAMA_URL || 'http://localhost:11434').replace(/\/$/, '');
  const modele = process.env.OLLAMA_MODEL || 'llama3.2';

  const delaiMs = Number(process.env.OLLAMA_TIMEOUT_MS) || 2000;
  const debut = Date.now();
  console.log(`[ai-evaluate] Requête vers ${ollamaUrl}/api/chat (modèle ${modele}, délai ${delaiMs} ms, ${evaluation.criteres.length} critères)`);

  try {
    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modele,
        stream: false,
        // Garde le modèle en mémoire : évite ~8 s de rechargement à chaque analyse
        keep_alive: '30m',
        // Ollama contraint la réponse à ce schéma JSON
        format: SCHEMA_ANALYSE,
        options: { temperature: 0.2, num_predict: 1400 },
        messages: [
          {
            role: 'system',
            content:
              "Tu es un expert RH de haut niveau. À partir des 24 critères d'évaluation et commentaires remplis par le responsable, tu dois obligatoirement générer :\n1. L'identification précise des 3 points forts clés.\n2. La détection des 3 axes d'amélioration prioritaires et la moyenne globale calculée.\n3. Une synthèse générale concise présentée sous forme de tableau (1 Salarié, 1 Points forts, 2 Axes d'amélioration, 3 Synthèse globale).\n4. Un plan d'accompagnement en 3 actions concrètes.\nRéponds uniquement en français, ton professionnel, au format JSON demandé. Sois très concis : chaque élément fait une phrase courte (20 mots maximum).",
          },
          { role: 'user', content: JSON.stringify(donneesPourModele(evaluation, moyenneCalculee)) },
        ],
      }),
      // Délai d'attente : 2 s par défaut, modifiable avec OLLAMA_TIMEOUT_MS
      signal: AbortSignal.timeout(delaiMs),
    });

    if (!response.ok) {
      const detail = (await response.text().catch(() => '')).slice(0, 200);
      throw new Error(`Ollama a répondu ${response.status} ${detail}`);
    }

    const completion = await response.json();
    const parsed = JSON.parse(completion.message?.content ?? '');
    if (!Array.isArray(parsed.pointsForts) || !Array.isArray(parsed.axesAmelioration)) {
      throw new Error('Réponse du modèle incomplète');
    }
    console.log(`[ai-evaluate] Analyse reçue en ${Date.now() - debut} ms (${completion.eval_count ?? '?'} jetons générés)`);
    return NextResponse.json({
      ...parsed,
      source: 'ia',
      // La moyenne reste celle calculée à partir des notes, pas celle « estimée » par le modèle
      moyenneGlobale: moyenneCalculee,
    });
  } catch (erreur) {
    const expire = erreur instanceof Error && (erreur.name === 'TimeoutError' || erreur.name === 'AbortError');
    const raison = erreur instanceof Error ? `${erreur.name}: ${erreur.message}` : String(erreur);
    console.error(`[ai-evaluate] Échec après ${Date.now() - debut} ms (${ollamaUrl}, modèle ${modele}) : ${raison}`);
    // Pas de résultat factice : l'erreur est renvoyée à l'écran
    const message = expire
      ? `Ollama n'a pas répondu en ${Math.round(delaiMs / 1000)} s. Augmentez OLLAMA_TIMEOUT_MS ou utilisez un modèle plus léger.`
      : `Ollama est inaccessible ou a renvoyé une réponse invalide (${raison}).`;
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

const SCHEMA_ANALYSE = {
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
      },
    },
  },
  required: ['moyenneGlobale', 'pointsForts', 'axesAmelioration', 'planAccompagnement', 'syntheseTableau'],
};

// Données envoyées au modèle : on retire les champs vides pour réduire le temps de traitement
function donneesPourModele(evaluation: EvaluationInput, moyenneCalculee: number) {
  return {
    salarie: evaluation.salarieName,
    poste: evaluation.poste,
    moyenneCalculee,
    criteres: evaluation.criteres.map(c => (c.commentaire ? `${c.nom} : ${c.note} — ${c.commentaire}` : `${c.nom} : ${c.note}`)),
    appreciationGenerale: evaluation.appreciationGenerale || undefined,
    pointsForts: evaluation.pointsForts || undefined,
    axesAmelioration: evaluation.axesAmelioration || undefined,
  };
}
