export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { courseName } = req.body;
  const cleanName = String(courseName || "cours")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const roomUrl = `https://meet.jit.si/JAMBOUYO-${cleanName}-${Date.now()}`;

  return res.status(200).json({ success: true, roomUrl });
}
