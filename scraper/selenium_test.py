from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

def scrape_with_selenium():
    print("Initializing Selenium...")
    options = Options()
    # options.add_argument("--headless") # Comment out mostly for debugging if user could see, but headless is safer for automation usually. 
    # For this environment, headless is mandatory if no display, but user has windows. Let's try headless first.
    options.add_argument("--headless")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")

    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
    
    try:
        url = "https://www.a101.com.tr/list/?search_text=yumurta"
        print(f"Navigating to {url}")
        driver.get(url)
        
        # Wait for product card to load.
        # Initial guess for selector: Look for something with 'price' or currency symbol
        print("Waiting for page load...")
        time.sleep(5) # fast wait
        
        body_text = driver.find_element(By.TAG_NAME, "body").text
        # print(f"Body snippet: {body_text[:500]}")
        
        if "yumurta" in body_text.lower():
            print("SUCCESS: Found 'yumurta' in rendered content.")
            
            # Try to grab the first price
            # Common A101 price class might be 'current-price' or similar.
            # Let's try finding element by text containing 'TL' or '₺'
            
            # Using Xpath to find any text with ₺
            try:
                price_element = driver.find_element(By.XPATH, "//*[contains(text(), '₺') or contains(text(), 'TL')]")
                print(f"Found Price Element: {price_element.text}")
            except:
                print("Could not isolate specific price element via XPath.")
                
        else:
            print("FAILED: 'yumurta' not found even after rendering.")

    except Exception as e:
        print(f"Selenium Error: {e}")
    finally:
        driver.quit()

if __name__ == "__main__":
    scrape_with_selenium()
