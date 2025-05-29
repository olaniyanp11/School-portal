const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jsonwebtoken = require('jsonwebtoken');
const authenticateToken = require('../middlewares/checkLog');

router.get('/', (req,res)=>{
    res.render('index', { title: 'Home' });
})
router.get('/register', (req, res) => {
    res.render('register', { title: 'Register', error:null });
})
router.get('/login', (req, res) => {
    res.render('login', { title: 'Login', error:null });
})


// post routes 
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const existingUser = await User.findOne({ email: email });
        if (existingUser) {
            return res.render('register', { title: 'Register', error: 'Email already exists.' });
        }
        if (password.length < 6) {
            return res.render('register', { title: 'Register', error: 'Password must be at least 6 characters long.' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            name: name,
            email: email,
            password: hashedPassword
        });
        await newUser.save();
        res.render('login', { title: 'Login', error: null });
    }
    catch(error){
        console.error(error);
        res.render('register', { title: 'Register', error: 'An error occurred while registering.' });
    }
})

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email:email});
        if (!user) {
            return res.render('login', { title: 'Login', error: 'Invalid email or password.' });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.render('login', { title: 'Login', error: 'Invalid email or password.' });
        }
        const token = jsonwebtoken.sign({ userId: user._id }, 'your_jwt_secret', { expiresIn: '1h' });
        res.cookie('token', token, { httpOnly: true });
        res.redirect('/dashboard');
    }catch(error){
        res.render('login', { title: 'Login', error: 'An error occurred while logging in.' });
    }
})

router.get('/dashboard',authenticateToken, async (req, res) => {
    const user = await User.findById(req.user.userId);
    if (!user) {
        return res.redirect('/login');
    }
    res.render('protected/dashboard', { title: 'Dashboard', user: user });
})
router.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/login');
})
module.exports = router;