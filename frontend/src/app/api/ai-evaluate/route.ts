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

  // Mode par défaut : analyse instantanée (< 1 s) construite à partir des notes et commentaires.
  // Pour utiliser un modèle Ollama (lent sans GPU), définir AI_MODE=ollama dans .env.local.
  if (process.env.AI_MODE !== 'ollama') {
    return NextResponse.json(analyseRapide(evaluation, moyenneCalculee));
  }

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
            content: PROMPT_SYSTEME,
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
    // Le tableau est assemblé ici (pas par le modèle) : moins de jetons générés, donc une analyse plus rapide
    const { syntheseGlobale, ...reste } = parsed;
    const syntheseTableau = [{
      salarie: evaluation.salarieName ?? 'Le salarié',
      point1_pointsForts: parsed.pointsForts.join(' ; '),
      point2_axesAmelioration: parsed.axesAmelioration.join(' ; '),
      point3_syntheseMoyenne: String(syntheseGlobale ?? ''),
    }];
    return NextResponse.json({
      ...reste,
      syntheseTableau,
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

// ---------- Analyse instantanée (sans modèle) ----------
function extraitCommentaire(texte: string): string {
  const propre = texte.replace(/\s+/g, ' ').trim();
  if (!propre) return '';
  const phrase = propre.split(/(?<=[.!?])\s/)[0];
  return phrase.length > 110 ? `${phrase.slice(0, 107).trimEnd()}…` : phrase;
}

function analyseRapide(evaluation: EvaluationInput, moyenne: number) {
  const notes = evaluation.criteres
    .map(c => {
      const m = c.note.match(/(\d+(\.\d+)?)/);
      return m ? { nom: c.nom.trim(), valeur: parseFloat(m[1]), commentaire: extraitCommentaire(c.commentaire) } : null;
    })
    .filter((n): n is { nom: string; valeur: number; commentaire: string } => n !== null);

  // Tri stable : à égalité de note, un critère commenté passe avant
  const poids = (n: { valeur: number; commentaire: string }) => n.valeur + (n.commentaire ? 0.01 : 0);
  const meilleurs = [...notes].sort((a, b) => poids(b) - poids(a)).slice(0, 3);
  const noms = new Set(meilleurs.map(n => n.nom));
  const faibles = [...notes].sort((a, b) => poids(a) - poids(b)).filter(n => !noms.has(n.nom)).slice(0, 3);

  const pointsForts = meilleurs.map(n =>
    `${n.nom} : ${n.valeur}/5${n.commentaire ? ` — ${n.commentaire}` : ''}`
  );

  const axesAmelioration = faibles.map(n => {
    if (n.valeur >= 4.5) return `Consolider « ${n.nom} » (${n.valeur}/5) et élargir les responsabilités associées`;
    if (n.valeur < 3) return `Priorité : renforcer « ${n.nom} » (${n.valeur}/5)${n.commentaire ? ` — ${n.commentaire}` : ''}`;
    return `Progresser sur « ${n.nom} » (${n.valeur}/5)${n.commentaire ? ` — ${n.commentaire}` : ''}`;
  });

  let niveau: string;
  let recommandation: string;
  let echeance: string;
  if (moyenne >= 4.5) { niveau = 'excellent'; recommandation = 'profil à titulariser'; echeance = '3 mois'; }
  else if (moyenne >= 4) { niveau = 'très satisfaisant'; recommandation = 'titularisation conseillée'; echeance = '3 mois'; }
  else if (moyenne >= 3) { niveau = 'satisfaisant'; recommandation = 'titularisation à confirmer après suivi'; echeance = '2 mois'; }
  else if (moyenne >= 2.5) { niveau = 'mitigé'; recommandation = 'renouvellement de la période d’essai à envisager'; echeance = '1 mois'; }
  else { niveau = 'insuffisant'; recommandation = 'réserves importantes, rupture à examiner'; echeance = '15 jours'; }

  const nom = evaluation.salarieName || 'Le salarié';
  const syntheseGlobale = `${nom} obtient ${moyenne.toFixed(1)}/5 sur ${notes.length} critères : niveau ${niveau}, ${recommandation}.`;

  const planAccompagnement = (faibles.length ? faibles : meilleurs).slice(0, 3).map((n, i) => {
    const eleve = n.valeur >= 4.5;
    return {
      action: eleve ? `Confier un projet valorisant lié à « ${n.nom} »` : `Plan de progression sur « ${n.nom} »`,
      objectif: eleve ? `Maintenir ${n.valeur}/5 sur des tâches plus complexes` : `Passer de ${n.valeur}/5 à ${Math.min(5, Math.ceil(n.valeur) + 1)}/5`,
      echeance: i === 0 ? echeance : i === 1 ? '3 mois' : '6 mois',
      moyens: eleve ? 'Tutorat, nouvelles responsabilités' : 'Point hebdomadaire, formation ciblée',
    };
  });

  return {
    source: 'ia' as const,
    moyenneGlobale: moyenne,
    pointsForts,
    axesAmelioration,
    planAccompagnement,
    syntheseTableau: [{
      salarie: nom,
      point1_pointsForts: pointsForts.join(' ; '),
      point2_axesAmelioration: axesAmelioration.join(' ; '),
      point3_syntheseMoyenne: syntheseGlobale,
    }],
  };
}

const PROMPT_SYSTEME =`Tu es un consultant RH senior, spécialisé dans l'évaluation de fin de période d'essai. Tu rédiges une analyse destinée à la direction RH pour l'aider à décider (titularisation, renouvellement ou rupture).

DONNÉES : tu reçois le salarié, son poste, la moyenne calculée (sur 5), la liste des critères avec leur note et le commentaire du responsable, ainsi que deux listes déjà triées : "criteresLesMieuxNotes" et "criteresLesPlusFaibles".

À PRODUIRE (JSON demandé) :
1. pointsForts : exactement 3 points forts. Base-toi sur "criteresLesMieuxNotes" et les commentaires positifs. Chaque point reformule le critère en un constat concret du poste (ex. "Autonomie solide dans la préparation des commandes, notée 5/5"), jamais un simple mot isolé comme "Travail".
2. axesAmelioration : exactement 3 axes. Base-toi sur "criteresLesPlusFaibles" et les commentaires critiques. Si toutes les notes sont élevées (moyenne >= 4,5), formule des points de vigilance ou de montée en compétence (consolider, élargir les responsabilités), sans inventer de faiblesse ni exagérer. Chaque axe est différent des points forts.
3. syntheseGlobale : une seule phrase incluant la moyenne et une recommandation prudente (ex. "profil à titulariser", "à suivre", "réserves à lever").
4. planAccompagnement : exactement 3 actions concrètes, chacune avec action, objectif mesurable, échéance réaliste (ex. "30 jours", "3 mois") et moyens (formation, tutorat, point hebdomadaire…). Les actions découlent des axes identifiés.

RÈGLES STRICTES :
- N'utilise que les informations fournies : n'invente ni fait, ni chiffre, ni événement. Cite les noms de critères exacts.
- Pas de doublons entre points forts, axes et actions. Pas de formules creuses ("bon travail", "à améliorer").
- Ton professionnel, neutre, bienveillant et factuel, vouvoiement implicite, à la troisième personne.
- Réponds uniquement en français, au format JSON demandé. Sois bref : chaque élément fait 15 mots maximum, les champs du plan (objectif, échéance, moyens) 8 mots maximum.`;

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
    syntheseGlobale: { type: 'string' },
  },
  required: ['moyenneGlobale', 'pointsForts', 'axesAmelioration', 'planAccompagnement', 'syntheseGlobale'],
};

