const API_BASE_URL = 'http://localhost:8000/api';

let currentUserId = null;
const availableExercises = [];

function getCurrentUserId() {
    return sessionStorage.getItem('currentUserId');
}

function setCurrentUserId(userId) {
    currentUserId = userId;
    sessionStorage.setItem('currentUserId', userId);
}

function clearCurrentUser() {
    currentUserId = null;
    sessionStorage.removeItem('currentUserId');
}

function showMessage(elementId, message, type = 'success') {
    const messageElement = document.getElementById(elementId);
    if (messageElement) {
        messageElement.textContent = message;
        messageElement.className = `message ${type}`;
        setTimeout(() => {
            messageElement.textContent = '';
            messageElement.className = 'message';
        }, 3000);
    }
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('id-ID');
}

function checkAuthAndRedirect() {
    const userId = getCurrentUserId();
    if (!userId) {
        window.location.href = 'login.html';
        return false;
    }
    currentUserId = userId;
    return true;
}

async function apiRequest(endpoint, method = 'GET', data = null) {
    const config = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        }
    };

    if (data) {
        config.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.detail || `HTTP error! status: ${response.status}`);
        }
        
        return result;
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

function handleLogin() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('login-username').value;
            const password = document.getElementById('login-password').value;
            
            try {
                const result = await apiRequest('/login', 'POST', {
                    username: username,
                    password: password
                });
                
                setCurrentUserId(result.user_id);
                showMessage('login-message', 'Login berhasil! Mengalihkan...', 'success');
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
            } catch (error) {
                showMessage('login-message', error.message || 'Login gagal!', 'error');
            }
        });
    }
}

function handleRegister() {
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('reg-username').value;
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;
            
            try {
                await apiRequest('/register', 'POST', {
                    username: username,
                    email: email,
                    password: password
                });
                
                showMessage('register-message', 'Registrasi berhasil! Silakan login.', 'success');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } catch (error) {
                showMessage('register-message', error.message || 'Registrasi gagal!', 'error');
            }
        });
    }
}

