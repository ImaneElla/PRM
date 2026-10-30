export const SOCIETES = [
  { code: 'GRP', label: 'GRP — Direction Générale / Services Transverses' },
  { code: 'PRO', label: 'PRO — Premium Offshore / Premium Location' },
  { code: 'SRM', label: 'SRM — Société de Réalisations Mécaniques' },
  { code: 'AFI', label: 'AFI — AFI Solutions techniques' },
  { code: 'CCI', label: 'CCI — CCI Fournitures industrielles' },
  { code: 'SCP', label: 'SCP — Services Communs Partagés / Logistique' },
] as const;

export type SocieteCode = (typeof SOCIETES)[number]['code'];

export const SOCIETE_LABELS: Record<SocieteCode, string> = Object.fromEntries(
  SOCIETES.map(({ code, label }) => [code, label])
) as Record<SocieteCode, string>;

export function getSocieteLabel(societe?: string | null): string {
  if (!societe) return SOCIETE_LABELS.GRP;
  return SOCIETE_LABELS[societe as SocieteCode] ?? societe;
}
