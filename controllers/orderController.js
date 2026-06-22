const Order = require('../models/Order');

// @desc    Get all orders (admin)
// @route   GET /api/orders/admin
// @access  Private/Admin
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'fullName email')
      .sort({ createdAt: -1 });
    
    // Get order statistics
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ orderStatus: 'pending' });
    const confirmedOrders = await Order.countDocuments({ orderStatus: 'confirmed' });
    const processingOrders = await Order.countDocuments({ orderStatus: 'processing' });
    const shippedOrders = await Order.countDocuments({ orderStatus: 'shipped' });
    const deliveredOrders = await Order.countDocuments({ orderStatus: 'delivered' });
    const cancelledOrders = await Order.countDocuments({ orderStatus: 'cancelled' });
    
    const totalRevenue = await Order.aggregate([
      { $match: { paymentStatus: 'success' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    
    res.json({
      success: true,
      orders,
      stats: {
        totalOrders,
        pendingOrders,
        confirmedOrders,
        processingOrders,
        shippedOrders,
        deliveredOrders,
        cancelledOrders,
        totalRevenue: totalRevenue[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({ 
      success: false,
      msg: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Get single order by ID (admin)
// @route   GET /api/orders/admin/:id
// @access  Private/Admin
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'fullName email');
    
    if (!order) {
      return res.status(404).json({ 
        success: false,
        msg: 'Order not found' 
      });
    }
    
    res.json({
      success: true,
      order
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ 
      success: false,
      msg: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Update order status (admin) - WITH PAYMENT VALIDATION
// @route   PUT /api/orders/admin/:id/status
// @access  Private/Admin
const updateOrderStatus = async (req, res) => {
  try {
    console.log('📝 Update order status - ID:', req.params.id);
    console.log('📦 Request body:', req.body);
    
    const { orderStatus } = req.body;
    
    // Validate request
    if (!orderStatus) {
      return res.status(400).json({
        success: false,
        msg: 'Order status is required'
      });
    }

    // Validate status value
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(orderStatus)) {
      return res.status(400).json({
        success: false,
        msg: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Find order by ID
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        msg: 'Order not found'
      });
    }

    // CRITICAL: Check payment status before allowing status change
    if (order.paymentStatus === 'pending' || order.paymentStatus === 'failed') {
      return res.status(400).json({
        success: false,
        msg: `Cannot update order status. Payment is ${order.paymentStatus}. Order status can only be updated after successful payment.`,
        paymentStatus: order.paymentStatus,
        currentStatus: order.orderStatus
      });
    }

    // Payment is 'success' - allow status update
    order.orderStatus = orderStatus;
    
    // Add to status history
    if (!order.statusHistory) {
      order.statusHistory = [];
    }
    order.statusHistory.push({
      status: orderStatus,
      note: `Status updated to ${orderStatus} by admin on ${new Date().toLocaleString()}`,
      updatedAt: new Date()
    });
    
    // Save with validation disabled
    await order.save({ validateBeforeSave: false });
    
    console.log('✅ Order status updated:', order._id);
    
    res.json({
      success: true,
      msg: `Order status updated to ${orderStatus} successfully`,
      order
    });
  } catch (error) {
    console.error('❌ Update order status error:', error);
    res.status(500).json({
      success: false,
      msg: 'Server error while updating order status',
      error: error.message
    });
  }
};

// @desc    Update payment status (admin)
// @route   PUT /api/orders/admin/:id/payment
// @access  Private/Admin
const updatePaymentStatus = async (req, res) => {
  try {
    console.log('📝 Update payment status - ID:', req.params.id);
    console.log('📦 Request body:', req.body);
    
    const { paymentStatus } = req.body;
    
    if (!paymentStatus) {
      return res.status(400).json({
        success: false,
        msg: 'Payment status is required'
      });
    }

    const validPaymentStatuses = ['pending', 'success', 'failed', 'refunded'];
    if (!validPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        msg: `Invalid payment status. Must be one of: ${validPaymentStatuses.join(', ')}`
      });
    }

    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        msg: 'Order not found'
      });
    }
    
    // Store previous status for logging
    const previousPaymentStatus = order.paymentStatus;
    
    // Update payment status
    order.paymentStatus = paymentStatus;
    
    // If payment becomes success, auto-update order to confirmed
    if (paymentStatus === 'success' && order.orderStatus === 'pending') {
      order.orderStatus = 'confirmed';
      if (!order.statusHistory) {
        order.statusHistory = [];
      }
      order.statusHistory.push({
        status: 'confirmed',
        note: `Auto-confirmed after successful payment (payment status: ${previousPaymentStatus} → ${paymentStatus})`,
        updatedAt: new Date()
      });
      console.log('✅ Auto-confirmed order after successful payment');
    }
    
    // If payment becomes failed, update order status to cancelled
    if (paymentStatus === 'failed' && order.orderStatus === 'pending') {
      order.orderStatus = 'cancelled';
      if (!order.statusHistory) {
        order.statusHistory = [];
      }
      order.statusHistory.push({
        status: 'cancelled',
        note: `Auto-cancelled due to failed payment (payment status: ${previousPaymentStatus} → ${paymentStatus})`,
        updatedAt: new Date()
      });
      console.log('✅ Auto-cancelled order due to failed payment');
    }
    
    // If payment becomes refunded, update order status to cancelled
    if (paymentStatus === 'refunded') {
      order.orderStatus = 'cancelled';
      if (!order.statusHistory) {
        order.statusHistory = [];
      }
      order.statusHistory.push({
        status: 'cancelled',
        note: `Order cancelled - payment refunded (payment status: ${previousPaymentStatus} → ${paymentStatus})`,
        updatedAt: new Date()
      });
      console.log('✅ Order cancelled - payment refunded');
    }
    
    await order.save({ validateBeforeSave: false });
    
    console.log('✅ Payment status updated:', order._id);
    
    res.json({
      success: true,
      msg: 'Payment status updated successfully',
      order
    });
  } catch (error) {
    console.error('Update payment status error:', error);
    res.status(500).json({ 
      success: false,
      msg: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Delete order (admin)
// @route   DELETE /api/orders/admin/:id
// @access  Private/Admin
const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ 
        success: false,
        msg: 'Order not found' 
      });
    }
    
    await order.deleteOne();
    
    res.json({ 
      success: true,
      msg: 'Order deleted successfully' 
    });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({ 
      success: false,
      msg: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Get order statistics (admin)
// @route   GET /api/orders/admin/stats/dashboard
// @access  Private/Admin
const getOrderStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - 7);
    
    const thisMonth = new Date();
    thisMonth.setDate(thisMonth.getDate() - 30);
    
    const todayOrders = await Order.countDocuments({ createdAt: { $gte: today } });
    const weekOrders = await Order.countDocuments({ createdAt: { $gte: thisWeek } });
    const monthOrders = await Order.countDocuments({ createdAt: { $gte: thisMonth } });
    
    const todayRevenue = await Order.aggregate([
      { $match: { createdAt: { $gte: today }, paymentStatus: 'success' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    
    const weekRevenue = await Order.aggregate([
      { $match: { createdAt: { $gte: thisWeek }, paymentStatus: 'success' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    
    const monthRevenue = await Order.aggregate([
      { $match: { createdAt: { $gte: thisMonth }, paymentStatus: 'success' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    
    res.json({
      success: true,
      stats: {
        todayOrders,
        weekOrders,
        monthOrders,
        todayRevenue: todayRevenue[0]?.total || 0,
        weekRevenue: weekRevenue[0]?.total || 0,
        monthRevenue: monthRevenue[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Get order stats error:', error);
    res.status(500).json({ 
      success: false,
      msg: 'Server error', 
      error: error.message 
    });
  }
};

// ✅ EXPORT ALL FUNCTIONS - Make sure this is at the end
module.exports = {
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  updatePaymentStatus,
  deleteOrder,
  getOrderStats
};