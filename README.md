# CoWork HQ Workspace

This is the root workspace directory for the CoWork HQ platform. The project has been modularized and split into multiple separate repositories to improve maintainability and deployment.

## Projects

1. **`coworkhq-backend-v2`** (NestJS Backend)
   - Handles the core API, database via Prisma, Razorpay payments, and role-based authentication.
   - Deployed on Vercel/Railway.

2. **`coworkhq-frontend-manager`** (Manager Portal)
   - A dashboard for workspace managers to track bookings, revenue, issues, and platform fees.
   - Pure HTML/CSS/JS deployed to Vercel.

3. **`coworkhq-frontend-admin`** (Admin Portal)
   - The Super Admin portal for monitoring all branches, banning users, platform fees, and system analytics.
   - Pure HTML/CSS/JS deployed to Vercel.

4. **`book_my_space`** (Customer Flutter App)
   - The mobile application for customers to find workspaces, book desks, scan QR codes, and make payments.

## Local Development Workflow

To start development locally, you can use the provided PowerShell scripts to run the environment:

```bash
# Start all servers locally (Backend + Frontend Manager + Admin)
.\dev-start.ps1
```

## Repositories
- **Admin Portal**: [https://github.com/AnnA10O/admin](https://github.com/AnnA10O/admin)
- **Manager Portal**: [https://github.com/AnnA10O/cowork-manager](https://github.com/AnnA10O/cowork-manager)

*(Refer to each subfolder for detailed, project-specific README files).*
