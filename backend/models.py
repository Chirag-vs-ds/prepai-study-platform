import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Date, Boolean, Text
from database import Base

class User(Base):
    """
    SQLAlchemy model representing a platform user.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class StudySession(Base):
    """
    SQLAlchemy model representing a recorded student study session.
    Tracks time spent learning a particular academic subject.
    """
    __tablename__ = "study_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, default="default_student", index=True)
    subject = Column(String, nullable=False, default="General Science")
    study_time_minutes = Column(Integer, nullable=False, default=0)
    session_date = Column(Date, default=datetime.date.today, index=True)


class QuizAttempt(Base):
    """
    SQLAlchemy model representing a completed multiple-choice quiz.
    Tracks quiz score and total questions to calculate average success rates.
    """
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, default="default_student", index=True)
    quiz_title = Column(String, nullable=False, default="AI Custom Quiz")
    score = Column(Float, nullable=False, default=0.0)  # e.g., 85.5% success rate
    total_questions = Column(Integer, nullable=False, default=5)
    completed_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)


class UserStreak(Base):
    """
    SQLAlchemy model tracking daily consistency.
    Maintains a rolling study streak which increments when they study consecutively
    day-to-day, along with their all-time personal high streak!
    """
    __tablename__ = "user_streaks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, default="default_student", unique=True, index=True)
    current_streak = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    last_active_date = Column(Date, default=datetime.date.today)


class DoubtHistory(Base):
    """
    SQLAlchemy model representing a solved student doubt.
    Keeps a history of students' inquiries and matched subjects.
    """
    __tablename__ = "doubt_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, default="default_student", index=True)
    question = Column(Text, nullable=False)
    subject = Column(String, default="General Science")
    answer_source = Column(String, default="Gemini 2.5 Flash")
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)


class Notification(Base):
    """
    SQLAlchemy model representing dynamic user notifications.
    Alerts students about study milestones, streaks, or quizzes.
    """
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, default="default_student", index=True)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String, default="system")  # "quiz", "streak", "system"
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
