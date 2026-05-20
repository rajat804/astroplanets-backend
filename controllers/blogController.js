const Blog = require('../models/Blog');

// @desc    Get all blogs (public)
// @route   GET /api/blogs
// @access  Public
const getAllBlogs = async (req, res) => {
  const { tag, page = 1, limit = 6 } = req.query;

  try {
    let query = { isPublished: true };
    if (tag) query.tag = tag;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const blogs = await Blog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('title slug tag image excerpt author readTime createdAt views likes');

    const total = await Blog.countDocuments(query);

    // Get all unique tags for filter
    const allTags = await Blog.distinct('tag', { isPublished: true });

    res.json({
      blogs,
      tags: allTags,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error('Get blogs error:', error);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

// @desc    Get single blog by slug
// @route   GET /api/blogs/:slug
// @access  Public
const getBlogBySlug = async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug, isPublished: true });

    if (!blog) {
      return res.status(404).json({ msg: 'Blog not found' });
    }

    // Increment views
    blog.views += 1;
    await blog.save();

    // Get related blogs (same tag)
    const relatedBlogs = await Blog.find({
      _id: { $ne: blog._id },
      tag: blog.tag,
      isPublished: true,
    })
      .limit(3)
      .select('title slug image excerpt createdAt');

    res.json({ blog, relatedBlogs });
  } catch (error) {
    console.error('Get blog error:', error);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

// @desc    Get all blogs (admin)
// @route   GET /api/blogs/admin
// @access  Private/Admin
const getAllBlogsAdmin = async (req, res) => {
  try {
    const blogs = await Blog.find()
      .sort({ createdAt: -1 })
      .populate('createdBy', 'fullName email');

    const stats = {
      total: await Blog.countDocuments(),
      published: await Blog.countDocuments({ isPublished: true }),
      drafts: await Blog.countDocuments({ isPublished: false }),
      totalViews: await Blog.aggregate([{ $group: { _id: null, total: { $sum: '$views' } } }]),
    };

    res.json({ blogs, stats });
  } catch (error) {
    console.error('Get blogs admin error:', error);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

// @desc    Get single blog by ID (admin)
// @route   GET /api/blogs/admin/:id
// @access  Private/Admin
const getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ msg: 'Blog not found' });
    }
    res.json(blog);
  } catch (error) {
    console.error('Get blog error:', error);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

// @desc    Create blog (admin)
// @route   POST /api/blogs/admin
// @access  Private/Admin
const createBlog = async (req, res) => {
  const {
    title,
    tag,
    image,
    excerpt,
    content,
    author,
    readTime,
    tags,
    seoTitle,
    seoDescription,
  } = req.body;

  try {
    const blog = await Blog.create({
      title,
      tag,
      image,
      excerpt,
      content,
      author: author || 'AstroPlanets Team',
      readTime: readTime || 5,
      tags: tags || [],
      seoTitle: seoTitle || title,
      seoDescription: seoDescription || excerpt,
      createdBy: req.admin._id,
    });

    res.status(201).json({ msg: 'Blog created successfully', blog });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      msg: error.message,
      error,
    });
  }
};

// @desc    Update blog (admin)
// @route   PUT /api/blogs/admin/:id
// @access  Private/Admin
const updateBlog = async (req, res) => {
  const { id } = req.params;
  const {
    title,
    tag,
    image,
    excerpt,
    content,
    author,
    readTime,
    isPublished,
    tags,
    seoTitle,
    seoDescription,
  } = req.body;

  try {
    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({ msg: 'Blog not found' });
    }

    blog.title = title || blog.title;
    blog.tag = tag || blog.tag;
    blog.image = image || blog.image;
    blog.excerpt = excerpt || blog.excerpt;
    blog.content = content || blog.content;
    blog.author = author || blog.author;
    blog.readTime = readTime || blog.readTime;
    blog.isPublished = isPublished !== undefined ? isPublished : blog.isPublished;
    blog.tags = tags || blog.tags;
    blog.seoTitle = seoTitle || blog.seoTitle;
    blog.seoDescription = seoDescription || blog.seoDescription;

    await blog.save();

    res.json({ msg: 'Blog updated successfully', blog });
  } catch (error) {
    console.error('Update blog error:', error);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

// @desc    Delete blog (admin)
// @route   DELETE /api/blogs/admin/:id
// @access  Private/Admin
const deleteBlog = async (req, res) => {
  const { id } = req.params;

  try {
    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({ msg: 'Blog not found' });
    }

    await blog.deleteOne();
    res.json({ msg: 'Blog deleted successfully' });
  } catch (error) {
    console.error('Delete blog error:', error);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

// @desc    Toggle blog publish status
// @route   PATCH /api/blogs/admin/:id/toggle
// @access  Private/Admin
const togglePublish = async (req, res) => {
  const { id } = req.params;

  try {
    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({ msg: 'Blog not found' });
    }

    blog.isPublished = !blog.isPublished;
    await blog.save();

    res.json({ msg: `Blog ${blog.isPublished ? 'published' : 'unpublished'}`, blog });
  } catch (error) {
    console.error('Toggle publish error:', error);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

// @desc    Like blog
// @route   PUT /api/blogs/:id/like
// @access  Public
const likeBlog = async (req, res) => {
  const { id } = req.params;

  try {
    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({ msg: 'Blog not found' });
    }

    blog.likes += 1;
    await blog.save();

    res.json({ msg: 'Liked', likes: blog.likes });
  } catch (error) {
    console.error('Like blog error:', error);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

module.exports = {
  getAllBlogs,
  getBlogBySlug,
  getAllBlogsAdmin,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
  togglePublish,
  likeBlog,
};