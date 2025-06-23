const router = require('express').Router();
const authenticateToken = require('../middlewares/checkLog');
const checkAdmin = require('../middlewares/isAdmin');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Course = require('../models/Course');
const Invite = require('../models/Invite');
const { v4: uuidv4 } = require('uuid'); // for generating unique codes
const Department = require('../models/Department');
const Semester = require('../models/Semester');




router.get('/', authenticateToken, async (req, res) => {
  console.log("Admin Dashboard Accessed");

  try {
    const userId = req.user?.userId;
    if (!userId) return res.redirect("/logout");

    const user = await User.findById(userId).select('-password');
    if (!user || user.role !== 'admin') return res.redirect("/logout");

    const courses = await Course.find({}).populate('lecturerId', 'name').populate('department', 'name');

    const [
      totalStudents,
      totalLecturers,
      totalCourses,
      totalDepartments,
      totalAdmins
    ] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'lecturer' }),
      Course.countDocuments(),
      Department.countDocuments(),
      User.countDocuments({ role: 'admin' })
    ]);

    const recentActivities = [
      { message: 'Admin logged in', timeAgo: '2 mins ago' },
      { message: 'New course created', timeAgo: '1 hour ago' },
      { message: 'Lecturer account approved', timeAgo: '3 hours ago' }
    ];

    res.render('protected/admin/dashboard', {
      title: "Admin Dashboard",
      user,
      courses,
      totalStudents,
      totalLecturers,
      totalCourses,
      totalDepartments,
      totalAdmins,
      recentActivities,
      notifications: [] // optional placeholder
    });

  } catch (error) {
    console.error('Error loading admin dashboard:', error);
    res.status(500).render("error", { message: "Internal Server Error" });
  }
});


// View one student
router.get('/students/:id', authenticateToken, checkAdmin, async (req, res) => {
  try {
    const student = await User.findById(req.params.id)
      .select('-password')
      .populate('department', 'name');
      
    if (!student || student.role !== 'student') {
      return res.status(404).render('error', { message: "Student not found", user: req.user });
    }

    const user = await User.findById(req.user.userId).select('-password');

    res.render('protected/admin/view-student', {
      title: "View Student",
      student,
      user
    });

  } catch (err) {
    console.error('Error fetching student:', err);
    res.status(500).render('error', { message: "Server Error", error: err, user: req.user });
  }
});

// Delete student
router.post('/user/delete/:id', authenticateToken, checkAdmin, async (req, res) => {
  try {
    const userId =  req.params.id;
    const user = await User.findByIdAndDelete({_id :userId});
    if (!user) {
      return res.status(404).render('error', { message: "user not found", user: req.user });
    }

    res.redirect('/admin/users');
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).render('error', { message: "Server Error", error: err, user: req.user });
  }
});

// routes/admin.js



// GET: Show invite creation page
router.get('/invite', authenticateToken, checkAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) return res.redirect('/logout');

    const invites = await Invite.find().sort({ createdAt: -1 }).limit(20); // recent invites

    res.render('protected/admin/invite', {
      title: 'Generate Invite Code',
      user,
      invites
    });
  } catch (error) {
    console.error('Error loading invite page:', error);
    res.status(500).render('error', { message: 'Server error', error, user: req.user || null });
  }
});

// POST: Create new invite
router.post('/invite', authenticateToken, checkAdmin, async (req, res) => {
  const { role } = req.body;
  if (!['lecturer', 'admin'].includes(role)) {
    return res.status(400).render('error', { message: 'Invalid role selected', user: req.user });
  }

  try {
    const code = uuidv4(); // e.g., '8f83e2f3-9cbb-4660-8bb2-093bdd1b8c5e'
    const invite = new Invite({
      code,
      role,
      createdBy: req.user.userId
    });
    await invite.save();
    res.redirect('/admin/invite');
  } catch (error) {
    console.error('Error creating invite:', error);
    res.status(500).render('error', { message: 'Could not create invite', error, user: req.user });
  }
});
// routes/admin.js
router.get('/users', authenticateToken,checkAdmin, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId).select('-password');
    if (!user || user.role !== 'admin') return res.redirect('/logout');

    const users = await User.find().select('-password');

    res.render('protected/admin/users', {
      title: "All Users",
      user,
      users
    });
  } catch (error) {
    console.error("❌ Error fetching all users:", error);
    res.status(500).render("error", { message: "Server Error", user: null });
  }
});
router.get('/users/:id', authenticateToken,checkAdmin, async (req, res) => {
  try {
    const userId = req.user.userId;
    const admin = await User.findById(userId).select('-password');
    if (!admin || admin.role !== 'admin') return res.redirect('/logout');

    const selectedUser = await User.findById(req.params.id).select('-password');
    if (!selectedUser) return res.status(404).render("error", { message: "User not found", user: admin });

    res.render('protected/admin/user-details', {
      title: "User Details",
      user: admin,
      selectedUser
    });
  } catch (error) {
    console.error("❌ Error fetching user by ID:", error);
    res.status(500).render("error", { message: "Server Error", user: null });
  }
});


