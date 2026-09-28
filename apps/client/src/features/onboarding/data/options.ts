import { TerritorySelection } from '@/core/domain/types';

export const FIREFIGHTER_OPPOSITION_ID = 'firefighters_es';
export const FIREFIGHTER_OPPOSITION_NAME = 'Bomberos';

export const availableTerritories: TerritorySelection[] = [
  { label: 'España', country: 'ES' },
  {
    label: 'Región de Murcia',
    country: 'ES',
    autonomousCommunity: 'Murcia',
  },
  {
    label: 'Bomberos Cartagena',
    country: 'ES',
    autonomousCommunity: 'Murcia',
    province: 'Murcia',
    municipality: 'Cartagena',
    specificBody: 'Bomberos Cartagena',
  },
  {
    label: 'Comunidad de Madrid',
    country: 'ES',
    autonomousCommunity: 'Madrid',
  },
];
