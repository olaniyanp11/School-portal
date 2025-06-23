const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const User = require('./models/User');
const Department = require('./models/Department');
const Course = require('./models/Course');
const Semester = require('./models/Semester');

dotenv.config();

const seed = async () => {
  try {
    await mongoose.connect(process.env.dbURL);
    console.log('📦 Connected to MongoDB');

    // 1. Ensure departments exist
    const departmentsData = [
      { name: 'ICT', school: 'School of Communication and Information Tech' },
      { name: 'Business', school: 'School of Business Studies' },
      { name: 'Engineering', school: 'School of Engineering' }
    ];

    const departments = {};
    for (const deptData of departmentsData) {
      let dept = await Department.findOne({ name: deptData.name });
      if (!dept) {
        dept = new Department(deptData);
        await dept.save();
        console.log(`✅ Department "${deptData.name}" created`);
      }
      departments[deptData.name] = dept;
    }

    // 2. Ensure super admin exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('SuperSecret123', 10);
      const admin = new User({
        name: 'Super Admin',
        email: 'admin@school.edu',
        password: hashedPassword,
        role: 'admin',
        department: departments['ICT']._id
      });
      await admin.save();
      console.log('✅ Super admin created');
    } else {
      console.log('⚠️ Admin already exists. No action taken.');
    }

    // 3. Seed semesters
    const semesterData = [
      { name: 'First Semester', session: '2024/2025' },
      { name: 'Second Semester', session: '2024/2025' }
    ];

    const semesters = {};
    for (const data of semesterData) {
      let sem = await Semester.findOne({ name: data.name, session: data.session });
      if (!sem) {
        sem = new Semester(data);
        await sem.save();
        console.log(`✅ Semester "${data.name}" created`);
      }
      semesters[data.name] = sem;
    }

    // 4. Seed courses under each department and semester
    const coursesData = [
      // ICT
      { title: 'Web Development', code: 'ICT101', unit: 3, department: 'ICT', semester: 'First Semester' },
      { title: 'Networking Fundamentals', code: 'ICT102', unit: 2, department: 'ICT', semester: 'Second Semester' },
      { title: 'Database Systems', code: 'ICT103', unit: 3, department: 'ICT', semester: 'First Semester' },
      // Business
      { title: 'Principles of Management', code: 'BUS101', unit: 3, department: 'Business', semester: 'First Semester' },
      { title: 'Accounting Basics', code: 'BUS102', unit: 2, department: 'Business', semester: 'Second Semester' },
      // Engineering
      { title: 'Engineering Mathematics', code: 'ENG101', unit: 4, department: 'Engineering', semester: 'First Semester' },
      { title: 'Thermodynamics', code: 'ENG102', unit: 3, department: 'Engineering', semester: 'Second Semester' }
    ];

    for (const course of coursesData) {
      const exists = await Course.findOne({
        code: course.code,
        department: departments[course.department]._id,
        semester: semesters[course.semester]._id
      });

      if (!exists) {
        await Course.create({
          title: course.title,
          code: course.code,
          unit: course.unit,
          department: departments[course.department]._id,
          semester: semesters[course.semester]._id
        });
        console.log(`✅ Course "${course.title}" created`);
      }
    }

    await mongoose.disconnect();
    console.log('✅ Seeding completed and MongoDB disconnected');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    await mongoose.disconnect();
  }
};

seed();