function handleLogout() {
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', function() {
            clearCurrentUser();
            window.location.href = 'login.html';
        });
    }
}
async function loadDashboard() {
    if (!checkAuthAndRedirect()) return;
    
    try {
        const dashboardData = await apiRequest(`/dashboard/${currentUserId}`);
        
        const totalWorkoutsEl = document.getElementById('totalWorkouts');
        if (totalWorkoutsEl) {
            totalWorkoutsEl.textContent = dashboardData.total_workouts;
        }
        
        const lastWorkoutEl = document.getElementById('lastWorkout');
        if (lastWorkoutEl) {
            if (dashboardData.last_workout) {
                const lastWorkout = dashboardData.last_workout;
                lastWorkoutEl.textContent = `${lastWorkout.exercise} (${formatDate(lastWorkout.date)})`;
            } else {
                lastWorkoutEl.textContent = 'Belum ada data.';
            }
        }
        
        const latestWeightEl = document.getElementById('latestWeight');
        if (latestWeightEl) {
            if (dashboardData.latest_weight) {
                latestWeightEl.textContent = `${dashboardData.latest_weight} kg`;
            } else {
                latestWeightEl.textContent = 'Belum ada data.';
            }
        }
        
        const activeGoalEl = document.getElementById('activeGoal');
        if (activeGoalEl) {
            if (dashboardData.active_goal) {
                const goal = dashboardData.active_goal;
                activeGoalEl.textContent = `${goal.type}: ${goal.target} (${goal.deadline})`;
            } else {
                activeGoalEl.textContent = 'Belum ada data.';
            }
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showMessage('dashboard-message', 'Error loading dashboard data', 'error');
    }
}

async function loadExercises() {
    try {
        const result = await apiRequest('/workouts');
        availableExercises.length = 0;
        availableExercises.push(...result.exercises);
        return result.exercises;
    } catch (error) {
        console.error('Error loading exercises:', error);
        return [];
    }
}

async function initializeWorkoutForm() {
    if (!checkAuthAndRedirect()) return;
    
    const exerciseSelect = document.getElementById('exerciseSelect');
    if (exerciseSelect) {
        try {
            const exercises = await loadExercises();
            
            exerciseSelect.innerHTML = '<option value="">Pilih latihan...</option>';
            
            exercises.forEach(exercise => {
                const option = document.createElement('option');
                option.value = exercise;
                option.textContent = exercise;
                exerciseSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading exercises:', error);
        }
        
        const workoutForm = document.getElementById('workoutForm');
        if (workoutForm) {
            workoutForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const workoutData = {
                    user_id: parseInt(currentUserId),
                    exercise_name: document.getElementById('exerciseSelect').value,
                    sets: parseInt(document.getElementById('sets').value),
                    reps: parseInt(document.getElementById('reps').value),
                    weight: parseFloat(document.getElementById('weight').value) || null
                };
                
                try {
                    await apiRequest('/workouts/log', 'POST', workoutData);
                    showMessage('log-message', 'Latihan berhasil dicatat!', 'success');
                    workoutForm.reset();
                } catch (error) {
                    showMessage('log-message', error.message || 'Error logging workout', 'error');
                }
            });
        }
    }
}

async function loadWorkoutHistory() {
    if (!checkAuthAndRedirect()) return;
    
    const tbody = document.querySelector('#workout-history-table tbody');
    if (tbody) {
        try {
            const result = await apiRequest(`/workouts/history/${currentUserId}`);
            tbody.innerHTML = '';
            
            if (result.history.length === 0) {
                const row = tbody.insertRow();
                const cell = row.insertCell();
                cell.colSpan = 5;
                cell.textContent = 'Belum ada data latihan.';
                cell.style.textAlign = 'center';
            } else {
                result.history.forEach(workout => {
                    const row = tbody.insertRow();
                    row.insertCell().textContent = formatDate(workout.date);
                    row.insertCell().textContent = workout.exercise;
                    row.insertCell().textContent = workout.sets;
                    row.insertCell().textContent = workout.reps;
                    row.insertCell().textContent = workout.weight ? `${workout.weight} kg` : '-';
                });
            }
        } catch (error) {
            console.error('Error loading workout history:', error);
            showMessage('history-message', 'Error loading workout history', 'error');
        }
    }
}

async function initializeProgressTracker() {
    if (!checkAuthAndRedirect()) return;
    
    const exerciseSelect = document.getElementById('exerciseSelect');
    const messageEl = document.getElementById('progressMessage');
    
    if (exerciseSelect) {
        try {
            if (messageEl) {
                messageEl.textContent = 'Loading exercise data...';
            }
            
            console.log('Loading workout history for user:', currentUserId);
            
            const result = await apiRequest(`/workouts/history/${currentUserId}`);
            
            console.log('Workout history loaded:', result);
            
            if (!result.history || result.history.length === 0) {
                if (messageEl) {
                    messageEl.textContent = 'Belum ada data latihan. Silakan catat latihan terlebih dahulu.';
                }
                exerciseSelect.innerHTML = '<option value="">Tidak ada latihan tersedia</option>';
                return;
            }
            
            const userExercises = [...new Set(result.history.map(w => w.exercise))];
            console.log('Unique exercises found:', userExercises);
            
            exerciseSelect.innerHTML = '<option value="">Pilih latihan...</option>';
            userExercises.forEach(exercise => {
                const option = document.createElement('option');
                option.value = exercise;
                option.textContent = exercise;
                exerciseSelect.appendChild(option);
            });
            
            if (messageEl) {
                messageEl.textContent = 'Pilih latihan untuk melihat progress.';
            }
            
            exerciseSelect.addEventListener('change', function() {
                console.log('Exercise selected:', this.value);
                if (this.value) {
                    displayProgressChart(this.value);
                } else {
                    clearProgressChart();
                    if (messageEl) {
                        messageEl.textContent = 'Pilih latihan untuk melihat progress.';
                    }
                }
            });
        } catch (error) {
            console.error('Error initializing progress tracker:', error);
            if (messageEl) {
                messageEl.textContent = `Error loading data: ${error.message}`;
            }
        }
    }
}

async function displayProgressChart(exerciseName) {
    const canvas = document.getElementById('progressChart');
    const messageEl = document.getElementById('progressMessage');
    
    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }
    
    if (messageEl) {
        messageEl.textContent = 'Loading progress data...';
    }
    
    try {
        console.log('Fetching progress data for:', exerciseName, 'User ID:', currentUserId);
        
        const result = await apiRequest('/progress', 'POST', {
            user_id: parseInt(currentUserId),
            exercise_name: exerciseName
        });
        
        console.log('Progress data received:', result);
        
        if (!result.progress || result.progress.length === 0) {
            if (messageEl) {
                messageEl.textContent = 'Tidak ada data progress untuk latihan ini.';
            }
            clearProgressChart();
            return;
        }
        
        if (result.progress.length < 2) {
            if (messageEl) {
                messageEl.textContent = 'Perlu minimal 2 data latihan untuk menampilkan grafik progress.';
            }
            clearProgressChart();
            return;
        }
        
        if (messageEl) {
            messageEl.textContent = '';
        }
        
        canvas.width = 800;
        canvas.height = 400;
        canvas.style.display = 'block';
        canvas.style.border = '1px solid #ccc';
        canvas.style.backgroundColor = '#fff';
        
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const chartX = 80;
        const chartY = 60;
        const chartWidth = canvas.width - 120;
        const chartHeight = canvas.height - 120;
        
        const validPoints = result.progress.filter(p => p.total_volume != null && p.total_volume > 0);
        
        if (validPoints.length === 0) {
            if (messageEl) {
                messageEl.textContent = 'Tidak ada data volume yang valid untuk ditampilkan.';
            }
            return;
        }
        
        const maxVolume = Math.max(...validPoints.map(p => p.total_volume));
        const minVolume = Math.min(...validPoints.map(p => p.total_volume));
        
        console.log('Chart data - Max volume:', maxVolume, 'Min volume:', minVolume);
        
        ctx.fillStyle = '#f9f9f9';
        ctx.fillRect(chartX, chartY, chartWidth, chartHeight);
        
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(chartX, chartY);
        ctx.lineTo(chartX, chartY + chartHeight);
        ctx.lineTo(chartX + chartWidth, chartY + chartHeight);
        ctx.stroke();

        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        for (let i = 1; i <= 5; i++) {
            const y = chartY + (i * chartHeight) / 5;
            ctx.beginPath();
            ctx.moveTo(chartX, y);
            ctx.lineTo(chartX + chartWidth, y);
            ctx.stroke();
        }
        
        if (result.progress.length > 1) {
            ctx.strokeStyle = '#ff6b6b';
            ctx.lineWidth = 3;
            ctx.beginPath();
            
            let firstPointDrawn = false;
            result.progress.forEach((point, index) => {
                if (point.total_volume != null && point.total_volume > 0) {
                    const x = chartX + (index * chartWidth) / (result.progress.length - 1);
                    const y = chartY + chartHeight - ((point.total_volume - minVolume) * chartHeight) / (maxVolume - minVolume || 1);
                    
                    if (!firstPointDrawn) {
                        ctx.moveTo(x, y);
                        firstPointDrawn = true;
                    } else {
                        ctx.lineTo(x, y);
                    }
                    
                    ctx.save();
                    ctx.fillStyle = '#ff6b6b';
                    ctx.beginPath();
                    ctx.arc(x, y, 5, 0, 2 * Math.PI);
                    ctx.fill();
                    ctx.restore();
                    
                    ctx.save();
                    ctx.fillStyle = '#333';
                    ctx.font = '10px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(Math.round(point.total_volume), x, y - 10);
                    ctx.restore();
                }
            });
            ctx.stroke();
        }
        
        ctx.fillStyle = '#333';
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Total Volume (kg)', 10, 30);
        
        ctx.font = '10px Arial';
        ctx.textAlign = 'right';
        for (let i = 0; i <= 5; i++) {
            const value = minVolume + ((maxVolume - minVolume) * (5 - i)) / 5;
            const y = chartY + (i * chartHeight) / 5;
            ctx.fillText(Math.round(value), chartX - 5, y + 3);
        }
        
        ctx.textAlign = 'center';
        result.progress.forEach((point, index) => {
            const x = chartX + (index * chartWidth) / (result.progress.length - 1);
            const date = new Date(point.date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
            ctx.fillText(date, x, chartY + chartHeight + 15);
        });
        
        ctx.fillStyle = '#ff6b6b';
        ctx.fillRect(chartX + chartWidth - 100, chartY - 40, 15, 3);
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Total Volume', chartX + chartWidth - 80, chartY - 35);
        
        console.log('Chart drawn successfully');
        
    } catch (error) {
        console.error('Error loading progress data:', error);
        if (messageEl) {
            messageEl.textContent = `Error: ${error.message}`;
        }
        clearProgressChart();
    }
}

function clearProgressChart() {
    const canvas = document.getElementById('progressChart');
    if (canvas) {
        canvas.width = 800;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#999';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Pilih latihan untuk melihat grafik progress', canvas.width / 2, canvas.height / 2);
    }
}

async function initializeBodyStatsForm() {
    if (!checkAuthAndRedirect()) return;
    
    const bodyStatForm = document.getElementById('bodyStatForm');
    if (bodyStatForm) {
        bodyStatForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const bodyStatData = {
                user_id: parseInt(currentUserId),
                weight: parseFloat(document.getElementById('weight').value) || null,
                body_fat_percent: parseFloat(document.getElementById('bodyFatPercent').value) || null,
                muscle_mass: parseFloat(document.getElementById('muscleMass').value) || null,
                waist_circumference: parseFloat(document.getElementById('waistCircumference').value) || null
            };
            
            try {
                await apiRequest('/bodystats/log', 'POST', bodyStatData);
                showMessage('stat-message', 'Statistik tubuh berhasil disimpan!', 'success');
                bodyStatForm.reset();
                loadBodyStatsHistory();
            } catch (error) {
                showMessage('stat-message', error.message || 'Error saving body stats', 'error');
            }
        });
    }
    
    loadBodyStatsHistory();
}

