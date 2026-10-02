import axios from 'axios';
import { config } from '../src/config/env.js';
import { logger } from '../src/utils/logger.js';

interface SeedProductInput {
  name: string;
  sku: string;
  regular_price: string;
  manage_stock: boolean;
  stock_quantity?: number;
  stock_status: 'instock' | 'outofstock' | 'onbackorder';
  low_stock_amount?: number;
  description: string;
}

const SAMPLE_PRODUCTS: SeedProductInput[] = [
  // 10 In-Stock Products
  { name: 'Ergonomic Wireless Mechanical Keyboard', sku: 'KB-001', regular_price: '4999', manage_stock: true, stock_quantity: 45, stock_status: 'instock', description: 'RGB mechanical keyboard with tactile switches' },
  { name: 'Gaming Optical Mouse 16000 DPI', sku: 'MS-002', regular_price: '1999', manage_stock: true, stock_quantity: 30, stock_status: 'instock', description: 'Ultra-lightweight gaming mouse' },
  { name: 'USB-C Multi-Port Hub 7-in-1', sku: 'HB-003', regular_price: '2499', manage_stock: true, stock_quantity: 50, stock_status: 'instock', description: 'Aluminum USB-C hub with HDMI 4K and 100W PD' },
  { name: 'Noise-Cancelling Over-Ear Headphones', sku: 'HP-004', regular_price: '8999', manage_stock: true, stock_quantity: 25, stock_status: 'instock', description: 'Active noise cancelling wireless headphones' },
  { name: '4K Ultra HD Webcam with Microphone', sku: 'WC-005', regular_price: '3499', manage_stock: true, stock_quantity: 20, stock_status: 'instock', description: 'Plug-and-play streaming and conference webcam' },
  { name: 'Aluminum Laptop Stand Riser', sku: 'LS-006', regular_price: '1299', manage_stock: true, stock_quantity: 60, stock_status: 'instock', description: 'Ergonomic foldable desktop stand' },
  { name: 'Desk Pad Leather Mouse Mat (Extended)', sku: 'DP-007', regular_price: '799', manage_stock: true, stock_quantity: 40, stock_status: 'instock', description: 'Waterproof PU leather desk protector' },
  { name: '100W GaN Fast Wall Charger', sku: 'CH-008', regular_price: '2199', manage_stock: true, stock_quantity: 35, stock_status: 'instock', description: 'Compact dual USB-C & USB-A fast charger' },
  { name: 'Braided 240W Thunderbolt 4 Cable 2m', sku: 'CB-009', regular_price: '999', manage_stock: true, stock_quantity: 80, stock_status: 'instock', description: 'High-speed 40Gbps data and 240W charging cable' },
  { name: 'Smart LED Monitor Light Bar', sku: 'LB-010', regular_price: '2799', manage_stock: true, stock_quantity: 18, stock_status: 'instock', description: 'Auto-dimming screen lamp with touch controls' },

  // 5 Low-Stock Products (quantity <= 5)
  { name: 'Studio Condenser Microphone with Arm', sku: 'MC-011', regular_price: '5499', manage_stock: true, stock_quantity: 3, stock_status: 'instock', low_stock_amount: 5, description: 'Cardioid USB microphone for podcasting and streaming' },
  { name: 'Curved Ultrawide Monitor 34-inch', sku: 'MN-012', regular_price: '29999', manage_stock: true, stock_quantity: 2, stock_status: 'instock', low_stock_amount: 5, description: '144Hz WQHD IPS curved display' },
  { name: 'Mechanical Switch Puller & Lube Kit', sku: 'TL-013', regular_price: '649', manage_stock: true, stock_quantity: 4, stock_status: 'instock', low_stock_amount: 5, description: 'Custom keyboard modding and maintenance accessories' },
  { name: 'Wireless Charging Desk Organizer', sku: 'OR-014', regular_price: '1899', manage_stock: true, stock_quantity: 2, stock_status: 'instock', low_stock_amount: 5, description: 'Solid wood desk tray with 15W Qi charging' },
  { name: 'Portable 1TB NVMe SSD USB 3.2', sku: 'SD-015', regular_price: '7499', manage_stock: true, stock_quantity: 1, stock_status: 'instock', low_stock_amount: 5, description: 'Rugged high-speed external storage drive' },

  // 5 Out-of-Stock Products
  { name: 'Custom Artisan Keycap Resin Galaxy', sku: 'KC-016', regular_price: '1499', manage_stock: true, stock_quantity: 0, stock_status: 'outofstock', description: 'Handcrafted artisan cherry MX keycap' },
  { name: 'Ergonomic Mesh Executive Chair', sku: 'CH-017', regular_price: '18499', manage_stock: true, stock_quantity: 0, stock_status: 'outofstock', description: 'High-back breathable lumbar support office chair' },
  { name: 'Direct Drive Racing Wheel & Pedals', sku: 'RW-018', regular_price: '44999', manage_stock: true, stock_quantity: 0, stock_status: 'outofstock', description: 'Force feedback sim racing steering wheel' },
  { name: 'Dual Monitor Heavy Duty Gas Spring Arm', sku: 'MA-019', regular_price: '4299', manage_stock: true, stock_quantity: 0, stock_status: 'outofstock', description: 'Full motion dual display desk clamp mount' },
  { name: 'Hi-Fi Desktop DAC & Headphone Amplifier', sku: 'DA-020', regular_price: '11999', manage_stock: true, stock_quantity: 0, stock_status: 'outofstock', description: 'High-resolution audio decoder for audiophiles' },
];

