const categoryLabels: Record<string, string> = {
  fires: 'Incendios',
  legislation: 'Legislación',
  rescue: 'Rescate y salvamento',
  prevention: 'Prevención',
  vehicles: 'Vehículos y equipos',
  first_aid: 'Primeros auxilios',
  hazardous_materials: 'Materias peligrosas',
  hazmat: 'Materias peligrosas',
  building: 'Construcción',
  construction: 'Construcción',
  hydraulics: 'Hidráulica',
  physics: 'Física',
  chemistry: 'Química',
  platform: 'Plataforma',
  platform_rules: 'Plataforma',
  'platform rules': 'Plataforma',
  general: 'Conocimientos generales',
};

export function questionCategoryLabel(categoryId: string): string {
  return categoryLabels[categoryId] ?? categoryId.replaceAll('_', ' ');
}
