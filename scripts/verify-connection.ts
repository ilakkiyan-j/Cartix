import { wooCommerceClient } from '../src/wooCommerce/client.js';
import { wooCommerceOrdersApi } from '../src/wooCommerce/orders.api.js';
import { wooCommerceProductsApi } from '../src/wooCommerce/products.api.js';

async function verify() {
  console.log('Testing WooCommerce connectivity and read operations...');
  const connectionResult = await wooCommerceClient.verifyConnection();
  console.log('Connection Check:', connectionResult);

  console.log('\nFetching products (first page)...');
  const products = await wooCommerceProductsApi.listProducts({ per_page: 5 });
  console.log(`Products returned: ${products.data.length} (Total available: ${products.total})`);
  if (products.data.length > 0) {
    console.log('Sample product:', {
      id: products.data[0].id,
      name: products.data[0].name,
      price: products.data[0].price,
      stock_status: products.data[0].stock_status,
    });
  }

  console.log('\nFetching orders (first page)...');
  const orders = await wooCommerceOrdersApi.listOrders({ per_page: 5 });
  console.log(`Orders returned: ${orders.data.length} (Total available: ${orders.total})`);
}

verify().catch(console.error);
