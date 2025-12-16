// Admin Dashboard JavaScript - Complete Fixed Version

// DOM Elements
const adminSections = document.querySelectorAll('.dashboard-section');
const adminNavLinks = document.querySelectorAll('.dashboard-nav a');
const logoutBtn = document.getElementById('logoutBtn');
const studentLoginBtn = document.getElementById('studentLoginBtn');

// Data Management Functions
let isSubmittingStudent = false; // guard to prevent duplicate student creation

function getStudents() {
    // Prefer server-backed list when available; frontend will cache to localStorage as fallback
    return JSON.parse(localStorage.getItem('students')) || [];
}

function getAnnouncements() {
    return JSON.parse(localStorage.getItem('announcements')) || [];
}

function getStudentIdCounter() {
    return parseInt(localStorage.getItem('studentIdCounter')) || 1001;
}

function setStudentIdCounter(value) {
    try {
        const curr = parseInt(localStorage.getItem('studentIdCounter')) || 1001;
        const v = parseInt(value) || curr;
        if (v > curr) localStorage.setItem('studentIdCounter', v.toString());
    } catch (e) {
        localStorage.setItem('studentIdCounter', String(value));
    }
}

function saveStudents(students) {
    localStorage.setItem('students', JSON.stringify(students));
}

function saveAnnouncements(announcements) {
    localStorage.setItem('announcements', JSON.stringify(announcements));
}

// Deleted students tracking (persist deleted IDs so server-sync won't re-add them)
function getDeletedStudentIds() {
    return JSON.parse(localStorage.getItem('deletedStudentIds') || '[]');
}

function saveDeletedStudentIds(list) {
    localStorage.setItem('deletedStudentIds', JSON.stringify(list));
}

function addDeletedStudentId(id) {
    try {
        const list = getDeletedStudentIds();
        const sid = String(id);
        if (!list.includes(sid)) {
            list.push(sid);
            saveDeletedStudentIds(list);
        }
    } catch (e) { console.warn('addDeletedStudentId failed', e.message); }
}

function removeDeletedStudentId(id) {
    try {
        let list = getDeletedStudentIds();
        const sid = String(id);
        list = list.filter(x => x !== sid);
        saveDeletedStudentIds(list);
    } catch (e) { console.warn('removeDeletedStudentId failed', e.message); }
}

function getStudySchedules() {
    return JSON.parse(localStorage.getItem('studySchedules')) || {};
}

function saveStudySchedules(schedules) {
    localStorage.setItem('studySchedules', JSON.stringify(schedules));
}

function getDefaultSchedule() {
    return {
        monday: 'Mathematics - 4:00 PM to 6:00 PM',
        tuesday: 'Physics - 4:00 PM to 6:00 PM',
        wednesday: 'Chemistry - 4:00 PM to 6:00 PM',
        thursday: 'Revision - 4:00 PM to 6:00 PM',
        friday: 'Test - 4:00 PM to 6:00 PM',
        saturday: 'Doubt Session - 10:00 AM to 12:00 PM'
    };
}

// Initialize admin dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 Admin Dashboard Loading...');
    
    if (!isAdminLoggedIn()) {
        window.location.href = 'index.html';
        return;
    }
    
    // Initialize default study schedules if not exists
    if (!localStorage.getItem('studySchedules')) {
        const defaultSchedules = {};
        const classes = ['9th', '10th', '11th Science', '11th Commerce', '12th Science', '12th Commerce'];
        const defaultSchedule = getDefaultSchedule();
        
        classes.forEach(className => {
            defaultSchedules[className] = { ...defaultSchedule };
        });
        
        saveStudySchedules(defaultSchedules);
    }
    
    // Initialize all data
    initializeData();
    setupEventListeners();
    
    console.log('✅ Admin Dashboard Ready');
});

// Check if admin is logged in
function isAdminLoggedIn() {
    return localStorage.getItem('adminLoggedIn') === 'true';
}

// Initialize data
function initializeData() {
    // Set today's date for forms
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('announcementDate').value = today;
    document.getElementById('attendanceDate').value = today;
    document.getElementById('testDate').value = today;
    document.getElementById('dateDate').value = today;
    
    // Update today's date display
    document.getElementById('todayDate').textContent = new Date().toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // Update current time
    updateCurrentTime();
    
    // Load all data
    loadStudents();
    loadAnnouncements();
    loadStudentLoginDropdown();
    updateStats();
}

// Update current time
function updateCurrentTime() {
    const now = new Date();
    document.getElementById('currentTime').textContent = now.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    setTimeout(updateCurrentTime, 60000); // Update every minute
}

// Set up event listeners
function setupEventListeners() {
    // Navigation
    adminNavLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetSection = this.getAttribute('data-section');
            showSection(targetSection);
            
            // Update active nav link
            adminNavLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Logout
    logoutBtn.addEventListener('click', function() {
        logoutAdmin();
    });
    
    // Student Login Button
    studentLoginBtn.addEventListener('click', function() {
        showSection('studentLogin');
        updateNavActiveState('studentLogin');
    });
    
    // Add Student Form (single submit handler handles create vs update)
    const addStudentForm = document.getElementById('addStudentForm');
    if (addStudentForm) {
        addStudentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const editId = addStudentForm.dataset.editId;
            if (editId) {
                const id = parseInt(editId, 10);
                if (!Number.isNaN(id)) {
                    updateStudentById(id);
                    return;
                }
            }
            addStudent();
        });
    }
    
    // Add Announcement Form
    const addAnnouncementForm = document.getElementById('addAnnouncementForm');
    if (addAnnouncementForm) {
        addAnnouncementForm.addEventListener('submit', function(e) {
            e.preventDefault();
            addAnnouncement();
        });
    }
    
    // Mark Attendance Form
    const markAttendanceForm = document.getElementById('markAttendanceForm');
    if (markAttendanceForm) {
        markAttendanceForm.addEventListener('submit', function(e) {
            e.preventDefault();
            submitAttendance();
        });
    }
    
    // Add Marks Form
    const addMarksForm = document.getElementById('addMarksForm');
    if (addMarksForm) {
        addMarksForm.addEventListener('submit', function(e) {
            e.preventDefault();
            submitMarks();
        });
    }
    
    // Add Important Date Form
    const addImportantDateForm = document.getElementById('addImportantDateForm');
    if (addImportantDateForm) {
        addImportantDateForm.addEventListener('submit', function(e) {
            e.preventDefault();
            addImportantDate();
        });
    }
    
    // Upload Material Form
    const uploadMaterialForm = document.getElementById('uploadMaterialForm');
    if (uploadMaterialForm) {
        uploadMaterialForm.addEventListener('submit', function(e) {
            e.preventDefault();
            uploadStudyMaterial();
        });
    }
    
    // Study Schedule Form
    const studyScheduleForm = document.getElementById('studyScheduleForm');
    if (studyScheduleForm) {
        studyScheduleForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveStudySchedule();
        });
    }
    
    // Admin Student Login Form
    const adminStudentLoginForm = document.getElementById('adminStudentLoginForm');
    if (adminStudentLoginForm) {
        adminStudentLoginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            prepareStudentLogin();
        });
    }
    
    // Class change for attendance
    const attendanceClass = document.getElementById('attendanceClass');
    if (attendanceClass) {
        attendanceClass.addEventListener('change', loadStudentsForAttendance);
    }
    
    // Class change for marks
    const testClass = document.getElementById('testClass');
    if (testClass) {
        testClass.addEventListener('change', loadStudentsForMarks);
    }
    
    // Class change for study schedule
    const scheduleClass = document.getElementById('scheduleClass');
    if (scheduleClass) {
        scheduleClass.addEventListener('change', loadStudySchedule);
    }
}

// Show specific section
function showSection(sectionId) {
    adminSections.forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Section-specific initializations
    switch(sectionId) {
        case 'students':
            console.log('👨‍🎓 Loading students...');
            loadStudents();
            updateStats();
            break;
            
        case 'announcements':
            console.log('📢 Loading announcements...');
            loadAnnouncements();
            updateStats();
            break;
            
        case 'attendance':
            console.log('📝 Loading attendance...');
            loadAttendanceRecords();
            break;
            
        case 'marks':
            console.log('📊 Loading marks...');
            loadAllTestResults();
            break;
            
        case 'importantDates':
            console.log('📅 Loading important dates...');
            loadImportantDates();
            updateImportantDatesStats();
            break;
            
        case 'materials':
            console.log('📚 Loading study materials...');
            loadStudyMaterials();
            updateMaterialsStats();
            break;
            
        case 'studySchedule':
            console.log('📅 Loading study schedules...');
            loadStudySchedulesTable();
            break;
            
        case 'studentLogin':
            console.log('🔐 Loading student login...');
            loadStudentLoginDropdown();
            break;
            
        default:
            console.log('🏠 Loading dashboard...');
            updateStats();
            break;
    }
}

// Update navigation active state
function updateNavActiveState(sectionId) {
    adminNavLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-section') === sectionId) {
            link.classList.add('active');
        }
    });
}

// Logout admin
function logoutAdmin() {
    localStorage.removeItem('adminLoggedIn');
    window.location.href = 'index.html';
}

// Update statistics
function updateStats() {
    const students = getStudents();
    const announcements = getAnnouncements();
    
    document.getElementById('totalStudents').textContent = students.length;
    document.getElementById('totalAnnouncements').textContent = announcements.length;
    
    // Calculate active logins (students who logged in today)
    const today = new Date().toDateString();
    const activeLogins = students.filter(student => 
        student.lastLogin && new Date(student.lastLogin).toDateString() === today
    ).length;
    
    document.getElementById('activeLogins').textContent = activeLogins;
}

// Generate automatic credentials
function generateCredentials() {
    const name = document.getElementById('studentName').value;
    if (!name) {
        alert('Please enter student name first');
        return;
    }
    
    // Generate username from name
    const baseUsername = name.toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[^a-z0-9]/g, '');
    const username = baseUsername + Math.floor(100 + Math.random() * 900);
    document.getElementById('studentUsername').value = username;
    
    // Generate password
    const password = generatePassword();
    document.getElementById('studentPassword').value = password;
}

// Generate random password
function generatePassword() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

// Add a new student
function addStudent() {
    // Prevent double submissions
    if (isSubmittingStudent) return;
    isSubmittingStudent = true;
    const form = document.getElementById('addStudentForm');
    const submitBtn = form ? form.querySelector('button[type="submit"]') : null;
    if (submitBtn) submitBtn.disabled = true;

    const name = document.getElementById('studentName').value.trim();
    const studentClass = document.getElementById('studentClass').value;
    const username = document.getElementById('studentUsername').value.trim();
    const password = document.getElementById('studentPassword').value;
    const phone = document.getElementById('studentPhone').value.trim();
    const email = document.getElementById('studentEmail').value.trim();
    const address = document.getElementById('studentAddress').value.trim();
    
    // Validation
    if (!name || !studentClass || !username || !password) {
        alert('Please fill in all required fields');
        return;
    }
    
    if (password.length < 6) {
        alert('Password must be at least 6 characters long');
        return;
    }
    
    if (phone && !/^\d{10}$/.test(phone)) {
        alert('Please enter a valid 10-digit phone number');
        return;
    }
    
    const students = getStudents();
    const studentIdCounter = getStudentIdCounter();
    
    // Check username availability
    if (students.some(student => student.username === username)) {
        alert('Username already exists. Please choose another one.');
        return;
    }
    
    // Create student object
    const newStudent = {
        id: studentIdCounter,
        name,
        class: studentClass,
        username,
        password,
        phone: phone || '',
        email: email || '',
        address: address || '',
        status: 'Active',
        createdAt: new Date().toISOString().split('T')[0],
        lastLogin: null,
        attendance: [],
        testResults: []
    };
    
    // Try to POST to server API first
    const apiUrl = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:3001/api/students' : '/api/students';
    fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: newStudent.name,
            class: newStudent.class,
            username: newStudent.username,
            password: newStudent.password,
            phone: newStudent.phone,
            email: newStudent.email,
            address: newStudent.address
        })
    }).then(async res => {
        if (!res.ok) throw new Error('Server error');
        const data = await res.json();
        // Use server-provided id if present
        if (data && data.id) newStudent.id = data.id;

        // Reload students from server for UI
        await loadStudentsFromServer();
        loadStudentLoginDropdown();
        updateStats();

        document.getElementById('addStudentForm').reset();
        showCredentialsModal(newStudent);
        // re-enable submit
        isSubmittingStudent = false;
        if (submitBtn) submitBtn.disabled = false;
    }).catch(err => {
        console.warn('Server unavailable, saving student locally:', err.message);
        // Local fallback: persist the new student and update UI
        try {
            // Push to local students array
            const localStudents = getStudents();
            localStudents.push(newStudent);
            saveStudents(localStudents);
            // Increment id counter
            setStudentIdCounter(Number(studentIdCounter) + 1);
            // Update UI
            loadStudents();
            loadStudentLoginDropdown();
            updateStats();
            document.getElementById('addStudentForm').reset();
            showCredentialsModal(newStudent);
        } catch (localErr) {
            console.error('Failed to save student locally:', localErr.message);
            alert('Server unavailable. Failed to create student locally.');
        }
        isSubmittingStudent = false;
        if (submitBtn) submitBtn.disabled = false;
    });
