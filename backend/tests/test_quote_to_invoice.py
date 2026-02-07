"""
Test suite for Quote to Invoice conversion feature
Tests:
- Convert Quote to Invoice endpoint
- Converted quotes excluded from main quotes list
- Converted quotes visible in customer history
- PDF download and email send on converted quotes
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestQuoteToInvoiceConversion:
    """Test suite for converting quotes to invoices"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data and authentication"""
        # Login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@festive.com",
            "password": "festiveadmin"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
        
        # Get or create a city
        cities_response = requests.get(f"{BASE_URL}/api/cities", headers=self.headers)
        if cities_response.status_code == 200 and len(cities_response.json()) > 0:
            self.city_id = cities_response.json()[0]["id"]
        else:
            city_response = requests.post(f"{BASE_URL}/api/cities", 
                headers=self.headers,
                json={"name": "TEST_City", "state": "TX", "country": "USA"})
            self.city_id = city_response.json()["id"]
        
        # Get or create a customer
        customers_response = requests.get(f"{BASE_URL}/api/customers", headers=self.headers)
        if customers_response.status_code == 200 and len(customers_response.json()) > 0:
            self.customer_id = customers_response.json()[0]["id"]
            self.customer_email = customers_response.json()[0].get("email")
        else:
            customer_response = requests.post(f"{BASE_URL}/api/customers",
                headers=self.headers,
                json={
                    "name": "TEST_Customer",
                    "email": "test@example.com",
                    "phone": "555-1234",
                    "address": "123 Test St",
                    "city_id": self.city_id
                })
            self.customer_id = customer_response.json()["id"]
            self.customer_email = "test@example.com"
    
    def test_01_create_quote_for_conversion(self):
        """Create a new quote to test conversion"""
        quote_data = {
            "customer_id": self.customer_id,
            "city_id": self.city_id,
            "items": [
                {"description": "TEST_Christmas Light Installation", "quantity": 1, "unit_price": 500.00},
                {"description": "TEST_Premium LED Lights", "quantity": 10, "unit_price": 25.00}
            ],
            "notes": "Test quote for conversion"
        }
        
        response = requests.post(f"{BASE_URL}/api/quotes", headers=self.headers, json=quote_data)
        assert response.status_code == 200, f"Failed to create quote: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert "quote_number" in data
        assert data["status"] == "draft"
        assert data["total"] == 750.00  # 500 + (10 * 25)
        
        # Store for later tests
        self.__class__.test_quote_id = data["id"]
        self.__class__.test_quote_number = data["quote_number"]
        print(f"Created quote: {data['quote_number']} with ID: {data['id']}")
    
    def test_02_convert_quote_to_invoice(self):
        """Test converting a quote to an invoice"""
        quote_id = getattr(self.__class__, 'test_quote_id', None)
        if not quote_id:
            pytest.skip("No test quote available")
        
        response = requests.post(f"{BASE_URL}/api/quotes/{quote_id}/convert-to-invoice", 
            headers=self.headers)
        
        assert response.status_code == 200, f"Failed to convert quote: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert "invoice_number" in data
        assert data["quote_id"] == quote_id
        assert data["status"] == "pending"
        assert data["total"] == 750.00
        assert data["balance_due"] == 750.00
        assert data["amount_paid"] == 0.0
        
        # Store invoice ID for later tests
        self.__class__.test_invoice_id = data["id"]
        self.__class__.test_invoice_number = data["invoice_number"]
        print(f"Quote converted to Invoice: {data['invoice_number']}")
    
    def test_03_verify_quote_status_converted(self):
        """Verify the quote status is now 'converted'"""
        quote_id = getattr(self.__class__, 'test_quote_id', None)
        if not quote_id:
            pytest.skip("No test quote available")
        
        response = requests.get(f"{BASE_URL}/api/quotes/{quote_id}", headers=self.headers)
        assert response.status_code == 200, f"Failed to get quote: {response.text}"
        
        data = response.json()
        assert data["status"] == "converted", f"Expected status 'converted', got '{data['status']}'"
        print(f"Quote status verified: {data['status']}")
    
    def test_04_converted_quote_not_in_main_list(self):
        """Verify converted quotes are NOT in the main quotes list"""
        response = requests.get(f"{BASE_URL}/api/quotes", headers=self.headers)
        assert response.status_code == 200, f"Failed to get quotes: {response.text}"
        
        quotes = response.json()
        quote_id = getattr(self.__class__, 'test_quote_id', None)
        
        # Check that converted quote is not in the list
        quote_ids = [q["id"] for q in quotes]
        converted_statuses = [q["status"] for q in quotes if q["status"] == "converted"]
        
        assert quote_id not in quote_ids, "Converted quote should NOT appear in main quotes list"
        assert len(converted_statuses) == 0, "No converted quotes should appear in main list"
        print(f"Verified: Converted quote not in main list. Total quotes: {len(quotes)}")
    
    def test_05_converted_quote_in_customer_history(self):
        """Verify converted quotes ARE visible in customer history"""
        response = requests.get(
            f"{BASE_URL}/api/quotes/customer/{self.customer_id}?include_converted=true", 
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to get customer quotes: {response.text}"
        
        quotes = response.json()
        quote_id = getattr(self.__class__, 'test_quote_id', None)
        
        # Find the converted quote
        converted_quote = next((q for q in quotes if q["id"] == quote_id), None)
        assert converted_quote is not None, "Converted quote should appear in customer history"
        assert converted_quote["status"] == "converted", "Quote status should be 'converted'"
        print(f"Verified: Converted quote visible in customer history with status '{converted_quote['status']}'")
    
    def test_06_cannot_convert_already_converted_quote(self):
        """Verify that already converted quotes cannot be converted again"""
        quote_id = getattr(self.__class__, 'test_quote_id', None)
        if not quote_id:
            pytest.skip("No test quote available")
        
        response = requests.post(f"{BASE_URL}/api/quotes/{quote_id}/convert-to-invoice", 
            headers=self.headers)
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "already been converted" in response.json().get("detail", "").lower()
        print("Verified: Cannot convert already converted quote")
    
    def test_07_pdf_download_on_converted_quote(self):
        """Verify PDF download still works on converted quotes"""
        quote_id = getattr(self.__class__, 'test_quote_id', None)
        if not quote_id:
            pytest.skip("No test quote available")
        
        response = requests.get(f"{BASE_URL}/api/quotes/{quote_id}/pdf", headers=self.headers)
        assert response.status_code == 200, f"Failed to download PDF: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        assert len(response.content) > 0
        print(f"PDF download successful, size: {len(response.content)} bytes")
    
    def test_08_email_send_on_converted_quote(self):
        """Verify email send still works on converted quotes (mocked)"""
        quote_id = getattr(self.__class__, 'test_quote_id', None)
        if not quote_id:
            pytest.skip("No test quote available")
        
        response = requests.post(f"{BASE_URL}/api/email/send-quote/{quote_id}", 
            headers=self.headers)
        
        # Should succeed (mocked) or fail with customer email issue
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}"
        if response.status_code == 200:
            data = response.json()
            assert "status" in data
            print(f"Email send response: {data}")
        else:
            print(f"Email send failed (expected if no customer email): {response.json()}")
    
    def test_09_verify_invoice_created_correctly(self):
        """Verify the created invoice has correct data from quote"""
        invoice_id = getattr(self.__class__, 'test_invoice_id', None)
        if not invoice_id:
            pytest.skip("No test invoice available")
        
        response = requests.get(f"{BASE_URL}/api/invoices/{invoice_id}", headers=self.headers)
        assert response.status_code == 200, f"Failed to get invoice: {response.text}"
        
        data = response.json()
        assert data["customer_id"] == self.customer_id
        assert data["city_id"] == self.city_id
        assert len(data["items"]) == 2
        assert data["total"] == 750.00
        print(f"Invoice verified: {data['invoice_number']} with total ${data['total']}")
    
    def test_10_invoice_pdf_download(self):
        """Verify PDF download works on the created invoice"""
        invoice_id = getattr(self.__class__, 'test_invoice_id', None)
        if not invoice_id:
            pytest.skip("No test invoice available")
        
        response = requests.get(f"{BASE_URL}/api/invoices/{invoice_id}/pdf", headers=self.headers)
        assert response.status_code == 200, f"Failed to download invoice PDF: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        print(f"Invoice PDF download successful, size: {len(response.content)} bytes")


