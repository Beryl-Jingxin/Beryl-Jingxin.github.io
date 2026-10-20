# Jingxin Zhang academic website

An English-language academic portfolio with an ink-painting hero, animated celestial paths, and interactive navigation.

## Files

- Root HTML files: homepage, about, research, publications, conferences, and contact
- `base.html`: shared page shell
- `theme/`: stylesheet and interactions
- `assets/`: ink-painting backgrounds
- `figures/`: selected research figures and project thumbnails
- `data/publications.tex`: author roles and manuscript status
- `data/publications.bib`: publication order, authors, full journal names, and DOI links
- `data/conferences.tex`: talks, posters, dates, locations, and links

Conference dates and city/country labels are read from `conferences.tex`. Use day-level event dates where known (for example, `22--26 Sep 2024`); leave an unverified day as month and year rather than guessing.

The hero contains decorative, schematic celestial paths. The Explore section uses an interactive armillary instrument.
- `data/JingxinZhang_CV.pdf`: downloadable CV
- `index.html`: homepage for the site root

## Update academic records

Edit the TeX and BibTeX files in `data/`, then run:

```bash
python3 scripts/build-site.py
```

The shared page header and footer live in `base.html`. Page content remains in each root page; the build preserves its `<main>` section while applying the shared shell. Running the command regenerates the data scripts and root-level pages. Publications appear by descending year; BibTeX order breaks ties within a year. Corresponding-author stars come from `publications.tex`.

## Preview

Run `python3 -m http.server 8000` from this directory and visit `http://localhost:8000`. The root displays the homepage directly; pages are available as `/about.html`, `/research.html`, and so on.

## Publish

In GitHub **Settings → Pages**, select **GitHub Actions** as the source. Push to `main`. The workflow regenerates the data and deploys the site. The account and repository names remain unchanged. GSAP loads from a CDN; reduced-motion preferences are respected.
