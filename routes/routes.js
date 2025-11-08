const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../model/admins'); 
const authenticateToken = require('../middleware/auth'); 
const upload = require('../middleware/upload'); 

router.get('/', (req, res) => {
    res.render('home'); 
});


router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
  
    try {
      const existingAdmin = await Admin.findOne({ email: email });
      if (existingAdmin) {
        return res.render('register', { errorMessage: 'Email already exists' });
      }

      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z]).{6,}$/;
      if (!passwordRegex.test(password)) {
        return res.render('register', { errorMessage: 'Password must be at least 6 characters long and contain at least one uppercase and one lowercase letter' });
      }
      const hashedPassword = await bcrypt.hash(password, 10);

      const newAdmin = new Admin({
        name: name,
        email: email,
        password: hashedPassword
      });
  
      await newAdmin.save();
      console.log('Admin registered successfully');
  
      res.redirect('/login');
    } catch (error) {
      console.error('Error registering admin:', error);
      res.render('register', { errorMessage: 'Server error' });
    }
  });
  
router.get('/register', (req, res) => {
    res.render('register'); 
});

router.get('/login', (req, res) => {
    res.render('login');
});

router.get('/table', (req, res) => {
    res.render('table');
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const admin = await Admin.findOne({ email: email });
        if (!admin) {
            return res.render('login', { errorMessage: 'Admin not found' });
        }

        const isPasswordValid = await bcrypt.compare(password, admin.password);
        if (!isPasswordValid) {
            return res.render('login', { errorMessage: 'Invalid password' });
        }

        const payload = {
            admin: {
                id: admin.id
            }
        };

        const jwtSecret = process.env.JWT_SECRET || "4715aed3c946f7b0a38e6b534a9583628d84e96d10fbc04700770d572af3dce43625dd";
        jwt.sign(payload, jwtSecret, { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            res.cookie('token', token, { httpOnly: true });
            res.redirect('/dashboard');
        });

    } catch (error) {
        console.error('Error logging in admin:', error);
        res.render('login', { errorMessage: 'Server error' });
    }
});
 
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const admin = await Admin.findById(req.admin.id).select('-password');
        if (!admin) {
            return res.status(404).send('Admin not found');
        }
        res.render('profile', { admin });
    } catch (error) {
        console.error('Error fetching admin:', error);
        res.status(500).send('Server error');
    }
});

router.post('/profile', authenticateToken, upload.single('picture'), async (req, res) => {
    try {
        const { name, bio } = req.body;
        const picture = req.file ? '/images/' + req.file.filename : null;

        const updatedFields = { name, bio };
        if (picture) {
            updatedFields.picture = picture;
        }

        const admin = await Admin.findByIdAndUpdate(req.admin.id, updatedFields, { new: true });

        if (!admin) {
            return res.status(404).send('Admin not found');
        }

        res.render('profile', { admin, successMessage: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating admin profile:', error);
        res.status(500).send('Server error');
    }
});

router.get('/dashboard', authenticateToken, async (req, res) => {
    try {
        const admin = await Admin.findById(req.admin.id).select('-password');
        if (!admin) {
            return res.status(404).send('Admin not found');
        }
        res.render('dashboard', { admin });
    } catch (error) {
        console.error('Error fetching admin:', error);
        res.status(500).send('Server error');
    }
});
router.get('/logout', (req, res) => {
    res.clearCookie('token'); 
    res.redirect('/login'); 
});
module.exports = router;