// OSPF Assessment Database & Questions array
const testQuestions = [
    {
        q: "Which routing algorithm is executed by the OSPF protocol layer?",
        options: ["Distance Vector Algorithm", "Bellman-Ford Metric Calculation", "Dijkstra Shortest Path First", "Path Vector Routing Method"],
        correct: 2
    },
    {
        q: "What is the default Administrative Distance (AD) value assigned to OSPF on Cisco devices?",
        options: ["90", "110", "120", "115"],
        correct: 1
    },
    {
        q: "Which IPv4 address belongs strictly to OSPF Designated Routers (DR) and Backup Designated Routers (BDR)?",
        options: ["224.0.0.5", "224.0.0.6", "224.0.0.9", "224.0.0.10"],
        correct: 1
    },
    {
        q: "Which OSPF Area is designated as the mandatory Backbone Area?",
        options: ["Area 1", "Area 10", "Area 0", "Area 100"],
        correct: 2
    },
    {
        q: "What is the default Hello packet transmission interval for OSPF on multiaccess broadcast Ethernet?",
        options: ["5 Seconds", "10 Seconds", "30 Seconds", "40 Seconds"],
        correct: 1
    },
    {
        q: "Which state represents that full topology synchronization has occurred between OSPF neighbors?",
        options: ["2-Way State", "Init State", "Exchange State", "Full State"],
        correct: 3
    },
    {
        q: "Which LSA (Type) is constructed by an ABR to communicate external area summaries to other boundaries?",
        options: ["Type 1 (Router LSA)", "Type 2 (Network LSA)", "Type 3 (Summary LSA)", "Type 5 (AS External LSA)"],
        correct: 2
    },
    {
        q: "What protocol identification number does the IP header use to specify OSPF routing payload?",
        options: ["51", "88", "89", "47"],
        correct: 2
    },
    {
        q: "On a standard broadcast medium, how is the DR initially determined in OSPF?",
        options: ["Lowest Interface IP address", "Highest Router Priority value, followed by highest Router ID", "Lowest Router ID value", "Loopback address interfaces first"],
        correct: 1
    },
    {
        q: "Which Cisco IOS operational command yields precise parameters relating to neighboring OSPF routers?",
        options: ["show ip route ospf", "show ip ospf database", "show ip ospf neighbor", "show ip protocols summary"],
        correct: 2
    }
];

// App Variables
let activeIndex = 0;
let userChoices = Array(testQuestions.length).fill(null);
let remainingSeconds = 10 * 60; // 10 Minutes Total
let activeTimer = null;
let currentCandidate = { name: "", email: "", roll: "" };

// REPLACE THIS LINK WITH YOUR DEPLOYED CLOUDFLARE WORKER LINK
const ASSESSMENT_WORKER_URL = "https://devs-ospf-exam-api.chatsree9.workers.dev";

// Form and Interface controls
const loginForm = document.getElementById("login-form");
const loginScreen = document.getElementById("login-screen");
const examScreen = document.getElementById("exam-screen");
const resultScreen = document.getElementById("result-screen");

// Login submit routing
loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    currentCandidate.name = document.getElementById("candidate-name").value.trim();
    currentCandidate.email = document.getElementById("candidate-email").value.trim();
    currentCandidate.roll = document.getElementById("candidate-roll").value.trim();

    loginScreen.style.display = "none";
    examScreen.style.display = "grid";

    buildNavigationPanel();
    loadQuestionCard(0);
    initializeExamClock();
});

// Build Question Grid Buttons
function buildNavigationPanel() {
    const grid = document.getElementById("navigator-grid");
    grid.innerHTML = "";
    testQuestions.forEach((_, index) => {
        const btn = document.createElement("button");
        btn.innerText = index + 1;
        btn.className = "nav-btn";
        btn.id = `nav-cell-${index}`;
        btn.addEventListener("click", () => loadQuestionCard(index));
        grid.appendChild(btn);
    });
}

// Render selected question
function loadQuestionCard(index) {
    activeIndex = index;
    const currentQ = testQuestions[index];

    // Manage Prev/Next state triggers
    document.getElementById("btn-prev").disabled = (index === 0);
    document.getElementById("btn-next").innerText = (index === testQuestions.length - 1) ? "Finish" : "Next";

    document.getElementById("question-number-badge").innerText = `Question ${index + 1} of ${testQuestions.length}`;
    document.getElementById("question-text").innerText = currentQ.q;

    // Render Answers List
    const optionsContainer = document.getElementById("options-container");
    optionsContainer.innerHTML = "";

    currentQ.options.forEach((option, idx) => {
        const wrapper = document.createElement("label");
        wrapper.className = `option-node ${userChoices[index] === idx ? "selected" : ""}`;
        wrapper.innerHTML = `
            <input type="radio" name="options-group" ${userChoices[index] === idx ? "checked" : ""}>
            <span>${option}</span>
        `;
        wrapper.addEventListener("click", () => recordSelectedOption(idx));
        optionsContainer.appendChild(wrapper);
    });

    updateNavigationGrid();
}

