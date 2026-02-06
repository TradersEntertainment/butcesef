from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
import time

def scrape_migros():
    print("Initializing Selenium for Migros...")
    options = Options()
    options.add_argument("--headless")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
    
    try:
        url = "https://www.migros.com.tr/arama?q=yumurta"
        print(f"Navigating to {url}")
        driver.get(url)
        
        print("Waiting for page load...")
        time.sleep(10) # Migros is heavy
        
        body_text = driver.find_element(By.TAG_NAME, "body").text
        # print(f"Body snippet: {body_text[:500]}")
        
        if "yumurta" in body_text.lower():
            print("SUCCESS: Found 'yumurta' in content.")
            
            # Migros specific classes usually: 'amount', 'price', 'mat-caption'
            # Let's search for TL
            if "TL" in body_text:
                print("SUCCESS: Currency symbol found.")
                try:
                    # Generic attempt to find a price element
                    # Migros often uses <span class="amount">
                    elems = driver.find_elements(By.CLASS_NAME, "amount")
                    if elems:
                        print(f"Found class 'amount' element: {elems[0].text}")
                    else:
                        print("Class 'amount' not found. Dumping text snippet with TL:")
                        # find index of TL
                        idx = body_text.find("TL")
                        print(body_text[max(0, idx-20):min(len(body_text), idx+20)])
                except Exception as e:
                    print(f"Element find error: {e}")
        else:
            print("FAILED: 'yumurta' keyword not found.")
            print("Title:", driver.title)

    except Exception as e:
        print(f"Selenium Error: {e}")
    finally:
        driver.quit()

if __name__ == "__main__":
    scrape_migros()
