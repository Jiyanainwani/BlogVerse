const express = require("express");
const app = express();
const path = require("path");
const port = process.env.PORT||8000;
const userRoute = require("./routes/user"); 
const blogRoute = require("./routes/blog");
const Blog = require("./models/blog");
require("dotenv").config(); 
console.log('MONGO_URL:', process.env.MONGO_URL);



const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const { checkForAuthenticationCookie } = require("./middlewares/authentication");

mongoose.connect(process.env.MONGO_URL).then((e)=> console.log("mongodb connected"));

app.set('view engine','ejs');
app.set('views',path.resolve("./views"));

app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(checkForAuthenticationCookie("token"));
app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});
app.use(express.static(path.resolve('public')));

app.get('/',async (req,res)=>{
    const allBlogs= await Blog.find({});
    res.render("home",{
    user: req.user,
    blogs:allBlogs,
    });
});

app.use("/user",userRoute);
app.use("/blog",blogRoute);

app.listen(port,()=>{
    console.log(`server started at port ${port}`)
})
