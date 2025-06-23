#!/bin/bash

echo "📦 Updating department fields and creating Department model..."
echo "-------------------------------------------------------------"

# 1. Create Department.js
cat > models/Department.js <<'EOF'
const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  faculty: { type: String },
  hod: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Department', departmentSchema);
EOF

echo "✅ Created: models/Department.js"

# 2. Replace in User.js
if grep -q "department: { type: String" models/User.js; then
  sed -i 's/department: { type: String/department: { type: mongoose.Schema.Types.ObjectId, ref: '\''Department'\''/g' models/User.js
  echo "✅ Updated: models/User.js"
else
  echo "⚠️  Skipped: models/User.js — pattern not found"
fi

# 3. Replace in Course.js
if grep -q "department: { type: String" models/Course.js; then
  sed -i 's/department: { type: String/department: { type: mongoose.Schema.Types.ObjectId, ref: '\''Department'\''/g' models/Course.js
  echo "✅ Updated: models/Course.js"
else
  echo "⚠️  Skipped: models/Course.js — pattern not found"
fi

echo "-------------------------------------------------------------"
echo "🎉 Migration complete. Don't forget to update existing DB records!"
