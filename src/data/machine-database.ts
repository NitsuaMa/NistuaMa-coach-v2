export interface MachineKnowledge {
  id: string;
  name: string;
  category: string;
  baseFemale: number;
  baseMale: number;
  setup: string;
  execution: string;
  target?: string;
}

export const MACHINE_DATABASE: Record<string, MachineKnowledge> = {
  // Lower Body
  "leg_press": {
    id: "leg_press",
    name: "Leg Press",
    category: "Lower Body",
    baseMale: 160,
    baseFemale: 60,
    setup: "Default to P2 seat. Pin accessory at 18 lbs. Feet hip-width apart, parallel.",
    execution: "No pause at turnarounds. Emphasize control ('drag out the turn').",
    target: "Quadriceps, Gluteus Maximus"
  },
  "leg_extension": {
    id: "leg_extension",
    name: "Leg Extension",
    category: "Lower Body",
    baseMale: 80,
    baseFemale: 40,
    setup: "Align knee joint with axis of rotation. Ankle pad rests gently above the shoe.",
    execution: "Smooth transition at extension. Do not throw the weight. 2-3 second pause at top.",
    target: "Quadriceps Femoris"
  },
  "leg_curl": {
    id: "leg_curl",
    name: "Leg Curl",
    category: "Lower Body",
    baseMale: 70,
    baseFemale: 40,
    setup: "Knee aligned with axis. Thigh pad secure above knee. Ankle pad on Achilles.",
    execution: "Dorsiflex ankles slightly. Squeeze at flexion. Smooth eccentric return.",
    target: "Hamstrings"
  },
  // Hips
  "abduction": {
    id: "abduction",
    name: "Abduction",
    category: "Hips",
    baseMale: 50,
    baseFemale: 30,
    setup: "Thigh pads snug, no gap needed. Manual pull apart during entry.",
    execution: "Lift chest, arch back. Brief 2-3 second squeeze at upper turnaround.",
    target: "Gluteus Medius, Minimus"
  },
  "adduction": {
    id: "adduction",
    name: "Adduction",
    category: "Hips",
    baseMale: 60,
    baseFemale: 40,
    setup: "Pads positioned inside knees. Max comfortable stretch on setup.",
    execution: "Drive knees together. Squeeze inner thighs. Do NOT clash pads.",
    target: "Adductor Longus/Brevis/Magnus"
  },
  // Upper Body - Push
  "chest_press": {
    id: "chest_press",
    name: "Chest Press",
    category: "Upper Body - Push",
    baseMale: 60,
    baseFemale: 20,
    setup: "Stool required. Elbows slightly lower than hands to align forearm.",
    execution: "No pause. Emphasize exaggerated control at turnarounds. 3-5s gradual load up.",
    target: "Pectoralis Major, Triceps"
  },
  "overhead_press": {
    id: "overhead_press",
    name: "Overhead Press",
    category: "Upper Body - Push",
    baseMale: 40,
    baseFemale: 20,
    setup: "Handles at shoulder height. Seat low enough to permit full ROM.",
    execution: "Drive upward through heels of hands. Avoid locking elbows at top.",
    target: "Anterior Deltoid, Triceps"
  },
  "seated_dip": {
    id: "seated_dip",
    name: "Seated Dip",
    category: "Upper Body - Push",
    baseMale: 70,
    baseFemale: 40,
    setup: "Seat height allows wrist just below armpit. Keep chest lifted.",
    execution: "Press downward powerfully. Control the eccentric phase. Keep shoulders down.",
    target: "Triceps Brachii, Pectoralis Minor"
  },
  "chest_flye": {
    id: "chest_flye",
    name: "Chest Flye",
    category: "Upper Body - Push",
    baseMale: 50,
    baseFemale: 30,
    setup: "Adjust arms so handles are slightly behind chest plane. Elbows soft.",
    execution: "Squeeze arms together. Maintain slight elbow bend. Pause at midline.",
    target: "Pectoralis Major"
  },
  "triceps_extension": {
    id: "triceps_extension",
    name: "Triceps Extension",
    category: "Upper Body - Push",
    baseMale: 40,
    baseFemale: 25,
    setup: "Elbows aligned with pivot joint. Sit up tall.",
    execution: "Extend forearm through full range. 2-3 sec squeeze at full extension.",
    target: "Triceps Brachii"
  },
  "lateral_raise": {
    id: "lateral_raise",
    name: "Lateral Raise",
    category: "Upper Body - Push",
    baseMale: 30,
    baseFemale: 15,
    setup: "Seat height such that axis of rotation is slightly below shoulders.",
    execution: "Lead with elbows. Raise to parallel. Slower eccentric lowering.",
    target: "Lateral Deltoid"
  },
  // Upper Body - Pull
  "compound_row": {
    id: "compound_row",
    name: "Compound Row",
    category: "Upper Body - Pull",
    baseMale: 80,
    baseFemale: 40,
    setup: "Standard gap of 2. Default to 'M' middle handle width.",
    execution: "Require hand-off near contracted position. Pause/squeeze for 1-3 seconds at the top.",
    target: "Latissimus Dorsi, Brachioradialis"
  },
  "pulldown": {
    id: "pulldown",
    name: "Pulldown (Torso Arm)",
    category: "Upper Body - Pull",
    baseMale: 70,
    baseFemale: 50,
    setup: "Thigh pads tight. Adjust seat so arms are nearly fully extended at top.",
    execution: "Pull handles to upper chest. Squeeze shoulder blades down and together.",
    target: "Latissimus Dorsi, Biceps Brachii"
  },
  "pullover": {
    id: "pullover",
    name: "Pullover",
    category: "Upper Body - Pull",
    baseMale: 60,
    baseFemale: 40,
    setup: "Seat height allows shoulders to align with axis. Elbow pads snug.",
    execution: "Drive elbows down to waist. Maintain core engagement. Pause at bottom.",
    target: "Latissimus Dorsi"
  },
  "simple_row": {
    id: "simple_row",
    name: "Simple Row",
    category: "Upper Body - Pull",
    baseMale: 60,
    baseFemale: 40,
    setup: "Chest pad at sternum level. Neutral grip. Gap 2-3.",
    execution: "Retract scapula before pulling. Drive elbows straight back.",
    target: "Rhomboids, Middle Trapezius"
  },
  "biceps_curl": {
    id: "biceps_curl",
    name: "Biceps Curl",
    category: "Upper Body - Pull",
    baseMale: 40,
    baseFemale: 20,
    setup: "Elbows aligned with pivot joint. Ensure handles rotate freely.",
    execution: "Curl weight upward smoothly. Hard squeeze at the top. Resist the eccentric.",
    target: "Biceps Brachii"
  },
  // Trunk/Spine/Core
  "lumbar_extension": {
    id: "lumbar_extension",
    name: "Lumbar Extension",
    category: "Trunk/Spine/Core",
    baseMale: 40,
    baseFemale: 30,
    setup: "Gap 4 (5-6 for back issues). Align iliac crest with roller.",
    execution: "Lift chest, arch back. Pause 1-3s in contracted position.",
    target: "Erector Spinae"
  },
  "abdominals": {
    id: "abdominals",
    name: "Abdominals",
    category: "Trunk/Spine/Core",
    baseMale: 50,
    baseFemale: 30,
    setup: "Chest pad across upper sternum. Hips pushed far back into seat.",
    execution: "Crunch torso forward by contracting abs. Do NOT throw weight with hips.",
    target: "Rectus Abdominis"
  },
  "torso_rotation": {
    id: "torso_rotation",
    name: "Torso Rotation",
    category: "Trunk/Spine/Core",
    baseMale: 40,
    baseFemale: 30,
    setup: "Seat locked. Thin leg pads for most. Watch head on workbox.",
    execution: "Contraindicated for Osteoporosis. 'Tighten/crunch down' during load up.",
    target: "Obliques"
  },
  "cervical_extension": {
    id: "cervical_extension",
    name: "Cervical Extension",
    category: "Trunk/Spine/Core",
    baseMale: 30,
    baseFemale: 20,
    setup: "Seat height aligns mid-cervical spine with axis. Pad on back of head.",
    execution: "Slow, pure neck extension. Do NOT use torso. Pause at full extension.",
    target: "Cervical Paraspinals"
  }
};

export const MACHINE_LIST = Object.values(MACHINE_DATABASE);

export type Gender = 'Male' | 'Female' | 'Other';
export type SkillLevel = 'Novice' | 'Intermediate' | 'Advanced';

export function calculateStartingWeight(
  machineId: string,
  gender: Gender | string,
  age: number,
  skill: SkillLevel | string
): number {
  const machine = MACHINE_DATABASE[machineId];
  if (!machine) return 0;

  // Base weight
  const baseWeight = gender === 'Female' ? machine.baseFemale : machine.baseMale;

  // Age Multiplier
  let ageMultiplier = 1.0;
  if (age < 40) ageMultiplier = 1.2;
  else if (age >= 40 && age <= 60) ageMultiplier = 1.0;
  else if (age > 60) ageMultiplier = 0.8;

  // Skill Multiplier
  let skillMultiplier = 1.0;
  if (skill === 'Novice') skillMultiplier = 1.0;
  else if (skill === 'Intermediate') skillMultiplier = 1.15;
  else if (skill === 'Advanced') skillMultiplier = 1.3;

  const rawWeight = baseWeight * ageMultiplier * skillMultiplier;

  // Round to nearest even number
  return Math.round(rawWeight / 2) * 2;
}
