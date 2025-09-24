from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import create_engine, func, Date
from sqlalchemy.orm import sessionmaker
from pydantic import BaseModel
import bcrypt
from datetime import date
from typing import Optional, List

from app.models import Base, User, WorkoutLibrary, Workout, BodyStat, Goal, Schedule
from config import DATABASE_CONNECTION_STRING

# Setup Database
try:
    engine = create_engine(f"mssql+pyodbc:///?odbc_connect={DATABASE_CONNECTION_STRING}")
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
except Exception as e:
    raise RuntimeError(f"Failed to connect to the database. Error: {e}")

# FastAPI
app = FastAPI()

origins = [
    "http://127.0.0.1:5500",
    "http://localhost:5500"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# DB Session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic Models
class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class WorkoutLog(BaseModel):
    user_id: int
    exercise_name: str
    sets: int
    reps: int
    weight: Optional[float] = None

class ProgressRequest(BaseModel):
    user_id: int
    exercise_name: str

class BodyStatCreate(BaseModel):
    user_id: int
    weight: Optional[float] = None
    body_fat_percent: Optional[float] = None
    muscle_mass: Optional[float] = None
    waist_circumference: Optional[float] = None

class GoalCreate(BaseModel):
    user_id: int
    goal_type: str
    target_value: float
    deadline: Optional[date] = None

# API Endpoints
@app.post("/api/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    """Mendaftarkan pengguna baru."""
    hashed_pw = bcrypt.hashpw(user.password.encode(), bcrypt.gensalt()).decode()

    existing = db.query(User).filter((User.Username == user.username) | (User.Email == user.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username/email already registered")

    new_user = User(Username=user.username, Email=user.email, PasswordHash=hashed_pw)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User registered", "user_id": new_user.UserID}

@app.post("/api/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    """Otentikasi pengguna yang sudah ada."""
    db_user = db.query(User).filter(User.Username == user.username).first()
    if not db_user or not bcrypt.checkpw(user.password.encode(), db_user.PasswordHash.encode()):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    return {"message": "Login successful", "user_id": db_user.UserID}

@app.get("/api/workouts")
def get_exercises(db: Session = Depends(get_db)):
    """Mengambil daftar latihan dari perpustakaan latihan."""
    exercises = db.query(WorkoutLibrary).all()
    if not exercises:
        default_exercises = [
            WorkoutLibrary(ExerciseName="Bench Press"),
            WorkoutLibrary(ExerciseName="Squat"),
            WorkoutLibrary(ExerciseName="Deadlift"),
            WorkoutLibrary(ExerciseName="Pull-up"),
            WorkoutLibrary(ExerciseName="Plank")
        ]
        db.add_all(default_exercises)
        db.commit()
        exercises = default_exercises
        
    return {"exercises": [e.ExerciseName for e in exercises]}

@app.post("/api/workouts/log")
def log_workout(workout: WorkoutLog, db: Session = Depends(get_db)):
    """Menyimpan catatan latihan baru."""
    try:
        exercise = db.query(WorkoutLibrary).filter(WorkoutLibrary.ExerciseName == workout.exercise_name).first()
        if not exercise:
            new_exercise = WorkoutLibrary(ExerciseName=workout.exercise_name)
            db.add(new_exercise)
            db.commit()
            db.refresh(new_exercise)
            exercise_id = new_exercise.ExerciseID
        else:
            exercise_id = exercise.ExerciseID
            
        new_workout = Workout(
            UserID=workout.user_id,
            ExerciseID=exercise_id,
            Sets=workout.sets,
            Reps=workout.reps,
            Weight=workout.weight
        )
        db.add(new_workout)
        db.commit()
        db.refresh(new_workout)
        return {"message": "Workout logged successfully!", "workout_id": new_workout.WorkoutID}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/workouts/history/{user_id}")
def get_workout_history(user_id: int, db: Session = Depends(get_db)):
    """Mengambil riwayat latihan pengguna."""
    history_data = db.query(Workout, WorkoutLibrary.ExerciseName)\
        .join(WorkoutLibrary, Workout.ExerciseID == WorkoutLibrary.ExerciseID)\
        .filter(Workout.UserID == user_id)\
        .order_by(Workout.LogDate.desc())\
        .all()
    
    formatted_history = []
    for workout, exercise_name in history_data:
        formatted_history.append({
            "date": workout.LogDate.strftime("%Y-%m-%d"),
            "exercise": exercise_name,
            "sets": workout.Sets,
            "reps": workout.Reps,
            "weight": float(workout.Weight) if workout.Weight is not None else None
        })
    
    return {"history": formatted_history}

@app.post("/api/progress")
def get_progress_data(request: ProgressRequest, db: Session = Depends(get_db)):
    """Menghitung dan mengembalikan total volume latihan per tanggal."""
    exercise = db.query(WorkoutLibrary).filter(WorkoutLibrary.ExerciseName == request.exercise_name).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
        
    progress_data = db.query(
        func.cast(Workout.LogDate, Date).label('date'),
        func.sum(Workout.Sets * Workout.Reps * Workout.Weight).label('total_volume')
    ).filter(
        Workout.UserID == request.user_id,
        Workout.ExerciseID == exercise.ExerciseID
    ).group_by(
        func.cast(Workout.LogDate, Date)
    ).order_by(
        func.cast(Workout.LogDate, Date)
    ).all()
    
    formatted_data = [
        {"date": data.date.strftime("%Y-%m-%d"), "total_volume": float(data.total_volume)}
        for data in progress_data
    ]
    
    return {"progress": formatted_data}

@app.post("/api/bodystats/log")
def log_body_stat(stat: BodyStatCreate, db: Session = Depends(get_db)):
    """Menyimpan catatan statistik tubuh baru."""
    new_stat = BodyStat(
        UserID=stat.user_id,
        Weight=stat.weight,
        BodyFatPercent=stat.body_fat_percent,
        MuscleMass=stat.muscle_mass,
        WaistCircumference=stat.waist_circumference
    )
    db.add(new_stat)
    db.commit()
    db.refresh(new_stat)
    return {"message": "Body stat logged successfully!", "stat_id": new_stat.StatID}

@app.get("/api/bodystats/history/{user_id}")
def get_body_stat_history(user_id: int, db: Session = Depends(get_db)):
    """Mengambil riwayat statistik tubuh pengguna."""
    stats_history = db.query(BodyStat).filter(BodyStat.UserID == user_id).order_by(BodyStat.RecordedAt.desc()).all()
    
    formatted_history = [{
        "date": stat.RecordedAt.strftime("%Y-%m-%d"),
        "weight": float(stat.Weight) if stat.Weight else None,
        "body_fat_percent": float(stat.BodyFatPercent) if stat.BodyFatPercent else None,
        "muscle_mass": float(stat.MuscleMass) if stat.MuscleMass else None,
        "waist_circumference": float(stat.WaistCircumference) if stat.WaistCircumference else None
    } for stat in stats_history]
    
    return {"stats_history": formatted_history}

@app.post("/api/goals")
def create_goal(goal: GoalCreate, db: Session = Depends(get_db)):
    """Membuat target personal baru."""
    new_goal = Goal(
        UserID=goal.user_id,
        GoalType=goal.goal_type,
        TargetValue=goal.target_value,
        Deadline=goal.deadline
    )
    db.add(new_goal)
    db.commit()
    db.refresh(new_goal)
    return {"message": "Goal created successfully!", "goal_id": new_goal.GoalID}

@app.get("/api/goals/{user_id}")
def get_goals(user_id: int, db: Session = Depends(get_db)):
    """Mengambil daftar target personal pengguna."""
    goals = db.query(Goal).filter(Goal.UserID == user_id).order_by(Goal.CreatedAt.desc()).all()
    
    formatted_goals = [{
        "id": goal.GoalID,
        "goal_type": goal.GoalType,
        "target_value": float(goal.TargetValue),
        "current_value": float(goal.CurrentValue) if goal.CurrentValue is not None else None,
        "deadline": goal.Deadline.strftime("%Y-%m-%d") if goal.Deadline else None,
        "is_achieved": bool(goal.IsAchieved)
    } for goal in goals]
    
    return {"goals": formatted_goals}

@app.get("/api/dashboard/{user_id}")
def get_dashboard_summary(user_id: int, db: Session = Depends(get_db)):
    """Mengambil data ringkasan untuk dashboard pengguna."""
    
    # 1. Jumlah total latihan yang dicatat
    total_workouts = db.query(Workout).filter(Workout.UserID == user_id).count()

    # 2. Latihan terakhir yang dicatat
    last_workout = db.query(Workout, WorkoutLibrary.ExerciseName)\
        .join(WorkoutLibrary, Workout.ExerciseID == WorkoutLibrary.ExerciseID)\
        .filter(Workout.UserID == user_id)\
        .order_by(Workout.LogDate.desc())\
        .first()
    
    last_workout_info = None
    if last_workout:
        last_workout_info = {
            "date": last_workout.Workout.LogDate.strftime("%Y-%m-%d %H:%M"),
            "exercise": last_workout.ExerciseName,
            "sets": last_workout.Workout.Sets,
            "reps": last_workout.Workout.Reps
        }
        
    # 3. Berat badan terakhir yang dicatat
    latest_weight_stat = db.query(BodyStat)\
        .filter(BodyStat.UserID == user_id, BodyStat.Weight.isnot(None))\
        .order_by(BodyStat.RecordedAt.desc())\
        .first()
        
    latest_weight = float(latest_weight_stat.Weight) if latest_weight_stat else None
    
    # 4. Target terdekat yang belum tercapai
    active_goal = db.query(Goal)\
        .filter(Goal.UserID == user_id, Goal.IsAchieved == 0)\
        .order_by(Goal.Deadline.asc())\
        .first()

    active_goal_info = None
    if active_goal:
        active_goal_info = {
            "type": active_goal.GoalType,
            "target": float(active_goal.TargetValue),
            "deadline": active_goal.Deadline.strftime("%Y-%m-%d") if active_goal.Deadline else "Tidak ada"
        }
        
    return {
        "total_workouts": total_workouts,
        "last_workout": last_workout_info,
        "latest_weight": latest_weight,
        "active_goal": active_goal_info
    }
