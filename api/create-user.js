export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { email, password, full_name, role } = req.body;

    if (!["student", "teacher", "admin"].includes(role)) {
      return res.status(400).json({ error: "Role invalide" });
    }

    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      return res.status(500).json({ error: "Variables Supabase manquantes" });
    }

    const createUser = await fetch(`${url}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": serviceKey,
        "Authorization": `Bearer ${serviceKey}`
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, role }
      })
    });

    const userData = await createUser.json();
    if (!createUser.ok) return res.status(400).json({ error: userData.msg || userData.error_description || "Création impossible" });

    const insertProfile = await fetch(`${url}/rest/v1/profiles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": serviceKey,
        "Authorization": `Bearer ${serviceKey}`,
        "Prefer": "return=representation"
      },
      body: JSON.stringify({
        id: userData.id,
        email,
        full_name,
        role
      })
    });

    const profileData = await insertProfile.json();
    if (!insertProfile.ok) return res.status(400).json({ error: profileData.message || "Profil non créé" });

    return res.status(200).json({ success: true, user: userData, profile: profileData });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
