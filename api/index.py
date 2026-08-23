"""
Vercel Serverless Entrypoint for Vyomirtha FastAPI backend.
"""
import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(__file__))

from main import app
