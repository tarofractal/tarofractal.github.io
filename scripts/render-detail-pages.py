"""Render the four static detail pages from bilingual, editable JSON. No dependencies."""
from html import escape
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / 'content/details.json').read_text())

def bi(tag, value, attrs=''):
    return f'<{tag} data-en="{escape(value["en"], quote=True)}" data-ja="{escape(value["ja"], quote=True)}"{attrs}>{escape(value["en"])}</{tag}>'

def header():
    return '''<a class="skip-link" href="#main" data-en="Skip to content" data-ja="本文へ移動">Skip to content</a>
<header class="site-header"><div class="header-inner wrap"><a class="wordmark" href="index.html" aria-label="Taro Nagata, home"><img src="assets/t-mark.svg" width="38" height="38" alt="T"><span>Taro Nagata</span></a><nav aria-label="Main navigation"><a href="index.html#research" data-en="Research" data-ja="研究">Research</a><a href="index.html#projects" data-en="Projects" data-ja="制作">Projects</a><a href="index.html#about" data-en="About" data-ja="自己紹介">About</a><a href="index.html#contact" data-en="Contact" data-ja="連絡先">Contact</a></nav><div class="header-tools"><button id="language-toggle" class="js-control text-button" type="button" hidden><span id="language-label">日本語</span></button><button id="theme-toggle" class="js-control theme-button" type="button" hidden><span aria-hidden="true">◐</span><span id="theme-label">Night</span></button></div></div></header>'''

def footer():
    return '''<footer class="site-footer wrap"><a href="index.html" class="footer-brand"><img src="assets/t-mark.svg" width="24" height="24" alt="T"><span>Taro Nagata</span></a><span>© <span data-year>2026</span></span><a href="#" data-en="Back to top ↑" data-ja="ページの先頭へ ↑">Back to top ↑</a></footer>'''

def brand(key):
    if key not in ('nobilva', 'thy-and-i'):
        return ''
    name = 'NOBILVA' if key == 'nobilva' else 'Thy & I'
    image, width, height, css, url = ('nobilva-social.png', 1890, 591, 'nobilva-brand', 'https://nobilvalrn.studio.site/') if key == 'nobilva' else ('thy-and-i-logo.png', 1080, 563, 'thy-brand', 'https://thy-and-i.com/')
    label = {'en': f'{name} · official project identity', 'ja': f'{name} · 公式ロゴ'}
    return f'<figure class="detail-brand {css}"><div class="detail-brand-visual"><img src="assets/brands/{image}" width="{width}" height="{height}" alt="{escape(name)} official logo"></div><figcaption>{bi("span", label)} · <a href="{url}" target="_blank" rel="noopener">{bi("span", {"en":"Official website ↗","ja":"公式サイト ↗"})}</a></figcaption></figure>'

def paper_figure(figure):
    en, ja = escape(figure['alt']['en'], quote=True), escape(figure['alt']['ja'], quote=True)
    return f'''<figure class="paper-figure" id="paper-figure"><a class="paper-image-link" href="{figure['src']}" target="_blank" rel="noopener"><img src="{figure['src']}" width="{figure['width']}" height="{figure['height']}" loading="lazy" alt="{en}" data-alt-en="{en}" data-alt-ja="{ja}"></a><figcaption>{bi('p', {'en':'Figure 9. Color shows particle temperature divided by gas temperature. Blue is cooler, red is hotter, and hatching indicates sublimation.','ja':'Figure 9。色は粒子温度と気体温度の比。青は粒子が低温、赤は高温、斜線は昇華する領域を示します。'})}<p class="figure-credit">{escape(figure['credit'])} <a href="{figure['doi']}" target="_blank" rel="noopener">DOI ↗</a> · <a href="{figure['license']}" target="_blank" rel="noopener">CC BY 4.0</a></p><a class="figure-open" href="{figure['src']}" target="_blank" rel="noopener">{bi('span',{'en':'View full-size figure ↗','ja':'図を拡大して見る ↗'})}</a></figcaption></figure>'''

