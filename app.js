const express = require('express');
const path = require('path');
const route = require('./routes/route');
const morgan = require('morgan');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt')
const cookieparser = require('cookie-parser');
const authenticateToken = require('./middlewares/checkLog'); // adjust if needed
const dotenv = require('dotenv');
dotenv.config();
const jwt = require('jsonwebtoken');
const makeMessage = require('./middlewares/addMessage');
const Grade = require('./models/Grade');

const app = express();


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));
app.use(morgan('tiny'));
app.use(cookieparser());
app.use(express.json());
// Global notification middleware
app.use(async (req, res, next) => {
  if (req.user) {
    const Notification = require('./models/notification'); // adjust if needed
    res.locals.notifications = await Notification.find({
      $or: [{ userId: req.user._id }, { userId: null }]
    }).sort({ createdAt: -1 }).limit(5);

    res.locals.unreadCount = await Notification.countDocuments({
      $or: [{ userId: req.user._id }, { userId: null }],
      isRead: false
    });
  } else {
    res.locals.notifications = [];
    res.locals.unreadCount = 0;
  }
  next();
});
app.use(makeMessage); // Assuming makeMessage is defined in middlewares/addMessage.js
app.use('/', route);


app.use((req, res, next)=>{
  const user = req.cookies.token ? jwt.verify(req.cookies.token, 'your_jwt_secret') : null;
  res.locals.user = user;
    res.render('404', { title: '404 Not Found' , user: user });
})
const User = require('./models/User'); // Adjust the path as needed

async function createSuperAdmin() {
  const existingAdmin = await User.findOne({ role: 'admin' });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 10); // default password

    const admin = new User({
      name: 'Super Admin',
      email: 'admin@gmail.com',
      password: hashedPassword,
      role: 'admin'
    });

    await admin.save();
    console.log('👑 Super Admin created: email=admin@eduwave.com, password=admin123');
  } else {
    console.log('✅ Super Admin already exists');
  }
}
app.listen(3000, () => {
  console.log('🚀 Server running on http://localhost:3000');

  mongoose.connect(process.env.dbURL)
    .then(async () => {
      console.log('✅ Connected to MongoDB');
      await createSuperAdmin(); // <- Create super admin after DB connection
    })
    .catch((err) => {
      console.error('❌ Error connecting to MongoDB:', err.message);
    });
});
