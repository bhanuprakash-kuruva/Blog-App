const mongoose = require('mongoose')
const express = require('express');
const ObjectId = mongoose.Schema.Types.ObjectId
const User = require('../models/user');
const bcrypt = require('bcrypt'); // For password hashing
const router = express.Router();
const Notification = require('../models/notifications');
// Render sign-in page
router.get('/signin', (req, res) => {
    return res.render('signin');
});

router.get('/about',(req,res)=>{
    return res.render('about',{
        user:req.user
    })
})

router.get('/profile/:createId/:currentId', async (req, res) => {
    const id1 = req.params.createId;
    const id2 = req.params.currentId;
    console.log(id1)
    console.log(id2)
    try {
        const user = await User.findById({_id:id1}).populate('blogs');
        res.render('anotherProfile', { 
            user,
            currId:id2
         });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

// Route to get the followers and following lists of a user
router.get('/followers-following/:id/:id2', async (req, res) => {
    const userId = req.params.id;
    const curr = req.params.id2;
    try {
        const user = await User.findOne({_id:userId})
            .populate('followers', 'fullName profileImgURL')  // Populate followers with name and profile image
            .populate('following', 'fullName profileImgURL'); // Populate following with name and profile image

        if (!user) {
            return res.status(404).send('User not found');
        }

        res.render('followers-following', { user,currId:curr });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

router.get('/profile/:id', async (req, res) => {
    const id = req.params.id;
    
    try {
        const user = await User.findById({_id:id}).populate('blogs');
        res.render('profile', { 
            user,
            currId:id
         });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

// Render sign-up page
router.get('/signup', (req, res) => {
    return res.render('signup');
});

// Handle sign-up
router.post('/signup', async (req, res) => {
    res.set('Content-Type', 'application/json');
    const { fullName, email, password } = req.body;

    try {
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already in use.' });
        }

        // Create and save new user (password is hashed in pre-save middleware)
        const newUser = await User.create({
            fullName,
            email,
            password
        });

        // Redirect to login page after successful signup
        return res.redirect('/user/signin');
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'An error occurred during signup', error: error.message });
    }
});

// Handle sign-in
router.post('/signin', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Authenticate the user and generate token
        const token = await User.matchPassword(email, password);

        // Set the token in an HttpOnly cookie (for secure client-side handling)
       return res.cookie('token', token).redirect('/');


    } catch (error) {
        console.error(error);
        return res.render('signin',{
            error:"Incorrect Credentials"
        })
    }
});


// router.get('/addFollower/:userId/:currId', async (req, res) => {
//     const { userId, currId } = req.params;
//     console.log('notification created')
//     try {
//         // Update followers and following lists with uniqueness
//         if(userId!==currId){
//             const user1 = await User.findOne({_id:currId})
//             const user2 = await User.findOne({_id:userId})
            
//             await User.findByIdAndUpdate(userId, { $addToSet: { followers: currId } });
//         await User.findByIdAndUpdate(currId, { $addToSet: { following: userId } });
//         await Notification.create({
//             content: 'User requested to follow you',
//             sender:user1._id,
//             user: user2._id,
//             type: 'follow',
//             message: `User ${currId} has followed you.`,
//         });
//         }

//         // Retrieve updated user data
//         const user = await User.findById(userId).populate('blogs');

//         // Render profile with updated data
//         return res.render('anotherProfile', {
//             user,
//             currId
//         });
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Server error');
//     }
// });

router.get('/addFollower/:userId/:currId', async (req, res) => {
    const { userId, currId } = req.params;
    console.log('Follow request initiated');

    try {
        // Prevent self-following
        if (userId === currId) {
            return res.status(400).send('You cannot follow yourself.');
        }

        const user1 = await User.findById(currId);
        const user2 = await User.findById(userId);

        // Handle invalid users
        if (!user1 || !user2) {
            return res.status(404).send('User not found.');
        }

        // Update followers and following lists with uniqueness
        await User.findByIdAndUpdate(userId, { $addToSet: { followers: currId } });
        await User.findByIdAndUpdate(currId, { $addToSet: { following: userId } });

        // Prevent duplicate notifications
        const existingNotification = await Notification.findOne({
            sender: currId,
            user: userId,
            type: 'follow'
        });

        if (!existingNotification) {
            await Notification.create({
                content: 'User requested to follow you',
                sender: user1._id,
                user: user2._id,
                type: 'follow',
                message: `User ${user1.fullName} has followed you.`,
            });
            console.log('Notification created');
        }

        // Retrieve updated user data
        const user = await User.findById(userId).populate('blogs');

        // Render profile with updated data
        return res.render('anotherProfile', {
            user,
            currId,
            message: 'Follow request sent successfully.'
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});


router.get('/removeFollower/:userId/:id', async (req, res) => {
    
    const userToUnfollow = req.params.userId;
    const currentUserId = req.params.id;
    
    const u = await User.findOne({_id:currentUserId})
    if (u.following.includes(userToUnfollow)) {
        await User.findByIdAndUpdate(currentUserId, { $pull: { following: userToUnfollow } });
        await User.findByIdAndUpdate(userToUnfollow, { $pull: { followers: currentUserId } });
        await Notification.create({
            content: 'User follows you',
            sender:currentUserId,
            user: userToUnfollow,
            type: 'follow',
            message: `User ${currentUserId} has unfollowed you.`,
        });
        
    }
    const user = await User.findOne({_id:userToUnfollow}).populate('blogs');
    return res.render('anotherProfile', {
        user,
        currId:currentUserId
    });
});
// Render edit profile page
router.get('/edit-profile/:id', async (req, res) => {
    const userId = req.params.id;

    try {
        const user = await User.findOne({_id:userId});
        if (!user) {
            return res.status(404).send('User not found');
        }
        
        res.render('edit', { user });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

// Handle profile update
router.post('/edit-profile/:id', async (req, res) => {
    const userId = req.params.id;
    const { fullName, email, profileImgURL } = req.body;

    try {
        // Update user profile information
        await User.findByIdAndUpdate(userId, { fullName, email, profileImgURL });
        
        res.redirect(`/user/profile/${userId}/${userId}`); // Redirect to profile page after update
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

router.get('/notifications/setRead/:id', async (req, res) => {
    // The id is not needed here, since you're using the logged-in user's ID (req.user._id)
    // Mark notifications as read for the logged-in user
    const noti =await Notification.updateMany(
        { user: req.user._id, isRead: false },
        { $set: { isRead: true } }
    );
    console.log(noti)
    // Retrieve all notifications for the logged-in user
    const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).populate('sender');

    // Render the notifications page with the updated notifications list
    res.render('notifications', { notifications, user: req.user });
});

router.get('/notifications/:id', async (req, res) => {
    const id = req.params.id
    
    
    if (!req.user) {
        return res.redirect('/user/signin'); // Redirect if user is not authenticated
    }
    const notifications = await Notification.find({ user:req.user._id }).sort({ createdAt: -1 }).populate('sender');
    res.render('notifications', { notifications,user:req.user });
});

router.get('/logout',(req,res)=>{
    res.clearCookie('token').redirect('/');
})

module.exports = router;