async function loadBodyStatsHistory() {
    const historyList = document.getElementById('stat-history-list');
    if (historyList) {
        try {
            const result = await apiRequest(`/bodystats/history/${currentUserId}`);
            historyList.innerHTML = '';
            
            if (result.stats_history.length === 0) {
                const li = document.createElement('li');
                li.textContent = 'Belum ada data statistik tubuh.';
                historyList.appendChild(li);
            } else {
                result.stats_history.forEach(stat => {
                    const li = document.createElement('li');
                    const parts = [];
                    
                    if (stat.weight) parts.push(`Berat: ${stat.weight} kg`);
                    if (stat.body_fat_percent) parts.push(`Lemak: ${stat.body_fat_percent}%`);
                    if (stat.muscle_mass) parts.push(`Otot: ${stat.muscle_mass} kg`);
                    if (stat.waist_circumference) parts.push(`Pinggang: ${stat.waist_circumference} cm`);
                    
                    li.innerHTML = `<strong>${formatDate(stat.date)}</strong><br>${parts.join(', ')}`;
                    historyList.appendChild(li);
                });
            }
        } catch (error) {
            console.error('Error loading body stats history:', error);
        }
    }
}

async function initializeGoalsForm() {
    if (!checkAuthAndRedirect()) return;
    
    const goalForm = document.getElementById('goalForm');
    if (goalForm) {
        goalForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const goalData = {
                user_id: parseInt(currentUserId),
                goal_type: document.getElementById('goalType').value,
                target_value: parseFloat(document.getElementById('targetValue').value),
                deadline: document.getElementById('deadline').value || null
            };
            
            try {
                await apiRequest('/goals', 'POST', goalData);
                showMessage('goal-message', 'Target berhasil dibuat!', 'success');
                goalForm.reset();
                loadGoalsList();
            } catch (error) {
                showMessage('goal-message', error.message || 'Error creating goal', 'error');
            }
        });
    }
    
    loadGoalsList();
}

