import { GoogleGenAI } from '@google/genai';

export const AI_SETUP_PROMPT = `You are an elite MaxStrength Fitness (MSF) Master Trainer and Reference Assistant. Your role is to guide floor trainers step-by-step through setting up clients safely and effectively on specific exercise machines.

CORE PHILOSOPHY:
- Emphasize practical alignment (joint stacking, continuous tension) over theoretical alignment.
- Emphasize safety, especially during entry/exit (e.g., "Watch your head").
- MSF uses Continuous Tension (slow cadences, no pausing at turnarounds unless specified). Do not use traditional bodybuilding terms like "3 sets of 10".

STRICT RULES:
1. NO HALLUCINATIONS: You must base your setup steps ONLY on the provided "Reference Text". Do not invent seat settings, pad gaps, or safety rules that are not in the text.
2. ADAPT TO CONSTRAINTS: If "Client Details" are provided (e.g., "short arms", "knee pain"), you must scan the Reference Text for modifications and apply them to the setup steps.
3. OUTPUT FORMAT: You must output ONLY a valid JSON object matching the exact schema requested. Do not include markdown code blocks (\`\`\`json) or conversational text outside the JSON.`;

export const AI_SCHEMA = {
  type: "object",
  properties: {
    targetMuscles: {
      type: "array",
      items: { type: "string" },
      description: "List of primary muscles targeted."
    },
    initialAdjustments: {
      type: "array",
      items: { type: "string" },
      description: "Steps to take BEFORE the client enters (e.g., clear weight stack, set standard gap)."
    },
    entryAndSafety: {
      type: "array",
      items: { type: "string" },
      description: "Step-by-step instructions for safely loading the client into the machine."
    },
    alignmentAndPosture: {
      type: "array",
      items: { type: "string" },
      description: "Instructions for seat height, joint stacking, and posture (e.g., 'chest up')."
    },
    clientModifications: {
      type: "string",
      description: "Specific adjustments made based on the provided Client Details. If none, output 'Standard MSF setup applies.'"
    }
  },
  required: ["targetMuscles", "initialAdjustments", "entryAndSafety", "alignmentAndPosture", "clientModifications"]
};

let genaiClient: GoogleGenAI | null = null;

export const AI_EXECUTION_PROMPT = `You are an elite MaxStrength Fitness (MSF) Master Trainer. Your role is to provide floor trainers with the exact execution rules and vocal cues needed to coach a client through a set on a specific exercise machine.

CORE PHILOSOPHY (PACE & PURPOSE):
- Pace: Continuous tension. A slow, controlled cadence (typically 6 seconds positive, 6 seconds negative) with no pausing at turnarounds unless explicitly stated in the reference text.
- Purpose: Achieving deep momentary muscular failure. 
- Turnarounds: Emphasize smooth changes of direction (e.g., "drag out the turn", "touch and go").
- Communication: Instructors use calm, authoritative, and specific cues. No traditional gym jargon (e.g., do not say "pump out 10 reps").

STRICT RULES:
1. NO HALLUCINATIONS: Base your execution steps, turnaround rules, and specific vocal quotes ONLY on the provided "Reference Text". 
2. EXTRACT QUOTES: If the text provides exact phrases to say (e.g., "chest up, drive through the elbows"), extract them precisely for the trainer to use.
3. OUTPUT FORMAT: You must output ONLY a valid JSON object matching the requested schema. Do not include markdown formatting like \`\`\`json or any conversational text.`;

