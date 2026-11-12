const { Router } = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { randomUUID } = require("crypto");
const Blog = require("../models/blog");
const Comment = require("../models/comment");
const User = require("../models/user");
const categories = require("../services/blogCategories");
const requireAuthentication = require("../middlewares/requireAuthentication");
const { storage: cloudinaryStorage } = require("../cloudinary");

const uploadDirectory = path.join(__dirname, "..", "public", "uploads");
fs.mkdirSync(uploadDirectory, { recursive: true });

const diskStorage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDirectory),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${randomUUID()}${extension}`);
  },
});
const cloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET,
);
const upload = multer({
  storage: cloudinaryConfigured ? cloudinaryStorage : diskStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.mimetype)) {
      return callback(new Error("Choose a JPG, PNG, or WEBP image."));
    }
    callback(null, true);
  },
});

function handleCoverUpload(req, res, next) {
  upload.single("coverImage")(req, res, (error) => {
    if (!error) return next();
    const message = error.code === "LIMIT_FILE_SIZE"
      ? "Cover images must be 5 MB or smaller."
      : error.message;
    const destination = req.params.id ? `/blog/edit/${req.params.id}` : "/blog/add-new";
    return res.redirect(`${destination}?error=${encodeURIComponent(message)}`);
  });
}

function validId(id) {
  return /^[a-f\d]{24}$/i.test(id);
}

function safeCategory(value) {
  return categories.includes(value) ? value : "Other";
}

function coverImageURL(file) {
  if (!file) return "/images/default.jpg";
  return cloudinaryConfigured ? file.path : `/uploads/${file.filename}`;
}

const router = Router();

router.get("/add-new", requireAuthentication, (req, res) => {
  res.render("addBlog", { categories, blog: null, error: req.query.error || "" });
});

router.post("/", requireAuthentication, handleCoverUpload, async (req, res) => {
  const title = String(req.body.title || "").trim();
  const body = String(req.body.body || "").trim();
  if (!title || !body) return res.redirect("/blog/add-new?error=Add%20a%20title%20and%20story%20before%20publishing.");

  const blog = await Blog.create({
    title,
    body,
    category: safeCategory(req.body.category),
    createdBy: req.user._id,
    coverImageURL: coverImageURL(req.file),
  });
  res.redirect(`/blog/${blog._id}`);
});

router.get("/edit/:id", requireAuthentication, async (req, res) => {
  if (!validId(req.params.id)) return res.sendStatus(404);
  const blog = await Blog.findOne({ _id: req.params.id, createdBy: req.user._id });
  if (!blog) return res.sendStatus(404);
  res.render("addBlog", { blog, categories, error: req.query.error || "" });
});

router.post("/edit/:id", requireAuthentication, handleCoverUpload, async (req, res) => {
  if (!validId(req.params.id)) return res.sendStatus(404);
  const blog = await Blog.findOne({ _id: req.params.id, createdBy: req.user._id });
  if (!blog) return res.sendStatus(404);

  const title = String(req.body.title || "").trim();
  const body = String(req.body.body || "").trim();
  if (!title || !body) return res.redirect(`/blog/edit/${blog._id}?error=Add%20a%20title%20and%20story%20before%20saving.`);
  blog.title = title;
  blog.body = body;
  blog.category = safeCategory(req.body.category);
  if (req.file) blog.coverImageURL = coverImageURL(req.file);
  await blog.save();
  res.redirect(`/blog/${blog._id}`);
});

router.post("/delete/:id", requireAuthentication, async (req, res) => {
  if (!validId(req.params.id)) return res.sendStatus(404);
  const blog = await Blog.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
  if (!blog) return res.sendStatus(404);
  await Comment.deleteMany({ blogId: blog._id });
  res.redirect(`/user/${req.user._id}`);
});

router.post("/:id/like", requireAuthentication, async (req, res) => {
  if (!validId(req.params.id)) return res.sendStatus(404);
  const blog = await Blog.findById(req.params.id);
  if (!blog) return res.sendStatus(404);
  const hasLiked = (blog.likes || []).some((id) => String(id) === String(req.user._id));
  await Blog.updateOne(
    { _id: blog._id },
    hasLiked ? { $pull: { likes: req.user._id } } : { $addToSet: { likes: req.user._id } },
  );
  res.redirect(`/blog/${blog._id}`);
});

router.post("/:id/bookmark", requireAuthentication, async (req, res) => {
  if (!validId(req.params.id)) return res.sendStatus(404);
  const blog = await Blog.findById(req.params.id).select("_id");
  if (!blog) return res.sendStatus(404);
  const user = await User.findById(req.user._id).select("bookmarks");
  if (!user) return res.redirect("/user/signin");
  const hasBookmarked = (user.bookmarks || []).some((id) => String(id) === String(blog._id));
  await User.updateOne(
    { _id: user._id },
    hasBookmarked ? { $pull: { bookmarks: blog._id } } : { $addToSet: { bookmarks: blog._id } },
  );
  res.redirect(`/blog/${blog._id}`);
});

router.post("/comment/:blogId", requireAuthentication, async (req, res) => {
  if (!validId(req.params.blogId)) return res.sendStatus(404);
  const content = String(req.body.content || "").trim();
  const blog = await Blog.findById(req.params.blogId).select("_id");
  if (!blog) return res.sendStatus(404);
  if (!content || content.length > 2000) return res.redirect(`/blog/${blog._id}`);
  await Comment.create({ content, blogId: blog._id, createdBy: req.user._id });
  res.redirect(`/blog/${blog._id}#conversation`);
});

router.post("/comment/:commentId/edit", requireAuthentication, async (req, res) => {
  if (!validId(req.params.commentId)) return res.sendStatus(404);
  const content = String(req.body.content || "").trim();
  const comment = await Comment.findOne({ _id: req.params.commentId, createdBy: req.user._id });
  if (!comment) return res.sendStatus(404);
  if (content && content.length <= 2000) {
    comment.content = content;
    await comment.save();
  }
  res.redirect(`/blog/${comment.blogId}#conversation`);
});

router.post("/comment/:commentId/delete", requireAuthentication, async (req, res) => {
  if (!validId(req.params.commentId)) return res.sendStatus(404);
  const comment = await Comment.findOneAndDelete({ _id: req.params.commentId, createdBy: req.user._id });
  if (!comment) return res.sendStatus(404);
  res.redirect(`/blog/${comment.blogId}#conversation`);
});

router.get("/:id", async (req, res) => {
  if (!validId(req.params.id)) return res.sendStatus(404);
  const blog = await Blog.findById(req.params.id).populate("createdBy");
  if (!blog || !blog.createdBy) return res.sendStatus(404);
  const comments = await Comment.find({ blogId: blog._id }).populate("createdBy").sort({ createdAt: 1 });
  const wordCount = blog.body.trim().split(/\s+/).filter(Boolean).length;
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 200));
  let isLiked = false;
  let isBookmarked = false;
  if (req.user?._id) {
    isLiked = (blog.likes || []).some((id) => String(id) === String(req.user._id));
    const user = await User.findById(req.user._id).select("bookmarks");
    isBookmarked = (user?.bookmarks || []).some((id) => String(id) === String(blog._id));
  }
  res.render("blog", {
    blog,
    comments,
    readingMinutes,
    isLiked,
    isBookmarked,
    likeCount: (blog.likes || []).length,
  });
});
module.exports = router;
