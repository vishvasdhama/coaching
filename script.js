// Main JavaScript for SS Classes Website

// DOM Elements
const loginBtn = document.getElementById('loginBtn');
const loginModal = document.getElementById('loginModal');
const closeModal = document.querySelector('.close');
const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');
const announcementList = document.getElementById('announcementList');

// Initialize website
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 SS Classes Website Loading...');
    loadAnnouncements();
    initializeDefaultData();
    console.log('✅ Website Ready');
});

// Initialize default data
function initializeDefaultData() {
    // Initialize students array if not exists
    if (!localStorage.getItem('students')) {
        localStorage.setItem('students', JSON.stringify([]));
    }
    
    // Initialize announcements if not exists
    if (!localStorage.getItem('announcements')) {
        const defaultAnnouncements = [
            {
                title: "New Batch Starting Soon",
                content: "A new batch for Class 12 Science will start from next Monday. Interested students can register at the office.",
                date: new Date().toISOString().split('T')[0]
            },
            {
                title: "Sunday Test Schedule",
                content: "Sunday tests for all classes will be conducted as per the regular schedule. Please bring your own stationery.",
                date: "2023-10-12"
            },
            {
                title: "Parent-Teacher Meeting",
                content: "A parent-teacher meeting is scheduled for this Saturday. All parents are requested to attend.",
                date: "2023-10-10"
            }
        ];
        localStorage.setItem('announcements', JSON.stringify(defaultAnnouncements));
    }
    
    // Initialize student ID counter
    if (!localStorage.getItem('studentIdCounter')) {
        localStorage.setItem('studentIdCounter', '1001');
    }
}

// Open login modal
loginBtn.addEventListener('click', function() {
    console.log('🔄 Opening login modal...');
    loginModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
});

// Close login modal
closeModal.addEventListener('click', function() {
    console.log('🔄 Closing login modal...');
    loginModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    resetLoginForm();
});

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    if (event.target === loginModal) {
        console.log('🔄 Closing modal (outside click)...');
        loginModal.style.display = 'none';
        document.body.style.overflow = 'auto';
        resetLoginForm();
    }
});

