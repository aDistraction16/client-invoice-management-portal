const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testAPI() {
  console.log('🧪 Starting API Testing for Phase 3...\n');
  
  try {
    // Test 1: Health Check
    console.log('1. Testing Health Endpoint...');
    const healthResponse = await axios.get('http://localhost:3001/health');
    console.log('✅ Health Check:', healthResponse.data);
    console.log('');

    // Test 2: User Registration
    console.log('2. Testing User Registration...');
    const registerData = {
      email: 'test@example.com',
      password: 'password123',
      companyName: 'Test Company',
      contactPerson: 'John Doe'
    };
    
    try {
      const registerResponse = await axios.post(`${API_BASE}/auth/register`, registerData);
      console.log('✅ User Registration Success:', registerResponse.data);
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('ℹ️ User already exists, proceeding with login test...');
      } else {
        console.log('❌ Registration Error:', error.response?.data || error.message);
      }
    }
    console.log('');

    // Test 3: User Login
    console.log('3. Testing User Login...');
    const loginData = {
      email: 'test@example.com',
      password: 'password123'
    };
    
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, loginData);
    console.log('✅ User Login Success:', loginResponse.data);
    
    // Extract session cookie for authenticated requests
    const cookies = loginResponse.headers['set-cookie'];
    const sessionCookie = cookies ? cookies[0].split(';')[0] : '';
    console.log('');

    // Test 4: Get Current User (Protected Route)
    console.log('4. Testing Protected Route - Get Current User...');
    const meResponse = await axios.get(`${API_BASE}/auth/me`, {
      headers: { Cookie: sessionCookie }
    });
    console.log('✅ Current User:', meResponse.data);
    console.log('');

    // Test 5: Create Client
    console.log('5. Testing Client Creation...');
    const clientData = {
      clientName: 'Acme Corporation',
      contactPerson: 'Jane Smith',
      email: 'jane@acme.com',
      address: '123 Business St, City, State 12345',
      phoneNumber: '+1-555-0123'
    };
    
    const clientResponse = await axios.post(`${API_BASE}/clients`, clientData, {
      headers: { Cookie: sessionCookie }
    });
    console.log('✅ Client Created:', clientResponse.data);
    const clientId = clientResponse.data.client.id;
    console.log('');

    // Test 6: Get All Clients
    console.log('6. Testing Get All Clients...');
    const clientsResponse = await axios.get(`${API_BASE}/clients`, {
      headers: { Cookie: sessionCookie }
    });
    console.log('✅ All Clients:', clientsResponse.data);
    console.log('');

    // Test 7: Create Project
    console.log('7. Testing Project Creation...');
    const projectData = {
      clientId: clientId,
      projectName: 'Website Redesign',
      description: 'Complete website redesign and development',
      hourlyRate: 75.00,
      status: 'active'
    };
    
    const projectResponse = await axios.post(`${API_BASE}/projects`, projectData, {
      headers: { Cookie: sessionCookie }
    });
    console.log('✅ Project Created:', projectResponse.data);
    const projectId = projectResponse.data.project.id;
    console.log('');

    // Test 8: Create Time Entry
    console.log('8. Testing Time Entry Creation...');
    const timeEntryData = {
      projectId: projectId,
      date: new Date().toISOString().split('T')[0],
      hoursLogged: 5.5,
      description: 'Initial design and planning'
    };
    
    const timeEntryResponse = await axios.post(`${API_BASE}/time-entries`, timeEntryData, {
      headers: { Cookie: sessionCookie }
    });
    console.log('✅ Time Entry Created:', timeEntryResponse.data);
    console.log('');

    // Test 9: Create Invoice
    console.log('9. Testing Invoice Creation...');
    const invoiceData = {
      clientId: clientId,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: [
        {
          description: 'Website Design Services',
          quantity: 10,
          unitPrice: 75.00
        },
        {
          description: 'Development Hours',
          quantity: 15,
          unitPrice: 85.00
        }
      ],
      notes: 'Thank you for your business!'
    };
    
    const invoiceResponse = await axios.post(`${API_BASE}/invoices`, invoiceData, {
      headers: { Cookie: sessionCookie }
    });
    console.log('✅ Invoice Created:', invoiceResponse.data);
    console.log('');

    // Test 10: Get All Invoices
    console.log('10. Testing Get All Invoices...');
    const invoicesResponse = await axios.get(`${API_BASE}/invoices`, {
      headers: { Cookie: sessionCookie }
    });
    console.log('✅ All Invoices:', invoicesResponse.data);
    console.log('');

    // Test 11: Logout
    console.log('11. Testing User Logout...');
    const logoutResponse = await axios.post(`${API_BASE}/auth/logout`, {}, {
      headers: { Cookie: sessionCookie }
    });
    console.log('✅ User Logout:', logoutResponse.data);
    console.log('');

    console.log('🎉 All API tests completed successfully!');
    console.log('✅ Phase 3: Backend Development - All endpoints validated');

  } catch (error) {
    console.error('❌ API Test Failed:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
  }
}

testAPI();