// Helper to reload students from server
async function loadStudentsFromServer() {
    const apiUrl = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:3001/api/students' : '/api/students';
    try {
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error('Server error');
        const students = await res.json();
        // Merge remote students with local cache to preserve attendance/testResults and local-only entries
        const local = getStudents();
        const localById = {};
        local.forEach(s => { if (s && s.id != null) localById[String(s.id)] = s; });

        const deletedIds = getDeletedStudentIds().map(String);
        const merged = [];
        students.forEach(r => {
            const key = String(r.id);
            if (deletedIds.includes(key)) return; // skip students that were deleted locally
            const l = localById[key];
            if (l) {
                // merge fields: prefer server for basic details but preserve local attendance/testResults and lastLogin
                const mergedStudent = { ...r };
                if (Array.isArray(l.attendance) && l.attendance.length) mergedStudent.attendance = l.attendance;
                if (Array.isArray(l.testResults) && l.testResults.length) mergedStudent.testResults = l.testResults;
                if (l.lastLogin) mergedStudent.lastLogin = l.lastLogin;
                merged.push(mergedStudent);
                delete localById[key];
            } else {
                merged.push(r);
            }
        });

        // Append any remaining local-only students (created offline)
        Object.keys(localById).forEach(k => merged.push(localById[k]));

        // Persist merged list
        saveStudents(merged);
        // Ensure studentIdCounter is ahead of existing ids
        const maxId = merged.reduce((m, s) => Math.max(m, Number(s.id) || 0), 1000);
        setStudentIdCounter(maxId + 1);
        loadStudents();
    } catch (err) {
        console.warn('Failed to reload students from server:', err.message);
    }
}
}

// Show credentials after creating student
function showCredentialsModal(student) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <h3>🎉 Student ID Created Successfully!</h3>
            <div class="credentials-card">
                <p><strong>Student ID:</strong> ${student.id}</p>
                <p><strong>Name:</strong> ${student.name}</p>
                <p><strong>Class:</strong> ${student.class}</p>
                <p><strong>Username:</strong> ${student.username}</p>
                <p><strong>Password:</strong> ${student.password}</p>
            </div>
            <div class="modal-actions">
                <button class="btn-primary" onclick="printCredentials()">🖨️ Print</button>
                <button class="btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Load students into the table
function loadStudents() {
    const studentTableBody = document.getElementById('studentTableBody');
    if (!studentTableBody) return;
    const students = getStudents();
    // Attempt to refresh from server when running on localhost
    const apiUrlBase = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:3001' : '';
    fetch(apiUrlBase + '/api/students').then(res => res.json()).then(remoteStudents => {
        if (Array.isArray(remoteStudents) && remoteStudents.length) {
            // Merge remote students with local cache to preserve attendance/testResults and local-only entries
            const local = getStudents();
            const localById = {};
            local.forEach(s => { if (s && s.id != null) localById[String(s.id)] = s; });

            const merged = [];
            const deletedIds = getDeletedStudentIds().map(String);
            remoteStudents.forEach(r => {
                if (deletedIds.includes(String(r.id))) return; // skip deleted ids
                const key = String(r.id);
                const l = localById[key];
                if (l) {
                    const mergedStudent = { ...r };
                    if (Array.isArray(l.attendance) && l.attendance.length) mergedStudent.attendance = l.attendance;
                    if (Array.isArray(l.testResults) && l.testResults.length) mergedStudent.testResults = l.testResults;
                    if (l.lastLogin) mergedStudent.lastLogin = l.lastLogin;
                    merged.push(mergedStudent);
                    delete localById[key];
                } else {
                    merged.push(r);
                }
            });
            Object.keys(localById).forEach(k => merged.push(localById[k]));
            saveStudents(merged);
            // Ensure id counter is ahead
            const maxId = merged.reduce((m, s) => Math.max(m, Number(s.id) || 0), 1000);
            setStudentIdCounter(maxId + 1);
            renderStudentsTable(merged);
        } else {
            renderStudentsTable(students);
        }
    }).catch(() => {
        // Server not available: render from localStorage
        renderStudentsTable(students);
    });
    
    
    // renderStudentsTable will be called by fetch or fallback above
}

function renderStudentsTable(students) {
    const studentTableBody = document.getElementById('studentTableBody');
    if (!studentTableBody) return;
    studentTableBody.innerHTML = '';
    if (!students || students.length === 0) {
        studentTableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 2rem;">
                    <p>No students found.</p>
                    <button class="btn-primary" onclick="showSection('students')">Add Your First Student</button>
                </td>
            </tr>
        `;
        return;
    }

    students.forEach((student, index) => {
        const row = document.createElement('tr');
        const presentCount = (student.attendance||[]).filter(a=>a.status==='Present').length;
        const absentCount = (student.attendance||[]).filter(a=>a.status==='Absent').length;
        const totalCount = (student.attendance||[]).length;
        row.innerHTML = `
            <td>${student.id}</td>
            <td>
                <strong>${student.name}</strong>
                ${student.lastLogin ? `<br><small>Last login: ${new Date(student.lastLogin).toLocaleDateString()}</small>` : ''}
            </td>
            <td>${student.class}</td>
            <td>${student.username}</td>
            <td>${student.phone || 'N/A'}</td>
            <td><span class="status-badge ${student.status ? student.status.toLowerCase() : ''}">${student.status || 'Active'}</span></td>
            <td>
                <button class="btn-small btn-view" onclick="viewStudentById(${student.id})" title="View Details">👁️</button>
                <button class="btn-small btn-edit" onclick="editStudentById(${student.id})" title="Edit">✏️</button>
                <button class="btn-small btn-reset" onclick="resetPasswordById(${student.id})" title="Reset Password">🔑</button>
                <button class="btn-small btn-delete" onclick="deleteStudentById(${student.id})" title="Delete">🗑️</button>
                <button class="btn-small" style="background: #27ae60; color: white;" onclick="quickLoginToStudentById(${student.id})" title="Login as Student">🔐</button>
            </td>
            <td class="attendance-summary">✅ ${presentCount} | ❌ ${absentCount} | 📅 ${totalCount}</td>
        `;
        studentTableBody.appendChild(row);
    });
}

// View student details
function viewStudent(index) {
    const students = getStudents();
    const student = students[index];
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <h3>👨‍🎓 Student Details</h3>
            <div class="student-details">
                <p><strong>Student ID:</strong> ${student.id}</p>
                <p><strong>Name:</strong> ${student.name}</p>
                <p><strong>Class:</strong> ${student.class}</p>
                <p><strong>Username:</strong> ${student.username}</p>
                <p><strong>Phone:</strong> ${student.phone || 'N/A'}</p>
                <p><strong>Email:</strong> ${student.email || 'N/A'}</p>
                <p><strong>Status:</strong> ${student.status}</p>
                <p><strong>Created On:</strong> ${student.createdAt}</p>
                ${student.lastLogin ? `<p><strong>Last Login:</strong> ${new Date(student.lastLogin).toLocaleString()}</p>` : ''}
                <p><strong>Attendance Records:</strong> Present: ${(student.attendance||[]).filter(a=>a.status==='Present').length}, Absent: ${(student.attendance||[]).filter(a=>a.status==='Absent').length}, Total: ${(student.attendance||[]).length}</p>
                <button class="btn-primary" onclick="window.open('student-dashboard.html?id='+${student.id},'_blank')">🔗 Open Student Dashboard</button>
            </div>
            <div class="modal-actions">
                <button class="btn-primary" onclick="quickLoginToStudent(${index})">🔐 Login as this Student</button>
                <button class="btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Edit student
// Edit student by id (prefers server)
function editStudentById(id) {
    const students = getStudents();
    const idx = students.findIndex(s => s.id === id);
    if (idx === -1) return alert('Student not found');
    const student = students[idx];
    
    // Populate form with student data
    document.getElementById('studentName').value = student.name;
    document.getElementById('studentClass').value = student.class;
    document.getElementById('studentUsername').value = student.username;
    document.getElementById('studentPassword').value = student.password;
    document.getElementById('studentPhone').value = student.phone;
    document.getElementById('studentEmail').value = student.email;
    document.getElementById('studentAddress').value = student.address;
    
    // Change form to edit mode
    const form = document.getElementById('addStudentForm');
    form.dataset.editId = id;
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.textContent = '✅ Update Student';
    submitBtn.onclick = null; // form submit handler will call updateStudentById when dataset.editId is present
    
    document.getElementById('addStudentForm').scrollIntoView({ behavior: 'smooth' });
}

// Update student
function updateStudent(index) {
    const students = getStudents();
    const student = students[index];
    
    const name = document.getElementById('studentName').value.trim();
    const studentClass = document.getElementById('studentClass').value;
    const username = document.getElementById('studentUsername').value.trim();
    const password = document.getElementById('studentPassword').value;
    const phone = document.getElementById('studentPhone').value.trim();
    const email = document.getElementById('studentEmail').value.trim();
    const address = document.getElementById('studentAddress').value.trim();
    
    // Validation
    if (!name || !studentClass || !username || !password) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Check username availability (excluding current student)
    const usernameTaken = students.some((s, i) => i !== index && s.username === username);
    if (usernameTaken) {
        alert('Username already exists. Please choose another one.');
        return;
    }
    
    // Update student
    students[index] = {
        ...student,
        name,
        class: studentClass,
        username,
        password,
        phone,
        email,
        address
    };
    
    saveStudents(students);
    
    // Reset form
    const form = document.getElementById('addStudentForm');
    form.reset();
    delete form.dataset.editIndex;
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.textContent = '✅ Create Student ID';
    submitBtn.onclick = null;
    delete form.dataset.editId; // ensure edit mode cleared
    
    loadStudents();
    loadStudentLoginDropdown();
    
    alert('Student updated successfully!');
    // If this student is currently logged in as `currentStudent`, sync the updated record so student tab refreshes
    try {
        const currentRaw = localStorage.getItem('currentStudent');
        if (currentRaw) {
            const current = JSON.parse(currentRaw);
            if (current && current.id === students[index].id) {
                localStorage.setItem('currentStudent', JSON.stringify(students[index]));
            }
        }
    } catch (err) {
        console.warn('Failed to sync currentStudent after updateStudent:', err.message);
    }
}

// Update student by id (API with fallback)
function updateStudentById(id) {
    const students = getStudents();
    const idx = students.findIndex(s => s.id === id);
    if (idx === -1) return alert('Student not found');

    const name = document.getElementById('studentName').value.trim();
    const studentClass = document.getElementById('studentClass').value;
    const username = document.getElementById('studentUsername').value.trim();
    const password = document.getElementById('studentPassword').value;
    const phone = document.getElementById('studentPhone').value.trim();
    const email = document.getElementById('studentEmail').value.trim();
    const address = document.getElementById('studentAddress').value.trim();

    if (!name || !studentClass || !username || !password) {
        alert('Please fill in all required fields');
        return;
    }

    const payload = { name, class: studentClass, username, password, phone, email, address, status: students[idx].status };
    const apiUrlBase = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:3001' : '';
    fetch(`${apiUrlBase}/api/students/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).then(async res => {
        if (!res.ok) throw new Error('Server error');
        const updated = await res.json();
        // Sync local copy
        const local = getStudents();
        const localIdx = local.findIndex(s => s.id === id);
        if (localIdx !== -1) local[localIdx] = { ...local[localIdx], ...updated };
        saveStudents(local);

        // Reset form
        const form = document.getElementById('addStudentForm');
        form.reset();
        delete form.dataset.editId;
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.textContent = '✅ Create Student ID';
        // Ensure no direct onclick handler remains; form submit handles action
        submitBtn.onclick = null;

        loadStudents();
        loadStudentLoginDropdown();
        alert('Student updated successfully!');
        // Sync currentStudent if this is the logged-in student
        try {
            const currentRaw = localStorage.getItem('currentStudent');
            if (currentRaw) {
                const current = JSON.parse(currentRaw);
                if (current && current.id === updated.id) {
                    localStorage.setItem('currentStudent', JSON.stringify(updated));
                }
            }
        } catch (err) {
            console.warn('Failed to sync currentStudent after updateStudentById:', err.message);
        }
    }).catch(err => {
        console.warn('Update failed, falling back to local update:', err.message);
        const local = getStudents();
        const localIdx = local.findIndex(s => s.id === id);
        if (localIdx === -1) return alert('Student not found locally');
        local[localIdx] = { ...local[localIdx], name, class: studentClass, username, password, phone, email, address };
        saveStudents(local);

        const form = document.getElementById('addStudentForm');
        form.reset();
        delete form.dataset.editId;
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.textContent = '✅ Create Student ID';
    submitBtn.onclick = null;

        loadStudents();
        loadStudentLoginDropdown();
        alert('Student updated locally');
        // Sync currentStudent after local fallback update
        try {
            const currentRaw = localStorage.getItem('currentStudent');
            if (currentRaw) {
                const current = JSON.parse(currentRaw);
                if (current && current.id === id) {
                    const updatedLocal = local.find(s => s.id === id);
                    if (updatedLocal) localStorage.setItem('currentStudent', JSON.stringify(updatedLocal));
                }
            }
        } catch (err) {
            console.warn('Failed to sync currentStudent after local update in updateStudentById:', err.message);
        }
    });
}

