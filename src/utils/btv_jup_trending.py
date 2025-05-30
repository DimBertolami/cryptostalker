import aiohttp
import asyncio
import csv
import os
from typing import List, Dict


EXPORT_DIR = "exports"
os.makedirs(EXPORT_DIR, exist_ok=True)


async def fetch_json(session, url, params=None):
    async with session.get(url, params=params) as response:
        return await response.json()


async def get_bitvavo_trending(session) -> List[Dict]:
    print("🚀 Fetching Bitvavo data...")
    markets_url = "https://api.bitvavo.com/v2/markets"
    markets = await fetch_json(session, markets_url)

    ticker_url = "https://api.bitvavo.com/v2/ticker/24h"
    stats = await fetch_json(session, ticker_url)
    stats_dict = {item['market']: item for item in stats}

    trending = []
    for market in markets:
        symbol = market['market']
        if symbol not in stats_dict:
            continue
        data = stats_dict[symbol]

        if not any(x in symbol for x in ["EUR", "USDT"]):
            continue

        trending.append({
            "id": symbol.lower(),
            "symbol": symbol,
            "name": symbol.split("-")[0],
            "market_cap_rank": None,
            "thumbnail": None,
            "price_EUR": float(data['last']) if "EUR" in symbol else None,
            "price_USD": float(data['last']) if "USDT" in symbol else None,
            "change_24h": float(data['priceChangePercentage']),
            "market_cap": None,
            "volume": float(data['volume']),
            "sparkline_url": None
        })

    trending = sorted(trending, key=lambda x: x['volume'], reverse=True)[:10]
    return trending


async def get_jupiter_trending(session) -> List[Dict]:
    print("🪐 Fetching Jupiter token list...")
    tokens_url = "https://token.jup.ag/all"
    tokens = await fetch_json(session, tokens_url)

    top_tokens = [t for t in tokens if t.get("extensions", {}).get("coingeckoId")][:10]

    results = []
    for token in top_tokens:
        token_id = token.get("symbol", "")
        name = token.get("name", "")
        coingecko_id = token["extensions"]["coingeckoId"]

        price_data = await fetch_json(session, f"https://price.jup.ag/v4/price", params={"ids": token_id})
        price_info = price_data.get(token_id, {})

        results.append({
            "id": coingecko_id,
            "name": name,
            "symbol": token_id,
            "market_cap_rank": None,
            "thumbnail": token.get("logoURI"),
            "price_EUR": None,
            "price_USD": price_info.get("price"),
            "change_24h": price_info.get("priceChangePct24h", 0),
            "market_cap": None,
            "volume": None,
            "sparkline_url": None
        })

    return results


def export_to_csv(filename: str, data: List[Dict]):
    if not data:
        return
    keys = data[0].keys()
    with open(os.path.join(EXPORT_DIR, filename), "w", newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=keys)
        writer.writeheader()
        writer.writerows(data)
    print(f"✅ Exported: {filename}")


async def main():
    async with aiohttp.ClientSession() as session:
        bitvavo_task = asyncio.create_task(get_bitvavo_trending(session))
        jupiter_task = asyncio.create_task(get_jupiter_trending(session))

        bitvavo_data, jupiter_data = await asyncio.gather(bitvavo_task, jupiter_task)

        export_to_csv("bitvavo_trending.csv", bitvavo_data)
        export_to_csv("jupiter_trending.csv", jupiter_data)


if __name__ == "__main__":
    main()