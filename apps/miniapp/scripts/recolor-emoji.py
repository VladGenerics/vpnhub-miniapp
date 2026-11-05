"""Перекрашивает зелёные оттенки в Lottie-эмодзи в голубой.

Оригиналы (как скачаны из паков) лежат в emoji-src/, результат - в public/emoji/,
оригинальные зелёные (для темы «Неон») - в public/emoji-original/,
серые (для своего цвета: подходят к любому акценту) - в public/emoji-mono/.
На выходе .lottie (dotLottie), он в 15-20 раз легче json.
Запуск:  python3 apps/miniapp/scripts/recolor-emoji.py            (голубой)
         python3 apps/miniapp/scripts/recolor-emoji.py --original (скопировать как есть)
"""
import colorsys, json, pathlib, shutil, sys, zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC, DST = ROOT / 'emoji-src', ROOT / 'public' / 'emoji'
DST_ORIG = ROOT / 'public' / 'emoji-original'
DST_MONO = ROOT / 'public' / 'emoji-mono'
TARGET_HUE = 203 / 360   # голубой, ~#2ea6ff
GREEN = (70 / 360, 175 / 360)


MONO = False  # True - зелёное в серое, иначе в голубой


def shift(r, g, b):
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    if s < 0.18 or not (GREEN[0] <= h <= GREEN[1]):
        return r, g, b
    if MONO:
        # серый с лёгкой холодной ноткой, светлота сжата к середине: читается и на тёмной плитке, и на белом фоне
        l = min(0.74, max(0.36, 0.56 + (l - 0.5) * 0.6))
        return colorsys.hls_to_rgb(220 / 360, l, 0.06)
    # сохраняем относительный сдвиг внутри зелёного диапазона
    h = TARGET_HUE + (h - 120 / 360) * 0.5
    return colorsys.hls_to_rgb(h % 1, l, s)


def fix_color(arr):
    if isinstance(arr, list) and len(arr) >= 3 and all(isinstance(v, (int, float)) for v in arr[:3]):
        scale = 255 if max(arr[:3]) > 1 else 1
        r, g, b = shift(*(v / scale for v in arr[:3]))
        arr[0], arr[1], arr[2] = r * scale, g * scale, b * scale


def fix_gradient(arr, stops):
    # [offset, r, g, b] × stops, дальше хвост прозрачности [offset, alpha, ...] - его не трогаем
    if not isinstance(arr, list):
        return
    for i in range(0, min(stops * 4, len(arr) - 3), 4):
        chunk = arr[i + 1:i + 4]
        if all(isinstance(v, (int, float)) and 0 <= v <= 1 for v in chunk):
            r, g, b = shift(*chunk)
            arr[i + 1:i + 4] = [r, g, b]


def walk_prop(prop, fixer):
    if not isinstance(prop, dict):
        return
    k = prop.get('k')
    if isinstance(k, list) and k and isinstance(k[0], dict):  # анимированное значение
        for kf in k:
            for key in ('s', 'e'):
                if key in kf:
                    fixer(kf[key])
    else:
        fixer(k)


def walk(node):
    if isinstance(node, dict):
        ty = node.get('ty')
        if ty in ('fl', 'st'):
            walk_prop(node.get('c'), fix_color)
        if ty in ('gf', 'gs') and isinstance(node.get('g'), dict):
            stops = node['g'].get('p') or 0
            walk_prop(node['g'].get('k'), lambda arr: fix_gradient(arr, stops))
        if 'sc' in node and isinstance(node['sc'], str) and node['sc'].startswith('#'):
            r, g, b = (int(node['sc'][i:i + 2], 16) / 255 for i in (1, 3, 5))
            r, g, b = shift(r, g, b)
            node['sc'] = '#%02x%02x%02x' % (round(r * 255), round(g * 255), round(b * 255))
        for v in node.values():
            walk(v)
    elif isinstance(node, list):
        for v in node:
            walk(v)


def rounded(node):
    """Округляет дробные числа до 3 знаков - файлы становятся заметно легче."""
    if isinstance(node, float):
        r = round(node, 3)
        return int(r) if r == int(r) else r
    if isinstance(node, list):
        return [rounded(v) for v in node]
    if isinstance(node, dict):
        return {k: rounded(v) for k, v in node.items()}
    return node


def write_lottie(path, name, data):
    """Пишет анимацию в формате dotLottie: zip с manifest.json и animations/<имя>.json"""
    manifest = {'version': '1', 'generator': 'recolor-emoji.py', 'animations': [{'id': name, 'speed': 1, 'loop': True, 'autoplay': True}]}
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        z.writestr('manifest.json', json.dumps(manifest))
        z.writestr(f'animations/{name}.json', json.dumps(rounded(data), separators=(',', ':')))


def main():
    original = '--original' in sys.argv
    sources = [f for f in sorted(SRC.glob('*.json')) if f.name != 'manifest.json']
    if not sources:
        sys.exit(f'в {SRC} нет исходников эмодзи, ничего не трогаю')
    # сначала читаем и перекрашиваем всё в памяти: битый исходник не оставит половину набора
    jobs = []
    for f in sources:
        try:
            data = json.loads(f.read_text())
        except (OSError, ValueError) as e:
            sys.exit(f'не прочитался {f.name}: {e}')
        orig = json.loads(json.dumps(data))
        mono = json.loads(json.dumps(data))
        if not original:
            global MONO
            MONO = False
            walk(data)
            MONO = True
            walk(mono)
        jobs.append((f.stem, orig, data, mono))
    # пишем во временные папки и подменяем готовые целиком
    for dst in (DST, DST_ORIG, DST_MONO):
        tmp = dst.with_name(dst.name + '.tmp')
        shutil.rmtree(tmp, ignore_errors=True)
        tmp.mkdir(parents=True)
        for name, orig, data, mono in jobs:
            # в emoji-original - цвета пака как есть, для темы «Неон»
            out = orig if dst is DST_ORIG else mono if dst is DST_MONO else data
            write_lottie(tmp / f'{name}.lottie', name, out)
        shutil.rmtree(dst, ignore_errors=True)
        tmp.rename(dst)
    print('done', 'original' if original else 'recolored', '+ emoji-original + emoji-mono')


if __name__ == '__main__':
    main()