// Reset student password
function resetPassword(index) {
    const students = getStudents();
    const student = students[index];
    const newPassword = generatePassword();
    
    if (confirm(`Reset password for ${student.name}?\nNew password: ${newPassword}`)) {
        students[index].password = newPassword;
        saveStudents(students);
        alert(`Password reset successfully!\nNew password: ${newPassword}`);
        loadStudents();
        // Sync currentStudent if this student is logged in
        try {
            const currentRaw = localStorage.getItem('currentStudent');
            if (currentRaw) {
                const current = JSON.parse(currentRaw);
                if (current && current.id === student.id) {
                    // Update only the password field locally
                    current.password = newPassword;
                    localStorage.setItem('currentStudent', JSON.stringify(current));
                }
            }
        } catch (err) {
            console.warn('Failed to sync currentStudent after resetPassword:', err.message);
        }
    }
}

// Delete student
function deleteStudent(index) {
    const students = getStudents();
    const student = students[index];
    
    if (confirm(`Are you sure you want to delete ${student.name}?`)) {
        const removed = students.splice(index, 1);
        saveStudents(students);
        try { addDeletedStudentId(removed && removed[0] ? removed[0].id : student.id); } catch(e){}
        
        loadStudents();
        loadStudentLoginDropdown();
        updateStats();
        
        alert('Student deleted successfully');
        // If the deleted student was the one currently logged in, remove currentStudent so the student tab reacts
        try {
            const currentRaw = localStorage.getItem('currentStudent');
            if (currentRaw) {
                const current = JSON.parse(currentRaw);
                if (current && current.id === student.id) {
                    localStorage.removeItem('currentStudent');
                }
            }
        } catch (err) {
            console.warn('Failed to sync currentStudent after deleteStudent:', err.message);
        }
    }
}

// Delete student by id (API with fallback)
function deleteStudentById(id) {
    if (!confirm('Are you sure you want to delete this student?')) return;
    const apiUrlBase = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:3001' : '';
    fetch(`${apiUrlBase}/api/students/${id}`, { method: 'DELETE' }).then(async res => {
        if (!res.ok) throw new Error('Server error');
        // Remove locally as well
        const local = getStudents().filter(s => String(s.id) !== String(id));
        saveStudents(local);
        addDeletedStudentId(id);
        loadStudents();
        loadStudentLoginDropdown();
        updateStats();
        alert('Student deleted successfully');
        try {
            const currentRaw = localStorage.getItem('currentStudent');
            if (currentRaw) {
                const current = JSON.parse(currentRaw);
                if (current && current.id === id) {
                    localStorage.removeItem('currentStudent');
                }
            }
        } catch (err) {
            console.warn('Failed to sync currentStudent after deleteStudentById:', err.message);
        }
    }).catch(err => {
        console.warn('Delete failed, falling back to local delete:', err.message);
        const local = getStudents().filter(s => String(s.id) !== String(id));
        saveStudents(local);
        addDeletedStudentId(id);
        loadStudents();
        loadStudentLoginDropdown();
        updateStats();
        alert('Student deleted locally');
        try {
            const currentRaw = localStorage.getItem('currentStudent');
            if (currentRaw) {
                const current = JSON.parse(currentRaw);
                if (current && current.id === id) {
                    localStorage.removeItem('currentStudent');
                }
            }
        } catch (err) {
            console.warn('Failed to sync currentStudent after local delete in deleteStudentById:', err.message);
        }
    });
}

// Helper wrappers for UI buttons (map id back to student)
function deleteStudentByIdWrapper(id) { return deleteStudentById(id); }
function editStudentByIdWrapper(id) { return editStudentById(id); }
function viewStudentById(id) {
    const students = getStudents();
    const idx = students.findIndex(s => s.id === id);
    if (idx === -1) return alert('Student not found');
    viewStudent(idx);
}
function editStudentByIdWrapper(id) { return editStudentById(id); }
function resetPasswordById(id) {
    const students = getStudents();
    const idx = students.findIndex(s => s.id === id);
    if (idx === -1) return alert('Student not found');
    const newPassword = generatePassword();
    if (confirm(`Reset password for ${students[idx].name}?\nNew password: ${newPassword}`)) {
        // Try to update via API
        const apiUrlBase = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:3001' : '';
        fetch(`${apiUrlBase}/api/students/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...students[idx], password: newPassword })
        }).then(res => {
            if (!res.ok) throw new Error('Server error');
            const local = getStudents();
            const localIdx = local.findIndex(s => s.id === id);
            if (localIdx !== -1) local[localIdx].password = newPassword;
            saveStudents(local);
            loadStudents();
            alert(`Password reset successfully! New password: ${newPassword}`);
        }).catch(err => {
            console.warn('Reset via API failed, falling back to local reset:', err.message);
            const local = getStudents();
            const localIdx = local.findIndex(s => s.id === id);
            if (localIdx !== -1) local[localIdx].password = newPassword;
            saveStudents(local);
            loadStudents();
            alert(`Password reset locally. New password: ${newPassword}`);
        });
    }
}

function quickLoginToStudentById(id) {
    const students = getStudents();
    const idx = students.findIndex(s => s.id === id);
    if (idx === -1) return alert('Student not found');
    quickLoginToStudent(idx);
}

// Search students
function searchStudents() {
    const searchTerm = document.getElementById('searchStudent').value.toLowerCase();
    const studentTableBody = document.getElementById('studentTableBody');
    const students = getStudents();
    
    if (!studentTableBody) return;
    
    const filteredStudents = students.filter(student => 
        student.name.toLowerCase().includes(searchTerm) ||
        student.class.toLowerCase().includes(searchTerm) ||
        student.username.toLowerCase().includes(searchTerm) ||
        (student.phone && student.phone.includes(searchTerm)) ||
        student.id.toString().includes(searchTerm)
    );
    
    studentTableBody.innerHTML = '';
    
    if (filteredStudents.length === 0) {
        studentTableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 2rem;">No students found matching your search.</td>
            </tr>
        `;
        return;
    }
    
    filteredStudents.forEach((student, index) => {
        const originalIndex = students.findIndex(s => s.id === student.id);
        const row = document.createElement('tr');
        
        const presentCount = (student.attendance||[]).filter(a=>a.status==='Present').length;
        const absentCount = (student.attendance||[]).filter(a=>a.status==='Absent').length;
        const totalCount = (student.attendance||[]).length;

        row.innerHTML = `
            <td>${student.id}</td>
            <td><strong>${student.name}</strong></td>
            <td>${student.class}</td>
            <td>${student.username}</td>
            <td>${student.phone || 'N/A'}</td>
            <td><span class="status-badge ${student.status.toLowerCase()}">${student.status}</span></td>
            <td>
                <button class="btn-small btn-view" onclick="viewStudentById(${student.id})">👁️</button>
                <button class="btn-small btn-edit" onclick="editStudentById(${student.id})">✏️</button>
                <button class="btn-small btn-reset" onclick="resetPasswordById(${student.id})">🔑</button>
                <button class="btn-small btn-delete" onclick="deleteStudentById(${student.id})">🗑️</button>
                <button class="btn-small" style="background: #27ae60; color: white;" onclick="quickLoginToStudentById(${student.id})">🔐</button>
            </td>
            <td class="attendance-summary">✅ ${presentCount} | ❌ ${absentCount} | 📅 ${totalCount}</td>
        `;
        
        studentTableBody.appendChild(row);
    });
}

// Load student login dropdown
function loadStudentLoginDropdown() {
    const selectStudent = document.getElementById('selectStudent');
    if (!selectStudent) return;
    
    const students = getStudents();
    
    selectStudent.innerHTML = '<option value="">Select a student</option>';
    
    students.forEach((student) => {
        const option = document.createElement('option');
        option.value = student.id;
        option.textContent = `${student.name} (${student.class}) - ${student.username}`;
        selectStudent.appendChild(option);
    });
}

// Prepare student login
function prepareStudentLogin() {
    const studentId = document.getElementById('selectStudent').value;
    const reason = document.getElementById('loginReason').value;

    if (!studentId || !reason) {
        alert('Please select a student and reason for login');
        return;
    }

    // Look up student by id
    const students = getStudents();
    const studentIndex = students.findIndex(s => s.id.toString() === studentId.toString());
    if (studentIndex === -1) return alert('Student not found');
    const student = students[studentIndex];

    // Show quick login info
    const nameEl = document.getElementById('selectedStudentName');
    const userEl = document.getElementById('selectedStudentUsername');
    const passEl = document.getElementById('selectedStudentPassword');
    if (nameEl) nameEl.textContent = student.name || '-';
    if (userEl) userEl.textContent = student.username || '-';
    if (passEl) passEl.textContent = student.password || '-';
    const quickEl = document.getElementById('quickLoginInfo');
    if (quickEl) quickEl.style.display = 'block';

    // Store both index and id so proceedStudentLogin can work in all cases
    localStorage.setItem('adminStudentLogin', JSON.stringify({
        studentId: parseInt(studentId),
        studentIndex: studentIndex,
        reason: reason
    }));
}

// Quick login as student
function quickLoginAsStudent() {
    const loginData = JSON.parse(localStorage.getItem('adminStudentLogin'));
    if (!loginData) {
        alert('Please select a student first');
        return;
    }

    const students = getStudents();
    const student = students.find(s => s.id === loginData.studentId);
    if (!student) return alert('Student not found');

    // Show confirmation modal
    document.getElementById('modalStudentName').textContent = student.name;
    document.getElementById('modalStudentUsername').textContent = student.username;
    document.getElementById('modalStudentClass').textContent = student.class;
    document.getElementById('studentLoginModal').style.display = 'block';
}

// Quick login from student view
function quickLoginToStudent(index) {
    const students = getStudents();
    const student = students[index];
    
    // Store login data
    localStorage.setItem('adminStudentLogin', JSON.stringify({
        studentIndex: index,
        reason: 'quick_login'
    }));
    
    // Show confirmation modal
    document.getElementById('modalStudentName').textContent = student.name;
    document.getElementById('modalStudentUsername').textContent = student.username;
    document.getElementById('modalStudentClass').textContent = student.class;
    document.getElementById('studentLoginModal').style.display = 'block';
}

// Close student login modal
function closeStudentLoginModal() {
    document.getElementById('studentLoginModal').style.display = 'none';
}

// Proceed to student login
function proceedStudentLogin() {
    const raw = localStorage.getItem('adminStudentLogin');
    if (!raw) return alert('No student selected');
    let loginData;
    try {
        loginData = JSON.parse(raw);
    } catch (err) {
        return alert('Invalid login data');
    }

    const students = getStudents();
    let student = null;
    if (typeof loginData.studentIndex === 'number' && students[loginData.studentIndex]) {
        student = students[loginData.studentIndex];
    } else if (loginData.studentId) {
        student = students.find(s => s.id === parseInt(loginData.studentId));
    }

    if (!student) return alert('Student not found');

    // Update student's last login
    student.lastLogin = new Date().toISOString();
    saveStudents(students);

    // Set current student session and mark impersonation
    localStorage.setItem('currentStudent', JSON.stringify(student));
    localStorage.setItem('adminImpersonating', 'true');
    if (loginData.reason) localStorage.setItem('adminLoginReason', loginData.reason);

    console.log('🔐 Logging in as student:', student.name);
    window.location.href = 'student-dashboard.html';
}

// Announcement Management Functions
function loadAnnouncements() {
    const announcementTableBody = document.getElementById('announcementTableBody');
    if (!announcementTableBody) return;
    
    const localAnnouncements = getAnnouncements();
    announcementTableBody.innerHTML = '';
    const apiBase = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:3001' : '';
    // Try server first
    fetch(apiBase + '/api/announcements').then(res => res.json()).then(remote => {
        if (Array.isArray(remote) && remote.length) {
            // sync local cache
            saveAnnouncements(remote);
            renderAnnouncements(remote);
        } else {
            renderAnnouncements(localAnnouncements);
        }
    }).catch(() => {
        renderAnnouncements(localAnnouncements);
    });
    return;
    
    if (announcements.length === 0) {
        announcementTableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 2rem;">
                    <p>No announcements found.</p>
                    <button class="btn-primary" onclick="showSection('announcements')">Create First Announcement</button>
                </td>
            </tr>
        `;
        return;
    }
    
    announcements.forEach((announcement, index) => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${announcement.title}</strong></td>
            <td>${announcement.content.length > 50 ? announcement.content.substring(0, 50) + '...' : announcement.content}</td>
            <td>${announcement.date}</td>
            <td><span class="status-badge ${announcement.priority}">${announcement.priority}</span></td>
            <td>
                <button class="btn-small btn-delete" onclick="deleteAnnouncement(${index})">🗑️ Delete</button>
            </td>
        `;
        
        announcementTableBody.appendChild(row);
    });
}

