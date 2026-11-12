const {Router} = require("express");
const User = require('../models/user');
const Blog = require('../models/blog');
const router = Router();

router.get('/signin',(req,res)=>{
    return res.render("signin");
});
 


router.get('/signup',(req,res)=>{
    return res.render("signup");
});

router.post('/signup',async (req,res)=>{
    const fullName = String(req.body.fullName || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    try {
        await User.create({ fullName, email, password });
        return res.redirect("/");
    } catch (error) {
        if (error.code === 11000 && error.keyPattern?.email) {
            return res.status(409).render("signup", {
                error: "An account with this email already exists. Sign in instead.",
                fullName,
                email,
            });
        }
        throw error;
    }
});

router.post("/signin",async (req,res,next)=>{
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    
    try {
        const token = await User.matchPasswordandGenerateToken(email,password);
        
        return res.cookie('token',token,{ httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" }).redirect("/");
    } catch (error) {
        if (error.code === "AUTH_INVALID_CREDENTIALS") {
            return res.status(401).render('signin', { error: "Incorrect email or password.", email });
        }
        return next(error);
    }
});

router.get('/logout',(req,res)=>{
    res.clearCookie('token').redirect("/");
})

router.get('/bookmarks', async (req, res) => {
    if (!req.user?._id) return res.redirect('/user/signin');
    const user = await User.findById(req.user._id).select('bookmarks');
    const blogs = user?.bookmarks?.length
        ? await Blog.find({ _id: { $in: user.bookmarks } }).sort({ createdAt: -1 })
        : [];
    return res.render('author', { author: req.user, blogs, isOwner: true, isBookmarks: true });
});

router.get('/:id', async (req, res) => {
    if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.sendStatus(404);
    const author = await User.findById(req.params.id).select('fullName profileImageUrl');
    if (!author) return res.sendStatus(404);
    const blogs = await Blog.find({ createdBy: author._id }).sort({ createdAt: -1 });
    return res.render('author', {
        author,
        blogs,
        isOwner: Boolean(req.user?._id && String(req.user._id) === String(author._id)),
        isBookmarks: false,
    });
});

module.exports = router;
