# Belfast Rides 🛺

Belfast Rides is a full-stack taxi booking web application that allows riders to book and manage trips, drivers to handle ride assignments and earnings, and admins to verify and oversee the system. It features full user authentication, role-based dashboards, and live data handling.

This project was developed as part of my MSc Software Development program and has since been deployed with a live frontend and backend. A mobile version is currently in development.

---

## 🔗 Live Demo

- Frontend: [belfastrides.netlify.app](https://belfastrides.netlify.app)  
- Backend API: [belfast-rides.onrender.com](https://belfast-rides.onrender.com) *(limited public access)*

---

## 🧠 Features

### Rider Dashboard
- Book taxi rides
- View ride history
- Upload profile picture
- Chat with assigned driver

### Driver Dashboard
- Accept or cancel rides
- View weekly earnings
- Upload verification documents

### Admin Panel
- Search and view user details
- Verify driver documentation
- Assign and cancel rides
- Monitor live ride and user data

---

## 🧰 Tech Stack

**Frontend:** React, React Router, Bootstrap  
**Backend:** Node.js, Express  
**Database:** MySQL (hosted on Railway)  
**Deployment:** Netlify (frontend), Render (backend)  
**Authentication:** JWT, bcrypt  
**Testing:** REST Client (`.http` files in VS Code)

---

## 📁 Project Structure

/client → React frontend
/controllers → Express business logic
/routes → API routing setup
/public → Static assets
/screenshots → Project screenshots


---

## 🚀 Development Notes

All backend API endpoints were tested manually using `.http` REST Client files within VS Code. Development involved testing JSON responses against the live Railway database during integration. Frontend testing was done continuously during dashboard flow development.

---

## 📱 Related Projects

- **Mobile Version (WIP):** [Belfast Rides Mobile](https://github.com/mwilson35/Belfast-Rides-Mobile)

---

## ✍️ Author

Michael Wilson  
[GitHub](https://github.com/mwilson35) • Remote-friendly 
