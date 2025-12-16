// SQLite Database for SS Classes - Complete Database Solution

class SSDatabase {
    constructor() {
        this.dbName = 'SSClassesDB';
        this.init();
    }

    // Initialize database
    init() {
        console.log('🔄 Initializing SQLite Database...');
        
        // Check if database exists in localStorage, if not create it
        if (!localStorage.getItem(this.dbName)) {
            this.setupInitialData();
        }
        
        console.log('✅ Database initialized successfully');
    }

    // Setup initial database structure
    setupInitialData() {
        const initialData = {
            // Students table
            students: [
                {
                    id: 1001,
                    name: "Rahul Sharma",
                    username: "rahul2024",
                    password: "rahul123",
                    class: "10th",
                    phone: "9876543210",
                    email: "rahul@gmail.com",
                    address: "123 Main Street, Delhi",
                    status: "Active",
                    createdAt: "2024-01-15",
                    lastLogin: null,
                    attendance: [],
                    testResults: []
                },
                {
                    id: 1002,
                    name: "Priya Patel",
                    username: "priya2024",
                    password: "priya123",
                    class: "11th Science",
                    phone: "9876543211",
                    email: "priya@gmail.com",
                    address: "456 Park Avenue, Mumbai",
                    status: "Active",
                    createdAt: "2024-01-16",
                    lastLogin: null,
                    attendance: [],
                    testResults: []
                }
            ],
            
            // Admin credentials
            admin: {
                // username: "admin",
                // password: "admin123"
            },
            
            // Announcements table
            announcements: [
                {
                    id: 1,
                    title: "Welcome to New Academic Session",
                    content: "New academic session starts from 1st April 2024. All students are requested to attend the orientation program.",
                    date: "2024-03-25",
                    priority: "important"
                },
                {
                    id: 2,
                    title: "Monthly Test Schedule",
                    content: "Monthly tests will be conducted from 15th to 20th April 2024. Prepare well!",
                    date: "2024-03-20",
                    priority: "normal"
                }
            ],
            
            // Study materials table
            studyMaterials: [
                {
                    id: 1,
                    title: "Mathematics Chapter 1 Notes",
                    subject: "Mathematics",
                    class: "10th",
                    type: "Notes",
                    description: "Complete notes for Chapter 1 - Real Numbers",
                    fileName: "math_chapter1_notes.pdf",
                    fileSize: "2.5 MB",
                    downloads: 15,
                    uploadDate: "2024-03-15"
                },
                {
                    id: 2,
                    title: "Physics Formulas Sheet",
                    subject: "Physics",
                    class: "All",
                    type: "PDF",
                    description: "Important physics formulas for quick revision",
                    fileName: "physics_formulas.pdf",
                    fileSize: "1.2 MB",
                    downloads: 23,
                    uploadDate: "2024-03-10"
                }
            ],
            
            // Attendance records (organized by date and class)
            attendanceRecords: [],
            
            // Test results records
            testResults: [],
            
            // System settings
            settings: {
                lastStudentId: 1002,
                lastAnnouncementId: 2,
                lastMaterialId: 2
            }
        };

        this.saveDatabase(initialData);
    }

    // Save entire database to localStorage
    saveDatabase(data) {
        localStorage.setItem(this.dbName, JSON.stringify(data));
    }

    // Get entire database
    getDatabase() {
        const db = localStorage.getItem(this.dbName);
        return db ? JSON.parse(db) : null;
    }

    // 🔥 STUDENT OPERATIONS

    // Get all students
    getAllStudents() {
        const db = this.getDatabase();
        return db.students || [];
    }

    // Get student by ID
    getStudentById(id) {
        const students = this.getAllStudents();
        return students.find(student => student.id === parseInt(id));
    }

    // Get student by username
    getStudentByUsername(username) {
        const students = this.getAllStudents();
        return students.find(student => student.username === username);
    }

    // Add new student with auto-generated ID
    addStudent(studentData) {
        const db = this.getDatabase();
        
        // Generate new student ID
        const newStudentId = db.settings.lastStudentId + 1;
        
        const newStudent = {
            id: newStudentId,
            name: studentData.name,
            username: studentData.username,
            password: studentData.password,
            class: studentData.class,
            phone: studentData.phone || '',
            email: studentData.email || '',
            address: studentData.address || '',
            status: "Active",
            createdAt: new Date().toISOString().split('T')[0],
            lastLogin: null,
            attendance: [],
            testResults: []
        };

        // Add to database
        db.students.push(newStudent);
        db.settings.lastStudentId = newStudentId;
        
        this.saveDatabase(db);
        console.log(`✅ New student created: ${newStudent.name} (ID: ${newStudentId})`);
        
        return newStudent;
    }

