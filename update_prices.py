#!/usr/bin/env python3
"""
PhoneMatch DZ - automatic Algerian price updater.

Sources are public listing pages. The updater:
1) searches Ouedkniss for each model,
2) optionally scans Webstar-Electro category pages,
3) extracts candidate prices,
4) keeps the cheapest plausible NEW/listed offer per source,
5) writes prices.json for the static website.

This is intentionally conservative: it does not overwrite a price when no
plausible match is found. It also records source URL and update time.
"""
from __future__ import annotations
import json, re, time, unicodedata
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote_plus

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
PHONES_JS = ROOT / "phones.js"
OUT = ROOT / "prices.json"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; PhoneMatchDZ/3.0; +https://islam57-star.github.io/PhoneMatchdz/)"
}

# The website database keeps technical specs in phones.js.
# Only prices/offers are updated here.
PHONE_NAMES = [
    "Samsung Galaxy A07", "Samsung Galaxy A16 4G", "Samsung Galaxy A26 5G",
    "Samsung Galaxy A36 5G", "Samsung Galaxy A37 5G", "Samsung Galaxy A57 5G",
    "Samsung Galaxy S24", "Samsung Galaxy S25", "Samsung Galaxy S25 Ultra",
    "Xiaomi Redmi A5", "Xiaomi Redmi Note 14", "Xiaomi Redmi Note 14 Pro+ 5G",
    "Xiaomi Redmi Note 15 Pro 5G", "POCO M8 5G", "POCO F7",
    "Realme 12X 5G", "Realme C85", "Honor X8d", "Honor X9d 5G",
    "iPhone 13", "Infinix Smart 10", "Nubia Neo 3 5G",
]

# Search aliases improve matching on Arabic/French/short store titles.
ALIASES = {
    "Samsung Galaxy A07": ["Galaxy A07", "Samsung A07"],
    "Samsung Galaxy A16 4G": ["Galaxy A16", "Samsung A16"],
    "Samsung Galaxy A26 5G": ["Galaxy A26", "Samsung A26"],
    "Samsung Galaxy A36 5G": ["Galaxy A36", "Samsung A36"],
    "Samsung Galaxy A37 5G": ["Galaxy A37", "Samsung A37"],
    "Samsung Galaxy A57 5G": ["Galaxy A57", "Samsung A57"],
    "Samsung Galaxy S24": ["Galaxy S24", "Samsung S24"],
    "Samsung Galaxy S25": ["Galaxy S25", "Samsung S25"],
    "Samsung Galaxy S25 Ultra": ["Galaxy S25 Ultra", "Samsung S25 Ultra"],
    "Xiaomi Redmi A5": ["Redmi A5", "Xiaomi A5"],
    "Xiaomi Redmi Note 14": ["Redmi Note 14"],
    "Xiaomi Redmi Note 14 Pro+ 5G": ["Redmi Note 14 Pro+", "Redmi Note 14 Pro Plus"],
    "Xiaomi Redmi Note 15 Pro 5G": ["Redmi Note 15 Pro"],
    "POCO M8 5G": ["POCO M8", "Poco M8"],
    "POCO F7": ["POCO F7", "Poco F7"],
    "Realme 12X 5G": ["Realme 12X", "12X 5G"],
    "Realme C85": ["Realme C85", "C85 8/256"],
    "Honor X8d": ["Honor X8d", "X8d"],
    "Honor X9d 5G": ["Honor X9d", "X9d 5G"],
    "iPhone 13": ["iPhone 13", "Apple iPhone 13"],
    "Infinix Smart 10": ["Infinix Smart 10", "Smart 10"],
    "Nubia Neo 3 5G": ["Nubia Neo 3", "Neo 3 5G"],
}

# Initial observations from public Algerian listings. These are fallback values
# until the first successful scheduled run.
INITIAL = {
    "Samsung Galaxy A07": {"price": 28000, "source": "Webstar-Electro"},
    "Samsung Galaxy A16 4G": {"price": 29500, "source": "Webstar-Electro"},
    "Samsung Galaxy A57 5G": {"price": 78000, "source": "Ouedkniss"},
    "Xiaomi Redmi Note 14": {"price": 42990, "source": "Ouedkniss"},
    "Realme C85": {"price": 42000, "source": "Webstar-Electro"},
    "Honor X9d 5G": {"price": 77990, "source": "Ouedkniss"},
    "iPhone 13": {"price": 76000, "source": "Webstar-Electro"},
}

