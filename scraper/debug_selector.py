from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
import time

def debug_selectors():
    options = Options()
    options.add_argument("--headless")
    options.add_argument("--disable-gpu")
    options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
    try:
        url = "https://www.migros.com.tr/arama?q=yumurta"
        driver.get(url)
        time.sleep(8)
        
        # Strategy: Find the price text we saw earlier (around "TL") and print its parents
        # We saw "99,50 TL" in previous output. Let's look for elements containing "TL"
        
        print("Searching for elements with 'TL'...")
        # Get all elements with text containing TL
        # (This might be slow, so we limit to specific tags if needed, but let's try generic first)
        price_elements = driver.find_elements(By.XPATH, "//*[contains(text(), 'TL')]")
        
        print(f"Found {len(price_elements)} elements with 'TL'. analyzing first 5...")
        
        for i, el in enumerate(price_elements[:5]):
            try:
                print(f"\n--- Element {i} ---")
                print(f"Text: {el.text}")
                print(f"Tag: {el.tag_name}")
                print(f"Class: {el.get_attribute('class')}")
                
                # Go up 3 levels to see container
                parent = el
                for _ in range(3):
                    parent = parent.find_element(By.XPATH, "..")
                    print(f"  Parent Tag: {parent.tag_name}, Class: {parent.get_attribute('class')}")
            except Exception as e:
                print(f"Error analyzing element: {e}")
                
    except Exception as e:
        print(f"Error: {e}")
    finally:
        driver.quit()

if __name__ == "__main__":
    debug_selectors()
