
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyAPPZgVrZF9SEaS42xx8RcsnM2i8EpenUQ",
  authDomain: "creadit-loan-5203b.firebaseapp.com",
  databaseURL: "https://creadit-loan-5203b-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "creadit-loan-5203b",
  storageBucket: "creadit-loan-5203b.appspot.com",
  messagingSenderId: "95634892627",
  appId: "1:95634892627:web:1500052cb60f3b7e4823a6",
  measurementId: "G-V60FZSL5V1"
};


const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getDatabase(app);

// For the Realtime Database web SDK, offline persistence is enabled by default.
// The `enablePersistence` function is for Firestore and is not needed here.


// Note: Firebase Storage is not used in this refactor, but can be added back if needed.
// For example:
// import { getStorage } from 'firebase/storage';
// const storage = getStorage(app);

export { auth, db, GoogleAuthProvider };