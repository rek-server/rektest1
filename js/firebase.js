import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAktfBlFk3QV9jd_oq1BGQDYQIGrszUdEw",
  authDomain: "rek-server-85c3e.firebaseapp.com",
  databaseURL: "https://rek-server-85c3e-default-rtdb.firebaseio.com",
  projectId: "rek-server-85c3e",
  storageBucket: "rek-server-85c3e.firebasestorage.app",
  messagingSenderId: "204981513843",
  appId: "1:204981513843:web:e51d0ff3752d4b1a39c406",
  measurementId: "G-8PZZZVW1DG"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getDatabase(app);