//depaertment routes

// List all departments
router.get('/departments', authenticateToken, checkAdmin, async (req, res) => {
  const user = await User.findById(req.user.userId).select('-password');
  const departments = await Department.find();
  res.render('protected/admin/departments', { title: 'All Departments', user, departments });
});
// Show form to create department
router.get('/departments/new', authenticateToken, checkAdmin, (req, res) => {
  res.render('protected/admin/department-form', { title: "New Department", user: req.user });
});

// View one department

router.get('/departments/:id', authenticateToken, checkAdmin, async (req, res) => {
  const user = await User.findById(req.user.userId).select('-password');
  const department = await Department.findById(req.params.id);
  if (!department) return res.status(404).render("error", { message: "Department not found", user });
  res.render('protected/admin/department-details', { title: 'Department Details', user, department });
});


// Create department
router.post('/departments', authenticateToken, checkAdmin, async (req, res) => {
  await Department.create({ name: req.body.name });
  res.redirect('/admin/departments');
});

// Delete department
router.delete('/departments/:id', authenticateToken, checkAdmin, async (req, res) => {
  await Department.findByIdAndDelete(req.params.id);
  res.redirect('/admin/departments');
});
// Show edit form for one department
router.get('/departments/:id/edit', authenticateToken, checkAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    const department = await Department.findById(req.params.id);
    const lecturers = await User.find({ role: 'lecturer' });

    if (!department) return res.status(404).render("error", { message: "Department not found", user });

    res.render('protected/admin/department-edit', {
      title: 'Edit Department',
      user,
      department,
      lecturers
    });
  } catch (error) {
    console.error("❌ Error fetching department for edit:", error);
    res.status(500).render("error", { message: "Server Error", user: null });
  }
});

// Update department
router.post('/departments/:id', authenticateToken, checkAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    await Department.findByIdAndUpdate(req.params.id, { name });
    res.redirect('/admin/departments');
  } catch (error) {
    console.error("❌ Error updating department:", error);
    res.status(500).render("error", { message: "Update Failed", user: null });
  }
});
//courses
// GET all courses
router.get('/courses', authenticateToken, checkAdmin, async (req, res) => {
  const user = await User.findById(req.user.userId).select('-password');
  const courses = await Course.find()
    .populate('department')
    .populate('semester')
    .populate('lecturerId');

  res.render('protected/admin/courses', {
    title: "All Courses",
    user,
    courses
  });
});

// NEW course form
router.get('/courses/new', authenticateToken, checkAdmin, async (req, res) => {
  const departments = await Department.find();
  const semesters = await Semester.find();
  const lecturers = await User.find({ role: 'lecturer' });

  res.render('protected/admin/course-form', {
    title: "New Course",
    user: req.user,
    departments,
    semesters,
    lecturers
  });
});

// CREATE course
router.post('/courses', authenticateToken, checkAdmin, async (req, res) => {
  try {
    const { title, code, unit, department, semester, lecturerId } = req.body;
    await Course.create({ title, code, unit, department, semester, lecturerId });
    res.redirect('/admin/courses');
  } catch (err) {
    console.error("❌ Error creating course:", err);
    res.status(500).render("error", { message: "Server Error", user: null });
  }
});

// VIEW course
router.get('/courses/:id', authenticateToken, checkAdmin, async (req, res) => {
  const course = await Course.findById(req.params.id)
    .populate('department')
    .populate('semester')
    .populate('lecturerId');

  if (!course) return res.status(404).render("error", { message: "Course not found", user: req.user });

  res.render('protected/admin/course-details', {
    title: "Course Details",
    user: req.user,
    course
  });
});

// EDIT course form
router.get('/courses/:id/edit', authenticateToken, checkAdmin, async (req, res) => {
  const course = await Course.findById(req.params.id);
  const departments = await Department.find();
  const semesters = await Semester.find();
  const lecturers = await User.find({ role: 'lecturer' });

  res.render('protected/admin/course-edit', {
    title: "Edit Course",
    user: req.user,
    course,
    departments,
    semesters,
    lecturers
  });
});

// UPDATE course
router.post('/courses/:id', authenticateToken, checkAdmin, async (req, res) => {
  const { title, code, unit, department, semester, lecturerId } = req.body;
  await Course.findByIdAndUpdate(req.params.id, {
    title, code, unit, department, semester, lecturerId
  });
  res.redirect('/admin/courses');
});

// DELETE course
router.post('/courses/:id', authenticateToken, checkAdmin, async (req, res) => {
  await Course.findByIdAndDelete(req.params.id);
  res.redirect('/admin/courses');
});

module.exports = router;
