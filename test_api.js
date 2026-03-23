import axios from 'axios';

const testOrder = {
  items: [{ id: 1, name: 'Test Product', price: 100, quantity: 1 }],
  total: 100,
  customerName: 'Test Local',
  note: 'Test note',
  payWith: 500
};

async function test() {
  try {
    const res = await axios.post('http://localhost:3001/api/auto-orders', testOrder);
    console.log('Response Status:', res.status);
    console.log('Response Body:', res.data);
  } catch (err) {
    if (err.response) {
      console.error('Test Failed (Status):', err.response.status);
      console.error('Test Failed (Data):', err.response.data);
    } else {
      console.error('Test Failed:', err.message);
    }
  }
}

test();
