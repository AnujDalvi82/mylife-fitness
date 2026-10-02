"""
SQLite Database Schema and ORM operations for Fitness & Body Recomposition System.
Stores biometrics, daily metrics, 2-set workouts, nutrition logs, quotes,
and a dedicated ML dataset table for fatigue, pain, and body-part tracking.
"""

import sqlite3
import json
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "fitness.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # User Profile
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_profile (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT DEFAULT 'Alex Miller',
        age INTEGER DEFAULT 25,
        gender TEXT DEFAULT 'Male',
        height_cm REAL DEFAULT 178.0,
        starting_weight_kg REAL DEFAULT 82.0,
        current_weight_kg REAL DEFAULT 82.0,
        current_phase TEXT DEFAULT 'cut',
        target_calories INTEGER DEFAULT 1950,
        target_protein_g REAL DEFAULT 165.0,
        target_fat_g REAL DEFAULT 50.0,
        target_carbs_g REAL DEFAULT 185.0,
        target_daily_steps INTEGER DEFAULT 9000,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Daily Metrics (Fasted weight, steps, sleep, stress, notes)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS daily_metrics (
        date TEXT PRIMARY KEY,
        morning_weight_kg REAL,
        steps INTEGER DEFAULT 0,
        sleep_hours REAL DEFAULT 0,
        sleep_quality INTEGER DEFAULT 5, -- 1-10
        stress_level INTEGER DEFAULT 5,  -- 1-10
        fasting_completed INTEGER DEFAULT 1, -- 1=yes, 0=no
        water_liters REAL DEFAULT 3.5,
        notes TEXT,
        synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # ML Biofeedback Dataset (Fatigue, Pain, Body Parts for Neural Network Training)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ml_biofeedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT UNIQUE,
        fatigue_score INTEGER,          -- 1 to 10
        pain_score INTEGER,             -- 1 to 10
        pain_type TEXT DEFAULT 'none',  -- 'muscular_doms', 'joint_tendon', 'headache_neural', 'none'
        body_parts_json TEXT,           -- JSON array: ["neck", "lower_back", "shoulders", "knees", etc.]
        headache_present INTEGER DEFAULT 0, -- 1=yes, 0=no
        readiness_score REAL,           -- Computed readiness index
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Workouts (2-Set Model)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS workouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT,
        workout_type TEXT, -- 'Upper A', 'Lower A', 'Upper B', 'Lower B', 'Home Bar-Ground'
        notes TEXT,
        synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS workout_sets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workout_id INTEGER,
        exercise_name TEXT,
        set_type TEXT, -- 'top_set' or 'backoff_set'
        weight_kg REAL,
        reps INTEGER,
        rpe REAL,      -- Reps in Reserve / Rate of Perceived Exertion
        to_failure INTEGER DEFAULT 0,
        FOREIGN KEY (workout_id) REFERENCES workouts (id) ON DELETE CASCADE
    )
    """)

    # Meal Tracking (2-Meal Architecture + Food Items)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS meal_logs (
        date TEXT PRIMARY KEY,
        breakfast_eggs INTEGER DEFAULT 6,
        breakfast_rotis INTEGER DEFAULT 2,
        dinner_chicken_g REAL DEFAULT 200.0,
        dinner_soya_g REAL DEFAULT 65.0,
        dinner_rice_g REAL DEFAULT 150.0,
        total_oil_tsp REAL DEFAULT 2.0,
        zero_sugar_cans INTEGER DEFAULT 1,
        total_protein_g REAL DEFAULT 0.0,
        total_carbs_g REAL DEFAULT 0.0,
        total_sugar_g REAL DEFAULT 0.0,
        total_calories REAL DEFAULT 0.0,
        items_json TEXT DEFAULT '[]',
        notes TEXT,
        synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Individual Food Items (Prescribed Followed & Extra Foods Added with P, C, Sugar, Cal)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS food_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        meal_type TEXT NOT NULL, -- 'meal_1', 'fasting', 'meal_2', 'snack'
        name TEXT NOT NULL,
        protein_g REAL DEFAULT 0.0,
        carbs_g REAL DEFAULT 0.0,
        sugar_g REAL DEFAULT 0.0,
        calories REAL DEFAULT 0.0,
        fat_g REAL DEFAULT 0.0,
        is_extra INTEGER DEFAULT 0, -- 0 = prescribed diet, 1 = extra food eaten
        synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Safe column migrations for existing databases
    cursor.execute("PRAGMA table_info(meal_logs)")
    existing_cols = [c[1] for c in cursor.fetchall()]
    new_cols = [
        ("total_protein_g", "REAL DEFAULT 0.0"),
        ("total_carbs_g", "REAL DEFAULT 0.0"),
        ("total_sugar_g", "REAL DEFAULT 0.0"),
        ("total_calories", "REAL DEFAULT 0.0"),
        ("items_json", "TEXT DEFAULT '[]'")
    ]
    for col_name, col_def in new_cols:
        if col_name not in existing_cols:
            cursor.execute(f"ALTER TABLE meal_logs ADD COLUMN {col_name} {col_def}")


    # Motivation & Mindset Quotes
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS quotes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        author TEXT DEFAULT 'Stoic Coach',
        category TEXT NOT NULL -- 'fasting', 'training', 'stoic', 'recovery'
    )
    """)

    conn.commit()

    # Seed default user profile if empty
    cursor.execute("SELECT COUNT(*) as cnt FROM user_profile")
    if cursor.fetchone()["cnt"] == 0:
        cursor.execute("""
        INSERT INTO user_profile (name, age, gender, height_cm, starting_weight_kg, current_weight_kg, current_phase, target_calories, target_protein_g, target_fat_g, target_carbs_g, target_daily_steps)
        VALUES ('Alex Miller', 25, 'Male', 178.0, 82.0, 82.0, 'cut', 1950, 165.0, 55.0, 200.0, 10000)
        """)
        conn.commit()

    conn.close()

if __name__ == "__main__":
    init_db()
    print("✅ Database initialized successfully at:", DB_PATH)
