import {initializeApp} from 
"https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
getFirestore
} from 
"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


const firebaseConfig={

apiKey: "AIzaSyC_2vLQDidqZ1VHFr77TnNgktRgWbkMKBY",
authDomain: "voyo-lanka.firebaseapp.com",
projectId: "voyo-lanka"

};


const app=initializeApp(firebaseConfig);


export const db=getFirestore(app);