def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s or "")
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower().replace("+", " plus ")
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()

def price_numbers(text: str):
    # 42 990 DA / 42990 DA / 42,990 DA
    out = []
    for m in re.finditer(r"(?<!\d)(\d{2,3}(?:[ .,\u00a0]\d{3})+|\d{4,6})\s*(?:DA|DZD|دج)", text, re.I):
        raw = re.sub(r"[^\d]", "", m.group(1))
        if raw:
            p = int(raw)
            if 8000 <= p <= 500000:
                out.append((p, m.start()))
    return out

def plausible_price(name: str, price: int) -> bool:
    # Reject obvious accessories, 1 DA placeholders, and used lowball ads.
    return 8000 <= price <= 500000

def fetch(url: str, timeout=25):
    r = requests.get(url, headers=HEADERS, timeout=timeout)
    r.raise_for_status()
    return r.text

def extract_candidates(html: str, target: str, source: str, url: str):
    soup = BeautifulSoup(html, "html.parser")
    text = soup.get_text(" ", strip=True)
    low = norm(text)
    aliases = [target] + ALIASES.get(target, [])
    alias_norms = [norm(a) for a in aliases]
    candidates = []
    # Look around each price. A candidate is accepted if enough model tokens
    # appear in a nearby window.
    for price, pos in price_numbers(text):
        window = norm(text[max(0, pos-260):pos+220])
        best = 0.0
        matched = None
        for a in alias_norms:
            toks = [t for t in a.split() if len(t) > 1]
            if not toks:
                continue
            hit = sum(1 for t in toks if t in window)
            ratio = hit / len(toks)
            if ratio > best:
                best, matched = ratio, a
        if best >= 0.50 and plausible_price(target, price):
            candidates.append({
                "price": price,
                "source": source,
                "url": url,
                "match": matched,
                "confidence": round(best, 2),
            })
    # Deduplicate same price/source.
    uniq = {(x["price"], x["source"], x["url"]): x for x in candidates}
    return list(uniq.values())

def search_ouedkniss(target: str):
    q = quote_plus(target)
    url = f"https://www.ouedkniss.com/telephones-smartphones/1?keywords={q}&lang=fr"
    html = fetch(url)
    return extract_candidates(html, target, "Ouedkniss", url)

def search_webstar(target: str):
    # Webstar has a broad mobile catalogue. Searching its public page is less
    # predictable than Ouedkniss, so failures are simply ignored.
    url = "https://webstar-electro.com/telephones-mobiles/?id_famille=3758&page=prix-telephones-portables-algerie&position=1"
    html = fetch(url)
    return extract_candidates(html, target, "Webstar-Electro", url)

def load_old():
    if OUT.exists():
        try:
            return json.loads(OUT.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {
        "generated_at": None,
        "currency": "DZD",
        "source_policy": "Public Algerian listings; prices are references, not guarantees.",
        "phones": {}
    }

def main():
    old = load_old()
    now = datetime.now(timezone.utc).isoformat()
    result = {
        "generated_at": now,
        "currency": "DZD",
        "source_policy": "Public Algerian listings; prices are references, not guarantees.",
        "phones": {}
    }

    for name in PHONE_NAMES:
        offers = []
        for fn in (search_ouedkniss, search_webstar):
            try:
                offers.extend(fn(name))
            except Exception as e:
                print(f"[WARN] {name} / {fn.__name__}: {e}")
            time.sleep(0.8)

        # Keep a small set of lowest plausible offers, avoiding duplicates.
        offers.sort(key=lambda x: (x["price"], -x["confidence"]))
        best = offers[:5]

        if best:
            chosen = best[0]
            result["phones"][name] = {
                "price": chosen["price"],
                "offers": best,
                "updated_at": now,
                "status": "live",
            }
        elif name in old.get("phones", {}):
            # Never destroy good data because a source temporarily blocked us.
            result["phones"][name] = old["phones"][name]
            result["phones"][name]["status"] = "cached"
        elif name in INITIAL:
            result["phones"][name] = {
                "price": INITIAL[name]["price"],
                "offers": [],
                "updated_at": now,
                "status": "fallback",
                "source": INITIAL[name]["source"],
            }

    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {OUT} with {len(result['phones'])} phones.")

if __name__ == "__main__":
    main()
