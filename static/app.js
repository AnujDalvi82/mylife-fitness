/**
 * ============================================================================
 * ANTIGRAVITY FITNESS+ STUDIO CLIENT
 * Apple Fitness+ Caliber Experience: Concentric Activity Rings, Studio Player,
 * Web Audio Beeps, Haptic Feedback, 2-Set Workout Logger & ML Biofeedback.
 * ============================================================================
 */

// Global State
let selectedBodyParts = new Set();
let allQuotes = [];
let filteredQuotes = [];
let currentQuoteIndex = 0;

// Studio Player State
let studioActive = false;
let studioTimerInterval = null;
let studioElapsedSeconds = 0;
let studioExerciseIndex = 0;
let studioRestRemaining = 0;
let studioRestInterval = null;

// Workout Definitions (2-Set High Stimulus-to-Fatigue Model)
const WORKOUT_DEFINITIONS = {
  "Home Bar-Ground": [
    { name: "Standard Pull-ups (Overhand)", defaultTop: "BW", repsTop: "8-10", defaultBack: "BW", repsBack: "Failure", cue: "Dead hang at bottom, chin clear over bar." },
    { name: "Floor Push-ups (Standard)", defaultTop: "BW", repsTop: "15-20", defaultBack: "BW", repsBack: "Failure", cue: "3-second slow descent, chest taps floor." },
    { name: "Pike Push-ups (Shoulders)", defaultTop: "BW", repsTop: "8-12", defaultBack: "BW", repsBack: "Failure", cue: "Hips high in V-shape, lower forehead forward." },
    { name: "Bulgarian Split Squats", defaultTop: "BW", repsTop: "12-15", defaultBack: "BW", repsBack: "Failure", cue: "Back foot elevated, 2s pause at bottom." },
    { name: "Bar Dead Hang (Active Grip)", defaultTop: "BW", repsTop: "45-60s", defaultBack: "BW", repsBack: "Failure", cue: "Iron grip tension, do not let fingers slip." },
    { name: "Floor Neck Curls & Extensions", defaultTop: "BW", repsTop: "20", defaultBack: "BW", repsBack: "Failure", cue: "Chin tuck to chest; flip to belly for extension." }
  ],
  "Upper A": [
    { name: "Barbell Flat Bench Press", defaultTop: 55.0, repsTop: "6-8", defaultBack: 47.5, repsBack: "8-12", cue: "Tight arch, 3s controlled descent, explode." },
    { name: "Bent-Over Barbell Row", defaultTop: 45.0, repsTop: "6-8", defaultBack: 37.5, repsBack: "8-12", cue: "Torso 45 degrees, pull bar smoothly to sternum." },
    { name: "Incline Dumbbell Press (30°)", defaultTop: 17.5, repsTop: "8-10", defaultBack: 15.0, repsBack: "10-12", cue: "Deep upper chest stretch, squeeze at top." },
    { name: "Overhead Rope Cable Tricep Extension", defaultTop: 20.0, repsTop: "10-12", defaultBack: 15.0, repsBack: "Failure", cue: "Full elbow flexion stretch behind head." },
    { name: "Barbell Behind-Back Wrist Curls", defaultTop: 25.0, repsTop: "15-20", defaultBack: 20.0, repsBack: "Failure", cue: "Roll to fingertips, curl into wrists." }
  ],
  "Lower A": [
    { name: "Barbell Back Squat / Hack Squat", defaultTop: 60.0, repsTop: "6-8", defaultBack: 50.0, repsBack: "8-12", cue: "Deep below parallel, drive knees outward." },
    { name: "Romanian Deadlift (Barbell/DB)", defaultTop: 50.0, repsTop: "8-10", defaultBack: 42.5, repsBack: "10-12", cue: "Hinge hips straight back, feel hamstring stretch." },
    { name: "Walking Dumbbell Lunges", defaultTop: 12.5, repsTop: "10/leg", defaultBack: 10.0, repsBack: "Failure", cue: "Upright torso for quad tension." },
    { name: "Leg Extensions", defaultTop: 40.0, repsTop: "12-15", defaultBack: 30.0, repsBack: "Failure", cue: "2s peak contraction at full lockout." },
    { name: "Hanging Leg / Knee Raises", defaultTop: "BW", repsTop: "12-15", defaultBack: "BW", repsBack: "Failure", cue: "Strict curl of pelvis, zero body swing." }
  ],
  "Upper B": [
    { name: "Standing Overhead Barbell Press (OHP)", defaultTop: 35.0, repsTop: "6-8", defaultBack: 30.0, repsBack: "8-12", cue: "Glutes clenched, press straight upward overhead." },
    { name: "Weighted or Bodyweight Pull-ups", defaultTop: "BW", repsTop: "6-8", defaultBack: "BW", repsBack: "Failure", cue: "Drive elbows down into your back pockets." },
    { name: "Pec Deck Flyes (Chest Stretch)", defaultTop: 35.0, repsTop: "10-12", defaultBack: 27.5, repsBack: "Failure", cue: "Elbows slightly soft, huge chest expansion." },
    { name: "Incline Dumbbell Bicep Curls", defaultTop: 10.0, repsTop: "10-12", defaultBack: 8.0, repsBack: "Failure", cue: "Palms supinated, feel long-head bicep stretch." },
    { name: "Lying Plate Neck Curls & Extensions", defaultTop: 2.5, repsTop: "15-20", defaultBack: 2.5, repsBack: "Failure", cue: "Towel cushion on forehead, smooth range." }
  ],
  "Lower B": [
    { name: "Conventional Barbell Deadlift", defaultTop: 70.0, repsTop: "5-6", defaultBack: 60.0, repsBack: "8-10", cue: "Reset rep on floor, brace lats and core tight." },
    { name: "Leg Press (Feet high & wide)", defaultTop: 120.0, repsTop: "10-12", defaultBack: 100.0, repsBack: "Failure", cue: "Deep descent, don't allow lower back to round." },
    { name: "Seated or Lying Leg Curls", defaultTop: 35.0, repsTop: "10-12", defaultBack: 27.5, repsBack: "Failure", cue: "Hamstring isolation, resist the return." },
    { name: "Standing Calf Raises", defaultTop: 45.0, repsTop: "12-15", defaultBack: 35.0, repsBack: "Failure", cue: "2s pause at bottom, 2s peak squeeze." },
    { name: "Cable Woodchoppers (Obliques)", defaultTop: 15.0, repsTop: "12/side", defaultBack: 12.5, repsBack: "Failure", cue: "Rotate through core, squeeze obliques." }
  ]
};

// Fallback Mindful Quotes
const LOCAL_QUOTES = [
  { text: "Hunger comes in 20-minute waves. Drink water and let the wave crest. Your body is mobilizing stored fat right now.", author: "Metabolic Biochemistry", category: "fasting" },
  { text: "You don't grow from 5 sloppy sets. You grow from 2 sets pushed to the edge of high mechanical tension.", author: "Chris Beardsley", category: "training" },
  { text: "At dawn, remind yourself: The 8-month horizon only cares if you hit your 1,850 kcal and your steps today.", author: "Stoic Standard", category: "stoic" },
  { text: "Double inhale through the nose, long slow exhale through the mouth. Resets nervous system tension in 30 seconds.", author: "Andrew Huberman", category: "recovery" },
  { text: "Fasting sharpens cognitive clarity. Zero digestive lethargy during your college lectures.", author: "Coach Antigravity", category: "fasting" }
];

