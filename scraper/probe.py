import requests
from fake_useragent import UserAgent

def probe(url, name):
    print(f"\n--- Probing {name} ---")
    headers = {
        'User-Agent': UserAgent().random,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Referer': 'https://www.google.com/'
    }
    try:
        response = requests.get(url, headers=headers, timeout=10)
        print(f"Status: {response.status_code}")
        print(f"Title in HTML: {'<title>' in response.text}")
        if response.status_code == 200:
            print(f"Length: {len(response.text)}")
            if "yumurta" in response.text.lower():
                print("keyword 'yumurta' found in body.")
            else:
                print("keyword 'yumurta' NOT found (Possible JS rendering or Blocking).")
            
            # Check for Price
            if "TL" in response.text or "₺" in response.text:
                print("Currency symbol found.")
            else:
                print("No currency symbol found.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    probe("https://www.a101.com.tr/list/?search_text=yumurta", "A101")
    probe("https://www.migros.com.tr/arama?q=yumurta", "Migros")
    # probe("https://www.sokmarket.com.tr/arama?q=yumurta", "ŞOK") # Sok often tough
