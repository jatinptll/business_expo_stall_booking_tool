# Shri Vishwakarma Business Expo 2026 - Stall Booking System

## 📌 Project Overview
The **Shri Vishwakarma Business Expo 2026** portal is a comprehensive web application designed to facilitate the digital booking of exhibition stalls. It offers an interactive visual map of the expo hall, allowing exhibitors to view stall availability, pricing, and categories in real-time. The system streamlines the entire process from user registration and booking requests to admin approval and confirmation.

### Key Features
- **Interactive Hall Map**: A dynamic grid-based visualization of the expo layout showing entrances, exits, and stall locations.
- **Real-Time Availability**: Color-coded visualization (Available, Pending, Booked) for instant status checks.
- **User Dashboard**: Exhibitors can track their booking requests and view confirmed stalls.
- **Admin Panel**: A secured backend interface for organizers to manage requests, confirm bookings, and view financial statistics.
- **Secure Authentication**: Robust login/registration system for both users and administrators.

---

## 🛠 Tech Stack & Architecture

We chose a robust, scalable, and simple technology stack to ensure performance and ease of maintenance.

### 1. Backend: **Flask (Python)**
- **Why?**: Flask is a lightweight WSGI web application framework. It provides the essential tools to get the application up and running quickly while being flexible enough to scale. Its seamless integration with Python libraries makes data processing and API development efficient.

### 2. Database: **MongoDB (Atlas)**
- **Why?**: The project requires handling dynamic data with flexible structures (e.g., varying user profiles, stall configurations). MongoDB's document-oriented (NoSQL) nature allows us to store this data in JSON-like format, making it faster to develop and iterate compared to rigid SQL schemas.

### 3. Frontend: **HTML5, CSS3, Vanilla JavaScript**
- **Why?**: 
    - **Performance**: The interactive map involves rendering hundreds of grid items. Vanilla JS offers direct DOM manipulation with zero overhead, ensuring the UI remains snappy on all devices.
    - **Simplicity**: Avoiding heavy frontend frameworks (like React or Next.js) for this specific use case reduces bundle size and eliminates the need for a complex build pipeline, complying with the requirement for a lightweight, deployable solution.

### 4. Deployment: **Gunicorn & Render**
- **Why?**: Gunicorn is a production-grade WSGI server that handles concurrent requests efficiently. Render provides a modern, hassle-free cloud hosting environment that auto-deploys from Git.

---

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- A MongoDB Cluster (URI required)

### Installation

1. **Clone the repository** (if using Git):
   ```bash
   git clone <your-repo-url>
   cd <repo-name>
   ```

2. **Set up a Virtual Environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```

3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configuration**:
   Create a `.env` file in the root directory with the following credentials:
   ```env
   MONGODB_URI=your_mongodb_atlas_connection_string
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=your_secure_password
   ```

5. **Run the Application**:
   ```bash
   python app.py
   ```
   The site will be live at `http://localhost:8080`.

---

## 📂 Project Structure

- **`app.py`**: The core application logic, API routes, and database interactions.
- **`templates/`**: HTML files (Frontend views).
  - `index.html`: The main landing page with the interactive map.
  - `admin.html`: The secure dashboard for organizers.
- **`static/`**: Client-side assets.
  - `css/styles.css`: All styling, including the grid layout and animations.
  - `js/script.js`: Frontend logic for map rendering, API calls, and modals.