// Prescribed Diet Definitions (Portions & Detailed Macros: Protein, Carbs, Sugar, Calories, Fat)
const PRESCRIBED_MEALS = {
  meal_1: {
    id: "meal_1",
    title: "Meal 1: Morning Power Anchor",
    subtitle: "High biological value breakfast protocol (6 Eggs + 2 Phulkas + 100g Curd)",
    badge: "Breakfast",
    targetProtein: 45.5,
    targetCalories: 520,
    items: [
      { id: "m1_eggs", name: "6 Whole Eggs (Boiled / Bhurji / Omelette)", protein_g: 36.0, carbs_g: 3.0, sugar_g: 0.0, calories: 300, fat_g: 27.0 },
      { id: "m1_rotis", name: "2 Whole Wheat Phulkas / Rotis", protein_g: 6.0, carbs_g: 32.0, sugar_g: 1.0, calories: 160, fat_g: 1.0 },
      { id: "m1_curd", name: "100g Fresh Dahi / Curd", protein_g: 3.5, carbs_g: 4.5, sugar_g: 4.0, calories: 60, fat_g: 3.0 }
    ]
  },
  fasting: {
    id: "fasting",
    title: "College Fasting Window (8 AM – 6 PM)",
    subtitle: "Hydration, sustained alertness, and insulin sensitivity protocol",
    badge: "Fasting",
    targetProtein: 0.0,
    targetCalories: 0,
    items: [
      { id: "f_water", name: "2L+ Clean Hydration Water", protein_g: 0.0, carbs_g: 0.0, sugar_g: 0.0, calories: 0, fat_g: 0.0 },
      { id: "f_soda", name: "1 Can Zero-Sugar Diet Soda (Craving crusher)", protein_g: 0.0, carbs_g: 0.0, sugar_g: 0.0, calories: 0, fat_g: 0.0 },
      { id: "f_strict", name: "Strict Fasting Maintained (No cheat snacks)", protein_g: 0.0, carbs_g: 0.0, sugar_g: 0.0, calories: 0, fat_g: 0.0 }
    ]
  },
  meal_2: {
    id: "meal_2",
    title: "Meal 2: Post-College Feast",
    subtitle: "Evening muscle protein synthesis & glycogen replenishment",
    badge: "Dinner",
    targetProtein: 103.5,
    targetCalories: 850,
    items: [
      { id: "m2_chicken", name: "200g Fresh Chicken Breast", protein_g: 62.0, carbs_g: 0.0, sugar_g: 0.0, calories: 240, fat_g: 3.0 },
      { id: "m2_soya", name: "65g De-gassed Soya Chunks (Dry wt)", protein_g: 34.0, carbs_g: 22.0, sugar_g: 0.0, calories: 225, fat_g: 0.5 },
      { id: "m2_roti", name: "1 Whole Wheat Phulka / Roti", protein_g: 3.0, carbs_g: 16.0, sugar_g: 0.5, calories: 80, fat_g: 0.5 },
      { id: "m2_rice", name: "150g Cooked Basmati Rice", protein_g: 3.5, carbs_g: 42.0, sugar_g: 0.0, calories: 195, fat_g: 0.5 },
      { id: "m2_salad", name: "Fresh Cucumber & Tomato Salad", protein_g: 1.0, carbs_g: 5.0, sugar_g: 3.0, calories: 30, fat_g: 0.0 },
      { id: "m2_oil", name: "2 tsp Cooking Oil max (Measured strictly)", protein_g: 0.0, carbs_g: 0.0, sugar_g: 0.0, calories: 80, fat_g: 9.0 }
    ]
  }
};

let currentActiveMealKey = "meal_1";
let currentMealDraft = null;

function getTodayDateStr() {
  return new Date().toISOString().split("T")[0];
}

function getTodayDietState() {
  const today = getTodayDateStr();
  const raw = localStorage.getItem(`diet_state_${today}`);
  if (raw) {
    try { return JSON.parse(raw); } catch (e) {}
  }
  return {
    meal_1: { followed_items: [], extra_items: [] },
    fasting: { followed_items: [], extra_items: [] },
    meal_2: { followed_items: [], extra_items: [] }
  };
}

function saveTodayDietState(state) {
  const today = getTodayDateStr();
  localStorage.setItem(`diet_state_${today}`, JSON.stringify(state));
}

function calculateDietTotals(dietState) {
  let protein = 0, carbs = 0, sugar = 0, calories = 0, fat = 0;
  
  ["meal_1", "fasting", "meal_2"].forEach(mKey => {
    const mealDef = PRESCRIBED_MEALS[mKey];
    const mealData = dietState[mKey] || { followed_items: [], extra_items: [] };
    
    (mealData.followed_items || []).forEach(itemId => {
      const item = mealDef.items.find(i => i.id === itemId);
      if (item) {
        protein += item.protein_g;
        carbs += item.carbs_g;
        sugar += item.sugar_g;
        calories += item.calories;
        fat += item.fat_g;
      }
    });

    (mealData.extra_items || []).forEach(extra => {
      protein += parseFloat(extra.protein_g) || 0;
      carbs += parseFloat(extra.carbs_g) || 0;
      sugar += parseFloat(extra.sugar_g) || 0;
      calories += parseFloat(extra.calories) || 0;
      fat += parseFloat(extra.fat_g) || 0;
    });
  });

  return {
    protein: Math.round(protein * 10) / 10,
    carbs: Math.round(carbs * 10) / 10,
    sugar: Math.round(sugar * 10) / 10,
    calories: Math.round(calories),
    fat: Math.round(fat * 10) / 10
  };
}

function getDietItemsFlatList(dietState, dateStr) {
  const list = [];
  ["meal_1", "fasting", "meal_2"].forEach(mKey => {
    const mealDef = PRESCRIBED_MEALS[mKey];
    const mealData = dietState[mKey] || { followed_items: [], extra_items: [] };

    (mealData.followed_items || []).forEach(itemId => {
      const item = mealDef.items.find(i => i.id === itemId);
      if (item) {
        list.push({
          date: dateStr,
          meal_type: mKey,
          name: item.name,
          protein_g: item.protein_g,
          carbs_g: item.carbs_g,
          sugar_g: item.sugar_g,
          calories: item.calories,
          fat_g: item.fat_g,
          is_extra: 0
        });
      }
    });

    (mealData.extra_items || []).forEach(extra => {
      list.push({
        date: dateStr,
        meal_type: mKey,
        name: extra.name,
        protein_g: parseFloat(extra.protein_g) || 0,
        carbs_g: parseFloat(extra.carbs_g) || 0,
        sugar_g: parseFloat(extra.sugar_g) || 0,
        calories: parseFloat(extra.calories) || 0,
        fat_g: parseFloat(extra.fat_g) || 0,
        is_extra: 1
      });
    });
  });
  return list;
}

function updateNutritionDashboard() {
  const dietState = getTodayDietState();
  const totals = calculateDietTotals(dietState);

  const targetP = 155;
  const targetC = 185;
  const targetCal = 1850;

  const protText = document.getElementById("trackerProteinText");
  if (protText) protText.innerText = `${totals.protein} / ${targetP}g`;
  const protBar = document.getElementById("trackerProteinBar");
  if (protBar) protBar.style.width = `${Math.min(100, Math.round((totals.protein / targetP) * 100))}%`;

  const calText = document.getElementById("trackerCaloriesText");
  if (calText) calText.innerText = `${totals.calories.toLocaleString()} / ${targetCal.toLocaleString()}`;
  const calBar = document.getElementById("trackerCaloriesBar");
  if (calBar) calBar.style.width = `${Math.min(100, Math.round((totals.calories / targetCal) * 100))}%`;

  const carbsText = document.getElementById("trackerCarbsText");
  if (carbsText) carbsText.innerText = `${totals.carbs} / ${targetC}g`;
  const carbsBar = document.getElementById("trackerCarbsBar");
  if (carbsBar) carbsBar.style.width = `${Math.min(100, Math.round((totals.carbs / targetC) * 100))}%`;

  const sugarText = document.getElementById("trackerSugarText");
  if (sugarText) sugarText.innerText = `${totals.sugar}g`;
  const sugarBar = document.getElementById("trackerSugarBar");
  if (sugarBar) sugarBar.style.width = `${Math.min(100, Math.round((totals.sugar / 25) * 100))}%`;

  const metricMove = document.getElementById("metricMoveText");
  if (metricMove) metricMove.innerText = `${totals.calories} / ${targetCal} kcal`;

  ["meal_1", "fasting", "meal_2"].forEach(mKey => {
    const mealData = dietState[mKey] || { followed_items: [], extra_items: [] };
    const badgeEl = document.getElementById(mKey === "meal_1" ? "meal1Badge" : (mKey === "fasting" ? "fastingBadge" : "meal2Badge"));
    const countFollowed = (mealData.followed_items || []).length;
    const countExtra = (mealData.extra_items || []).length;
    
    if (badgeEl) {
      if (countFollowed > 0 || countExtra > 0) {
        badgeEl.className = "text-xs font-bold text-lime-400 flex-shrink-0";
        badgeEl.innerText = countExtra > 0 ? `✓ Logged (+${countExtra} extra)` : `✓ Followed`;
      } else {
        badgeEl.className = "text-xs font-medium text-zinc-500 flex-shrink-0";
        badgeEl.innerText = "Tap to log";
      }
    }
  });

  // Activity Ring 1 (Move / Diet) based on actual protein + calorie adherence
  const proteinCompliance = Math.min(1.0, totals.protein / targetP);
  const calorieRatio = totals.calories > 0 ? Math.min(1.0, totals.calories / targetCal) : 0;
  const dietCompliance = totals.protein > 0 ? (proteinCompliance * 0.75 + calorieRatio * 0.25) : 0;
  const moveOffset = 515.22 * (1 - Math.min(1, Math.max(0.05, dietCompliance)));
  const ringMove = document.getElementById("ringMove");
  if (ringMove) ringMove.style.strokeDashoffset = moveOffset;

  return dietCompliance;
}

// Meal Detail Fullscreen Page Handlers
function openMealDetailPage(mealKey) {
  currentActiveMealKey = mealKey;
  const mealDef = PRESCRIBED_MEALS[mealKey];
  if (!mealDef) return;

  const dietState = getTodayDietState();
  currentMealDraft = JSON.parse(JSON.stringify(dietState[mealKey] || { followed_items: [], extra_items: [] }));

  document.getElementById("mealDetailTitle").innerText = mealDef.title;
  document.getElementById("mealDetailSubtitle").innerText = mealDef.subtitle;
  document.getElementById("mealDetailBadge").innerText = mealDef.badge;

  renderMealPrescribedItems();
  renderMealExtraItems();
  recalculateMealHud();
  hideExtraFoodForm();

  const modal = document.getElementById("mealDetailPage");
  if (modal) modal.classList.remove("hidden-meal-page");
  if (navigator.vibrate) navigator.vibrate(20);
}

