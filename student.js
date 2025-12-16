// Student Dashboard JavaScript - Complete Fixed Version

// DOM Elements
const studentSections = document.querySelectorAll('.dashboard-section');
const studentNavLinks = document.querySelectorAll('.dashboard-nav a');
const logoutBtn = document.getElementById('logoutBtn');

// Current student data
let currentStudent = null;

// Initialize student dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 Student Dashboard Loading...');
    
    // Check if student is logged in
    if (!isStudentLoggedIn()) {
        window.location.href = 'index.html';
        return;
    }
    
    // Load student data
    // Ensure currentStudent is synchronized with latest students list (in case admin changed records)
    try {
        syncCurrentFromStudents();
    } catch (err) {
        console.warn('Error during initial sync from students:', err.message);
    }
    loadStudentData();
    
    // Setup event listeners
    setupEventListeners();
    // Listen for storage changes so updates from admin tab reflect immediately
    window.addEventListener('storage', function(e) {
        try {
            // Handle explicit currentStudent updates
            if (e.key === 'currentStudent') {
                const newVal = e.newValue ? JSON.parse(e.newValue) : null;
                console.log('🔔 storage event for currentStudent received. newVal present?', !!newVal);

                // If the value was removed (e.g. admin ended impersonation), handle logout/redirect
                if (!newVal) {
                    console.log('ℹ️ currentStudent removed from storage (logged out or impersonation ended)');
                    currentStudent = null;
                    return;
                }

                if (!currentStudent || newVal.id === currentStudent.id) {
                    currentStudent = newVal;
                    console.log('✅ currentStudent updated from storage event for:', currentStudent.name || currentStudent.id);
                    loadStudentData();
                    const active = Array.from(studentSections).find(s => s.classList.contains('active'));
                    const activeId = active ? active.id : 'profile';
                    showSection(activeId);
                } else {
                    console.log('ℹ️ storage update for different student id, ignoring:', newVal.id);
                }
            }

            // Handle students list updates: admin might update the students array but not write currentStudent
            if (e.key === 'students') {
                const newStudents = e.newValue ? JSON.parse(e.newValue) : [];
                console.log('🔔 storage event for students received. count:', Array.isArray(newStudents) ? newStudents.length : 'N/A');

                if (!currentStudent) {
                    console.log('ℹ️ currentStudent is null; skipping students sync');
                    return;
                }

                // Find the updated student record
                const updated = Array.isArray(newStudents) ? newStudents.find(s => String(s.id) === String(currentStudent.id)) : null;
                if (updated) {
                    // Compare shallowly to decide if an update is required
                    const before = JSON.stringify(currentStudent);
                    const after = JSON.stringify(updated);
                    if (before !== after) {
                        currentStudent = updated;
                        try {
                            // Persist updated currentStudent so other tabs also receive a currentStudent storage event
                            localStorage.setItem('currentStudent', JSON.stringify(updated));
                        } catch (err) {
                            console.warn('Failed to persist updated currentStudent during students sync:', err.message);
                        }
                        console.log('✅ Synchronized currentStudent from students array. Refreshing UI.');
                        loadStudentData();
                        const active = Array.from(studentSections).find(s => s.classList.contains('active'));
                        const activeId = active ? active.id : 'profile';
                        showSection(activeId);
                    } else {
                        console.log('ℹ️ students array updated but currentStudent unchanged');
                    }
                } else {
                    console.log('ℹ️ students array updated but no matching student found for currentStudent id');
                }
            }
            // Handle study materials updates: refresh materials list and stats
            if (e.key === 'studyMaterials') {
                console.log('🔔 storage event for studyMaterials received');
                try {
                    loadStudyMaterials();
                    updateMaterialsStats();
                } catch (err) {
                    console.warn('Failed to refresh study materials after storage event:', err.message);
                }
            }
        } catch (err) {
            console.warn('Error processing storage event in student dashboard:', err.message);
        }
    });
    
    console.log('✅ Student Dashboard Ready');
});

