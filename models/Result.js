const { default: mongoose } = require("mongoose");

const resultSchema = mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  semesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Semester', required: true },
  grade: { type: String }, // e.g., A, B+, C, F
  remark: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Result', resultSchema);