// Record selected choice and highlight
function recordSelectedOption(idx) {
    userChoices[activeIndex] = idx;
    const nodes = document.querySelectorAll(".option-node");
    nodes.forEach((node, k) => {
        if (k === idx) {
            node.classList.add("selected");
        } else {
            node.classList.remove("selected");
        }
    });
    updateNavigationGrid();
}

// Update Navigator buttons styling
function updateNavigationGrid() {
    testQuestions.forEach((_, idx) => {
        const cell = document.getElementById(`nav-cell-${idx}`);
        if (cell) {
            cell.className = "nav-btn";
            if (userChoices[idx] !== null) cell.classList.add("answered");
            if (idx === activeIndex) cell.classList.add("active");
        }
    });
}

// Next / Previous Click Logic
document.getElementById("btn-prev").addEventListener("click", () => {
    if (activeIndex > 0) loadQuestionCard(activeIndex - 1);
});

document.getElementById("btn-next").addEventListener("click", () => {
    if (activeIndex < testQuestions.length - 1) {
        loadQuestionCard(activeIndex + 1);
    } else {
        triggerExamSubmission();
    }
});

// Final submission trigger
document.getElementById("btn-submit-exam").addEventListener("click", triggerExamSubmission);

function triggerExamSubmission() {
    if (confirm("Are you sure you want to finalize your submission?")) {
        processExamSubmission();
    }
}

// Running clock timer
function initializeExamClock() {
    const display = document.getElementById("timer-display");
    activeTimer = setInterval(() => {
        remainingSeconds--;
        let min = Math.floor(remainingSeconds / 60);
        let sec = remainingSeconds % 60;
        display.innerText = `${min < 10 ? '0' + min : min}:${sec < 10 ? '0' + sec : sec}`;

        if (remainingSeconds <= 0) {
            clearInterval(activeTimer);
            alert("Examination time has elapsed. Your responses are being consolidated.");
            processExamSubmission();
        }
    }, 1000);
}

// Calculate score and post values to Cloudflare
async function processExamSubmission() {
    clearInterval(activeTimer);
    examScreen.style.display = "none";

    let rightAnswers = 0;
    testQuestions.forEach((item, index) => {
        if (userChoices[index] === item.correct) rightAnswers++;
    });

    const percent = Math.round((rightAnswers / testQuestions.length) * 100);
    const passed = percent >= 70;

    // Render result page
    document.getElementById("res-name").innerText = currentCandidate.name;
    document.getElementById("res-roll").innerText = currentCandidate.roll;
    document.getElementById("res-score").innerText = `${rightAnswers} / ${testQuestions.length} Correct`;
    document.getElementById("res-percent").innerText = `${percent}%`;

    const title = document.getElementById("result-title");
    const sub = document.getElementById("result-subtitle");
    const icon = document.getElementById("status-icon");

    if (passed) {
        title.innerText = "Examination Cleared!";
        sub.innerText = "You met the assessment threshold and earned your certification.";
        icon.innerText = "🏆";
        document.getElementById("btn-cert").style.display = "inline-flex";

        // Map certificate details
        document.getElementById("cert-candidate-name").innerText = currentCandidate.name;
        document.getElementById("cert-roll-number").innerText = currentCandidate.roll;
        document.getElementById("cert-percentage").innerText = `${percent}%`;
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById("cert-date").innerText = new Date().toLocaleDateString("en-US", options);
    } else {
        title.innerText = "Exam Incomplete";
        sub.innerText = "You fell short of the passing threshold (70%). Please review the topics and try again.";
        icon.innerText = "❌";
        document.getElementById("btn-cert").style.display = "none";
    }

    resultScreen.style.display = "block";

    // Format Cloudflare data object
    const postPayload = {
        name: currentCandidate.name,
        email: currentCandidate.email,
        roll_number: currentCandidate.roll,
        score: rightAnswers,
        total_questions: testQuestions.length,
        percentage: percent,
        passed: passed
    };

    try {
        const response = await fetch(ASSESSMENT_WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(postPayload)
        });

        if (!response.ok) console.warn("Payload verification on cloud server failed.");
    } catch (err) {
        console.error("Database connection fault:", err);
    }
}

// Download certificate (opens native system PDF printer window)
document.getElementById("btn-cert").addEventListener("click", () => {
    window.print();
});