// Try to synchronize currentStudent from the students array stored in localStorage
function syncCurrentFromStudents() {
    try {
        const rawStudent = localStorage.getItem('currentStudent');
        if (!rawStudent) return;
        const current = JSON.parse(rawStudent);
        if (!current || !current.id) return;

        const rawStudents = localStorage.getItem('students');
        if (!rawStudents) return;
        const students = JSON.parse(rawStudents) || [];
    const updated = students.find(s => String(s.id) === String(current.id));
        if (updated) {
            // If full objects differ, update local currentStudent
            if (JSON.stringify(updated) !== JSON.stringify(current)) {
                localStorage.setItem('currentStudent', JSON.stringify(updated));
                currentStudent = updated;
                console.log('🔁 Synchronized currentStudent from students array on load');
            } else {
                currentStudent = current;
            }
        }
    } catch (err) {
        console.warn('syncCurrentFromStudents error:', err.message);
    }
}

// Check if student is logged in
function isStudentLoggedIn() {
    const studentData = localStorage.getItem('currentStudent');
    if (!studentData) {
        alert('Please login first');
        return false;
    }
    
    try {
        currentStudent = JSON.parse(studentData);
        return true;
    } catch (error) {
        console.error('Error parsing student data:', error);
        alert('Error loading student data');
        return false;
    }
}

// Setup event listeners
function setupEventListeners() {
    // Navigation
    studentNavLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetSection = this.getAttribute('data-section');
            showSection(targetSection);
            
            // Update active nav link
            studentNavLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            logoutStudent();
        });
    }

    // Return to Admin when impersonating
    const returnBtn = document.getElementById('returnToAdminBtn');
    if (returnBtn) {
        returnBtn.addEventListener('click', function() {
            if (!confirm('Return to Admin dashboard? This will end the impersonation session.')) return;
            // Append a short audit entry
            try {
                const logRaw = localStorage.getItem('adminImpersonationLog') || '[]';
                const log = JSON.parse(logRaw);
                log.push({
                    action: 'end_impersonation',
                    time: new Date().toISOString(),
                    studentId: currentStudent ? currentStudent.id : null,
                    note: 'Returned to admin via UI'
                });
                localStorage.setItem('adminImpersonationLog', JSON.stringify(log));
            } catch (err) {
                console.warn('Failed to append impersonation log:', err.message);
            }

            // Clear impersonation flags but keep admin logged in
            localStorage.removeItem('adminImpersonating');
            localStorage.removeItem('adminLoginReason');
            // Remove currentStudent to avoid automatic student view on admin
            localStorage.removeItem('currentStudent');
            window.location.href = 'admin-dashboard.html';
        });
    }
    
    // Manual refresh button (helpful for testing)
    const refreshBtn = document.getElementById('studentRefreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            console.log('🔁 Manual refresh requested by student');
            try {
                const raw = localStorage.getItem('currentStudent');
                if (raw) {
                    currentStudent = JSON.parse(raw);
                }
            } catch (err) {
                console.warn('Failed to parse currentStudent during manual refresh:', err.message);
            }
        // Also attempt to sync from students array in case admin updated students but did not update currentStudent
        try { syncCurrentFromStudents(); } catch (err) { console.warn('Manual sync failed:', err.message); }
        loadStudentData();
            const active = Array.from(studentSections).find(s => s.classList.contains('active'));
            const activeId = active ? active.id : 'profile';
            showSection(activeId);
        });
    }
    // Load initial section
    showSection('profile');
}

// Show specific section - FIXED VERSION
function showSection(sectionId) {
    console.log('🔄 Switching to section:', sectionId);
    
    // Hide all sections
    studentSections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Show target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        
        // Load section-specific data
        switch(sectionId) {
            case 'profile':
                console.log('📊 Loading profile data...');
                loadProfileData();
                break;
            case 'attendance':
                console.log('📊 Loading attendance data...');
                loadAttendanceData();
                break;
            case 'results':
                console.log('📈 Loading test results...');
                loadTestResults();
                break;
            case 'announcements':
                console.log('📢 Loading announcements...');
                loadStudentAnnouncements();
                loadImportantDatesForStudent();
                break;
            case 'materials':
                console.log('📚 Loading study materials...');
                loadStudyMaterials();
                loadStudyScheduleForStudent();
                updateMaterialsStats();
                break;
        }
    } else {
        console.error('❌ Section not found:', sectionId);
        // Fallback to profile section
        document.getElementById('profile').classList.add('active');
    }
}

