function parseComponents(components = []) {
  const map = {};
  for (const c of components) {
    for (const t of c.types) {
      map[t] = c.long_name || c.short_name;
    }
  }
  return {
    subpremise: map.subpremise || null,                 // unit/shop
    floor: map.floor || null,                            // level
    street_number: map.street_number || null,
    route: map.route || null,                            // street name
    locality: map.locality || map.postal_town || null,   // suburb/city
    state: map.administrative_area_level_1 || null,
    postcode: map.postal_code || null,
    country: map.country || null
  };
}

function composeAU({ comps, unit, level }) {
  const unitOrSub = unit || comps.subpremise;
  const levelOrFloor = level || comps.floor;

  const line1Parts = [];
  if (unitOrSub) line1Parts.push(unitOrSub);
  if (levelOrFloor) line1Parts.push(`Level ${levelOrFloor}`);

  const street = [comps.street_number, comps.route].filter(Boolean).join(" ");
  if (street) line1Parts.push(street);

  const line2 = [comps.locality, comps.state, comps.postcode].filter(Boolean).join(" ");

  return {
    line1: line1Parts.join(", "),
    line2,
    country: comps.country || "Australia"
  };
}

export default async function handler(req, res) {
  try {
    const { place_id, unit = "", level = "" } = req.query || {};
    if (!place_id) return res.status(400).json({ error: "Missing ?place_id" });

    const params = new URLSearchParams({
      place_id,
      fields: ["address_component", "formatted_address", "geometry"].join(","),
      language: "en-AU",
      key: process.env.GOOGLE_API_KEY
    });

    const url = `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`;
    const r = await fetch(url);
    const data = await r.json();

    if (data.status !== "OK") {
      return res.status(400).json({ error: "Places Details error", detail: data.status, data });
    }

    const comps = parseComponents(data.result.address_components || []);
    const composed = composeAU({ comps, unit: unit.trim() || null, level: level.trim() || null });

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") return res.status(204).end();

    return res.status(200).json({
      place_id,
      formatted_address: data.result.formatted_address,
      components: comps,
      composed
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Place details failed." });
  }
}
