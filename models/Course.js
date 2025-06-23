const { default: mongoose } = require("mongoose");

const courseSchema = mongoose.Schema({
  title: { type: String, required: true },
  code: { type: String, required: true, unique: true }, // e.g., CSC201
  unit: { type: Number, required: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  semester: { type: mongoose.Schema.Types.ObjectId, ref: 'Semester' },
  lecturerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const Course = mongoose.model('Course', courseSchema);
module.exports = Course;