// Load student data
function loadStudentData() {
    if (!currentStudent) {
        console.error('❌ No student data available');
        return;
    }
    
    console.log('👤 Loading data for:', currentStudent.name);
    
    // Update welcome message
    const welcomeElement = document.getElementById('studentWelcome');
    const infoElement = document.getElementById('studentInfo');
    
    if (welcomeElement) welcomeElement.textContent = `Welcome, ${currentStudent.name}`;
    if (infoElement) infoElement.textContent = `${currentStudent.name} - ${currentStudent.class}`;
    
    // Check if admin is impersonating
    const adminNotice = document.getElementById('adminLoginNotice');
    const returnContainer = document.getElementById('returnToAdminContainer');
    if (adminNotice && localStorage.getItem('adminImpersonating') === 'true') {
        adminNotice.style.display = 'block';
        if (returnContainer) returnContainer.style.display = 'block';
    }
    
    // Update dashboard stats
    try {
        updateDashboardStats();
    } catch (err) {
        console.error('Failed to update dashboard stats during loadStudentData:', err.message);
    }
}

// Update dashboard statistics
function updateDashboardStats() {
    if (!currentStudent) {
        console.warn('updateDashboardStats called but currentStudent is null');
        return;
    }

    const attendance = Array.isArray(currentStudent.attendance) ? currentStudent.attendance : [];
    const testResults = Array.isArray(currentStudent.testResults) ? currentStudent.testResults : [];
    console.log('🔢 updateDashboardStats: attendance records:', attendance.length, 'testResults:', testResults.length);
    
    // Calculate attendance stats
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthAttendance = attendance.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
    });
    
    const totalDays = monthAttendance.length;
    const presentDays = monthAttendance.filter(record => record.status === 'Present').length;
    const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
    
    // Calculate test stats
    const totalTests = testResults.length;
    const totalMarks = testResults.reduce((sum, test) => sum + test.marks, 0);
    const totalPossibleMarks = testResults.reduce((sum, test) => sum + test.totalMarks, 0);
    const testAverage = totalPossibleMarks > 0 ? Math.round((totalMarks / totalPossibleMarks) * 100) : 0;
    
    // Update stats cards
    updateElementText('attendancePercentage', `${attendancePercentage}%`);
    updateElementText('totalClasses', presentDays);
    updateElementText('testAverage', `${testAverage}%`);
    updateElementText('daysPresent', presentDays);
}

// Helper function to safely update element text
function updateElementText(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) element.textContent = text;
}

// Load profile data
function loadProfileData() {
    if (!currentStudent) return;
    
    console.log('📝 Loading profile for:', currentStudent.name);
    
    // Update profile information
    updateElementText('profileName', currentStudent.name);
    updateElementText('profileClass', currentStudent.class);
    
    updateElementText('infoId', currentStudent.id);
    updateElementText('infoUsername', currentStudent.username);
    updateElementText('infoPhone', currentStudent.phone || 'Not provided');
    updateElementText('infoEmail', currentStudent.email || 'Not provided');
    updateElementText('infoClass', currentStudent.class);
    updateElementText('infoStatus', currentStudent.status);
    updateElementText('infoJoined', currentStudent.createdAt);
    updateElementText('infoLastLogin', currentStudent.lastLogin ? 
        new Date(currentStudent.lastLogin).toLocaleString() : 'Never');
    updateElementText('infoAddress', currentStudent.address || 'Not provided');
}