function addAnnouncement() {
    const title = document.getElementById('announcementTitle').value.trim();
    const content = document.getElementById('announcementContent').value.trim();
    const date = document.getElementById('announcementDate').value;
    const priority = document.getElementById('announcementPriority').value;
    
    if (!title || !content || !date) {
        alert('Please fill in all required fields');
        return;
    }
    
    const announcements = getAnnouncements();
    const newAnnouncement = {
        title,
        content,
        date,
        priority,
        createdBy: 'Admin',
        createdAt: new Date().toISOString()
    };

    const apiBase = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:3001' : '';
    fetch(apiBase + '/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAnnouncement)
    }).then(async res => {
        if (!res.ok) throw new Error('Server error');
        const data = await res.json();
        newAnnouncement.id = data.id || Date.now();
        announcements.unshift(newAnnouncement);
        saveAnnouncements(announcements);
        loadAnnouncements();
        updateStats();
        document.getElementById('addAnnouncementForm').reset();
        document.getElementById('announcementDate').value = new Date().toISOString().split('T')[0];
        alert('Announcement added successfully!');
    }).catch(err => {
        console.warn('Announcement API failed, falling back to local:', err.message);
        newAnnouncement.id = Date.now();
        announcements.unshift(newAnnouncement);
        saveAnnouncements(announcements);
        loadAnnouncements();
        updateStats();
        document.getElementById('addAnnouncementForm').reset();
        document.getElementById('announcementDate').value = new Date().toISOString().split('T')[0];
        alert('Announcement added locally');
    });
}

function deleteAnnouncement(index) {
    const announcements = getAnnouncements();
    const announcement = announcements[index];
    if (!announcement) return;
    if (!confirm(`Are you sure you want to delete announcement: "${announcement.title}"?`)) return;

    const apiBase = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:3001' : '';
    if (announcement.id && typeof announcement.id === 'number') {
        fetch(`${apiBase}/api/announcements/${announcement.id}`, { method: 'DELETE' }).then(async res => {
            if (!res.ok) throw new Error('Server error');
            // remove locally
            const local = getAnnouncements().filter(a => a.id !== announcement.id);
            saveAnnouncements(local);
            loadAnnouncements();
            updateStats();
            alert('Announcement deleted successfully');
        }).catch(err => {
            console.warn('Announcement delete failed, falling back to local:', err.message);
            const local = getAnnouncements();
            local.splice(index, 1);
            saveAnnouncements(local);
            loadAnnouncements();
            updateStats();
            alert('Announcement deleted locally');
        });
    } else {
        // no server id - just local
        announcements.splice(index, 1);
        saveAnnouncements(announcements);
        loadAnnouncements();
        updateStats();
        alert('Announcement deleted locally');
    }
}

// helper to render announcements list (used by loadAnnouncements)
function renderAnnouncements(announcements) {
    const announcementTableBody = document.getElementById('announcementTableBody');
    if (!announcementTableBody) return;
    announcementTableBody.innerHTML = '';
    if (!announcements || announcements.length === 0) {
        announcementTableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 2rem;">
                    <p>No announcements found.</p>
                    <button class="btn-primary" onclick="showSection('announcements')">Create First Announcement</button>
                </td>
            </tr>
        `;
        return;
    }
    announcements.forEach((announcement, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${announcement.title}</strong></td>
            <td>${announcement.content.length > 50 ? announcement.content.substring(0, 50) + '...' : announcement.content}</td>
            <td>${announcement.date}</td>
            <td><span class="status-badge ${announcement.priority}">${announcement.priority}</span></td>
            <td>
                <button class="btn-small btn-delete" onclick="deleteAnnouncement(${index})">🗑️ Delete</button>
            </td>
        `;
        announcementTableBody.appendChild(row);
    });
}

// Search announcements
function searchAnnouncements() {
    const searchTerm = document.getElementById('searchAnnouncement').value.toLowerCase();
    const announcementTableBody = document.getElementById('announcementTableBody');
    const announcements = getAnnouncements();
    
    if (!announcementTableBody) return;
    
    const filteredAnnouncements = announcements.filter(announcement => 
        announcement.title.toLowerCase().includes(searchTerm) ||
        announcement.content.toLowerCase().includes(searchTerm)
    );
    
    announcementTableBody.innerHTML = '';
    
    if (filteredAnnouncements.length === 0) {
        announcementTableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 2rem;">No announcements found matching your search.</td>
            </tr>
        `;
        return;
    }
    
    filteredAnnouncements.forEach((announcement, index) => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${announcement.title}</strong></td>
            <td>${announcement.content.length > 50 ? announcement.content.substring(0, 50) + '...' : announcement.content}</td>
            <td>${announcement.date}</td>
            <td><span class="status-badge ${announcement.priority}">${announcement.priority}</span></td>
            <td>
                <button class="btn-small btn-delete" onclick="deleteAnnouncement(${announcements.indexOf(announcement)})">🗑️ Delete</button>
            </td>
        `;
        
        announcementTableBody.appendChild(row);
    });
}