function closeMealDetailPage() {
  const modal = document.getElementById("mealDetailPage");
  if (modal) modal.classList.add("hidden-meal-page");
}

function renderMealPrescribedItems() {
  const container = document.getElementById("mealPrescribedItemsContainer");
  if (!container) return;
  const mealDef = PRESCRIBED_MEALS[currentActiveMealKey];
  container.innerHTML = "";

  mealDef.items.forEach(item => {
    const isChecked = (currentMealDraft.followed_items || []).includes(item.id);
    const row = document.createElement("label");
    row.className = "flex items-start space-x-3.5 p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] cursor-pointer active:scale-[0.99] transition";
    row.innerHTML = `
      <input type="checkbox" onchange="toggleMealItem('${item.id}', this.checked)" ${isChecked ? 'checked' : ''} class="mt-1 w-5 h-5 rounded-lg text-lime-400 focus:ring-0 bg-zinc-800 border-zinc-700 flex-shrink-0">
      <div class="min-w-0 flex-1">
        <span class="font-extrabold text-white text-sm block">${item.name}</span>
        <div class="flex flex-wrap items-center gap-2 mt-1 text-[11px] font-semibold text-zinc-400">
          <span class="text-lime-400 font-bold">${item.protein_g}g P</span>
          <span>•</span>
          <span class="text-cyan-400">${item.carbs_g}g C</span>
          <span>•</span>
          <span class="text-amber-400">${item.sugar_g}g Sugar</span>
          <span>•</span>
          <span class="text-[#ff2d55]">${item.calories} kcal</span>
        </div>
      </div>
    `;
    container.appendChild(row);
  });
}

function toggleMealItem(itemId, isChecked) {
  if (isChecked) {
    if (!currentMealDraft.followed_items.includes(itemId)) {
      currentMealDraft.followed_items.push(itemId);
    }
  } else {
    currentMealDraft.followed_items = currentMealDraft.followed_items.filter(id => id !== itemId);
  }
  recalculateMealHud();
  if (navigator.vibrate) navigator.vibrate(15);
}

function toggleAllMealItems(selectAll) {
  const mealDef = PRESCRIBED_MEALS[currentActiveMealKey];
  if (selectAll) {
    currentMealDraft.followed_items = mealDef.items.map(i => i.id);
  } else {
    currentMealDraft.followed_items = [];
  }
  renderMealPrescribedItems();
  recalculateMealHud();
  if (navigator.vibrate) navigator.vibrate(25);
}

function renderMealExtraItems() {
  const container = document.getElementById("mealExtraItemsContainer");
  const countBadge = document.getElementById("extraItemsCountBadge");
  if (!container) return;

  const extras = currentMealDraft.extra_items || [];
  if (countBadge) countBadge.innerText = `${extras.length} ${extras.length === 1 ? 'Item' : 'Items'}`;
  container.innerHTML = "";

  if (extras.length === 0) {
    container.innerHTML = `
      <div class="p-3 text-center rounded-xl bg-white/[0.01] border border-dashed border-white/[0.08] text-xs text-zinc-500">
        No extra foods eaten logged yet for this meal.
      </div>
    `;
    return;
  }

  extras.forEach((ex, idx) => {
    const card = document.createElement("div");
    card.className = "flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900 border border-white/10 space-x-3";
    card.innerHTML = `
      <div class="min-w-0 flex-1">
        <span class="font-extrabold text-white text-sm block truncate">${ex.name}</span>
        <div class="flex flex-wrap items-center gap-2 mt-1 text-[11px] font-semibold">
          <span class="text-lime-400 font-bold">${ex.protein_g}g P</span>
          <span>•</span>
          <span class="text-cyan-400">${ex.carbs_g}g C</span>
          <span>•</span>
          <span class="text-amber-400">${ex.sugar_g}g Sugar</span>
          <span>•</span>
          <span class="text-[#ff2d55]">${ex.calories} kcal</span>
        </div>
      </div>
      <button onclick="removeExtraFoodItem(${idx})" class="w-8 h-8 rounded-full bg-red-950/60 hover:bg-red-900/60 border border-red-800 text-red-400 flex items-center justify-center font-bold text-xs active:scale-95 transition flex-shrink-0">
        ✕
      </button>
    `;
    container.appendChild(card);
  });
}

function recalculateMealHud() {
  const mealDef = PRESCRIBED_MEALS[currentActiveMealKey];
  let p = 0, c = 0, s = 0, cal = 0;

  (currentMealDraft.followed_items || []).forEach(itemId => {
    const item = mealDef.items.find(i => i.id === itemId);
    if (item) {
      p += item.protein_g;
      c += item.carbs_g;
      s += item.sugar_g;
      cal += item.calories;
    }
  });

  (currentMealDraft.extra_items || []).forEach(ex => {
    p += parseFloat(ex.protein_g) || 0;
    c += parseFloat(ex.carbs_g) || 0;
    s += parseFloat(ex.sugar_g) || 0;
    cal += parseFloat(ex.calories) || 0;
  });

  p = Math.round(p * 10) / 10;
  c = Math.round(c * 10) / 10;
  s = Math.round(s * 10) / 10;
  cal = Math.round(cal);

  const pHud = document.getElementById("mealHudProtein");
  if (pHud) pHud.innerText = `${p}g`;
  const cHud = document.getElementById("mealHudCarbs");
  if (cHud) cHud.innerText = `${c}g`;
  const sHud = document.getElementById("mealHudSugar");
  if (sHud) sHud.innerText = `${s}g`;
  const calHud = document.getElementById("mealHudCalories");
  if (calHud) calHud.innerText = `${cal}`;
}

function showExtraFoodForm() {
  const form = document.getElementById("extraFoodFormCard");
  const btn = document.getElementById("btnShowAddExtraFood");
  if (form) form.classList.remove("hidden");
  if (btn) btn.classList.add("hidden");
  document.getElementById("inputExtraFoodName")?.focus();
}

function hideExtraFoodForm() {
  const form = document.getElementById("extraFoodFormCard");
  const btn = document.getElementById("btnShowAddExtraFood");
  if (form) form.classList.add("hidden");
  if (btn) btn.classList.remove("hidden");
  const nameInp = document.getElementById("inputExtraFoodName");
  if (nameInp) nameInp.value = "";
  const pInp = document.getElementById("inputExtraProtein");
  if (pInp) pInp.value = "";
  const cInp = document.getElementById("inputExtraCarbs");
  if (cInp) cInp.value = "";
  const sInp = document.getElementById("inputExtraSugar");
  if (sInp) sInp.value = "";
  const calInp = document.getElementById("inputExtraCalories");
  if (calInp) calInp.value = "";
}

function submitExtraFoodItem() {
  const nameInp = document.getElementById("inputExtraFoodName");
  const name = nameInp?.value.trim();
  if (!name) {
    alert("Please enter a name for the food or snack.");
    return;
  }

  const p = parseFloat(document.getElementById("inputExtraProtein")?.value) || 0;
  const c = parseFloat(document.getElementById("inputExtraCarbs")?.value) || 0;
  const s = parseFloat(document.getElementById("inputExtraSugar")?.value) || 0;
  let cal = parseFloat(document.getElementById("inputExtraCalories")?.value);
  if (isNaN(cal) || cal <= 0) {
    cal = Math.round(p * 4 + c * 4 + 20);
  }

  const newItem = {
    name: name,
    meal_type: currentActiveMealKey,
    protein_g: p,
    carbs_g: c,
    sugar_g: s,
    calories: cal,
    fat_g: 0,
    is_extra: 1
  };

  currentMealDraft.extra_items.push(newItem);
  hideExtraFoodForm();
  renderMealExtraItems();
  recalculateMealHud();
  if (navigator.vibrate) navigator.vibrate(30);
}

function removeExtraFoodItem(index) {
  if (currentMealDraft.extra_items) {
    currentMealDraft.extra_items.splice(index, 1);
    renderMealExtraItems();
    recalculateMealHud();
    if (navigator.vibrate) navigator.vibrate(20);
  }
}

