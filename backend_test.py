#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Festive Lights CRM
Tests all major API endpoints and functionality
"""

import requests
import sys
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

class FestiveCRMTester:
    def __init__(self, base_url: str = "https://festivelights.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data storage
        self.test_city_id = None
        self.test_customer_id = None
        self.test_quote_id = None
        self.test_invoice_id = None
        self.test_crew_id = None
        self.test_installation_id = None

    def log_test(self, name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}: PASSED")
        else:
            print(f"❌ {name}: FAILED - {details}")
        
        self.test_results.append({
            "name": name,
            "success": success,
            "details": details,
            "response_data": response_data
        })

    def make_request(self, method: str, endpoint: str, data: Dict = None, expected_status: int = 200) -> tuple[bool, Dict]:
        """Make HTTP request with error handling"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                return False, {"error": f"Unsupported method: {method}"}

            success = response.status_code == expected_status
            try:
                response_data = response.json()
            except:
                response_data = {"status_code": response.status_code, "text": response.text}

            return success, response_data

        except requests.exceptions.RequestException as e:
            return False, {"error": str(e)}

    def test_health_check(self):
        """Test basic API health"""
        success, data = self.make_request('GET', '')
        self.log_test("API Health Check", success, 
                     "" if success else f"API not responding: {data.get('error', 'Unknown error')}", data)
        return success

    def test_login(self, email: str = "admin@festive.com", password: str = "admin123"):
        """Test user login"""
        success, data = self.make_request('POST', 'auth/login', {
            "email": email,
            "password": password
        })
        
        if success and 'token' in data:
            self.token = data['token']
            self.user_data = data.get('user', {})
            self.log_test("User Login", True, f"Logged in as {self.user_data.get('name', 'Unknown')}")
        else:
            self.log_test("User Login", False, f"Login failed: {data.get('detail', 'Unknown error')}", data)
        
        return success

    def test_auth_me(self):
        """Test getting current user info"""
        if not self.token:
            self.log_test("Get Current User", False, "No token available")
            return False
            
        success, data = self.make_request('GET', 'auth/me')
        self.log_test("Get Current User", success, 
                     "" if success else f"Failed to get user info: {data.get('detail', 'Unknown error')}", data)
        return success

    def test_cities_crud(self):
        """Test cities CRUD operations"""
        # Create city
        city_data = {
            "name": f"Test City {datetime.now().strftime('%H%M%S')}",
            "state": "CO",
            "country": "USA"
        }
        
        success, data = self.make_request('POST', 'cities', city_data, 200)
        if success and 'id' in data:
            self.test_city_id = data['id']
            self.log_test("Create City", True, f"Created city: {data['name']}")
        else:
            self.log_test("Create City", False, f"Failed to create city: {data.get('detail', 'Unknown error')}", data)
            return False

        # Get cities
        success, data = self.make_request('GET', 'cities')
        cities_found = success and isinstance(data, list) and len(data) > 0
        self.log_test("Get Cities", cities_found, 
                     f"Found {len(data) if isinstance(data, list) else 0} cities" if success else f"Failed: {data.get('detail', 'Unknown error')}")

        return cities_found

    def test_customers_crud(self):
        """Test customers CRUD operations"""
        if not self.test_city_id:
            self.log_test("Create Customer", False, "No test city available")
            return False

        # Create customer
        customer_data = {
            "name": f"Test Customer {datetime.now().strftime('%H%M%S')}",
            "email": f"test{datetime.now().strftime('%H%M%S')}@example.com",
            "phone": "555-0123",
            "address": "123 Test Street, Test City, CO 80000",
            "city_id": self.test_city_id,
            "notes": "Test customer for API testing"
        }
        
        success, data = self.make_request('POST', 'customers', customer_data, 200)
        if success and 'id' in data:
            self.test_customer_id = data['id']
            self.log_test("Create Customer", True, f"Created customer: {data['name']}")
        else:
            self.log_test("Create Customer", False, f"Failed: {data.get('detail', 'Unknown error')}", data)
            return False

        # Get customers
        success, data = self.make_request('GET', 'customers')
        customers_found = success and isinstance(data, list)
        self.log_test("Get Customers", customers_found, 
                     f"Found {len(data) if isinstance(data, list) else 0} customers" if success else f"Failed: {data.get('detail', 'Unknown error')}")

        # Get specific customer
        success, data = self.make_request('GET', f'customers/{self.test_customer_id}')
        self.log_test("Get Customer by ID", success, 
                     f"Retrieved customer: {data.get('name', 'Unknown')}" if success else f"Failed: {data.get('detail', 'Unknown error')}")

        return customers_found

    def test_quotes_crud(self):
        """Test quotes CRUD operations"""
        if not self.test_customer_id or not self.test_city_id:
            self.log_test("Create Quote", False, "Missing customer or city data")
            return False

        # Create quote
        quote_data = {
            "customer_id": self.test_customer_id,
            "city_id": self.test_city_id,
            "items": [
                {
                    "description": "Christmas Light Installation",
                    "quantity": 1,
                    "unit_price": 500.00
                },
                {
                    "description": "LED String Lights (100ft)",
                    "quantity": 5,
                    "unit_price": 25.00
                }
            ],
            "notes": "Test quote for holiday lighting",
            "valid_until": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        }
        
        success, data = self.make_request('POST', 'quotes', quote_data, 200)
        if success and 'id' in data:
            self.test_quote_id = data['id']
            self.log_test("Create Quote", True, f"Created quote: {data['quote_number']} (Total: ${data['total']})")
        else:
            self.log_test("Create Quote", False, f"Failed: {data.get('detail', 'Unknown error')}", data)
            return False

        # Get quotes
        success, data = self.make_request('GET', 'quotes')
        quotes_found = success and isinstance(data, list)
        self.log_test("Get Quotes", quotes_found, 
                     f"Found {len(data) if isinstance(data, list) else 0} quotes" if success else f"Failed: {data.get('detail', 'Unknown error')}")

        # Get specific quote
        success, data = self.make_request('GET', f'quotes/{self.test_quote_id}')
        self.log_test("Get Quote by ID", success, 
                     f"Retrieved quote: {data.get('quote_number', 'Unknown')}" if success else f"Failed: {data.get('detail', 'Unknown error')}")

        return quotes_found

    def test_invoices_crud(self):
        """Test invoices CRUD operations"""
        if not self.test_customer_id or not self.test_city_id:
            self.log_test("Create Invoice", False, "Missing customer or city data")
            return False

        # Create invoice
        invoice_data = {
            "customer_id": self.test_customer_id,
            "city_id": self.test_city_id,
            "quote_id": self.test_quote_id,
            "items": [
                {
                    "description": "Christmas Light Installation",
                    "quantity": 1,
                    "unit_price": 500.00
                },
                {
                    "description": "LED String Lights (100ft)",
                    "quantity": 5,
                    "unit_price": 25.00
                }
            ],
            "notes": "Test invoice for holiday lighting",
            "due_date": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        }
        
        success, data = self.make_request('POST', 'invoices', invoice_data, 200)
        if success and 'id' in data:
            self.test_invoice_id = data['id']
            self.log_test("Create Invoice", True, f"Created invoice: {data['invoice_number']} (Total: ${data['total']})")
        else:
            self.log_test("Create Invoice", False, f"Failed: {data.get('detail', 'Unknown error')}", data)
            return False

        # Get invoices
        success, data = self.make_request('GET', 'invoices')
        invoices_found = success and isinstance(data, list)
        self.log_test("Get Invoices", invoices_found, 
                     f"Found {len(data) if isinstance(data, list) else 0} invoices" if success else f"Failed: {data.get('detail', 'Unknown error')}")

        # Get unpaid invoices
        success, data = self.make_request('GET', 'invoices/unpaid')
        unpaid_found = success and isinstance(data, list)
        self.log_test("Get Unpaid Invoices", unpaid_found, 
                     f"Found {len(data) if isinstance(data, list) else 0} unpaid invoices" if success else f"Failed: {data.get('detail', 'Unknown error')}")

        return invoices_found

    def test_crews_crud(self):
        """Test crews CRUD operations"""
        if not self.test_city_id:
            self.log_test("Create Crew", False, "No test city available")
            return False

        # Create crew
        crew_data = {
            "name": f"Test Crew {datetime.now().strftime('%H%M%S')}",
            "email": f"crew{datetime.now().strftime('%H%M%S')}@example.com",
            "password": "testpass123",
            "phone": "555-0124",
            "city_id": self.test_city_id,
            "skills": ["installation", "removal"],
            "color": "#0ea5e9"
        }
        
        success, data = self.make_request('POST', 'crews', crew_data, 200)
        if success and 'id' in data:
            self.test_crew_id = data['id']
            self.log_test("Create Crew", True, f"Created crew: {data['name']}")
        else:
            self.log_test("Create Crew", False, f"Failed: {data.get('detail', 'Unknown error')}", data)
            return False

        # Get crews
        success, data = self.make_request('GET', 'crews')
        crews_found = success and isinstance(data, list)
        self.log_test("Get Crews", crews_found, 
                     f"Found {len(data) if isinstance(data, list) else 0} crews" if success else f"Failed: {data.get('detail', 'Unknown error')}")

        return crews_found

    def test_installations_crud(self):
        """Test installations/scheduling CRUD operations"""
        if not all([self.test_customer_id, self.test_city_id, self.test_crew_id]):
            self.log_test("Create Installation", False, "Missing required data (customer, city, or crew)")
            return False

        # Create installation
        installation_data = {
            "customer_id": self.test_customer_id,
            "city_id": self.test_city_id,
            "quote_id": self.test_quote_id,
            "invoice_id": self.test_invoice_id,
            "crew_ids": [self.test_crew_id],
            "scheduled_date": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
            "scheduled_time": "09:00",
            "estimated_hours": 4.0,
            "address": "123 Test Street, Test City, CO 80000",
            "notes": "Test installation for holiday lighting",
            "installation_type": "installation"
        }
        
        success, data = self.make_request('POST', 'installations', installation_data, 200)
        if success and 'id' in data:
            self.test_installation_id = data['id']
            self.log_test("Create Installation", True, f"Scheduled installation for {data['scheduled_date']}")
        else:
            self.log_test("Create Installation", False, f"Failed: {data.get('detail', 'Unknown error')}", data)
            return False

        # Get installations
        success, data = self.make_request('GET', 'installations')
        installations_found = success and isinstance(data, list)
        self.log_test("Get Installations", installations_found, 
                     f"Found {len(data) if isinstance(data, list) else 0} installations" if success else f"Failed: {data.get('detail', 'Unknown error')}")

        return installations_found

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        success, data = self.make_request('GET', 'dashboard/stats')
        
        if success and isinstance(data, dict):
            expected_keys = ['total_customers', 'total_quotes', 'total_invoices', 'total_revenue']
            has_required_keys = all(key in data for key in expected_keys)
            self.log_test("Dashboard Stats", has_required_keys, 
                         f"Stats: {data.get('total_customers', 0)} customers, {data.get('total_quotes', 0)} quotes, ${data.get('total_revenue', 0)} revenue" if has_required_keys else f"Missing required keys: {data}")
        else:
            self.log_test("Dashboard Stats", False, f"Failed: {data.get('detail', 'Unknown error')}", data)
            
        return success

    def test_pdf_generation(self):
        """Test PDF generation for quotes and invoices"""
        if not self.test_quote_id:
            self.log_test("Quote PDF Generation", False, "No test quote available")
            return False

        # Test quote PDF
        url = f"{self.api_url}/quotes/{self.test_quote_id}/pdf"
        headers = {'Authorization': f'Bearer {self.token}'} if self.token else {}
        
        try:
            response = requests.get(url, headers=headers, timeout=30)
            quote_pdf_success = response.status_code == 200 and response.headers.get('content-type') == 'application/pdf'
            self.log_test("Quote PDF Generation", quote_pdf_success, 
                         "PDF generated successfully" if quote_pdf_success else f"Failed with status {response.status_code}")
        except Exception as e:
            self.log_test("Quote PDF Generation", False, f"Error: {str(e)}")
            quote_pdf_success = False

        # Test invoice PDF
        if not self.test_invoice_id:
            self.log_test("Invoice PDF Generation", False, "No test invoice available")
            return quote_pdf_success

        url = f"{self.api_url}/invoices/{self.test_invoice_id}/pdf"
        try:
            response = requests.get(url, headers=headers, timeout=30)
            invoice_pdf_success = response.status_code == 200 and response.headers.get('content-type') == 'application/pdf'
            self.log_test("Invoice PDF Generation", invoice_pdf_success, 
                         "PDF generated successfully" if invoice_pdf_success else f"Failed with status {response.status_code}")
        except Exception as e:
            self.log_test("Invoice PDF Generation", False, f"Error: {str(e)}")
            invoice_pdf_success = False

        return quote_pdf_success and invoice_pdf_success

    def test_mocked_integrations(self):
        """Test mocked integrations (email, WhatsApp, Viber)"""
        if not self.test_quote_id:
            self.log_test("Email Integration", False, "No test quote available")
            return False

        # Test email sending (mocked)
        success, data = self.make_request('POST', f'email/send-quote/{self.test_quote_id}')
        email_success = success and data.get('status') == 'mocked'
        self.log_test("Email Integration (Mocked)", email_success, 
                     "Email mock working" if email_success else f"Failed: {data.get('detail', 'Unknown error')}")

        # Test WhatsApp (mocked)
        success, data = self.make_request('POST', f'messaging/whatsapp/{self.test_quote_id}?message_type=quote')
        whatsapp_success = success and data.get('status') == 'mocked'
        self.log_test("WhatsApp Integration (Mocked)", whatsapp_success, 
                     "WhatsApp mock working" if whatsapp_success else f"Failed: {data.get('detail', 'Unknown error')}")

        # Test Viber (mocked)
        success, data = self.make_request('POST', f'messaging/viber/{self.test_quote_id}?message_type=quote')
        viber_success = success and data.get('status') == 'mocked'
        self.log_test("Viber Integration (Mocked)", viber_success, 
                     "Viber mock working" if viber_success else f"Failed: {data.get('detail', 'Unknown error')}")

        return email_success and whatsapp_success and viber_success

    def run_all_tests(self):
        """Run comprehensive test suite"""
        print("🚀 Starting Festive Lights CRM Backend API Tests")
        print(f"📍 Testing against: {self.base_url}")
        print("=" * 60)

        # Core tests
        if not self.test_health_check():
            print("❌ API is not responding. Stopping tests.")
            return False

        if not self.test_login():
            print("❌ Login failed. Cannot proceed with authenticated tests.")
            return False

        # Authentication tests
        self.test_auth_me()

        # CRUD operations tests
        self.test_cities_crud()
        self.test_customers_crud()
        self.test_quotes_crud()
        self.test_invoices_crud()
        self.test_crews_crud()
        self.test_installations_crud()

        # Feature tests
        self.test_dashboard_stats()
        self.test_pdf_generation()
        self.test_mocked_integrations()

        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        print(f"✅ Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

    def get_test_summary(self):
        """Get detailed test summary"""
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "failed_tests": self.tests_run - self.tests_passed,
            "success_rate": (self.tests_passed/self.tests_run*100) if self.tests_run > 0 else 0,
            "test_results": self.test_results
        }

def main():
    """Main test execution"""
    tester = FestiveCRMTester()
    
    try:
        success = tester.run_all_tests()
        summary = tester.get_test_summary()
        
        # Save detailed results
        with open('/app/backend_test_results.json', 'w') as f:
            json.dump(summary, f, indent=2)
        
        return 0 if success else 1
        
    except Exception as e:
        print(f"❌ Test execution failed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())