// Attendance Management Functions
function loadStudentsForAttendance() {
    const selectedClass = document.getElementById('attendanceClass').value;
    const attendanceDate = document.getElementById('attendanceDate').value;
    
    if (!selectedClass || !attendanceDate) {
        document.getElementById('attendanceStudentsList').innerHTML = '<p>Please select class and date first.</p>';
        return;
    }
    
    const students = getStudents();
    const classStudents = students.filter(student => student.class === selectedClass && student.status === 'Active');
    
    if (classStudents.length === 0) {
        document.getElementById('attendanceStudentsList').innerHTML = '<p>No students found in this class.</p>';
        return;
    }
    
    let html = `
        <h4>📝 Mark Attendance for ${selectedClass} - ${attendanceDate}</h4>
        <div style="max-height: 400px; overflow-y: auto;">
    `;
    
    classStudents.forEach((student, index) => {
        // Check if attendance already marked for this date
        const existingAttendance = student.attendance ? 
            student.attendance.find(a => a.date === attendanceDate) : null;
        
        const isPresent = existingAttendance ? existingAttendance.status === 'Present' : true;
        
        html += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-bottom: 1px solid #eee; background: ${isPresent ? '#f8fff9' : '#fff8f8'};">
                <div style="flex: 1;">
                    <strong>${student.name}</strong>
                    <br>
                    <small>ID: ${student.id} | Roll No: ${index + 1}</small>
                </div>
                <div style="display: flex; gap: 1rem; align-items: center;">
                    <label style="display: flex; align-items: center; gap: 0.5rem;">
                        <input type="radio" name="attendance_${student.id}" value="Present" 
                               ${isPresent ? 'checked' : ''}>
                        <span style="color: #27ae60;">✅ Present</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 0.5rem;">
                        <input type="radio" name="attendance_${student.id}" value="Absent"
                               ${!isPresent ? 'checked' : ''}>
                        <span style="color: #e74c3c;">❌ Absent</span>
                    </label>
                    <input type="text" 
                           id="remarks_${student.id}" 
                           placeholder="Remarks (optional)"
                           value="${existingAttendance ? (existingAttendance.remarks || '') : ''}"
                           style="padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; width: 150px;">
                </div>
            </div>
        `;
    });
    
    html += `</div>`;
    document.getElementById('attendanceStudentsList').innerHTML = html;
}

// Export attendance CSV for a class or all
function exportAttendanceCSV(className) {
    try {
        const students = getStudents();
        const target = className || document.getElementById('attendanceFilterClass') && document.getElementById('attendanceFilterClass').value || 'all';
        const rows = [];
    rows.push(['rollNo','name','class','date','attendance','remarks']);

        const filtered = target === 'all' ? students : students.filter(s => s.class === target);
        filtered.forEach(s => {
            const attendance = Array.isArray(s.attendance) ? s.attendance : [];
            if (attendance.length === 0) {
                rows.push([s.id, s.name, s.class, '', 'No records', '']);
            } else {
                attendance.forEach(a => {
                    rows.push([s.id, s.name, s.class, a.date || '', a.status || '', a.remarks || '']);
                });
            }
        });

        const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g,'""') + '"').join(',')).join('\n');
        const filename = `attendance_${target}_${new Date().toISOString().slice(0,10)}.csv`;
        downloadCSV(filename, csv);
    } catch (err) {
        console.error('exportAttendanceCSV error', err.message);
        alert('Failed to export attendance CSV');
    }
}

// Export marks CSV for a class or all
function exportMarksCSV(className) {
    try {
        const students = getStudents();
        const target = className || document.getElementById('attendanceFilterClass') && document.getElementById('attendanceFilterClass').value || 'all';
        const rows = [];
        rows.push(['rollNo','name','class','testDate','subject','marks','maxMarks','remarks']);

        const filtered = target === 'all' ? students : students.filter(s => s.class === target);
        filtered.forEach(s => {
            const tests = Array.isArray(s.testResults) ? s.testResults : [];
            if (tests.length === 0) {
                rows.push([s.id, s.name, s.class, '', '', '', '', 'No tests']);
            } else {
                tests.forEach(t => {
                    rows.push([s.id, s.name, s.class, t.date || '', t.subject || '', t.marks != null ? t.marks : '', t.maxMarks != null ? t.maxMarks : '', t.remarks || '']);
                });
            }
        });

        const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g,'""') + '"').join(',')).join('\n');
        const filename = `marks_${target}_${new Date().toISOString().slice(0,10)}.csv`;
        downloadCSV(filename, csv);
    } catch (err) {
        console.error('exportMarksCSV error', err.message);
        alert('Failed to export marks CSV');
    }
}

// Utility to trigger CSV download
function downloadCSV(filename, csvContent) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function submitAttendance() {
    const selectedClass = document.getElementById('attendanceClass').value;
    const attendanceDate = document.getElementById('attendanceDate').value;
    
    if (!selectedClass || !attendanceDate) {
        alert('Please select class and date');
        return;
    }
    
    const students = getStudents();
    const classStudents = students.filter(student => student.class === selectedClass);
    let updatedCount = 0;
    
    classStudents.forEach(student => {
        const attendanceRadio = document.querySelector(`input[name="attendance_${student.id}"]:checked`);
        if (!attendanceRadio) return;
        
        const attendanceStatus = attendanceRadio.value;
        const remarks = document.getElementById(`remarks_${student.id}`).value.trim();
        
        // Initialize attendance array if not exists
        if (!student.attendance) {
            student.attendance = [];
        }
        
        // Remove existing attendance for this date
        student.attendance = student.attendance.filter(a => a.date !== attendanceDate);
        
        // Add new attendance record
        student.attendance.push({
            date: attendanceDate,
            status: attendanceStatus,
            remarks: remarks,
            markedBy: 'Admin',
            markedAt: new Date().toISOString(),
            subject: 'All'
        });
        
        updatedCount++;
    });
    // Persist updated attendance to localStorage so UI can reflect changes when server is absent
    try {
        saveStudents(students);
    } catch (err) {
        console.warn('Failed to save attendance locally:', err.message);
    }
    // If a student is logged in (currentStudent), update their stored record so student dashboard reflects changes
    try {
        const currentRaw = localStorage.getItem('currentStudent');
        if (currentRaw) {
            const current = JSON.parse(currentRaw);
            // find updated student by id
            const updated = students.find(s => s.id === current.id);
            if (updated) {
                localStorage.setItem('currentStudent', JSON.stringify(updated));
            }
        }
    } catch (err) {
        console.warn('Failed to sync currentStudent after attendance update:', err.message);
    }
    
    // Save attendance only to backend (no localStorage)
    // Optionally, you can POST each student's attendance to a new endpoint if you want per-student records

    // Post a summary record to server (class-level aggregate)
    const apiBase = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:3001' : '';
    const payload = { date: attendanceDate, class: selectedClass, present: 0, absent: 0, total: 0 };
    classStudents.forEach(student => {
        const attendanceRadio = document.querySelector(`input[name="attendance_${student.id}"]:checked`);
        if (!attendanceRadio) return;
        if (attendanceRadio.value === 'Present') payload.present++; else payload.absent++;
        payload.total++;
    });

    fetch(apiBase + '/api/attendance_records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).then(async res => {
        if (!res.ok) throw new Error('Server error');
        const data = await res.json();
        console.log('Attendance summary saved (id=' + (data.id || 'unknown') + ')');
    }).catch(err => {
        console.warn('Attendance API failed, saved locally only:', err.message);
    }).finally(() => {
        alert(`✅ Attendance marked successfully for ${updatedCount} students!`);
        loadStudentsForAttendance();
        loadAttendanceRecords();
        // update dashboard stats
        updateStats();
    });
}

function loadAttendanceRecords() {
    const selectedClass = document.getElementById('attendanceFilterClass').value;
    const selectedMonth = document.getElementById('attendanceFilterMonth').value;
    
    const students = getStudents();
    const recordsBody = document.getElementById('attendanceRecordsBody');
    recordsBody.innerHTML = '';
    
    // Get unique dates with attendance
    let allAttendance = [];
    students.forEach(student => {
        if (selectedClass && student.class !== selectedClass) return;
        if (student.attendance) {
            student.attendance.forEach(att => {
                allAttendance.push({
                    ...att,
                    studentClass: student.class,
                    studentName: student.name
                });
            });
        }
    });
    
    // Filter by month if selected
    if (selectedMonth) {
        allAttendance = allAttendance.filter(att => {
            const attDate = new Date(att.date);
            const attMonth = attDate.getFullYear() + '-' + String(attDate.getMonth() + 1).padStart(2, '0');
            return attMonth === selectedMonth;
        });
    }
    
    // Group by date and class
    const groupedAttendance = {};
    allAttendance.forEach(att => {
        const key = att.date + '_' + att.studentClass;
        if (!groupedAttendance[key]) {
            groupedAttendance[key] = {
                date: att.date,
                class: att.studentClass,
                present: 0,
                absent: 0,
                total: 0
            };
        }
        
        groupedAttendance[key].total++;
        if (att.status === 'Present') {
            groupedAttendance[key].present++;
        } else {
            groupedAttendance[key].absent++;
        }
    });
    
    const records = Object.values(groupedAttendance).sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (records.length === 0) {
        recordsBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 2rem;">
                    <p>No attendance records found.</p>
                    <small>${selectedClass ? `For ${selectedClass}` : ''} ${selectedMonth ? `in ${selectedMonth}` : ''}</small>
                </td>
            </tr>
        `;
        return;
    }
    
    records.forEach(record => {
        const percentage = record.total > 0 ? Math.round((record.present / record.total) * 100) : 0;
        const row = document.createElement('tr');
        
        // Collect names of present students for this date/class
        const presentNames = [];
        const studentsAll = getStudents();
        studentsAll.forEach(s => {
            if (!Array.isArray(s.attendance)) return;
            const a = s.attendance.find(x => x.date === record.date);
            if (a && a.status === 'Present' && String(s.class) === String(record.class)) presentNames.push(s.name);
        });

        row.innerHTML = `
            <td>${record.date}</td>
            <td>${record.class}</td>
            <td style="color: #27ae60;">${record.present}</td>
            <td style="color: #e74c3c;">${record.absent}</td>
            <td>${record.total}</td>
            <td>
                <span style="font-weight: bold; color: ${percentage >= 75 ? '#27ae60' : percentage >= 60 ? '#f39c12' : '#e74c3c'}">
                    ${percentage}%
                </span>
            </td>
            <td>${presentNames.join(', ') || '-'}</td>
        `;
        // Add an action to view student-level attendance for this date/class
        const actionCell = document.createElement('td');
        actionCell.innerHTML = `<button class="btn-small" onclick="viewAttendanceDetails('${record.date}','${record.class.replace(/'/g,"\\'") }')">View Students</button>`;
        row.appendChild(actionCell);
        
        recordsBody.appendChild(row);
    });

    // Ensure the table header has an Actions column (add if not present)
    const headerRow = document.querySelector('#attendanceRecordsBody').previousElementSibling.querySelector('tr');
    if (headerRow) {
        // Ensure Actions and Names columns
        const needed = ['Actions','Names'];
        needed.forEach(col => {
            if (![...headerRow.children].some(th => th.textContent.trim() === col)) {
                headerRow.insertAdjacentHTML('beforeend', `<th>${col}</th>`);
            }
        });
    }
}

// Show a modal with per-student attendance for a given date and class
function viewAttendanceDetails(date, className) {
    const students = getStudents();
    const classStudents = students.filter(s => s.class === className);

    let html = `
        <div class="modal-content">
            <span class="close" onclick="document.getElementById('attendanceDetailsModal').remove()">&times;</span>
            <h3>Attendance for ${className} on ${date}</h3>
            <div style="max-height: 400px; overflow-y: auto;">
                <table style="width:100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background:#f4f6f8;"><th>Roll</th><th>Name</th><th>Status</th><th>Remarks</th></tr>
                    </thead>
                    <tbody>
    `;

    classStudents.forEach((student, idx) => {
        const att = (student.attendance || []).find(a => a.date === date);
        const currentStatus = att ? att.status : '';
        const currentRemarks = att ? (att.remarks || '') : '';
        html += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 0.6rem;">${idx + 1}</td>
                <td style="padding: 0.6rem;">${student.name}<br><small>ID: ${student.id}</small></td>
                <td style="padding: 0.6rem;">
                    <label><input type="radio" name="att_status_${student.id}" value="Present" ${currentStatus === 'Present' ? 'checked' : ''}> Present</label>
                    <br>
                    <label><input type="radio" name="att_status_${student.id}" value="Absent" ${currentStatus === 'Absent' ? 'checked' : ''}> Absent</label>
                </td>
                <td style="padding: 0.6rem;">
                    <input type="text" id="att_remarks_${student.id}" value="${currentRemarks}" style="padding:0.4rem; width:100%; border:1px solid #ddd; border-radius:4px;">
                </td>
            </tr>
        `;
    });

    html += `</tbody></table></div>
        <div style="margin-top:1rem; text-align: right;">
            <button class="btn-primary" id="saveAttendanceDetailsBtn">💾 Save</button>
            <button class="btn-secondary" style="margin-left:0.5rem;" onclick="document.getElementById('attendanceDetailsModal').remove()">Close</button>
        </div>
    </div>`;

    const modal = document.createElement('div');
    modal.id = 'attendanceDetailsModal';
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = html;
    document.body.appendChild(modal);

    // Attach save handler
    document.getElementById('saveAttendanceDetailsBtn').addEventListener('click', function() {
        saveAttendanceDetails(date, className);
    });
}

// Save attendance details edited in modal
function saveAttendanceDetails(date, className) {
    try {
        const students = getStudents();
        const classStudents = students.filter(s => s.class === className);

        classStudents.forEach(student => {
            const statusEl = document.querySelector(`input[name="att_status_${student.id}"]:checked`);
            const remarksEl = document.getElementById(`att_remarks_${student.id}`);
            const status = statusEl ? statusEl.value : null;
            const remarks = remarksEl ? remarksEl.value.trim() : '';

            if (!status) return; // skip if not selected

            if (!student.attendance) student.attendance = [];
            // remove any existing for date
            student.attendance = student.attendance.filter(a => a.date !== date);
            student.attendance.push({ date: date, status: status, remarks: remarks, markedBy: 'Admin', markedAt: new Date().toISOString() });
        });

        // Persist changes
        saveStudents(students);

        // Sync currentStudent if affected
        try {
            const currentRaw = localStorage.getItem('currentStudent');
            if (currentRaw) {
                let current = JSON.parse(currentRaw);
                const updated = students.find(s => String(s.id) === String(current.id));
                if (updated) {
                    localStorage.setItem('currentStudent', JSON.stringify(updated));
                }
            }
        } catch (err) {
            console.warn('Failed to sync currentStudent after saveAttendanceDetails:', err.message);
        }

        // Refresh admin UI
        loadStudentsForAttendance();
        loadAttendanceRecords();
        updateStats();

        // Close modal
        const modal = document.getElementById('attendanceDetailsModal');
        if (modal) modal.remove();
        alert('✅ Attendance details saved successfully');
    } catch (err) {
        console.error('Error saving attendance details:', err.message);
        alert('Failed to save attendance details');
    }
}

// Marks Management Functions - FIXED VERSION
function loadStudentsForMarks() {
    const selectedClass = document.getElementById('testClass').value;
    
    if (!selectedClass) {
        document.getElementById('marksStudentsList').innerHTML = '<p>Please select class first.</p>';
        return;
    }
    
    const students = getStudents();
    const classStudents = students.filter(student => student.class === selectedClass && student.status === 'Active');
    
    if (classStudents.length === 0) {
        document.getElementById('marksStudentsList').innerHTML = '<p>No students found in this class.</p>';
        return;
    }
    
    const totalMarks = document.getElementById('testTotalMarks').value || 100;
    
    let html = `
        <h4>Enter Marks for ${selectedClass}</h4>
        <div style="max-height: 400px; overflow-y: auto;">
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="background: #34495e; color: white;">
                    <th style="padding: 0.8rem; text-align: left;">Student Name</th>
                    <th style="padding: 0.8rem; text-align: left;">Marks Obtained</th>
                    <th style="padding: 0.8rem; text-align: left;">Remarks</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    classStudents.forEach((student, index) => {
        html += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 0.8rem;">
                    <strong>${student.name}</strong>
                    <br>
                    <small>ID: ${student.id} | Roll No: ${index + 1}</small>
                </td>
                <td style="padding: 0.8rem;">
                    <input type="number" 
                           id="marks_${student.id}" 
                           placeholder="Enter marks"
                           min="0"
                           max="${totalMarks}"
                           style="padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; width: 120px;">
                    <small>/ <span id="totalMarksDisplay_${student.id}">${totalMarks}</span></small>
                </td>
                <td style="padding: 0.8rem;">
                    <input type="text" 
                           id="marksRemarks_${student.id}" 
                           placeholder="Remarks (optional)"
                           style="padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; width: 150px;">
                </td>
            </tr>
        `;
    });
    
    html += `</tbody></table></div>`;
    document.getElementById('marksStudentsList').innerHTML = html;
    
    // Update total marks display when total marks change
    document.getElementById('testTotalMarks').addEventListener('input', function() {
        const totalMarks = this.value;
        classStudents.forEach(student => {
            const display = document.getElementById(`totalMarksDisplay_${student.id}`);
            if (display) display.textContent = totalMarks;
            
            const marksInput = document.getElementById(`marks_${student.id}`);
            if (marksInput) marksInput.max = totalMarks;
        });
    });
}

function submitMarks() {
    const testName = document.getElementById('testName').value.trim();
    const testSubject = document.getElementById('testSubject').value;
    const testDate = document.getElementById('testDate').value;
    const testTotalMarks = parseInt(document.getElementById('testTotalMarks').value);
    const selectedClass = document.getElementById('testClass').value;
    
    if (!testName || !testSubject || !testDate || !testTotalMarks || !selectedClass) {
        alert('Please fill in all required fields');
        return;
    }
    
    const students = getStudents();
    const classStudents = students.filter(student => student.class === selectedClass);
    let updatedCount = 0;
    
    classStudents.forEach(student => {
        const marksInput = document.getElementById(`marks_${student.id}`);
        const remarksInput = document.getElementById(`marksRemarks_${student.id}`);
        
        if (!marksInput || marksInput.value === '') return;
        
        const marksObtained = parseInt(marksInput.value);
        const remarks = remarksInput ? remarksInput.value.trim() : '';
        
        // Validate marks
        if (marksObtained < 0 || marksObtained > testTotalMarks) {
            alert(`Invalid marks for ${student.name}. Marks should be between 0 and ${testTotalMarks}`);
            return;
        }
        
        // Initialize testResults array if not exists
        if (!student.testResults) {
            student.testResults = [];
        }
        
        // Remove existing test result with same name, subject and date
        student.testResults = student.testResults.filter(test => 
            !(test.testName === testName && test.subject === testSubject && test.date === testDate)
        );
        
        // Add test result
        student.testResults.push({
            testName: testName,
            subject: testSubject,
            date: testDate,
            marks: marksObtained,
            totalMarks: testTotalMarks,
            percentage: Math.round((marksObtained / testTotalMarks) * 100),
            remarks: remarks,
            addedBy: 'Admin',
            addedAt: new Date().toISOString()
        });
        
        updatedCount++;
    });
    
    if (updatedCount === 0) {
        alert('Please enter marks for at least one student');
        return;
    }
    

    // Save marks to backend for each student
    const apiBase = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:3001' : '';
    classStudents.forEach(student => {
        const testResult = student.testResults[student.testResults.length - 1];
        if (!testResult) return;
        fetch(apiBase + '/api/test_results', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                student_id: student.id,
                testName: testResult.testName,
                subject: testResult.subject,
                date: testResult.date,
                marks: testResult.marks,
                totalMarks: testResult.totalMarks,
                percentage: testResult.percentage,
                remarks: testResult.remarks,
                addedBy: testResult.addedBy
            })
        }).then(res => {
            if (!res.ok) console.warn('Failed to save marks for student', student.id);
        }).catch(err => {
            console.warn('Error saving marks for student', student.id, err.message);
        });
    });
    
    alert(`✅ Marks submitted successfully for ${updatedCount} students!`);
    
    // Reset form
    document.getElementById('addMarksForm').reset();
    document.getElementById('marksStudentsList').innerHTML = '';
    
    // Reload test results
    // Persist locally as well so admin and students see the new marks immediately
    try {
        saveStudents(students);
    } catch (err) {
        console.warn('Failed to save marks locally:', err.message);
    }
    // Sync currentStudent so the student view shows new marks immediately if that student is logged in
    try {
        const currentRaw = localStorage.getItem('currentStudent');
        if (currentRaw) {
            const current = JSON.parse(currentRaw);
            const updated = students.find(s => s.id === current.id);
            if (updated) {
                localStorage.setItem('currentStudent', JSON.stringify(updated));
            }
        }
    } catch (err) {
        console.warn('Failed to sync currentStudent after marks update:', err.message);
    }
    loadAllTestResults();
    updateStats();
}

function loadAllTestResults() {
    const selectedClass = document.getElementById('marksFilterClass').value;
    const selectedSubject = document.getElementById('marksFilterSubject').value;
    const selectedMonth = document.getElementById('marksFilterMonth').value;
    
    const students = getStudents();
    const resultsBody = document.getElementById('testResultsBody');
    if (!resultsBody) return;
    
    resultsBody.innerHTML = '';
    
    // Get all unique tests
    let allTests = {};
    
    students.forEach(student => {
        if (selectedClass && student.class !== selectedClass) return;
        if (!student.testResults) return;
        
        student.testResults.forEach(test => {
            if (selectedSubject && test.subject !== selectedSubject) return;
            if (selectedMonth) {
                const testDate = new Date(test.date);
                const testMonth = testDate.getFullYear() + '-' + String(testDate.getMonth() + 1).padStart(2, '0');
                if (testMonth !== selectedMonth) return;
            }
            
            const testKey = test.testName + '_' + test.subject + '_' + test.date + '_' + test.totalMarks;
            if (!allTests[testKey]) {
                allTests[testKey] = {
                    testName: test.testName,
                    subject: test.subject,
                    date: test.date,
                    totalMarks: test.totalMarks,
                    students: [],
                    class: student.class
                };
            }
            allTests[testKey].students.push({
                name: student.name,
                marks: test.marks,
                percentage: test.percentage
            });
        });
    });
    
    const tests = Object.values(allTests).sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (tests.length === 0) {
        resultsBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 2rem;">
                    <p>No test results found.</p>
                    <small>${selectedClass ? `For ${selectedClass}` : ''} ${selectedSubject ? `in ${selectedSubject}` : ''}</small>
                </td>
            </tr>
        `;
        return;
    }
    
    tests.forEach(test => {
        const totalStudents = test.students.length;
        const averagePercentage = totalStudents > 0 ? 
            Math.round(test.students.reduce((sum, s) => sum + s.percentage, 0) / totalStudents) : 0;
        
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td><strong>${test.testName}</strong></td>
            <td>${test.subject}</td>
            <td>${test.class}</td>
            <td>${test.date}</td>
            <td>${totalStudents}</td>
            <td>
                <span style="font-weight: bold; color: ${averagePercentage >= 75 ? '#27ae60' : averagePercentage >= 60 ? '#f39c12' : '#e74c3c'}">
                    ${averagePercentage}%
                </span>
            </td>
            <td>
                <button class="btn-small btn-view" onclick="viewTestDetails('${test.testName}', '${test.subject}', '${test.date}')">👁️ View</button>
                <button class="btn-small btn-delete" onclick="deleteTestResults('${test.testName}', '${test.subject}', '${test.date}')">🗑️ Delete</button>
            </td>
        `;
        
        resultsBody.appendChild(row);
    });
}

// Export attendance records (respecting filters) as CSV
function exportAttendanceCsv() {
    const selectedClass = document.getElementById('attendanceFilterClass').value;
    const selectedMonth = document.getElementById('attendanceFilterMonth').value;

    const students = getStudents();
    let allAttendance = [];
    students.forEach(student => {
        if (selectedClass && student.class !== selectedClass) return;
        if (student.attendance) {
            student.attendance.forEach(att => {
                allAttendance.push({
                    studentId: student.id,
                    studentName: student.name,
                    studentClass: student.class,
                    date: att.date,
                    status: att.status,
                    remarks: att.remarks || ''
                });
            });
        }
    });

    if (selectedMonth) {
        allAttendance = allAttendance.filter(att => {
            const attDate = new Date(att.date);
            const attMonth = attDate.getFullYear() + '-' + String(attDate.getMonth() + 1).padStart(2, '0');
            return attMonth === selectedMonth;
        });
    }

    if (allAttendance.length === 0) return alert('No attendance records found for selected filters');

    const rows = [['studentId','studentName','class','date','status','remarks']];
    allAttendance.forEach(a => rows.push([a.studentId, a.studentName, a.studentClass, a.date, a.status, a.remarks]));

    const csvContent = rows.map(r => r.map(cell => '"' + String(cell).replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${selectedClass || 'all'}_${selectedMonth || 'all'}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

// Export marks (respecting filters) as CSV
function exportMarksCsv() {
    const selectedClass = document.getElementById('marksFilterClass').value;
    const selectedSubject = document.getElementById('marksFilterSubject').value;
    const selectedMonth = document.getElementById('marksFilterMonth').value;

    const students = getStudents();
    const rows = [['testName','subject','date','class','studentName','marks','totalMarks','percentage','remarks']];

    students.forEach(student => {
        if (selectedClass && student.class !== selectedClass) return;
        if (!student.testResults) return;
        student.testResults.forEach(test => {
            if (selectedSubject && test.subject !== selectedSubject) return;
            if (selectedMonth) {
                const testDate = new Date(test.date);
                const testMonth = testDate.getFullYear() + '-' + String(testDate.getMonth() + 1).padStart(2, '0');
                if (testMonth !== selectedMonth) return;
            }
            rows.push([test.testName, test.subject, test.date, student.class, student.name, test.marks, test.totalMarks, test.percentage, test.remarks || '']);
        });
    });

    if (rows.length === 1) return alert('No marks found for selected filters');

    const csvContent = rows.map(r => r.map(cell => '"' + String(cell).replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marks_${selectedClass || 'all'}_${selectedSubject || 'all'}_${selectedMonth || 'all'}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

// Expose on window
// Preserve existing lowercase API but route to the new implementations if present
try {
    if (typeof exportAttendanceCSV === 'function') {
        window.exportAttendanceCSV = exportAttendanceCSV;
        window.exportAttendanceCsv = exportAttendanceCSV;
    } else if (typeof exportAttendanceCsv === 'function') {
        window.exportAttendanceCSV = exportAttendanceCsv;
        window.exportAttendanceCsv = exportAttendanceCsv;
    }

    if (typeof exportMarksCSV === 'function') {
        window.exportMarksCSV = exportMarksCSV;
        window.exportMarksCsv = exportMarksCSV;
    } else if (typeof exportMarksCsv === 'function') {
        window.exportMarksCSV = exportMarksCsv;
        window.exportMarksCsv = exportMarksCsv;
    }
} catch (err) {
    console.warn('Error setting export CSV aliases', err.message);
}

function viewTestDetails(testName, subject, date) {
    const students = getStudents();
    let testStudents = [];
    
    students.forEach(student => {
        if (student.testResults) {
            student.testResults.forEach(test => {
                if (test.testName === testName && test.subject === subject && test.date === date) {
                    testStudents.push({
                        ...student,
                        testData: test
                    });
                }
            });
        }
    });
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    
    let html = `
        <div class="modal-content" style="max-width: 800px;">
            <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <h3>📊 Test Details: ${testName}</h3>
            <p><strong>Subject:</strong> ${subject} | <strong>Date:</strong> ${date}</p>
            
            <div style="max-height: 500px; overflow-y: auto; margin-top: 1rem;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #34495e; color: white;">
                            <th style="padding: 0.8rem;">Student Name</th>
                            <th style="padding: 0.8rem;">Class</th>
                            <th style="padding: 0.8rem;">Marks</th>
                            <th style="padding: 0.8rem;">Percentage</th>
                            <th style="padding: 0.8rem;">Grade</th>
                            <th style="padding: 0.8rem;">Remarks</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    testStudents.forEach(student => {
        const percentage = student.testData.percentage;
        const grade = getGrade(percentage);
        
        html += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 0.8rem;">${student.name}</td>
                <td style="padding: 0.8rem;">${student.class}</td>
                <td style="padding: 0.8rem;">${student.testData.marks}/${student.testData.totalMarks}</td>
                <td style="padding: 0.8rem;">${percentage}%</td>
                <td style="padding: 0.8rem;">
                    <span class="status-badge ${grade.toLowerCase()}">${grade}</span>
                </td>
                <td style="padding: 0.8rem;">${student.testData.remarks || '-'}</td>
            </tr>
        `;
    });
    
    html += `</tbody></table></div></div>`;
    modal.innerHTML = html;
    document.body.appendChild(modal);
}

function deleteTestResults(testName, subject, date) {
    if (!confirm(`Are you sure you want to delete all results for "${testName}" - ${subject} on ${date}?`)) {
        return;
    }
    
    const students = getStudents();
    let deletedCount = 0;
    
    students.forEach(student => {
        if (student.testResults) {
            const initialLength = student.testResults.length;
            student.testResults = student.testResults.filter(test => 
                !(test.testName === testName && test.subject === subject && test.date === date)
            );
            deletedCount += (initialLength - student.testResults.length);
        }
    });
    
    saveStudents(students);
    loadAllTestResults();
    
    alert(`✅ Deleted ${deletedCount} test results!`);
}

function getGrade(percentage) {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    if (percentage >= 40) return 'E';
    return 'F';
}

// Important Dates Management Functions - FIXED VERSION
function addImportantDate() {
    const title = document.getElementById('dateTitle').value.trim();
    const date = document.getElementById('dateDate').value;
    const description = document.getElementById('dateDescription').value.trim();
    const type = document.getElementById('dateType').value;
    const priority = document.getElementById('datePriority').value;
    
    if (!title || !date || !description || !type) {
        alert('Please fill in all required fields');
        return;
    }
    
    let importantDates = JSON.parse(localStorage.getItem('importantDates')) || [];
    
    const newDate = {
        id: Date.now(),
        title: title,
        date: date,
        description: description,
        type: type,
        priority: priority,
        createdBy: 'Admin',
        createdAt: new Date().toISOString()
    };
    
    importantDates.push(newDate);
    localStorage.setItem('importantDates', JSON.stringify(importantDates));
    
    alert('✅ Important date added successfully!');
    
    // Reset form
    document.getElementById('addImportantDateForm').reset();
    document.getElementById('dateDate').value = new Date().toISOString().split('T')[0];
    
    // Reload important dates
    loadImportantDates();
    updateImportantDatesStats();
}

function loadImportantDates() {
    const datesBody = document.getElementById('importantDatesTableBody');
    if (!datesBody) return;
    
    const importantDates = JSON.parse(localStorage.getItem('importantDates')) || [];
    
    datesBody.innerHTML = '';
    
    if (importantDates.length === 0) {
        datesBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 2rem;">
                    <p>No important dates found.</p>
                    <button class="btn-primary" onclick="showSection('importantDates')">Add First Important Date</button>
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort by date (ascending)
    const sortedDates = [...importantDates].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    sortedDates.forEach((date, index) => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${date.date}</td>
            <td><strong>${date.title}</strong></td>
            <td>${date.description.length > 50 ? date.description.substring(0, 50) + '...' : date.description}</td>
            <td>
                <span class="status-badge ${date.type}">
                    ${getDateTypeIcon(date.type)} ${date.type}
                </span>
            </td>
            <td><span class="status-badge ${date.priority}">${date.priority}</span></td>
            <td>
                <button class="btn-small btn-delete" onclick="deleteImportantDate(${date.id})">🗑️ Delete</button>
            </td>
        `;
        
        datesBody.appendChild(row);
    });
}

function deleteImportantDate(dateId) {
    let importantDates = JSON.parse(localStorage.getItem('importantDates')) || [];
    const dateToDelete = importantDates.find(d => d.id === dateId);
    
    if (!dateToDelete) return;
    
    if (confirm(`Are you sure you want to delete important date: "${dateToDelete.title}"?`)) {
        importantDates = importantDates.filter(d => d.id !== dateId);
        localStorage.setItem('importantDates', JSON.stringify(importantDates));
        
        loadImportantDates();
        updateImportantDatesStats();
        
        alert('Important date deleted successfully!');
    }
}

function updateImportantDatesStats() {
    const importantDates = JSON.parse(localStorage.getItem('importantDates')) || [];
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Dates this month
    const datesThisMonth = importantDates.filter(date => {
        const dateObj = new Date(date.date);
        return dateObj.getMonth() === currentMonth && dateObj.getFullYear() === currentYear;
    }).length;
    
    // Count by type
    const testDatesCount = importantDates.filter(date => date.type === 'test').length;
    const meetingDatesCount = importantDates.filter(date => date.type === 'meeting').length;
    const holidayDatesCount = importantDates.filter(date => date.type === 'holiday').length;
    
    document.getElementById('datesThisMonth').textContent = datesThisMonth;
    document.getElementById('testDatesCount').textContent = testDatesCount;
    document.getElementById('meetingDatesCount').textContent = meetingDatesCount;
    document.getElementById('holidayDatesCount').textContent = holidayDatesCount;
}

function getDateTypeIcon(type) {
    const icons = {
        'test': '📝',
        'meeting': '👥',
        'holiday': '🎉',
        'deadline': '⏰',
        'event': '🎊',
        'other': '❓'
    };
    return icons[type] || '📅';
}

function searchImportantDates() {
    const searchTerm = document.getElementById('searchDates').value.toLowerCase();
    const datesBody = document.getElementById('importantDatesTableBody');
    const importantDates = JSON.parse(localStorage.getItem('importantDates')) || [];
    
    if (!datesBody) return;
    
    const filteredDates = importantDates.filter(date => 
        date.title.toLowerCase().includes(searchTerm) ||
        date.description.toLowerCase().includes(searchTerm) ||
        date.type.toLowerCase().includes(searchTerm)
    );
    
    datesBody.innerHTML = '';
    
    if (filteredDates.length === 0) {
        datesBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 2rem;">No important dates found matching your search.</td>
            </tr>
        `;
        return;
    }
    
    filteredDates.forEach((date, index) => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${date.date}</td>
            <td><strong>${date.title}</strong></td>
            <td>${date.description.length > 50 ? date.description.substring(0, 50) + '...' : date.description}</td>
            <td>
                <span class="status-badge ${date.type}">
                    ${getDateTypeIcon(date.type)} ${date.type}
                </span>
            </td>
            <td><span class="status-badge ${date.priority}">${date.priority}</span></td>
            <td>
                <button class="btn-small btn-delete" onclick="deleteImportantDate(${date.id})">🗑️ Delete</button>
            </td>
        `;
        
        datesBody.appendChild(row);
    });
}

// Study Materials Management
function uploadStudyMaterial() {
    const title = document.getElementById('materialTitle').value.trim();
    const subject = document.getElementById('materialSubject').value;
    const materialClass = document.getElementById('materialClass').value;
    const type = document.getElementById('materialType').value;
    const description = document.getElementById('materialDescription').value.trim();
    const link = document.getElementById('materialLink').value.trim();
    const fileInput = document.getElementById('materialFile');
    
    if (!title || !subject || !materialClass || !type) {
        alert('Please fill in all required fields');
        return;
    }
    
    const newMaterial = {
        title,
        subject,
        class: materialClass,
        type,
        description,
        link: link || null,
        fileName: fileInput.files[0] ? fileInput.files[0].name : null,
        fileSize: fileInput.files[0] ? (fileInput.files[0].size || 0) : null,
        uploadedBy: 'Admin',
        uploadDate: new Date().toISOString().split('T')[0],
        downloads: 0
    };

    const apiBase = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:3001' : '';
    fetch(apiBase + '/api/study_materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMaterial)
    }).then(async res => {
        if (!res.ok) throw new Error('Server error');
        const data = await res.json();
        newMaterial.id = data.id || Date.now();
        let materials = JSON.parse(localStorage.getItem('studyMaterials')) || [];
        materials.unshift(newMaterial);
        localStorage.setItem('studyMaterials', JSON.stringify(materials));
        alert('✅ Study material uploaded successfully!');
        document.getElementById('uploadMaterialForm').reset();
        loadStudyMaterials();
    }).catch(err => {
        console.warn('Study material API failed, saving locally:', err.message);
        newMaterial.id = Date.now();
        let materials = JSON.parse(localStorage.getItem('studyMaterials')) || [];
        materials.unshift(newMaterial);
        localStorage.setItem('studyMaterials', JSON.stringify(materials));
        alert('✅ Study material uploaded locally');
        document.getElementById('uploadMaterialForm').reset();
        loadStudyMaterials();
    });
}

function loadStudyMaterials() {
    const selectedClass = document.getElementById('materialsFilterClass').value;
    const selectedSubject = document.getElementById('materialsFilterSubject').value;
    const selectedType = document.getElementById('materialsFilterType').value;
    const materialsBody = document.getElementById('materialsTableBody');
    materialsBody.innerHTML = '';

    const apiBase = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:3001' : '';
    fetch(apiBase + '/api/study_materials').then(res => res.json()).then(remote => {
        const materials = Array.isArray(remote) && remote.length ? remote : (JSON.parse(localStorage.getItem('studyMaterials')) || []);
        if (!materials || materials.length === 0) {
            materialsBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 2rem;">
                        <p>No study materials found.</p>
                        <small>Upload your first study material using the form above</small>
                    </td>
                </tr>
            `;
            return;
        }

        // Filter and render
        const filteredMaterials = materials.filter(material => {
            if (selectedClass && selectedClass !== 'All' && material.class !== selectedClass) return false;
            if (selectedSubject && selectedSubject !== 'All' && material.subject !== selectedSubject) return false;
            if (selectedType && selectedType !== 'All' && material.type !== selectedType) return false;
            return true;
        });

        filteredMaterials.sort((a, b) => new Date(b.uploadDate || b.uploadedAt || 0) - new Date(a.uploadDate || a.uploadedAt || 0));
        filteredMaterials.forEach(material => {
            const row = document.createElement('tr');
            const uploadDate = new Date(material.uploadDate || material.uploadedAt).toLocaleDateString();

            row.innerHTML = `
                <td><strong>${material.title}</strong></td>
                <td>${material.subject}</td>
                <td>${material.class}</td>
                <td>
                    <span class="status-badge ${material.type.toLowerCase()}">
                        ${getMaterialIcon(material.type)} ${material.type}
                    </span>
                </td>
                <td>${uploadDate}</td>
                <td>
                    <button class="btn-small btn-view" onclick="viewMaterial(${material.id})">👁️ View</button>
                    <button class="btn-small" style="background: #27ae60; color: white;" onclick="downloadMaterial(${material.id})">📥 Download</button>
                    <button class="btn-small btn-delete" onclick="deleteMaterial(${material.id})">🗑️ Delete</button>
                </td>
            `;

            materialsBody.appendChild(row);
        });
    }).catch(() => {
        const materials = JSON.parse(localStorage.getItem('studyMaterials')) || [];
        if (!materials || materials.length === 0) {
            materialsBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 2rem;">
                        <p>No study materials found.</p>
                        <small>Upload your first study material using the form above</small>
                    </td>
                </tr>
            `;
            return;
        }
        // reuse rendering logic
        materials.sort((a, b) => new Date(b.uploadDate || b.uploadedAt || 0) - new Date(a.uploadDate || a.uploadedAt || 0));
        materials.forEach(material => {
            const row = document.createElement('tr');
            const uploadDate = new Date(material.uploadDate || material.uploadedAt).toLocaleDateString();

            row.innerHTML = `
                <td><strong>${material.title}</strong></td>
                <td>${material.subject}</td>
                <td>${material.class}</td>
                <td>
                    <span class="status-badge ${material.type.toLowerCase()}">
                        ${getMaterialIcon(material.type)} ${material.type}
                    </span>
                </td>
                <td>${uploadDate}</td>
                <td>
                    <button class="btn-small btn-view" onclick="viewMaterial(${material.id})">👁️ View</button>
                    <button class="btn-small" style="background: #27ae60; color: white;" onclick="downloadMaterial(${material.id})">📥 Download</button>
                    <button class="btn-small btn-delete" onclick="deleteMaterial(${material.id})">🗑️ Delete</button>
                </td>
            `;

            materialsBody.appendChild(row);
        });
    });
}

function getMaterialIcon(type) {
    const icons = {
        'Notes': '📖',
        'PDF': '📄',
        'Video': '🎥',
        'Assignment': '📝',
        'Practice Paper': '📝'
    };
    return icons[type] || '📄';
}

function viewMaterial(materialId) {
    const materials = JSON.parse(localStorage.getItem('studyMaterials')) || [];
    const material = materials.find(m => m.id === materialId);
    
    if (!material) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    
    let html = `
        <div class="modal-content" style="max-width: 600px;">
            <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <h3>${getMaterialIcon(material.type)} ${material.title}</h3>
            
            <div class="material-details">
                <p><strong>Subject:</strong> ${material.subject}</p>
                <p><strong>Class:</strong> ${material.class}</p>
                <p><strong>Type:</strong> ${material.type}</p>
                <p><strong>Uploaded On:</strong> ${new Date(material.uploadedAt).toLocaleString()}</p>
                <p><strong>Uploaded By:</strong> ${material.uploadedBy}</p>
                ${material.description ? `<p><strong>Description:</strong> ${material.description}</p>` : ''}
                ${material.fileName ? `<p><strong>File:</strong> ${material.fileName} (${material.fileSize})</p>` : ''}
                ${material.link ? `<p><strong>Link:</strong> <a href="${material.link}" target="_blank">${material.link}</a></p>` : ''}
                <p><strong>Downloads:</strong> ${material.downloads}</p>
            </div>
            
            <div class="modal-actions">
                <button class="btn-primary" onclick="downloadMaterial(${material.id}); this.parentElement.parentElement.parentElement.remove();">📥 Download</button>
                <button class="btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">Close</button>
            </div>
        </div>
    `;
    
    modal.innerHTML = html;
    document.body.appendChild(modal);
}

function downloadMaterial(materialId) {
    const materials = JSON.parse(localStorage.getItem('studyMaterials')) || [];
    const material = materials.find(m => m.id === materialId);
    
    if (!material) return;
    
    // Update download count
    material.downloads = (material.downloads || 0) + 1;
    localStorage.setItem('studyMaterials', JSON.stringify(materials));
    
    if (material.link) {
        // Open link in new tab
        window.open(material.link, '_blank');
    } else if (material.fileName) {
        // In real app, this would download the actual file
        alert(`📥 Downloading: ${material.title}\n\nIn a real application, this would download the file from the server.`);
    } else {
        alert('No file or link available for download.');
    }
    
    // Reload materials to update download count
    loadStudyMaterials();
}

function deleteMaterial(materialId) {
    if (!confirm('Are you sure you want to delete this study material?')) return;
    
    let materials = JSON.parse(localStorage.getItem('studyMaterials')) || [];
    materials = materials.filter(m => m.id !== materialId);
    localStorage.setItem('studyMaterials', JSON.stringify(materials));
    
    alert('Study material deleted successfully!');
    loadStudyMaterials();
}

function updateMaterialsStats() {
    const materials = JSON.parse(localStorage.getItem('studyMaterials')) || [];
    
    const notesCount = materials.filter(m => m.type === 'Notes').length;
    const pdfsCount = materials.filter(m => m.type === 'PDF').length;
    const videosCount = materials.filter(m => m.type === 'Video').length;
    const assignmentsCount = materials.filter(m => m.type === 'Assignment' || m.type === 'Practice Paper').length;
    
    // Update stats in study schedule section if needed
    const notesCountElement = document.getElementById('notesCount');
    const pdfsCountElement = document.getElementById('pdfsCount');
    const videosCountElement = document.getElementById('videosCount');
    const assignmentsCountElement = document.getElementById('assignmentsCount');
    
    if (notesCountElement) notesCountElement.textContent = notesCount;
    if (pdfsCountElement) pdfsCountElement.textContent = pdfsCount;
    if (videosCountElement) videosCountElement.textContent = videosCount;
    if (assignmentsCountElement) assignmentsCountElement.textContent = assignmentsCount;
}

// Study Schedule Management Functions
function loadStudySchedule() {
    const selectedClass = document.getElementById('scheduleClass').value;
    
    if (!selectedClass) {
        document.getElementById('scheduleDaysContainer').innerHTML = '<p>Please select a class first.</p>';
        return;
    }
    
    const schedules = getStudySchedules();
    const classSchedule = schedules[selectedClass] || getDefaultSchedule();
    
    let html = `
        <h4>Edit Schedule for ${selectedClass}</h4>
        <div style="display: grid; gap: 1rem;">
    `;
    
    const days = [
        { id: 'monday', name: 'Monday', emoji: '📅' },
        { id: 'tuesday', name: 'Tuesday', emoji: '📚' },
        { id: 'wednesday', name: 'Wednesday', emoji: '🧪' },
        { id: 'thursday', name: 'Thursday', emoji: '📖' },
        { id: 'friday', name: 'Friday', emoji: '📝' },
        { id: 'saturday', name: 'Saturday', emoji: '❓' }
    ];
    
    days.forEach(day => {
        html += `
            <div class="form-group">
                <label for="schedule_${day.id}">${day.emoji} ${day.name}:</label>
                <input type="text" 
                       id="schedule_${day.id}" 
                       value="${classSchedule[day.id] || ''}"
                       placeholder="e.g., Mathematics - 4:00 PM to 6:00 PM"
                       style="padding: 0.8rem; border: 2px solid #ddd; border-radius: 8px;">
            </div>
        `;
    });
    
    html += `</div>`;
    document.getElementById('scheduleDaysContainer').innerHTML = html;
}

function saveStudySchedule() {
    const selectedClass = document.getElementById('scheduleClass').value;
    
    if (!selectedClass) {
        alert('Please select a class first');
        return;
    }
    
    const schedules = getStudySchedules();
    const classSchedule = {};
    
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    
    days.forEach(day => {
        const input = document.getElementById(`schedule_${day}`);
        if (input && input.value.trim()) {
            classSchedule[day] = input.value.trim();
        }
    });
    
    // Validate that at least one day has schedule
    if (Object.keys(classSchedule).length === 0) {
        alert('Please enter schedule for at least one day');
        return;
    }
    
    schedules[selectedClass] = classSchedule;
    saveStudySchedules(schedules);
    
    alert(`✅ Study schedule saved successfully for ${selectedClass}!`);
    loadStudySchedulesTable();
}

function loadStudySchedulesTable() {
    const schedules = getStudySchedules();
    const scheduleBody = document.getElementById('studyScheduleTableBody');
    
    if (!scheduleBody) return;
    
    scheduleBody.innerHTML = '';
    
    if (Object.keys(schedules).length === 0) {
        scheduleBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 2rem;">
                    <p>No study schedules found.</p>
                    <button class="btn-primary" onclick="showSection('studySchedule')">Create First Schedule</button>
                </td>
            </tr>
        `;
        return;
    }
    
    Object.keys(schedules).forEach(className => {
        const schedule = schedules[className];
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td><strong>${className}</strong></td>
            <td>${schedule.monday || '-'}</td>
            <td>${schedule.tuesday || '-'}</td>
            <td>${schedule.wednesday || '-'}</td>
            <td>${schedule.thursday || '-'}</td>
            <td>${schedule.friday || '-'}</td>
            <td>${schedule.saturday || '-'}</td>
            <td>
                <button class="btn-small btn-edit" onclick="editStudySchedule('${className}')">✏️ Edit</button>
                <button class="btn-small btn-delete" onclick="deleteStudySchedule('${className}')">🗑️ Delete</button>
                <button class="btn-small" style="background: #27ae60; color: white;" onclick="applyScheduleToClass('${className}')">📋 Apply</button>
            </td>
        `;
        
        scheduleBody.appendChild(row);
    });
}

function editStudySchedule(className) {
    // Select the class in dropdown
    document.getElementById('scheduleClass').value = className;
    // Load the schedule
    loadStudySchedule();
    // Scroll to form
    document.getElementById('studyScheduleForm').scrollIntoView({ behavior: 'smooth' });
}

function deleteStudySchedule(className) {
    if (!confirm(`Are you sure you want to delete study schedule for ${className}?`)) {
        return;
    }
    
    const schedules = getStudySchedules();
    delete schedules[className];
    saveStudySchedules(schedules);
    
    loadStudySchedulesTable();
    alert(`✅ Study schedule deleted for ${className}!`);
}

function applyScheduleToClass(className) {
    const schedules = getStudySchedules();
    const sourceSchedule = schedules[className];
    
    if (!sourceSchedule) {
        alert('Source schedule not found!');
        return;
    }
    
    const targetClass = prompt(`Enter class name to apply ${className}'s schedule to:`);
    if (!targetClass) return;
    
    schedules[targetClass] = { ...sourceSchedule };
    saveStudySchedules(schedules);
    
    loadStudySchedulesTable();
    alert(`✅ Schedule applied from ${className} to ${targetClass}!`);
}

function applyScheduleToAllClasses() {
    const sourceClass = document.getElementById('scheduleClass').value;
    if (!sourceClass) {
        alert('Please select a source class first');
        return;
    }
    
    const schedules = getStudySchedules();
    const sourceSchedule = schedules[sourceClass];
    
    if (!sourceSchedule) {
        alert('Please save the schedule for the selected class first');
        return;
    }
    
    if (!confirm(`Apply schedule from ${sourceClass} to ALL classes?`)) {
        return;
    }
    
    const allClasses = ['9th', '10th', '11th Science', '11th Commerce', '12th Science', '12th Commerce'];
    
    allClasses.forEach(className => {
        schedules[className] = { ...sourceSchedule };
    });
    
    saveStudySchedules(schedules);
    loadStudySchedulesTable();
    
    alert(`✅ Schedule applied to all classes successfully!`);
}

function resetScheduleToDefault() {
    if (!confirm('Reset all schedules to default? This cannot be undone.')) {
        return;
    }
    
    const schedules = {};
    const allClasses = ['9th', '10th', '11th Science', '11th Commerce', '12th Science', '12th Commerce'];
    const defaultSchedule = getDefaultSchedule();
    
    allClasses.forEach(className => {
        schedules[className] = { ...defaultSchedule };
    });
    
    saveStudySchedules(schedules);
    loadStudySchedulesTable();
    loadStudySchedule();
    
    alert('✅ All schedules reset to default!');
}

function exportSchedules() {
    const schedules = getStudySchedules();
    const dataStr = JSON.stringify(schedules, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'study-schedules.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    alert('📤 Study schedules exported successfully!');
}

function searchStudySchedules() {
    const searchTerm = document.getElementById('searchSchedule').value.toLowerCase();
    const scheduleBody = document.getElementById('studyScheduleTableBody');
    const schedules = getStudySchedules();
    
    if (!scheduleBody) return;
    
    const filteredSchedules = Object.keys(schedules).filter(className => 
        className.toLowerCase().includes(searchTerm)
    );
    
    scheduleBody.innerHTML = '';
    
    if (filteredSchedules.length === 0) {
        scheduleBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 2rem;">No study schedules found matching your search.</td>
            </tr>
        `;
        return;
    }
    
    filteredSchedules.forEach(className => {
        const schedule = schedules[className];
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td><strong>${className}</strong></td>
            <td>${schedule.monday || '-'}</td>
            <td>${schedule.tuesday || '-'}</td>
            <td>${schedule.wednesday || '-'}</td>
            <td>${schedule.thursday || '-'}</td>
            <td>${schedule.friday || '-'}</td>
            <td>${schedule.saturday || '-'}</td>
            <td>
                <button class="btn-small btn-edit" onclick="editStudySchedule('${className}')">✏️ Edit</button>
                <button class="btn-small btn-delete" onclick="deleteStudySchedule('${className}')">🗑️ Delete</button>
                <button class="btn-small" style="background: #27ae60; color: white;" onclick="applyScheduleToClass('${className}')">📋 Apply</button>
            </td>
        `;
        
        scheduleBody.appendChild(row);
    });
}

// Print credentials
function printCredentials() {
    window.print();
}

// Make functions globally available
window.generateCredentials = generateCredentials;
window.loadStudentsForAttendance = loadStudentsForAttendance;
window.submitAttendance = submitAttendance;
window.loadAttendanceRecords = loadAttendanceRecords;
window.loadStudentsForMarks = loadStudentsForMarks;
window.submitMarks = submitMarks;
window.loadAllTestResults = loadAllTestResults;
window.viewTestDetails = viewTestDetails;
window.deleteTestResults = deleteTestResults;
window.addImportantDate = addImportantDate;
window.loadImportantDates = loadImportantDates;
window.deleteImportantDate = deleteImportantDate;
window.searchImportantDates = searchImportantDates;
window.uploadStudyMaterial = uploadStudyMaterial;
window.loadStudyMaterials = loadStudyMaterials;
window.viewMaterial = viewMaterial;
window.downloadMaterial = downloadMaterial;
window.deleteMaterial = deleteMaterial;
window.loadStudySchedule = loadStudySchedule;
window.saveStudySchedule = saveStudySchedule;
window.editStudySchedule = editStudySchedule;
window.deleteStudySchedule = deleteStudySchedule;
window.applyScheduleToClass = applyScheduleToClass;
window.applyScheduleToAllClasses = applyScheduleToAllClasses;
window.resetScheduleToDefault = resetScheduleToDefault;
window.exportSchedules = exportSchedules;
window.searchStudySchedules = searchStudySchedules;
window.searchStudents = searchStudents;
window.searchAnnouncements = searchAnnouncements;
window.viewStudent = viewStudent;
window.editStudent = editStudent;
window.resetPassword = resetPassword;
window.deleteStudent = deleteStudent;
window.quickLoginToStudent = quickLoginToStudent;
window.quickLoginAsStudent = quickLoginAsStudent;
window.closeStudentLoginModal = closeStudentLoginModal;
window.proceedStudentLogin = proceedStudentLogin;
window.printCredentials = printCredentials;