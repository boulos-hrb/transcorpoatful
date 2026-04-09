const crypto = require('crypto');
const SuiteFleetClient = require('../../lib/suitefleet');

/**
 * Verify webhook signature from Shopify
 */
function verifyWebhookSignature(req) {
  const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.warn('⚠️ SHOPIFY_WEBHOOK_SECRET not set - skipping verification');
    return true;
  }

  const hmacHeader = req.headers['x-shopify-hmac-sha256'];
  const body = req.rawBody || JSON.stringify(req.body);

  const hash = crypto
    .createHmac('sha256', webhookSecret)
    .update(body, 'utf8')
    .digest('base64');

  return hash === hmacHeader;
}

/**
 * Parse Shopify order data
 */
function parseShopifyOrder(order) {
  const shippingAddress = order.shipping_address || {};
  const billingAddress = order.billing_address || {};

  // Calculate total weight (sum of all line items)
  let totalWeight = 0;
  if (order.line_items && Array.isArray(order.line_items)) {
    totalWeight = order.line_items.reduce((sum, item) => {
      return sum + (parseFloat(item.grams || 0) / 1000); // Convert grams to kg
    }, 0);
  }

  return {
    orderId: order.id.toString(),
    orderNumber: order.order_number.toString(),
    customerName: shippingAddress.name || 'Unknown',
    customerEmail: order.email || shippingAddress.email || '',
    customerPhone: shippingAddress.phone || '',
    shippingAddress: `${shippingAddress.address1 || ''} ${shippingAddress.address2 || ''}`.trim(),
    shippingCity: shippingAddress.city || '',
    shippingZip: shippingAddress.zip || '',
    shippingCountry: shippingAddress.country || '',
    itemCount: order.line_items?.length || 0,
    orderTotal: parseFloat(order.total_price || 0),
    weight: totalWeight > 0 ? totalWeight : 1, // Default 1kg
    deliveryDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Next day
    shippingMethod: order.shipping_lines?.[0]?.title || 'Standard',
    fulfillmentStatus: order.fulfillment_status || 'unfulfilled',
  };
}

/**
 * Webhook handler - called when Shopify sends an order
 */
module.exports = async (req, res) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify webhook signature
    if (!verifyWebhookSignature(req)) {
      console.warn('✗ Invalid webhook signature');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const order = req.body;
    console.log(`📦 Received order webhook: ${order.order_number}`);

    // Parse Shopify order data
    const orderData = parseShopifyOrder(order);

    // Initialize SuiteFleet client
    const suitefleet = new SuiteFleetClient();

    // Authenticate with SuiteFleet
    await suitefleet.authenticate();

    // Create task in SuiteFleet
    const task = await suitefleet.createTask(orderData);

    console.log(
      `✓ Successfully created SuiteFleet task for order ${orderData.orderNumber}`
    );

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Order sent to SuiteFleet',
      shopifyOrder: orderData.orderNumber,
      suitefleetTask: task.id,
    });
  } catch (error) {
    console.error('✗ Webhook error:', error.message);

    // Return error response (but don't fail the webhook - Shopify will retry)
    res.status(200).json({
      success: false,
      error: error.message,
      message: 'Order received but processing failed - will retry',
    });
  }
};
