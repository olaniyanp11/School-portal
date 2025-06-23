const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
  name: { type: String, required: true },

  password: { type: String, required: true },

  email: {
    type: String,
    required: function () {
      return this.role === 'lecturer' || this.role === 'admin';
    },
    unique: true,
    sparse: true, // prevents MongoDB from enforcing uniqueness on `null`/undefined values
    validate: {
      validator: function (v) {
        if (!v) return true; // don't validate empty email for students
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: props => `${props.value} is not a valid email!`
    }
  },

  matricNumber: {
    type: String,
    unique: true,
    sparse: true, // allows multiple null values without violating uniqueness
    required: function () {
      return this.role === 'student';
    }
  },

  role: {
    type: String,
    enum: ['student', 'lecturer', 'admin'],
    default: 'student'
  },

  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  level: { type: String },
  profileImage: { type: String }

}, { timestamps: true });

const User = mongoose.model('User', userSchema);
module.exports = User;
