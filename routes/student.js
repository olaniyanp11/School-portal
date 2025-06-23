const router = require('express').Router();
const authenticateToken = require('../middlewares/checkLog');
const checkAdmin = require('../middlewares/isAdmin');
const Department = require('../models/Department');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
// This route handles student-related functionalities such as viewing and editing profiles.
// It uses the authenticateToken middleware to ensure that the user is authenticated before accessing these routes.


router.get('/', authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        if(!user){
            return res.redirect("/logout")
        }
        return res.render('protected/student/dashboard', {title:"Student Dashboard",user})
    } catch (error) {
        console.error('Error fetching student profile:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
})
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
