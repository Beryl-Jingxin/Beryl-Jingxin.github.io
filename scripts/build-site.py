from difflib import SequenceMatcher
from html import escape
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'


def fieldsFromBib():
    entries = {}
    text = (DATA / 'publications.bib').read_text()
    for key, body in re.findall(r'@article\{([\w-]+),\s*(.*?)^\},?\s*$', text, re.M | re.S):
        fields = {}
        for field, value in re.findall(r'^\s*(\w+)\s*=\s*\{(.*)\},?\s*$', body, re.M):
            fields[field.lower()] = value.strip().strip('{}')
        entries[key] = fields
    if not entries:
        raise ValueError('No entries found in data/publications.bib')
    return entries


def normalizeDoi(value):
    return re.sub(r'^https?://(?:dx\.)?doi\.org/', '', value.strip(), flags=re.I).lower()


def normalizeTitle(value):
    value = value.replace('$^{15}$NH$_3$', '15NH3')
    value = re.sub(r'\\[A-Za-z]+', '', value)
    return re.sub(r'[^a-z0-9]+', ' ', value.lower()).strip()


def braceValue(text, start):
    depth = 0
    for index in range(start, len(text)):
        if text[index] == '{':
            depth += 1
        elif text[index] == '}':
            depth -= 1
            if depth == 0:
                return text[start + 1:index]
    raise ValueError('Unclosed LaTeX brace')


def italicTitle(item):
    start = item.find('\\textit{')
    if start < 0:
        raise ValueError('Publication item has no italic title')
    return braceValue(item, start + len('\\textit'))


def publicationRoles(entries):
    text = (DATA / 'publications.tex').read_text()
    sections = re.findall(r'\\begin\{rSection\}\{([^}]*)\}[^\n]*\n(.*?)\\end\{rSection\}', text, re.S)
    if not sections:
        raise ValueError('No publication subsections found in data/publications.tex')
    doiKeys = {normalizeDoi(item.get('doi', '')): key for key, item in entries.items() if item.get('doi', '').strip()}
    unmatched = set(entries)
    roles = {}
    leadOrder = 0
    for heading, body in sections:
        leadSection = 'First-author' in heading
        for item in re.findall(r'\\item\s+(.*?)(?=\\item\s+|\Z)', body, re.S):
            doiMatch = re.search(r'\\href\{(https?://(?:dx\.)?doi\.org/[^}]+)\}', item, re.I)
            if doiMatch:
                doi = normalizeDoi(doiMatch.group(1))
                if doi not in doiKeys:
                    raise ValueError(f'DOI in publications.tex is missing from publications.bib: {doi}')
                key = doiKeys[doi]
            else:
                title = normalizeTitle(italicTitle(item))
                candidates = [(SequenceMatcher(None, title, normalizeTitle(entries[key]['title'])).ratio(), key)
                              for key in unmatched if not entries[key].get('doi', '').strip()]
                if not candidates:
                    raise ValueError(f'No BibTeX manuscript matches: {title}')
                score, key = max(candidates)
                if score < .68:
                    raise ValueError(f'Uncertain manuscript match ({score:.2f}): {title}')
            if key in roles:
                raise ValueError(f'Duplicate publication in publications.tex: {key}')
            firstAuthor = bool(re.match(r'\\textbf\{Jingxin Zhang\}', item.strip()))
            corresponding = bool(re.search(r'\\textbf\{Jingxin Zhang\}\$\^\*\$', item))
            authorText = item.split('\\textit{', 1)[0].split('\\href{', 1)[0]
            authorText = re.sub(r'\\textbf\{([^}]*)\}', r'\1', authorText)
            authorText = authorText.replace('\\item', '')
            starred = [name.strip().split() for name in re.findall(r'([^,]+?)\$\^\*\$', authorText)]
            correspondents = {(name[-1].rstrip('.').lower(), name[0][0].lower()) for name in starred if len(name) > 1}
            if leadSection and not (firstAuthor or corresponding):
                raise ValueError(f'First/corresponding section lacks a marked role: {key}')
            role = 'coauthor'
            if leadSection:
                role = 'first-corresponding' if firstAuthor and corresponding else 'first' if firstAuthor else 'corresponding'
                leadOrder += 1
            statusMatch = re.search(r'\b(To be submitted|Submitted)\b', item, re.I)
            roles[key] = {'role': role, 'leadOrder': leadOrder if leadSection else None,
                          'status': statusMatch.group(1) if statusMatch else '',
                          'correspondents': correspondents}
            unmatched.discard(key)
    if unmatched:
        raise ValueError('BibTeX entries missing from publications.tex: ' + ', '.join(sorted(unmatched)))
    return roles


