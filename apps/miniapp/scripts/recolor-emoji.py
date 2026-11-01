"""Перекрашивает зелёные оттенки в Lottie-эмодзи в голубой.

Оригиналы (как скачаны из паков) лежат в emoji-src/, результат — в public/emoji/,
а оригинальные зелёные (для темы «Неон») — в public/emoji-original/.
Запуск:  python3 scripts/recolor-emoji.py            (голубой)
         python3 scripts/recolor-emoji.py --original (скопировать без изменений)
"""
import colorsys, json, pathlib, shutil, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC, DST = ROOT / 'emoji-src', ROOT / 'public' / 'emoji'
DST_ORIG = ROOT / 'public' / 'emoji-original'
TARGET_HUE = 203 / 360   # голубой, ~#2ea6ff
GREEN = (70 / 360, 175 / 360)


def shift(r, g, b):
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    if s < 0.18 or not (GREEN[0] <= h <= GREEN[1]):
        return r, g, b
    # сохраняем относительный сдвиг внутри зелёного диапазона
    h = TARGET_HUE + (h - 120 / 360) * 0.5
    return colorsys.hls_to_rgb(h % 1, l, s)


def fix_color(arr):
    if isinstance(arr, list) and len(arr) >= 3 and all(isinstance(v, (int, float)) for v in arr[:3]):
        scale = 255 if max(arr[:3]) > 1 else 1
        r, g, b = shift(*(v / scale for v in arr[:3]))
        arr[0], arr[1], arr[2] = r * scale, g * scale, b * scale


def fix_gradient(arr):
    # [offset, r, g, b, offset, r, g, b, ..., (opacity stops)]
    if not isinstance(arr, list):
        return
    for i in range(0, len(arr) - 3, 4):
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
            walk_prop(node['g'].get('k'), fix_gradient)
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
    """Округляет дробные числа до 3 знаков — файлы становятся заметно легче."""
    if isinstance(node, float):
        r = round(node, 3)
        return int(r) if r == int(r) else r
    if isinstance(node, list):
        return [rounded(v) for v in node]
    if isinstance(node, dict):
        return {k: rounded(v) for k, v in node.items()}
    return node


def main():
    original = '--original' in sys.argv
    DST.mkdir(parents=True, exist_ok=True)
    DST_ORIG.mkdir(parents=True, exist_ok=True)
    for f in sorted(SRC.glob('*.json')):
        if f.name == 'manifest.json':
            shutil.copy(f, DST / f.name)
            continue
        data = json.loads(f.read_text())
        # оригинальные цвета пака — для темы «Неон»
        (DST_ORIG / f.name).write_text(json.dumps(rounded(data), separators=(',', ':')))
        if not original:
            walk(data)
        (DST / f.name).write_text(json.dumps(rounded(data), separators=(',', ':')))
    print('done', 'original' if original else 'recolored', '+ emoji-original')


if __name__ == '__main__':
    main()
