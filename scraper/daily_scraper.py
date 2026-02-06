from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import json
import time
from datetime import datetime
import re

# List of essential items
INGREDIENTS = [
    "yumurta", "süt", "tavuk göğsü", "pirinç", "makarna", 
    "domates", "soğan", "patates", "sıvı yağ", "yoğurt",
    "kaşar peyniri", "zeytin", "ekmek"
]

def clean_price(price_str):
    if not price_str: return 0.0
    clean = price_str.replace('TL', '').replace(' ', '').replace(',', '.')
    match = re.search(r'\d+(\.\d+)?', clean)
    if match: return float(match.group(0))
    return 0.0

def scrape_migros_daily():
    print(f"--- Starting Daily Migros Scrape (VISIBLE MODE): {datetime.now().strftime('%Y-%m-%d')} ---")
    
    options = Options()
    # options.add_argument("--headless") # DISABLED HEADLESS TO AVOID DETECT
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--window-size=1200,800")
    options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
    
    results = {
        "date": datetime.now().strftime('%Y-%m-%d'),
        "market": "Migros",
        "products": []
    }

    try:
        for item in INGREDIENTS:
            print(f"Fetching: {item}...")
            url = f"https://www.migros.com.tr/arama?q={item}"
            driver.get(url)
            
            # Wait for content
            time.sleep(4) 
            
            try:
                # Fallback strategy: Grab ANY price element to verify page load
                # Migros 'fe-product-card' is best but let's be loose
                
                # Check 1: Is there a card?
                cards = driver.find_elements(By.TAG_NAME, "fe-product-card")
                if not cards:
                     cards = driver.find_elements(By.CLASS_NAME, "product-card")

                if cards:
                    card = cards[0]
                    card_text = card.text
                    
                    product_data = {
                        "name": item, 
                        "found_title": "Unknown",
                        "price": 0.0, 
                        "unit": "adet",
                        "campaign": ""
                    }
                    
                    # Title
                    lines = card_text.split('\n')
                    if lines: product_data["found_title"] = lines[0]
                    
                    # Price via Class
                    try:
                        price_el = card.find_element(By.CLASS_NAME, "amount")
                        product_data["price"] = clean_price(price_el.text)
                    except:
                        # Price via Regex
                        match = re.search(r'(\d+[.,]\d+)\s*TL', card_text)
                        if match: product_data["price"] = clean_price(match.group(1))

                    # Campaign
                    if "3 Al 2" in card_text or "2." in card_text:
                        product_data["campaign"] = "Kampanya Var"

                    results["products"].append(product_data)
                    print(f"  Captured: {product_data['found_title']} ({product_data['price']} TL)")
                else:
                    print("  No Cards Found.")

            except Exception as e:
                print(f"  Error parsing {item}: {e}")

    except Exception as e:
        print(f"Global Error: {e}")
    finally:
        driver.quit()
        filename = f"prices_{datetime.now().strftime('%Y_%m_%d')}.json"
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        print(f"Saved to {filename}")

if __name__ == "__main__":
    scrape_migros_daily()
