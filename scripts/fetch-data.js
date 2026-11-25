// Downloads cafes and fitness places in LA from OpenStreetMap (Overpass API),
// counts them per Neighborhood Council, and writes small map-ready files to public/data/.
// Run with: npm run fetch-data
import fs from 'node:fs'
import path from 'node:path'
import * as d3 from 'd3'

const RAW = 'scripts/raw/osm-places.json'
const OUT = 'public/data'
const BBOX = '33.70,-118.67,34.34,-118.15' // south,west,north,east

const QUERY = `[out:json][timeout:120];
(
  nwr["amenity"="cafe"](${BBOX});
  nwr["leisure"~"^(fitness_centre|sports_centre|swimming_pool)$"](${BBOX});
  nwr["sport"~"yoga|pilates|boxing"](${BBOX});
);
out center tags;`

const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

async function download() {
  if (fs.existsSync(RAW)) return JSON.parse(fs.readFileSync(RAW, 'utf8'))
  fs.mkdirSync(path.dirname(RAW), { recursive: true })
  for (const url of MIRRORS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'User-Agent': 'la-coffee-fitness-maps' },
        body: new URLSearchParams({ data: QUERY }),
      })
      if (!res.ok) throw new Error(`${url} -> ${res.status}`)
      const json = await res.json()
      fs.writeFileSync(RAW, JSON.stringify(json))
      return json
    } catch (err) {
      console.warn('Overpass failed, trying next mirror:', err.message)
    }
  }
  throw new Error('All Overpass mirrors failed. Try again in a minute.')
}

function classify(tags) {
  if (tags.amenity === 'cafe') return { group: 'cafe', category: 'cafe' }
  const sport = tags.sport || ''
  let category = 'gym'
  if (/yoga/.test(sport)) category = 'yoga'
  else if (/pilates/.test(sport)) category = 'pilates'
  else if (/boxing/.test(sport)) category = 'boxing'
  else if (tags.leisure === 'swimming_pool' || /swimming/.test(sport)) category = 'pool'
  else if (tags.leisure === 'sports_centre') category = 'sports centre'
  return { group: 'fitness', category }
}

const round = (n) => Math.round(n * 1e5) / 1e5

const osm = await download()
const boundary = JSON.parse(fs.readFileSync('scripts/neighborhoods-source.geojson', 'utf8'))

// Drop stray sliver polygons outside the city (Sunland-Tujunga has 8 near Palmdale)
const [S, W, N, E] = BBOX.split(',').map(Number)
const inCity = (poly) => poly[0].every(([lon, lat]) => lon >= W && lon <= E && lat >= S && lat <= N)
for (const f of boundary.features) {
  f.geometry.coordinates = f.geometry.coordinates.filter(inCity)
}

// 1. Points: one small record per place, rounded coordinates, unnamed pools dropped
const seen = new Set()
const places = []
for (const el of osm.elements) {
  const lat = el.lat ?? el.center?.lat
  const lon = el.lon ?? el.center?.lon
  if (lat == null || lon == null) continue
  const tags = el.tags || {}
  const { group, category } = classify(tags)
  const name = tags.name || ''
  if (!name && category === 'pool') continue
  const key = `${name}|${round(lat)}|${round(lon)}`
  if (seen.has(key)) continue
  seen.add(key)
  places.push({ name, group, category, lat: round(lat), lon: round(lon) })
}

// 2. Neighborhood counts: bounding box pre-filter, then point-in-polygon
const R = 6371 // km
const feats = boundary.features.map((f) => ({
  f,
  bounds: d3.geoBounds(f),
  cafes: 0,
  fitness: 0,
}))
const inside = [] // places that fall inside a City of LA neighborhood
for (const p of places) {
  for (const n of feats) {
    const [[w, s], [e, no]] = n.bounds
    if (p.lon < w || p.lon > e || p.lat < s || p.lat > no) continue
    if (d3.geoContains(n.f, [p.lon, p.lat])) {
      if (p.group === 'cafe') n.cafes++
      else n.fitness++
      inside.push(p)
      break
    }
  }
}

const roundCoords = (c) => (typeof c[0] === 'number' ? [round(c[0]), round(c[1])] : c.map(roundCoords))
const neighborhoods = {
  type: 'FeatureCollection',
  features: feats.map(({ f, cafes, fitness }) => {
    const areaKm2 = d3.geoArea(f) * R * R
    const total = cafes + fitness
    return {
      type: 'Feature',
      properties: {
        name: f.properties.name,
        nc_id: f.properties.nc_id,
        cafes,
        fitness,
        total,
        area_km2: Math.round(areaKm2 * 10) / 10,
        density_per_km2: Math.round((total / areaKm2) * 10) / 10,
      },
      geometry: { type: f.geometry.type, coordinates: roundCoords(f.geometry.coordinates) },
    }
  }),
}

fs.mkdirSync(OUT, { recursive: true })
fs.writeFileSync(`${OUT}/neighborhoods.geojson`, JSON.stringify(neighborhoods))
fs.writeFileSync(`${OUT}/places.json`, JSON.stringify(inside))

const kb = (file) => Math.round(fs.statSync(`${OUT}/${file}`).size / 1024)
const byCat = d3.rollup(inside, (v) => v.length, (d) => d.category)
console.log(`places.json: ${inside.length} places, ${kb('places.json')} KB`, Object.fromEntries(byCat))
console.log(`neighborhoods.geojson: ${neighborhoods.features.length} areas, ${kb('neighborhoods.geojson')} KB`)

// Proportional symbol map: one point per neighborhood at its centroid
const centroids = neighborhoods.features.map((f) => {
  const [lon, lat] = d3.geoCentroid(f)
  const { name, cafes, fitness, total } = f.properties
  return { name, lon: round(lon), lat: round(lat), cafes, fitness, total }
})
fs.writeFileSync(`${OUT}/neighborhood-centroids.json`, JSON.stringify(centroids))

// Page 4 arcs: each fitness place -> its nearest café ("sweat, then sip")
const cafes = inside.filter((p) => p.group === 'cafe')
const arcs = inside
  .filter((p) => p.group === 'fitness')
  .map((p) => {
    let best = null
    let bestD = Infinity
    for (const c of cafes) {
      const d = d3.geoDistance([p.lon, p.lat], [c.lon, c.lat]) // radians on the sphere
      if (d < bestD) { bestD = d; best = c }
    }
    return {
      from: p.name || p.category,
      category: p.category,
      to: best.name || 'Café',
      source: [p.lon, p.lat],
      target: [best.lon, best.lat],
      km: Math.round(bestD * R * 100) / 100,
    }
  })
fs.writeFileSync(`${OUT}/arcs.json`, JSON.stringify(arcs))
console.log(`arcs.json: ${arcs.length} arcs, ${kb('arcs.json')} KB`)
