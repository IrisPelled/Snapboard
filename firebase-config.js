// Firebase configuration - YOUR ACTUAL VALUES
const firebaseConfig = {
    apiKey: "AIzaSyAafPViUl1EpLIMWAKkEWcBmSNOyuhTYN0",
    authDomain: "smartpadlet-9eab9.firebaseapp.com",
    projectId: "smartpadlet-9eab9",
    storageBucket: "smartpadlet-9eab9.firebasestorage.app",
    messagingSenderId: "198500791899",
    appId: "1:198500791899:web:21fb2d79a34a03c32af17e"
};

// Initialize Firebase (using global Firebase SDK)
if (typeof firebase !== 'undefined') {
    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    
    // Initialize Firestore
    window.db = firebase.firestore();
    
    console.log('Firebase initialized successfully');
} else {
    console.error('Firebase SDK not loaded');
} 