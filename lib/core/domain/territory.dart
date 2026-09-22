class TerritorySelection {
  const TerritorySelection({
    required this.label,
    required this.country,
    this.autonomousCommunity,
    this.province,
    this.municipality,
    this.specificBody,
  });

  final String label;
  final String country;
  final String? autonomousCommunity;
  final String? province;
  final String? municipality;
  final String? specificBody;

  List<String> get territoryKeys {
    final keys = <String>[country];
    if (autonomousCommunity != null) {
      keys.add('$country-$autonomousCommunity');
    }
    if (province != null) {
      keys.add('$country-$autonomousCommunity-$province');
    }
    if (municipality != null) {
      keys.add('$country-$autonomousCommunity-$municipality');
    }
    return keys;
  }
}

