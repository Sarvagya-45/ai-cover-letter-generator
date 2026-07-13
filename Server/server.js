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

Write a professional ATS-friendly cover letter.

Name: ${name}

Role: ${role}

Company: ${company}

Skills: ${skills}

Resume Content:
${resumeText || "Not Provided"}

Generate a personalized cover letter.
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

    const fallbackLetter = `

Dear Hiring Manager at ${company},
My name is ${name} and I am applying for the ${role} position.
My key skills include ${skills}.
I am excited about the opportunity to contribute to your organization.
Thank you for your consideration.

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
