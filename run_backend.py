"""
run_backend.py — Local dev helper.
Changes CWD to backend/ so relative imports (models, service, scraper) work,
then starts uvicorn with hot-reload.
"""
import os
import sys

# Make sure we're running from the repo root
ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.join(ROOT, "backend")

os.chdir(BACKEND)
sys.path.insert(0, BACKEND)

import uvicorn

if __name__ == '__main__':
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, reload_dirs=[BACKEND])