// Load attendance data for student - FIXED VERSION
function loadAttendanceData() {
    if (!currentStudent) {
        console.error('❌ No student data found');
        return;
    }
    
    console.log('📊 Loading attendance for student:', currentStudent.name);
    
    const attendance = currentStudent.attendance || [];
    
    // Calculate statistics
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    const monthAttendance = attendance.filter(record => {
        try {
            const recordDate = new Date(record.date);
            return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
        } catch (error) {
            console.error('Error parsing date:', record.date);
            return false;
        }
    });
    
    const totalDays = monthAttendance.length;
    const presentDays = monthAttendance.filter(record => record.status === 'Present').length;
    const absentDays = totalDays - presentDays;
    const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
    
    console.log('📈 Attendance stats:', { totalDays, presentDays, absentDays, attendancePercentage });
    
    // Update stats
    updateElementText('monthAttendance', `${attendancePercentage}%`);
    updateElementText('presentDays', presentDays);
    updateElementText('absentDays', absentDays);
    updateElementText('totalDays', totalDays);
    
    // Update attendance table
    const attendanceTableBody = document.getElementById('attendanceTableBody');
    if (attendanceTableBody) {
        attendanceTableBody.innerHTML = '';
        
        if (attendance.length === 0) {
            attendanceTableBody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 2rem;">
                        <p>No attendance records found.</p>
                        <small>Attendance will be updated by your teacher</small>
                    </td>
                </tr>
            `;
            return;
        }
        
        // Sort attendance by date (newest first)
        const sortedAttendance = [...attendance].sort((a, b) => {
            try {
                return new Date(b.date) - new Date(a.date);
            } catch (error) {
                return 0;
            }
        });
        
        sortedAttendance.forEach(record => {
            const row = document.createElement('tr');
            let dayName = 'Unknown';
            
            try {
                const recordDate = new Date(record.date);
                dayName = recordDate.toLocaleDateString('en-IN', { weekday: 'long' });
            } catch (error) {
                console.error('Error formatting date:', record.date);
            }
            
            row.innerHTML = `
                <td>${record.date}</td>
                <td>${dayName}</td>
                <td>
                    <span class="status-badge ${record.status.toLowerCase()}">
                        ${record.status}
                    </span>
                </td>
                <td>${record.remarks || '-'}</td>
            `;
            
            attendanceTableBody.appendChild(row);
        });
    }
    
    // Update attendance progress visualization
    updateAttendanceProgress(attendance);
}

// Export current student's attendance to CSV
function exportMyAttendanceCSV() {
    try {
        const currentRaw = localStorage.getItem('currentStudent');
        if (!currentRaw) return alert('No student logged in');
        const student = JSON.parse(currentRaw);
        const attendance = Array.isArray(student.attendance) ? student.attendance : [];
        const rows = [];
        rows.push(['rollNo','name','class','date','status','remarks']);
        if (attendance.length === 0) {
            rows.push([student.id, student.name, student.class, '', 'No records', '']);
        } else {
            attendance.forEach(a => rows.push([student.id, student.name, student.class, a.date||'', a.status||'', a.remarks||'']));
        }
        const csv = rows.map(r => r.map(c => '"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\n');
        const filename = `attendance_student_${student.id}_${new Date().toISOString().slice(0,10)}.csv`;
        downloadCSV_student(filename, csv);
    } catch (err) {
        console.error('exportMyAttendanceCSV', err.message);
        alert('Failed to export attendance');
    }
}

// Export current student's marks to CSV
function exportMyMarksCSV() {
    try {
        const currentRaw = localStorage.getItem('currentStudent');
        if (!currentRaw) return alert('No student logged in');
        const student = JSON.parse(currentRaw);
        const tests = Array.isArray(student.testResults) ? student.testResults : [];
        const rows = [];
        rows.push(['rollNo','name','class','testDate','subject','marks','maxMarks','remarks']);
        if (tests.length === 0) {
            rows.push([student.id, student.name, student.class, '', '', '', '', 'No tests']);
        } else {
            tests.forEach(t => rows.push([student.id, student.name, student.class, t.date||'', t.subject||'', t.marks!=null?t.marks:'', t.maxMarks!=null?t.maxMarks:'', t.remarks||'']));
        }
        const csv = rows.map(r => r.map(c => '"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\n');
        const filename = `marks_student_${student.id}_${new Date().toISOString().slice(0,10)}.csv`;
        downloadCSV_student(filename, csv);
    } catch (err) {
        console.error('exportMyMarksCSV', err.message);
        alert('Failed to export marks');
    }
}

function downloadCSV_student(filename, csvContent) {
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

// Update attendance progress visualization
function updateAttendanceProgress(attendance) {
    const progressContainer = document.getElementById('attendanceProgress');
    if (!progressContainer) return;
    
    if (attendance.length === 0) {
        progressContainer.innerHTML = '<p>No attendance data available for visualization.</p>';
        return;
    }
    
    // Group by month
    const monthlyData = {};
    attendance.forEach(record => {
        try {
            const date = new Date(record.date);
            const monthKey = date.getFullYear() + '-' + (date.getMonth() + 1).toString().padStart(2, '0');
            
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { present: 0, total: 0 };
            }
            
            monthlyData[monthKey].total++;
            if (record.status === 'Present') {
                monthlyData[monthKey].present++;
            }
        } catch (error) {
            console.error('Error processing attendance record:', record);
        }
    });
    
    let progressHTML = '';
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    Object.keys(monthlyData).sort().reverse().slice(0, 6).forEach(monthKey => {
        const data = monthlyData[monthKey];
        const percentage = data.total > 0 ? Math.round((data.present / data.total) * 100) : 0;
        const [year, month] = monthKey.split('-');
        const monthName = monthNames[parseInt(month) - 1];
        
        progressHTML += `
            <div style="margin-bottom: 1rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span>${monthName} ${year}</span>
                    <span style="font-weight: bold; color: ${percentage >= 75 ? '#27ae60' : percentage >= 60 ? '#f39c12' : '#e74c3c'}">
                        ${percentage}%
                    </span>
                </div>
                <div style="background: #e0e0e0; border-radius: 10px; height: 10px; overflow: hidden;">
                    <div style="background: ${percentage >= 75 ? '#27ae60' : percentage >= 60 ? '#f39c12' : '#e74c3c'}; 
                                height: 100%; width: ${percentage}%; border-radius: 10px; transition: width 0.5s ease;">
                    </div>
                </div>
                <small style="color: #666;">${data.present}/${data.total} days</small>
            </div>
        `;
    });
    
    progressContainer.innerHTML = progressHTML || '<p>No attendance data available for visualization.</p>';
}

// Load test results
function loadTestResults() {
    if (!currentStudent) return;
    
    const testResults = currentStudent.testResults || [];
    
    // Calculate statistics
    const totalTests = testResults.length;
    const totalMarks = testResults.reduce((sum, test) => sum + (test.marks || 0), 0);
    const totalPossibleMarks = testResults.reduce((sum, test) => sum + (test.totalMarks || 100), 0);
    const averageScore = totalPossibleMarks > 0 ? Math.round((totalMarks / totalPossibleMarks) * 100) : 0;
    
    let highestScore = 0;
    if (totalTests > 0) {
        highestScore = Math.max(...testResults.map(test => {
            const percentage = test.totalMarks > 0 ? Math.round((test.marks / test.totalMarks) * 100) : 0;
            return percentage;
        }));
    }
    
    // Update stats
    updateElementText('totalTests', totalTests);
    updateElementText('averageScore', `${averageScore}%`);
    updateElementText('highestScore', `${highestScore}%`);
    updateElementText('improvement', `+${Math.round(Math.random() * 15)}%`);
    
    // Update test results table
    const testResultsTableBody = document.getElementById('testResultsTableBody');
    if (testResultsTableBody) {
        testResultsTableBody.innerHTML = '';
        
        if (testResults.length === 0) {
            testResultsTableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 2rem;">
                        <p>No test results found.</p>
                        <small>Your test results will appear here after evaluation</small>
                    </td>
                </tr>
            `;
            return;
        }
        
        // Sort test results by date (newest first)
        const sortedResults = [...testResults].sort((a, b) => {
            try {
                return new Date(b.date) - new Date(a.date);
            } catch (error) {
                return 0;
            }
        });
        
        sortedResults.forEach(result => {
            const row = document.createElement('tr');
            const percentage = result.totalMarks > 0 ? Math.round((result.marks / result.totalMarks) * 100) : 0;
            const grade = getGrade(percentage);
            
            row.innerHTML = `
                <td>${result.testName || 'Unnamed Test'}</td>
                <td>${result.subject || 'General'}</td>
                <td>${result.date || 'Unknown Date'}</td>
                <td>${result.marks || 0}/${result.totalMarks || 100}</td>
                <td>${percentage}%</td>
                <td>
                    <span class="status-badge ${grade.toLowerCase()}">
                        ${grade}
                    </span>
                </td>
            `;
            
            testResultsTableBody.appendChild(row);
        });
    }
}

