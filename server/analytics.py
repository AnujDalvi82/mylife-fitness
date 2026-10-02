"""
Analytics Engine & ML Dataset Exporter.
- Computes 7-day rolling weight averages and calorie decay signals.
- Computes double progression workout recommendations.
- Formats weekly check-in summaries for Gemini review.
- Exports structured ML datasets (fatigue, pain, body parts, sleep, volume) for training neural networks.
"""

import json
import csv
import io
from database import get_connection

def get_7day_rolling_weights():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT date, morning_weight_kg, steps, sleep_hours, stress_level 
        FROM daily_metrics 
        WHERE morning_weight_kg IS NOT NULL 
        ORDER BY date ASC
    """)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()

    if not rows:
        return []

    # Calculate 7-day windows
    results = []
    total = len(rows)
    for i in range(total):
        start_idx = max(0, i - 6)
        window = rows[start_idx:i+1]
        avg_wt = sum(w["morning_weight_kg"] for w in window) / len(window)
        avg_steps = sum(w["steps"] for w in window) / len(window)
        results.append({
            "date": rows[i]["date"],
            "raw_weight": rows[i]["morning_weight_kg"],
            "rolling_avg_weight": round(avg_wt, 2),
            "rolling_avg_steps": round(avg_steps, 0),
            "window_size": len(window)
        })
    return results

def get_coach_decision():
    rolling = get_7day_rolling_weights()
    if len(rolling) < 7:
        return {
            "status": "baseline_collecting",
            "message": f"Collected {len(rolling)}/7 days of weigh-ins. Keep logging morning fasted weight.",
            "recommendation": "Maintain current 1,850 kcal intake and 9,000 steps target."
        }

    latest = rolling[-1]["rolling_avg_weight"]
    week_ago = rolling[-7]["rolling_avg_weight"]
    diff = round(latest - week_ago, 2)

    # Check for 2-week trend if available
    two_weeks_ago = rolling[-14]["rolling_avg_weight"] if len(rolling) >= 14 else None
    diff_2weeks = round(latest - two_weeks_ago, 2) if two_weeks_ago else None

    if diff_2weeks is not None and diff_2weeks > -0.3:
        return {
            "status": "plateau_detected",
            "rate_kg_week": diff,
            "rate_2weeks": diff_2weeks,
            "message": "Scale average is flat for 2 consecutive weeks (< 0.3 kg lost).",
            "recommendation": "Taper 1: Reduce cooking oil by 1/2 tsp and drop 50g cooked rice (-100 kcal) OR add 1,500 daily steps."
        }
    elif diff < -1.0:
        return {
            "status": "rapid_loss",
            "rate_kg_week": diff,
            "message": "Loss rate exceeds 1.0 kg/week. Potential muscle catabolism risk.",
            "recommendation": "Add 1 extra phulka (+100 kcal) to dinner to protect lean mass."
        }
    else:
        return {
            "status": "on_track",
            "rate_kg_week": diff,
            "message": f"Losing at an optimal rate of {abs(diff):.2f} kg this week.",
            "recommendation": "Lock in current diet and 2-set training. Do not touch calories."
        }

def get_exercise_progressions():
    """Analyzes the 2-set logs and suggests progression for next session."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT w.date, ws.exercise_name, ws.set_type, ws.weight_kg, ws.reps, ws.rpe
        FROM workout_sets ws
        JOIN workouts w ON ws.workout_id = w.id
        ORDER BY w.date DESC, ws.id ASC
    """)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()

    # Group by exercise
    exercises = {}
    for r in rows:
        name = r["exercise_name"]
        if name not in exercises:
            exercises[name] = []
        exercises[name].append(r)

    suggestions = []
    for name, history in exercises.items():
        top_sets = [h for h in history if h["set_type"] == "top_set"]
        if not top_sets:
            continue
        last_top = top_sets[0]
        # Double progression logic: if hit >= 8 reps at <= 1 RIR (RPE >= 8.5)
        if last_top["reps"] >= 8:
            is_compound_lower = any(k in name.lower() for k in ["squat", "deadlift", "leg press"])
            inc = 5.0 if is_compound_lower else 2.5
            sugg = f"Earned progression! Add +{inc} kg next time (Target: {last_top['weight_kg'] + inc} kg for 6 reps)."
            earned = True
        else:
            sugg = f"Keep {last_top['weight_kg']} kg. Fight for +1 rep (Aim for {last_top['reps'] + 1} reps at 1–2 RIR)."
            earned = False

        suggestions.append({
            "exercise": name,
            "last_date": last_top["date"],
            "last_weight": last_top["weight_kg"],
            "last_reps": last_top["reps"],
            "last_rpe": last_top["rpe"],
            "earned_progression": earned,
            "suggestion": sugg
        })
    return suggestions

def export_ml_dataset(as_format="json"):
    """
    Exports clean, unified dataset combining daily metrics, workouts, and pain/fatigue
    specifically formatted for training neural networks or ML regression/classification.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT 
            dm.date,
            dm.morning_weight_kg,
            dm.steps,
            dm.sleep_hours,
            dm.sleep_quality,
            dm.stress_level,
            dm.fasting_completed,
            dm.water_liters,
            COALESCE(mb.fatigue_score, 0) as fatigue_score,
            COALESCE(mb.pain_score, 0) as pain_score,
            COALESCE(mb.pain_type, 'none') as pain_type,
            COALESCE(mb.body_parts_json, '[]') as body_parts_json,
            COALESCE(mb.headache_present, 0) as headache_present,
            COALESCE(ml.total_protein_g, 0.0) as total_protein_g,
            COALESCE(ml.total_carbs_g, 0.0) as total_carbs_g,
            COALESCE(ml.total_sugar_g, 0.0) as total_sugar_g,
            COALESCE(ml.total_calories, 0.0) as total_calories,
            (SELECT COUNT(*) FROM workouts w WHERE w.date = dm.date) as workout_completed,
            (SELECT COUNT(*) FROM workout_sets ws JOIN workouts w ON ws.workout_id = w.id WHERE w.date = dm.date) as total_sets_performed,
            (SELECT AVG(ws.rpe) FROM workout_sets ws JOIN workouts w ON ws.workout_id = w.id WHERE w.date = dm.date) as avg_session_rpe
        FROM daily_metrics dm
        LEFT JOIN ml_biofeedback mb ON dm.date = mb.date
        LEFT JOIN meal_logs ml ON dm.date = ml.date
        ORDER BY dm.date ASC
    """)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()

    # Format JSON body parts
    for r in rows:
        try:
            r["body_parts_list"] = json.loads(r["body_parts_json"])
            r["body_parts_count"] = len(r["body_parts_list"])
        except Exception:
            r["body_parts_list"] = []
            r["body_parts_count"] = 0

    if as_format == "csv":
        output = io.StringIO()
        if rows:
            fieldnames = [k for k in rows[0].keys() if k != "body_parts_list"]
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()
            for r in rows:
                c = r.copy()
                del c["body_parts_list"]
                writer.writerow(c)
        return output.getvalue()

    return rows

def generate_gemini_weekly_prompt():
    """Generates an executive markdown report designed to be passed directly to Gemini for coach auditing."""
    rolling = get_7day_rolling_weights()
    coach = get_coach_decision()
    progressions = get_exercise_progressions()
    dataset = export_ml_dataset("json")

    latest_weight = rolling[-1]["raw_weight"] if rolling else 79.0
    latest_avg = rolling[-1]["rolling_avg_weight"] if rolling else 79.0
    avg_steps = rolling[-1]["rolling_avg_steps"] if rolling else 0

    # Recent fatigue, pain, and nutrition averages
    recent_bio = dataset[-7:] if dataset else []
    avg_fatigue = round(sum(b["fatigue_score"] for b in recent_bio) / len(recent_bio), 1) if recent_bio else 0
    avg_pain = round(sum(b["pain_score"] for b in recent_bio) / len(recent_bio), 1) if recent_bio else 0
    headache_days = sum(1 for b in recent_bio if b["headache_present"] == 1)

    avg_protein = round(sum(b.get("total_protein_g", 0) for b in recent_bio) / len(recent_bio), 1) if recent_bio else 0
    avg_carbs = round(sum(b.get("total_carbs_g", 0) for b in recent_bio) / len(recent_bio), 1) if recent_bio else 0
    avg_sugar = round(sum(b.get("total_sugar_g", 0) for b in recent_bio) / len(recent_bio), 1) if recent_bio else 0
    avg_calories = round(sum(b.get("total_calories", 0) for b in recent_bio) / len(recent_bio), 0) if recent_bio else 0

    # Fetch athlete profile from DB if exists
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM user_profile LIMIT 1")
        up = cursor.fetchone()
        conn.close()
        prof_name = up["name"] if up and up["name"] else "Alex Miller"
        prof_age = up["age"] if up and up["age"] else 25
        prof_gender = up["gender"] if up and up["gender"] else "Male"
        prof_height = up["height_cm"] if up and up["height_cm"] else 178.0
        prof_start_wt = up["starting_weight_kg"] if up and up["starting_weight_kg"] else 82.0
    except Exception:
        prof_name, prof_age, prof_gender, prof_height, prof_start_wt = "Alex Miller", 25, "Male", 178.0, 82.0

    report = f"""# Weekly Fitness Audit for Gemini Review

