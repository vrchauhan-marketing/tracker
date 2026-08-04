# Enacton Activity Tracker — GEO & AEO Outreach Dashboard

A lightweight, local-first web application for tracking Enacton's (enacton.com) community outreach activities across **Reddit, Quora, Dev.to, Medium, and LinkedIn**. Built to measure Generative Engine Optimization (GEO) and Answer Engine Optimization (AEO) footprint consistency.

---

## 🚀 Quick Start (Local Run)

The application is built with Next.js 16, Tailwind CSS, and a local SQLite database (`better-sqlite3`).

### 1. Start the Development Server
```bash
cd enacton-tracker
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 📖 Core Functionalities & Features

### 1. This Week Overview (`/`)
The primary landing page designed for quick daily/weekly pulse checks.
- **Top-Line KPI Cards:**
  - `Total Activities`: Cumulative lifetime logged entries.
  - `This Week`: Number of activities logged in the current calendar week (Monday–Sunday).
  - `This Month`: Total activities logged in the current calendar month.
  - `Top Platform`: The platform with the highest volume of outreach.
- **Platforms This Week:** Real-time count of posts created per platform in the current week.
- **Top Topics This Week:** Top 5 topics targeted by your team this week.
- **Recent Activity Table:** Shows the 5 most recently published items with direct links, platform badges, and topic pills.

---

### 2. Log Activity Form (`/log`)
The primary data entry form engineered for fast submission (under 30 seconds).

* **URL Field with Auto-Detection:**
  - Pasting a URL automatically detects the platform (`Reddit`, `Quora`, `Dev.to`, `Medium`, `LinkedIn`) from the domain name.
  - Automatically identifies Activity Type (`Article`, `Post / Thread`, `Comment / Answer`) based on URL structure (e.g., `/comments/` $\rightarrow$ Comment/Answer).
* **Dynamic Topic Selector:** Clickable pills populated directly from your active database topics. Allows multi-select (e.g. *MVP Rescue* + *SaaS Development*).
* **Date Picker:** Defaults to today's date; supports past dates for backfilling historical entries.
* **Duplicate Prevention:** Rejects duplicate URL submissions via SQL `UNIQUE` constraints to keep data clean.
* **Screenshot Base64 Storage:** Optional drag-and-drop file upload. Converts image files (PNG/JPG) directly into Base64 strings in the SQLite database — ensuring zero external file dependency and seamless future cloud migration.
* **Optional Meta:** Title, Notes, Logged By (author name).

---

### 3. Activity Feed / Audit Log (`/feed`)
The full, searchable history table of all logged outreach activities.

* **Multi-Filter Bar:**
  - Filter by **Platform** (e.g. show only *Reddit*).
  - Filter by **Topic** (e.g. show only *AI / LLM Integration*).
  - Combine filters (e.g. *Reddit* + *MVP Development*).
  - One-click `✕ Clear` reset.
* **Feed Columns:**
  - `Platform`: Colored badge indicator.
  - `Post`: Post title linked to live URL + screenshot thumbnail preview + notes snippet.
  - `Topics`: Tag pills.
  - `Type`: Badge indicating Article, Post, or Comment.
  - `Date`: Publication date.
  - `Engagement`: Auto-scraped stats (⬆ upvotes, 💬 comments, 👁 views) + last-scraped timestamp.
  - `By`: Team member name.

---

### 4. Analytics Dashboard (`/analytics`)
Visual insights powered by **Recharts**.

* **Content Velocity Chart (12-Week Bar Chart):**
  - Displays total activities logged per week over the last 12 weeks.
  - **Dotted Target Line:** Renders your self-set weekly target (e.g., 10 posts/week).
  - **Trend Visibility:** Instantly surfaces visual gaps or dips in weekly output.
* **Platform Distribution (Donut Chart):**
  - Percentage share breakdown by platform (e.g. 50% Reddit, 25% Quora, 15% Dev.to, 10% Medium).
  - Ensures outreach is diversified across different AI crawler data sources.
* **Topic Coverage (Horizontal Bar Chart):**
  - Counts total activities per topic tag, sorted from highest to lowest.
  - **Low-Coverage Warning:** Topics with fewer than 5 posts are highlighted in **orange** with a `⚠ low coverage` indicator to expose GEO blind spots.
* **Activity Type Split:** Categorization ratio (Articles vs. Posts/Threads vs. Comments/Answers).

---

### 5. Settings & Taxonomy Management (`/settings`)
Manage your GEO topic categories and app preferences dynamically — no code changes or migrations required.

* **Weekly Target Setting:** Adjust the target number of activities per week (updates the velocity chart line).
* **Topic Management:**
  - **Add New Topic:** Enter name + select custom color picker dot.
  - **Rename Topic:** Inline text editing.
  - **Enable / Disable Toggle:** Temporarily hide topics from the Log form without deleting past historical data.

---

### 6. Auto-Scraper Engine (`lib/scraper.ts`)
A non-blocking background worker that automatically triggers whenever a new URL is logged:
* **Dev.to:** Queries Dev.to's public REST API (`api.devto.com`) to extract page views, positive reactions, and article titles.
* **Reddit:** Appends `.json` to Reddit URLs to fetch live scores (upvotes), comment counts, and thread titles.
* **Generic Web:** Parses OpenGraph `<meta property="og:title">` tags for page title extraction.

---

## 🛠 Tech Stack & Architecture

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Framework** | Next.js 16 (App Router + Turbopack) | Server Components & Server Actions for data fetching and mutations |
| **Database** | SQLite (`better-sqlite3`) | Local single-file database (`enacton-tracker.sqlite`) with WAL mode enabled |
| **Styling** | Tailwind CSS | Custom dark theme (`#0f172a` primary background, `#1e293b` cards) |
| **Charts** | Recharts | React charting library for velocity, donut, and bar charts |
| **Type Safety** | TypeScript | Strict types for all database models, props, and actions |

---

## 🗄 Database Schema

The database consists of 3 tables stored in `enacton-tracker.sqlite`:

```sql
-- Topics Table (Managed via /settings)
CREATE TABLE topics (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  color      TEXT NOT NULL DEFAULT '#8b5cf6',
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT (datetime('now'))
);

-- Activities Table (Logged items)
CREATE TABLE activities (
  id               TEXT PRIMARY KEY,
  created_at       DATETIME DEFAULT (datetime('now')),
  date_posted      DATE NOT NULL,
  platform         TEXT NOT NULL,
  activity_type    TEXT NOT NULL,
  url              TEXT NOT NULL UNIQUE,
  title            TEXT,
  topic_tags       TEXT NOT NULL, -- JSON array string
  notes            TEXT,
  screenshot       TEXT,          -- Base64 encoded string
  logged_by        TEXT,
  scraped_upvotes  INTEGER DEFAULT 0,
  scraped_comments INTEGER DEFAULT 0,
  scraped_views    INTEGER DEFAULT 0,
  last_scraped_at  DATETIME
);

-- Settings Table (Key-Value configuration)
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

---

## ☁️ Future Cloud Migration Path (Cloudflare D1 + Pages)

When Enacton is ready to host this dashboard live on Cloudflare:

1. **Database:** Export local `enacton-tracker.sqlite` and import directly into **Cloudflare D1** (Cloudflare's edge SQLite service). Schema remains 100% identical.
2. **Hosting:** Deploy Next.js to **Cloudflare Pages**.
3. **Database Client:** Replace `better-sqlite3` in `lib/db.ts` with Cloudflare D1 binding (`env.DB`). All queries in `lib/queries.ts` remain unchanged.