async function saveCurrentMealAndSync() {
  const today = getTodayDateStr();
  const dietState = getTodayDietState();
  dietState[currentActiveMealKey] = currentMealDraft;
  saveTodayDietState(dietState);

  const totals = calculateDietTotals(dietState);
  const itemsList = getDietItemsFlatList(dietState, today);

  const mealPayload = {
    date: today,
    breakfast_eggs: dietState.meal_1?.followed_items?.includes("m1_eggs") ? 6 : 0,
    breakfast_rotis: dietState.meal_1?.followed_items?.includes("m1_rotis") ? 2 : 0,
    dinner_chicken_g: dietState.meal_2?.followed_items?.includes("m2_chicken") ? 200.0 : 0,
    dinner_soya_g: dietState.meal_2?.followed_items?.includes("m2_soya") ? 65.0 : 0,
    dinner_rice_g: dietState.meal_2?.followed_items?.includes("m2_rice") ? 150.0 : 0,
    total_oil_tsp: dietState.meal_2?.followed_items?.includes("m2_oil") ? 2.0 : 0,
    zero_sugar_cans: dietState.fasting?.followed_items?.includes("f_soda") ? 1 : 0,
    total_protein_g: totals.protein,
    total_carbs_g: totals.carbs,
    total_sugar_g: totals.sugar,
    total_calories: totals.calories,
    items_json: JSON.stringify(itemsList),
    items: itemsList,
    notes: ""
  };

  let queue = JSON.parse(localStorage.getItem("offline_sync_queue") || '{"daily_metrics":[],"biofeedback":[],"workouts":[],"meals":[]}');
  queue.meals = queue.meals.filter(m => m.date !== today);
  queue.meals.push(mealPayload);
  localStorage.setItem("offline_sync_queue", JSON.stringify(queue));

  updateNutritionDashboard();
  triggerChimeSuccess();
  closeMealDetailPage();
  triggerManualSync();
}

// Web Audio API Synthesizer (Zero Audio Files Needed)
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playBeep(freq = 440, duration = 0.15, type = "sine") {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    console.log("Audio not allowed yet");
  }
}

function triggerChimeSuccess() {
  playBeep(523.25, 0.12); // C5
  setTimeout(() => playBeep(659.25, 0.12), 120); // E5
  setTimeout(() => playBeep(783.99, 0.25), 240); // G5
  if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
}

function triggerStudioAudioBeep() {
  playBeep(880, 0.2, "triangle");
  if (navigator.vibrate) navigator.vibrate(50);
}

// Initialize on DOM Ready
document.addEventListener("DOMContentLoaded", () => {
  initServiceWorker();
  initBodyPartChips();
  initMacIp();
  renderWorkoutExercises();
  loadQuotes();
  loadTodayData();
  updateNutritionDashboard();
  updateActivityRings();
  checkLanConnection();

  // Set today date badge (under Today heading)
  const now = new Date();
  const options = { weekday: 'long', month: 'long', day: 'numeric' };
  const badge = document.getElementById("currentDateBadge");
  if (badge) badge.innerText = now.toLocaleDateString('en-US', options);

  // Watch steps input for live ring updates
  const stepsInput = document.getElementById("inputSteps");
  if (stepsInput) {
    stepsInput.addEventListener("change", updateActivityRings);
    stepsInput.addEventListener("input", updateActivityRings);
  }
});

// Service Worker for Offline PWA
function initServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(e => console.log("SW Error:", e));
  }
}

// Client Profile & Settings Drawer (Slide-Over Panel)
function toggleClientDrawer(forceClose = false) {
  const backdrop = document.getElementById("clientDrawerBackdrop");
  const panel = document.getElementById("clientDrawerPanel");
  if (!backdrop || !panel) return;

  const isCurrentlyOpen = panel.classList.contains("active");
  if (isCurrentlyOpen || forceClose) {
    panel.classList.remove("active");
    backdrop.classList.remove("active");
    setTimeout(() => {
      if (!panel.classList.contains("active")) backdrop.classList.add("hidden");
    }, 280);
  } else {
    backdrop.classList.remove("hidden");
    void backdrop.offsetWidth; // trigger reflow
    backdrop.classList.add("active");
    panel.classList.add("active");
    if (navigator.vibrate) navigator.vibrate(20);
  }
}

// Close drawer on escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") toggleClientDrawer(true);
});

// Navigation Tabs
function switchTab(tabName) {
  document.querySelectorAll(".tab-content").forEach((el) => el.classList.add("hidden"));
  document.querySelectorAll(".nav-tab-item").forEach((btn) => btn.classList.remove("active"));
  
  const targetTab = document.getElementById(`tab-${tabName}`);
  const targetBtn = document.getElementById(`nav-${tabName}`);
  if (targetTab) targetTab.classList.remove("hidden");
  if (targetBtn) targetBtn.classList.add("active");

  if (tabName === "analytics") {
    fetchAnalytics();
  }
  if (tabName === "today") {
    updateNutritionDashboard();
    updateActivityRings();
  }
}

// Update Apple Activity Rings (SVG Animation)
function updateActivityRings() {
  // Ring 1: Move / Diet (adherence from protein + calories)
  const dietCompliance = updateNutritionDashboard();

  // Ring 2: Exercise (Circumference: 2 * PI * 64 = ~402.12)
  const queue = JSON.parse(localStorage.getItem("offline_sync_queue") || '{"workouts":[]}');
  const today = new Date().toISOString().split("T")[0];
  const todayWorkout = queue.workouts?.find(w => w.date === today);
  const setsLogged = todayWorkout ? todayWorkout.sets?.length || 0 : 0;
  const targetSets = 10;
  const exerciseCompliance = Math.min(1, setsLogged / targetSets);
  const exerciseOffset = 402.12 * (1 - Math.max(0.05, exerciseCompliance));
  const ringExercise = document.getElementById("ringExercise");
  if (ringExercise) ringExercise.style.strokeDashoffset = exerciseOffset;
  const metricEx = document.getElementById("metricExerciseText");
  if (metricEx) metricEx.innerText = `${setsLogged} / 10 Sets`;

  // Ring 3: Steps (Circumference: 2 * PI * 46 = ~289.03)
  const steps = parseInt(document.getElementById("inputSteps")?.value) || 0;
  const stepTarget = 9000;
  const stepCompliance = Math.min(1, steps / stepTarget);
  const stepsOffset = 289.03 * (1 - Math.max(0.05, stepCompliance));
  const ringSteps = document.getElementById("ringSteps");
  if (ringSteps) ringSteps.style.strokeDashoffset = stepsOffset;
  const metricSteps = document.getElementById("metricStepsText");
  if (metricSteps) metricSteps.innerText = `${steps.toLocaleString()} / 9k`;

  // Total Summary %
  const totalAvg = Math.round(((dietCompliance + exerciseCompliance + stepCompliance) / 3) * 100);
  const pctEl = document.getElementById("ringSummaryPct");
  if (pctEl) pctEl.innerText = `${totalAvg}%`;
}

// Sliders and Biofeedback
function updateSliderText(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerText = `${value} / 10`;

  // Dynamic Readiness Calculation: 10 - (Fatigue + Pain)/2
  const f = parseInt(document.getElementById("sliderFatigue")?.value) || 3;
  const p = parseInt(document.getElementById("sliderPain")?.value) || 2;
  const readiness = Math.max(1, Math.min(10, Math.round(10 - (f + p) / 2)));
  const badge = document.getElementById("readinessScoreBadge");
  if (badge) {
    if (readiness >= 7) {
      badge.innerText = `Readiness: ${readiness}/10`;
      badge.className = "text-xs font-bold text-lime-400";
    } else if (readiness >= 5) {
      badge.innerText = `Readiness: ${readiness}/10`;
      badge.className = "text-xs font-bold text-yellow-400";
    } else {
      badge.innerText = `Readiness: ${readiness}/10 (Deload Alert)`;
      badge.className = "text-xs font-bold text-red-400";
    }
  }
}

function initBodyPartChips() {
  const container = document.getElementById("bodyPartsChips");
  if (!container) return;

  container.addEventListener("click", (e) => {
    const chip = e.target.closest(".health-chip");
    if (!chip) return;
    const part = chip.getAttribute("data-part");
    if (selectedBodyParts.has(part)) {
      selectedBodyParts.delete(part);
      chip.classList.remove("active");
    } else {
      selectedBodyParts.add(part);
      chip.classList.add("active");
    }
    if (navigator.vibrate) navigator.vibrate(20);
  });
}

// Pain Type Selector Handler
function selectPainType(val) {
  document.querySelectorAll("#painTypePills .option-pill").forEach(p => {
    p.classList.remove("active");
  });
  const activeBtn = document.querySelector(`#painTypePills button[data-val="${val}"]`);
  if (activeBtn) activeBtn.classList.add("active");
  const hiddenInput = document.getElementById("selectPainType");
  if (hiddenInput) hiddenInput.value = val;
  if (navigator.vibrate) navigator.vibrate(20);
}

// Mac IP Setup
function initMacIp() {
  const savedIp = localStorage.getItem("mac_ip") || window.location.origin;
  const input = document.getElementById("inputMacIp");
  if (input) input.value = savedIp;
}

function saveMacIp() {
  const input = document.getElementById("inputMacIp");
  if (input && input.value.trim()) {
    localStorage.setItem("mac_ip", input.value.trim());
    alert("Mac Host IP Saved: " + input.value.trim());
    checkLanConnection();
  }
}

function getMacHost() {
  return localStorage.getItem("mac_ip") || window.location.origin;
}

