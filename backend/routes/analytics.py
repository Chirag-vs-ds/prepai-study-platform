import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, List, Optional

from database import get_db
import models

# Initialize APIRouter
router = APIRouter()


class StudySessionCreate(BaseModel):
    """Schema to validate logging a new study session."""
    subject: str = Field(default="Physics", description="Subject studied during this session.")
    minutes: int = Field(default=30, description="Duration of study session in minutes.")
    user_id: Optional[str] = Field(default="default_student", description="Identifies the student.")


class QuizAttemptCreate(BaseModel):
    """Schema to validate logging a new quiz attempt."""
    quiz_title: str = Field(default="Electromagnetism MCQ Practice", description="Title of the completed quiz.")
    score: float = Field(default=80.0, description="Percentage score achieved (0-100).")
    total_questions: int = Field(default=5, description="Number of questions in the quiz.")
    user_id: Optional[str] = Field(default="default_student", description="Identifies the student.")


@router.get("/analytics")
async def get_analytics(user_id: str = "default_student", db: Session = Depends(get_db)) -> Dict:
    """
    Returns consolidated dashboard analytics for a student.
    Aggregates study time, completed quizzes, average score, consistency streaks,
    and returns a clean 7-day historical progress chart array.
    """
    # 1. Calculate Total Study Time (in minutes)
    total_minutes = db.query(func.sum(models.StudySession.study_time_minutes))\
                      .filter(models.StudySession.user_id == user_id).scalar() or 0
                      
    # 2. Count Quizzes Completed
    quizzes_count = db.query(models.QuizAttempt)\
                      .filter(models.QuizAttempt.user_id == user_id).count()
                      
    # 3. Calculate Average Quiz Score (Percentage)
    avg_score = db.query(func.avg(models.QuizAttempt.score))\
                  .filter(models.QuizAttempt.user_id == user_id).scalar()
    avg_score = round(float(avg_score), 1) if avg_score is not None else 0.0

    # 4. Fetch Current and All-Time Streak
    streak_record = db.query(models.UserStreak)\
                      .filter(models.UserStreak.user_id == user_id).first()
                      
    current_streak = 0
    longest_streak = 0
    
    if streak_record:
        # Check if the streak has expired (last active date is older than yesterday)
        today = datetime.date.today()
        yesterday = today - datetime.timedelta(days=1)
        
        if streak_record.last_active_date < yesterday:
            # Streak expired offline. Automatically reset current_streak in DB to be safe
            streak_record.current_streak = 0
            db.commit()
            
        current_streak = streak_record.current_streak
        longest_streak = streak_record.longest_streak

    # 5. Generate Dynamic 7-Day Historical Progress (for frontend charting)
    weekly_progress = []
    today = datetime.date.today()
    
    # Loop over the last 7 days (from 6 days ago up to today)
    for i in range(6, -1, -1):
        target_date = today - datetime.timedelta(days=i)
        
        # Query total study minutes logged on this specific calendar date
        day_minutes = db.query(func.sum(models.StudySession.study_time_minutes))\
                        .filter(models.StudySession.user_id == user_id)\
                        .filter(models.StudySession.session_date == target_date).scalar() or 0
                        
        weekly_progress.append({
            "day": target_date.strftime("%a"),  # e.g., "Mon", "Tue"
            "date": str(target_date),
            "minutes": int(day_minutes)
        })

    return {
        "success": True,
        "user_id": user_id,
        "metrics": {
            "study_time_minutes": int(total_minutes),
            "study_time_hours": round(total_minutes / 60, 1),
            "quizzes_completed": quizzes_count,
            "avg_quiz_score": avg_score,
            "current_streak": current_streak,
            "longest_streak": longest_streak
        },
        "weekly_progress": weekly_progress
    }


