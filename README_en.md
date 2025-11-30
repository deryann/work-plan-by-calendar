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
- 🖥️ **Panel Maximize**: Double-click panel title for fullscreen focused editing
- ☁️ **Google Drive Sync**: Optionally store data to Google Drive (New in v0.2.0)
- 📦 **Data Export/Import**: Support ZIP format data backup and restore

## Technical Architecture

### Backend
- **Python FastAPI**: REST API service
- **Pydantic**: Data validation and models
- **File System / Google Drive**: Dual storage modes
- **Google API**: Google Drive integration (optional)

### Frontend
- **HTML5 + JavaScript (ES6+)**: Pure frontend implementation
- **TailwindCSS**: Beautiful UI design
- **Marked.js**: Markdown parsing
- **Day.js**: Date handling
- **Google Identity Services**: Google login integration (optional)

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

## Google Drive Setup (Optional)

To enable Google Drive storage, follow these steps:

### 1. Google Cloud Console Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable **Google Drive API**
4. Create **OAuth 2.0 Client Credentials** (Web application type)
5. Set Authorized JavaScript origins: `http://localhost:8000`
6. Set Authorized redirect URIs: `http://localhost:8000/frontend/`

### 2. Environment Variables Setup
```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your Google OAuth credentials
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Optional: Custom token encryption key (will auto-generate)
# GOOGLE_TOKEN_ENCRYPTION_KEY=your-encryption-key
```

### 3. Link Google Account in the App
1. Click the settings icon ⚙️ in the top right
2. In "Storage Settings" section, click "Link Google Account"
3. Complete the Google authorization flow
4. Set Google Drive storage path (default: `WorkPlanCalendar`)
5. Switch storage mode to "Google Drive"
6. Click "Test Connection" to verify settings

For detailed setup instructions, see [docs/google-cloud-setup.md](docs/google-cloud-setup.md).

## File Structure

```
project/
├── backend/                 # Backend FastAPI code
│   ├── main.py             # FastAPI application main file
│   ├── models.py           # Pydantic data models
│   ├── plan_service.py     # Business logic service
│   ├── settings_service.py # Settings management service
│   ├── google_auth_service.py # Google OAuth service
│   ├── date_calculator.py  # Date calculation utilities
│   └── storage/            # Storage abstraction layer
│       ├── base.py         # StorageProvider interface
│       ├── local.py        # Local file storage implementation
│       └── google_drive.py # Google Drive storage implementation
├── frontend/               # Frontend interface
│   └── index.html         # Main page
├── static/                # Static resources
│   ├── css/               # Style files
│   └── js/                # JavaScript modules
├── data/                  # Plan data storage
│   ├── Year/              # Yearly plans (YYYY.md)
│   ├── Month/             # Monthly plans (YYYYMM.md)
│   ├── Week/              # Weekly plans (YYYYMMDD.md, date of week's Sunday)
│   ├── Day/               # Daily plans (YYYYMMDD.md)
│   └── settings/          # Settings files (including encrypted Google auth)
├── docs/                  # Documentation
│   └── google-cloud-setup.md  # Google Cloud setup guide
├── tests/                 # Test files
├── generate_test_data.py  # Test data generator
├── start_server.py        # Startup script
├── pyproject.toml         # Project settings and dependencies
└── .env.example           # Environment variables example
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

### Google Account Authorization
- `GET /api/auth/google/status` - Get Google authorization status
- `GET /api/auth/google/authorize` - Get OAuth authorization URL
- `POST /api/auth/google/callback` - Handle OAuth authorization callback
- `POST /api/auth/google/logout` - Logout Google account
- `POST /api/auth/google/refresh` - Refresh token

### Storage Mode Settings
- `GET /api/storage/status` - Get storage status
- `PUT /api/storage/mode` - Switch storage mode
- `PUT /api/storage/google-drive-path` - Set Google Drive path
- `POST /api/storage/test-connection` - Test Google Drive connection

### Data Export/Import
- `GET /api/export` - Export all data as ZIP
- `POST /api/import` - Import data from ZIP

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
