import { db } from "./firebase.js";

import {
getFirestore,
collection,
addDoc,
getDocs,
getDoc,
deleteDoc,
doc,
setDoc,
query,
orderBy,
updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ================= CLOUDINARY =================

const cloudName = "dtbxzd7ux";
const uploadPreset = "tour_receipts";


// ================= STATE =================

let bookingData = null;
let bookingID = "";
let paymentChoice = "Advance";
let peopleNamesArray = [];
let selectedLat = null;
let selectedLng = null;


// ================= UNIQUE REFERENCE =================

function generateReference() {
const year = new Date().getFullYear();
const rand = Math.floor(100000 + Math.random() * 900000);
return `DDT-${year}-${rand}`;
}


// ================= LOAD TOURS =================

async function loadTours() {

const select = document.getElementById("tourSelect");
if (!select) return;

const snapshot = await getDocs(collection(db, "tour"));

select.innerHTML = "<option value=''>Select Tour</option>";

snapshot.forEach((docSnap) => {
const data = docSnap.data();

const opt = document.createElement("option");
opt.value = docSnap.id;
opt.textContent = data.title || "Untitled";
opt.dataset.price = data.price || 0;

select.appendChild(opt);
});
}

loadTours();

// ================= PRICE DISPLAY =================

const tourSelect = document.getElementById("tourSelect");

tourSelect?.addEventListener("change", updatePrice);

function updatePrice(){

const price = Number(
tourSelect.options[tourSelect.selectedIndex]?.dataset.price || 0
);

let payNow = paymentChoice === "Advance"
? price / 2
: price;

document.getElementById("newAmount").innerHTML = `
<div class="space-y-2">

<div class="text-4xl font-black">
$${payNow.toFixed(2)}
</div>

<div class="text-gray-500">
Tour Price: $${price.toFixed(2)}
</div>

<div class="text-green-600 font-semibold">
${paymentChoice==="Advance"
?"50% Advance Payment"
:"Full Payment"}
</div>

</div>
`;

}


// ================= PEOPLE INPUT =================

document.getElementById("peopleCount")?.addEventListener("input", function () {
const container = document.getElementById("peopleNames");
const count = Number(this.value || 0);

peopleNamesArray = [];
container.innerHTML = "";

for (let i = 0; i < count; i++) {
const input = document.createElement("input");
input.placeholder = `Passenger ${i + 1} Name`;
input.className = "w-full border p-3 rounded-xl mt-2";

input.oninput = () => {
peopleNamesArray[i] = input.value;
};

container.appendChild(input);
}
});


// ================= BOOKING CREATE =================

window.createNewBooking = async function () {

const name = document.getElementById("newName").value;
const email = document.getElementById("newEmail").value;
const phone = document.getElementById("phone")?.value || "";

const tourSelect = document.getElementById("tourSelect");
const tour = tourSelect.options[tourSelect.selectedIndex]?.text;

const total = Number(tourSelect.options[tourSelect.selectedIndex]?.dataset.price || 0);

const travelDate = document.getElementById("travelDate").value;
const pickupTime = document.getElementById("pickupTime").value;
const pickupType = document.getElementById("pickupType").value;
const pickupLocation = document.getElementById("pickupLocation").value;

if (!name || !email || !tour) {
alert("Fill required fields");
return;
}

// temporary store (NO reference yet)
bookingData = {
name,
email,
phone,
tour,
total,
travelDate,
pickupTime,
pickupType,
pickupLocation,
peopleNames: peopleNamesArray,
paid: 0,
status: "Pending Payment"
};

document.getElementById("startScreen").classList.add("hidden");
document.getElementById("newBookingBox").classList.add("hidden");
document.getElementById("bookingBox").classList.remove("hidden");

document.getElementById("name").innerText = name;
document.getElementById("tour").innerText = tour;
document.getElementById("amount").innerText = "$" + total;
updatePrice();
};


// ================= PAYMENT METHOD =================

let selectedMethod = "";

window.selectMethod = function(method){

selectedMethod = method;

// Reset cards
document.querySelectorAll(".paymentCard").forEach(card=>{

card.classList.remove(
"border-green-500",
"border-blue-500",
"bg-green-50",
"bg-blue-50"
);

});

// Hide popup
document.getElementById("bankPopup")
.classList.add("hidden");

if(method==="Wise"){

document.getElementById("wiseBtn")
.classList.add(
"border-green-500",
"bg-green-50"
);

// Replace with YOUR Wise payment link
window.open(
"https://wise.com/pay/me/YOUR-LINK",
"_blank"
);

}

if(method==="Bank"){

document.getElementById("bankBtn")
.classList.add(
"border-blue-500",
"bg-blue-50"
);

document.getElementById("bankPopup")
.classList.remove("hidden");

}

};

// ================= FIND BOOKING =================

window.findBooking = async function () {

const id = document.getElementById("bookingID").value.trim();
if (!id) return alert("Enter ID");

const snap = await getDoc(doc(db, "bookings", id));

if (!snap.exists()) return alert("Not found");

bookingData = snap.data();
bookingID = id;

document.getElementById("name").innerText = bookingData.name;
document.getElementById("tour").innerText = bookingData.tour;

const remain = (bookingData.total || 0) - (bookingData.paid || 0);
document.getElementById("amount").innerText = "$" + remain;

document.getElementById("bookingBox").classList.remove("hidden");
};


// ================= PAYMENT TYPE =================

window.selectPayment = function(type){

paymentChoice = type;

document.getElementById("paymentType").innerText =
type==="Advance"
?"50% Advance"
:"Full Payment";

const total = bookingData.total || 0;

const amount =
type==="Advance"
? total/2
: total;

document.getElementById("amount").innerHTML=
"$"+amount.toFixed(2);

updatePrice();

};


// ================= CLOUDINARY UPLOAD =================

async function uploadReceipt(file) {
const form = new FormData();
form.append("file", file);
form.append("upload_preset", uploadPreset);

const res = await fetch(
`https://api.cloudinary.com/v1_1/${cloudName}/upload`,
{ method: "POST", body: form }
);

const data = await res.json();
return data.secure_url;
}


// ================= FINAL PAYMENT + SAVE =================

window.submitPayment = async function () {

if (!bookingData) return alert("No booking");

const file = document.getElementById("receipt").files[0];
if (!file) return alert("Upload receipt");

const reference = generateReference(); // 🔥 UNIQUE ID HERE

const receiptURL = await uploadReceipt(file);

const amount =
paymentChoice === "Advance"
? bookingData.total / 2
: bookingData.total;


// ================= SAVE BOOKING =================

await setDoc(doc(db, "bookings", reference), {
...bookingData,
bookingID: reference,
paid: amount,
status: "Booked",
paymentStatus: "Pending",
createdAt: serverTimestamp(),
latitude: selectedLat,
longitude: selectedLng
});


// ================= SAVE PAYMENT =================

await setDoc(doc(db, "payments", reference), {
bookingID: reference,
name: bookingData.name,
email: bookingData.email,
phone: bookingData.phone,
tour: bookingData.tour,
amount,
paymentType: paymentChoice,
method: "Uploaded Receipt",
receiptURL,
status: "Pending",
createdAt: serverTimestamp()
});


// ================= SUCCESS UI =================

document.body.innerHTML = `
<div style="text-align:center;padding:50px;font-family:sans-serif;">
<h1>✅ Payment Successful</h1>
<h2>Your Reference Number</h2>
<h1 style="font-size:30px;color:green;">${reference}</h1>

<p>Send this reference number on WhatsApp for faster confirmation.</p>

<a href="https://wa.me/?text=My%20Booking%20Reference%20is%20${reference}"
target="_blank"
style="display:inline-block;margin-top:20px;padding:10px 20px;background:black;color:white;border-radius:10px;">
Send on WhatsApp
</a>

<br><br>

<button onclick="navigator.clipboard.writeText('${reference}')">
Copy Reference
</button>
</div>
`;
};

  
// ================= MAP VALUES (from your script) =================
// these are set from your map click script
// selectedLat, selectedLng already declared in part 1


// ================= UPDATE BOOKING STATUS AFTER PAYMENT =================

async function updateBooking(reference) {
await setDoc(doc(db, "bookings", reference), {
status: "Confirmed",
paymentStatus: "Paid",
updatedAt: serverTimestamp()
}, { merge: true });
}


// ================= SAFETY: PREVENT DOUBLE CLICK =================

let isProcessing = false;


// ================= FINAL PAYMENT HANDLER (REPLACEMENT SAFE) =================

window.submitPayment = async function () {

if (isProcessing) return;
isProcessing = true;

try {

if (!bookingData) {
alert("No booking found");
isProcessing = false;
return;
}

const file = document.getElementById("receipt").files[0];
if (!file) {
alert("Upload receipt first");
isProcessing = false;
return;
}


// ================= GENERATE UNIQUE REFERENCE =================

let reference = "";
let exists = true;

// ensure UNIQUE reference
while (exists) {

reference = generateReference();

const check = await getDoc(doc(db, "bookings", reference));
exists = check.exists();
}


// ================= UPLOAD RECEIPT =================

const receiptURL = await uploadReceipt(file);


// ================= CALCULATE AMOUNT =================

const amount =
paymentChoice === "Advance"
? bookingData.total / 2
: bookingData.total;





// ================= SAVE PAYMENT =================

await setDoc(doc(db,"payments",reference),{

bookingReference: reference,

name: bookingData.name,
email: bookingData.email,
phone: bookingData.phone,

tour: bookingData.tour,

travelDate: bookingData.travelDate,
pickupTime: bookingData.pickupTime,
pickupType: bookingData.pickupType,

pickupLocation: bookingData.pickupLocation,

latitude: selectedLat,
longitude: selectedLng,

peopleNames: bookingData.peopleNames || [],

total: bookingData.total,
amount: amount,

paymentType: paymentChoice,
paymentMethod: selectedMethod,

receiptURL: receiptURL,

status: "Pending Approval",

createdAt: new Date()

});





// ================= SUCCESS SCREEN =================

document.body.innerHTML = `

<div style="font-family:sans-serif;text-align:center;padding:40px;">

<h1>🎉 Booking Confirmed</h1>

<p>Your Reference Number:</p>

<h2 style="color:green;font-size:28px;">
${reference}
</h2>

<p style="margin-top:20px;">
⚠️ Please send this reference number to our WhatsApp for faster confirmation.
</p>


<a 
href="https://wa.me/?text=Hello%20D%26D%20Tours%2C%20my%20booking%20reference%20is%20${reference}"
target="_blank"
style="display:inline-block;margin-top:20px;padding:12px 20px;background:black;color:white;border-radius:10px;"
>
📲 Send on WhatsApp
</a>


<br><br>

<button onclick="navigator.clipboard.writeText('${reference}')"
style="padding:10px 15px;border:1px solid black;border-radius:8px;">
Copy Reference
</button>

</div>

`;

} catch (err) {
console.log(err);
alert("Payment failed");
}

isProcessing = false;
};


// ================= PICKUP LOCATION FIX (OPTIONAL SAFETY) =================

window.setPickupLocation = function(lat, lng) {
selectedLat = lat;
selectedLng = lng;
};


// ================= DONE MESSAGE =================

console.log("D&D Tours system loaded successfully 🚀");