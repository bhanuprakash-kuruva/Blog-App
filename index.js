const express = require('express');
const path = require('path');
const userRoute = require('./routes/user');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser')
const {checkAuthCookie} = require('./middlewares/auth')
const blogRouter = require('./routes/blog')
const Blog = require('./models/blog')
const Notification = require('./models/notifications')
const app = express();

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



// Connect to MongoDB
mongoose.connect('mongodb+srv://bhanuprakashkuruva:Bhanujbg@cluster0.zsgxw.mongodb.net/blogify?retryWrites=true&w=majority&appName=Cluster0')
    .then(() => {
        console.log('MongoDB connected...');
    })
    .catch((err) => {
        console.error('MongoDB connection error:', err);
    });


const PORT = 7001;
app.listen(PORT, () => {
    console.log(`Server running at port ${PORT}...`);
});
