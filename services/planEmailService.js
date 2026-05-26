// services/planEmailService.js
const nodemailer = require("nodemailer");

const ADMIN_EMAIL = "contact.astroplanets@gmail.com";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Send plan purchase confirmation email to user
const sendPlanPurchaseEmail = async (user, subscription, plan) => {
  try {
    // ✅ FIX: User name properly set karo
    const userName = user?.name || user?.fullName || subscription?.userName || "Valued Customer";
    
    // Calculate discount percentage
    const discount = plan.mrpPrice > plan.sellingPrice
      ? Math.round(((plan.mrpPrice - plan.sellingPrice) / plan.mrpPrice) * 100)
      : 0;

    // Format dates
    const startDate = new Date(subscription.startDate).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    
    const endDate = new Date(subscription.endDate).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const paymentDate = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const userMailOptions = {
      from: `"Astro Guide" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: `🎉 Welcome to ${subscription.planName} Plan - Astro Guide`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Plan Activated - Astro Guide</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              line-height: 1.6;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              margin: 0;
              padding: 20px;
            }
            
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: #ffffff;
              border-radius: 24px;
              overflow: hidden;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              animation: slideIn 0.5s ease-out;
            }
            
            @keyframes slideIn {
              from {
                opacity: 0;
                transform: translateY(-30px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            
            .header {
              background: linear-gradient(135deg, #dc2626, #b91c1c);
              padding: 40px 30px;
              text-align: center;
              position: relative;
              overflow: hidden;
            }
            
            .header::before {
              content: '';
              position: absolute;
              top: -50%;
              right: -50%;
              width: 200%;
              height: 200%;
              background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
              animation: pulse 3s ease-in-out infinite;
            }
            
            @keyframes pulse {
              0%, 100% { transform: scale(1); opacity: 0.5; }
              50% { transform: scale(1.1); opacity: 0.8; }
            }
            
            .header h1 {
              color: white;
              font-size: 32px;
              margin: 0 0 10px;
              font-weight: 700;
              position: relative;
              z-index: 1;
            }
            
            .header p {
              color: rgba(255,255,255,0.95);
              font-size: 16px;
              margin: 0;
              position: relative;
              z-index: 1;
            }
            
            .success-icon {
              width: 80px;
              height: 80px;
              background: #10b981;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: -40px auto 20px;
              position: relative;
              z-index: 2;
              box-shadow: 0 4px 15px rgba(16,185,129,0.3);
              animation: bounce 0.5s ease-out;
            }
            
            @keyframes bounce {
              0%, 100% { transform: scale(0.9); }
              50% { transform: scale(1.1); }
            }
            
            .success-icon svg {
              width: 45px;
              height: 45px;
              color: white;
            }
            
            .content {
              padding: 30px;
            }
            
            .greeting {
              text-align: center;
              margin-bottom: 30px;
            }
            
            .greeting h2 {
              color: #1f2937;
              font-size: 24px;
              margin-bottom: 10px;
              font-weight: 600;
            }
            
            .greeting p {
              color: #6b7280;
              font-size: 16px;
            }
            
            .plan-card {
              background: linear-gradient(135deg, #fef2f2, #fee2e2);
              border-radius: 16px;
              padding: 25px;
              margin: 25px 0;
              border-left: 4px solid #dc2626;
            }
            
            .plan-name {
              font-size: 22px;
              font-weight: 700;
              color: #dc2626;
              margin-bottom: 15px;
            }
            
            .price-section {
              margin-bottom: 15px;
            }
            
            .selling-price {
              font-size: 32px;
              font-weight: 800;
              color: #1f2937;
            }
            
            .mrp-price {
              font-size: 18px;
              color: #9ca3af;
              text-decoration: line-through;
              margin-left: 10px;
            }
            
            .discount-badge {
              display: inline-block;
              background: #10b981;
              color: white;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 600;
              margin-left: 10px;
            }
            
            .features-section {
              margin: 25px 0;
            }
            
            .features-title {
              font-size: 18px;
              font-weight: 600;
              color: #1f2937;
              margin-bottom: 15px;
              display: flex;
              align-items: center;
              gap: 10px;
            }
            
            .features-list {
              list-style: none;
              padding: 0;
            }
            
            .features-list li {
              padding: 10px 0;
              border-bottom: 1px solid #f3f4f6;
              display: flex;
              align-items: center;
              gap: 12px;
            }
            
            .features-list li:last-child {
              border-bottom: none;
            }
            
            .check-icon {
              width: 20px;
              height: 20px;
              background: #10b981;
              border-radius: 50%;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 12px;
            }
            
            .details-box {
              background: #f3f4f6;
              border-radius: 12px;
              padding: 20px;
              margin: 25px 0;
            }
            
            .detail-row {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            
            .detail-row:last-child {
              border-bottom: none;
            }
            
            .detail-label {
              font-weight: 600;
              color: #4b5563;
            }
            
            .detail-value {
              color: #1f2937;
              font-weight: 500;
            }
            
            .status-badge {
              display: inline-block;
              background: #10b981;
              color: white;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 600;
            }
            
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #dc2626, #b91c1c);
              color: white;
              padding: 14px 35px;
              text-decoration: none;
              border-radius: 50px;
              font-weight: 600;
              margin-top: 20px;
              transition: transform 0.3s ease, box-shadow 0.3s ease;
            }
            
            .button:hover {
              transform: translateY(-2px);
              box-shadow: 0 10px 25px rgba(220,38,38,0.3);
            }
            
            .footer {
              background: #f9fafb;
              padding: 30px;
              text-align: center;
              border-top: 1px solid #e5e7eb;
            }
            
            .footer p {
              color: #6b7280;
              font-size: 13px;
              margin: 5px 0;
            }
            
            .social-links {
              margin: 15px 0;
            }
            
            .social-links a {
              color: #6b7280;
              text-decoration: none;
              margin: 0 10px;
              font-size: 20px;
              transition: color 0.3s ease;
            }
            
            .social-links a:hover {
              color: #dc2626;
            }
            
            @media (max-width: 600px) {
              .container {
                border-radius: 16px;
              }
              
              .content {
                padding: 20px;
              }
              
              .selling-price {
                font-size: 28px;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✨ Astro Guide ✨</h1>
              <p>Your spiritual journey begins here!</p>
            </div>
            
            <div class="success-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            
            <div class="content">
              <div class="greeting">
                <h2>Welcome aboard, ${userName}! 🎉</h2>
                <p>Thank you for choosing Astro Guide. Your plan has been successfully activated.</p>
              </div>
              
              <div class="plan-card">
                <div class="plan-name">${subscription.planName} Plan</div>
                <div class="price-section">
                  <span class="selling-price">₹${subscription.amount.toLocaleString()}</span>
                  ${discount > 0 ? `<span class="mrp-price">₹${plan.mrpPrice.toLocaleString()}</span>` : ''}
                  ${discount > 0 ? `<span class="discount-badge">Save ${discount}%</span>` : ''}
                </div>
                <div style="margin-top: 10px;">
                  <span style="color: #6b7280; font-size: 14px;">Duration: ${plan.duration}</span>
                </div>
              </div>
              
              <div class="features-section">
                <div class="features-title">
                  <span>✅ What's Included</span>
                </div>
                <ul class="features-list">
                  ${subscription.features.map(feature => `
                    <li>
                      <span class="check-icon">✓</span>
                      <span>${feature}</span>
                    </li>
                  `).join('')}
                </ul>
              </div>
              
              <div class="details-box">
                <div class="detail-row">
                  <span class="detail-label">📅 Start Date</span>
                  <span class="detail-value">${startDate}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">⏰ End Date</span>
                  <span class="detail-value">${endDate}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">💳 Payment Date</span>
                  <span class="detail-value">${paymentDate}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">🆔 Transaction ID</span>
                  <span class="detail-value">${subscription.razorpayPaymentId || 'N/A'}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">📊 Status</span>
                  <span class="detail-value"><span class="status-badge">Active ✅</span></span>
                </div>
                ${subscription.sessionsIncluded > 0 ? `
                  <div class="detail-row">
                    <span class="detail-label">🎯 Sessions Included</span>
                    <span class="detail-value">${subscription.sessionsIncluded} Sessions</span>
                  </div>
                ` : ''}
              </div>
              
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/profile" class="button">
                  👤 Go to My Profile
                </a>
              </div>
            </div>
            
            <div class="footer">
              <div class="social-links">
                <a href="#">📘</a>
                <a href="#">📸</a>
                <a href="#">🐦</a>
                <a href="#">💬</a>
              </div>
              <p>Need help? Contact us at support@astroguide.com</p>
              <p>📞 +91 12345 67890</p>
              <p>© 2025 Astro Guide. All rights reserved.</p>
              <p style="font-size: 11px;">This is a system-generated email. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(userMailOptions);
    console.log(`✅ Plan purchase email sent to user: ${user.email}`);
    
    // Send notification to admin
    await sendAdminNotification(user, subscription, plan);
    
    return true;
    
  } catch (error) {
    console.error("❌ Email sending error:", error);
    return false;
  }
};

// Send admin notification email
const sendAdminNotification = async (user, subscription, plan) => {
  try {
    // ✅ FIX: User name and phone properly set karo
    const userName = user?.name || user?.fullName || subscription?.userName || "Unknown User";
    const userPhone = user?.phone || subscription?.userPhone || "Not provided";
    const userEmail = user?.email || subscription?.userEmail;
    
    const adminMailOptions = {
      from: `"Astro Guide" <${process.env.EMAIL_USER}>`,
      to: ADMIN_EMAIL,
      subject: `🔔 New Plan Purchase - ${subscription.planName} Plan`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; background: #f0f2f5; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #dc2626, #b91c1c); padding: 30px; text-align: center; color: white; }
            .header h2 { margin: 0; }
            .content { padding: 30px; }
            .info-box { background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626; }
            .detail-row { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .detail-row:last-child { border-bottom: none; }
            .label { font-weight: 600; color: #4b5563; }
            .value { color: #1f2937; margin-left: 10px; }
            .status-active { color: #10b981; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>🔔 New Plan Purchase Notification</h2>
              <p>A user has purchased a subscription plan</p>
            </div>
            <div class="content">
              <h3>👤 Customer Details:</h3>
              <div class="info-box">
                <div class="detail-row"><span class="label">Name:</span> <span class="value">${userName}</span></div>
                <div class="detail-row"><span class="label">Email:</span> <span class="value">${userEmail}</span></div>
                <div class="detail-row"><span class="label">Phone:</span> <span class="value">${userPhone}</span></div>
                <div class="detail-row"><span class="label">User ID:</span> <span class="value">${user._id || subscription.userId}</span></div>
              </div>
              
              <h3>📋 Plan Details:</h3>
              <div class="info-box">
                <div class="detail-row"><span class="label">Plan Name:</span> <span class="value">${subscription.planName}</span></div>
                <div class="detail-row"><span class="label">Amount Paid:</span> <span class="value">₹${subscription.amount}</span></div>
                <div class="detail-row"><span class="label">MRP:</span> <span class="value">₹${plan.mrpPrice}</span></div>
                <div class="detail-row"><span class="label">Duration:</span> <span class="value">${plan.duration}</span></div>
                <div class="detail-row"><span class="label">Duration Days:</span> <span class="value">${plan.durationDays} days</span></div>
                <div class="detail-row"><span class="label">Sessions Included:</span> <span class="value">${subscription.sessionsIncluded || 0}</span></div>
              </div>
              
              <h3>💳 Payment Details:</h3>
              <div class="info-box">
                <div class="detail-row"><span class="label">Transaction ID:</span> <span class="value">${subscription.razorpayPaymentId}</span></div>
                <div class="detail-row"><span class="label">Purchase Date:</span> <span class="value">${new Date().toLocaleString()}</span></div>
                <div class="detail-row"><span class="label">Valid Until:</span> <span class="value">${new Date(subscription.endDate).toLocaleDateString()}</span></div>
                <div class="detail-row"><span class="label">Status:</span> <span class="value status-active">Active ✅</span></div>
              </div>
              
              <h3>✨ Plan Features:</h3>
              <div class="info-box">
                <ul style="margin: 0; padding-left: 20px;">
                  ${subscription.features.map(feature => `<li>${feature}</li>`).join('')}
                </ul>
              </div>
              
              ${subscription.preferredDate ? `
                <h3>📅 Session Schedule:</h3>
                <div class="info-box">
                  <div class="detail-row"><span class="label">Preferred Date:</span> <span class="value">${new Date(subscription.preferredDate).toLocaleDateString()}</span></div>
                  <div class="detail-row"><span class="label">Preferred Time:</span> <span class="value">${subscription.preferredTime || 'Not specified'}</span></div>
                  ${subscription.message ? `<div class="detail-row"><span class="label">Message:</span> <span class="value">${subscription.message}</span></div>` : ''}
                </div>
              ` : ''}
              
              <p style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                This is an automated notification from Astro Guide.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    };
    
    await transporter.sendMail(adminMailOptions);
    console.log(`✅ Admin notification sent to: ${ADMIN_EMAIL}`);
    return true;
  } catch (error) {
    console.error("❌ Admin email sending error:", error);
    return false;
  }
};

// Send plan cancellation email to user
const sendPlanCancellationEmail = async (user, subscription) => {
  try {
    const userName = user?.name || user?.fullName || subscription?.userName || "Valued Customer";
    const cancellationDate = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const endDate = new Date(subscription.endDate).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const userMailOptions = {
      from: `"Astro Guide" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: `📝 Plan Cancelled - ${subscription.planName} Plan`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              background: #f0f2f5;
              margin: 0;
              padding: 20px;
            }
            .container {
              max-width: 550px;
              margin: 0 auto;
              background: white;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #f59e0b, #dc2626);
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              color: white;
              margin: 0;
              font-size: 28px;
            }
            .content {
              padding: 30px;
              text-align: center;
            }
            .info-box {
              background: #fef2f2;
              padding: 20px;
              border-radius: 12px;
              margin: 20px 0;
              text-align: left;
            }
            .button {
              display: inline-block;
              background: #dc2626;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 8px;
              margin-top: 20px;
            }
            .footer {
              background: #f9fafb;
              padding: 20px;
              text-align: center;
              font-size: 12px;
              color: #6b7280;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📝 Plan Cancelled</h1>
            </div>
            <div class="content">
              <h2>Dear ${userName},</h2>
              <p>Your <strong>${subscription.planName}</strong> plan has been successfully cancelled.</p>
              
              <div class="info-box">
                <p><strong>Cancellation Date:</strong> ${cancellationDate}</p>
                <p><strong>Plan Valid Until:</strong> ${endDate}</p>
                <p><strong>Cancellation Reason:</strong> ${subscription.cancellationReason || 'User requested'}</p>
              </div>
              
              <p>You will continue to have access to your plan benefits until ${endDate}.</p>
              <p>We hope to serve you again in the future!</p>
              
              <a href="${process.env.FRONTEND_URL}/plans" class="button">Browse Other Plans</a>
            </div>
            <div class="footer">
              <p>Need assistance? Contact us at support@astroguide.com</p>
              <p>© 2025 Astro Guide. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(userMailOptions);
    console.log(`✅ Plan cancellation email sent to user: ${user.email}`);
    
    // Send admin notification for cancellation
    const adminMailOptions = {
      from: `"Astro Guide" <${process.env.EMAIL_USER}>`,
      to: ADMIN_EMAIL,
      subject: `⚠️ Plan Cancelled - ${subscription.planName} Plan`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 12px;">
          <h2 style="color: #dc2626;">⚠️ Plan Cancelled Notification</h2>
          <p><strong>User:</strong> ${userName}</p>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Phone:</strong> ${user.phone || subscription.userPhone || 'Not provided'}</p>
          <p><strong>Plan:</strong> ${subscription.planName}</p>
          <p><strong>Cancelled on:</strong> ${cancellationDate}</p>
          <p><strong>Valid until:</strong> ${endDate}</p>
        </div>
      `,
    };
    
    await transporter.sendMail(adminMailOptions);
    console.log(`✅ Admin cancellation notification sent to: ${ADMIN_EMAIL}`);
    
    return true;
  } catch (error) {
    console.error("❌ Email sending error:", error);
    return false;
  }
};

// Send payment receipt email
const sendPaymentReceiptEmail = async (user, subscription, paymentDetails) => {
  try {
    const userName = user?.name || user?.fullName || subscription?.userName || "Valued Customer";
    
    const userMailOptions = {
      from: `"Astro Guide" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: `🧾 Payment Receipt - ${subscription.planName} Plan`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; background: #f0f2f5; padding: 20px; }
            .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 30px; }
            .header { text-align: center; border-bottom: 2px solid #dc2626; padding-bottom: 20px; margin-bottom: 20px; }
            .amount { font-size: 36px; color: #dc2626; font-weight: bold; }
            .details { margin: 20px 0; }
            .detail { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>🧾 Payment Receipt</h2>
              <p>Astro Guide</p>
            </div>
            <h3>Dear ${userName},</h3>
            <p>Thank you for your payment. Here is your receipt:</p>
            <div class="details">
              <div class="detail"><strong>Plan:</strong> ${subscription.planName}</div>
              <div class="detail"><strong>Amount Paid:</strong> <span class="amount">₹${subscription.amount}</span></div>
              <div class="detail"><strong>Transaction ID:</strong> ${subscription.razorpayPaymentId}</div>
              <div class="detail"><strong>Payment Date:</strong> ${new Date().toLocaleString()}</div>
              <div class="detail"><strong>Status:</strong> <span style="color: #10b981;">✓ Completed</span></div>
            </div>
            <p>Your plan is now active. You can access all features from your dashboard.</p>
            <p style="margin-top: 30px; text-align: center; color: #6b7280; font-size: 12px;">
              This is a system-generated receipt. Please save it for your records.
            </p>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(userMailOptions);
    console.log(`✅ Payment receipt email sent to user: ${user.email}`);
    return true;
  } catch (error) {
    console.error("❌ Email sending error:", error);
    return false;
  }
};

module.exports = {
  sendPlanPurchaseEmail,
  sendPlanCancellationEmail,
  sendPaymentReceiptEmail,
  sendAdminNotification,
};