    // Update student
    updateStudent(studentId, updatedData) {
        const db = this.getDatabase();
        const studentIndex = db.students.findIndex(s => s.id === parseInt(studentId));
        
        if (studentIndex !== -1) {
            db.students[studentIndex] = { ...db.students[studentIndex], ...updatedData };
            this.saveDatabase(db);
            return true;
        }
        return false;
    }

    // Delete student
    deleteStudent(studentId) {
        const db = this.getDatabase();
        const initialLength = db.students.length;
        db.students = db.students.filter(s => s.id !== parseInt(studentId));
        
        if (db.students.length < initialLength) {
            this.saveDatabase(db);
            return true;
        }
        return false;
    }

    // 🔥 ATTENDANCE OPERATIONS

    // Mark attendance for multiple students
    markAttendance(date, classFilter, attendanceData) {
        const db = this.getDatabase();
        
        // Update each student's attendance record
        attendanceData.forEach(record => {
            const student = db.students.find(s => s.id === record.studentId);
            if (student) {
                // Remove existing record for same date
                student.attendance = student.attendance.filter(a => a.date !== date);
                
                // Add new record
                student.attendance.push({
                    date: date,
                    status: record.status,
                    remarks: record.remarks || ''
                });
            }
        });

        // Also store in attendance records for admin view
        const classAttendance = {
            date: date,
            class: classFilter,
            present: attendanceData.filter(a => a.status === 'Present').length,
            absent: attendanceData.filter(a => a.status === 'Absent').length,
            total: attendanceData.length
        };

        // Remove existing record for same date and class
        db.attendanceRecords = db.attendanceRecords.filter(record => 
            !(record.date === date && record.class === classFilter)
        );
        
        db.attendanceRecords.push(classAttendance);
        this.saveDatabase(db);
        
        return true;
    }

