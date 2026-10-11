#!/usr/bin/env python3
"""
SCK — Automated VLESS Key Checker & Partitioning Engine
Запускается автоматически (например, в GitHub Actions) или локально.
Проверяет ключи, формирует docs/keys.json и сохраняет списки с разделением по 60 ключей.
"""

import re
import requests
import socket
import time
import json
import os
import sys
from collections import defaultdict
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed

# Принудительно настраиваем UTF-8 для корректного вывода на Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

BLACK_URL = "https://raw.githubusercontent.com/igareck/vpn-configs-for-russia/main/BLACK_VLESS_RUS.txt"
BLACK_MOBILE_URL = "https://raw.githubusercontent.com/igareck/vpn-configs-for-russia/main/BLACK_VLESS_RUS_mobile.txt"
WHITE_URL = "https://raw.githubusercontent.com/igareck/vpn-configs-for-russia/main/WHITE-CIDR-RU-checked.txt"

MAX_WORKERS = 25
TEST_TIMEOUT = 5
MAX_LATENCY_MS = 2000
CHUNK_SIZE = 60

COUNTRIES = {
    "baltics":     ["lithuania", "estonia", "latvia"],
    "finland":     ["finland"],
    "germany":     ["germany"],
    "sweden":      ["sweden"],
    "netherlands": ["netherlands"],
    "poland":      ["poland"],
}

COUNTRIES_ALL_KEYWORDS = [kw for kws in COUNTRIES.values() for kw in kws]
SKIP_COUNTRY_NAMES = {"anycast", "anycast-ip", "unknown", "none"}


def parse_country_from_key(key):
    """
    Возвращает (country_name, flag_emoji) из URL fragment (#...).
    Поддерживает форматы с запятой, пайпом, дефисом или просто пробелом после флага.
    """
    if '#' not in key:
        return None, None
    from urllib.parse import unquote
    fragment = unquote(key.split('#', 1)[1]).strip()

    # Сначала пробуем стандартный шаблон с разделителем (, | -)
    match = re.search(
        r'([A-Z][A-Za-z\u00C0-\u017E\s\-]{2,30})(?:\s*[,|\-])',
        fragment
    )
    if match:
        country = match.group(1).strip()
        flag = fragment[:match.start()].strip() or "🌍"
        return country, flag

    # Если разделителя нет, ищем имя страны после эмодзи флагов
    flag_match = re.match(r'^([\U0001F1E6-\U0001F1FF]{2})\s*([A-Za-z\u00C0-\u017E\s\-]{2,30})', fragment)
    if flag_match:
        return flag_match.group(2).strip(), flag_match.group(1).strip()

    return None, None


def fetch_keys(url):
    """Загружает VLESS-ключи по URL."""
    headers = {"User-Agent": "SCK-VLESS-Checker/2.0"}
    resp = requests.get(url, headers=headers, timeout=15)
    resp.raise_for_status()
    lines = resp.text.strip().splitlines()
    return [line.strip() for line in lines if line.strip().startswith("vless://")]


def filter_keys(keys, mode):
    """Фильтрует список ключей по выбранному региону или режиму."""
    if mode in COUNTRIES:
        keywords = COUNTRIES[mode]
        return [k for k in keys if any(kw in k.lower() for kw in keywords)]
    if mode == "other":
        return [k for k in keys if not any(kw in k.lower() for kw in COUNTRIES_ALL_KEYWORDS) and "russia" not in k.lower()]
    if mode == "russia":
        return [k for k in keys if "russia" in k.lower()]
    if mode.startswith("w_"):
        country = mode[2:]
        if country in COUNTRIES:
            keywords = COUNTRIES[country]
            return [k for k in keys if any(kw in k.lower() for kw in keywords)]
        if country == "other":
            return [k for k in keys if not any(kw in k.lower() for kw in COUNTRIES_ALL_KEYWORDS) and "russia" not in k.lower()]
    return keys


def parse_host_port(key):
    """Извлекает host и port с поддержкой IPv6 и дефолтных портов."""
    try:
        without_scheme = key[len("vless://"):]
        at_idx = without_scheme.rfind("@")
        if at_idx != -1:
            without_scheme = without_scheme[at_idx + 1:]
        host_port = without_scheme.split("?")[0].split("#")[0]

        if host_port.startswith("[") and "]" in host_port:
            bracket_idx = host_port.rfind("]")
            host = host_port[1:bracket_idx]
            rest = host_port[bracket_idx + 1:]
            port = int(rest.lstrip(":")) if rest.startswith(":") else 443
            return host, port

        if ":" in host_port:
            host, port = host_port.rsplit(":", 1)
            return host.strip("[]"), int(port)
        else:
            return host_port.strip("[]"), 443
    except Exception:
        pass
    return None, None


