export default async function handler(req, res) {
  try {
    const { input, restrictAU = "1", biasLat, biasLng, biasRadius } = req.query || {};
    if (!input) return res.status(400).json({ error: "Missing ?input" });

    const params = new URLSearchParams({
      input,
      language: "en-AU",
      key: process.env.GOOGLE_API_KEY
    });

    if (restrictAU !== "0") params.append("components", "country:AU");
    if (biasLat && biasLng && biasRadius) {
      params.append("locationbias", `circle:${biasRadius}@${biasLat},${biasLng}`);
    }

    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`;
    const r = await fetch(url);
    const data = await r.json();

    // CORS (leave * while testing; later you can set your domain)
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") return res.status(204).end();

    return res.status(200).json(data);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Autocomplete failed." });
  }
}
