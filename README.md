# Jingxin Zhang academic website


## Website

[https://beryl-jingxin.github.io](https://beryl-jingxin.github.io)

## Files

- Root HTML files: homepage, about, research, publications, conferences, and contact
- `base.html`: shared page shell
- `theme/`: stylesheet and interactions
- `figures/`: background, banner, and selected research figures and project thumbnails
- `data/publications.tex`: author roles and manuscript status
- `data/publications.bib`: publication order, authors, full journal names, and DOI links
- `data/conferences.tex`: talks, posters, dates, locations, and links
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