// Get grade based on percentage
function getGrade(percentage) {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    if (percentage >= 40) return 'E';
    return 'F';
}

// Load student announcements
function loadStudentAnnouncements() {
    const announcements = JSON.parse(localStorage.getItem('announcements')) || [];
    const announcementList = document.getElementById('studentAnnouncementList');
    
    if (!announcementList) return;
    
    announcementList.innerHTML = '';
    
    if (announcements.length === 0) {
        announcementList.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <p>No announcements available.</p>
                <small>Check back later for updates</small>
            </div>
        `;
        return;
    }
    
    // Sort announcements by date (newest first)
    const sortedAnnouncements = [...announcements].sort((a, b) => {
        try {
            return new Date(b.date) - new Date(a.date);
        } catch (error) {
            return 0;
        }
    });
    
    sortedAnnouncements.forEach(announcement => {
        const announcementItem = document.createElement('div');
        announcementItem.className = 'announcement-item';
        announcementItem.style.cssText = `
            background: white;
            padding: 1.5rem;
            margin-bottom: 1rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            border-left: 4px solid #3498db;
        `;
        
        const announcementTitle = document.createElement('h3');
        announcementTitle.textContent = announcement.title;
        announcementTitle.style.margin = '0 0 0.5rem 0';
        
        const announcementContent = document.createElement('p');
        announcementContent.textContent = announcement.content;
        announcementContent.style.margin = '0 0 0.5rem 0';
        announcementContent.style.color = '#555';
        
        const announcementDate = document.createElement('small');
        announcementDate.textContent = `Date: ${announcement.date}`;
        announcementDate.style.color = '#888';
        
        // Add priority badge if exists
        if (announcement.priority) {
            const priorityBadge = document.createElement('span');
            priorityBadge.className = `status-badge ${announcement.priority}`;
            priorityBadge.textContent = announcement.priority;
            priorityBadge.style.marginLeft = '1rem';
            announcementTitle.appendChild(priorityBadge);
        }
        
        announcementItem.appendChild(announcementTitle);
        announcementItem.appendChild(announcementContent);
        announcementItem.appendChild(announcementDate);
        
        announcementList.appendChild(announcementItem);
    });
}

// Load important dates for student - COMPLETE FIXED VERSION
function loadImportantDatesForStudent() {
    try {
        console.log('🔄 Loading important dates for student...');
        
        const dates = JSON.parse(localStorage.getItem('importantDates')) || [];
        const datesList = document.getElementById('importantDatesList');
        
        if (!datesList) {
            console.error('❌ Important dates list element not found');
            return;
        }
        
        console.log('📅 Found important dates:', dates.length);
        
        if (dates.length === 0) {
            datesList.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #666; background: #f8f9fa; border-radius: 8px;">
                    <p>📅 No important dates scheduled.</p>
                    <small>Your teacher will update important dates soon</small>
                </div>
            `;
            return;
        }
        
        // Sort dates chronologically
        const sortedDates = [...dates].sort((a, b) => new Date(a.date) - new Date(b.date));
        
        let datesHTML = '';
        let datesCount = 0;
        
        sortedDates.forEach(date => {
            try {
                const dateObj = new Date(date.date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                // Only show future dates or today's dates
                if (dateObj >= today) {
                    const day = dateObj.getDate();
                    const month = dateObj.toLocaleDateString('en', { month: 'short' }).toUpperCase();
                    const year = dateObj.getFullYear();
                    const fullDate = dateObj.toLocaleDateString('en-IN', { 
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                    
                    datesHTML += `
                        <div class="date-item" style="display: flex; align-items: flex-start; padding: 1rem; margin-bottom: 1rem; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-left: 4px solid ${getPriorityColor(date.priority)};">
                            <div class="date-badge" style="background: ${getPriorityColor(date.priority)}; color: white; padding: 0.8rem; border-radius: 8px; text-align: center; min-width: 60px; margin-right: 1rem;">
                                <div style="font-size: 1.2rem; font-weight: bold;">${day}</div>
                                <div style="font-size: 0.8rem;">${month}</div>
                                <div style="font-size: 0.7rem; opacity: 0.8;">${year}</div>
                            </div>
                            <div class="date-content" style="flex: 1;">
                                <strong style="display: block; margin-bottom: 0.5rem; font-size: 1.1rem;">${date.title}</strong>
                                <p style="margin: 0.5rem 0; color: #555;">${date.description}</p>
                                <div style="display: flex; gap: 1rem; margin-top: 0.5rem;">
                                    <span style="background: #e3f2fd; color: #1976d2; padding: 0.3rem 0.8rem; border-radius: 20px; font-size: 0.8rem;">
                                        ${getDateTypeIcon(date.type)} ${date.type}
                                    </span>
                                    <span style="background: ${getPriorityBackground(date.priority)}; color: ${getPriorityColor(date.priority)}; padding: 0.3rem 0.8rem; border-radius: 20px; font-size: 0.8rem;">
                                        ${getPriorityText(date.priority)}
                                    </span>
                                </div>
                                <small style="color: #888; display: block; margin-top: 0.5rem;">${fullDate}</small>
                            </div>
                        </div>
                    `;
                    datesCount++;
                }
            } catch (error) {
                console.error('Error processing date:', date, error);
            }
        });
        
        if (datesCount === 0) {
            datesList.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #666; background: #f8f9fa; border-radius: 8px;">
                    <p>🎉 No upcoming important dates!</p>
                    <small>All scheduled events are completed</small>
                </div>
            `;
        } else {
            datesList.innerHTML = datesHTML;
        }
        
        console.log(`✅ Loaded ${datesCount} important dates`);
        
    } catch (error) {
        console.error('❌ Error loading important dates:', error);
        const datesList = document.getElementById('importantDatesList');
        if (datesList) {
            datesList.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #e74c3c; background: #fdf2f2; border-radius: 8px;">
                    <p>⚠️ Error loading important dates</p>
                    <small>Please try refreshing the page</small>
                </div>
            `;
        }
    }
}

// Helper functions for important dates
function getPriorityColor(priority) {
    const colors = {
        'normal': '#27ae60',
        'important': '#f39c12', 
        'urgent': '#e74c3c'
    };
    return colors[priority] || '#27ae60';
}

function getPriorityBackground(priority) {
    const backgrounds = {
        'normal': '#e8f5e8',
        'important': '#fef9e7',
        'urgent': '#fdeaea'
    };
    return backgrounds[priority] || '#e8f5e8';
}

function getPriorityText(priority) {
    const texts = {
        'normal': '🟢 Normal',
        'important': '🟡 Important',
        'urgent': '🔴 Urgent'
    };
    return texts[priority] || '🟢 Normal';
}

function getDateTypeIcon(type) {
    const icons = {
        'test': '📝',
        'meeting': '👥',
        'holiday': '🎉',
        'deadline': '⏰',
        'event': '🎊',
        'other': '📅'
    };
    return icons[type] || '📅';
}

// Load study materials for student
function loadStudyMaterials() {
    if (!currentStudent) return;
    
    console.log('📚 Loading study materials...');
    
    const materials = JSON.parse(localStorage.getItem('studyMaterials')) || [];
    const studentClass = currentStudent.class;
    
    console.log('📦 Available materials:', materials.length);
    console.log('🏫 Student class:', studentClass);
    
    // Filter materials for student's class or all classes (use tolerant matching)
    const filteredMaterials = materials.filter(material => 
        matchesClass(material.class, studentClass)
    );
    
    console.log('🎯 Filtered materials:', filteredMaterials.length);
    
    // Update materials grid
    const materialsGrid = document.getElementById('materialsGrid');
    if (materialsGrid) {
        if (filteredMaterials.length === 0) {
            materialsGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
                    <p>No study materials available.</p>
                    <small>Your teacher will upload study materials soon</small>
                </div>
            `;
            return;
        }
        
        let materialsHTML = '';
        filteredMaterials.forEach(material => {
            materialsHTML += `
                <div class="material-card">
                    <div class="material-icon">${getMaterialIcon(material.type)}</div>
                    <h5>${material.title}</h5>
                    <p>${material.description || 'No description available'}</p>
                    <p><small><strong>Subject:</strong> ${material.subject} | <strong>Type:</strong> ${material.type}</small></p>
                    <button class="btn-primary" onclick="downloadStudentMaterial(${material.id})">📥 Download</button>
                </div>
            `;
        });
        
        materialsGrid.innerHTML = materialsHTML;
    }
}

// Normalize and match class names robustly (handles '9th' vs '9th Grade', spacing, case)
function normalizeClassName(s) {
    if (!s) return '';
    let x = s.toString().toLowerCase().trim();
    // remove the word 'grade' and common suffixes like 'th', 'st', 'nd', 'rd'
    x = x.replace(/grade/g, '');
    x = x.replace(/\s+/g, '');
    x = x.replace(/(st|nd|rd|th)$/g, '');
    return x;
}

function matchesClass(materialClass, studentClass) {
    if (!materialClass) return false;
    if (materialClass === 'All' || materialClass === 'all') return true;
    const a = normalizeClassName(materialClass);
    const b = normalizeClassName(studentClass);
    return a === b || a.includes(b) || b.includes(a);
}

// Update materials statistics - REAL COUNTS
function updateMaterialsStats() {
    if (!currentStudent) return;
    
    const materials = JSON.parse(localStorage.getItem('studyMaterials')) || [];
    const studentClass = currentStudent.class;
    
    // Filter materials for student's class or all classes
    const filteredMaterials = materials.filter(material => 
        material.class === 'All' || material.class === studentClass
    );
    
    // Count by type
    const notesCount = filteredMaterials.filter(m => m.type === 'Notes').length;
    const pdfsCount = filteredMaterials.filter(m => m.type === 'PDF').length;
    const videosCount = filteredMaterials.filter(m => m.type === 'Video').length;
    const assignmentsCount = filteredMaterials.filter(m => m.type === 'Assignment' || m.type === 'Practice Paper').length;
    
    console.log('📊 Materials stats:', {
        notes: notesCount,
        pdfs: pdfsCount,
        videos: videosCount,
        assignments: assignmentsCount
    });
    
    // Update stats cards
    updateElementText('notesCount', notesCount);
    updateElementText('pdfsCount', pdfsCount);
    updateElementText('videosCount', videosCount);
    updateElementText('assignmentsCount', assignmentsCount);
}

// Get material icon
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

// Download material for student
function downloadStudentMaterial(materialId) {
    const materials = JSON.parse(localStorage.getItem('studyMaterials')) || [];
    const material = materials.find(m => m.id === materialId);
    
    if (!material) {
        alert('Material not found!');
        return;
    }
    
    // Update download count
    material.downloads = (material.downloads || 0) + 1;
    localStorage.setItem('studyMaterials', JSON.stringify(materials));
    
    if (material.link) {
        // Open link in new tab
        window.open(material.link, '_blank');
        alert(`📚 Opening: ${material.title}`);
    } else if (material.fileName) {
        // In real app, this would download the actual file
        alert(`📥 Downloading: ${material.title}\n\nFile: ${material.fileName}\nSize: ${material.fileSize}\n\nIn a real application, this would download the file from the server.`);
    } else {
        alert('No file or link available for download.');
    }
    
    // Reload materials to update download count
    loadStudyMaterials();
    updateMaterialsStats();
}

// Load study schedule for student
function loadStudyScheduleForStudent() {
    if (!currentStudent) return;
    
    const schedules = JSON.parse(localStorage.getItem('studySchedules')) || {};
    const classSchedule = schedules[currentStudent.class];
    const container = document.getElementById('studyScheduleContainer');
    
    if (!container) {
        console.error('❌ Study schedule container not found');
        return;
    }
    
    console.log('📅 Loading study schedule for:', currentStudent.class);
    
    if (!classSchedule) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #666;">
                <p>No study schedule available for your class.</p>
                <small>Schedule will be updated soon</small>
            </div>
        `;
        return;
    }
    
    const days = [
        { id: 'monday', name: 'Monday', emoji: '📅' },
        { id: 'tuesday', name: 'Tuesday', emoji: '📚' },
        { id: 'wednesday', name: 'Wednesday', emoji: '🧪' },
        { id: 'thursday', name: 'Thursday', emoji: '📖' },
        { id: 'friday', name: 'Friday', emoji: '📝' },
        { id: 'saturday', name: 'Saturday', emoji: '❓' }
    ];
    
    let scheduleHTML = '';
    
    days.forEach(day => {
        if (classSchedule[day.id]) {
            scheduleHTML += `
                <div class="schedule-day">
                    <h5>${day.emoji} ${day.name}</h5>
                    <p>${classSchedule[day.id]}</p>
                </div>
            `;
        }
    });
    
    if (scheduleHTML === '') {
        scheduleHTML = `
            <div style="text-align: center; padding: 2rem; color: #666;">
                <p>No study schedule set for your class.</p>
                <small>Check back later for updates</small>
            </div>
        `;
    }
    
    container.innerHTML = scheduleHTML;
}

// Logout student
function logoutStudent() {
    if (confirm('Are you sure you want to logout?')) {
        // Check if admin was impersonating
        if (localStorage.getItem('adminImpersonating') === 'true') {
            localStorage.removeItem('adminImpersonating');
            localStorage.removeItem('adminLoginReason');
            window.location.href = 'admin-dashboard.html';
        } else {
            localStorage.removeItem('currentStudent');
            window.location.href = 'index.html';
        }
    }
}

// Make functions globally available
window.downloadStudentMaterial = downloadStudentMaterial;

// Error handling for missing elements
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
});