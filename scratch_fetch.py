import urllib.request
import re

url = "https://www.minhngoc.net.vn/xo-so-mien-bac.html"
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req) as response:
        html = response.read().decode('utf-8')
        print("HTML Length:", len(html))
        
        # Look for table with class containing "kqxs" or similar
        tables = re.findall(r'<table[^>]*class="[^"]*box_kqxs[^"]*"[^>]*>.*?</table>', html, re.DOTALL)
        print("Found box_kqxs tables:", len(tables))
        
        # Let's save a slice of the HTML containing table classes to a file
        with open("scratch_html.txt", "w", encoding="utf-8") as f:
            f.write(html[:100000])
except Exception as e:
    print("Error:", e)