async function loadGoalsList() {
    const goalsList = document.getElementById('goal-list');
    if (goalsList) {
        try {
            const result = await apiRequest(`/goals/${currentUserId}`);
            goalsList.innerHTML = '';
            
            if (result.goals.length === 0) {
                const li = document.createElement('li');
                li.textContent = 'Belum ada target yang dibuat.';
                goalsList.appendChild(li);
            } else {
                result.goals.forEach(goal => {
                    const li = document.createElement('li');
                    li.className = goal.is_achieved ? 'goal-completed' : 'goal-active';
                    
                    const deadlineText = goal.deadline ? ` (Deadline: ${formatDate(goal.deadline)})` : '';
                    const statusText = goal.is_achieved ? ' ✓ Selesai' : '';
                    
                    li.innerHTML = `
                        <strong>${goal.goal_type}</strong>: ${goal.target_value}${deadlineText}${statusText}
                        <br><small>Target ID: ${goal.id}</small>
                        ${!goal.is_achieved ? `<button onclick="completeGoal(${goal.id})" style="margin-left: 10px;">Selesai</button>` : ''}
                    `;
                    
                    goalsList.appendChild(li);
                });
            }
        } catch (error) {
            console.error('Error loading goals:', error);
        }
    }
}

async function completeGoal(goalId) {
    try {
        console.log('Complete goal functionality needs backend implementation');
        showMessage('goal-message', 'Fitur selesaikan target belum diimplementasikan di backend', 'error');
    } catch (error) {
        console.error('Error completing goal:', error);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const currentPage = window.location.pathname.split('/').pop();
    
    handleLogout();
    
    switch (currentPage) {
        case 'login.html':
        case '':
            handleLogin();
            break;
        case 'register.html':
            handleRegister();
            break;
        case 'dashboard.html':
            loadDashboard();
            break;
        case 'workout_log.html':
            initializeWorkoutForm();
            break;
        case 'riwayat.html':
            loadWorkoutHistory();
            break;
        case 'progress.html':
            initializeProgressTracker();
            break;
        case 'bodystats.html':
            initializeBodyStatsForm();
            break;
        case 'goals.html':
            initializeGoalsForm();
            break;
    }
});

window.completeGoal = completeGoal;