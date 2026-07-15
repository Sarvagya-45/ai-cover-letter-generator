require("dotenv").config();

const express = require("express");
const cors = require("cors");

const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

app.use(cors());

app.use(
  express.json({
    limit: "10mb",
  }),
);

/* =========================
   GEMINI CONFIG
========================= */

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
async function generateWithRetry(model, prompt) {
  let lastError;

  for (let i = 0; i < 3; i++) {
    try {
      const result = await model.generateContent(prompt);

      return result;
    } catch (error) {
      lastError = error;

      console.log(`Retry ${i + 1}`);

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  throw lastError;
}

/* =========================
   HEALTH CHECK
========================= */

app.get("/", (req, res) => {
  res.json({
    status: "Server Running",
  });
});

/* =========================
   GENERATE COVER LETTER
========================= */

app.post("/generate", async (req, res) => {
  console.log("Generate request received");

  const { name, role, company, skills, resumeText } = req.body;

  try {
    if (!name || !role || !company || !skills) {
      return res.status(400).json({
        error: "Missing required fields",
      });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-flash-latest",
    });

    const prompt = `

You are an expert HR recruiter and career coach.

Write a professional, ATS-friendly cover letter.

Candidate Name: ${name}
Target Role: ${role}
Target Company: ${company}
Skills: ${skills}

Resume Content:
${resumeText || "Not Provided"}

Requirements:
- Professional and confident tone
- Mention skills naturally
- Mention company name naturally
- Strong opening and closing
- Around 250-350 words
- No bullet points

Generate the cover letter.

`;

    const result = await generateWithRetry(model, prompt);

    const response = await result.response;

    const letter = response.text();

    return res.json({
      success: true,

      letter,
    });
  } catch (error) {
    console.error("Gemini Error:", error);

    console.log("Fallback Triggered");

    const fallbackLetter = `

Dear Hiring Manager at ${company},

I am writing to express my interest in the ${role} position at ${company}.

With skills in ${skills}, I have developed a strong foundation that enables me to contribute effectively to challenging projects and collaborate successfully within professional teams.

I am particularly interested in joining ${company} because of its reputation for innovation, growth, and excellence. I am eager to apply my knowledge, continue learning from experienced professionals, and contribute meaningful value to your organization.

My background, combined with my enthusiasm for continuous improvement and problem-solving, makes me a motivated candidate for this opportunity.

Thank you for considering my application. I would welcome the opportunity to discuss how my skills and dedication can contribute to the success of ${company}.

Sincerely,

${name}

`;

    return res.json({
      success: true,

      letter: fallbackLetter,
    });
  }
});

/* =========================
   PORT
========================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
