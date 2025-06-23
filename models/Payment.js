const { default: mongoose } = require("mongoose");

const paymentSchema = mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  feeType: { type: String }, // e.g., Tuition, Departmental Fee
  status: { type: String, enum: ['paid', 'pending'], default: 'pending' },
  reference: { type: String, unique: true },
  paymentDate: { type: Date },
  receiptUrl: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
