"""
Seed script to populate high-impact mindset, stoic, fasting, and bodybuilding science quotes.
"""

from database import get_connection, init_db

QUOTES = [
    # FASTING & HUNGER MANAGEMENT (8 AM - 2 PM College Window)
    ("Hunger comes in 20-minute waves. Drink 500ml water, let the wave crest and pass. Your body is burning stored fat right now.", "Metabolic Physiology", "fasting"),
    ("Fasting sharpens cognitive acuity. The ancient Greek philosophers and mathematicians fasted during heavy mental synthesis.", "Stoic Discipline", "fasting"),
    ("FatMax Zone unlocked: Every step you take across campus right now is fueled by free fatty acids, not your breakfast.", "Exercise Biochemistry", "fasting"),
    ("The slight stomach rumble is not starvation—it is your insulin dropping and your adipocytes mobilizing triglycerides.", "Lipid Metabolism", "fasting"),
    ("Master the fast, and you master yourself. A man who can control his fork can control any impulse in life.", "Seneca", "fasting"),
    ("Your college day is an active fasting sanctuary. No dabbas to carry, no post-lunch food coma. Pure focus and engineering flow.", "Coach Antigravity", "fasting"),
    ("Comfort is the enemy of progress. Embrace the empty stomach as a badge of active fat oxidation.", "Discipline Protocol", "fasting"),
    ("Zero sugar, pure hydration, cold focus. The evening feast tastes 10x sweeter when earned through daytime discipline.", "Daily Anchor", "fasting"),

    # TRAINING INTENSITY & THE 2-SET MODEL
    ("You do not grow from 5 sloppy sets. You grow from 2 sets pushed to the absolute edge of high mechanical tension.", "Chris Beardsley (Biomechanics)", "training"),
    ("Set 1 is your Heavy Top Set: absolute precision, maximum recruitment. Set 2 is the back-off to failure. Leave nothing in the tank.", "Jordan Peters", "training"),
    ("Every rep before the last 4 was just transportation. The growth lives in the involuntary struggle of the final 3 reps.", "Effective Reps Science", "training"),
    ("Respect your connective tissues. Ramp sub-maximally, lock in bar paths, and let muscle memory explode naturally.", "Hypertrophy Blueprint", "training"),
    ("Never miss complementary chains: Strong neck, iron grip, and resilient abs turn an ordinary physique into armor.", "Coach Antigravity", "training"),
    ("Double progression is mathematics: Hit your target reps, earn the 2.5 kg plate. Earn every single fraction.", "The Iron Standard", "training"),
    ("Intensity beats duration. A violent 40-minute session with 2 brutal sets beats 2 hours of social gym idling every time.", "Dorian Yates", "training"),
    ("Leave the gym energized, not broken. Stimulate, don't annihilate—your brain needs glycogen for code tonight.", "Lee Haney", "training"),

    # STOIC DISCIPLINE & CONSISTENCY
    ("We suffer more often in imagination than in reality. The cut is not hard; indecision is what feels heavy.", "Seneca", "stoic"),
    ("At dawn, when you have trouble getting out of bed, tell yourself: I have to go to work—as a human being.", "Marcus Aurelius", "stoic"),
    ("Small disciplines repeated with consistency every day lead to great achievements gained slowly over time.", "John C. Maxwell", "stoic"),
    ("The 8-month horizon does not care about your feelings today. It only cares if you hit your 1,850 kcal and your steps.", "Antigravity Axiom", "stoic"),
    ("A well-built physique cannot be bought, borrowed, or inherited. It is the ultimate proof of character and patience.", "Iron Mindset", "stoic"),
    ("Self-control is strength. Right thought is mastery. Calmness is power.", "James Allen", "stoic"),
    ("Do not count the days. Make the days count. The scale may stall for 5 days, but thermodynamics never lies.", "Muhammad Ali", "stoic"),
    ("You were a trainer, you are an engineer. You understand systems over emotion. Trust the system.", "Coach Antigravity", "stoic"),

    # RECOVERY, MENTAL HEALING & SLEEP
    ("20 minutes of NSDR resets striatal dopamine and relieves occipital tension headaches better than shallow afternoon sleep.", "Neuroscience of Recovery", "recovery"),
    ("Sleep is the master anabolic steroid. Growth hormone and testosterone peak during Stage 3 slow-wave sleep.", "Matthew Walker (Why We Sleep)", "recovery"),
    ("Double inhale through the nose, long slow exhale through the mouth. The physiological sigh resets your autonomic state in 30 seconds.", "Andrew Huberman", "recovery"),
    ("Screens off at 11:30 PM. Your code will compile better tomorrow morning when your prefrontal cortex is refreshed.", "Engineering Protocol", "recovery"),
    ("The scale is a noisy measurement tool. Track the 7-day rolling average, ignore the daily spikes from water or sodium.", "Statistical Biometrics", "recovery"),
    ("Joint pain is communication, not failure. Back off load, preserve range of motion, and protect longevity.", "Sports Physiotherapy", "recovery"),
    ("True rest is an intentional discipline. Give your mind the quiet it needs to heal from tension.", "Marcus Aurelius", "recovery")
]

def seed():
    init_db()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM quotes")
    cursor.executemany("INSERT INTO quotes (text, author, category) VALUES (?, ?, ?)", QUOTES)
    conn.commit()
    count = cursor.rowcount
    conn.close()
    print(f"✅ Successfully seeded {len(QUOTES)} mindset and motivation quotes.")

if __name__ == "__main__":
    seed()
