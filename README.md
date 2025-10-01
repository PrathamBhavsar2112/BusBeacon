# BusBeacon

BusBeacon is a production-style, serverless reference app for transit tracking in Halifax. It pairs a React + Leaflet map UI with an AWS backend that authenticates users, serves live bus/route data, computes the nearest stop, and emails proximity alerts. The stack is fully defined with infrastructure-as-code for repeatable deployments.

---

## Core Features

- **Authentication**: Secure sign-in via Amazon Cognito (JWT-protected APIs).  
- **Interactive Map**: Live bus markers, route polylines, and nearest-stop highlight.  
- **Proximity Alerts**: Email notifications via Amazon SNS when buses approach saved locations.  
- **Serverless Backend**: DynamoDB tables for buses, routes, and user subscriptions.  
- **Simulator**: Demo mode to simulate bus movement.  
- **Deployment**: S3 + CloudFront hosting, API Gateway for backend.  

---

## Architecture

<img width="838" height="582" alt="Screenshot 2025-07-03 at 9 09 37 PM" src="https://github.com/user-attachments/assets/ed01f837-dec9-43b7-b8ff-cdec0377bfc3" />



- **Storage**: DynamoDB (Buses, Routes, UserSubscriptions), S3 for frontend.  
- **Backend**: Lambda (FetchBuses, GetRoute, NearestStop, Simulator), Eventbridge, API Gateway.  
- **Auth**: Cognito (User Pool, Identity Pool, triggers).  
- **Notifications**: SNS email alerts.  
- **Monitoring**: CloudWatch logs/metrics and alarms. 

---

## Deployment

### CloudFormation Stacks (deploy in order)

1. `storage-stack.yaml` → DynamoDB, S3, CloudFront, seeding  
2. `auth-map-stack.yaml` → Cognito pools/triggers  
3. `backend-stack.yaml` → Lambda, API Gateway, SNS  
4. `parent-stack.yaml` → CloudFront + outputs  

### Build and Upload Frontend

```bash
cd frontend
npm run build
aws s3 sync build/ s3://<website-bucket> --delete
```

## Data

- **Demo data**: included by default.  
- **Live feeds**: add scheduled Lambda for GTFS static (routes/stops) + GTFS-RT (vehicle positions).  
- Disable **SimulateMovementHandler** when live data is active.  

---

## Security, Ops, Cost

- **Security**: JWT auth, least-privilege IAM, encrypted DynamoDB/S3, CloudFront OAI, optional WAF.  
- **Ops**: CloudWatch logs/metrics, SNS error alarms.  
- **Cost**: Fully on-demand (DynamoDB pay-per-request, Lambda/API Gateway per call, Cognito MAU).  

---

## Roadmap

- Import Halifax GTFS feeds.  
- Add SMS alerts.  
- Enable MFA and advanced Cognito policies.  
- Migrate to HTTP API (lower cost).  
- Add CI/CD with CodePipeline or GitHub Actions.  