def authorsHtml(value, correspondents):
    authors = []
    for author in value.split(' and '):
        surname, given = (part.strip().rstrip('.') for part in author.split(',', 1))
        name = f'{given} {surname}'
        label = f'<strong>{escape(name)}</strong>' if surname == 'Zhang' and given == 'Jingxin' else escape(name)
        if (surname.lower(), given[0].lower()) in correspondents:
            label += '<sup class="corresponding-mark" aria-label="corresponding author">*</sup>'
        authors.append(label)
    return ', '.join(authors)


def sourceLabel(entry, status):
    journal = entry.get('journal', '')
    if status:
        return ' · '.join(part for part in (journal, status) if part)
    volume = entry.get('volume', '')
    pages = entry.get('pages', '').replace('-', '–')
    parts = [part for part in (journal, volume, pages) if part]
    return ' '.join(parts)


def titleHtml(value):
    value = escape(value)
    value = value.replace('15NH3', '<sup>15</sup>NH<sub>3</sub>')
    value = value.replace('$^{15}$NH$_3$', '<sup>15</sup>NH<sub>3</sub>')
    return value


def buildPublications():
    entries = fieldsFromBib()
    roles = publicationRoles(entries)
    records = []
    for key, entry in entries.items():
        role = roles[key]
        doi = normalizeDoi(entry.get('doi', ''))
        if not doi and not role['status']:
            raise ValueError(f'Unpublished entry has no manuscript status in publications.tex: {key}')
        records.append({'key': key, 'year': entry['year'], 'titleHtml': titleHtml(entry['title']),
                        'authorsHtml': authorsHtml(entry['author'], role['correspondents']),
                        'source': sourceLabel(entry, role['status']),
                        'lead': role['role'] != 'coauthor', 'leadOrder': role['leadOrder'],
                        'role': role['role'], 'doi': doi, 'status': role['status']})
    records.sort(key=lambda item: (int(item['year']), list(entries).index(item['key'])), reverse=True)
    (DATA / 'publications-data.js').write_text('window.PUBLICATIONS = ' + json.dumps(records, ensure_ascii=False, indent=2) + ';\n')
    return len(records), sum(bool(item['doi']) for item in records)


