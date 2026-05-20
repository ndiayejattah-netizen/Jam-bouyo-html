export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const data = req.body;

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: {
          name: "JAM'BOUYO Academy",
          email: "contact@jam-bouyo.com",
        },

        to: [
          {
            email: "contact@jam-bouyo.com",
          },
        ],

        subject: "Nouvelle demande d’admission",

        htmlContent: `
          <h2>Nouvelle demande reçue</h2>

          <p><strong>Nom :</strong> ${data.first_name || ""} ${data.last_name || ""}</p>

          <p><strong>Email :</strong> ${data.email || ""}</p>

          <p><strong>Téléphone :</strong> ${data.phone || ""}</p>

          <p><strong>Programme :</strong> ${data.program || ""}</p>
        `,
      }),
    });

    const result = await response.json();

await fetch("https://api.brevo.com/v3/smtp/email", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "api-key": process.env.BREVO_API_KEY,
  },
  body: JSON.stringify({
    sender: {
      name: "JAM'BOUYO Academy",
      email: "contact@jam-bouyo.com",
    },
    to: [{ email: data.email }],
    subject: "Votre demande d’admission a bien été reçue",
    htmlContent: `
      <h2>Demande d’admission reçue</h2>
      <p>Bonjour ${data.first_name || ""},</p>
      <p>Nous avons bien reçu votre demande d’admission pour :</p>
      <p><strong>${data.program || ""}</strong></p>
      <p>Notre service admission vous contactera rapidement pour la suite.</p>
      <p>Merci pour votre confiance.</p>
      <br>
      <p><strong>JAM’BOUYO Academy</strong><br>L’excellence numérique accessible à tous.</p>
    `,
  }),
});

return res.status(200).json(result);

  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
}
