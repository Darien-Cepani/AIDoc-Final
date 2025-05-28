# AIDoc

**Your Personalized Health Companion**

This project, **AIDoc**, is a comprehensive web application developed as my thesis for my final year at the American College of Thessaloniki. It is designed to empower users to take control of their health and well-being through intelligent data management and AI-powered insights.

AIDoc allows users to:

- **Track Health Data:** Log various health metrics such as meals, exercise, symptoms, and medical information.
- **Manage Documents:** Securely upload and store medical documents like lab results, prescriptions, and reports.
- **Gain AI-Powered Insights:** Leverage the power of AI to analyze medical documents, provide personalized daily health tips based on tracked data, and potentially offer preliminary insights (it's crucial to note that this is **not a substitute for professional medical advice**).
- **Visualize Progress:** Visualize health data through interactive charts and summaries to identify trends, patterns, and monitor progress over time.

## How it Works

AIDoc is built using a modern technology stack to provide a robust and intuitive user experience:

- **Frontend:** Developed with **Next.js**, a powerful React framework, for a fast, responsive, and server-rendered user interface.
- **Backend:** Utilizes **Firebase** for secure and scalable data storage (Firestore), user authentication (Authentication), and other backend functionalities.
- **AI Integration:** Integrates various **AI models** via **Genkit** to power intelligent features such as document analysis and personalized health insights.

## Setup and Running the Project

To get AIDoc up and running on your local machine, follow these steps:

1. **Clone the repository:**
2. **Run ```npm install``` to install all dependencies**
3. **Create a ```.env``` file in the root directory where you input all of your API keys.**
4. **Run ```npm run dev``` to run the app.**

**Example ```.env``` file:**
```GOOGLE_API_KEY="YOUR_API_KEY"
NEXT_PUBLIC_FIREBASE_API_KEY="YOUR_FIREBASE_API_KEY"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="NEXT_PUBLIC_FIREBASE_PROJECT_ID"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
NEXT_PUBLIC_FIREBASE_APP_ID="NEXT_PUBLIC_FIREBASE_APP_ID"
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID"```