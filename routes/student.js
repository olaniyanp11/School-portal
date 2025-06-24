const router = require('express').Router();
const authenticateToken = require('../middlewares/checkLog');
const checkAdmin = require('../middlewares/isAdmin');
const Department = require('../models/Department');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const PDFDocument = require("pdfkit")
const Grade = require("../models/Grade")
const jwt = require('jsonwebtoken');
// This route handles student-related functionalities such as viewing and editing profiles.
// It uses the authenticateToken middleware to ensure that the user is authenticated before accessing these routes.


router.get("/", authenticateToken, async (req, res) => {
  try {
    const studentId = req.user.userId;

    const grades = await Grade.find({ student: studentId }).populate("course").sort({ updatedAt: -1 });

    // Unique course count
    const courseIds = new Set(grades.map(g => g.course?._id.toString()));
    const activeCourses = courseIds.size;

    // GPA Calculation
    const gradePoints = { A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 };
    const totalGradePoints = grades.reduce((sum, g) => sum + (gradePoints[g.grade] || 0), 0);
    const gpa = grades.length > 0 ? (totalGradePoints / grades.length).toFixed(2) : "0.00";

    res.render("protected/student/dashboard", {
      user: req.user,
      grades,
      activeCourses,
      gpa,
      title : "Student Dashboard"
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading dashboard.");
  }
});
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.redirect("/logout");
        }
        return res.render('protected/student/profile', {title:"Student Profile",user})
    } catch (error) {
        console.error('Error fetching student profile:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
})
router.get('/edit-profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.redirect("/logout");
        }
        return res.render('protected/student/edit-profile', {title:"Edit Student Profile",user})
    } catch (error) {
        console.error('Error fetching student profile:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
})
router.post('/edit-profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { name, email, phone } = req.body;

        // Validate input
        if (!name || !email || !phone) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Update user profile
        const updatedUser = await User.findByIdAndUpdate(userId, { name, email, phone }, { new: true }).select('-password');
        
        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.redirect('/student/profile');
    } catch (error) {
        console.error('Error updating student profile:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.get("/results", authenticateToken, async (req, res) => {
  try {
    const studentId = req.user.userId;

    const grades = await Grade.find({ student: studentId })
      .populate("course")
      
      .sort({ session: -1, "course.title": 1 });

    res.render("protected/student/results", { user: req.user, grades, title:"Student Result" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading student results.");
  }
});
router.get("/export-results", authenticateToken, async (req, res) => {
  try {
    const studentId = req.user.userId;
    const student = await User.findById(studentId);
    const grades = await Grade.find({ student: studentId })
      .populate("course")
      .sort({ session: -1 });

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-disposition", "inline; filename=results.pdf");
    res.setHeader("Content-type", "application/pdf");

    doc.pipe(res);

    // Title
    doc.fontSize(22).font("Helvetica-Bold").text("Student Results", { align: "center" });
    doc.moveDown(1.5);

    // Student Info
    doc.fontSize(12).font("Helvetica").text(`Name: ${student.name}`);
    doc.text(`Email: ${student.email}`);
    doc.moveDown(1.5);

    // Table Header
    const tableTop = doc.y;
    const colX = [50, 150, 300, 380, 450];
    const colWidths = [100, 150, 80, 60, 80];

    doc.font("Helvetica-Bold").fontSize(12);
    doc.text("Session", colX[0], tableTop, { width: colWidths[0], align: "left" });
    doc.text("Course", colX[1], tableTop, { width: colWidths[1], align: "left" });
    doc.text("Code", colX[2], tableTop, { width: colWidths[2], align: "left" });
    doc.text("Score", colX[3], tableTop, { width: colWidths[3], align: "left" });
    doc.text("Grade", colX[4], tableTop, { width: colWidths[4], align: "left" });

    // Draw header line
    doc.moveTo(50, doc.y + 15).lineTo(550, doc.y + 15).stroke();

    // Table Rows
    let rowY = doc.y + 20;
    doc.font("Helvetica").fontSize(11);

    grades.forEach(g => {
      doc.text(g.session, colX[0], rowY, { width: colWidths[0], align: "left" });
      doc.text(g.course?.title || "", colX[1], rowY, { width: colWidths[1], align: "left" });
      doc.text(g.course?.code || "", colX[2], rowY, { width: colWidths[2], align: "left" });
      doc.text(String(g.score), colX[3], rowY, { width: colWidths[3], align: "left" });
      doc.text(g.grade, colX[4], rowY, { width: colWidths[4], align: "left" });
      rowY += 20;
      // Optionally, draw row lines for better separation
      doc.moveTo(50, rowY - 5).lineTo(550, rowY - 5).strokeColor("#eeeeee").stroke();
    });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to export results.");
  }
});
router.get("/courses", authenticateToken, async (req, res) => {
  try {
    const studentId = req.user.userId;

    // Get all graded courses (taken courses)
    const grades = await Grade.find({ student: studentId })
      .populate("course")
      .sort({ session: -1 });

    res.render("protected/student/courses", { user: req.user, grades,title:"Student Courses" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to load courses.");
  }
});
// Common middlewares
const middlewares = [authenticateToken, checkAdmin];


router.get('/all', ...middlewares, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId).select('-password');
    if (!user) return res.redirect("/logout");

    const departments = await Department.find();
    res.render('protected/admin/all-students', {
      title: "All Students",
      user,
      departments,
      students: [],
      selectedDepartment: '',
      currentPage: 1,
      totalPages: 0
    });
  } catch (error) {
    console.error('❌ Error loading all-students page:', error);
    res.status(500).render('error', {
      title: "Error",
      message: "Server Error",
      error,
      user: req.user || null
    });
  }
});
router.get('/api/students', ...middlewares, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const userId = req.user.userId;
    const user = await User.findById(userId).select('-password');
    if (!user) return res.redirect("/logout");
    const limit = 10;
    const departmentName = req.query.department || '';
    
    const filter = { role: 'student' };
    let selectedDepartment = '';

    if (departmentName) {
      const dept = await Department.findOne({ name: departmentName });
      if (dept) {
        filter.department = dept._id;
        selectedDepartment = departmentName;
      } else {
        filter.department = null; // To prevent casting error
      }
    }

    const totalStudents = await User.countDocuments(filter);
    const totalPages = Math.ceil(totalStudents / limit);

    const students = await User.find(filter)
      .select('-password')
      .populate('department', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    if (req.xhr) {
      return res.render('protected/admin/all-students', {
        title: "All Students",
        students,
        user,
        departments: await Department.find(),
        selectedDepartment,
        currentPage: page,
        totalPages,
        layout: false
      });
    }

   res.render('protected/admin/all-students', {
        title: "All Students",
        students,
        selectedDepartment,
        currentPage: page,
         departments: await Department.find(),
        user,
        totalPages,
        layout: false
      });

  } catch (error) {
    console.error('❌ Error fetching students:', error);
    res.render('error', {
      title: "Error",
      message: "Server Error",
      error,
      user: req.user || null
    });
}});

router.post('/all', authenticateToken, checkAdmin, async (req, res) => {
  try {
    const students = await User.find({ role: 'student' })
      .select('-password')
      .populate('department', 'name')
      .sort({ createdAt: -1 });

    res.render('protected/admin/all-students', {
      title: "All Students",
      students,
      user: req.user,
      departments: await Department.find(),
      selectedDepartment: '',
      currentPage: 1,
      totalPages: 1
    });
  } catch (error) {
    console.error('Error in POST /all:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
router.get("/results", authenticateToken, async (req, res) => {
  try {
    const grades = await Grade.find({ student: req.user.userId })
      .populate("course", "title code")
      .sort({ session: -1 });
    res.render("protected/student/results", { title: "My Results", user: req.user, grades });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading results");
  }
});
module.exports = router;