@router.post("/study-session")
async def log_study_session(session_data: StudySessionCreate, db: Session = Depends(get_db)) -> Dict:
    """
    Logs a new study session and dynamically updates the rolling study streak.
    """
    if session_data.minutes <= 0:
        raise HTTPException(status_code=400, detail="Study minutes must be greater than zero.")

    user_id = session_data.user_id
    today = datetime.date.today()
    yesterday = today - datetime.timedelta(days=1)

    # 1. Insert the new study session log
    new_session = models.StudySession(
        user_id=user_id,
        subject=session_data.subject.strip(),
        study_time_minutes=session_data.minutes,
        session_date=today
    )
    db.add(new_session)
    db.flush()  # flushes session to get ID, holds transaction active

    # 2. Update Student Streak Records
    streak = db.query(models.UserStreak).filter(models.UserStreak.user_id == user_id).first()

    if not streak:
        # First active day ever!
        streak = models.UserStreak(
            user_id=user_id,
            current_streak=1,
            longest_streak=1,
            last_active_date=today
        )
        db.add(streak)
    else:
        # Streak already exists. Check last active date:
        if streak.last_active_date == today:
            # Already active today. Do not modify streak values, but update timestamp
            streak.last_active_date = today
        elif streak.last_active_date == yesterday:
            # Studied consecutively yesterday! Increment rolling streak
            streak.current_streak += 1
            streak.longest_streak = max(streak.longest_streak, streak.current_streak)
            streak.last_active_date = today
        else:
            # Missed a day! Reset current streak back to 1 starting today
            streak.current_streak = 1
            streak.last_active_date = today

    db.flush()

    # 3. Create Streak Notification
    try:
        notif_msg = f"Congrats on studying {session_data.subject}! Your active daily streak is now {streak.current_streak} days. Keep it up!"
        new_notif = models.Notification(
            user_id=user_id,
            title="Study Streak Updated! 🔥",
            message=notif_msg,
            type="streak",
            is_read=False
        )
        db.add(new_notif)
    except Exception as e:
        print(f"Error creating streak notification: {e}")

    db.commit()

    return {
        "success": True,
        "message": "Study session successfully logged!",
        "streak_update": {
            "current_streak": streak.current_streak,
            "longest_streak": streak.longest_streak
        }
    }


@router.post("/quiz-attempt")
async def log_quiz_attempt(quiz_data: QuizAttemptCreate, db: Session = Depends(get_db)) -> Dict:
    """
    Logs a newly completed quiz attempt score.
    """
    if quiz_data.score < 0.0 or quiz_data.score > 100.0:
        raise HTTPException(status_code=400, detail="Quiz score must be a percentage between 0 and 100.")
        
    if quiz_data.total_questions <= 0:
        raise HTTPException(status_code=400, detail="Total questions count must be greater than zero.")

    new_attempt = models.QuizAttempt(
        user_id=quiz_data.user_id,
        quiz_title=quiz_data.quiz_title.strip(),
        score=quiz_data.score,
        total_questions=quiz_data.total_questions,
        completed_at=datetime.datetime.utcnow()
    )
    db.add(new_attempt)
    db.flush()

    # Create Quiz Completed Notification
    try:
        notif_msg = f"You scored {quiz_data.score}% on the quiz '{quiz_data.quiz_title}' ({quiz_data.total_questions} questions)!"
        new_notif = models.Notification(
            user_id=quiz_data.user_id,
            title="Quiz Completed! 📝",
            message=notif_msg,
            type="quiz",
            is_read=False
        )
        db.add(new_notif)
    except Exception as e:
        print(f"Error creating quiz notification: {e}")

    db.commit()

    return {
        "success": True,
        "message": "Quiz attempt successfully logged!",
        "attempt_id": new_attempt.id
    }


