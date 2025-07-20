# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a web-based markdown editor for managing personal work plans organized by calendar periods (Year/Month/Week/Day). The application allows quick viewing and editing of hierarchical plans with a dual-panel interface.

## Architecture

### Tech Stack
- **Backend**: Python FastAPI for REST API
- **Frontend**: HTML5 + JavaScript (ES6+) + TailwindCSS
- **Data Storage**: File system (Markdown files)
- **Additional Libraries**: 
  - marked.js (Markdown parsing)
  - Prism.js or CodeMirror (syntax highlighting)
  - Day.js (date handling)

### Project Structure
```
project/
   data/                    # Plan storage directory
      Year/               # Annual plans (YYYY.md)
      Month/              # Monthly plans (YYYYMM.md) 
      Week/               # Weekly plans (YYYYMMDD.md, Sunday date)
      Day/                # Daily plans (YYYYMMDD.md)
   detail_spec/            # Detailed technical specifications
   spec/                   # High-level requirements
   CLAUDE.md              # This file
```

## Data Structure

### File Naming Conventions
- **Year**: `2025.md`
- **Month**: `202507.md`
- **Week**: `20250629.md` (Sunday date of that week)
- **Day**: `20250702.md`

### Markdown Title Format
- **Year**: `# 2025 年計畫`
- **Month**: `# 2025-07 月計畫`
- **Week**: `# 2025-06-29~2025-07-05 週計畫`
- **Day**: `# 2025-07-02 日計畫`

## API Design

### Core Endpoints
- `GET /api/plans/{plan_type}/{date}` - Get plan content
- `PUT /api/plans/{plan_type}/{date}` - Update plan content
- `POST /api/plans/{plan_type}/{date}` - Create new plan
- `DELETE /api/plans/{plan_type}/{date}` - Delete plan
- `GET /api/plans/all/{date}` - Get all plan types for a date
- `POST /api/plans/copy` - Copy content between plans

### Plan Types
- `year` | `month` | `week` | `day`

## Frontend Components

### Main Layout
- **Left Panel**: History plans (collapsible panels for previous periods)
- **Right Panel**: Current plans (today's year/month/week/day plans)
- **Resizable**: Adjustable panel widths with collapse functionality

### Reusable Components
- **PlanPanel**: Core component for each plan type with edit/preview modes
- **DatePicker**: Date selection for navigation
- **MarkdownEditor**: Syntax-highlighted markdown editing

## Key Features

### Navigation
- Previous/next period navigation for each plan type
- Date picker for jumping to specific periods
- Automatic calculation of week start dates (Sunday-based)

### Content Management
- Copy content between different plan types
- Auto-save functionality
- Preview/edit mode toggle
- Markdown syntax highlighting

### UI/UX
- Collapsible panels with memory
- Responsive design
- Keyboard shortcuts
- Dark mode support

## Development Guidelines

### Backend Development
- Use Pydantic models for data validation
- Implement proper error handling with meaningful HTTP status codes
- Create DateCalculator utility for period calculations
- Ensure thread-safe file operations

### Frontend Development
- Follow component-based architecture
- Use TailwindCSS for consistent styling
- Implement proper state management for panels
- Add loading states and error handling

### Date Handling
- Week calculations always start on Sunday
- Handle timezone considerations
- Validate date formats consistently

## Important Notes

- This is a planning and specification phase project - actual implementation may not exist yet
- All code should follow the hierarchical planning structure (Year → Month → Week → Day)
- Maintain consistency with Chinese titles and content formatting
- Focus on user experience for quick plan editing and navigation