/**
 * StatsManager — auto-computed atlas statistics.
 *
 * Reads every registered layer's features and derives publication-quality
 * numbers for the dashboard overlay: total protected areas, largest / smallest,
 * recent notifications, coverage %, feature counts by category.
 *
 * Everything is computed at render time — nothing is hardcoded.
 */

export class StatsManager {
  constructor(atlas) { this.atlas = atlas; }

  /**
   * Compute the dashboard payload.
   * @returns {{
   *   districts: number,
   *   divisions: number,
   *   protectedAreas: number,
   *   nationalParks: number,
   *   tigerReserves: number,
   *   wildlifeSanctuaries: number,
   *   ramsarSites: number,
   *   wetlands: number,
   *   biosphereReserves: number,
   *   totalPAArea: number,
   *   coveragePct: number,
   *   largest: {name:string, area:number, layer:string} | null,
   *   smallest: {name:string, area:number, layer:string} | null,
   *   mostRecent: {name:string, year:string, layer:string} | null,
   *   pointOnlyCount: number,
   * }}
   */
  compute() {
    const A = this.atlas;
    const layers = A.layers.list();
    const layer = (id) => A.layers.features(id) ?? [];

    const districts = layer('districts').length;
    const divisions = new Set(layer('districts').map(f => f.properties.division)).size;

    const np    = layer('national-parks');
    const tr    = layer('tiger-reserves');
    const wls   = layer('wildlife-sanctuaries');
    const ram   = layer('ramsar-sites');
    const wet   = layer('wetlands');
    const bio   = layer('biosphere-reserves');

    const pa = [...np, ...tr, ...wls];  // Ramsar/wetlands may overlap; not summed
    const areaSum = (arr) => arr.reduce((s, f) => s + (f.properties?.area ?? 0), 0);

    // Rajasthan area for coverage percentage — 342,239 km² (Census 2011).
    const RAJASTHAN_AREA_KM2 = 342239;

    // Largest / smallest across NP + TR + WLS (protected areas proper).
    let largest = null, smallest = null;
    for (const arr of [[np,'national-parks'], [tr,'tiger-reserves'], [wls,'wildlife-sanctuaries']]) {
      for (const f of arr[0]) {
        const a = f.properties?.area;
        if (a == null || a === 0) continue;
        const rec = { name: f.properties.name, area: a, layer: arr[1] };
        if (!largest  || a > largest.area)  largest  = rec;
        if (!smallest || a < smallest.area) smallest = rec;
      }
    }

    // Most recently established.
    let mostRecent = null;
    for (const arr of [[np,'national-parks'], [tr,'tiger-reserves'], [wls,'wildlife-sanctuaries'],
                       [ram,'ramsar-sites']]) {
      for (const f of arr[0]) {
        const y = f.properties?.established ?? f.properties?.designated;
        if (!y) continue;
        const year = String(y).slice(0, 4);
        if (!mostRecent || year > mostRecent.year) {
          mostRecent = { name: f.properties.name, year, layer: arr[1] };
        }
      }
    }

    // Count point-only features across env layers.
    let pointOnlyCount = 0;
    for (const l of layers) {
      if (l.category !== 'environment') continue;
      for (const f of A.layers.features(l.id)) {
        if (f.properties?.geometryQuality === 'point') pointOnlyCount++;
      }
    }

    return {
      districts,
      divisions,
      protectedAreas: np.length + tr.length + wls.length,
      nationalParks: np.length,
      tigerReserves: tr.length,
      wildlifeSanctuaries: wls.length,
      ramsarSites: ram.length,
      wetlands: wet.length,
      biosphereReserves: bio.length,
      totalPAArea: areaSum(pa),
      coveragePct: (areaSum(pa) / RAJASTHAN_AREA_KM2) * 100,
      largest, smallest, mostRecent,
      pointOnlyCount,
    };
  }
}
