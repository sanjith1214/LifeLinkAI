
# LifeLink AI
### Smart Emergency Response & Healthcare Coordination Platform

LifeLink AI is an integrated emergency response and healthcare coordination platform designed to connect citizens, hospitals, blood donors, pharmacies, and emergency service providers through a unified digital system.

The platform aims to simplify emergency communication, improve access to healthcare resources, and support faster coordination during critical situations.

---

## Project Overview

LifeLink AI brings multiple healthcare and emergency services together in one platform.

It provides role-based access for different users and organizations, allowing them to access relevant services and coordinate emergency activities.

## Core Features

### Emergency Response
- SOS emergency request system
- Real-time emergency coordination
- Live emergency status updates
- SOS history and tracking
- Police and fire station alerts

### Healthcare Services
- Nearby hospital discovery
- Hospital patient management
- Hospital bed information
- Medical records management
- Emergency Medical ID with QR code
- Health information and vital tracking

### Blood Donation
- Blood donor discovery
- Blood donation requests
- Blood request management
- Donor coordination

### Pharmacy Services
- Pharmacy discovery
- Medicine and stock management
- Pharmacy directory

### AI & Assistance
- AI-powered assistant
- Healthcare information support
- Emergency guidance features

### User Management
- User registration and login
- Role-based access control
- User profile management
- Email verification
- Secure authentication

---

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, JavaScript |
| Backend | Node.js, Express.js |
| Database | MongoDB |
| Authentication | JWT, bcrypt |
| Real-time Communication | Socket.IO |
| Maps | Leaflet, OpenStreetMap |
| API Communication | REST APIs |
| AI Integration | Gemini API |

---

## System Architecture

```text
             USERS & ORGANIZATIONS
                       |
                       v
              REACT FRONTEND
                       |
                       v
                REST API LAYER
                       |
                       v
              NODE.JS + EXPRESS
                       |
          +------------+------------+
          |            |            |
          v            v            v
       MongoDB      Socket.IO     AI Services
          |            |            |
          +------------+------------+
                       |
                       v
             EMERGENCY & HEALTHCARE
                  SERVICES
```

---

## Project Structure

```text
LifeLinkAI/
|
|-- client/
|   |-- public/
|   |-- src/
|       |-- components/
|       |-- context/
|       |-- landing/
|       |-- pages/
|       |-- services/
|       |-- utils/
|
|-- server/
|   |-- constants/
|   |-- controllers/
|   |-- middleware/
|   |-- models/
|   |-- routes/
|   |-- services/
|   |-- sockets/
|   |-- utils/
|
|-- docs/
|-- .github/
|-- README.md
```

---

## Getting Started

### Prerequisites

Install the following before running the project:

- Node.js
- npm
- MongoDB database
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/sanjith1214/LifeLinkAI.git
cd LifeLintAi
```

### 2. Install Frontend Dependencies

```bash
cd client
npm install
```

### 3. Install Backend Dependencies

Open another terminal:

```bash
cd server
npm install
```

### 4. Configure Environment Variables

Create the required `.env` files using the project's `.env.example` files.

Configure the required values, such as:

- MongoDB connection string
- JWT secret
- API configuration
- AI API key
- Email service credentials
- Other service credentials required by the project

Never upload real API keys, passwords, or secrets to GitHub.

### 5. Run the Application

Start the backend:

```bash
cd server
npm run dev
```

Start the frontend in another terminal:

```bash
cd client
npm run dev
```

Use the local frontend URL displayed by Vite.

---

## User Roles

The platform supports different user categories, including:

- Citizens
- Hospitals
- Police departments
- Fire stations
- Pharmacies
- Administrators

Access to features depends on the user's assigned role.

---

## Project Objectives

- Improve emergency response coordination.
- Connect citizens with nearby healthcare services.
- Simplify blood donor discovery and coordination.
- Provide centralized medical information.
- Enable real-time communication between relevant services.
- Support technology-driven healthcare accessibility.

---

## Future Enhancements

- Enhanced emergency location tracking.
- Improved healthcare data accessibility.
- Additional emergency service integrations.
- Advanced analytics and reporting.
- Further improvements to AI-assisted healthcare support.

---

## Repository

GitHub: https://github.com/sanjith1214/LifeLinkAI

---

**LifeLink AI — Connecting People, Healthcare & Emergency Services.**