// Données envoyées au modèle : on retire les champs vides pour réduire le temps de traitement
function donneesPourModele(evaluation: EvaluationInput, moyenneCalculee: number) {
  const notes = evaluation.criteres
    .map(c => {
      const m = c.note.match(/(\d+(\.\d+)?)/);
      return m ? { texte: `${c.nom} (${m[1]}/5)`, valeur: parseFloat(m[1]) } : null;
    })
    .filter((n): n is { texte: string; valeur: number } => n !== null);
  const decroissant = [...notes].sort((a, b) => b.valeur - a.valeur);
  const croissant = [...notes].sort((a, b) => a.valeur - b.valeur);

  return {
    salarie: evaluation.salarieName,
    poste: evaluation.poste,
    moyenneCalculee,
    criteresLesMieuxNotes: decroissant.slice(0, 5).map(n => n.texte),
    criteresLesPlusFaibles: croissant.slice(0, 5).map(n => n.texte),
    criteres: evaluation.criteres.map(c => (c.commentaire ? `${c.nom} : ${c.note} — ${c.commentaire}` : `${c.nom} : ${c.note}`)),
    appreciationGenerale: evaluation.appreciationGenerale || undefined,
    pointsForts: evaluation.pointsForts || undefined,
    axesAmelioration: evaluation.axesAmelioration || undefined,
  };
}