export const AI_EXECUTION_SCHEMA = {
  type: "object",
  properties: {
    gradualLoadUp: {
      type: "string",
      description: "Instructions for how the client should initiate the first rep (e.g., 'apply 101 lbs of pressure to a 100 lb stack')."
    },
    turnaroundRules: {
      type: "object",
      properties: {
        lowerTurn: {
          type: "string",
          description: "Specific rules for the lower turnaround (e.g., 'touch and go smoothly', 'no pausing')."
        },
        upperTurn: {
          type: "string",
          description: "Specific rules for the upper turnaround (e.g., 'pause for 1-2 seconds', 'squeeze for 2-3 seconds')."
        }
      },
      required: ["lowerTurn", "upperTurn"]
    },
    activeSetCues: {
      type: "array",
      items: { type: "string" },
      description: "A list of 3 to 5 specific vocal cues or instructions the trainer should say during the set, extracted directly from the text."
    },
    failureAndExit: {
      type: "string",
      description: "Instructions on how to handle the end of the set, achieving failure, and safely unloading the client."
    }
  },
  required: ["gradualLoadUp", "turnaroundRules", "activeSetCues", "failureAndExit"]
};

export const AI_CLINICAL_PROMPT = `You are an elite MaxStrength Fitness (MSF) Master Trainer and Clinical Strategist. Your role is to advise floor trainers on how to handle client limitations, injuries, special populations, and programming progressions for specific exercises.

CORE PHILOSOPHY (SAFETY & PROGRESSION):
- Safety overrides intensity. If dynamic movement is contraindicated (e.g., Torso Rotation with osteoporosis), you must recommend a conservative alternative like a Static Hold (SH) or Timed Static Contraction (TSC).
- TSC Protocol: Typically involves pinning the weight stack so the movement arm cannot move, placing the client near mid-range, and cueing progressive effort (e.g., 30 sec @ 50%, 30 sec @ 75%, 30 sec @ 100%).
- Progression: Form and control must be perfected before load is increased. Standard failure is targeted in 10 reps or fewer. 

STRICT RULES:
1. NO HALLUCINATIONS: Base all modifications, static protocols, and exercise substitutions strictly on the provided "Reference Text".
2. ADAPT TO CONSTRAINTS: Directly address the user's "Client Details" (e.g., "knee valgus", "shoulder pain"). If the reference text suggests an alternative exercise or a shortened ROM for that issue, state it clearly.
3. OUTPUT FORMAT: You must output ONLY a valid JSON object matching the requested schema. Do not include markdown formatting like \`\`\`json or any conversational text.`;

export const AI_CLINICAL_SCHEMA = {
  type: "object",
  properties: {
    contraindications: {
      type: "array",
      items: { type: "string" },
      description: "Specific conditions or injuries where this exercise should be avoided or severely limited (e.g., 'Osteoporosis on Torso Rotation')."
    },
    dynamicModifications: {
      type: "string",
      description: "Adjustments to the standard dynamic movement for specific limitations (e.g., 'Shorten ROM by pinning the weight stack', 'Use Torso Arm setup instead of Pulldown')."
    },
    staticAlternativeProtocol: {
      type: "object",
      properties: {
        isRecommended: { type: "boolean" },
        setupAndExecution: { 
          type: "string",
          description: "Step-by-step on how to set up the TSC or Static Hold (SH), including pin placement and time/effort protocol (e.g., 30/30/30 sec)."
        }
      },
      required: ["isRecommended", "setupAndExecution"]
    },
    approvedSubstitutions: {
      type: "array",
      items: { type: "string" },
      description: "Alternative exercises to perform if this machine cannot be used, based strictly on the reference text."
    },
    progressionAdvice: {
      type: "string",
      description: "Specific rules for progressing this client on this machine (e.g., 'Do not progress load until 6-sec/6-sec cadence is mastered')."
    }
  },
  required: ["contraindications", "dynamicModifications", "staticAlternativeProtocol", "approvedSubstitutions", "progressionAdvice"]
};

function getGenaiClient(): GoogleGenAI {
  if (!genaiClient) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("Missing GEMINI_API_KEY environment variable.");
    }
    genaiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return genaiClient;
}

export interface SetupWizardResult {
  targetMuscles: string[];
  initialAdjustments: string[];
  entryAndSafety: string[];
  alignmentAndPosture: string[];
  clientModifications: string;
}

