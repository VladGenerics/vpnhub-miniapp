"""Привязывает мини-апп к кнопке меню бота.

Запуск:  BOT_TOKEN=... python3 scripts/set-menu-button.py https://xxx.trycloudflare.com
Bot API с этой машины иногда отвечает 404 — поэтому повторы.
"""
import json, os, sys, time, urllib.error, urllib.parse, urllib.request

token = os.environ['BOT_TOKEN']
url = sys.argv[1]


def call(method, **params):
    data = urllib.parse.urlencode({k: json.dumps(v) if isinstance(v, dict) else v for k, v in params.items()}).encode()
    for _ in range(30):
        try:
            d = json.loads(urllib.request.urlopen(f'https://api.telegram.org/bot{token}/{method}', data, timeout=20).read())
            if d.get('ok'):
                return d
        except urllib.error.HTTPError as e:
            if e.code != 404:
                return json.loads(e.read() or b'{}')
        except Exception:
            pass
        time.sleep(0.5)
    return {'ok': False, 'description': 'retries exhausted'}


print(call('setChatMenuButton', menu_button={'type': 'web_app', 'text': 'VPNHub', 'web_app': {'url': url}}))
print(call('getChatMenuButton'))