keys = list(DATA)
for index, (key, data) in enumerate(DATA.items()):
    title = {'en': data['title']['en'] + ' — Taro Nagata', 'ja': data['title']['ja'] + ' — Taro Nagata'}
    head = f'''<!doctype html><html lang="en" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#ffffff">{bi('title',title)}<meta name="description" content="{escape(data['subtitle']['en'], quote=True)}"><meta property="og:title" content="{escape(title['en'], quote=True)}"><meta property="og:description" content="{escape(data['subtitle']['en'], quote=True)}"><meta property="og:type" content="article"><meta property="og:image" content="https://tarofractal.github.io/assets/social-card.png"><link rel="icon" href="assets/favicon.svg?v=2" type="image/svg+xml"><link rel="stylesheet" href="styles.css?v=8"><script src="app.js?v=5" defer></script></head><body class="detail-page">'''
    facts = ''.join('<div>' + bi('dt', fact['label']) + bi('dd', fact['value']) + '</div>' for fact in data['facts'])
    links = ''.join(f'<a class="button {"primary" if n == 0 else "secondary"}" href="{escape(link["href"],quote=True)}" target="_blank" rel="noopener">{bi("span",link["label"])}<span aria-hidden="true">↗</span></a>' for n, link in enumerate(data.get('links', [])))
    hero = f'''<main id="main"><div class="detail-hero"><div class="wrap"><a class="breadcrumb" href="index.html#{'research' if key == 'research' else 'projects'}">← {bi('span',{'en':'Back to research & projects','ja':'研究・制作一覧へ戻る'})}</a>{bi('p',data['kicker'],' class="eyebrow"')}{bi('h1',data['title'])}{bi('p',data['subtitle'],' class="detail-subtitle"')}<dl class="detail-facts">{facts}</dl><div class="detail-links">{links}</div></div></div>'''
    toc = '<aside class="detail-toc" aria-label="On this page">' + bi('p', {'en':'ON THIS PAGE','ja':'このページの内容'}, ' class="eyebrow"')
    sections = brand(key)
    for number, section in enumerate(data['sections'], 1):
        section_id = f'section-{number}'
        toc += f'<a href="#{section_id}">{bi("span",section["heading"])}</a>'
        sections += f'<section class="detail-section" id="{section_id}">{bi("h2",section["heading"])}'
        for paragraph in section.get('paragraphs', []):
            if key == 'research' and '∫' in paragraph['en']:
                sections += '''<div class="detail-equation" role="img" aria-label="Absorbed stellar radiation balances thermal emission: integral of absorption cross section times incident spectral flux equals four pi times the integral of absorption cross section times the Planck function.">∫ C<sub>abs</sub>(λ) F<sub>λ</sub> dλ = 4π ∫ C<sub>abs</sub>(λ) B<sub>λ</sub>(T<sub>p</sub>) dλ<small>ABSORBED STARLIGHT = THERMAL EMISSION · LOW-PRESSURE LIMIT</small></div>'''
                paragraph = {'en':'Here C_abs is the absorption cross section, F_λ is incident spectral flux, and B_λ is the Planck function at the particle temperature T_p. The equation balances absorbed stellar energy with emitted thermal radiation.','ja':'C_absは吸収断面積、F_λは入射するスペクトルフラックス、B_λは粒子温度T_pでのプランク関数です。恒星から吸収するエネルギーと、熱放射で放出するエネルギーを釣り合わせています。'}
            sections += bi('p', paragraph)
        if section.get('bullets'):
            sections += '<ul>' + ''.join(bi('li', bullet) for bullet in section['bullets']) + '</ul>'
        if key == 'research' and number == 5:
            sections += paper_figure(data['figure'])
        sections += '</section>'
    toc += '</aside>'
    next_key = keys[(index + 1) % len(keys)]
    next_title = DATA[next_key]['title']
    next_card = f'''<div class="detail-next"><div>{bi('span',{'en':'EXPLORE NEXT','ja':'次のプロジェクト'})}{bi('strong',next_title)}</div><a href="{next_key}.html" aria-label="Next: {escape(next_title['en'],quote=True)}">→</a></div><p class="detail-footer-contact">{bi('span',{'en':'Questions about this work?','ja':'このプロジェクトについてのご連絡は'})} <a href="mailto:tarofractal@gmail.com">tarofractal@gmail.com ↗</a></p>'''
    page = head + header() + hero + f'<div class="detail-layout wrap">{toc}<article class="detail-prose">{sections}{next_card}</article></div></main>' + footer() + '</body></html>\n'
    (ROOT / 'dist' / f'{key}.html').write_text(page)
    print(f'Rendered {key}.html')