def test_key(key):
    """Проверяет TCP соединение и возвращает лучший latency или None."""
    host, port = parse_host_port(key)
    if not host or not port:
        return None

    try:
        infos = socket.getaddrinfo(host, port, socket.AF_UNSPEC, socket.SOCK_STREAM)
    except Exception:
        return None

    best = None
    for family, socktype, proto, canonname, sockaddr in infos:
        start = time.time()
        try:
            sock = socket.socket(family, socktype, proto)
            sock.settimeout(TEST_TIMEOUT)
            result = sock.connect_ex(sockaddr)
            sock.close()
            elapsed = round((time.time() - start) * 1000, 1)
            if result == 0 and elapsed <= MAX_LATENCY_MS:
                best = {"key": key, "host": host, "port": port, "latency_ms": elapsed}
                # Подключились успешно — прерываем цикл, чтобы не ждать другие адреса
                break
        except Exception:
            pass
    return best


def check_mode(keys, old_first_seen=None):
    """Проверяет ключи для режима и формирует результаты."""
    if old_first_seen is None:
        old_first_seen = {}
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    working = []

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {executor.submit(test_key, key): key for key in keys}
        for future in as_completed(futures):
            res = future.result()
            if res:
                working.append(res)

    working.sort(key=lambda x: x["latency_ms"])

    for r in working:
        r["first_seen"] = old_first_seen.get(r["key"], now)

    return {
        "best": working[0]["key"] if working else None,
        "top10": working[:10],
        "all_working": working,
        "total_working": len(working),
        "total": len(keys),
    }


def load_old_first_seen():
    """
    Рекурсивно извлекает first_seen для всех ранее обнаруженных ключей,
    включая страны из other_countries.
    """
    seen = {}
    try:
        if not os.path.exists("docs/keys.json"):
            return seen
        with open("docs/keys.json", "r", encoding="utf-8") as f:
            old = json.load(f)

        def walk(obj):
            if isinstance(obj, dict):
                if "top10" in obj and isinstance(obj["top10"], list):
                    for item in obj["top10"]:
                        if isinstance(item, dict) and "key" in item and "first_seen" in item:
                            seen[item["key"]] = item["first_seen"]
                for val in obj.values():
                    walk(val)
            elif isinstance(obj, list):
                for item in obj:
                    walk(item)

        walk(old)
    except Exception as e:
        print(f"Предупреждение при загрузке старых first_seen: {e}")
    return seen


def save_partitions_and_chunks(all_working_dict, chunk_size=CHUNK_SIZE):
    """
    Сохраняет все найденные рабочие ключи:
    - docs/working_keys.txt и working_keys.txt (разделены по chunk_size ключей)
    - docs/chunks/part_*.txt и chunks/part_*.txt
    - Возвращает структуру chunks_info для внедрения в keys.json
    """
    # Сортируем все рабочие ключи по минимальному пингу
    all_sorted = sorted(all_working_dict.values(), key=lambda x: x["latency_ms"])
    total_count = len(all_sorted)
    total_chunks = (total_count + chunk_size - 1) // chunk_size if total_count > 0 else 0
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    # Создаем директории
    os.makedirs("docs/chunks", exist_ok=True)
    os.makedirs("chunks", exist_ok=True)

    # 1. Единый файл с разделителями по 60 ключей
    content_lines = [
        "# ============================================================",
        "# SCK VLESS CHECKER — ВСЕ РАБОЧИЕ СЕРВЕРЫ",
        f"# Всего ключей: {total_count} | Размер блока: {chunk_size} шт.",
        f"# Количество блоков: {total_chunks} | Обновлено: {now_str}",
        "# ============================================================",
        ""
    ]

    chunks_data = []

    for c in range(total_chunks):
        chunk_items = all_sorted[c * chunk_size : (c + 1) * chunk_size]
        part_num = c + 1
        part_size = len(chunk_items)
        avg_lat = round(sum(it["latency_ms"] for it in chunk_items) / part_size, 1) if part_size else 0

        # Добавляем в общий файл
        content_lines.append("")
        content_lines.append(f"# ------------------------------------------------------------")
        content_lines.append(f"# SCK ПАКЕТ #{part_num} (Ключи {c * chunk_size + 1}–{c * chunk_size + part_size} из {total_count}) [ср. пинг: {avg_lat} мс]")
        content_lines.append(f"# ------------------------------------------------------------")
        for it in chunk_items:
            content_lines.append(it["key"])

        # Сохраняем индивидуальный файл чанка
        chunk_text_header = [
            f"# SCK VLESS Keys — Пакет #{part_num} ({part_size} ключей)",
            f"# Ср. задержка: {avg_lat} мс | Обновлено: {now_str}",
            ""
        ]
        chunk_body = "\n".join(chunk_text_header) + "\n" + "\n".join(it["key"] for it in chunk_items) + "\n"

        with open(f"docs/chunks/part_{part_num}.txt", "w", encoding="utf-8") as f:
            f.write(chunk_body)
        with open(f"chunks/part_{part_num}.txt", "w", encoding="utf-8") as f:
            f.write(chunk_body)

        chunks_data.append({
            "part": part_num,
            "count": part_size,
            "avg_latency": avg_lat,
            "file": f"chunks/part_{part_num}.txt",
            "keys": [it["key"] for it in chunk_items],
            "hosts": [f"{it['host']}:{it['port']} ({it['latency_ms']} мс)" for it in chunk_items[:5]]
        })

    full_text = "\n".join(content_lines) + "\n"
    with open("docs/working_keys.txt", "w", encoding="utf-8") as f:
        f.write(full_text)
    with open("working_keys.txt", "w", encoding="utf-8") as f:
        f.write(full_text)

    print(f"💾 [SCK] Сохранен общий файл с разделением по {chunk_size}: docs/working_keys.txt ({total_count} ключей)")
    print(f"📦 [SCK] Сформировано {total_chunks} отдельных файлов в docs/chunks/")

    return {
        "chunk_size": chunk_size,
        "total_chunks": total_chunks,
        "total_working_keys": total_count,
        "chunks": chunks_data
    }


