import requests
import sys
import json
from datetime import datetime

class SmartDineAPITester:
    def __init__(self, base_url="https://smart-dine-9.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        if headers is None:
            headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                except:
                    print(f"   Response: {response.text[:200]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")

            self.test_results.append({
                "name": name,
                "method": method,
                "endpoint": endpoint,
                "expected_status": expected_status,
                "actual_status": response.status_code,
                "success": success,
                "response_preview": response.text[:200] if not success else "OK"
            })

            return success, response.json() if success and response.text else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.test_results.append({
                "name": name,
                "method": method,
                "endpoint": endpoint,
                "expected_status": expected_status,
                "actual_status": "ERROR",
                "success": False,
                "response_preview": str(e)
            })
            return False, {}

    def test_initialization(self):
        """Test data initialization"""
        print("\n=== TESTING DATA INITIALIZATION ===")
        success, response = self.run_test(
            "Initialize Sample Data",
            "POST",
            "init-data",
            200
        )
        return success

    def test_menu_endpoints(self):
        """Test menu-related endpoints"""
        print("\n=== TESTING MENU ENDPOINTS ===")
        
        # Get menu
        success, menu_data = self.run_test(
            "Get Menu Items",
            "GET",
            "menu",
            200
        )
        
        if not success or not menu_data:
            return False
            
        print(f"   Found {len(menu_data)} menu items")
        
        # Test menu availability update
        if menu_data:
            first_item = menu_data[0]
            item_id = first_item.get('id')
            if item_id:
                success, _ = self.run_test(
                    "Update Menu Availability",
                    "PUT",
                    f"menu/{item_id}/availability",
                    200,
                    data={"availability": False}
                )
                
                # Revert back
                self.run_test(
                    "Revert Menu Availability",
                    "PUT",
                    f"menu/{item_id}/availability",
                    200,
                    data={"availability": True}
                )
        
        return success

    def test_tables_endpoints(self):
        """Test table-related endpoints"""
        print("\n=== TESTING TABLES ENDPOINTS ===")
        
        # Get all tables
        success, tables_data = self.run_test(
            "Get All Tables",
            "GET",
            "tables",
            200
        )
        
        if not success or not tables_data:
            return False
            
        print(f"   Found {len(tables_data)} tables")
        
        # Test get specific table
        if tables_data:
            first_table = tables_data[0]
            table_number = first_table.get('tableNumber')
            if table_number:
                success, _ = self.run_test(
                    f"Get Table {table_number}",
                    "GET",
                    f"tables/{table_number}",
                    200
                )
        
        return success

    def test_orders_workflow(self):
        """Test complete order workflow"""
        print("\n=== TESTING ORDERS WORKFLOW ===")
        
        # First get menu to create order
        _, menu_data = self.run_test(
            "Get Menu for Order",
            "GET",
            "menu",
            200
        )
        
        if not menu_data:
            print("❌ Cannot test orders without menu data")
            return False
        
        # Create test order
        test_order = {
            "tableNumber": 1,
            "items": [
                {
                    "id": menu_data[0]['id'],
                    "name": menu_data[0]['name'],
                    "price": menu_data[0]['price'],
                    "quantity": 2
                }
            ],
            "totalAmount": menu_data[0]['price'] * 2,
            "waiterName": "John Smith"
        }
        
        # Create order
        success, order_response = self.run_test(
            "Create Order",
            "POST",
            "orders",
            200,
            data=test_order
        )
        
        if not success or not order_response:
            return False
            
        order_id = order_response.get('orderId')
        print(f"   Created order: {order_id}")
        
        # Get order by ID
        success, _ = self.run_test(
            "Get Order by ID",
            "GET",
            f"orders/{order_id}",
            200
        )
        
        # Get all orders
        success, _ = self.run_test(
            "Get All Orders",
            "GET",
            "orders",
            200
        )
        
        # Get table orders
        success, _ = self.run_test(
            "Get Table Orders",
            "GET",
            f"orders/table/{test_order['tableNumber']}",
            200
        )
        
        # Update order status
        success, _ = self.run_test(
            "Update Order Status",
            "PUT",
            f"orders/{order_id}/status",
            200,
            data={"status": "accepted"}
        )
        
        # Mark order as paid
        success, _ = self.run_test(
            "Mark Order as Paid",
            "PUT",
            f"orders/{order_id}/payment",
            200
        )
        
        return success

    def test_kitchen_endpoints(self):
        """Test kitchen-related endpoints"""
        print("\n=== TESTING KITCHEN ENDPOINTS ===")
        
        success, kitchen_orders = self.run_test(
            "Get Kitchen Orders",
            "GET",
            "kitchen/orders",
            200
        )
        
        if success:
            print(f"   Found {len(kitchen_orders)} active kitchen orders")
        
        return success

    def test_ratings_endpoints(self):
        """Test rating-related endpoints"""
        print("\n=== TESTING RATINGS ENDPOINTS ===")
        
        # Create test rating
        test_rating = {
            "orderId": "test-order-123",
            "tableNumber": 1,
            "rating": 5,
            "feedback": "Excellent food and service!"
        }
        
        success, _ = self.run_test(
            "Create Rating",
            "POST",
            "ratings",
            200,
            data=test_rating
        )
        
        # Get all ratings
        success, ratings_data = self.run_test(
            "Get All Ratings",
            "GET",
            "ratings",
            200
        )
        
        if success:
            print(f"   Found {len(ratings_data)} ratings")
        
        return success

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Smart Dine API Testing...")
        print(f"Base URL: {self.base_url}")
        
        # Test initialization first
        init_success = self.test_initialization()
        if not init_success:
            print("❌ Data initialization failed, continuing with other tests...")
        
        # Run all test suites
        menu_success = self.test_menu_endpoints()
        tables_success = self.test_tables_endpoints()
        orders_success = self.test_orders_workflow()
        kitchen_success = self.test_kitchen_endpoints()
        ratings_success = self.test_ratings_endpoints()
        
        # Print summary
        print(f"\n📊 TEST SUMMARY")
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        # Print failed tests
        failed_tests = [test for test in self.test_results if not test['success']]
        if failed_tests:
            print(f"\n❌ FAILED TESTS ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"   - {test['name']}: {test['actual_status']} (expected {test['expected_status']})")
                if test['response_preview']:
                    print(f"     Error: {test['response_preview']}")
        
        overall_success = self.tests_passed == self.tests_run
        return overall_success, {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "failed_tests": len(failed_tests),
            "success_rate": (self.tests_passed/self.tests_run*100) if self.tests_run > 0 else 0,
            "failed_test_details": failed_tests
        }

def main():
    tester = SmartDineAPITester()
    success, results = tester.run_all_tests()
    
    # Save results to file
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())