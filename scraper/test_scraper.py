import requests
from bs4 import BeautifulSoup
from fake_useragent import UserAgent
import re

def check_a101_sample():
    print("Testing A101 Connection...")
    url = "https://www.a101.com.tr/list/?search_text=yumurta"
    
    headers = {
        'User-Agent': UserAgent().random,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    }

    try:
        response = requests.get(url, headers=headers, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.content, 'html.parser')
            text_content = response.text
            
            # Strategy 1: Look for explicit price currency
            print("\n--- Searching for Price Patterns (TL/₺) ---")
            matches = list(re.finditer(r'(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)\s*(?:TL|₺)', text_content))
            for i, match in enumerate(matches[:5]):
                start = max(0, match.start() - 150)
                end = min(len(text_content), match.end() + 150)
                print(f"Match {i+1}: {match.group(0)}")
                print(f"Context: {text_content[start:end]}")
                print("-" * 40)
            
            # Strategy 2: Check for JSON data (Next.js properties)
            print("\n--- Searching for JSON Data ---")
            scripts = soup.find_all('script')
            for script in scripts:
                if script.string and ('"price"' in script.string or '"currentPrice"' in script.string):
                    print(f"Found potential JSON data in <script>: {script.string[:200]}...")
                    
        else:
            print("Failed to fetch page.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_a101_sample()
