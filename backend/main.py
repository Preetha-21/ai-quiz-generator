from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import json
from gemini_service import generate_quiz
from database import get_connection

app = FastAPI(title="AI Quiz Generator API")

# CORS - allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models ---

class ResultRequest(BaseModel):
    user_id: int
    quiz_id: int
    score: int
    total_marks: int

class UserRequest(BaseModel):
    name: str
    email: str

# --- ENDPOINTS ---

@app.get("/")
def home():
    return {"message": "AI Quiz Generator Backend Running"}

@app.get("/health")
def health():
    return {"status": "OK"}

# PHASE 1: Generate Quiz - creates quiz + questions in DB, returns data
@app.get("/generate-quiz")
def generate_quiz_api(topic: str, difficulty: str, number_of_questions: int):
    # Generate questions from Gemini
    data = generate_quiz(topic, difficulty, number_of_questions)
    questions = data.get("questions", [])

    if not questions:
        raise HTTPException(status_code=500, detail="Failed to generate questions")

    # Save quiz to database
    conn = get_connection()
    if not conn:
        # Still return questions even if DB fails
        return {"quiz_id": None, "questions": questions}

    try:
        cursor = conn.cursor()

        # Insert quiz
        cursor.execute(
            "INSERT INTO quizzes (topic, difficulty, total_questions) VALUES (%s, %s, %s)",
            (topic, difficulty, int(number_of_questions))
        )
        quiz_id = cursor.lastrowid

        # Insert questions
        for q in questions:
            cursor.execute(
                """INSERT INTO questions (quiz_id, question, option_a, option_b, option_c, option_d, correct_answer, explanation)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
                (
                    quiz_id,
                    q.get("question", ""),
                    q.get("option_a", ""),
                    q.get("option_b", ""),
                    q.get("option_c", ""),
                    q.get("option_d", ""),
                    q.get("correct_answer", "option_a"),
                    q.get("explanation", "")
                )
            )

        conn.commit()
        return {"quiz_id": quiz_id, "topic": topic, "difficulty": difficulty, "questions": questions}
    except Exception as e:
        print(f"DB Error: {e}")
        conn.rollback()
        return {"quiz_id": None, "questions": questions}
    finally:
        cursor.close()
        conn.close()

# PHASE 2: Save Result
@app.post("/save-result")
def save_result(result: ResultRequest):
    conn = get_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")

    try:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO results (user_id, quiz_id, score, total_marks) VALUES (%s, %s, %s, %s)",
            (result.user_id, result.quiz_id, result.score, result.total_marks)
        )
        conn.commit()
        result_id = cursor.lastrowid
        return {"message": "Result saved successfully", "result_id": result_id}
    except Exception as e:
        print(f"DB Error: {e}")
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

# PHASE 5: Create User
@app.post("/create-user")
def create_user(user: UserRequest):
    conn = get_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")

    try:
        cursor = conn.cursor(dictionary=True)

        # Check if email exists
        cursor.execute("SELECT id, name, email FROM users WHERE email = %s", (user.email,))
        existing = cursor.fetchone()

        if existing:
            return {"message": "User already exists", "user": existing}

        # Insert new user
        cursor.execute(
            "INSERT INTO users (name, email) VALUES (%s, %s)",
            (user.name, user.email)
        )
        conn.commit()
        user_id = cursor.lastrowid
        return {"message": "User created successfully", "user": {"id": user_id, "name": user.name, "email": user.email}}
    except Exception as e:
        print(f"DB Error: {e}")
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

# PHASE 6: Quiz History
@app.get("/quiz-history/{user_id}")
def get_quiz_history(user_id: int):
    conn = get_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")

    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT r.id as result_id, r.score, r.total_marks, r.submitted_at as created_at,
                   q.id as quiz_id, q.topic, q.difficulty, q.total_questions as number_of_questions
            FROM results r
            JOIN quizzes q ON r.quiz_id = q.id
            WHERE r.user_id = %s
            ORDER BY r.submitted_at DESC
        """, (user_id,))
        history = cursor.fetchall()

        # Convert datetime objects to strings
        for item in history:
            if item.get("created_at") and hasattr(item["created_at"], "isoformat"):
                item["created_at"] = item["created_at"].isoformat()

        return {"history": history}
    except Exception as e:
        print(f"DB Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

# PHASE 7: Leaderboard
@app.get("/leaderboard")
def get_leaderboard():
    conn = get_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")

    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT u.id as user_id, u.name, u.email,
                   SUM(r.score) as total_score,
                   COUNT(r.id) as quizzes_taken,
                   ROUND(AVG(r.score * 100.0 / NULLIF(r.total_marks, 0)), 1) as avg_percentage
            FROM users u
            JOIN results r ON u.id = r.user_id
            GROUP BY u.id, u.name, u.email
            ORDER BY total_score DESC
            LIMIT 20
        """
        )
        leaderboard = cursor.fetchall()

        # Convert Decimal to float for JSON
        for item in leaderboard:
            if item.get("total_score") is not None:
                item["total_score"] = int(item["total_score"])
            if item.get("avg_percentage") is not None:
                item["avg_percentage"] = float(item["avg_percentage"])

        return {"leaderboard": leaderboard}
    except Exception as e:
        print(f"DB Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

# PHASE 8: Dashboard / Analytics
@app.get("/dashboard/{user_id}")
def get_dashboard(user_id: int):
    conn = get_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")

    try:
        cursor = conn.cursor(dictionary=True)

        # Total quizzes attempted
        cursor.execute("SELECT COUNT(*) as total_quizzes FROM results WHERE user_id = %s", (user_id,))
        total_quizzes = cursor.fetchone()["total_quizzes"]

        # Average score percentage
        cursor.execute("""
            SELECT ROUND(AVG(score * 100.0 / NULLIF(total_marks, 0)), 1) as avg_score
            FROM results WHERE user_id = %s
        """, (user_id,))
        row = cursor.fetchone()
        avg_score = float(row["avg_score"]) if row["avg_score"] is not None else 0

        # Highest score
        cursor.execute("""
            SELECT MAX(score) as highest_score FROM results WHERE user_id = %s
        """, (user_id,))
        row = cursor.fetchone()
        highest_score = int(row["highest_score"]) if row["highest_score"] is not None else 0

        # Total score
        cursor.execute("""
            SELECT COALESCE(SUM(score), 0) as total_score FROM results WHERE user_id = %s
        """, (user_id,))
        row = cursor.fetchone()
        total_score = int(row["total_score"]) if row and row.get("total_score") is not None else 0

        # Topics attempted
        cursor.execute("""
            SELECT DISTINCT q.topic
            FROM results r
            JOIN quizzes q ON r.quiz_id = q.id
            WHERE r.user_id = %s
        """, (user_id,))
        topics = [row["topic"] for row in cursor.fetchall()]

        # Recent results (last 5)
        cursor.execute("""
            SELECT r.score, r.total_marks, r.submitted_at as created_at, q.topic, q.difficulty
            FROM results r
            JOIN quizzes q ON r.quiz_id = q.id
            WHERE r.user_id = %s
            ORDER BY r.submitted_at DESC
            LIMIT 5
        """, (user_id,))
        recent = cursor.fetchall()
        for item in recent:
            if item.get("created_at") and hasattr(item["created_at"], "isoformat"):
                item["created_at"] = item["created_at"].isoformat()

        return {
            "total_quizzes": total_quizzes,
            "avg_score": avg_score,
            "highest_score": highest_score,
            "total_score": total_score,
            "topics_attempted": topics,
            "recent_results": recent
        }
    except Exception as e:
        print(f"DB Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

# PHASE 11: Search/Filter Quiz History
@app.get("/quiz-history-search/{user_id}")
def search_quiz_history(user_id: int, topic: Optional[str] = None, difficulty: Optional[str] = None):
    conn = get_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")

    try:
        cursor = conn.cursor(dictionary=True)

        query = """
            SELECT r.id as result_id, r.score, r.total_marks, r.submitted_at as created_at,
                   q.id as quiz_id, q.topic, q.difficulty, q.total_questions as number_of_questions
            FROM results r
            JOIN quizzes q ON r.quiz_id = q.id
            WHERE r.user_id = %s
        """
        params = [user_id]

        if topic:
            query += " AND q.topic LIKE %s"
            params.append(f"%{topic}%")

        if difficulty:
            query += " AND q.difficulty = %s"
            params.append(difficulty)

        query += " ORDER BY r.submitted_at DESC"

        cursor.execute(query, tuple(params))
        history = cursor.fetchall()

        for item in history:
            if item.get("created_at") and hasattr(item["created_at"], "isoformat"):
                item["created_at"] = item["created_at"].isoformat()

        return {"history": history}
    except Exception as e:
        print(f"DB Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()