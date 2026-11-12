require("dotenv").config();

const express = require("express");
const app = express();
const path = require("path");
const port = process.env.PORT||8000;
const userRoute = require("./routes/user");
const blogRoute = require("./routes/blog");
const Blog = require("./models/blog");
const blogCategories = require("./services/blogCategories");
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
  res.locals.error = req.query.error || "";
  next();
});
app.use(express.static(path.resolve('public')));

app.get('/',async (req,res)=>{
    const search = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
    const category = typeof req.query.category === "string" && blogCategories.includes(req.query.category)
      ? req.query.category
      : "";
    const filters = {};
    if (search) {
      const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filters.$or = [
        { title: { $regex: safeSearch, $options: "i" } },
        { body: { $regex: safeSearch, $options: "i" } },
      ];
    }
    if (category) filters.category = category;
    const totalBlogs = await Blog.countDocuments(filters);
    const pageSize = 9;
    const pageCount = Math.max(1, Math.ceil(totalBlogs / pageSize));
    const currentPage = Math.min(Math.max(1, Number.parseInt(req.query.page, 10) || 1), pageCount);
    const allBlogs = await Blog.find(filters).sort({ createdAt: -1 }).skip((currentPage - 1) * pageSize).limit(pageSize);
    res.render("home",{
    user: req.user,
    blogs:allBlogs,
    categories: blogCategories,
    search,
    selectedCategory: category,
    totalBlogs,
    currentPage,
    pageCount,
    });
});

app.use("/user",userRoute);
app.use("/blog",blogRoute);

app.listen(port,()=>{
    console.log(`server started at port ${port}`)
})