**Athlete Profile**: {prof_name} | {prof_age}y {prof_gender} | {prof_height} cm | Starting: {prof_start_wt} kg  
**Current Phase**: Phase 1: 8-Week Cut
**Latest Morning Fasted Weight**: {latest_weight} kg  
**7-Day Rolling Weight Average**: {latest_avg} kg  
**Average Daily Steps**: {int(avg_steps)} steps/day  
**Coach Status**: {coach.get('status', 'normal')} ({coach.get('recommendation', '')})  

### Nutrition & Macro Adherence (Last 7 Days)
- Average Daily Protein: {avg_protein}g (Target: 165g)
- Average Daily Carbs: {avg_carbs}g (Target: ~200g)
- Average Daily Sugar: {avg_sugar}g
- Average Daily Calories: {int(avg_calories)} kcal (Target: 1,950 kcal)

### Biofeedback & Neural Recovery (Last 7 Days)
- Average Fatigue (1-10): {avg_fatigue} / 10
- Average Pain/Soreness (1-10): {avg_pain} / 10
- Days with Tension Headache: {headache_days} days
- Diet Structure: 2-Meal Fasted Protocol (Morning Power Anchor + Evening Feast)

### Key Lift Performance (2-Set Model: Top Set + Back-off)
"""
    if progressions:
        for p in progressions:
            report += f"- **{p['exercise']}**: Last session {p['last_weight']} kg × {p['last_reps']} reps (RPE {p['last_rpe']}) ➔ {p['suggestion']}\n"
    else:
        report += "- *No gym workout sets logged yet for this week.*\n"

    report += "\n**Request for Gemini**: Please analyze the weight trajectory, recovery scores, and lift numbers, and provide your feedback and recommendations for the upcoming week."
    return report
