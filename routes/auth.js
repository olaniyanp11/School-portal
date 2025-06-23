const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const authenticateToken = require("../middlewares/checkLog");
const multer = require("multer");
const Department = require("../models/Department");
const Invite = require("../models/Invite");
const Enrollment = require("../models/Enrollment");
const Semester = require("../models/Semester");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads"); // Ensure this directory exists
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + "-" + file.originalname);
  },
});
const upload = multer({ storage: storage });


router.get("/", (req, res) => {
  let user = null;

  if (req.cookies.token) {
    try {
      user = jwt.verify(req.cookies.token, "your_jwt_secret"); // Replace with process.env.JWT_SECRET in production
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        console.log("JWT expired");
      } else {
        console.log("Invalid token:", err.message);
      }

      res.clearCookie("token"); // Remove invalid/expired token
    }
  }

  res.render("index", { title: "Home", user });
});
router.get("/register", async (req, res) => {
  const user = req.cookies.token
    ? jwt.verify(req.cookies.token, "your_jwt_secret")
    : null;
  if (user) {
    // If user is already logged in, redirect to dashboard
    if (user.role === "admin") {
      return res.redirect("/admin");
    } else if (user.role === "lecturer") {
      return res.redirect("/lecturer");
    } else {
      return res.redirect("/student");
    }
  }
  const Departments = await Department.find();
  if (Departments.length === 0) {
    return res.render("register", {
      title: "Register",
      error: "No departments available. Please contact the admin.",
      user: null,
      Departments: [],
    });
  }
  res.render("register", {
    title: "Register",
    error: null,
    user: user,
    Departments: Departments,
  });
});
router.get("/login", async (req, res) => {
  let user = req.cookies.token
    ? jwt.verify(req.cookies.token, "your_jwt_secret")
    : null;
  const Departments = await Department.find();
  if (user) {
    if (user.role === "admin") {
      return res.redirect("/admin");
    } else if (user.role === "lecturer") {
      return res.redirect("/lecturer");
    } else {
      return res.redirect("/student");
    }
  } else {
    user = null;
  }
  res.render("login", {
    title: "Login",
    error: null,
    user: user,
    Departments: Departments,
  });
});
router.get(
  ["/admin/profile", "/student/profile", "/lecturer/profile"],
  authenticateToken,
  async (req, res) => {
    try {
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.render("protected/profile", { title: "Profile", user });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.post(
  ["/admin/profile/edit", "/student/profile/edit", "/lecturer/profile/edit"],
  authenticateToken,
  async (req, res) => {
    try {
      const { name, email, phone } = req.body;

      const updatedUser = await User.findByIdAndUpdate(
        req.user.userId,
        { name, email, phone },
        { new: true }
      );

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.redirect("/admin/profile"); // or redirect to role-based profile page if preferred
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.post('/profile/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    const user = await User.findById(req.user.userId);
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.send("Incorrect current password");
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save();

    res.redirect('/' + user.role + '/profile');
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating password");
  }
});


router.post("/register", async (req, res) => {
  let { name, email, password, inviteCode, matricNumber, department, level } = req.body;
  inviteCode = inviteCode ? inviteCode.trim() : null;

  const Departments = await Department.find();

  try {
    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.render("register", {
        title: "Register",
        error: "Email already exists.",
        user: null,
        Departments,
      });
    }

    // Password length check
    if (password.length < 6) {
      return res.render("register", {
        title: "Register",
        error: "Password must be at least 6 characters long.",
        user: null,
        Departments,
      });
    }

    // Default role
    let role = "student";

    // Invite code validation
    console.log("Invite code:", inviteCode);
    if (inviteCode) {
      const validInvite = await Invite.findOne({
        code: inviteCode,
        isUsed: false,
      });

      if (!validInvite || validInvite.isUsed || validInvite.expiresAt < new Date()) {
        console.log("Invalid or expired invite code:", inviteCode);
        return res.render("register", {
          title: "Register",
          user: null,
          Departments,
          error: "Invalid or expired invite code.",
        });
      }

      role = validInvite.role;
      validInvite.isUsed = true;
      await validInvite.save();
    }

    // Matric number check for students
    if (role === "student" && (!matricNumber || matricNumber.trim() === "")) {
      return res.render("register", {
        user: null,
        Departments,
        title: "Register",
        error: "Matric number is required for students.",
      });
    }

    // Department validation only for students
    let dept = null;
    if (role === "student") {
      dept = await Department.findOne({ name: department });
      if (!dept) {
        return res.render("register", {
          title: "Register",
          Departments,
          error: "Department does not exist.",
          user: null,
        });
      }
    }

    // Create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role,
      matricNumber: role === "student" ? matricNumber : undefined,
      department: role === "student" && dept ? dept._id : undefined,
      level: role === "student" ? level : undefined,
    });

    await newUser.save();

    // Automatically enroll student into department courses
    if (role === "student") {
      const currentSemester = await Semester.findOne({ isCurrent: true });

      if (currentSemester) {
        const deptCourses = await Course.find({ department: dept._id });

        const enrollments = deptCourses.map((course) => ({
          studentId: newUser._id,
          courseId: course._id,
          semesterId: currentSemester._id,
          status: "active",
        }));

        if (enrollments.length > 0) {
          await Enrollment.insertMany(enrollments);
        }
      }
    }

    return res.render("login", {
      title: "Login",
      error: null,
      message: "Registration successful! You can now log in.",
      user: null,
      Departments,
    });

  } catch (error) {
    console.error("Registration error:", error);
    return res.render("register", {
      title: "Register",
      error: "An error occurred while registering.",
      Departments,
      user: null,
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password, matricNumber } = req.body;

    if (!email && !matricNumber) {
      return res.render("login", {
        title: "Login",
        error: "Email or Matric Number is required.",
        user: null,
      });
    }

    if (!password) {
      return res.render("login", {
        title: "Login",
        error: "Password is required.",
        user: null,
      });
    }

    console.log("Login attempt:", { email, matricNumber });

    let user;

    if (email && email.trim() !== "") {
      user = await User.findOne({ email: email.trim() });
      if (!user) {
        return res.render("login", {
          title: "Login",
          error: "Invalid email or password.",
          user: null,
        });
      }
    } else if (matricNumber && matricNumber.trim() !== "") {
      user = await User.findOne({ matricNumber: matricNumber.trim() });
      if (!user) {
        return res.render("login", {
          title: "Login",
          error: "Invalid matric number or password.",
          user: null,
        });
      }
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.render("login", {
        title: "Login",
        error: "Invalid credentials.",
        user: null,
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      "your_jwt_secret", // move to .env as JWT_SECRET
      { expiresIn: "1h" }
    );

    // Set token cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: false, // Should be true in production with HTTPS
      sameSite: "strict",
    });

    // Redirect based on role
    if (user.role === "admin") {
      return res.redirect("/admin");
    } else if (user.role === "lecturer") {
      return res.redirect("/lecturer");
    } else {
      return res.redirect("/student");
    }
  } catch (error) {
    console.error("Login error:", error);
    return res.render("login", {
      title: "Login",
      error: "An unexpected error occurred.",
      user: null,
    });
  }
});
router.get("/dashboard", authenticateToken, async (req, res) => {
  const user = await User.findById(req.user.userId);
  if (!user) {
    return res.redirect("/login");
  }
  res.render("protected/dashboard", { title: "Dashboard", user: user });
});
router.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});
module.exports = router;
