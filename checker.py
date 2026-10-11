#!/usr/bin/env python3
"""
SCK — Fast VLESS Key Checker & Partitioning Utility
Автоматический чекер VLESS-ключей с замером задержки и разделением на пакеты по 60 ключей.
"""

import os
import sys
import time
import socket
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

# Принудительно настраиваем UTF-8 для корректного вывода на Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# Прямая ссылка на raw-файл с ключами
SOURCE_RAW_URL = "https://raw.githubusercontent.com/igareck/vpn-configs-for-russia/main/BLACK_VLESS_RUS.txt"

MAX_WORKERS = 20       # сколько ключей проверять параллельно
TEST_TIMEOUT = 5       # таймаут подключения в секундах
MAX_LATENCY_MS = 2000  # ключи медленнее этого — отбрасываем
CHUNK_SIZE = 60        # размер блока ключей


def fetch_keys(url):
    print("📥 [SCK] Загружаем ключи из источника...")
    headers = {
        "User-Agent": "SCK-VLESS-Checker/2.0"
    }
    try:
        resp = requests.get(url, headers=headers, timeout=15)
        resp.raise_for_status()
        lines = resp.text.strip().splitlines()
        keys = [line.strip() for line in lines if line.strip().startswith("vless://")]
        # Удаляем дубликаты с сохранением порядка
        keys = list(dict.fromkeys(keys))
        print(f"✅ [SCK] Найдено {len(keys)} уникальных VLESS-ключей\n")
        return keys
    except Exception as e:
        print(f"❌ [SCK] Ошибка загрузки ключей: {e}")
        sys.exit(1)


def parse_host_port(key):
    """
    Извлекает (host, port) из VLESS-ссылки с поддержкой IPv4, IPv6 и нестандартных портов.
    """
    try:
        without_scheme = key[len("vless://"):]
        at_idx = without_scheme.rfind("@")
        if at_idx != -1:
            without_scheme = without_scheme[at_idx + 1:]
        host_port = without_scheme.split("?")[0].split("#")[0]
        
        # Поддержка IPv6 формата [2001:db8::1]:443
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
    """
    Проверяет TCP доступность сервера и замеряет задержку.
    Поддерживает IPv4 и IPv6, выходит сразу при успешном подключении.
    """
    host, port = parse_host_port(key)
    if not host or not port:
        return {"key": key, "host": "?", "port": "?", "status": "invalid", "latency_ms": None}

    try:
        addr_infos = socket.getaddrinfo(host, port, socket.AF_UNSPEC, socket.SOCK_STREAM)
    except Exception:
        return {"key": key, "host": host, "port": port, "status": "dns_error", "latency_ms": None}

    best_latency = None
    for family, socktype, proto, canonname, sockaddr in addr_infos:
        start = time.time()
        try:
            sock = socket.socket(family, socktype, proto)
            sock.settimeout(TEST_TIMEOUT)
            res = sock.connect_ex(sockaddr)
            sock.close()
            elapsed = round((time.time() - start) * 1000, 1)

            if res == 0 and elapsed <= MAX_LATENCY_MS:
                best_latency = elapsed
                # Успешно подключились — не тратим время на остальные адреса
                break
        except Exception:
            continue

    if best_latency is not None:
        return {"key": key, "host": host, "port": port, "status": "ok", "latency_ms": best_latency}
    return {"key": key, "host": host, "port": port, "status": "closed", "latency_ms": None}


