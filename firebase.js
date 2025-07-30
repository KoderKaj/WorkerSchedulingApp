import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, collection, getDoc, getDocs, setDoc, updateDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
    apiKey: "AIzaSyBf2vZcsDfEfa3CARtXhHR-dQaTEzQwiYg",
    authDomain: "workerschedulingapp.firebaseapp.com",
    projectId: "workerschedulingapp",
    storageBucket: "workerschedulingapp.firebasestorage.app",
    messagingSenderId: "464876880165",
    appId: "1:464876880165:web:70cf2891f2a92f1d1b5acc",
    measurementId: "G-W11VXWE91Q"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db, signInAnonymously, onAuthStateChanged, doc, collection, getDoc, getDocs, setDoc, updateDoc, writeBatch, deleteDoc };
