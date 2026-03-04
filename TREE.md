financial-customer-churn-prediction-system/
├── README.md
├── TREE.md
├── backend/
│   ├── package.json
│   ├── package-lock.json
│   ├── .env
│   └── src/
│       ├── app.js
│       ├── server.js
│       ├── config/
│       │   └── db.js
│       ├── constants/
│       │   └── roles.js
│       ├── controllers/
│       │   ├── admin.controller.js
│       │   ├── auth.controller.js
│       │   ├── prediction.controller.js
│       │   └── user.controller.js
│       ├── middleware/
│       │   ├── admin.middleware.js
│       │   ├── auth.middleware.js
│       │   ├── error.middleware.js
│       │   └── role.middleware.js
│       ├── ml/
│       │   ├── churnModel.js
│       │   ├── metrics.js
│       │   └── trainData.js
│       ├── models/
│       │   ├── Log.model.js
│       │   ├── Prediction.model.js
│       │   └── User.model.js
│       ├── routes/
│       │   ├── admin.routes.js
│       │   ├── auth.routes.js
│       │   ├── prediction.routes.js
│       │   └── user.routes.js
│       ├── services/
│       │   ├── admin.service.js
│       │   ├── auth.service.js
│       │   └── prediction.service.js
│       └── utils/
│           ├── jwt.js
│           └── logger.js
└── frontend/
    ├── .gitignore
    ├── eslint.config.js
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── public/
    └── src/
        ├── App.css
        ├── App.jsx
        ├── index.css
        ├── main.jsx
        ├── assets/
        ├── components/
        │   ├── ChurnChart.jsx
        │   ├── ProtectedRoute.jsx
        │   └── common/
        │       ├── Header.jsx
        │       ├── Loader.jsx
        │       └── Sidebar.jsx
        ├── context/
        │   └── Authcontext.jsx
        ├── pages/
        │   ├── Home.jsx
        │   ├── Login.jsx
        │   ├── admin/
        │   │   ├── AdminDashboard.jsx
        │   │   ├── Analytics.jsx
        │   │   ├── Logs.jsx
        │   │   ├── ModelControl.jsx
        │   │   └── Users.jsx
        │   └── Bank/
        │       ├── AddCustomer.jsx
        │       ├── BankDashboard.jsx
        │       ├── PredictionHistory.jsx
        │       └── Profile.jsx
        ├── routes/
        │   └── AppRoutes.jsx
        ├── services/
        │   ├── admin.service.js
        │   ├── api.js
        │   ├── auth.service.js
        │   └── prediction.service.js
        └── utils/
            └── helpers.js
