const express = require('express');
const path = require('path');
const dotenv = require('dotenv')
const userRoute = require('./routes/user');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser')
const {checkAuthCookie} = require('./middlewares/auth')
const blogRouter = require('./routes/blog')
const Blog = require('./models/blog')
const Notification = require('./models/notifications')
const app = express();
dotenv.config()
// Set view engine and views directory
app.set('view engine', 'ejs');
app.set('views', path.resolve('./views'));

// Middleware
app.use(express.static(path.resolve('./public')))
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());
app.use(checkAuthCookie('token'))
// Middleware to get unread notifications count


app.use('/user', userRoute);
app.use('/blog', blogRouter);
async function getUnreadNotificationsCount(req, res, next) {
    if (req.user) {
        // Fetch count of unread notifications for the logged-in user
        const unreadCount = await Notification.countDocuments({ user: req.user._id, isRead: false });
        res.locals.unreadCount = unreadCount; // Pass to locals for use in navbar
    }
    next();
}

// Apply the middleware to relevant routes (or globally)
app.use(getUnreadNotificationsCount);

app.get('/', async(req, res) => {
    const allBlogs = await Blog.find({})
    return res.render('home',{
        user:req.user,
        blogs:allBlogs
    });
});

const MONGO_URL = process.env.MONGO_URI
const PORT = process.env.PORT || 7001
// Connect to MongoDB
mongoose.connect(MONGO_URL)
    .then(() => {
        console.log('MongoDB connected...');
    })
    .catch((err) => {
        console.error('MongoDB connection error:', err);
    });



app.listen(PORT, () => {
    console.log(`Server running at port ${PORT}...`);
});