// LAN Connectivity Check
async function checkLanConnection() {
  const host = getMacHost();
  const syncDot = document.getElementById("syncDot");
  const syncStatusText = document.getElementById("syncStatusText");
  try {
    const res = await fetch(`${host}/api/ping`, { method: "GET", signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      syncDot.className = "w-2 h-2 rounded-full bg-lime-400 shadow-[0_0_8px_#a1ff00]";
      syncStatusText.innerText = "Mac Online";
      
      // Dynamically load athlete profile from Mac server
      try {
        const profRes = await fetch(`${host}/api/profile`, { method: "GET", signal: AbortSignal.timeout(1500) });
        if (profRes.ok) {
          const profile = await profRes.json();
          if (profile && profile.name) {
            const nameEl = document.getElementById("drawer-athlete-name");
            const initEl = document.getElementById("drawer-athlete-initials");
            const specEl = document.getElementById("drawer-athlete-specs");
            const wtEl = document.getElementById("drawer-athlete-weight");
            const tgtEl = document.getElementById("drawer-athlete-targets");
            const stepEl = document.getElementById("drawer-athlete-steps");
            if (nameEl) nameEl.innerText = profile.name;
            if (initEl) {
              const parts = profile.name.trim().split(" ");
              initEl.innerText = parts.length > 1 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : parts[0].slice(0, 2).toUpperCase();
            }
            if (specEl && profile.age && profile.height_cm) {
              specEl.innerText = `${profile.age}y ${profile.gender || 'Male'} • ${profile.height_cm} cm`;
            }
            if (wtEl && profile.starting_weight_kg) {
              wtEl.innerText = `${profile.starting_weight_kg} kg ➔ ${profile.starting_weight_kg - 6} kg (-500 kcal)`;
            }
            if (tgtEl && profile.target_calories && profile.target_protein_g) {
              tgtEl.innerText = `${profile.target_calories.toLocaleString()} kcal • ${profile.target_protein_g}g Protein`;
            }
            if (stepEl && profile.target_daily_steps) {
              stepEl.innerText = `${profile.target_daily_steps.toLocaleString()} Steps / Day`;
            }
          }
        }
      } catch (err) {
        // Fallback to static dummy profile
      }
      
      return true;
    }
  } catch (err) {
    syncDot.className = "w-2 h-2 rounded-full bg-zinc-500";
    syncStatusText.innerText = "Saved Offline";
  }
  return false;
}

// Save Daily Log
async function saveDailyLog() {
  const today = new Date().toISOString().split("T")[0];
  const weight = parseFloat(document.getElementById("inputWeight").value) || null;
  const steps = parseInt(document.getElementById("inputSteps").value) || 0;
  const fasting = document.getElementById("checkFasting")?.checked ? 1 : 0;
  const fatigue = parseInt(document.getElementById("sliderFatigue")?.value) || 3;
  const pain = parseInt(document.getElementById("sliderPain")?.value) || 2;
  const headache = document.getElementById("checkHeadache")?.checked ? 1 : (selectedBodyParts.has("neck") ? 1 : 0);
  const painType = document.getElementById("selectPainType")?.value || (pain > 3 ? "muscular_doms" : "none");

  const bfastEggs = document.getElementById("checkBreakfast")?.checked ? 6 : 0;
  const dinnerChicken = document.getElementById("checkDinner")?.checked ? 200.0 : 0;

  const dailyPayload = {
    date: today,
    morning_weight_kg: weight,
    steps: steps,
    sleep_hours: 6.5,
    sleep_quality: 5,
    stress_level: 5,
    fasting_completed: fasting,
    water_liters: 3.5,
    notes: ""
  };

  const bioPayload = {
    date: today,
    fatigue_score: fatigue,
    pain_score: pain,
    pain_type: painType,
    body_parts: Array.from(selectedBodyParts),
    headache_present: headache,
    notes: ""
  };

  const dietState = getTodayDietState();
  const totals = calculateDietTotals(dietState);
  const itemsList = getDietItemsFlatList(dietState, today);

  const mealPayload = {
    date: today,
    breakfast_eggs: dietState.meal_1?.followed_items?.includes("m1_eggs") ? 6 : 0,
    breakfast_rotis: dietState.meal_1?.followed_items?.includes("m1_rotis") ? 2 : 0,
    dinner_chicken_g: dietState.meal_2?.followed_items?.includes("m2_chicken") ? 200.0 : 0,
    dinner_soya_g: dietState.meal_2?.followed_items?.includes("m2_soya") ? 65.0 : 0,
    dinner_rice_g: dietState.meal_2?.followed_items?.includes("m2_rice") ? 150.0 : 0,
    total_oil_tsp: dietState.meal_2?.followed_items?.includes("m2_oil") ? 2.0 : 0,
    zero_sugar_cans: dietState.fasting?.followed_items?.includes("f_soda") ? 1 : 0,
    total_protein_g: totals.protein,
    total_carbs_g: totals.carbs,
    total_sugar_g: totals.sugar,
    total_calories: totals.calories,
    items_json: JSON.stringify(itemsList),
    items: itemsList,
    notes: ""
  };

  let queue = JSON.parse(localStorage.getItem("offline_sync_queue") || '{"daily_metrics":[],"biofeedback":[],"workouts":[],"meals":[]}');
  queue.daily_metrics = queue.daily_metrics.filter(m => m.date !== today);
  queue.daily_metrics.push(dailyPayload);

  queue.biofeedback = queue.biofeedback.filter(b => b.date !== today);
  queue.biofeedback.push(bioPayload);

  queue.meals = queue.meals.filter(ml => ml.date !== today);
  queue.meals.push(mealPayload);

  localStorage.setItem("offline_sync_queue", JSON.stringify(queue));
  triggerChimeSuccess();
  updateActivityRings();
  triggerManualSync();
}

// Split Metadata for Hero Spotlight
const SPLIT_METADATA = {
  "Upper A": {
    title: "Upper A: Horizontal Compounds",
    muscles: "Target: Chest • Lats • Rhomboids • Grip Tension",
    tag: "HIGH MECHANICAL TENSION",
    duration: "35–40 Mins • 10 Sets"
  },
  "Lower A": {
    title: "Lower A: Squat Compound + Abs",
    muscles: "Target: Quads • Hamstrings • Glutes • Core",
    tag: "HEAVY SYSTEMIC STIMULUS",
    duration: "40–45 Mins • 10 Sets"
  },
  "Upper B": {
    title: "Upper B: Vertical Compounds + Neck",
    muscles: "Target: Deltoids (OHP) • Lats • Upper Chest • Neck",
    tag: "VERTICAL FORCE PRODUCTION",
    duration: "35–40 Mins • 10 Sets"
  },
  "Lower B": {
    title: "Lower B: Deadlift Compound + Calves",
    muscles: "Target: Posterior Chain • Deadlift • Calves • Obliques",
    tag: "POSTERIOR CHAIN OVERLOAD",
    duration: "40–45 Mins • 10 Sets"
  },
  "Home Bar-Ground": {
    title: "Weeks 1–2: Home Bar & Ground Priming",
    muscles: "Target: Pull-ups • Push-ups • Split Squats • Grip",
    tag: "MOTOR UNIT PRIMING",
    duration: "30–35 Mins • 12 Sets"
  }
};

function selectWorkoutSplit(splitName) {
  document.querySelectorAll("#workoutSplitPills button").forEach(btn => {
    if (btn.getAttribute("data-split") === splitName) {
      btn.className = "segmented-tab active";
    } else {
      btn.className = "segmented-tab";
    }
  });

  const select = document.getElementById("workoutTypeSelect");
  if (select) select.value = splitName;

  const meta = SPLIT_METADATA[splitName] || SPLIT_METADATA["Upper A"];
  const titleEl = document.getElementById("workoutSpotlightTitle");
  if (titleEl) titleEl.innerText = meta.title;
  const heroTitleEl = document.getElementById("heroWorkoutTitle");
  if (heroTitleEl) heroTitleEl.innerText = meta.title;
  const musclesEl = document.getElementById("workoutSpotlightMuscles");
  if (musclesEl) musclesEl.innerText = meta.muscles;
  const tagEl = document.getElementById("workoutSpotlightTag");
  if (tagEl) tagEl.innerText = meta.tag;
  const durEl = document.getElementById("workoutSpotlightDuration");
  if (durEl) durEl.innerText = meta.duration;

  renderWorkoutExercises();
  if (navigator.vibrate) navigator.vibrate(20);
}

// Render Exercises in 2-Set Tab (Spacious Apple Fitness+ Movement Layout)
function renderWorkoutExercises() {
  const type = document.getElementById("workoutTypeSelect")?.value || "Upper A";
  const container = document.getElementById("exerciseListContainer");
  if (!container) return;
  const exercises = WORKOUT_DEFINITIONS[type] || [];
  container.innerHTML = "";

  exercises.forEach((ex, idx) => {
    const card = document.createElement("div");
    card.className = "apple-card space-y-4 p-6";
    card.innerHTML = `
      <!-- Movement Header -->
      <div class="space-y-1.5 border-b border-white/[0.08] pb-3.5">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            Movement ${idx + 1} of ${exercises.length}
          </span>
          <span class="text-xs font-bold text-lime-400 bg-lime-950/60 px-3 py-0.5 rounded-full border border-lime-800">
            2 Hard Sets
          </span>
        </div>
        <h3 class="text-xl font-black text-white tracking-tight">${ex.name}</h3>
        ${ex.cue ? `<p class="text-xs text-zinc-400 leading-relaxed pt-0.5 flex items-start gap-1.5"><span class="text-lime-400">💡</span> <span>${ex.cue}</span></p>` : ''}
      </div>

      <!-- Set 1: Heavy Top Set Card -->
      <div class="workout-set-card space-y-3" id="ex_${idx}_s1_card">
        <div class="flex items-center justify-between">
          <span class="text-xs font-black text-purple-400 bg-purple-950/60 px-3 py-1 rounded-full border border-purple-800/60 flex items-center gap-1.5">
            🔥 Set 1: Top Set
          </span>
          <span class="text-[11px] font-bold text-zinc-400">Target: ${ex.repsTop} reps @ 1 RIR</span>
        </div>

        <div class="grid grid-cols-2 gap-3 pt-1">
          <div class="space-y-1">
            <label class="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Load (Weight)</label>
            <div class="relative flex items-center">
              <input type="number" step="0.5" id="ex_${idx}_s1_wt" value="${typeof ex.defaultTop === 'number' ? ex.defaultTop : 0}" class="apple-num-input w-full pr-8">
              <span class="absolute right-3 text-xs text-zinc-500 font-bold pointer-events-none">${typeof ex.defaultTop === 'number' ? 'kg' : 'BW'}</span>
            </div>
          </div>
          <div class="space-y-1">
            <label class="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Reps Logged</label>
            <div class="relative flex items-center">
              <input type="number" id="ex_${idx}_s1_reps" value="${parseInt(ex.repsTop) || 8}" class="apple-num-input w-full pr-10">
              <span class="absolute right-3 text-xs text-zinc-500 font-bold pointer-events-none">reps</span>
            </div>
          </div>
        </div>

        <input type="hidden" id="ex_${idx}_s1_rpe" value="8.5">
        <button type="button" onclick="toggleSetComplete(this, 's1')" class="w-full py-2.5 rounded-xl bg-purple-950/50 hover:bg-purple-900/50 border border-purple-800/70 text-purple-300 font-bold text-xs uppercase tracking-wider active:scale-95 transition">
          ✓ Mark Top Set Done
        </button>
      </div>

      <!-- Set 2: Back-off Set Card -->
      <div class="workout-set-card space-y-3" id="ex_${idx}_s2_card">
        <div class="flex items-center justify-between">
          <span class="text-xs font-black text-lime-400 bg-lime-950/60 px-3 py-1 rounded-full border border-lime-800/60 flex items-center gap-1.5">
            ⚡ Set 2: Back-off
          </span>
          <span class="text-[11px] font-bold text-zinc-400">Target: ${ex.repsBack} to Failure</span>
        </div>

        <div class="grid grid-cols-2 gap-3 pt-1">
          <div class="space-y-1">
            <label class="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Load (-12% Drop)</label>
            <div class="relative flex items-center">
              <input type="number" step="0.5" id="ex_${idx}_s2_wt" value="${typeof ex.defaultBack === 'number' ? ex.defaultBack : 0}" class="apple-num-input w-full pr-8">
              <span class="absolute right-3 text-xs text-zinc-500 font-bold pointer-events-none">${typeof ex.defaultBack === 'number' ? 'kg' : 'BW'}</span>
            </div>
          </div>
          <div class="space-y-1">
            <label class="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Reps to Failure</label>
            <div class="relative flex items-center">
              <input type="number" id="ex_${idx}_s2_reps" value="${parseInt(ex.repsBack) || 10}" class="apple-num-input w-full pr-10">
              <span class="absolute right-3 text-xs text-zinc-500 font-bold pointer-events-none">reps</span>
            </div>
          </div>
        </div>

        <input type="hidden" id="ex_${idx}_s2_rpe" value="10.0">
        <button type="button" onclick="toggleSetComplete(this, 's2')" class="w-full py-2.5 rounded-xl bg-lime-950/50 hover:bg-lime-900/50 border border-lime-800/70 text-lime-400 font-bold text-xs uppercase tracking-wider active:scale-95 transition">
          ✓ Mark Back-Off Done
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

function toggleSetComplete(btn, setType) {
  const card = btn.closest(".workout-set-card");
  if (!card) return;
  const isDone = card.classList.toggle("is-completed");
  if (isDone) {
    btn.innerHTML = "✓ Completed";
    btn.className = "w-full py-2.5 rounded-xl bg-lime-400 text-black font-black text-xs uppercase tracking-wider active:scale-95 transition shadow-lg shadow-lime-500/20";
    triggerChimeSuccess();
  } else {
    btn.innerHTML = setType === 's1' ? "✓ Mark Top Set Done" : "✓ Mark Back-Off Done";
    btn.className = setType === 's1'
      ? "w-full py-2.5 rounded-xl bg-purple-950/50 hover:bg-purple-900/50 border border-purple-800/70 text-purple-300 font-bold text-xs uppercase tracking-wider active:scale-95 transition"
      : "w-full py-2.5 rounded-xl bg-lime-950/50 hover:bg-lime-900/50 border border-lime-800/70 text-lime-400 font-bold text-xs uppercase tracking-wider active:scale-95 transition";
    if (navigator.vibrate) navigator.vibrate(15);
  }
}

// Save Workout Session
async function saveWorkoutSession() {
  const today = new Date().toISOString().split("T")[0];
  const type = document.getElementById("workoutTypeSelect").value;
  const exercises = WORKOUT_DEFINITIONS[type] || [];
  
  const setsData = [];
  exercises.forEach((ex, idx) => {
    const s1WtInput = document.getElementById(`ex_${idx}_s1_wt`);
    const s1RepsInput = document.getElementById(`ex_${idx}_s1_reps`);
    const s1RpeInput = document.getElementById(`ex_${idx}_s1_rpe`);

    const s2WtInput = document.getElementById(`ex_${idx}_s2_wt`);
    const s2RepsInput = document.getElementById(`ex_${idx}_s2_reps`);
    const s2RpeInput = document.getElementById(`ex_${idx}_s2_rpe`);

    const s1Wt = s1WtInput && s1WtInput.value !== "" ? parseFloat(s1WtInput.value) : (typeof ex.defaultTop === 'number' ? ex.defaultTop : 0);
    const s1Reps = s1RepsInput && s1RepsInput.value !== "" ? parseInt(s1RepsInput.value) : (parseInt(ex.repsTop) || 8);
    const s1Rpe = s1RpeInput && s1RpeInput.value !== "" ? parseFloat(s1RpeInput.value) : 8.5;

    const s2Wt = s2WtInput && s2WtInput.value !== "" ? parseFloat(s2WtInput.value) : (typeof ex.defaultBack === 'number' ? ex.defaultBack : 0);
    const s2Reps = s2RepsInput && s2RepsInput.value !== "" ? parseInt(s2RepsInput.value) : (parseInt(ex.repsBack) || 10);
    const s2Rpe = s2RpeInput && s2RpeInput.value !== "" ? parseFloat(s2RpeInput.value) : 10.0;

    if (s1Reps > 0) {
      setsData.push({ exercise_name: ex.name, set_type: "top_set", weight_kg: s1Wt, reps: s1Reps, rpe: s1Rpe, to_failure: 0 });
    }
    if (s2Reps > 0) {
      setsData.push({ exercise_name: ex.name, set_type: "backoff_set", weight_kg: s2Wt, reps: s2Reps, rpe: s2Rpe, to_failure: 1 });
    }
  });

  const workoutPayload = {
    date: today,
    workout_type: type,
    notes: "Fitness+ Studio Session",
    sets: setsData
  };

  let queue = JSON.parse(localStorage.getItem("offline_sync_queue") || '{"daily_metrics":[],"biofeedback":[],"workouts":[],"meals":[]}');
  queue.workouts = queue.workouts.filter(w => w.date !== today);
  queue.workouts.push(workoutPayload);
  localStorage.setItem("offline_sync_queue", JSON.stringify(queue));

  triggerChimeSuccess();
  updateActivityRings();
  triggerManualSync();
}

// ============================================================================
// APPLE FITNESS+ FULLSCREEN STUDIO PLAYER ENGINE
// ============================================================================
function launchStudioPlayer() {
  const player = document.getElementById("studioPlayerView");
  if (!player) return;

  player.classList.remove("hidden-player");
  studioActive = true;
  studioExerciseIndex = 0;
  studioElapsedSeconds = 0;

  // Start stopwatch
  if (studioTimerInterval) clearInterval(studioTimerInterval);
  studioTimerInterval = setInterval(() => {
    studioElapsedSeconds++;
    const mins = Math.floor(studioElapsedSeconds / 60).toString().padStart(2, '0');
    const secs = (studioElapsedSeconds % 60).toString().padStart(2, '0');
    const el = document.getElementById("studioElapsedTimer");
    if (el) el.innerText = `${mins}:${secs}`;
  }, 1000);

  updateStudioExerciseUI();
  triggerStudioAudioBeep();
}

function closeStudioPlayer() {
  const player = document.getElementById("studioPlayerView");
  if (player) player.classList.add("hidden-player");
  studioActive = false;
  if (studioTimerInterval) clearInterval(studioTimerInterval);
  if (studioRestInterval) clearInterval(studioRestInterval);
}

function updateStudioExerciseUI() {
  const type = document.getElementById("workoutTypeSelect").value;
  const exercises = WORKOUT_DEFINITIONS[type] || [];
  if (exercises.length === 0) return;

  const currentEx = exercises[studioExerciseIndex % exercises.length];
  const nextEx = exercises[(studioExerciseIndex + 1) % exercises.length];

  document.getElementById("studioExerciseIndex").innerText = `Exercise ${studioExerciseIndex + 1} of ${exercises.length}`;
  document.getElementById("studioExerciseTitle").innerText = currentEx.name;
  document.getElementById("studioExerciseCue").innerText = currentEx.cue || `Top: ${currentEx.defaultTop}kg • Back-off: ${currentEx.defaultBack}kg`;
  document.getElementById("studioUpNextText").innerText = nextEx ? nextEx.name : "Session Cooldown";

  // Reset circle
  const circle = document.getElementById("studioTimerCircle");
  if (circle) circle.style.strokeDashoffset = "0";
}

function recordStudioSet(setNum) {
  triggerChimeSuccess();
  startStudioRestTimer(setNum === 1 ? 120 : 90); // 2 min rest after top set, 90s after back-off
}

function startStudioRestTimer(seconds) {
  if (studioRestInterval) clearInterval(studioRestInterval);
  studioRestRemaining = seconds;
  const total = seconds;
  const circle = document.getElementById("studioTimerCircle");
  const phase = document.getElementById("studioPhaseIndicator");
  if (phase) phase.innerText = `REST PERIOD (${seconds}S)`;

  studioRestInterval = setInterval(() => {
    studioRestRemaining--;
    if (circle) {
      const offset = 326.72 * (1 - (studioRestRemaining / total));
      circle.style.strokeDashoffset = offset;
    }

    if (studioRestRemaining <= 3 && studioRestRemaining > 0) {
      playBeep(440, 0.1); // Countdown beep
    }

    if (studioRestRemaining <= 0) {
      clearInterval(studioRestInterval);
      playBeep(880, 0.3); // High GO chime
      if (navigator.vibrate) navigator.vibrate([100, 100, 100]);
      if (phase) phase.innerText = "NEXT SET READY";
      if (circle) circle.style.strokeDashoffset = "0";
    }
  }, 1000);
}

function nextStudioExercise() {
  const type = document.getElementById("workoutTypeSelect").value;
  const exercises = WORKOUT_DEFINITIONS[type] || [];
  if (studioExerciseIndex < exercises.length - 1) {
    studioExerciseIndex++;
    updateStudioExerciseUI();
    triggerStudioAudioBeep();
  } else {
    // Workout Completed!
    triggerChimeSuccess();
    alert("🏆 Studio Workout Complete! Incredible focus.");
    saveWorkoutSession();
    closeStudioPlayer();
  }
}

// Quotes Paging
async function loadQuotes() {
  const host = getMacHost();
  try {
    const res = await fetch(`${host}/api/quotes`);
    if (res.ok) allQuotes = await res.json();
  } catch (err) {
    allQuotes = LOCAL_QUOTES;
  }
  if (!allQuotes || allQuotes.length === 0) allQuotes = LOCAL_QUOTES;
  filteredQuotes = [...allQuotes];
  showQuote(0);
}

function filterQuotes(category) {
  document.querySelectorAll("#quoteFilters button").forEach(b => {
    b.className = "px-4 py-2 rounded-full bg-zinc-900 text-zinc-400 font-bold text-xs border border-white/10 whitespace-nowrap active:scale-95 transition";
  });
  if (window.event && window.event.target) {
    window.event.target.className = "px-4 py-2 rounded-full bg-white text-black font-extrabold text-xs whitespace-nowrap active:scale-95 transition";
  }

  filteredQuotes = category === "all" ? [...allQuotes] : allQuotes.filter(q => q.category === category);
  currentQuoteIndex = 0;
  showQuote(0);
}

function showQuote(index) {
  if (!filteredQuotes || filteredQuotes.length === 0) return;
  const q = filteredQuotes[index % filteredQuotes.length];
  document.getElementById("quoteText").innerText = `"${q.text}"`;
  document.getElementById("quoteAuthor").innerText = `— ${q.author}`;
  document.getElementById("quoteCategoryBadge").innerText = `${q.category.toUpperCase()} FOCUS`;
}

function nextQuote() {
  currentQuoteIndex++;
  showQuote(currentQuoteIndex);
  if (navigator.vibrate) navigator.vibrate(25);
}

// TCP/IP LAN Batch Sync
async function triggerManualSync() {
  const host = getMacHost();
  const queue = JSON.parse(localStorage.getItem("offline_sync_queue") || '{"daily_metrics":[],"biofeedback":[],"workouts":[],"meals":[]}');
  const syncDot = document.getElementById("syncDot");
  const syncStatusText = document.getElementById("syncStatusText");

  syncDot.className = "w-2 h-2 rounded-full bg-yellow-400 animate-spin";
  syncStatusText.innerText = "Syncing...";

  try {
    const res = await fetch(`${host}/api/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(queue)
    });

    if (res.ok) {
      const data = await res.json();
      syncDot.className = "w-2 h-2 rounded-full bg-lime-400 shadow-[0_0_8px_#a1ff00]";
      syncStatusText.innerText = "Mac Synced";

      localStorage.setItem("offline_sync_queue", '{"daily_metrics":[],"biofeedback":[],"workouts":[],"meals":[]}');

      if (data.coach_decision) {
        document.getElementById("coachStatusMsg").innerText = data.coach_decision.message;
        document.getElementById("coachStatusRec").innerText = data.coach_decision.recommendation;
      }
      return true;
    }
  } catch (err) {
    syncDot.className = "w-2 h-2 rounded-full bg-zinc-500";
    syncStatusText.innerText = "Saved Offline";
  }
  return false;
}

