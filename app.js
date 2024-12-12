const URL = "./";
let model, webcam, isScanning = false;
const trashMapping = {
    faceMask: { type: "ขยะอันตราย", name: "หน้ากากอนามัย", decompressionTime: "450" },
    plasticBag: { type: "ขยะรีไซเคิล", name: "ถุงพลาสติก", decompressionTime: "10-20" },
    snackBag: { type: "ขยะทั่วไป", name: "ห่อขนม", decompressionTime: "20-30" },
    sodaCan: { type: "ขยะรีไซเคิล", name: "กระป๋องน้ำอัดลม", decompressionTime: "80-100" },
    milkCarton: { type: "ขยะเปียก", name: "กล่องนม", decompressionTime: "5" },
    battey: { type: "ขยะอันตราย", name: "ถ่านไฟฉาย", decompressionTime: "100+" },
    plasticBottle: { type: "ขยะรีไซเคิล", name: "ขวดพลาสติก", decompressionTime: "450" },
    _null: null
};

const IMAGE_PATH = "./images/";

let scanningTimeout = null;
let lastDetectedTrash = null;
let scanningStartTime = null;
let countdownInterval = null;
let isAnalyzing = false;

// Start scanning
async function startScan() {
    showScreen("scan-screen");

    // Setup webcam
    model = await tmImage.load(URL + "model.json", URL + "metadata.json");
    webcam = new tmImage.Webcam(window.innerWidth, window.innerHeight, true);
    await webcam.setup();
    await webcam.play();

    const webcamContainer = document.getElementById("webcam-container");
    webcamContainer.innerHTML = "";
    webcamContainer.appendChild(webcam.canvas);
    webcam.canvas.style.position = "fixed";
    webcam.canvas.style.top = "0";
    webcam.canvas.style.left = "0";
    webcam.canvas.style.width = "100%";
    webcam.canvas.style.height = "100%";
    webcam.canvas.style.objectFit = "cover";

    setTimeout(() => {
        window.requestAnimationFrame(loop);
    }, 500);
}

async function loop() {
    webcam.update();
    await predict();
    window.requestAnimationFrame(loop);
}

async function predict() {
    const prediction = await model.predict(webcam.canvas);
    const bestPrediction = prediction.reduce((best, current) =>
        current.probability > best.probability ? current : best
    );
    const trashType = bestPrediction.className;
    const probability = bestPrediction.probability;

    // เปลี่ยนชื่อขยะที่ตรวจพบ
    const detectedTrashName = trashMapping[trashType]?.name || "กำลังสแกน...";
    document.getElementById("scan-text").innerText = detectedTrashName;

    // บอกเปอร์เซ็นต์ความแม่นยำของขยะ
    const confidenceText = `${(probability * 100).toFixed(2)}%`;
    document.getElementById("scan-confidence").innerText = confidenceText;

    // รีเซ็ตหากขยะเปลี่ยน
    if (trashType !== lastDetectedTrash) {
        lastDetectedTrash = trashType;
        scanningStartTime = null;
        return;
    }

    // ตรวจสอบความน่าจะเป็น
    if (trashMapping[trashType] && probability > 0.8) {
        if (!scanningStartTime) {
            scanningStartTime = Date.now();
        }
        const elapsed = Date.now() - scanningStartTime;
        if (elapsed > 1500) {
            analyzeTrash(trashType);
        }
    } else {
        scanningStartTime = null;
    }
}

// Analyze result
function analyzeTrash(trashType) {
    if (webcam) {
        webcam.stop();
    }
    showScreen("analyze-screen");

    if (trashType === "_null") {
        document.getElementById("bin-icon").src = "";
        document.getElementById("result-name").innerText = "ไม่สามารถวิเคราะห์ได้";
        document.getElementById("result-decomposition").innerText = "";
        document.getElementById("result-bin").innerText = "";
    } else {
        const trash = trashMapping[trashType];
        document.getElementById("result-name").innerText = trash.name;
        document.getElementById("result-decomposition").innerText = `ใช้เวลาในการย่อยสลาย ${trash.decompressionTime} ปี`; 


        // ตั้งค่าถังขยะตามประเภท
        let binColor = "";
        let iconPath = "";
        let textColor = "";

        switch (trash.type) {
            case "ขยะทั่วไป":
                binColor = "น้ำเงิน";
                iconPath = `${IMAGE_PATH}general.png`;
                textColor = "royalblue"
                break;
            case "ขยะเปียก":
                binColor = "เขียว";
                iconPath = `${IMAGE_PATH}wet.png`;
                textColor = "seagreen"
                break;
            case "ขยะรีไซเคิล":
                binColor = "เหลือง";
                iconPath = `${IMAGE_PATH}recycle.png`;
                textColor = "yellow"
                break;
            case "ขยะอันตราย":
                binColor = "แดง";
                iconPath = `${IMAGE_PATH}danger.png`;
                textColor = "orangered"
                break;
            default:
                binColor = "ไม่ระบุ";
                iconPath = `${IMAGE_PATH}start_button.png`;
        }
        document.getElementById("bin-icon2").src = iconPath;
        document.getElementById("result-bin").innerText = `ควรทิ้งลงถังประเภท ${trash.type} หรือ สี${binColor}`;
        document.getElementById("result-bin").style.color = textColor;
    }

    startCountdown(20);
}

// Countdown to reset
function startCountdown(seconds) {
    const countdownElement = document.getElementById("countdown");
    clearInterval(countdownInterval);
    countdownElement.innerText = `${seconds}s`;
    countdownInterval = setInterval(() => {
        seconds--;
        countdownElement.innerText = `${seconds}s`;
        if (seconds <= 0) {
            clearInterval(countdownInterval);
            goToStart();
        }
    }, 1000);
}

// Go back to start
function goToStart() {
    showScreen("start-screen");
    clearInterval(countdownInterval); // Clear interval on navigation
    lastDetectedTrash = null;
    resetProgressBar();
}

// Change screen
function showScreen(screenId) {
    document.querySelectorAll(".screen").forEach((screen) => {
        screen.classList.remove("active");
    });
    document.getElementById(screenId).classList.add("active");
}
