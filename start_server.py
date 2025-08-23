#!/usr/bin/env python3
"""
Startup script for Work Plan Calendar System
"""

import os
import sys
import uvicorn
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def main():
    print("🚀 Starting Work Plan Calendar System...")
    print("📁 Project directory:", project_root)
    
    # Check if data directory exists
    data_dir = project_root / "data"
    if not data_dir.exists():
        print("📋 Creating data directory structure...")
        from generate_test_data import TestDataGenerator
        generator = TestDataGenerator()
        generator.generate_all_test_data()
        print("✅ Test data generated successfully!")
    
    # Change to project directory
    os.chdir(project_root)
    
    print("🌐 Starting FastAPI server at http://localhost:8000")
    print("📱 Frontend available at:")
    print("   • Main app: http://localhost:8000/")
    print("   • Alternative: http://localhost:8000/app")
    print("   • Static frontend: http://localhost:8000/frontend/")
    print("📚 API documentation at http://localhost:8000/docs")
    print("🗂️  Static files served from: http://localhost:8000/static/")
    print("📸 Screenshots gallery at: http://localhost:8000/snapshot/")
    print("\n⏹️  Press Ctrl+C to stop the server\n")
    
    # Start the server
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8010,
        reload=True,
        reload_dirs=[str(project_root / "backend")],
        access_log=True
    )

if __name__ == "__main__":
    main()