def main():
    print("=" * 60)
    print("        ⚡ SCK AUTOMATED KEY CHECKER & EXPORTER ⚡")
    print("=" * 60)

    old_first_seen = load_old_first_seen()
    all_unique_working = {}  # key -> dict item

    print("📥 [SCK] Загружаем BLACK ключи...")
    black_keys = fetch_keys(BLACK_URL)
    print(f"   Загружено {len(black_keys)} BLACK ключей")

    print("📥 [SCK] Загружаем BLACK mobile ключи...")
    black_mobile_keys = fetch_keys(BLACK_MOBILE_URL)
    print(f"   Загружено {len(black_mobile_keys)} BLACK mobile ключей")
    black_keys = list(dict.fromkeys(black_keys + black_mobile_keys))
    print(f"   Итого уникальных BLACK ключей: {len(black_keys)}")

    print("📥 [SCK] Загружаем WHITE ключи...")
    white_keys = fetch_keys(WHITE_URL)
    print(f"   Загружено {len(white_keys)} WHITE ключей")

    results = {
        "project": "SCK",
        "updated_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
    }

    # 1. Проверяем стандартные страны
    for country in list(COUNTRIES.keys()):
        filtered = filter_keys(black_keys, country)
        print(f"🔍 [SCK] [{country}] {len(filtered)} ключей, проверяем...")
        res = check_mode(filtered, old_first_seen)
        for w in res.get("all_working", []):
            if w["key"] not in all_unique_working or w["latency_ms"] < all_unique_working[w["key"]]["latency_ms"]:
                all_unique_working[w["key"]] = w
        # В итоговом JSON оставляем top10 чтобы файл не разрастался до мегабайт
        res.pop("all_working", None)
        results[country] = res
        print(f"   [{country}] Рабочих: {res['total_working']}/{res['total']}")

    # 2. Проверяем категорию Other (с группировкой по странам)
    other_keys = filter_keys(black_keys, "other")
    print(f"🔍 [SCK] [other] {len(other_keys)} ключей, группируем по странам...")
    country_groups = defaultdict(list)
    country_flags = {}
    for key in other_keys:
        name, flag = parse_country_from_key(key)
        if not name or name.lower() in SKIP_COUNTRY_NAMES:
            name = "Other"
            flag = "🌍"
        country_groups[name].append(key)
        if name not in country_flags:
            country_flags[name] = flag

    other_countries = {}
    for name, keys in country_groups.items():
        print(f"   [{name}] {len(keys)} ключей, проверяем...")
        checked = check_mode(keys, old_first_seen)
        for w in checked.get("all_working", []):
            if w["key"] not in all_unique_working or w["latency_ms"] < all_unique_working[w["key"]]["latency_ms"]:
                all_unique_working[w["key"]] = w
        checked.pop("all_working", None)
        checked["flag"] = country_flags[name]
        other_countries[name] = checked
        print(f"   [{name}] Рабочих: {checked['total_working']}/{checked['total']}")
    results["other_countries"] = other_countries

    # 3. Проверяем белые списки
    white_modes = ("w_baltics", "w_finland", "w_germany", "w_sweden", "w_netherlands", "w_poland", "w_other", "russia")
    for mode in white_modes:
        filtered = filter_keys(white_keys, mode)
        print(f"🔍 [SCK] [{mode}] {len(filtered)} ключей, проверяем...")
        res = check_mode(filtered, old_first_seen)
        for w in res.get("all_working", []):
            if w["key"] not in all_unique_working or w["latency_ms"] < all_unique_working[w["key"]]["latency_ms"]:
                all_unique_working[w["key"]] = w
        res.pop("all_working", None)
        results[mode] = res
        print(f"   [{mode}] Рабочих: {res['total_working']}/{res['total']}")

    # 4. Сохраняем списки с разделением по 60 ключей и формируем метаданные
    chunks_info = save_partitions_and_chunks(all_unique_working, chunk_size=CHUNK_SIZE)
    results["chunks_info"] = chunks_info

    # 5. Сохраняем итоговый JSON
    os.makedirs("docs", exist_ok=True)
    with open("docs/keys.json", "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print("\n✅ [SCK] Успешно сохранено в docs/keys.json")
    print(f"📊 [SCK] Всего уникальных рабочих серверов: {len(all_unique_working)}")
    print(f"📦 [SCK] Пакетов по 60 ключей: {chunks_info['total_chunks']}")


if __name__ == "__main__":
    main()