def save_chunked_keys(working, base_filename="working_keys.txt", chunk_size=CHUNK_SIZE):
    """
    Сохраняет рабочие ключи:
    1. В единый файл с явными разделителями по chunk_size (60) ключей.
    2. В отдельные файлы по chunk_size (60) ключей в папке chunks/.
    """
    if not working:
        return

    os.makedirs("chunks", exist_ok=True)
    total_count = len(working)
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
    total_chunks = (total_count + chunk_size - 1) // chunk_size

    # 1. Сохранение основного файла с разделением по 60 ключей
    content_lines = [
        "# ============================================================",
        "# SCK VLESS CHECKER — СПИСОК РАБОЧИХ КЛЮЧЕЙ",
        f"# Всего ключей: {total_count} | Размер пачки: {chunk_size} шт.",
        f"# Всего пачек: {total_chunks} | Обновлено: {timestamp}",
        "# ============================================================",
        ""
    ]

    for i, item in enumerate(working):
        if i % chunk_size == 0:
            part_num = (i // chunk_size) + 1
            part_size = min(chunk_size, total_count - i)
            content_lines.append("")
            content_lines.append(f"# ------------------------------------------------------------")
            content_lines.append(f"# SCK ПАКЕТ #{part_num} (Ключи {i + 1}–{i + part_size} из {total_count})")
            content_lines.append(f"# ------------------------------------------------------------")
        content_lines.append(item["key"])

    with open(base_filename, "w", encoding="utf-8") as f:
        f.write("\n".join(content_lines) + "\n")

    # Дублируем также в sck_working_keys.txt для брендированного использования
    with open("sck_working_keys.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(content_lines) + "\n")

    # 2. Сохранение отдельных файлов пачек по 60 ключей
    for c in range(total_chunks):
        chunk_items = working[c * chunk_size : (c + 1) * chunk_size]
        part_filename = os.path.join("chunks", f"sck_keys_part_{c + 1}.txt")
        chunk_header = [
            f"# SCK VLESS Keys — Пакет #{c + 1} ({len(chunk_items)} ключей)",
            f"# Сгенерировано: {timestamp}",
            ""
        ]
        with open(part_filename, "w", encoding="utf-8") as f:
            f.write("\n".join(chunk_header))
            for item in chunk_items:
                f.write(item["key"] + "\n")

    print(f"💾 [SCK] Файл с разделителями по {chunk_size} сохранен: {base_filename} и sck_working_keys.txt")
    print(f"📁 [SCK] Отдельные файлы ({total_chunks} шт.) сохранены в папку 'chunks/'")


def main():
    print("=" * 60)
    print("          ⚡ SCK VLESS KEY CHECKER ⚡")
    print("=" * 60)
    
    keys = fetch_keys(SOURCE_RAW_URL)

    print(f"🔍 [SCK] Тестируем {len(keys)} ключей (таймаут: {TEST_TIMEOUT}с, макс. задержка: {MAX_LATENCY_MS}мс)...\n")
    results = []

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {executor.submit(test_key, key): key for key in keys}
        done = 0
        for future in as_completed(futures):
            r = future.result()
            done += 1
            icon = "✅" if r["status"] == "ok" else "❌"
            latency = f"{r['latency_ms']} мс" if r["latency_ms"] else "недоступен"
            print(f"[{done}/{len(keys)}] {icon} {r['host']}:{r['port']} — {latency}")
            results.append(r)

    # Фильтруем и сортируем по пингу
    working = sorted(
        [r for r in results if r["status"] == "ok" and r["latency_ms"] <= MAX_LATENCY_MS],
        key=lambda x: x["latency_ms"]
    )

    print("\n" + "=" * 60)
    print(f"📊 [SCK] ИТОГ: рабочих {len(working)} из {len(keys)}")
    print("=" * 60)

    if working:
        print("\n🏆 ТОП-5 самых быстрых серверов SCK:")
        for i, r in enumerate(working[:5], 1):
            print(f"  {i}. {r['host']}:{r['port']} — {r['latency_ms']} мс")

        # Сохранение с разделением по 60 ключей
        save_chunked_keys(working, base_filename="working_keys.txt", chunk_size=CHUNK_SIZE)

        print("\n⚡ ЛУЧШИЙ КЛЮЧ SCK (скопируй в приложение):")
        print(f"\n{working[0]['key']}\n")
    else:
        print("😕 Рабочих ключей не найдено. Попробуйте позже.")


if __name__ == "__main__":
    main()