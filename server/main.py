"""
FastAPI Server for Mobile PWA and Local LAN Sync.
Binds to 0.0.0.0:8000 so phones on the same Wi-Fi can sync seamlessly.
"""

from fastapi import FastAPI, HTTPException, Response
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
import os
import json
from database import get_connection, init_db
from analytics import (
    get_7day_rolling_weights,
    get_coach_decision,
    get_exercise_progressions,
    export_ml_dataset,
    generate_gemini_weekly_prompt
)

app = FastAPI(title="Fitness & Body Composition System", version="1.0.0")

# Enable CORS for local network sync
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database
init_db()

# Models
class SyncDailyMetric(BaseModel):
    date: str
    morning_weight_kg: Optional[float] = None
    steps: int = 0
    sleep_hours: float = 0.0
    sleep_quality: int = 5
    stress_level: int = 5
    fasting_completed: int = 1
    water_liters: float = 3.5
    notes: Optional[str] = ""

class SyncBiofeedback(BaseModel):
    date: str
    fatigue_score: int = 1
    pain_score: int = 1
    pain_type: str = "none"
    body_parts: List[str] = []
    headache_present: int = 0
    notes: Optional[str] = ""

class SyncWorkoutSet(BaseModel):
    exercise_name: str
    set_type: str # 'top_set' or 'backoff_set'
    weight_kg: float
    reps: int
    rpe: float
    to_failure: int = 0

class SyncWorkout(BaseModel):
    date: str
    workout_type: str
    notes: Optional[str] = ""
    sets: List[SyncWorkoutSet] = []

from datetime import datetime

class SyncFoodItem(BaseModel):
    name: str
    meal_type: str = "meal_1" # 'meal_1', 'fasting', 'meal_2', 'snack'
    protein_g: float = 0.0
    carbs_g: float = 0.0
    sugar_g: float = 0.0
    calories: float = 0.0
    fat_g: float = 0.0
    is_extra: int = 1

class SyncMealLog(BaseModel):
    date: str
    breakfast_eggs: int = 6
    breakfast_rotis: int = 2
    dinner_chicken_g: float = 200.0
    dinner_soya_g: float = 65.0
    dinner_rice_g: float = 150.0
    total_oil_tsp: float = 2.0
    zero_sugar_cans: int = 1
    total_protein_g: Optional[float] = 0.0
    total_carbs_g: Optional[float] = 0.0
    total_sugar_g: Optional[float] = 0.0
    total_calories: Optional[float] = 0.0
    items_json: Optional[str] = "[]"
    notes: Optional[str] = ""
    items: Optional[List[SyncFoodItem]] = []

class BatchSyncPayload(BaseModel):
    daily_metrics: List[SyncDailyMetric] = []
    biofeedback: List[SyncBiofeedback] = []
    workouts: List[SyncWorkout] = []
    meals: List[SyncMealLog] = []
    food_items: Optional[List[SyncFoodItem]] = []

# API Endpoints
@app.get("/api/ping")
def ping():
    return {"status": "online", "server": "Mac Fitness Host", "version": "1.0.0"}

@app.get("/api/profile")
def get_profile():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM user_profile LIMIT 1")
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else {}