export async function generateMachineSetupGuide(
  machineName: string, 
  clientDetails: string, 
  referenceText: string
): Promise<SetupWizardResult> {
  const ai = getGenaiClient();
  const prompt = `TARGET MACHINE: ${machineName}
CLIENT DETAILS/CONSTRAINTS: ${clientDetails}

MSF REFERENCE TEXT:
"""
${referenceText}
"""

TASK:
Analyze the MSF Reference Text. Generate a step-by-step setup guide for the trainer to get the client safely into the ${machineName}. Ensure any specific limitations mentioned in the Client Details are addressed using rules found in the Reference Text. Return ONLY the requested JSON object.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
    config: {
      systemInstruction: AI_SETUP_PROMPT,
      responseMimeType: "application/json",
      responseSchema: AI_SCHEMA
    }
  });

  if (!response.text) {
    throw new Error("No text returned from Gemini");
  }

  try {
    return JSON.parse(response.text) as SetupWizardResult;
  } catch (e) {
    console.error("Gemini returned invalid JSON", response.text);
    throw new Error("Failed to parse Gemini output");
  }
}

export interface ExecutionGuideResult {
  gradualLoadUp: string;
  turnaroundRules: {
    lowerTurn: string;
    upperTurn: string;
  };
  activeSetCues: string[];
  failureAndExit: string;
}

export async function generateExecutionGuide(
  machineName: string,
  referenceText: string
): Promise<ExecutionGuideResult> {
  const ai = getGenaiClient();
  const prompt = `TARGET MACHINE: ${machineName}

MSF REFERENCE TEXT:
"""
${referenceText}
"""

TASK:
Analyze the provided MSF Reference Text for the ${machineName}. Generate a structured coaching guide that a trainer can read while the client is actively performing the exercise. Focus strictly on the execution of the movement, the pacing, turnaround rules, and specific verbal cues. Return ONLY the requested JSON object.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
    config: {
      systemInstruction: AI_EXECUTION_PROMPT,
      responseMimeType: "application/json",
      responseSchema: AI_EXECUTION_SCHEMA
    }
  });

  if (!response.text) {
    throw new Error("No text returned from Gemini");
  }

  try {
    return JSON.parse(response.text) as ExecutionGuideResult;
  } catch (e) {
    console.error("Gemini returned invalid JSON", response.text);
    throw new Error("Failed to parse Gemini output");
  }
}

export interface ClinicalStrategyResult {
  contraindications: string[];
  dynamicModifications: string;
  staticAlternativeProtocol: {
    isRecommended: boolean;
    setupAndExecution: string;
  };
  approvedSubstitutions: string[];
  progressionAdvice: string;
}

export async function generateClinicalStrategy(
  machineName: string,
  clientDetails: string,
  referenceText: string
): Promise<ClinicalStrategyResult> {
  const ai = getGenaiClient();
  const prompt = `TARGET MACHINE: ${machineName}
CLIENT DETAILS/INJURIES: ${clientDetails}

MSF REFERENCE TEXT (Including Quick Reference & Substitutions):
"""
${referenceText}
"""

TASK:
Analyze the MSF Reference Text and the specific Client Details. Generate a clinical strategy and progression guide for the trainer. If the client's condition requires a Static Hold (SH) or Timed Static Contraction (TSC), detail the exact setup. If the exercise is completely contraindicated, provide the approved substitutions. Return ONLY the requested JSON object.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
    config: {
      systemInstruction: AI_CLINICAL_PROMPT,
      responseMimeType: "application/json",
      responseSchema: AI_CLINICAL_SCHEMA
    }
  });

  if (!response.text) {
    throw new Error("No text returned from Gemini");
  }

  try {
    return JSON.parse(response.text) as ClinicalStrategyResult;
  } catch (e) {
    console.error("Gemini returned invalid JSON", response.text);
    throw new Error("Failed to parse Gemini output");
  }
}
