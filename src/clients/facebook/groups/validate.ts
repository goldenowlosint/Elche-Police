import { generateObject } from "ai";
import { z } from "zod";
import * as Sentry from "@sentry/node";
import { openai } from "@ai-sdk/openai";

const ANOMALY_CATEGORIES = [
  "public_safety",
  "crowd_control",
  "criminal_activity",
  "medical_emergency",
  "alcohol_incident",
  "structural_risk",
  "event_disruption",
  "other_concern",
] as const;

const anomalySchema = z.object({
  isAnomaly: z
    .boolean()
    .describe(
      "True if the post contains content related to public safety, incidents, or concerns relevant to Elche police",
    ),
  severityLevel: z
    .number()
    .min(1)
    .max(10)
    .nullable()
    .describe(
      "1-3: low concern, 4-6: medium, 7-10: high/critical. null if isAnomaly is false",
    ),
  category: z
    .enum(ANOMALY_CATEGORIES)
    .nullable()
    .describe("Primary anomaly category. null if isAnomaly is false"),
  summary: z
    .string()
    .nullable()
    .describe(
      "Brief 1-2 sentence English summary of what was detected. null if isAnomaly is false",
    ),
  detectedKeywords: z
    .array(z.string())
    .nullable()
    .describe(
      "Specific keywords/phrases from the post that triggered detection. null if isAnomaly is false",
    ),
  location: z
    .string()
    .nullable()
    .describe(
      "Specific location mentioned in the post, if any. null if not applicable",
    ),
});

export type AnomalyResult = z.infer<typeof anomalySchema>;

const SYSTEM_PROMPT = `You are an advanced anomaly detection system for the Elche Police Department (Policía Local de Elche), Alicante, Spain.

Your mission: Analyze Facebook group posts from Elche community groups to detect potential public safety concerns, incidents, or anomalies that require police attention.

## MONITORING TARGETS

### Context — Semana Santa (Holy Week) Events:
Domingo de Ramos (Palm Sunday), Lunes Santo, Martes Santo, Miércoles Santo, Jueves Santo (Holy Thursday), Viernes Santo (Good Friday), Domingo de Resurrección (Easter Sunday), procesión del silencio, procesión del encuentro, santo entierro, salida de cofradías, levantá, cortejo fúnebre, trono (ceremonial float), nazarenos (hooded penitents), cofrades (brotherhood members)

### Key Locations in Elche:
Plaça de Baix, Plaza del Congreso Eucarístico, Calle Corredora, Puente de la Virgen, Paseo de la Estación, Plaza Santa Isabel, Calahorra, Portal de Elche, Plaça de les Flors, Plaza Blanca

### Incident Types to Detect:

**Violence / Disorder:**
pelea (fight), riña (brawl), altercado (altercation), agresión (assault), disturbio (disturbance), desorden (disorder), alboroto (commotion), violencia, enfrentamiento, ataque

**Crowd Issues:**
aglomeración (overcrowding), avalancha (stampede/crush), empujones (pushing), hacinamiento (overcrowding), intransitable (impassable), muchedumbre (crowd), desbordamiento, pánico, estampida

**Alcohol / Substance:**
macrobotellón (mass outdoor drinking), litrona (large beer bottle), botellón (outdoor drinking party), pre-fiesta, borrachos (drunk people), fiesta espontánea, quedada para beber (drinking meetup), embriaguez, intoxicación etílica, drogas

**Theft / Crime:**
carterista (pickpocket), robo de móvil (phone theft), robo de bolso (bag theft), tirón (bag snatching), hurtos (petty theft), carterista en procesión, robo (robbery), ladrón, sustracción, vandalismo

**Medical:**
herido (injured person), ambulancia (ambulance), evacuación (evacuation), servicios médicos (medical services), desmayo (fainting), golpe de calor (heatstroke), atropello, accidente, urgencia

**Structural:**
caída de estructura (structural collapse), caída de trono (fallen ceremonial float), derrumbe (collapse), desprendimiento, peligro estructural

## SEVERITY SCALE (1-10):
- 1-3: Low — general mentions, planned events, minor concerns, rumors
- 4-6: Medium — reports of incidents, crowd problems, minor crime, warnings
- 7-10: High/Critical — active violence, medical emergencies, structural failures, mass incidents

## RULES:
- Posts can be in Spanish, Catalan/Valencian, or any language — analyze ALL text
- Analyze BOTH the message field AND attachment descriptions
- Normal community posts (ads, promotions, recipes, meetups, sales, greetings) are NOT anomalies
- Flag even SUBTLE mentions of safety concerns — better safe than sorry for police monitoring
- Detect both direct reports ("hubo una pelea") AND indirect indicators ("evitad la Plaça de Baix esta noche, está peligroso")
- If a post mentions a monitored LOCATION together with ANY safety concern, flag it
- Consider context: a post about a procession is normal; a post about a fight at a procession is an anomaly`;

export const detectAnomaly = async (
  postContent: string,
  groupName: string,
): Promise<AnomalyResult | null> => {
  try {
    const { object } = await generateObject({
      model: openai("gpt-5.4-mini"),
      schema: anomalySchema,
      system: SYSTEM_PROMPT,
      prompt: `Analyze this Facebook post from the Elche community group "${groupName}" for public safety anomalies:

${postContent}

Determine if this post contains ANY content the Elche Police should know about. If it is a normal community post (advertisement, greeting, event promotion without safety concerns), set isAnomaly to false. If it contains ANY safety-related concern, set isAnomaly to true and provide the full analysis.`,
    });

    return object;
  } catch (error) {
    console.error("Error in detectAnomaly:", error);
    Sentry.captureException(error, {
      tags: { module: "facebookAnomalyDetection", group: groupName },
    });
    return null;
  }
};
