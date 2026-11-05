"""Ставит кабинет кнопкой меню бота.

  BOT_TOKEN=... python3 apps/miniapp/scripts/set-menu-button.py https://app.example.com
"""
import json, os, sys, time, urllib.error, urllib.parse, urllib.request

if len(sys.argv) != 2 or not os.environ.get('BOT_TOKEN'):
    sys.exit(__doc__)
token, url = os.environ['BOT_TOKEN'], sys.argv[1]


def call(method, **params):
    data = urllib.parse.urlencode({k: json.dumps(v) if isinstance(v, dict) else v for k, v in params.items()}).encode()
    for attempt in range(3):
        try:
            return json.loads(urllib.request.urlopen(f'https://api.telegram.org/bot{token}/{method}', data, timeout=20).read())
        except urllib.error.HTTPError as e:
            # 401/404 от Bot API — почти всегда неверный токен, повторять нет смысла
            return json.loads(e.read() or b'{}') or {'ok': False, 'description': f'HTTP {e.code}'}
        except OSError as e:
            if attempt == 2:
                return {'ok': False, 'description': str(e)}
            time.sleep(1)


res = call('setChatMenuButton', menu_button={'type': 'web_app', 'text': 'VPNHub', 'web_app': {'url': url}})
if not res.get('ok'):
    sys.exit(f'ошибка: {res.get("description")}')
print('готово')