// Login form submission
loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    console.log('🔄 Login form submitted...');
    
    const userType = document.getElementById('userType').value;
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    console.log('📝 Login attempt:', { userType, username });
    
    // Simple validation
    if (!userType || !username || !password) {
        showLoginMessage('Please fill in all fields', 'error');
        return;
    }
    
    if (userType === 'admin') {
        // Try backend admin login first
        const apiUrl = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:3001/api/admin/login' : '/api/admin/login';
        fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        }).then(async res => {
            if (!res.ok) {
                // If server responded but credentials invalid
                if (res.status === 401) throw new Error('Invalid admin credentials');
                throw new Error('Server error');
            }
            const data = await res.json();
            console.log('✅ Admin login (server) successful', data);
            showLoginMessage('Admin login successful! Redirecting...', 'success');
            localStorage.setItem('adminLoggedIn', 'true');
            setTimeout(() => window.location.href = 'admin-dashboard.html', 800);
        }).catch(err => {
            console.warn('Backend admin login failed, falling back to local check:', err.message);
            showLoginMessage('Invalid admin credentials', 'error');
            // Fallback local check (compatible with seed)
            // if (username === 'admin' && (password === 'admin123' || password === 'admin')) {
            //     console.log('✅ Admin login (local) successful');
            //     showLoginMessage('Admin login successful! Redirecting...', 'success');
            //     localStorage.setItem('adminLoggedIn', 'true');
            //     setTimeout(() => window.location.href = 'admin-dashboard.html', 800);
            // } else {
            //     console.log('❌ Admin login failed');
            //     showLoginMessage('Invalid admin credentials', 'error');
            // }
        });
    } else if (userType === 'student') {
        // Try server-side login first
        const apiUrl = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:3001/api/students/login' : '/api/students/login';
        fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        }).then(async res => {
            if (!res.ok) {
                if (res.status === 401) throw new Error('Invalid student credentials');
                throw new Error('Server error');
            }
            const data = await res.json();
            console.log('✅ Student login (server) successful', data);
            showLoginMessage(`Welcome back, ${data.name}!`, 'success');
            // Try to store a full student object in localStorage.currentStudent so student dashboard
            // has immediate access to attendance and testResults. Prefer local cache if available.
            try {
                const students = JSON.parse(localStorage.getItem('students')) || [];
                let studentObj = students.find(s => s.id === data.id || s.username === data.username);
                if (studentObj) {
                    // update lastLogin and persist
                    studentObj.lastLogin = new Date().toISOString();
                    localStorage.setItem('students', JSON.stringify(students));
                    localStorage.setItem('currentStudent', JSON.stringify(studentObj));
                } else {
                    // fallback to server-provided minimal info
                    localStorage.setItem('currentStudent', JSON.stringify({ id: data.id, username: data.username }));
                }
            } catch (err) {
                console.warn('Failed to set full currentStudent from local cache:', err.message);
                localStorage.setItem('currentStudent', JSON.stringify({ id: data.id, username: data.username }));
            }
            setTimeout(() => window.location.href = 'student-dashboard.html', 800);
        }).catch(err => {
            console.warn('Backend student login failed, falling back to localStorage:', err.message);
            // Fallback to old localStorage behavior
            const students = JSON.parse(localStorage.getItem('students')) || [];
            const student = students.find(s => s.username === username && s.password === password);
            if (student) {
                console.log('✅ Student login (local) successful:', student.name);
                showLoginMessage(`Welcome back, ${student.name}!`, 'success');
                student.lastLogin = new Date().toISOString();
                localStorage.setItem('students', JSON.stringify(students));
                localStorage.setItem('currentStudent', JSON.stringify(student));
                setTimeout(() => window.location.href = 'student-dashboard.html', 800);
            } else {
                console.log('❌ Student login failed');
                showLoginMessage('Invalid student credentials. Please check username and password.', 'error');
            }
        });
    }
});

// Function to load announcements
function loadAnnouncements() {
    console.log('🔄 Loading announcements...');
    
    // Get announcements from localStorage
    const announcements = JSON.parse(localStorage.getItem('announcements')) || [];
    
    // Clear the announcement list
    announcementList.innerHTML = '';
    
    if (announcements.length === 0) {
        announcementList.innerHTML = '<p>No announcements available.</p>';
        return;
    }
    
    // Add each announcement to the list
    announcements.forEach(announcement => {
        const announcementItem = document.createElement('div');
        announcementItem.className = 'announcement-item';
        
        const announcementTitle = document.createElement('h3');
        announcementTitle.textContent = announcement.title;
        
        const announcementContent = document.createElement('p');
        announcementContent.textContent = announcement.content;
        
        const announcementDate = document.createElement('small');
        announcementDate.textContent = `Date: ${announcement.date}`;
        
        announcementItem.appendChild(announcementTitle);
        announcementItem.appendChild(announcementContent);
        announcementItem.appendChild(announcementDate);
        
        announcementList.appendChild(announcementItem);
    });
}

// Function to show login message
function showLoginMessage(message, type) {
    loginMessage.textContent = message;
    loginMessage.className = `message ${type}`;
    
    // Clear message after 3 seconds
    setTimeout(() => {
        loginMessage.textContent = '';
        loginMessage.className = 'message';
    }, 3000);
}

// Function to reset login form
function resetLoginForm() {
    loginForm.reset();
    loginMessage.textContent = '';
    loginMessage.className = 'message';
}

// Function to scroll to section
function scrollToSection(sectionId) {
    document.getElementById(sectionId).scrollIntoView({
        behavior: 'smooth'
    });
}

// Smooth scrolling for navigation links
document.querySelectorAll('nav a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href').substring(1);
        scrollToSection(targetId);
    });
});