async function seed() {
  const storeUrl = (config.WOOCOMMERCE_URL || '').replace(/\/+$/, '');
  const key = config.WOOCOMMERCE_SEED_CONSUMER_KEY || config.WOOCOMMERCE_CONSUMER_KEY;
  const secret = config.WOOCOMMERCE_SEED_CONSUMER_SECRET || config.WOOCOMMERCE_CONSUMER_SECRET;

  if (!storeUrl || !key || !secret) {
    logger.error('Missing WooCommerce credentials in .env. Cannot proceed with seeding.');
    process.exit(1);
  }

  const client = axios.create({
    baseURL: `${storeUrl}/wp-json/wc/v3`,
    headers: {
      Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });

  console.log('----------------------------------------------------');
  console.log('CARTIX WOOCOMMERCE SEEDER');
  console.log(`Target Store: ${storeUrl}`);
  console.log('----------------------------------------------------');

  try {
    // 1. Create Products
    console.log('\n[1/2] Seeding Products...');
    const createdProducts: Array<{ id: number; name: string; sku: string; stock_status: string; stock_quantity?: number }> = [];

    // Check existing products to prevent endless duplicate spam
    const existingProductsRes = await client.get('/products', { params: { per_page: 100 } });
    const existingSkuMap = new Map<string, number>(existingProductsRes.data.map((p: any) => [p.sku, p.id]));

    for (const prod of SAMPLE_PRODUCTS) {
      if (existingSkuMap.has(prod.sku)) {
        const id = existingSkuMap.get(prod.sku)!;
        console.log(`  Existing product found: #${id} [${prod.sku}] ${prod.name}`);
        createdProducts.push({ id, name: prod.name, sku: prod.sku, stock_status: prod.stock_status, stock_quantity: prod.stock_quantity });
      } else {
        const res = await client.post('/products', prod);
        console.log(`  Created product: #${res.data.id} [${prod.sku}] ${prod.name} (${prod.stock_status}, stock: ${prod.stock_quantity ?? 0})`);
        createdProducts.push({ id: res.data.id, name: prod.name, sku: prod.sku, stock_status: prod.stock_status, stock_quantity: prod.stock_quantity });
      }
    }

    // 2. Create Orders
    console.log('\n[2/2] Seeding Orders (Varied Statuses & Timestamps)...');
    
    // Date variations
    const now = new Date();
    const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000).toISOString();
    const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000).toISOString();

    const orderTemplates = [
      // 10 Pending orders (5 recent, 5 delayed > 24h/48h)
      { status: 'pending', date: hoursAgo(2), items: [createdProducts[0]], note: 'Recent pending order' },
      { status: 'pending', date: hoursAgo(4), items: [createdProducts[1], createdProducts[2]], note: 'Recent pending order multi-item' },
      { status: 'pending', date: hoursAgo(6), items: [createdProducts[10]], note: 'Recent pending order with low-stock item' },
      { status: 'pending', date: hoursAgo(10), items: [createdProducts[3]], note: 'Recent pending order' },
      { status: 'pending', date: hoursAgo(18), items: [createdProducts[15]], note: 'Recent pending order with out-of-stock item' },
      { status: 'pending', date: hoursAgo(26), items: [createdProducts[0]], note: 'Delayed pending order (> 24h)' },
      { status: 'pending', date: hoursAgo(32), items: [createdProducts[11]], note: 'Delayed pending order (> 24h with low stock)' },
      { status: 'pending', date: hoursAgo(40), items: [createdProducts[4], createdProducts[5]], note: 'Delayed pending order (> 24h)' },
      { status: 'pending', date: daysAgo(2), items: [createdProducts[16]], note: 'Delayed pending order (> 48h with out-of-stock item)' },
      { status: 'pending', date: daysAgo(3), items: [createdProducts[7]], note: 'Delayed pending order (> 72h)' },

      // 10 Processing orders
      { status: 'processing', date: hoursAgo(1), items: [createdProducts[2]], note: 'Processing recent' },
      { status: 'processing', date: hoursAgo(5), items: [createdProducts[3], createdProducts[4]], note: 'Processing recent' },
      { status: 'processing', date: hoursAgo(8), items: [createdProducts[5]], note: 'Processing recent' },
      { status: 'processing', date: hoursAgo(12), items: [createdProducts[6]], note: 'Processing recent' },
      { status: 'processing', date: hoursAgo(20), items: [createdProducts[7]], note: 'Processing today' },
      { status: 'processing', date: hoursAgo(25), items: [createdProducts[8], createdProducts[9]], note: 'Processing > 24h' },
      { status: 'processing', date: hoursAgo(30), items: [createdProducts[10]], note: 'Processing > 24h' },
      { status: 'processing', date: daysAgo(2), items: [createdProducts[1]], note: 'Processing > 48h' },
      { status: 'processing', date: daysAgo(3), items: [createdProducts[2]], note: 'Processing > 72h' },
      { status: 'processing', date: daysAgo(4), items: [createdProducts[3]], note: 'Processing > 96h' },

      // 15 Completed orders
      { status: 'completed', date: hoursAgo(3), items: [createdProducts[0]], note: 'Completed today' },
      { status: 'completed', date: hoursAgo(7), items: [createdProducts[1]], note: 'Completed today' },
      { status: 'completed', date: hoursAgo(15), items: [createdProducts[2]], note: 'Completed today' },
      { status: 'completed', date: daysAgo(1), items: [createdProducts[3], createdProducts[4]], note: 'Completed yesterday' },
      { status: 'completed', date: daysAgo(1), items: [createdProducts[5]], note: 'Completed yesterday' },
      { status: 'completed', date: daysAgo(2), items: [createdProducts[6]], note: 'Completed 2 days ago' },
      { status: 'completed', date: daysAgo(2), items: [createdProducts[7]], note: 'Completed 2 days ago' },
      { status: 'completed', date: daysAgo(3), items: [createdProducts[8]], note: 'Completed 3 days ago' },
      { status: 'completed', date: daysAgo(3), items: [createdProducts[9]], note: 'Completed 3 days ago' },
      { status: 'completed', date: daysAgo(4), items: [createdProducts[0]], note: 'Completed 4 days ago' },
      { status: 'completed', date: daysAgo(5), items: [createdProducts[1]], note: 'Completed 5 days ago' },
      { status: 'completed', date: daysAgo(6), items: [createdProducts[2]], note: 'Completed 6 days ago' },
      { status: 'completed', date: daysAgo(7), items: [createdProducts[3]], note: 'Completed 7 days ago' },
      { status: 'completed', date: daysAgo(8), items: [createdProducts[4]], note: 'Completed 8 days ago' },
      { status: 'completed', date: daysAgo(10), items: [createdProducts[5]], note: 'Completed 10 days ago' },

      // 5 Failed orders
      { status: 'failed', date: hoursAgo(2), items: [createdProducts[6]], note: 'Payment gateway rejected' },
      { status: 'failed', date: hoursAgo(14), items: [createdProducts[7]], note: 'Card expired' },
      { status: 'failed', date: daysAgo(1), items: [createdProducts[8]], note: 'Fraud check failure' },
      { status: 'failed', date: daysAgo(2), items: [createdProducts[9]], note: 'User cancelled at 3DS' },
      { status: 'failed', date: daysAgo(4), items: [createdProducts[0]], note: 'Bank network timeout' },

      // 5 On-Hold orders
      { status: 'on-hold', date: hoursAgo(5), items: [createdProducts[1]], note: 'Awaiting offline bank transfer' },
      { status: 'on-hold', date: hoursAgo(28), items: [createdProducts[2]], note: 'Awaiting manual cheque clearance' },
      { status: 'on-hold', date: daysAgo(2), items: [createdProducts[3]], note: 'Address verification pending' },
      { status: 'on-hold', date: daysAgo(3), items: [createdProducts[4]], note: 'Awaiting merchant verification' },
      { status: 'on-hold', date: daysAgo(5), items: [createdProducts[5]], note: 'Awaiting international wire' },

      // 5 Cancelled orders
      { status: 'cancelled', date: hoursAgo(9), items: [createdProducts[6]], note: 'Cancelled by customer' },
      { status: 'cancelled', date: daysAgo(1), items: [createdProducts[7]], note: 'Item not needed' },
      { status: 'cancelled', date: daysAgo(2), items: [createdProducts[8]], note: 'Duplicate order' },
      { status: 'cancelled', date: daysAgo(3), items: [createdProducts[9]], note: 'Customer ordered wrong variant' },
      { status: 'cancelled', date: daysAgo(5), items: [createdProducts[0]], note: 'Cancelled due to delay' },
    ];

    let createdOrderCount = 0;
    const statusCounts: Record<string, number> = {};

    for (let i = 0; i < orderTemplates.length; i++) {
      const tpl = orderTemplates[i];
      const lineItems = tpl.items.map((prod) => ({
        product_id: prod.id,
        quantity: 1,
      }));

      const orderPayload = {
        payment_method: 'bacs',
        payment_method_title: 'Direct Bank Transfer',
        set_paid: tpl.status === 'completed' || tpl.status === 'processing',
        status: tpl.status,
        date_created: tpl.date,
        customer_note: tpl.note,
        billing: {
          first_name: `Customer${i + 1}`,
          last_name: 'MerchantTest',
          address_1: '123 Tech Commerce Boulevard',
          city: 'Bengaluru',
          state: 'KA',
          postcode: '560001',
          country: 'IN',
          email: `customer${i + 1}@example.com`,
          phone: '+91 9876543210',
        },
        shipping: {
          first_name: `Customer${i + 1}`,
          last_name: 'MerchantTest',
          address_1: '123 Tech Commerce Boulevard',
          city: 'Bengaluru',
          state: 'KA',
          postcode: '560001',
          country: 'IN',
        },
        line_items: lineItems,
      };

      try {
        const res = await client.post('/orders', orderPayload);
        createdOrderCount++;
        statusCounts[tpl.status] = (statusCounts[tpl.status] || 0) + 1;
        console.log(`  Created order #${res.data.id} - status: ${tpl.status} (${tpl.date})`);
      } catch (err: any) {
        console.error(`  Failed to create order #${i + 1}:`, err.response?.data?.message || err.message);
      }
    }

    console.log('\n========================================');
    console.log('CARTIX SEED SUMMARY');
    console.log('========================================');
    console.log(`Total Products seeded: ${createdProducts.length}`);
    console.log(`  - In Stock:      10`);
    console.log(`  - Low Stock:      5`);
    console.log(`  - Out of Stock:   5`);
    console.log(`\nTotal Orders seeded:   ${createdOrderCount}`);
    for (const [st, count] of Object.entries(statusCounts)) {
      console.log(`  - ${st.padEnd(12)}: ${count}`);
    }
    console.log('========================================\n');
    console.log('Seed completed successfully.');
  } catch (error: any) {
    console.error('\nSeed failed:', error.response?.data?.message || error.message);
    process.exit(1);
  }
}

seed();
