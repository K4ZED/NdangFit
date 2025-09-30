from sqlalchemy import Column, Integer, String, ForeignKey, Date, DateTime, DECIMAL, func, SmallInteger
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.sql import text

Base = declarative_base()

class User(Base):
    __tablename__ = "Users"

    UserID = Column(Integer, primary_key=True, autoincrement=True)
    Username = Column(String(50), nullable=False, unique=True)
    Email = Column(String(100), nullable=False, unique=True)
    PasswordHash = Column(String(255), nullable=False)
    CreatedAt = Column(DateTime, server_default=func.now())

    workouts = relationship("Workout", back_populates="user")
    stats = relationship("BodyStat", back_populates="user")
    goals = relationship("Goal", back_populates="user")
    schedules = relationship("Schedule", back_populates="user")

class WorkoutLibrary(Base):
    __tablename__ = "WorkoutLibrary"

    ExerciseID = Column(Integer, primary_key=True, autoincrement=True)
    ExerciseName = Column(String(100), nullable=False, unique=True)
    Category = Column(String(50), nullable=True)
    Description = Column(String(500), nullable=True)
    
    workouts = relationship("Workout", back_populates="exercise")

class Workout(Base):
    __tablename__ = "Workouts"

    WorkoutID = Column(Integer, primary_key=True, autoincrement=True)
    UserID = Column(Integer, ForeignKey("Users.UserID"), nullable=False)
    ExerciseID = Column(Integer, ForeignKey("WorkoutLibrary.ExerciseID"), nullable=False)
    Sets = Column(Integer, nullable=False)
    Reps = Column(Integer, nullable=False)
    Weight = Column(DECIMAL(6,2), nullable=True)
    LogDate = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="workouts")
    exercise = relationship("WorkoutLibrary", back_populates="workouts")

class Goal(Base):
    __tablename__ = "Goals"

    GoalID = Column(Integer, primary_key=True, autoincrement=True)
    UserID = Column(Integer, ForeignKey("Users.UserID"), nullable=False)
    GoalType = Column(String(50), nullable=False)
    TargetValue = Column(DECIMAL(10,2), nullable=False)
    CurrentValue = Column(DECIMAL(10,2), nullable=True)
    Deadline = Column(Date, nullable=True)
    IsAchieved = Column(SmallInteger, default=0)
    CreatedAt = Column(DateTime, server_default=func.now())
    
    user = relationship("User", back_populates="goals")

class Schedule(Base):
    __tablename__ = "Schedules"

    ScheduleID = Column(Integer, primary_key=True, autoincrement=True)
    UserID = Column(Integer, ForeignKey("Users.UserID"), nullable=False)
    Date = Column(Date, nullable=False)
    IsWorkoutDay = Column(SmallInteger, default=1)
    Notes = Column(String(255), nullable=True)
    
    user = relationship("User", back_populates="schedules")

class BodyStat(Base):
    __tablename__ = "BodyStats"

    StatID = Column(Integer, primary_key=True, autoincrement=True)
    UserID = Column(Integer, ForeignKey("Users.UserID"), nullable=False)
    Weight = Column(DECIMAL(5,2), nullable=True)
    BodyFatPercent = Column(DECIMAL(5,2), nullable=True)
    MuscleMass = Column(DECIMAL(5,2), nullable=True)
    WaistCircumference = Column(DECIMAL(5,2), nullable=True)
    RecordedAt = Column(DateTime, server_default=func.now())
    
    user = relationship("User", back_populates="stats")