def buildConferences():
    text = (DATA / 'conferences.tex').read_text()
    sections = re.findall(r'\\begin\{rSection\}\{([^}]*)\}[^\n]*\n(.*?)\\end\{rSection\}', text, re.S)
    content = '\n'.join('\\textbf{' + heading + '}\n' + body for heading, body in sections
                        if heading in ('Oral presentations', 'Poster presentations'))
    if not content:
        raise ValueError('No conference sections found in data/conferences.tex')
    records = []
    kind = None
    current = None
    for line in content.splitlines():
        bold = re.fullmatch(r'\s*\\textbf\{([^}]*)\}\s*', line)
        if bold:
            name = bold.group(1)
            if name == 'Oral presentations':
                kind = 'talk'
                continue
            if name == 'Poster presentations':
                kind = 'poster'
                continue
            if current:
                records.append(current)
            if not kind:
                raise ValueError(f'Conference before presentation group: {name}')
            current = {'kind': kind, 'name': name, 'date': '', 'presentation': '', 'location': '', 'eventUrl': '', 'abstractUrl': ''}
            continue
        if current is None:
            continue
        links = re.findall(r'\\weblink\{([^}]*)\}', line)
        if links:
            target = 'eventUrl' if not current['eventUrl'] else 'abstractUrl'
            current[target] = links[0]
        date = re.search(r'\\hfill\s+([^\\]+?)\s*\\\\', line)
        if date:
            current['date'] = date.group(1).strip().replace('--', '–')
        italic = re.findall(r'\\textit\{([^}]*)\}', line)
        if italic:
            if not current['presentation']:
                current['presentation'] = italic[0]
            else:
                current['location'] = italic[-1]
    if current:
        records.append(current)
    if not records or any(not item['date'] or not item['presentation'] or not item['location'] for item in records):
        raise ValueError('Conference records are missing a date, presentation, or location')
    for item in records:
        place = [part.strip() for part in item.pop('location').rsplit(',', 1)]
        if len(place) != 2 or not all(place):
            raise ValueError(f'Conference location must contain city and country: {item["name"]}')
        item['city'], item['country'] = place
    (DATA / 'conferences-data.js').write_text('window.CONFERENCES = ' + json.dumps(records, ensure_ascii=False, indent=2) + ';\n')
    return sum(item['kind'] == 'talk' for item in records), sum(item['kind'] == 'poster' for item in records)


def buildPages():
    template = (ROOT / 'base.html').read_text()
    pageInfo = {
        'home': ('Home | Jingxin Zhang', 'Jingxin Zhang: molecular spectroscopy, scientific computing, and astrophysical spectral analysis.'),
        'about': ('About | Jingxin Zhang', 'Jingxin Zhang: molecular spectroscopy, scientific computing, and astrophysical spectral analysis.'),
        'research': ('Research | Jingxin Zhang', 'Jingxin Zhang: molecular spectroscopy, scientific computing, and astrophysical spectral analysis.'),
        'publications': ('Publications | Jingxin Zhang', 'Jingxin Zhang: molecular spectroscopy, scientific computing, and astrophysical spectral analysis.'),
        'conferences': ('Conferences | Jingxin Zhang', 'Jingxin Zhang: molecular spectroscopy, scientific computing, and astrophysical spectral analysis.'),
        'contact': ('Contact | Jingxin Zhang', 'Contact Jingxin Zhang about molecular spectroscopy, astrophysical spectra, and scientific software.'),
    }
    labels = {'home': 'Home', 'about': 'About', 'research': 'Research', 'publications': 'Publications',
              'conferences': 'Conferences', 'contact': 'Contact'}
    scripts = {'publications': '<script defer src="data/publications-data.js"></script>',
               'conferences': '<script defer src="data/conferences-data.js"></script>'}
    for page, (title, description) in pageInfo.items():
        links = []
        for slug, label in labels.items():
            href = 'index.html' if slug == 'home' else f'{slug}.html'
            current = ' aria-current="page"' if slug == page else ''
            links.append(f'<a href="{href}"{current}>{label}</a>')
        navigation = ' '.join(links)
        markup = template.replace('{{TITLE}}', title).replace('{{DESCRIPTION}}', description)
        pageFile = 'index.html' if page == 'home' else f'{page}.html'
        markup = markup.replace('{{PAGE_FILE}}', pageFile)
        markup = markup.replace('{{PAGE_SCRIPTS}}', scripts.get(page, ''))
        markup = markup.replace('{{NAVIGATION}}', navigation)
        sourcePage = ROOT / pageFile
        sourceMarkup = sourcePage.read_text()
        main = re.search(r'<main\b[^>]*>.*?</main>', sourceMarkup, re.S)
        if not main:
            raise ValueError(f'No main content found in {pageFile}')
        markup = markup.replace('{{MAIN}}', main.group(0))
        sourcePage.write_text(markup)


papers, dois = buildPublications()
talks, posters = buildConferences()
buildPages()
print(f'Generated {papers} publications ({dois} DOI links), {talks} talks, and {posters} posters')