    // Get attendance records for admin
    getAttendanceRecords(classFilter = '', monthFilter = '') {
        const db = this.getDatabase();
        let records = db.attendanceRecords || [];

        // Apply filters
        if (classFilter) {
            records = records.filter(record => record.class === classFilter);
        }

        if (monthFilter) {
            records = records.filter(record => record.date.startsWith(monthFilter));
        }

        return records.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    // 🔥 ANNOUNCEMENT OPERATIONS

    // Get all announcements
    getAllAnnouncements() {
        const db = this.getDatabase();
        return db.announcements || [];
    }

    // Add new announcement
    addAnnouncement(announcementData) {
        const db = this.getDatabase();
        const newId = db.settings.lastAnnouncementId + 1;

        const newAnnouncement = {
            id: newId,
            title: announcementData.title,
            content: announcementData.content,
            date: announcementData.date,
            priority: announcementData.priority || 'normal'
        };

        db.announcements.push(newAnnouncement);
        db.settings.lastAnnouncementId = newId;
        this.saveDatabase(db);

        return newAnnouncement;
    }

    // Delete announcement
    deleteAnnouncement(announcementId) {
        const db = this.getDatabase();
        const initialLength = db.announcements.length;
        db.announcements = db.announcements.filter(a => a.id !== parseInt(announcementId));
        
        if (db.announcements.length < initialLength) {
            this.saveDatabase(db);
            return true;
        }
        return false;
    }

    // 🔥 STUDY MATERIALS OPERATIONS

    // Get all study materials
    getAllStudyMaterials() {
        const db = this.getDatabase();
        return db.studyMaterials || [];
    }

    // Add new study material
    addStudyMaterial(materialData) {
        const db = this.getDatabase();
        const newId = db.settings.lastMaterialId + 1;

        const newMaterial = {
            id: newId,
            title: materialData.title,
            subject: materialData.subject,
            class: materialData.class,
            type: materialData.type,
            description: materialData.description || '',
            fileName: materialData.fileName || '',
            fileSize: materialData.fileSize || '',
            link: materialData.link || '',
            downloads: 0,
            uploadDate: new Date().toISOString().split('T')[0]
        };

        db.studyMaterials.push(newMaterial);
        db.settings.lastMaterialId = newId;
        this.saveDatabase(db);

        return newMaterial;
    }

    // Delete study material
    deleteStudyMaterial(materialId) {
        const db = this.getDatabase();
        const initialLength = db.studyMaterials.length;
        db.studyMaterials = db.studyMaterials.filter(m => m.id !== parseInt(materialId));
        
        if (db.studyMaterials.length < initialLength) {
            this.saveDatabase(db);
            return true;
        }
        return false;
    }

    // Update download count
    incrementDownloadCount(materialId) {
        const db = this.getDatabase();
        const material = db.studyMaterials.find(m => m.id === parseInt(materialId));
        
        if (material) {
            material.downloads = (material.downloads || 0) + 1;
            this.saveDatabase(db);
            return true;
        }
        return false;
    }

    // 🔥 TEST RESULTS OPERATIONS

    // Add test results
    addTestResults(testData) {
        const db = this.getDatabase();
        
        // Update each student's test results
        testData.results.forEach(result => {
            const student = db.students.find(s => s.id === result.studentId);
            if (student) {
                if (!student.testResults) {
                    student.testResults = [];
                }
                
                student.testResults.push({
                    testName: testData.testName,
                    subject: testData.subject,
                    date: testData.date,
                    marks: result.marks,
                    totalMarks: testData.totalMarks
                });
            }
        });

        // Store in test results records for admin
        const testRecord = {
            testName: testData.testName,
            subject: testData.subject,
            class: testData.class,
            date: testData.date,
            totalMarks: testData.totalMarks,
            totalStudents: testData.results.length,
            averagePercentage: this.calculateAveragePercentage(testData.results, testData.totalMarks)
        };

        db.testResults.push(testRecord);
        this.saveDatabase(db);

        return true;
    }

    // Calculate average percentage for test
    calculateAveragePercentage(results, totalMarks) {
        if (results.length === 0) return 0;
        
        const totalPercentage = results.reduce((sum, result) => {
            return sum + (result.marks / totalMarks) * 100;
        }, 0);
        
        return Math.round(totalPercentage / results.length);
    }

    // Get all test results for admin
    getAllTestResults(classFilter = '', subjectFilter = '', monthFilter = '') {
        const db = this.getDatabase();
        let results = db.testResults || [];

        // Apply filters
        if (classFilter) {
            results = results.filter(result => result.class === classFilter);
        }

        if (subjectFilter) {
            results = results.filter(result => result.subject === subjectFilter);
        }

        if (monthFilter) {
            results = results.filter(result => result.date.startsWith(monthFilter));
        }

        return results.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    // 🔥 AUTHENTICATION OPERATIONS

    // Verify admin login
    verifyAdminLogin(username, password) {
        const db = this.getDatabase();
        return db.admin.username === username && db.admin.password === password;
    }

    // Verify student login
    verifyStudentLogin(username, password) {
        const student = this.getStudentByUsername(username);
        return student && student.password === password;
    }

    // Update student last login
    updateStudentLastLogin(studentId) {
        const db = this.getDatabase();
        const student = db.students.find(s => s.id === parseInt(studentId));
        
        if (student) {
            student.lastLogin = new Date().toISOString();
            this.saveDatabase(db);
            return true;
        }
        return false;
    }

    // 🔥 STATISTICS OPERATIONS

    // Get dashboard statistics
    getDashboardStats() {
        const db = this.getDatabase();
        const students = this.getAllStudents();
        
        return {
            totalStudents: students.length,
            totalAnnouncements: db.announcements.length,
            totalMaterials: db.studyMaterials.length,
            classDistribution: this.getClassDistribution(students),
            activeLogins: this.getActiveLoginsToday(students)
        };
    }

    // Get class distribution
    getClassDistribution(students) {
        const distribution = {};
        students.forEach(student => {
            distribution[student.class] = (distribution[student.class] || 0) + 1;
        });
        return distribution;
    }

    // Get active logins today
    getActiveLoginsToday(students) {
        const today = new Date().toISOString().split('T')[0];
        return students.filter(student => 
            student.lastLogin && student.lastLogin.startsWith(today)
        ).length;
    }
}

// Create global database instance
const ssDB = new SSDatabase();