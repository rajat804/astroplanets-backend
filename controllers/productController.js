const Product = require('../models/Product');

// @desc    Get all products
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
  try {
    const { search, type, gemstone, inStock, minPrice, maxPrice } = req.query;
    
    let query = { isActive: true };
    
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    if (type) {
      query.type = type;
    }
    
    if (gemstone) {
      query.gemstone = gemstone;
    }
    
    if (inStock === 'true') {
      query.inStock = true;
      query.stock = { $gt: 0 };
    }
    
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    
    const products = await Product.find(query).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ msg: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private (Admin only)
const createProduct = async (req, res) => {
  try {
    console.log('📝 Creating product:', req.body);

    const {
      name,
      price,
      oldPrice,
      image,
      images,
      type,
      gemstone,
      stock,
      discount,
      subtitle,
      description,
      designerNote,
      color,
      material,
      weight,
      dimensions,
      origin,
      category,
    } = req.body;

    // ✅ Validate required fields
    if (!name || !price || !image || !type) {
      return res.status(400).json({
        success: false,
        msg: 'Name, price, image, and type are required'
      });
    }

    const product = await Product.create({
      name: name.trim(),
      price: Number(price),
      oldPrice: oldPrice ? Number(oldPrice) : null,
      image: image,
      images: images && Array.isArray(images) ? images : [image],
      type: type.trim(), // ✅ No enum validation now
      gemstone: gemstone || 'Rudraksha',
      inStock: Number(stock) > 0,
      stock: Number(stock) || 10,
      sold: 0,
      discount: discount || null,
      subtitle: subtitle || '',
      description: description || '',
      designerNote: designerNote || '',
      color: color || '',
      material: material || 'Authentic Rudraksha',
      weight: weight || '',
      dimensions: dimensions || '',
      origin: origin || 'Nepal / India',
      category: category || type.trim(), // ✅ No enum validation now
    });
    
    console.log('✅ Product created:', product._id);
    
    res.status(201).json({
      success: true,
      msg: 'Product created successfully',
      product,
    });
  } catch (error) {
    console.error('❌ Create product error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        msg: 'Validation error',
        errors
      });
    }
    
    res.status(500).json({ 
      success: false,
      msg: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private (Admin only)
const updateProduct = async (req, res) => {
  try {
    console.log('📝 Update Product ID:', req.params.id);
    console.log('📦 Update Data:', req.body);

    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ 
        success: false,
        msg: 'Product not found' 
      });
    }

    // ✅ Update ONLY the fields that are sent
    const allowedFields = [
      'name', 'price', 'oldPrice', 'image', 'images', 'type', 
      'gemstone', 'stock', 'discount', 'subtitle', 'description',
      'color', 'material', 'weight', 'dimensions', 'origin', 
      'category', 'isActive', 'rating'
    ];

    let hasUpdates = false;
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined && req.body[field] !== null && req.body[field] !== '') {
        // Convert numbers
        if (['price', 'oldPrice', 'stock', 'rating'].includes(field)) {
          product[field] = Number(req.body[field]);
        } else {
          product[field] = req.body[field];
        }
        hasUpdates = true;
      }
    });

    if (!hasUpdates) {
      return res.status(400).json({
        success: false,
        msg: 'No valid fields to update'
      });
    }

    // ✅ Auto-update inStock based on stock
    if (req.body.stock !== undefined) {
      product.inStock = Number(req.body.stock) > 0;
    }

    // ✅ Auto-calculate discount
    if (product.oldPrice && product.price && product.oldPrice > product.price) {
      const discountPercent = Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100);
      product.discount = `${discountPercent}% OFF`;
    }

    await product.save();

    console.log('✅ Product Updated:', product._id);

    res.json({
      success: true,
      msg: 'Product updated successfully',
      product,
    });
  } catch (error) {
    console.error('❌ Update error:', error);
    console.error('Error details:', error.message);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        msg: 'Validation error',
        errors
      });
    }
    
    res.status(500).json({ 
      success: false,
      msg: error.message || 'Server error'
    });
  }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private (Admin only)
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ msg: 'Product not found' });
    }
    
    await product.deleteOne();
    
    res.json({ 
      success: true,
      msg: 'Product deleted successfully' 
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ 
      success: false,
      msg: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Get product stats for admin
// @route   GET /api/products/stats
// @access  Private (Admin only)
const getProductStats = async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const activeProducts = await Product.countDocuments({ isActive: true });
    const lowStock = await Product.countDocuments({ stock: { $lt: 10 }, isActive: true });
    const outOfStock = await Product.countDocuments({ stock: 0, isActive: true });
    
    const topProducts = await Product.find({ isActive: true })
      .sort({ sold: -1 })
      .limit(5)
      .select('name price sold rating');
    
    res.json({
      success: true,
      totalProducts,
      activeProducts,
      lowStock,
      outOfStock,
      topProducts,
    });
  } catch (error) {
    console.error('Get product stats error:', error);
    res.status(500).json({ 
      success: false,
      msg: 'Server error', 
      error: error.message 
    });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductStats,
};