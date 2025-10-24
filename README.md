::CYBERNETIC.INTELLIGENCE.HUB::

A modern, open-source dashboard for real-time security intelligence, aggregating NVD vulnerabilities, Exploit DB entries, and AI-driven threat analysis.

![Project Screenshot](https://placehold.co/800x400/0d1117/00ffff?text=CYBER-INTEL-HUB+UI)

## About This Project

This project is a centralized dashboard designed for security professionals, researchers, and enthusiasts. It provides a high-level, real-time overview of the current threat landscape by integrating three critical data sources into a single, high-performance interface.

### Key Features

1.  **NVD Vulnerability Feed:**
    * Real-time data synchronization from the NVD (National Vulnerability Database).
    * Advanced search and filtering based on Severity, Keywords, CVE ID, and Date.
    * Displays detailed information including CVSS scores, CWEs, and vectors.

2.  **AI-Driven Analysis Unit:**
    * An interface to query custom-trained language models (like ExBERT & ExBERT+XAI).
    * Allows users to input text (e.g., security reports, logs) and receive specialized analysis.
    * Includes a terminal-style "typewriter" effect for displaying model responses.

3.  **Exploit DB Feed:**
    * Displays the latest published exploits from Exploit-DB.
    * Provides quick access to exploit titles, types, platforms, and authors.

## Project Structure

This project is structured as a simple monorepo:

* `/frontend`: The main web application (built with React/Vite/Tailwind). This is what users see.
* `/scripts`: A collection of Node.js scripts used for data pipelines. These scripts fetch, parse, and store data.
* `/.github/workflows`: GitHub Actions workflows that automate the data pipelines (e.g., running the `scripts/` on a schedule).

## Tech Stack

* **Frontend:** React (Vite) & Tailwind CSS
* **Backend (BaaS):** [Supabase](https://supabase.com/)
    * **Database:** Supabase Postgres for storing NVD and Exploit DB data.
    * **API:** Supabase auto-generated PostgREST API for the frontend to read data.
* **Data Pipeline:** GitHub Actions (as a cron job)
* **Hosting:** [Vercel](https://vercel.com/)

## Setup & Deployment

1.  **Clone the Repository:**
    ```bash
    git clone [https://github.com/](https://github.com/)[YOUR-USERNAME]/cyber-intel-hub.git
    cd cyber-intel-hub
    ```

2.  **Setup Backend (Supabase):**
    * Create a new project on Supabase.
    * Define your database tables (e.g., `vulnerabilities`, `exploits`).
    * Get your `Project URL` and `Service Role Key`.

3.  **Setup GitHub Secrets:**
    * In your GitHub repo settings, go to `Settings > Secrets and variables > Actions`.
    * Add the following secrets (do NOT hard-code them):
        * `SUPABASE_URL`: Your project's URL.
        * `SUPABASE_SERVICE_KEY`: Your project's `service_role` key (this key is secret and powerful).

4.  **Setup Frontend:**
    * Navigate to the `/frontend` directory.
    * Create a `.env.local` file.
    * Add your *public* Supabase keys (the `anon` key) here for the frontend to read data.
        ```env
        VITE_SUPABASE_URL=YOUR_PROJECT_URL
        VITE_SUPABASE_ANON_KEY=YOUR_PROJECT_ANON_KEY
        ```
    * Install dependencies and run:
        ```bash
        cd frontend
        npm install
        npm run dev
        ```

5.  **Deploy to Vercel:**
    * Sign up for Vercel with your GitHub account.
    * Import your `cyber-intel-hub` repository.
    * Set the "Root Directory" to `frontend`.
    * Add your frontend environment variables (the `VITE_` keys) to Vercel.
    * Click **Deploy**.

---

*This project is currently in development. Contributions and suggestions are welcome.*

