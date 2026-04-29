# ADMINPANEL

# Admin Panel Project

A full-stack administrative dashboard built with React, Vite, and Node.js, featuring Supabase integration and custom authentication layouts.

## 🚀 Features
* **Frontend:** React with TypeScript and Vite for fast development.
* **Backend:** Node.js environment for server-side logic.
* **Database:** Supabase integration for real-time data and authentication.
* **Styling:** Modular CSS structure for independent page layouts.
* **State Management:** Custom hooks and context providers (Tenant & Auth).

---

## 📁 Project Structure

* **AdminPanel/**: The frontend React application.
    * `/src/pages`: Contains Dashboard, Login, Signup, and Password management.
    * `/src/lib`: Supabase configuration and utility functions.
    * `/src/styles`: Page-specific CSS files.
* **Backendadminpanel/**: The server-side logic and configuration.

---

## 🛠️ Installation & Setup

### 1. Clone the repository
```bash
git clone [https://github.com/your-username/your-repo-name.git](https://github.com/your-username/your-repo-name.git)
cd your-repo-name
2. Frontend Setup
cd AdminPanel
npm install
npm run dev
3. Backend Setup
Bash
cd ../Backendadminpanel
npm install
4. Environment Variables
Create a .env file in the Backendadminpanel folder and add your Supabase/Database credentials:

Code snippet
SUPABASE_URL=your_url_here
SUPABASE_KEY=your_key_here
⚡ Running the Project
Start Frontend (Vite)
Bash
cd AdminPanel
npm run dev
The app will be available at http://localhost:5173

Start Backend
Bash
cd Backendadminpanel
npm start
