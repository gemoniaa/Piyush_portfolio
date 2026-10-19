#!/usr/bin/env python3
"""
Scans assets/creative/ and writes creative-list.js, so you never type one line per file.

How to use
  1. Put your posters and videos inside assets/creative/.
     Sub-folders become the filter tabs on the creative page, for example:
       assets/creative/Posters/hackathon-poster.jpg
       assets/creative/Videos/cloud9-recap.mp4
       assets/creative/Branding/chipset-logo.png
     Files placed straight in assets/creative/ are sorted by type (Posters or Videos).
  2. Run:  python3 tools/build-creative-list.py
  3. Upload the whole folder to GitHub again.

Titles: by default a title is made from the file name. To choose your own, add lines to
assets/creative/titles.txt like this:   file name = Title shown on the page

A video can have a cover picture: put an image with the same name beside it
(cloud9-recap.mp4 and cloud9-recap.jpg). The picture is then used as the cover.
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "creative")
IMG = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"}
VID = {".mp4", ".webm", ".mov", ".m4v"}

try:
    from PIL import Image
except Exception:
    Image = None

def natural(s):
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", s)]

TITLES = {}
tp = os.path.join(SRC, "titles.txt")
if os.path.exists(tp):
    for line in open(tp, encoding="utf-8"):
        if "=" in line and not line.lstrip().startswith("#"):
            k, v = line.split("=", 1)
            TITLES[k.strip()] = v.strip()

def title_of(name):
    if name in TITLES:
        return TITLES[name]
    t = re.sub(r"[-_]+", " ", os.path.splitext(name)[0]).strip()
    return " ".join(w[:1].upper() + w[1:] for w in t.split(" "))

items = []
for dirpath, dirs, files in os.walk(SRC):
    dirs.sort(key=natural)
    rel = os.path.relpath(dirpath, SRC)
    cat = "" if rel == "." else re.sub(r"[-_]+", " ", rel.split(os.sep)[0])
    stems = {}
    for f in files:
        stems.setdefault(os.path.splitext(f)[0], []).append(f)
    for f in sorted(files, key=natural):
        ext = os.path.splitext(f)[1].lower()
        stem = os.path.splitext(f)[0]
        path = os.path.join(dirpath, f)
        web = "assets/creative/" + os.path.relpath(path, SRC).replace(os.sep, "/")
        if ext in VID:
            it = {"type": "video", "src": web, "title": title_of(f)}
            for g in stems.get(stem, []):
                if os.path.splitext(g)[1].lower() in IMG:
                    it["poster"] = web.rsplit("/", 1)[0] + "/" + g
            if cat: it["cat"] = cat
            items.append(it)
        elif ext in IMG:
            if any(os.path.splitext(g)[1].lower() in VID for g in stems.get(stem, [])):
                continue  # this picture is a video cover
            it = {"type": "image", "src": web, "title": title_of(f)}
            if Image:
                try:
                    with Image.open(path) as im:
                        it["w"], it["h"] = im.size
                except Exception:
                    pass
            if cat: it["cat"] = cat
            items.append(it)

out = os.path.join(ROOT, "creative-list.js")
with open(out, "w") as fh:
    fh.write("/* This file is written by tools/build-creative-list.py. You can leave it as it is. */\n")
    fh.write("window.SITE = window.SITE || {};\n")
    fh.write("window.SITE.creative = (window.SITE.creative || []).concat(" + json.dumps(items, indent=1) + ");\n")
print("Wrote %d items to creative-list.js" % len(items))
