export type Gender = 'Male' | 'Female';
export type AgeGroup = '<40' | '40-60' | '60+';
export type SkillLevel = 'Novice' | 'Intermediate' | 'Advanced';
export type MachineSelection = 'Leg Press' | 'Chest Press' | 'Seated Dip' | 'Lumbar';

/**
 * Calculates the suggested starting weight for a client based on MSF baseline metrics.
 * 
 * Base Weights (Male): Leg Press (100 lbs), Chest Press (50 lbs), Lumbar (40 lbs).
 * Base Weights (Female): Leg Press (60 lbs), Seated Dip (40 lbs), Lumbar (30 lbs).
 * Age Multipliers: Under 40 (x1.2), 40-60 (x1.0), Over 60 (x0.8).
 * Skill Multipliers: Advanced (x1.3), Intermediate (x1.0), Novice (x0.8).
 * 
 * @returns The calculated weight rounded to the nearest 2 lbs (even number)
 */
export function calculateStartingWeight(
  machine: string,
  gender: Gender,
  ageGroup: AgeGroup,
  skillLevel: SkillLevel
): number {
  let baseWeight = 0;

  if (gender === 'Male') {
    switch (machine) {
      case 'Leg Press': baseWeight = 100; break;
      case 'Chest Press': baseWeight = 50; break;
      case 'Lumbar': baseWeight = 40; break;
      case 'Seated Dip': baseWeight = 0; break; // Not typically in Male baseline
    }
  } else {
    switch (machine) {
      case 'Leg Press': baseWeight = 60; break;
      case 'Seated Dip': baseWeight = 40; break;
      case 'Lumbar': baseWeight = 30; break;
      case 'Chest Press': baseWeight = 0; break; // Not typically in Female baseline
    }
  }

  if (baseWeight === 0) return 0;

  let ageMultiplier = 1.0;
  switch (ageGroup) {
    case '<40': ageMultiplier = 1.2; break;
    case '40-60': ageMultiplier = 1.0; break;
    case '60+': ageMultiplier = 0.8; break;
  }

  let skillMultiplier = 1.0;
  switch (skillLevel) {
    case 'Novice': skillMultiplier = 0.8; break;
    case 'Intermediate': skillMultiplier = 1.0; break;
    case 'Advanced': skillMultiplier = 1.3; break;
  }

  const calculatedWeight = baseWeight * ageMultiplier * skillMultiplier;
  
  // Round to nearest 2 (nearest even number)
  return Math.round(calculatedWeight / 2) * 2;
}
