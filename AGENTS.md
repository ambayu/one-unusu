# ONE UNUSU - Engineering Instructions

## Project
ONE UNUSU - Integrated Digital Campus
Universitas Nahdlatul Ulama Sumatera Utara

## Technology
- Frontend: Next.js 16, TypeScript, Tailwind CSS
- Backend: Laravel REST API
- Database: MySQL
- SSO: Keycloak OIDC
- Local Development: Windows Laragon without Docker
- Server Deployment: Docker Compose

## Websites
- 1 University Website
- 6 Faculty Websites
- 14 Study Program Websites
- Institution Websites

## Applications
- SIAKAD: Existing third-party application
- PMB: Existing third-party application
- E-Surat: Planned
- BAKSA and BAKSI: Planned
- SDM and Sarpras: Planned
- LPM and LPPM: Planned
- LMS: Planned

## Development Rules
1. Use reusable React components.
2. Follow TypeScript best practices.
3. Build responsive and accessible interfaces.
4. Never invent official university information.
5. Never commit credentials or .env files.
6. Never modify existing production services.
7. Do not execute destructive database commands.
8. Test before committing changes.
9. Use Git feature branches.
10. Ask before major architectural changes.

## Production Environment
- Ubuntu 20.04 legacy server
- Project: /home/www/html/Jun/one-unusu
- Existing Apache: ports 80 and 443
- Existing MySQL: port 3306
- Docker containers use isolated networks.
- Do not publish database ports.
- Do not modify existing Apache configuration.
