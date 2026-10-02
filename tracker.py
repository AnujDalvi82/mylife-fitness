#!/usr/bin/env python3
"""
Fitness & Nutrition Tracker CLI for Phase 1 (Cut), Phase 2 (Maintenance), Phase 3 (Bulk).
Computes 7-day rolling weight averages, monitors rate of progress, and issues automated
coaching decisions based on numbers-based rules.
"""

import os
import sys
import json
import csv
from datetime import datetime, date, timedelta

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_FILE = os.path.join(BASE_DIR, "daily_logs.csv")
STATE_FILE = os.path.join(BASE_DIR, "state.json")

DEFAULT_STATE = {
    "current_phase": "cut",
    "starting_weight_kg": 79.0,
    "current_calories": 2000,
    "target_protein_g": 165,
    "target_fat_g": 52,
    "target_carbs_g": 218,
    "target_daily_steps": 9000,
    "cardio_sessions_per_week": 3,
    "cardio_duration_mins": 25,
    "active_since": datetime.now().strftime("%Y-%m-%d")
}

def load_state():
    if not os.path.exists(STATE_FILE):
        save_state(DEFAULT_STATE)
        return DEFAULT_STATE.copy()
    try:
        with open(STATE_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return DEFAULT_STATE.copy()

def save_state(state):
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)