// Analytics & Reports
async function fetchAnalytics() {
  const host = getMacHost();
  try {
    const res = await fetch(`${host}/api/analytics`);
    if (res.ok) {
      const data = await res.json();
      if (data.coach_decision) {
        const msgEl = document.getElementById("coachStatusMsg");
        const recEl = document.getElementById("coachStatusRec");
        if (msgEl) msgEl.innerText = data.coach_decision.message;
        if (recEl) recEl.innerText = data.coach_decision.recommendation;
      }
      if (data.rolling_weights && data.rolling_weights.length > 0) {
        renderWeightSparkline(data.rolling_weights);
      }
      if (data.exercise_progressions) {
        renderProgressionHighlights(data.exercise_progressions);
      }
    }
  } catch (err) {
    console.log("Analytics offline");
  }
}

function renderWeightSparkline(rollingWeights) {
  if (!rollingWeights || rollingWeights.length === 0) return;

  const latest = rollingWeights[rollingWeights.length - 1];
  const avgElem = document.getElementById("trendWeightAvg");
  if (avgElem) {
    avgElem.innerText = (latest.rolling_avg_weight || latest.raw_weight || 78.8).toFixed(1);
  }

  const pillElem = document.getElementById("trendTrajectoryPill");
  if (pillElem) {
    if (rollingWeights.length >= 7) {
      const weekAgo = rollingWeights[rollingWeights.length - 7];
      const diff = (latest.rolling_avg_weight || latest.raw_weight) - (weekAgo.rolling_avg_weight || weekAgo.raw_weight);
      if (diff <= -0.2) {
        pillElem.innerText = `📉 On Track (${diff.toFixed(1)} kg/wk)`;
        pillElem.className = "text-xs font-bold text-lime-400";
      } else if (diff > 0.1) {
        pillElem.innerText = `📈 Up (+${diff.toFixed(1)} kg/wk)`;
        pillElem.className = "text-xs font-bold text-amber-400";
      } else {
        pillElem.innerText = `⏸ Plateau (${diff >= 0 ? "+" : ""}${diff.toFixed(1)} kg/wk)`;
        pillElem.className = "text-xs font-bold text-zinc-400";
      }
    } else {
      pillElem.innerText = `⏳ Baseline (${rollingWeights.length}/7 Days)`;
      pillElem.className = "text-xs font-semibold text-zinc-500";
    }
  }

  // Draw SVG sparkline
  const sparklinePath = document.getElementById("sparklinePath");
  const sparklineArea = document.getElementById("sparklineArea");
  if (!sparklinePath || !sparklineArea) return;

  const points = rollingWeights.slice(-14).map(r => r.rolling_avg_weight || r.raw_weight);
  if (points.length < 2) return;

  const minVal = Math.min(...points);
  const maxVal = Math.max(...points);
  const range = (maxVal - minVal) || 1;
  const paddingY = 16;
  const usableH = 80 - 2 * paddingY;
  const width = 320;

  const coords = points.map((val, idx) => {
    const x = (idx / (points.length - 1)) * width;
    const norm = (val - minVal) / range;
    const y = paddingY + (1 - norm) * usableH;
    return { x, y };
  });

  // Construct smooth bezier curve
  let pathD = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i];
    const p1 = coords[i + 1];
    const cx = ((p0.x + p1.x) / 2).toFixed(1);
    pathD += ` C ${cx} ${p0.y.toFixed(1)}, ${cx} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }

  const areaD = `${pathD} L 320 80 L 0 80 Z`;
  sparklinePath.setAttribute("d", pathD);
  sparklineArea.setAttribute("d", areaD);
}

function renderProgressionHighlights(progressions) {
  const container = document.getElementById("progressionHighlightContainer");
  if (!container) return;

  if (!progressions || progressions.length === 0) {
    container.innerHTML = `
      <div class="p-4 rounded-2xl bg-zinc-900/40 border border-white/[0.06] text-center">
        <p class="text-xs text-zinc-500 font-medium">Log 2-set workouts to unlock automated double progression signals.</p>
      </div>`;
    return;
  }

  container.innerHTML = progressions.map(p => {
    if (p.earned_progression) {
      return `
        <div class="p-4 rounded-2xl bg-lime-950/30 border border-lime-500/30 flex items-center justify-between gap-3 transition">
          <div class="space-y-1 min-w-0">
            <div class="flex items-center space-x-2">
              <span class="text-xs font-black text-white truncate">${p.exercise}</span>
              <span class="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-lime-400 text-black flex-shrink-0">🏆 Progression Earned</span>
            </div>
            <p class="text-[11px] text-lime-300 font-semibold leading-relaxed">${p.suggestion}</p>
          </div>
          <div class="text-right flex-shrink-0">
            <div class="text-xs font-black text-white">${p.last_weight} kg × ${p.last_reps}</div>
            <div class="text-[10px] text-zinc-400 font-medium">RPE ${p.last_rpe || 9}</div>
          </div>
        </div>`;
    } else {
      return `
        <div class="p-4 rounded-2xl bg-zinc-900/60 border border-white/[0.06] flex items-center justify-between gap-3 transition">
          <div class="space-y-1 min-w-0">
            <div class="flex items-center space-x-2">
              <span class="text-xs font-black text-white truncate">${p.exercise}</span>
              <span class="text-[9px] font-bold uppercase px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 flex-shrink-0">Hold Weight</span>
            </div>
            <p class="text-[11px] text-zinc-400 font-medium leading-relaxed">${p.suggestion}</p>
          </div>
          <div class="text-right flex-shrink-0">
            <div class="text-xs font-bold text-white">${p.last_weight} kg × ${p.last_reps}</div>
            <div class="text-[10px] text-zinc-500 font-medium">RPE ${p.last_rpe || 8.5}</div>
          </div>
        </div>`;
    }
  }).join("");
}

// ============================================================================
// MINDSET TAB: BOX BREATHING, CRAVING WAVE TIMER & AUDIO CUES
// ============================================================================

let breathingActive = false;
let breathingInterval = null;
let breathingStep = 0;

function toggleBreathingGuide() {
  const btn = document.getElementById("btnBreathingToggle");
  const circle = document.getElementById("breathingGuideCircle");
  const phaseText = document.getElementById("breathingPhaseText");
  const instrText = document.getElementById("breathingInstructionText");

  if (breathingActive) {
    breathingActive = false;
    if (breathingInterval) clearInterval(breathingInterval);
    breathingInterval = null;
    if (btn) btn.innerText = "Start Guide";
    if (phaseText) phaseText.innerText = "Breathe";
    if (instrText) instrText.innerText = "Inhale 4s • Hold 4s • Exhale 4s";
    return;
  }

  breathingActive = true;
  if (btn) btn.innerText = "Stop Guide";
  breathingStep = 0;

  const phases = [
    { name: "Inhale", instr: "Inhale smoothly through nose (4s)", freq: 432 },
    { name: "Hold", instr: "Hold oxygen calmly (4s)", freq: 528 },
    { name: "Exhale", instr: "Exhale slowly through mouth (4s)", freq: 396 },
    { name: "Hold", instr: "Rest empty before next breath (4s)", freq: 432 }
  ];

  function runPhase() {
    const cur = phases[breathingStep];
    if (phaseText) phaseText.innerText = cur.name;
    if (instrText) instrText.innerText = cur.instr;
    playBeep(cur.freq, 0.25, "sine");
    if (navigator.vibrate) navigator.vibrate(30);
    breathingStep = (breathingStep + 1) % phases.length;
  }

  runPhase();
  breathingInterval = setInterval(runPhase, 4000);
}

function playQuoteAudioCue() {
  playBeep(528, 0.75, "sine");
  if (navigator.vibrate) navigator.vibrate([30, 40, 30]);
}

let waveTimerInterval = null;
let waveSecondsLeft = 20 * 60;

function startCravingWaveTimer() {
  const btn = document.getElementById("btnWaveTimer");
  const label = document.getElementById("waveTimerText");

  if (waveTimerInterval) {
    clearInterval(waveTimerInterval);
    waveTimerInterval = null;
    waveSecondsLeft = 20 * 60;
    if (btn) btn.innerText = "Start Timer";
    if (label) label.innerText = "Grehlin spikes subside within 20 mins. Drink 500ml water and start timer.";
    return;
  }

  playQuoteAudioCue();
  if (btn) btn.innerText = "Stop Timer";

  waveTimerInterval = setInterval(() => {
    waveSecondsLeft--;
    if (waveSecondsLeft <= 0) {
      clearInterval(waveTimerInterval);
      waveTimerInterval = null;
      waveSecondsLeft = 20 * 60;
      if (btn) btn.innerText = "Start Timer";
      if (label) label.innerText = "🌊 Craving wave passed! You survived the ghrelin surge. Re-assess genuine hunger.";
      playQuoteAudioCue();
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      return;
    }
    const mins = Math.floor(waveSecondsLeft / 60);
    const secs = String(waveSecondsLeft % 60).padStart(2, "0");
    if (label) {
      label.innerText = `⏳ Wave Timer: ${mins}:${secs} remaining. Drink 300–500ml water and stay busy.`;
    }
  }, 1000);
}

function downloadMLDataset() {
  const host = getMacHost();
  window.open(`${host}/api/ml-dataset?format=csv`, "_blank");
}

async function copyGeminiReport() {
  const host = getMacHost();
  try {
    const res = await fetch(`${host}/api/weekly-report`);
    if (res.ok) {
      const data = await res.json();
      navigator.clipboard.writeText(data.markdown_report);
      triggerChimeSuccess();
      alert("📋 Copied Weekly Audit Report to clipboard! Paste directly into Gemini for your review.");
    }
  } catch (err) {
    alert("Could not connect to Mac to generate report.");
  }
}

// Load draft data & restore server state
async function loadTodayData() {
  const today = getTodayDateStr();
  const queue = JSON.parse(localStorage.getItem("offline_sync_queue") || "{}");
  if (queue.daily_metrics) {
    const found = queue.daily_metrics.find(m => m.date === today);
    if (found) {
      if (found.morning_weight_kg) document.getElementById("inputWeight").value = found.morning_weight_kg;
      if (found.steps) document.getElementById("inputSteps").value = found.steps;
    }
  }

  // Restore server nutrition if not yet logged locally
  const rawDiet = localStorage.getItem(`diet_state_${today}`);
  if (!rawDiet) {
    try {
      const host = getMacHost();
      const res = await fetch(`${host}/api/nutrition?date=${today}`, { signal: AbortSignal.timeout(1500) });
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          const restoredDiet = {
            meal_1: { followed_items: [], extra_items: [] },
            fasting: { followed_items: [], extra_items: [] },
            meal_2: { followed_items: [], extra_items: [] }
          };
          data.items.forEach(item => {
            const mKey = item.meal_type;
            if (restoredDiet[mKey]) {
              if (item.is_extra) {
                restoredDiet[mKey].extra_items.push({
                  name: item.name,
                  protein_g: item.protein_g,
                  carbs_g: item.carbs_g,
                  sugar_g: item.sugar_g,
                  calories: item.calories,
                  fat_g: item.fat_g
                });
              } else {
                const mealDef = PRESCRIBED_MEALS[mKey];
                const matched = mealDef?.items?.find(i => i.name === item.name);
                if (matched) restoredDiet[mKey].followed_items.push(matched.id);
              }
            }
          });
          saveTodayDietState(restoredDiet);
          updateNutritionDashboard();
          updateActivityRings();
        }
      }
    } catch (e) {
      // offline fallback
    }
  }
}

