# EASEeHealth — AI-Powered Decentralized Healthcare Platform

Full-stack healthcare application built with React 19, TypeScript, Vite, Tailwind CSS v4, Socket.io, Node.js, Express, PostgreSQL, and Ethereum smart contracts.

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS v4 + Socket.io + Ethers.js
- **Backend:** Node.js + Express + TypeScript + PostgreSQL + JWT + Socket.io
- **Blockchain:** Ethereum smart contracts (Solidity) for consent and audit management

## Prerequisites

- Node.js 18+
- Docker Desktop (for PostgreSQL) **or** a local PostgreSQL 16 instance
- MetaMask or compatible Ethereum wallet

## Quick Start

```bash
# 1. Install dependencies
npm run install:all

# 2. Start PostgreSQL (Docker)
npm run db:up

# 3. Copy env file (already included for local dev)
# backend/.env → DATABASE_URL=postgresql://postgres:postgres@localhost:5432/easeehealth

# 4. Run frontend + backend
npm run dev
```

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001
- **WebSocket:** Real-time notifications and updates

## Database

PostgreSQL tables are auto-created and seeded on first startup:

| Table | Purpose |
|-------|---------|
| `users` | User profiles with roles (patient, doctor, admin) |
| `auth_sessions` | Wallet connection & auth state |
| `doctor_verifications` | Doctor verification requests and status |
| `medical_records` | Encrypted medical record metadata |
| `consents` | Patient consent grants to doctors |
| `emergency_access_requests` | Emergency access requests |
| `notifications` | User notifications |
| `ai_reports` | AI-generated health reports |
| `audit_logs` | Platform audit trail |
| `security_alerts` | Security notifications |

### Manual PostgreSQL setup (without Docker)

```sql
CREATE DATABASE easeehealth;
```

Then set `DATABASE_URL` in `backend/.env`.

## Features

### Patient Portal
- **Medical Records:** View and manage encrypted medical records
- **Consent Management:** Grant or revoke access to doctors
- **Emergency Access:** Approve emergency access requests
- **Audit History:** View blockchain activity and access logs

### Doctor Portal
- **Patient Management:** View authorized patients
- **Record Upload:** Upload medical records for patients
- **Verification:** Submit and track doctor verification status
- **Emergency Requests:** Request emergency access to patient records

### Admin Portal
- **Dashboard:** Platform overview and statistics
- **Verifications:** Review and approve doctor verifications
- **User Management:** Manage platform users (suspend/activate)
- **Audit Log:** View platform-wide audit trail

### Platform Features
- **Role-Based Access:** Patient, Doctor, and Admin roles
- **Wallet Authentication:** Ethereum wallet-based authentication
- **Blockchain Integration:** Smart contracts for consent and audit logs
- **Real-time Updates:** WebSocket integration for live notifications
- **Mobile Responsive:** Optimized for mobile devices
- **Data Encryption:** AES-256 encryption for medical files

## API Endpoints

All protected routes require `Authorization: Bearer <token>`.

### Authentication
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/connect` | No | Connect wallet with role selection |
| POST | `/api/auth/authenticate` | No | Authenticate with signature |
| POST | `/api/auth/grant-access` | No | Issue JWT |
| POST | `/api/auth/logout` | No | End session |

### Medical Records (Patient/Doctor)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/medical/records` | Yes | Get medical records |
| POST | `/api/medical/records/upload` | Yes | Upload medical record |
| GET | `/api/medical/consents` | Yes | Get consents |
| POST | `/api/medical/consents/grant` | Yes | Grant consent |
| POST | `/api/medical/consents/revoke` | Yes | Revoke consent |
| GET | `/api/medical/emergency` | Yes | Get emergency requests |
| POST | `/api/medical/emergency/request` | Yes | Request emergency access |
| POST | `/api/medical/emergency/approve` | Yes | Approve emergency access |

### Doctor Portal
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/doctor/verification` | Yes | Get verification status |
| POST | `/api/doctor/verification` | Yes | Submit verification |
| GET | `/api/doctor/patients` | Yes | Get authorized patients |
| GET | `/api/doctor/patients/:id/records` | Yes | Get patient records |
| GET | `/api/doctor/patients/:id/audit` | Yes | Get patient audit log |

### Admin Portal
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/dashboard` | Yes | Get platform statistics |
| GET | `/api/admin/verifications` | Yes | Get doctor verifications |
| POST | `/api/admin/verifications/:id/approve` | Yes | Approve verification |
| POST | `/api/admin/verifications/:id/reject` | Yes | Reject verification |
| POST | `/api/admin/verifications/:id/suspend` | Yes | Suspend verification |
| GET | `/api/admin/users` | Yes | Get platform users |
| POST | `/api/admin/users/:id/suspend` | Yes | Suspend user |
| POST | `/api/admin/users/:id/activate` | Yes | Activate user |
| GET | `/api/admin/audit` | Yes | Get platform audit log |
| GET | `/api/admin/status` | Yes | Get platform status |

### Profile & Settings
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/profile` | Yes | User profile |
| PUT | `/api/profile` | Yes | Update profile |
| GET | `/api/settings` | Yes | App settings |
| PUT | `/api/settings` | Yes | Update settings |
| GET | `/api/security-alerts` | Yes | Security alerts |

## WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `auth:connected` | Server → Client | Wallet connected |
| `auth:granted` | Server → Client | Access granted |
| `dashboard:update` | Server → Client | Dashboard data updated |
| `notification:new` | Server → Client | New notification |

## Smart Contracts

The platform uses Ethereum smart contracts for:

- **PatientRegistry**: Patient registration and profile metadata
- **DoctorRegistry**: Doctor identity and verification
- **ConsentManager**: Patient-controlled data access permissions
- **MedicalRecordRegistry**: Medical record metadata and hashes
- **AuditLog**: Immutable audit trail
- **EmergencyAccess**: Emergency access management

See `contracts/` directory for contract details and deployment instructions.

## Security

- JWT-based authentication with role support
- Wallet signature verification
- Session management
- Role-based access control (RBAC)
- Security alert monitoring
- AES-256 encryption for medical files
- Blockchain audit trail
