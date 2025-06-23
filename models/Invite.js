const { default: mongoose } = require("mongoose");

const inviteSchema = mongoose.Schema({
  code: { type: String, unique: true, required: true },
  role: { type: String, enum: ['lecturer', 'admin'], required: true },
  isUsed: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 7*24*60*60*1000) }
}, { timestamps: true });
const Invite = mongoose.model('Invite', inviteSchema);
module.exports = Invite
