import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Go to https://console.firebase.google.com > Project Settings > Web App
const firebaseConfig = {
  apiKey: "AIzaSyAtxDvYO8DH8ufQUWYIvRpXwDrB0p60-vc",
  authDomain: "my-online-games-77b2b.firebaseapp.com",
  databaseURL: "https://my-online-games-77b2b-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "my-online-games-77b2b",
  storageBucket: "my-online-games-77b2b.firebasestorage.app",
  messagingSenderId: "770343057846",
  appId: "1:770343057846:web:224fd3f35c044508592917",
  measurementId: "G-L78J557JK3"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
