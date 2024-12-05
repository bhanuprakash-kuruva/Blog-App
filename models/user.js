
const mongoose = require('mongoose')
const { createHmac, randomBytes } = require('crypto')
const { createToken } = require('../services/authentication')
const Blog = require('./blog')
const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    salt: {
        type: String
    },
    password: {
        type: String,
        required: true
    },
    profileImgURL: {
        type: String,
        default: '/user.png'
    },
    role: {
        type: String,
        enum: ['USER', 'ADMIN'],
        default: 'USER'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    blogs: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'blog',
        
    }],
    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        
    }],
    following: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        
    }],
}, { timestamps: true })

userSchema.pre('save', function (next) {
    const user = this
    if (!user.isModified('password')) return
    const salt = randomBytes(16).toString();
    const hashedPassword = createHmac('sha256', salt)
        .update(user.password)
        .digest('hex')
    this.salt = salt
    this.password = hashedPassword
    next()
})

userSchema.static('matchPassword', async function (email, password) {
    const user = await this.findOne({ email })
    // console.log(password)
    if (!user) {
        throw new Error('User not found')
    }
    // console.log(user)
    const salt = user.salt;
    // console.log(user.salt)
    const hashedPassword = user.password

    const userProvidedHash = createHmac('sha256', salt)
        .update(password)
        .digest('hex')
    // console.log(hashedPassword)
    // console.log(userProvidedHash)
    if (hashedPassword !== userProvidedHash) {
        throw new Error('Incorrect password')
    }
    const token = createToken(user)
    // console.log(token)
    return token;
})

const User = mongoose.model('user', userSchema)
module.exports = User