@app.post("/api/sync")
def batch_sync(payload: BatchSyncPayload):
    conn = get_connection()
    cursor = conn.cursor()

    # Ingest Daily Metrics
    for m in payload.daily_metrics:
        cursor.execute("""
            INSERT INTO daily_metrics (date, morning_weight_kg, steps, sleep_hours, sleep_quality, stress_level, fasting_completed, water_liters, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(date) DO UPDATE SET
                morning_weight_kg = COALESCE(excluded.morning_weight_kg, morning_weight_kg),
                steps = excluded.steps,
                sleep_hours = excluded.sleep_hours,
                sleep_quality = excluded.sleep_quality,
                stress_level = excluded.stress_level,
                fasting_completed = excluded.fasting_completed,
                water_liters = excluded.water_liters,
                notes = excluded.notes,
                synced_at = CURRENT_TIMESTAMP
        """, (m.date, m.morning_weight_kg, m.steps, m.sleep_hours, m.sleep_quality, m.stress_level, m.fasting_completed, m.water_liters, m.notes))

        # Update current weight in profile if provided
        if m.morning_weight_kg:
            cursor.execute("UPDATE user_profile SET current_weight_kg = ?", (m.morning_weight_kg,))

    # Ingest Biofeedback (ML Dataset)
    for b in payload.biofeedback:
        body_parts_str = json.dumps(b.body_parts)
        cursor.execute("""
            INSERT INTO ml_biofeedback (date, fatigue_score, pain_score, pain_type, body_parts_json, headache_present, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(date) DO UPDATE SET
                fatigue_score = excluded.fatigue_score,
                pain_score = excluded.pain_score,
                pain_type = excluded.pain_type,
                body_parts_json = excluded.body_parts_json,
                headache_present = excluded.headache_present,
                notes = excluded.notes
        """, (b.date, b.fatigue_score, b.pain_score, b.pain_type, body_parts_str, b.headache_present, b.notes))

    # Ingest Workouts (2-Set Model)
    for w in payload.workouts:
        cursor.execute("""
            INSERT INTO workouts (date, workout_type, notes)
            VALUES (?, ?, ?)
        """, (w.date, w.workout_type, w.notes))
        workout_id = cursor.lastrowid

        for s in w.sets:
            cursor.execute("""
                INSERT INTO workout_sets (workout_id, exercise_name, set_type, weight_kg, reps, rpe, to_failure)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (workout_id, s.exercise_name, s.set_type, s.weight_kg, s.reps, s.rpe, s.to_failure))

    # Ingest Meals & Food Items
    for ml in payload.meals:
        items_list = [item.dict() for item in ml.items] if ml.items else (json.loads(ml.items_json) if ml.items_json else [])
        items_json_str = json.dumps(items_list)

        cursor.execute("""
            INSERT INTO meal_logs (date, breakfast_eggs, breakfast_rotis, dinner_chicken_g, dinner_soya_g, dinner_rice_g, total_oil_tsp, zero_sugar_cans, total_protein_g, total_carbs_g, total_sugar_g, total_calories, items_json, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(date) DO UPDATE SET
                breakfast_eggs = excluded.breakfast_eggs,
                breakfast_rotis = excluded.breakfast_rotis,
                dinner_chicken_g = excluded.dinner_chicken_g,
                dinner_soya_g = excluded.dinner_soya_g,
                dinner_rice_g = excluded.dinner_rice_g,
                total_oil_tsp = excluded.total_oil_tsp,
                zero_sugar_cans = excluded.zero_sugar_cans,
                total_protein_g = excluded.total_protein_g,
                total_carbs_g = excluded.total_carbs_g,
                total_sugar_g = excluded.total_sugar_g,
                total_calories = excluded.total_calories,
                items_json = excluded.items_json,
                notes = excluded.notes,
                synced_at = CURRENT_TIMESTAMP
        """, (ml.date, ml.breakfast_eggs, ml.breakfast_rotis, ml.dinner_chicken_g, ml.dinner_soya_g, ml.dinner_rice_g, ml.total_oil_tsp, ml.zero_sugar_cans, ml.total_protein_g, ml.total_carbs_g, ml.total_sugar_g, ml.total_calories, items_json_str, ml.notes))

        # Clear and insert individual food items for this date
        if items_list:
            cursor.execute("DELETE FROM food_items WHERE date = ?", (ml.date,))
            for item in items_list:
                cursor.execute("""
                    INSERT INTO food_items (date, meal_type, name, protein_g, carbs_g, sugar_g, calories, fat_g, is_extra)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    ml.date,
                    item.get("meal_type", "meal_1"),
                    item.get("name", "Extra Item"),
                    float(item.get("protein_g", 0.0)),
                    float(item.get("carbs_g", 0.0)),
                    float(item.get("sugar_g", 0.0)),
                    float(item.get("calories", 0.0)),
                    float(item.get("fat_g", 0.0)),
                    int(item.get("is_extra", 1))
                ))

    # Ingest standalone food items if present
    if payload.food_items:
        for fi in payload.food_items:
            cursor.execute("""
                INSERT INTO food_items (date, meal_type, name, protein_g, carbs_g, sugar_g, calories, fat_g, is_extra)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                getattr(fi, 'date', datetime.now().strftime("%Y-%m-%d")),
                fi.meal_type,
                fi.name,
                fi.protein_g,
                fi.carbs_g,
                fi.sugar_g,
                fi.calories,
                fi.fat_g,
                fi.is_extra
            ))

    conn.commit()
    conn.close()

    # Return refreshed coach decision and analytics
    decision = get_coach_decision()
    progressions = get_exercise_progressions()

    return {
        "status": "success",
        "synced": True,
        "coach_decision": decision,
        "exercise_progressions": progressions
    }

@app.get("/api/analytics")
def get_analytics():
    return {
        "rolling_weights": get_7day_rolling_weights(),
        "coach_decision": get_coach_decision(),
        "exercise_progressions": get_exercise_progressions()
    }

@app.get("/api/nutrition")
def get_nutrition(date: Optional[str] = None):
    conn = get_connection()
    cursor = conn.cursor()
    target_date = date or datetime.now().strftime("%Y-%m-%d")
    cursor.execute("SELECT * FROM meal_logs WHERE date = ?", (target_date,))
    meal_row = cursor.fetchone()
    
    cursor.execute("SELECT * FROM food_items WHERE date = ? ORDER BY id ASC", (target_date,))
    items = [dict(r) for r in cursor.fetchall()]
    conn.close()

    return {
        "date": target_date,
        "meal_log": dict(meal_row) if meal_row else None,
        "items": items
    }

@app.get("/api/quotes")
def get_quotes(category: Optional[str] = None):
    conn = get_connection()
    cursor = conn.cursor()
    if category:
        cursor.execute("SELECT * FROM quotes WHERE category = ? ORDER BY RANDOM()", (category,))
    else:
        cursor.execute("SELECT * FROM quotes ORDER BY RANDOM()")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

@app.get("/api/ml-dataset")
def download_ml_dataset(format: str = "json"):
    data = export_ml_dataset(as_format=format)
    if format == "csv":
        return Response(content=data, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=fitness_ml_dataset.csv"})
    return data

@app.get("/api/weekly-report")
def get_weekly_report():
    report_md = generate_gemini_weekly_prompt()
    return {"markdown_report": report_md}

# Mount static files for PWA (frontend)
STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")
if not os.path.exists(STATIC_DIR):
    os.makedirs(STATIC_DIR)

@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    icon_path = os.path.join(STATIC_DIR, "favicon.svg")
    if os.path.exists(icon_path):
        return FileResponse(icon_path, media_type="image/svg+xml")
    return Response(status_code=204)

app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