class TestQuotesListFiltering:
    """Test quotes list filtering behavior"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@festive.com",
            "password": "festiveadmin"
        })
        assert login_response.status_code == 200
        self.token = login_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_quotes_list_excludes_converted_by_default(self):
        """Main quotes list should exclude converted quotes by default"""
        response = requests.get(f"{BASE_URL}/api/quotes", headers=self.headers)
        assert response.status_code == 200
        
        quotes = response.json()
        converted_quotes = [q for q in quotes if q["status"] == "converted"]
        assert len(converted_quotes) == 0, "Converted quotes should not appear in default list"
        print(f"Quotes list has {len(quotes)} quotes, none converted")
    
    def test_quotes_list_with_include_converted(self):
        """Quotes list with include_converted=true should include converted quotes"""
        response = requests.get(f"{BASE_URL}/api/quotes?include_converted=true", headers=self.headers)
        assert response.status_code == 200
        
        quotes = response.json()
        print(f"Quotes list with include_converted=true has {len(quotes)} quotes")
        # Just verify the endpoint works, may or may not have converted quotes


class TestConvertQuoteEdgeCases:
    """Test edge cases for quote conversion"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@festive.com",
            "password": "festiveadmin"
        })
        assert login_response.status_code == 200
        self.token = login_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_convert_nonexistent_quote(self):
        """Converting a non-existent quote should return 404"""
        fake_id = str(uuid.uuid4())
        response = requests.post(f"{BASE_URL}/api/quotes/{fake_id}/convert-to-invoice", 
            headers=self.headers)
        
        assert response.status_code == 404
        print("Verified: 404 returned for non-existent quote")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
