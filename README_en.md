# Work Plan Calendar System

A personal work plan management system organized by calendar time, supporting four hierarchical levels of plan management: yearly, monthly, weekly, and daily.

## Features

- 📅 **Hierarchical Plan Management**: Four time levels - Year/Month/Week/Day
- 📝 **Markdown Editing**: Markdown editor with syntax highlighting
- 🔄 **Real-time Preview**: Instant switch between edit and preview modes
- 💾 **Auto Save**: Automatically saves after 3 seconds of inactivity
- 📋 **Content Copy**: Copy historical plan content to current period
- 🎨 **Responsive Design**: Supports desktop and mobile devices
- ⌨️ **Keyboard Shortcuts**: Rich keyboard shortcut support
- 🖥️ **Panel Maximize**: Double-click panel title for fullscreen focused editing (New in v0.1.0)

## Technical Architecture

### Backend
- **Python FastAPI**: REST API service
- **Pydantic**: Data validation and models
- **File System**: Markdown file storage

### Frontend
- **HTML5 + JavaScript (ES6+)**: Pure frontend implementation
- **TailwindCSS**: Beautiful UI design
- **Marked.js**: Markdown parsing
- **Day.js**: Date handling

## Development Environment Setup

### Prerequisites
- Python 3.11+
- [uv](https://docs.astral.sh/uv/) (Python package management tool)

### Installing uv
```bash
# On macOS and Linux using curl
curl -LsSf https://astral.sh/uv/install.sh | sh

# Or install using pip
pip install uv
```

### 1. Create Virtual Environment and Install Dependencies
```bash
# Sync dependencies and create virtual environment
uv sync

# Or manually create virtual environment and install dependencies
uv venv
source .venv/bin/activate  # Linux/macOS
# or .venv\Scripts\activate  # Windows
uv pip install -e .
```

### 2. Start the System
```bash
# Run using uv
uv run python start_server.py

# Or run in virtual environment
source .venv/bin/activate
python start_server.py
```

### 3. Access the Application
- **Main Application**: http://localhost:8000/frontend/
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/api/health

## File Structure

```
project/
├── backend/                 # Backend FastAPI code
│   ├── main.py             # FastAPI application main file
│   ├── models.py           # Pydantic data models
│   ├── plan_service.py     # Business logic service
│   └── date_calculator.py  # Date calculation utilities
├── frontend/               # Frontend interface
│   └── index.html         # Main page
├── static/                # Static resources
│   ├── css/               # Style files
│   └── js/                # JavaScript modules
├── data/                  # Plan data storage
│   ├── Year/              # Yearly plans (YYYY.md)
│   ├── Month/             # Monthly plans (YYYYMM.md)
│   ├── Week/              # Weekly plans (YYYYMMDD.md, date of week's Sunday)
│   └── Day/               # Daily plans (YYYYMMDD.md)
├── generate_test_data.py  # Test data generator
├── start_server.py        # Startup script
└── requirements.txt       # Python dependencies
```

## API Endpoints

### Plan CRUD
- `GET /api/plans/{plan_type}/{date}` - Get plan
- `POST /api/plans/{plan_type}/{date}` - Create plan
- `PUT /api/plans/{plan_type}/{date}` - Update plan
- `DELETE /api/plans/{plan_type}/{date}` - Delete plan

### Navigation Features
- `GET /api/plans/{plan_type}/{date}/previous` - Previous period plan
- `GET /api/plans/{plan_type}/{date}/next` - Next period plan
- `GET /api/plans/all/{date}` - All plans for specified date

### Other Features
- `POST /api/plans/copy` - Copy plan content
- `GET /api/plans/{plan_type}/{date}/exists` - Check if plan exists
- `GET /api/health` - Health check

## User Guide

### Basic Operations
1. **Select Date**: Use the top date picker to switch target date
2. **Edit Plan**: Click any panel to enter edit mode
3. **Preview Content**: Click preview button to view Markdown rendered result
4. **Save Changes**: System auto-saves, or use Ctrl+S to save manually
5. **Navigate Periods**: Use left/right arrow buttons to switch between different periods

### Keyboard Shortcuts
- `Ctrl + S`: Save all modified panels
- `Ctrl + E`: Toggle edit/preview mode
- `Ctrl + ]`: Collapse/expand panel
- `Ctrl + ←/→`: Navigate to previous/next period
- `Ctrl + \`: Toggle left panel visibility
- `Alt + ←/→`: Switch date

### Panel Features
- **Collapse**: Click collapse button to minimize panel
- **Copy**: Historical plans can copy content to current period plan
- **Navigation**: Use previous/next buttons to switch between different period plans

## Data Format

### File Naming Rules
- **Yearly Plan**: `2025.md`
- **Monthly Plan**: `202507.md`
- **Weekly Plan**: `20250629.md` (date of the week's Sunday)
- **Daily Plan**: `20250702.md`

### Markdown Title Format
- **Yearly**: `# 2025 Yearly Plan`
- **Monthly**: `# 2025-07 Monthly Plan`
- **Weekly**: `# 2025-06-29~2025-07-05 Weekly Plan`
- **Daily**: `# 2025-07-02 Daily Plan`

## Development

### Generate Test Data
```bash
# Run using uv
uv run python generate_test_data.py

# Or run in virtual environment
source .venv/bin/activate
python generate_test_data.py
```

### Start in Development Mode
```bash
# Run development mode using uv
uv run uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

# Or run in virtual environment
source .venv/bin/activate
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

### Common uv Commands
```bash
# Create virtual environment
uv venv

# Install package
uv add <package_name>

# Install development dependency
uv add --dev <package_name>

# Run Python script
uv run python script.py

# Sync project dependencies
uv sync

# Check outdated packages
uv tree
```

### Project Specifications
Detailed technical specifications can be found in the `detail_spec/` directory:
- `01_data_structure_design.md` - Data structure design
- `02_backend_api_design.md` - Backend API design
- `03_frontend_ui_design.md` - Frontend UI design
- `04_test_data_specification.md` - Test data planning

## License

This project is licensed under the MIT License.

## Contributing

Welcome to submit Issues and Pull Requests to improve this project!
