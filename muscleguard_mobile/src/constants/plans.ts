export interface Exercise {
  name: string;
  scheme: string;
}

export interface DayPlan {
  day: string;
  focus: string;
  active: boolean;
  ex: Exercise[];
}

export const PLANS: Record<string, DayPlan[]> = {
  // 0 = LOW RISK
  "0-Cardio": [
    { day: "Monday", focus: "Cardio Endurance", active: true, ex: [{ name: "Treadmill Run", scheme: "3×20 min" }, { name: "Jump Rope", scheme: "3×5 min" }] },
    { day: "Tuesday", focus: "Active Recovery", active: false, ex: [{ name: "Brisk Walk", scheme: "1×30 min" }] },
    { day: "Wednesday", focus: "HIIT Cardio", active: true, ex: [{ name: "Burpees", scheme: "4×15 reps" }, { name: "Mountain Climbers", scheme: "4×20 reps" }] },
    { day: "Thursday", focus: "Rest Day", active: false, ex: [] },
    { day: "Friday", focus: "Cardio + Core", active: true, ex: [{ name: "Cycling", scheme: "3×20 min" }, { name: "Plank", scheme: "3×60 sec" }] },
    { day: "Saturday", focus: "Long Cardio", active: true, ex: [{ name: "Outdoor Run", scheme: "1×45 min" }] },
    { day: "Sunday", focus: "Rest Day", active: false, ex: [] },
  ],
  "0-Strength": [
    { day: "Monday", focus: "Upper Body Push", active: true, ex: [{ name: "Push-ups", scheme: "3×15 reps" }, { name: "Dumbbell Press", scheme: "3×12 reps" }] },
    { day: "Tuesday", focus: "Lower Body", active: true, ex: [{ name: "Bodyweight Squats", scheme: "4×15 reps" }, { name: "Lunges", scheme: "3×12 reps" }] },
    { day: "Wednesday", focus: "Active Recovery", active: false, ex: [{ name: "Stretching", scheme: "1×20 min" }] },
    { day: "Thursday", focus: "Upper Body Pull", active: true, ex: [{ name: "Dumbbell Rows", scheme: "3×12 reps" }, { name: "Bicep Curls", scheme: "3×12 reps" }] },
    { day: "Friday", focus: "Full Body", active: true, ex: [{ name: "Deadlifts", scheme: "4×10 reps" }, { name: "Goblet Squats", scheme: "3×12 reps" }] },
    { day: "Saturday", focus: "Core & Mobility", active: true, ex: [{ name: "Crunches", scheme: "3×20 reps" }] },
    { day: "Sunday", focus: "Rest Day", active: false, ex: [] },
  ],
  "0-Mixed": [
    { day: "Monday", focus: "Strength — Upper", active: true, ex: [{ name: "Push-ups", scheme: "3×15 reps" }, { name: "Shoulder Press", scheme: "3×12 reps" }] },
    { day: "Tuesday", focus: "Cardio", active: true, ex: [{ name: "Treadmill Run", scheme: "3×15 min" }] },
    { day: "Wednesday", focus: "Strength — Lower", active: true, ex: [{ name: "Squats", scheme: "4×15 reps" }, { name: "Lunges", scheme: "3×12 reps" }] },
    { day: "Thursday", focus: "Rest Day", active: false, ex: [] },
    { day: "Friday", focus: "HIIT", active: true, ex: [{ name: "Burpees", scheme: "4×12 reps" }, { name: "Box Jumps", scheme: "3×10 reps" }] },
    { day: "Saturday", focus: "Full Body Strength", active: true, ex: [{ name: "Deadlifts", scheme: "3×10 reps" }, { name: "Bent-over Rows", scheme: "3×12 reps" }] },
    { day: "Sunday", focus: "Rest Day", active: false, ex: [] },
  ],
  // 1 = MODERATE RISK
  "1-Mixed": [
     { day: "Monday", focus: "Upper Strength", active: true, ex: [{ name: "Bench Press", scheme: "4×10 reps" }, { name: "Dumbbell Rows", scheme: "3×12 reps" }] },
     { day: "Tuesday", focus: "Cardio", active: true, ex: [{ name: "Cycling", scheme: "3×15 min" }, { name: "Jump Rope", scheme: "3×3 min" }] },
     { day: "Wednesday", focus: "Leg Strength", active: true, ex: [{ name: "Barbell Squats", scheme: "4×10 reps" }, { name: "Leg Curls", scheme: "3×12 reps" }] },
     { day: "Thursday", focus: "Rest Day", active: false, ex: [] },
     { day: "Friday", focus: "HIIT + Core", active: true, ex: [{ name: "Burpees", scheme: "4×12 reps" }, { name: "Plank", scheme: "3×60 sec" }] },
     { day: "Saturday", focus: "Full Body Strength", active: true, ex: [{ name: "Deadlifts", scheme: "4×8 reps" }, { name: "Pull-ups", scheme: "3×8 reps" }] },
     { day: "Sunday", focus: "Rest Day", active: false, ex: [] },
  ],
  "1-Cardio": [
    { day: "Monday", focus: "Moderate Cardio", active: true, ex: [{ name: "Treadmill Jog", scheme: "3×15 min" }] },
    { day: "Tuesday", focus: "Active Recovery", active: false, ex: [] },
    { day: "Wednesday", focus: "Interval Cardio", active: true, ex: [{ name: "Sprints", scheme: "6×1 min" }] },
    { day: "Thursday", focus: "Rest Day", active: false, ex: [] },
    { day: "Friday", focus: "Cycling", active: true, ex: [{ name: "Bike", scheme: "1×30 min" }] },
    { day: "Saturday", focus: "Brisk Walk", active: true, ex: [{ name: "Walking", scheme: "1×40 min" }] },
    { day: "Sunday", focus: "Rest Day", active: false, ex: [] },
  ],
  // 2 = HIGH RISK
  "2-Mixed": [
     { day: "Monday", focus: "Gentle Strength", active: true, ex: [{ name: "Push-ups", scheme: "3×10 reps" }, { name: "Plank", scheme: "3×30 sec" }] },
     { day: "Tuesday", focus: "Low-Impact Cardio", active: true, ex: [{ name: "Walking", scheme: "1×30 min" }] },
     { day: "Wednesday", focus: "Rest Day", active: false, ex: [] },
     { day: "Thursday", focus: "Lower Body — Light", active: true, ex: [{ name: "Bodyweight Squats", scheme: "3×12 reps" }] },
     { day: "Friday", focus: "Cardio + Core", active: true, ex: [{ name: "Elliptical", scheme: "2×15 min" }] },
     { day: "Saturday", focus: "Full Body — Light", active: true, ex: [{ name: "Deadlifts", scheme: "3×8 reps" }] },
     { day: "Sunday", focus: "Rest Day", active: false, ex: [] },
  ]
};
