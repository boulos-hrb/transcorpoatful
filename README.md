# Transcorp SuiteFleet Shopify Integration

A custom Shopify app that automatically creates delivery tasks in SuiteFleet whenever an order is placed.

## Features

- ✅ Automatic order to SuiteFleet task creation
- ✅ OAuth 2.0 authentication with token refresh
- ✅ Webhook signature verification
- ✅ Serverless deployment on Vercel
- ✅ Error handling and logging
- ✅ Zero dependencies on pre-built Shopify apps

## How It Works

```
1. Customer places order on Shopify
   ↓
2. Shopify sends webhook to your app
   ↓
3. Your app extracts order details
   ↓
4. Creates task in SuiteFleet API
   ↓
5. Logistics company can start delivery
```

## Prerequisites

- Node.js 18+ (for local development)
- A Vercel account (free)
- A GitHub account (to store code)
- SuiteFleet API credentials (you have these already)
- Shopify admin access

## Environment Variables

Create a `.env.local` file in the root directory:

```
SUITEFLEET_API_URL=https://api.suitefleet.com
SUITEFLEET_EMAIL=oatful@transcorp-intl.com
SUITEFLEET_PASSWORD=TSCP@2023
SUITEFLEET_CLIENT_ID=transcorpuae
SUITEFLEET_CUSTOMER_ID=16
SHOPIFY_WEBHOOK_SECRET=your-webhook-secret
NODE_ENV=production
```

## Installation & Local Testing

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd transcorp-suitefleet-app
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env.local
# Edit .env.local with your actual credentials
```

### 4. Run locally with Vercel CLI

```bash
npm install -g vercel
npm run dev
```

This starts a local server at `http://localhost:3000`

### 5. Test the webhook

Use Postman or curl to test:

```bash
curl -X POST http://localhost:3000/api/webhooks/order \
  -H "Content-Type: application/json" \
  -d '{
    "id": "123456789",
    "order_number": 1001,
    "email": "customer@example.com",
    "line_items": [
      {"grams": 500, "title": "Product 1"},
      {"grams": 300, "title": "Product 2"}
    ],
    "total_price": "99.99",
    "shipping_address": {
      "name": "John Doe",
      "phone": "+971501234567",
      "address1": "123 Main St",
      "city": "Dubai",
      "zip": "12345",
      "country": "United Arab Emirates"
    }
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Order sent to SuiteFleet",
  "shopifyOrder": "1001",
  "suitefleetTask": "task-id-here"
}
```

### 6. Check health endpoint

```bash
curl http://localhost:3000/api/health
```

## Deployment to Vercel

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: Shopify SuiteFleet integration"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/transcorp-suitefleet-app.git
git push -u origin main
```

### Step 2: Connect to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "Add New..." → "Project"
4. Select your `transcorp-suitefleet-app` repository
5. Click "Import"

### Step 3: Add Environment Variables

On the Vercel import screen:

1. Click "Environment Variables"
2. Add these variables:
   - `SUITEFLEET_API_URL` = `https://api.suitefleet.com`
   - `SUITEFLEET_EMAIL` = `oatful@transcorp-intl.com`
   - `SUITEFLEET_PASSWORD` = `TSCP@2023`
   - `SUITEFLEET_CLIENT_ID` = `transcorpuae`
   - `SUITEFLEET_CUSTOMER_ID` = `16`
   - `SHOPIFY_WEBHOOK_SECRET` = (get from Shopify, see below)
   - `NODE_ENV` = `production`

3. Click "Deploy"

### Step 4: Get Your Public URL

After deployment completes, you'll get a URL like:
```
https://transcorp-suitefleet-app.vercel.app
```

This is your webhook endpoint.

## Configure Shopify Webhook

### Step 1: Get Webhook Secret from Shopify

1. Go to Shopify Admin → Settings → Apps and integrations → Webhooks
2. Or: Go to Shopify Admin → Apps → App settings (custom app)
3. Create a new webhook if needed, note the secret

### Step 2: Set Webhook Secret in Vercel

1. Go to Vercel Dashboard
2. Select your project
3. Go to "Settings" → "Environment Variables"
4. Add/update `SHOPIFY_WEBHOOK_SECRET` with the value from Shopify
5. Click "Save"

### Step 3: Create Shopify Webhook

In Shopify Admin:

1. Go to **Settings** → **Apps and integrations** → **Webhooks**
2. Click **Create webhook**
3. Configure:
   - **Event:** `Orders/create` (or `Orders/updated` if you want updates)
   - **Webhook API version:** Latest stable
   - **URL to notify:** `https://transcorp-suitefleet-app.vercel.app/api/webhooks/order`
   - **Format:** JSON

4. Click **Save**

### Step 4: Test the Webhook

1. In Shopify, go to the webhook you just created
2. Scroll to "Recent deliveries"
3. You should see successful POST requests to your app
4. Click on one to see the request/response details

## Project Structure

```
transcorp-suitefleet-app/
├── api/
│   ├── health.js              # Health check endpoint
│   └── webhooks/
│       └── order.js           # Shopify order webhook handler
├── lib/
│   └── suitefleet.js          # SuiteFleet API client
├── package.json               # Dependencies
├── vercel.json               # Vercel deployment config
├── .env.example              # Environment variables template
├── .gitignore               # Git ignore file
└── README.md                # This file
```

## API Endpoints

### POST /api/webhooks/order
Receives order webhooks from Shopify and creates SuiteFleet tasks.

**Headers:**
```
Content-Type: application/json
x-shopify-hmac-sha256: <signature>
```

**Response:**
```json
{
  "success": true,
  "message": "Order sent to SuiteFleet",
  "shopifyOrder": "1001",
  "suitefleetTask": "task-id"
}
```

### GET /api/health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-04-09T12:34:56.789Z",
  "message": "Transcorp SuiteFleet Integration is running"
}
```

## Troubleshooting

### Webhook not firing
- Check Shopify webhook settings: Settings → Apps → Webhooks
- Verify the URL is correct and publicly accessible
- Check "Recent deliveries" to see if requests are being sent

### Authentication failing
- Verify credentials in environment variables
- Check SuiteFleet credentials haven't expired
- Try test auth: `curl -X POST "https://api.suitefleet.com/api/auth/authenticate?username=oatful%40transcorp-intl.com&password=TSCP@2023" -H "clientid: transcorpuae"`

### Tasks not creating
- Check Vercel logs: Dashboard → Project → Deployments → Logs
- Verify `SUITEFLEET_CUSTOMER_ID` is correct (should be 16)
- Check if address fields are populated in Shopify orders

### Logs

To view logs in Vercel:
1. Go to Vercel Dashboard
2. Select your project
3. Click "Deployments"
4. Select the latest deployment
5. Scroll to "Logs" tab

## Making Changes

After making code changes:

1. Test locally: `npm run dev`
2. Push to GitHub: `git add . && git commit -m "message" && git push`
3. Vercel auto-deploys on push
4. Check Vercel logs to confirm deployment

## Security Notes

- ✅ Never commit `.env.local` (it's in `.gitignore`)
- ✅ Use environment variables for sensitive data
- ✅ Webhook signatures are verified
- ✅ Tokens are refreshed automatically
- ✅ No hardcoded credentials in code

## Support

For issues or questions:
- Check Vercel logs
- Verify environment variables are set
- Test webhook with Postman
- Check SuiteFleet API status at https://api.suitefleet.com

## Next Steps

1. Deploy to Vercel
2. Create Shopify webhook
3. Test with a real order
4. Monitor logs and confirm tasks are created
5. Celebrate! 🎉
