const express = require('express');
const authRoutes = require('./auth');
const userRoute = require('./user')
const router = express.Router();
const studentRoute = require('./student');
const adminRoute = require('./admin');
const lecturerRoute = require('./lecturer');

router.use("/",authRoutes)
router.use("/user",authRoutes)
router.use("/admin", adminRoute);
router.use("/student", studentRoute);
router.use("/lecturer", lecturerRoute);




module.exports = router;