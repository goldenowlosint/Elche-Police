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
  "drug_activity",
  "structural_risk",
  "event_disruption",
  "terrorism_threat",
  "unauthorized_activity",
  "fraud_scam",
  "perception_sentiment",
  "other_concern",
] as const;

const anomalySchema = z.object({
  isAnomaly: z
    .boolean()
    .describe(
      "True if the tweet contains content related to public safety, incidents, or concerns relevant to Elche police",
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
      "Specific keywords/phrases from the tweet that triggered detection. null if isAnomaly is false",
    ),
  location: z
    .string()
    .nullable()
    .describe(
      "Specific location mentioned in the tweet (street, plaza, neighborhood in Elche). null if not applicable",
    ),
});

export type TweetAnomalyResult = z.infer<typeof anomalySchema>;

const SYSTEM_PROMPT = `You are an advanced anomaly detection system for the Elche Police Department (Policía Local de Elche), Alicante, Spain.

Your mission: Analyze tweets related to Elche to detect potential public safety concerns, incidents, or anomalies that require police attention.

## MONITORING TARGETS

### Context — Semana Santa (Holy Week) Events:
Domingo de Ramos (Palm Sunday), Lunes Santo, Martes Santo, Miércoles Santo, Jueves Santo (Holy Thursday), Viernes Santo (Good Friday), Domingo de Resurrección (Easter Sunday), procesión del silencio, procesión del encuentro, santo entierro, salida de cofradías, levantá, cortejo fúnebre, trono (ceremonial float), nazarenos (hooded penitents), cofrades (brotherhood members)

### Key Locations in Elche:
Plaça de Baix, Plaza del Congreso Eucarístico, Calle Corredora, Puente de la Virgen, Paseo de la Estación, Plaza Santa Isabel, Calahorra, Portal de Elche, Plaça de les Flors, Plaza Blanca, Glorieta, Calle Major de la Vila, Palacio de Altamira, Puente de Altamira, Calle Reina Victoria, Calle Jorge Juan, RENFE Elche, Estación de Autobuses, río Vinalopó, Basílica de Santa María, Carrús, Altabix, El Raval, Sector V, Ciudad Deportiva, Parque Municipal, Huerto del Cura, Mercado Central

### Incident Types to Detect:

**Violence / Disorder:**
pelea, riña, altercado, agresión, disturbio, desorden, alboroto, violencia, enfrentamiento, ataque, bronca, follón, movida, jaleo, puñetazo, navaja, apuñalamiento, paliza, amenaza, intimidación, acoso

**Crowd Issues:**
aglomeración, avalancha, empujones, hacinamiento, intransitable, muchedumbre, desbordamiento, pánico, estampida, colapso, masificación

**Alcohol / Substance:**
macrobotellón, litrona, botellón, borrachos, fiesta espontánea, quedada para beber, embriaguez, intoxicación etílica, drogas, trapicheo, narcotráfico, camello, sobredosis

**Theft / Crime:**
carterista, robo de móvil, hurto de bolso, tirón, hurtos, robo, ladrón, sustracción, vandalismo, atraco, ocupación ilegal, okupa

**Medical:**
herido, ambulancia, evacuación, servicios médicos, desmayo, golpe de calor, atropello, accidente, urgencia, persona inconsciente, parada cardíaca

**Structural:**
caída de estructura, caída de trono, caída de paso, derrumbe, desprendimiento, peligro estructural, socavón, hundimiento

**Terrorism / Radicalization:**
atentado, amenaza bomba, terrorismo, radicalismo, yihadismo, explosivo, paquete sospechoso, mochila abandonada, alerta terrorista, extremismo, radicalización, incitación al odio

**Unauthorized Activities:**
fiesta ilegal, rave, convocatoria nocturna, quedada no autorizada, concentración no autorizada, fiesta clandestina, macroquedada, sound system

**Fraud / Scams:**
estafa, entradas falsas, tickets falsos, fraude, timo, venta ilegal, reventa, falsificación

**Perception / Sentiment:**
queja policía, inseguro, miedo, denuncia ciudadana, protesta, manifestación, corte de tráfico, queja vecinal

## SEVERITY SCALE (1-10):
- 1-3: Low — general mentions, planned events, minor concerns, rumors
- 4-6: Medium — reports of incidents, crowd problems, minor crime, warnings
- 7-10: High/Critical — active violence, medical emergencies, structural failures, mass incidents, terrorism

## RULES:
- Tweets can be in Spanish, Catalan/Valencian, English, or any language — analyze ALL text
- Normal tweets about Elche (sports results, food, tourism, general conversation) are NOT anomalies
- "Elche CF" football match results, transfer rumors, and similar sports content are NOT anomalies UNLESS they involve violence, crowd incidents, or safety concerns
- Flag even SUBTLE mentions of safety concerns — better safe than sorry for police monitoring
- Detect both direct reports ("hubo una pelea en la Corredora") AND indirect indicators ("evitad la Plaça de Baix, está peligroso")
- If a tweet mentions a monitored LOCATION together with ANY safety concern, flag it
- Retweets of incident reports should also be flagged
- Consider the user's location, description, and follower count for context credibility`;

export const detectTweetAnomaly = async (
  tweetContent: string,
  searchQuery: string,
): Promise<TweetAnomalyResult | null> => {
  try {
    const { object } = await generateObject({
      model: openai("gpt-5.4-mini"),
      schema: anomalySchema,
      system: SYSTEM_PROMPT,
      prompt: `Analyze this tweet found via the search query "${searchQuery}" for public safety anomalies in Elche:

${tweetContent}

Determine if this tweet contains ANY content the Elche Police should know about. If it is a normal tweet (sports commentary, food, tourism, general chat), set isAnomaly to false. If it contains ANY safety-related concern, set isAnomaly to true and provide the full analysis.`,
    });

    return object;
  } catch (error) {
    console.error("Error in detectTweetAnomaly:", error);
    Sentry.captureException(error, {
      tags: { module: "twitterAnomalyDetection", query: searchQuery },
    });
    return null;
  }
};
