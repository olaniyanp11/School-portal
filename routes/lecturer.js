const router = require('express').Router();
const authenticateToken = require('../middlewares/checkLog');
const checkAdmin = require('../middlewares/isAdmin');
const Course = require('../models/Course');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Grade = require('../models/Grade');
const checkLec = require('../middlewares/isLecturer');





router.get('/', authenticateToken, async (req, res) => {
  console.log("Lecturer Dashboard Accessed");

  try {
    const userId = req?.user?.userId;
    if (!userId) return res.redirect("/logout");

    const user = await User.findById(userId).select('-password');
    if (!user || user.role !== 'lecturer') return res.redirect("/logout");

    const courses = await Course.find({ lecturerId: userId }).populate('department', 'name');

    // Dummy data: replace with actual DB query to count assignments that are ungraded
    const pendingGrades = [
      { title: "Intro to Algorithms - Assignment 1" },
      { title: "Database Systems - Quiz" }
    ];

    const submissionsToReview = [
      {
        studentName: "Pelumi Israel",
        assignmentTitle: "Data Structures Assignment",
        timeAgo: "3 hours ago"
      },
      {
        studentName: "Grace Adedayo",
        assignmentTitle: "Web Dev Report",
        timeAgo: "1 day ago"
      }
    ];

    const alerts = res.locals.notifications || [];

    return res.render('protected/lecturer/dashboard', {
      title: "Lecturer Dashboard",
      user,
      courses,
      alerts,
      pendingGrades,
      submissionsToReview
    });

  } catch (error) {
    console.error('Error loading lecturer dashboard:', error);
    return res.status(500).render("error", { message: "Internal Server Error" });
  }
});



router.get("/grades", authenticateToken, async (req, res) => {
  const students = await User.find({ role: "student" });
  const courses = await Course.find({ lecturerId: req.user.userId });
  res.render("protected/lecturer/grade-entry", { title: "Enter Grades", students, courses, user: req.user });
});

router.post("/grade", authenticateToken, async (req, res) => {
  const { studentId, courseId, score, session } = req.body;
  try {
    const grade = new Grade({ student: studentId, course: courseId, score, session });
    await grade.save();
    res.redirect("/lecturer/grades?message=Grade+Saved&type=success");
  } catch (err) {
    console.error(err);
    res.redirect("/lecturer/grades?message=Error+Saving+Grade&type=error");
  }
});
router.get("/grades/all", authenticateToken,checkLec, async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === "lecturer") {
      // Get courses taught by this lecturer
      const lecturerCourses = await Course.find({ lecturerId: req.user.userId }).select("_id");
      const courseIds = lecturerCourses.map(course => course._id);
      filter.course = { $in: courseIds };
    }

    const grades = await Grade.find(filter)
      .populate("student", "name email")
      .populate("course", "title code")
      .sort({ session: -1 });

    res.render("protected/grades/all", {
      title: "All Grades",
      user: req.user,
      grades
    });
  } catch (err) {
    console.error("Error fetching grades:", err);
    res.status(500).send("Server error");
  }
});

// View one Lecturer
router.get('/:id', authenticateToken, checkAdmin, async (req, res) => {
  try {
    const lecturer = await User.findById(req.params.id)
      .select('-password')
      .populate('department', 'name');
      
    if (!lecturer || lecturer.role !== 'lecturer') {
      return res.status(404).render('error', { message: "Lecturer not found", user: req.user });
    }

    const user = await User.findById(req.user.userId).select('-password');

    res.render('protected/admin/view-lecturer', {
      title: "View Lecturer",
      lecturer,
      user
    });

  } catch (err) {
    console.error('Error fetching lecturer:', err);
    res.status(500).render('error', { message: "Server Error", error: err, user: req.user });
  }
});

// Delete Lecturer
router.post('/:id', authenticateToken, checkAdmin, async (req, res) => {
  try {
    const userId =  req.params.id;
    const lecturer = await User.findByIdAndDelete({_id :userId});
    if (!lecturer || lecturer.role !== 'lecturer') {
      return res.status(404).render('error', { message: "Lecturer not found", user: req.user });
    }
    res.redirect('/admin/lecturers');
  } catch (err) {
    console.error('Error deleting lecturer:', err);
    res.status(500).render('error', { message: "Server Error", error: err, user: req.user });
  }
});

// View all Lecturers
router.get('/all', authenticateToken, checkAdmin, async (req, res) => {
  try {
    const lecturers = await User.find({ role: 'lecturer' }).select('-password');
    const user = await User.findById(req.user.userId).select('-password');

    res.render('protected/admin/lecturers', {
      title: "All Lecturers",
      lecturers,
      user
    });
  } catch (err) {
    console.error('Error fetching lecturers:', err);
    res.status(500).render('error', { message: "Server Error", error: err, user: req.user });
  }
});

module.exports = router;