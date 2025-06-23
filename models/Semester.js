const { default: mongoose } = require("mongoose");

const semesterSchema = mongoose.Schema({
  name: { type: String, required: true }, // e.g., First Semester 2024/2025
  session: { type: String, required: true }, // e.g., 2024/2025
  startDate: { type: Date },
  endDate: { type: Date },
  isCurrent: { type: Boolean, default: false }
});

const Semester = mongoose.model('Semester', semesterSchema);
module.exports = Semester;