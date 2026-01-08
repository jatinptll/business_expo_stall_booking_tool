# 🚀 Deployment Guide (Render.com)

This guide will help you deploy your **Shri Vishwakarma Business Expo** site to the web using **Render** (a free and easy hosting platform).

## Prerequisites
- A [GitHub](https://github.com/) account.
- A [Render](https://render.com/) account.

---

## Step 1: Prepare Your Code (Already Done!)
I have already added the necessary files for deployment:
1.  **`requirements.txt`**: Added `gunicorn` (production server).
2.  **`Procfile`**: Tells the server how to run your app.
3.  **`.gitignore`**: Ensures security by ignoring sensitive files like `.env`.

## Step 2: Push to GitHub
Since you are running locally, you need to put your code on GitHub first.

1.  **Initialize Git** (Run these commands in your terminal):
    ```bash
    git init
    git add .
    git commit -m "Initial commit for deployment"
    ```
2.  **Create a New Repository** on GitHub:
    - Go to [GitHub.com/new](https://github.com/new).
    - Name it (e.g., `expo-2026`).
    - **Do NOT** check "Add a README", ".gitignore", or "license" (keep the repo empty).
3.  **Push your code**:
    - Copy the commands shown on GitHub under "…or push an existing repository from the command line". They will look like this:
    ```bash
    git branch -M main
    git remote add origin https://github.com/YOUR_USERNAME/expo-2026.git
    git push -u origin main
    ```

## Step 3: Deploy on Render
1.  Go to the [Render Dashboard](https://dashboard.render.com/).
2.  Click **New +** -> **Web Service**.
3.  Select **Build and deploy from a Git repository**.
4.  Connect your GitHub account and select your new `expo-2026` repository.
5.  **Configure the Service**:
    - **Name**: `expo-2026-YOURNAME` (this will be your website URL).
    - **Runtime**: `Python 3`.
    - **Build Command**: `pip install -r requirements.txt`. (Render usually auto-detects this).
    - **Start Command**: `gunicorn app:app`. (Render might auto-detect `python app.py`, but `gunicorn` is better).

## Step 4: Add Environment Variables (Crucial!)
Render does NOT read your `.env` file for security. You must add the variables manually on the dashboard.

1.  Scroll down to the **Environment Variables** section (or "Advanced").
2.  Add the following keys and values (copy them from your local `.env` file):

    | Key | Value |
    | :--- | :--- |
    | `MONGODB_URI` | `your_mongodb_atlas_connection_string` |
    | `ADMIN_USERNAME` | `admin_username` |
    | `ADMIN_PASSWORD` | `svkbe2026` (or your preferred password) |
    | `PYTHON_VERSION` | `3.11.5` (Optional, ensures compatibility) |

## Step 5: Finish
1.  Click **Create Web Service**.
2.  Render will start building your app. It may take 2-3 minutes.
3.  Once the build is successful, you will see a green "Live" badge and your URL (e.g., `https://svkbe2026.onrender.com/`).
4.  Click the URL to visit your live site!

## Troubleshooting
- **"Application Error"**: Check the "Logs" tab in Render for details.
- **Database Connection Fail**: Double-check that `MONGODB_URI` is copied exactly (no extra spaces).
- **Admin Login Fails**: Double-check `ADMIN_USERNAME` and `ADMIN_PASSWORD` variables.
