const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const ObjectId = mongoose.Schema.Types.ObjectId;
const Blog = require('../models/blog');
const Comment = require('../models/comment');
const Notification = require('../models/notifications');
const path = require('path');
const router = express.Router();
const { verifyToken } = require('../services/authentication');
const User = require('../models/user');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.resolve('./public/uploads/'));
    },
    filename: function (req, file, cb) {
        const fileName = `${Date.now()}-${file.originalname}`;
        cb(null, fileName);
    }
});

const upload = multer({ storage: storage });

// Render Add Blog Form
router.get('/addBlog', async (req, res) => {
    return res.render('addBlog', {
        user: req.user
    });
});

// Search Blogs by Title
router.get('/search', async (req, res) => {
    const { title } = req.query;
    if (!title) {
        return res.status(400).send("Please provide a search term.");
    }
    
    try {
        const blogs = await Blog.find({ title: new RegExp(title, 'i') }).populate('createdBy');
        return res.render('searchResults', {
            user: req.user,
            blogs, 
            searchTerm: title
        });
    } catch (error) {
        console.error('Error searching for blogs:', error);
        return res.status(500).send('Internal server error');
    }
});

// Create a New Blog Post
router.post('/:id', upload.single('coverImage'), async (req, res) => {
    const currId = req.params.id;
    try {
        const { title, body } = req.body;
        
        // Create a new blog post
        const blog = await Blog.create({
            body,
            title,
            createdBy: currId,
            imageURL: `/uploads/${req.file.filename}`
        });

        // Add the blog's ID to the user's blogs array
        await User.findByIdAndUpdate(currId, {
            $push: { blogs: blog._id }
        });

        // Redirect to the new blog page
        return res.redirect(`/blog/${blog._id}`);
    } catch (error) {
        console.error("Error creating blog:", error);
        res.status(500).send("Internal server error");
    }
});

// View a Blog and its Comments
router.get('/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const comments = await Comment.find({ blogId: id }).populate("createdBy");
        const blog = await Blog.findById(id).populate('createdBy');
        return res.render('blog', {
            user: req.user,
            blog,
            comments
        });
    } catch (error) {
        console.error("Error retrieving blog or comments:", error);
        return res.status(500).send("Internal server error");
    }
});

router.post('/delete/:id', async (req, res) => {
    const blogId = req.params.id;

    try {
        // Find the blog to ensure it exists and is created by the current user
        const blog = await Blog.findOne({ _id: blogId, createdBy: req.user._id });
        if (!blog) {
            return res.status(403).send('You are not authorized to delete this blog.');
        }

        // Delete the blog
        await Blog.findByIdAndDelete(blogId);

        // Remove the blog reference from the user's blogs array
        await User.findByIdAndUpdate(req.user._id, { $pull: { blogs: blogId } });
        const user = await User.findOne({_id:req.user._id})
        return res.render('profile',{
            user,
            currId:user._id
        }); // Redirect to user's profile or a list of their blogs
    } catch (error) {
        console.error('Error deleting blog:', error);
        return res.status(500).send('Internal server error');
    }
});

// Add a Comment on a Blog
router.post('/comment/:id', async (req, res) => {
    const blogId = req.params.id;
    try {
        const blog = await Blog.findById(blogId).populate('createdBy');
        if (!blog) {
            return res.status(404).send('Blog not found');
        }
        
        const blogOwnerId = blog.createdBy._id;

        // Create a new comment
        await Comment.create({
            content: req.body.content,
            blogId,
            createdBy: req.user._id
        });
        const user = await User.findOne({_id:req.user._id})
        // Send a notification to the blog owner about the comment
        // await Notification.create({
        //     sender: req.user._id,
        //     user: new ObjectId(blogOwnerId),
        //     type: 'comment',
        //     message: `User ${req.user.name} commented on your blog.`,  // Display the user's name
        //     link: `/blog/${blogId}`  // Link to the blog
        // });
        await Notification.create({
            content:req.body.content,
            sender: req.user._id,
            user: blogOwnerId,  // No need for `new ObjectId()`
            type: 'comment',
            message: `User ${user.fullName} commented on your blog.`,
            link: `/blog/${blogId}`
        });
        

        return res.redirect(`/blog/${blogId}`);
    } catch (error) {
        console.error("Error posting comment or creating notification:", error);
        return res.status(500).send('Internal server error');
    }
});

// routes/blog.js

router.post('/like/:id', async (req, res) => {
    const blogId = req.params.id;
    const userId = req.user._id;

    try {
        const blog = await Blog.findById(blogId);
        
        // Check if user already liked the blog
        const liked = blog.likes.includes(userId);

        if (liked) {
            // If liked, remove user from likes
            await Blog.findByIdAndUpdate(blogId, { $pull: { likes: userId } });
        } else {
            // Otherwise, add user to likes
            await Blog.findByIdAndUpdate(blogId, { $addToSet: { likes: userId } });
        }

        res.redirect(`/blog/${blogId}`);
    } catch (error) {
        console.error("Error liking/unliking blog:", error);
        res.status(500).send("Internal server error");
    }
});


module.exports = router;