@router.post("/seed-sample-data")
async def seed_sample_data(db: Session = Depends(get_db)) -> Dict:
    """
    Resets the analytics tables and seeds realistic mock data
    spanning the last 7 days. This pre-populates dashboard metrics and progress charts!
    """
    user_id = "default_student"
    today = datetime.date.today()

    try:
        # 1. Clean out existing analytics tables for user_id to start clean
        db.query(models.StudySession).filter(models.StudySession.user_id == user_id).delete()
        db.query(models.QuizAttempt).filter(models.QuizAttempt.user_id == user_id).delete()
        db.query(models.UserStreak).filter(models.UserStreak.user_id == user_id).delete()
        db.query(models.Notification).filter(models.Notification.user_id == user_id).delete()
        db.commit()

        # 2. Seed Mock Study Sessions (varying over the past 7 days)
        sessions = [
            models.StudySession(user_id=user_id, subject="Physics", study_time_minutes=45, session_date=today - datetime.timedelta(days=6)),
            models.StudySession(user_id=user_id, subject="Chemistry", study_time_minutes=30, session_date=today - datetime.timedelta(days=5)),
            models.StudySession(user_id=user_id, subject="Math", study_time_minutes=60, session_date=today - datetime.timedelta(days=4)),
            models.StudySession(user_id=user_id, subject="Physics", study_time_minutes=40, session_date=today - datetime.timedelta(days=3)),
            models.StudySession(user_id=user_id, subject="Chemistry", study_time_minutes=55, session_date=today - datetime.timedelta(days=2)),
            models.StudySession(user_id=user_id, subject="Math", study_time_minutes=90, session_date=today - datetime.timedelta(days=1)),
            models.StudySession(user_id=user_id, subject="Physics", study_time_minutes=50, session_date=today)
        ]
        db.add_all(sessions)

        # 3. Seed Mock Quiz Attempts
        quizzes = [
            models.QuizAttempt(user_id=user_id, quiz_title="Electrostatics Basic Practice", score=80.0, total_questions=5, completed_at=datetime.datetime.utcnow() - datetime.timedelta(days=5)),
            models.QuizAttempt(user_id=user_id, quiz_title="Integration by Parts Quiz", score=100.0, total_questions=5, completed_at=datetime.datetime.utcnow() - datetime.timedelta(days=3)),
            models.QuizAttempt(user_id=user_id, quiz_title="Organic Reaction Mechanism Practice", score=60.0, total_questions=10, completed_at=datetime.datetime.utcnow() - datetime.timedelta(days=2)),
            models.QuizAttempt(user_id=user_id, quiz_title="Faradays Induction Test", score=90.0, total_questions=10, completed_at=datetime.datetime.utcnow() - datetime.timedelta(days=1))
        ]
        db.add_all(quizzes)

        # 4. Seed Streak Record (e.g. studied consecutively for 7 days, all-time high 12)
        streak = models.UserStreak(
            user_id=user_id,
            current_streak=7,
            longest_streak=12,
            last_active_date=today
        )
        db.add(streak)

        # 5. Seed initial notifications
        notifications = [
            models.Notification(user_id=user_id, title="Welcome to PrepAI! 🎉", message="Your personal AI academic study assistant is fully configured.", type="system", is_read=False),
            models.Notification(user_id=user_id, title="Study Streak Milestone! 🔥", message="You studied 7 days in a row! Amazing consistency.", type="streak", is_read=False),
            models.Notification(user_id=user_id, title="Top Score! 🏆", message="You scored a perfect 100% on the 'Integration by Parts Quiz'.", type="quiz", is_read=False)
        ]
        db.add_all(notifications)

        db.commit()

        return {
            "success": True,
            "message": "Database analytics tables successfully cleared and seeded with fresh, realistic mock progress!"
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while seeding database: {str(e)}"
        )


@router.get("/focus-areas")
async def get_focus_areas(user_id: str = "default_student", db: Session = Depends(get_db)) -> List[Dict]:
    """
    Returns dynamically generated focus areas based on recent quiz performance.
    Parses topics and groups accuracy rates based on quiz attempts in the DB.
    """
    attempts = db.query(models.QuizAttempt).filter(models.QuizAttempt.user_id == user_id).all()
    
    if not attempts:
        # Return elegant baseline starter topics if no quiz attempts exist yet
        return [
            {"topic": "Electromagnetism", "subject": "Physics", "accuracy": 65, "previousAccuracy": 60, "attempted": 2},
            {"topic": "Organic Reactions", "subject": "Chemistry", "accuracy": 70, "previousAccuracy": 75, "attempted": 3},
            {"topic": "Integration techniques", "subject": "Mathematics", "accuracy": 85, "previousAccuracy": 80, "attempted": 1}
        ]
        
    # Group quiz attempts by their quiz titles
    grouped = {}
    for att in attempts:
        title = att.quiz_title
        if title not in grouped:
            grouped[title] = []
        grouped[title].append(att)
        
    focus_areas = []
    for title, atts in grouped.items():
        # Sort chronologically by completion date
        atts.sort(key=lambda x: x.completed_at)
        scores = [a.score for a in atts]
        avg_score = round(sum(scores) / len(scores), 1)
        
        # Parse subject from title heuristics
        title_lower = title.lower()
        subject = "Physics"
        if any(w in title_lower for w in ["induction", "magnetic", "faraday", "flux", "physics", "electrostatics", "thermodynamics"]):
            subject = "Physics"
        elif any(w in title_lower for w in ["chemistry", "organic", "reaction", "sn1", "sn2"]):
            subject = "Chemistry"
        elif any(w in title_lower for w in ["parts", "integration", "calculus", "differential", "math"]):
            subject = "Mathematics"
        elif any(w in title_lower for w in ["circulation", "anatomy", "heart", "biology", "blood", "cell"]):
            subject = "Biology"
            
        # Previous accuracy is the second to last attempt, or slightly lower as a fallback trend
        previous_accuracy = round(scores[-2], 1) if len(scores) > 1 else max(0.0, avg_score - 5.0)
        
        focus_areas.append({
            "topic": title,
            "subject": subject,
            "accuracy": int(avg_score),
            "previousAccuracy": int(previous_accuracy),
            "attempted": len(atts)
        })
        
    # Sort by accuracy ascending, so that weaker topics (lower accuracy) appear first
    focus_areas.sort(key=lambda x: x["accuracy"])
    return focus_areas

