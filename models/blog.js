const mongoose = require('mongoose')

const blogSchema = new mongoose.Schema({
    title:{
        type:String,
        required:true
    },
    body:{
        type:String,
        required:true
    },
    imageURL:{
        type:String,
        required:true
    },
    createdBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'user'
    },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'user' }]
},{timestamps:true})

const blog = mongoose.model('blog',blogSchema)

module.exports = blog;