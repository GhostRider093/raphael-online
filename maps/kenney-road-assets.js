// Kit "City Kit Roads 2.0" par Kenney, licence CC0.
export const KENNEY_ROAD_FILES = [
  'bridge-pillar.glb', 'bridge-pillar-wide.glb',
  'construction-barrier.glb', 'construction-cone.glb', 'construction-light.glb',
  'light-curved.glb', 'light-curved-cross.glb', 'light-curved-double.glb',
  'light-square.glb', 'light-square-cross.glb', 'light-square-double.glb',
  'road-bend.glb', 'road-bend-barrier.glb', 'road-bend-sidewalk.glb',
  'road-bend-square.glb', 'road-bend-square-barrier.glb', 'road-bridge.glb',
  'road-crossing.glb', 'road-crossroad.glb', 'road-crossroad-barrier.glb',
  'road-crossroad-line.glb', 'road-crossroad-path.glb', 'road-curve.glb',
  'road-curve-barrier.glb', 'road-curve-intersection.glb',
  'road-curve-intersection-barrier.glb', 'road-curve-pavement.glb',
  'road-driveway-double.glb', 'road-driveway-double-barrier.glb',
  'road-driveway-single.glb', 'road-driveway-single-barrier.glb',
  'road-end.glb', 'road-end-barrier.glb', 'road-end-round.glb',
  'road-end-round-barrier.glb', 'road-intersection.glb',
  'road-intersection-barrier.glb', 'road-intersection-line.glb',
  'road-intersection-path.glb', 'road-roundabout.glb', 'road-roundabout-barrier.glb',
  'road-side.glb', 'road-side-barrier.glb', 'road-side-entry.glb',
  'road-side-entry-barrier.glb', 'road-side-exit.glb', 'road-side-exit-barrier.glb',
  'road-slant.glb', 'road-slant-barrier.glb', 'road-slant-curve.glb',
  'road-slant-curve-barrier.glb', 'road-slant-flat.glb', 'road-slant-flat-curve.glb',
  'road-slant-flat-high.glb', 'road-slant-high.glb', 'road-slant-high-barrier.glb',
  'road-split.glb', 'road-split-barrier.glb', 'road-square.glb',
  'road-square-barrier.glb', 'road-straight.glb', 'road-straight-barrier.glb',
  'road-straight-barrier-end.glb', 'road-straight-barrier-half.glb',
  'road-straight-half.glb', 'sign-highway.glb', 'sign-highway-detailed.glb',
  'sign-highway-wide.glb', 'tile-high.glb', 'tile-low.glb', 'tile-slant.glb',
  'tile-slantHigh.glb'
];

const keyFor = file => `kenneyRoad_${file.replace(/\.glb$/i, '').replace(/[^a-z0-9]+/gi, '_')}`;

export const KENNEY_ROAD_LIBRARY = Object.fromEntries(KENNEY_ROAD_FILES.map(file => {
  const isFurniture = /^(bridge-pillar|construction-|light-|sign-)/.test(file);
  return [keyFor(file), {
    url: `../assets/kenney-city-roads/${file}`,
    targetSize: isFurniture ? 15 : 34,
    label: `Kenney ${file.replace(/\.glb$/i, '').replaceAll('-', ' ')}`
  }];
}));

export const KENNEY_ROAD_PLACEMENTS = KENNEY_ROAD_FILES.map((file, index) => {
  const columns = 9;
  const column = index % columns;
  const row = Math.floor(index / columns);
  return {
    key: keyFor(file),
    x: (column - 4) * 58,
    z: (row - 3.5) * 58,
    rotation: (index % 4) * Math.PI / 2
  };
});