def init_csv():
    if not os.path.exists(LOG_FILE):
        with open(LOG_FILE, "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["date", "weight_kg", "steps", "calories_consumed", "protein_g", "training_done", "notes"])

def load_logs():
    init_csv()
    logs = []
    with open(LOG_FILE, "r", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                row["weight_kg"] = float(row["weight_kg"]) if row["weight_kg"] else None
                row["steps"] = int(row["steps"]) if row["steps"] else 0
                row["calories_consumed"] = int(row["calories_consumed"]) if row["calories_consumed"] else 0
                row["protein_g"] = float(row["protein_g"]) if row["protein_g"] else 0.0
                logs.append(row)
            except ValueError:
                continue
    # Sort chronologically
    logs.sort(key=lambda x: x["date"])
    return logs

def log_entry(weight, steps=None, calories=None, protein=None, training="yes", notes=""):
    init_csv()
    today_str = datetime.now().strftime("%Y-%m-%d")
    existing_logs = load_logs()
    
    # Check if today exists and update, else append
    updated = False
    for row in existing_logs:
        if row["date"] == today_str:
            if weight is not None: row["weight_kg"] = weight
            if steps is not None: row["steps"] = steps
            if calories is not None: row["calories_consumed"] = calories
            if protein is not None: row["protein_g"] = protein
            if training: row["training_done"] = training
            if notes: row["notes"] = notes
            updated = True
            break
            
    if not updated:
        existing_logs.append({
            "date": today_str,
            "weight_kg": weight,
            "steps": steps or 0,
            "calories_consumed": calories or 0,
            "protein_g": protein or 0.0,
            "training_done": training or "yes",
            "notes": notes or ""
        })
        
    with open(LOG_FILE, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["date", "weight_kg", "steps", "calories_consumed", "protein_g", "training_done", "notes"])
        writer.writeheader()
        for row in existing_logs:
            writer.writerow(row)
            
    print(f"✅ Successfully logged data for {today_str}: Weight={weight} kg, Steps={steps}, Calories={calories} kcal, Protein={protein}g.")

def calculate_weekly_averages(logs):
    if not logs:
        return []
        
    # Group logs by week blocks (last 7 days, previous 7-14 days, etc.)
    # Filter valid weights
    valid_weights = [r for r in logs if r["weight_kg"] is not None]
    if not valid_weights:
        return []
        
    weeks = []
    # Take slices of 7 days backwards
    total_valid = len(valid_weights)
    end = total_valid
    while end > 0:
        start = max(0, end - 7)
        chunk = valid_weights[start:end]
        avg_wt = sum(c["weight_kg"] for c in chunk) / len(chunk)
        avg_steps = sum(c["steps"] for c in chunk) / len(chunk)
        weeks.append({
            "start_date": chunk[0]["date"],
            "end_date": chunk[-1]["date"],
            "days_count": len(chunk),
            "avg_weight": round(avg_wt, 2),
            "avg_steps": round(avg_steps, 0)
        })
        end -= 7
        
    weeks.reverse()
    return weeks

def analyze_progress():
    state = load_state()
    logs = load_logs()
    phase = state.get("current_phase", "cut")
    
    print("\n" + "="*60)
    print(f"📊 FITNESS COACH AUDIT REPORT [{phase.upper()} PHASE]")
    print("="*60)
    print(f"Current Target: {state.get('current_calories')} kcal | P: {state.get('target_protein_g')}g | F: {state.get('target_fat_g')}g | C: {state.get('target_carbs_g')}g")
    print(f"Starting Weight: {state.get('starting_weight_kg')} kg | Target Daily Steps: {state.get('target_daily_steps')}")
    
    weeks = calculate_weekly_averages(logs)
    if not weeks:
        print("\n⚠️ No daily weight logs found yet.")
        print("💡 Use: python3 tracker.py log --weight 78.8 --steps 9200 --calories 1980 --protein 165")
        return

    print("\n📈 Historical 7-Day Rolling Averages:")
    for idx, w in enumerate(weeks, 1):
        print(f"  Week {idx} ({w['start_date']} to {w['end_date']} | {w['days_count']} weigh-ins): Avg Weight = {w['avg_weight']} kg | Avg Steps = {int(w['avg_steps'])}")

    latest_week = weeks[-1]
    print(f"\n👉 Latest 7-Day Rolling Weight: {latest_week['avg_weight']} kg")
    
    if len(weeks) < 2:
        print("\n⏳ Gathering initial baseline: Log at least 7-14 daily morning weigh-ins for automated trend decisions.")
        return

    prev_week = weeks[-2]
    diff = round(latest_week["avg_weight"] - prev_week["avg_weight"], 2)
    print(f"👉 Rate of Change: {diff:+.2f} kg compared to previous week.")

    # Decision Matrix
    print("\n🧠 AUTOMATED COACHING RECOMMENDATION:")
    if phase == "cut":
        if diff > -0.2:  # Flat or gaining
            if len(weeks) >= 3 and (weeks[-2]["avg_weight"] - weeks[-3]["avg_weight"]) > -0.2:
                print("🚨 PLATEAU DETECTED (2 consecutive weeks flat / < 0.2 kg loss):")
                print("   1. Reduce daily calorie target by 100–150 kcal (e.g., drop 1 roti and 1 tsp oil).")
                print("   2. OR increase daily steps by +1,500 / add one 25-minute incline treadmill walk.")
            else:
                print("⚠️ Weight is flat this week. Maintain current calories and check consistency, sodium, and water intake for one more week.")
        elif diff < -1.0: # Losing too fast
            print("🚨 RAPID LOSS DETECTED (> 1.0 kg/week lost):")
            print("   Risk of muscle degradation and metabolic fatigue.")
            print("   Action: Add +100 to +150 kcal/day from complex carbs (e.g. +30g oats or +1 roti).")
        else: # On track (0.4 to 0.8 kg/week loss)
            print(f"🎯 OPTIMAL FAT LOSS PACE ({abs(diff):.2f} kg lost this week).")
            print("   Keep current diet and training exactly as is! Excellent consistency.")

    elif phase == "maintenance":
        if abs(diff) <= 0.3:
            print("✅ PERFECT MAINTENANCE: Weight is rock solid (±0.3 kg). Energy and glycogen stores are balanced.")
        elif diff > 0.4:
            print("⚠️ Small weight creep detected. Dial back carbs slightly (-100 kcal).")
        else:
            print("⚠️ Still losing weight in maintenance. Step up daily calories by +100-150 kcal.")

    elif phase == "bulk":
        monthly_rate = diff * 4
        if diff <= 0.05: # No gain
            print("🚨 BULKING STALL (No weight gain):")
            print("   Action: Increase calories by +100 to +150 kcal/day (+20g dry fruit/nuts or +1 katori rice).")
        elif diff > 0.4: # Gaining > 0.75 - 1.0 kg/month
            print("🚨 RAPID BULK (Spillover risk):")
            print("   Weight increasing too fast. Scale back surplus by -100 to -150 kcal/day to ensure pure lean tissue gain.")
        else:
            print("🎯 LEAN BULK TARGET HIT: Gaining ~0.25 - 0.4 kg/week cleanly.")

def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python3 tracker.py log --weight 78.8 [--steps 9500] [--calories 2000] [--protein 165] [--notes 'Leg day']")
        print("  python3 tracker.py report")
        print("  python3 tracker.py set-phase <cut|maintenance|bulk>")
        return

    cmd = sys.argv[1]
    if cmd == "report":
        analyze_progress()
    elif cmd == "set-phase":
        if len(sys.argv) < 3 or sys.argv[2] not in ["cut", "maintenance", "bulk"]:
            print("Please specify a valid phase: cut | maintenance | bulk")
            return
        state = load_state()
        state["current_phase"] = sys.argv[2]
        save_state(state)
        print(f"✅ Phase updated to: {sys.argv[2].upper()}")
    elif cmd == "log":
        import argparse
        parser = argparse.ArgumentParser(description="Log daily fitness entry")
        parser.add_argument("--weight", type=float, required=True, help="Morning body weight in kg")
        parser.add_argument("--steps", type=int, default=0, help="Daily step count")
        parser.add_argument("--calories", type=int, default=0, help="Total daily calories consumed")
        parser.add_argument("--protein", type=float, default=0.0, help="Protein in grams")
        parser.add_argument("--training", type=str, default="yes", help="Workout completed (yes/no/rest)")
        parser.add_argument("--notes", type=str, default="", help="Notes or symptoms")
        args = parser.parse_args(sys.argv[2:])
        log_entry(args.weight, args.steps, args.calories, args.protein, args.training, args.notes)
    else:
        print(f"Unknown command '{cmd}'. Use 'log', 'report', or 'set-phase'.")

if __name__ == "__main__":
    main()
