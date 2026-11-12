const { Schema, model } = require("mongoose");
const categories = require("../services/blogCategories");

const blogSchema = new Schema({
   title:{
    type: String,
    required:true,
   },
   body:{
    type:String,
    required:true,
   },
   category: {
    type: String,
    enum: categories,
    default: "Other",
   },
   coverImageURL:{
    type:String,
   },
   createdBy:{
    type: Schema.Types.ObjectId,
    ref: "user",
   },
   likes: [{
    type: Schema.Types.ObjectId,
    ref: "user",
   }],

},{timestamps:true });

const Blog = model('blog',blogSchema);

module.exports = Blog;
