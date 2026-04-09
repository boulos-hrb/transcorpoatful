const axios = require('axios');

class SuiteFleetClient {
  constructor() {
    this.apiUrl = process.env.SUITEFLEET_API_URL || 'https://api.suitefleet.com';
    this.email = process.env.SUITEFLEET_EMAIL;
    this.password = process.env.SUITEFLEET_PASSWORD;
    this.clientId = process.env.SUITEFLEET_CLIENT_ID;
    this.customerId = parseInt(process.env.SUITEFLEET_CUSTOMER_ID);
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Authenticate with SuiteFleet API
   */
  async authenticate() {
    try {
      const response = await axios.post(
        `${this.apiUrl}/api/auth/authenticate?username=${encodeURIComponent(
          this.email
        )}&password=${encodeURIComponent(this.password)}`,
        {},
        {
          headers: {
            clientid: this.clientId,
            'Content-Type': 'application/json',
          },
        }
      );

      this.accessToken = response.data.accessToken;
      this.refreshToken = response.data.refreshToken;
      this.tokenExpiry = new Date(response.data.accessTokenExpiration);

      console.log('✓ SuiteFleet authentication successful');
      return true;
    } catch (error) {
      console.error('✗ SuiteFleet authentication failed:', error.message);
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  /**
   * Refresh access token if expired
   */
  async refreshAccessToken() {
    if (!this.refreshToken) {
      await this.authenticate();
      return;
    }

    try {
      const response = await axios.post(
        `${this.apiUrl}/api/auth/refresh`,
        {
          refreshToken: this.refreshToken,
        },
        {
          headers: {
            clientid: this.clientId,
            'Content-Type': 'application/json',
          },
        }
      );

      this.accessToken = response.data.accessToken;
      this.tokenExpiry = new Date(response.data.accessTokenExpiration);
      console.log('✓ Access token refreshed');
    } catch (error) {
      console.error('✗ Token refresh failed, re-authenticating...');
      await this.authenticate();
    }
  }

  /**
   * Ensure token is valid before making requests
   */
  async ensureValidToken() {
    if (!this.accessToken || new Date() >= this.tokenExpiry) {
      await this.refreshAccessToken();
    }
  }

  /**
   * Create a delivery task in SuiteFleet
   */
  async createTask(orderData) {
    await this.ensureValidToken();

    const taskPayload = {
      customerId: this.customerId,
      type: 'DELIVERY',
      deliveryType: 'STANDARD',
      consignee: {
        name: orderData.customerName,
        email: orderData.customerEmail,
        phone: orderData.customerPhone,
        address: orderData.shippingAddress,
        city: orderData.shippingCity,
        postalCode: orderData.shippingZip,
        country: orderData.shippingCountry,
      },
      deliveryDate: orderData.deliveryDate,
      deliveryStartTime: orderData.deliveryStartTime || '09:00',
      deliveryEndTime: orderData.deliveryEndTime || '17:00',
      codAmount: orderData.codAmount || 0, // Cash on delivery amount
      totalShipmentQuantity: orderData.itemCount,
      totalShipmentValueAmount: orderData.orderTotal,
      totalDeclaredGrossWeight: orderData.weight || 1, // Default 1kg if not provided
      volume: orderData.volume || 0,
      notes: `Shopify Order #${orderData.orderId}`,
      reference: orderData.orderId, // Link back to Shopify order
    };

    try {
      const response = await axios.post(
        `${this.apiUrl}/api/tasks`,
        taskPayload,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            clientId: this.clientId,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log(`✓ Task created for order ${orderData.orderId}:`, response.data.id);
      return response.data;
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || error.message;
      console.error(`✗ Failed to create task for order ${orderData.orderId}:`, errorMsg);
      throw new Error(`Task creation failed: ${errorMsg}`);
    }
  }

  /**
   * Get task by ID
   */
  async getTask(taskId) {
    await this.ensureValidToken();

    try {
      const response = await axios.get(
        `${this.apiUrl}/api/tasks/${taskId}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            clientId: this.clientId,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error(`✗ Failed to fetch task ${taskId}:`, error.message);
      throw error;
    }
  }

  /**
   * List all tasks for customer
   */
  async listTasks(filters = {}) {
    await this.ensureValidToken();

    const params = new URLSearchParams({
      customerId: this.customerId,
      ...filters,
    });

    try {
      const response = await axios.get(
        `${this.apiUrl}/api/tasks?${params}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            clientId: this.clientId,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('✗ Failed to list tasks:', error.message);
      throw error;
    }
  }
}

module.exports = SuiteFleetClient;
