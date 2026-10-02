const { GoogleGenerativeAI } = require("@google/generative-ai");

const SYSTEM_PROMPT = `
You are the LifeLink Emergency Intelligence Engine.

Your job is to analyze an emergency SOS request quickly and return structured
emergency intelligence for hospitals, police, and fire stations.

You are NOT a doctor and must not diagnose medical conditions.

Analyze:
- Emergency type
- Emergency description
- Blood group
- Allergies
- Medical history
- Available emergency contacts
- Requested emergency services

Return ONLY valid JSON.

The JSON must contain:
{
  "severity": "low | medium | high | critical",
  "summary": "short emergency summary",
  "recommendedServices": ["hospital", "police", "firestation"],
  "resourceNeeds": ["short list of useful resources"],
  "responderInstructions": ["short practical instructions"]
}

Rules:
- Do not invent medical information.
- Use only the information provided.
- If information is missing, do not guess.
- Keep the summary short.
- Recommend services based on the emergency type and description.
- Resource needs must be practical and relevant.
- This is decision support, not a medical diagnosis.
`;

let genAI = null;

const isConfigured = () => Boolean(process.env.GEMINI_API_KEY);

const getModel = () => {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(
      process.env.GEMINI_API_KEY
    );
  }

  return genAI.getGenerativeModel({
    model: "gemini-3.6-flash",
    systemInstruction: SYSTEM_PROMPT,
  });
};

const analyzeEmergency = async ({
  type,
  emergencyNote,
  bloodGroup,
  allergies,
  medicalHistory,
  targets,
}) => {
  if (!isConfigured()) {
    return null;
  }

  const prompt = `
Analyze this LifeLink emergency:

Emergency type:
${type || "Not provided"}

Emergency description:
${emergencyNote || "Not provided"}

Blood group:
${bloodGroup || "Not provided"}

Allergies:
${Array.isArray(allergies) && allergies.length
    ? allergies.join(", ")
    : "Not provided"}

Medical history:
${Array.isArray(medicalHistory) && medicalHistory.length
    ? medicalHistory.join(", ")
    : "Not provided"}

Requested services:
${Array.isArray(targets) && targets.length
    ? targets.join(", ")
    : "Not provided"}
`;

  try {
    const result = await getModel().generateContent(prompt);

    const text = result.response.text().trim();

    const cleaned = text
      .replace(/^```json/i, "")
      .replace(/^```/i, "")
      .replace(/```$/i, "")
      .trim();

    const analysis = JSON.parse(cleaned);

    return {
      severity: analysis.severity || "medium",
      summary: analysis.summary || "Emergency request received.",
      recommendedServices: Array.isArray(
        analysis.recommendedServices
      )
        ? analysis.recommendedServices
        : [],
      resourceNeeds: Array.isArray(
        analysis.resourceNeeds
      )
        ? analysis.resourceNeeds
        : [],
      responderInstructions: Array.isArray(
        analysis.responderInstructions
      )
        ? analysis.responderInstructions
        : [],
    };
  } catch (error) {
    console.error(
      "Emergency intelligence analysis failed:",
      error.message
    );

    return null;
  }
};

module.exports = {
  analyzeEmergency,
  isConfigured,
};