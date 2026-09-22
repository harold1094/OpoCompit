import '../../../core/domain/territory.dart';

const firefighterOppositionId = 'firefighters_es';
const firefighterOppositionName = 'Bomberos';

const availableTerritories = <TerritorySelection>[
  TerritorySelection(
    label: 'España',
    country: 'ES',
  ),
  TerritorySelection(
    label: 'Región de Murcia',
    country: 'ES',
    autonomousCommunity: 'Murcia',
  ),
  TerritorySelection(
    label: 'Bomberos Cartagena',
    country: 'ES',
    autonomousCommunity: 'Murcia',
    province: 'Murcia',
    municipality: 'Cartagena',
    specificBody: 'Bomberos Cartagena',
  ),
  TerritorySelection(
    label: 'Comunidad de Madrid',
    country: 'ES',
    autonomousCommunity: 'Madrid',
  ),
];

