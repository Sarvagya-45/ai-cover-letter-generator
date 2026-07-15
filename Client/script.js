/* =========================
   DOM ELEMENTS
========================= */

const coverForm = document.getElementById("coverForm");

const skillsInput = document.getElementById("skills");

const charCount = document.getElementById("charCount");

const themeToggle = document.getElementById("themeToggle");

const letterOutput = document.getElementById("letterOutput");

const copyBtn = document.getElementById("copyBtn");

const historyList = document.getElementById("historyList");

const toast = document.getElementById("toast");

const loadingCard = document.getElementById("loadingCard");

const generateBtn = document.getElementById("generateBtn");

/* =========================
   CHARACTER COUNTER
========================= */

skillsInput.addEventListener("input", () => {
  charCount.textContent = `${skillsInput.value.length} Characters`;
});

/* =========================
   THEME TOGGLE
========================= */

const savedTheme = localStorage.getItem("theme");

if (savedTheme === "light") {
  document.body.classList.add("light");

  themeToggle.textContent = "☀️";
}

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("light");

  const isLight = document.body.classList.contains("light");

  themeToggle.textContent = isLight ? "☀️" : "🌙";

  localStorage.setItem("theme", isLight ? "light" : "dark");
});

/* =========================
   TOAST FUNCTION
========================= */

function showToast(message) {
  toast.textContent = message;

  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

/* =========================
   COPY TO CLIPBOARD
========================= */

copyBtn.addEventListener("click", async () => {
  const text = letterOutput.innerText;

  if (!text || text.includes("will appear here")) {
    showToast("Generate a letter first");
    return;
  }

  try {
    await navigator.clipboard.writeText(text);

    showToast("Copied Successfully");
  } catch (error) {
    showToast("Copy Failed");

    console.error(error);
  }
});

/* =========================
   HISTORY STORAGE
========================= */

function saveHistory(company, role) {
  let history = JSON.parse(localStorage.getItem("coverHistory")) || [];

  history.unshift({
    company,
    role,
    date: new Date().toLocaleString(),
  });

  history = history.slice(0, 5);

  localStorage.setItem("coverHistory", JSON.stringify(history));

  renderHistory();
}

/* =========================
   HISTORY RENDER
========================= */

function renderHistory() {
  const history = JSON.parse(localStorage.getItem("coverHistory")) || [];

  if (history.length === 0) {
    historyList.innerHTML = `
        <p class="empty-history">
        No cover letters generated yet.
        </p>
        `;

    return;
  }

  historyList.innerHTML = history
    .map(
      (item) => `
        <div class="history-item">

            <strong>
                ${item.company}
            </strong>

            <br>

            <span>
                ${item.role}
            </span>

            <br>

            <small>
                ${item.date}
            </small>

        </div>
    `,
    )
    .join("");
}

renderHistory();

/* =========================
   LOADING STATE
========================= */

function showLoading() {
  loadingCard.classList.remove("hidden");

  generateBtn.disabled = true;

  generateBtn.textContent = "Generating...";
}

function hideLoading() {
  loadingCard.classList.add("hidden");

  generateBtn.disabled = false;

  generateBtn.textContent = "✨ Generate Cover Letter";
}

/* =========================
   RESUME TEXT STORAGE
========================= */

let resumeText = "";

/* =========================
   PDF UPLOAD PARSER
========================= */

const resumeInput = document.getElementById("resume");

resumeInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];

  if (!file) {
    return;
  }

  try {
    const arrayBuffer = await file.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({
      data: arrayBuffer,
    }).promise;

    let extractedText = "";

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);

      const content = await page.getTextContent();

      const pageText = content.items.map((item) => item.str).join(" ");

      extractedText += pageText + "\n";
    }

    resumeText = extractedText;

    showToast("Resume Uploaded");
  } catch (error) {
    console.error(error);

    showToast("PDF Read Failed");
  }
});

/* =========================
   FORM SUBMIT
========================= */

coverForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = document.getElementById("name").value.trim();

  const role = document.getElementById("role").value.trim();

  const company = document.getElementById("company").value.trim();

  const skills = document.getElementById("skills").value.trim();

  if (!name || !role || !company || !skills) {
    showToast("Please fill all fields");

    return;
  }

  showLoading();

  try {
    const response = await fetch(
      "https://ai-cover-letter-generator-3hpc.onrender.com/generate",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          name,
          role,
          company,
          skills,
          resumeText: resumeText || "",
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Server Error");
    }

    if (!data || !data.letter) {
      throw new Error("No letter received");
    }

    letterOutput.innerHTML = marked.parse(data.letter);

    saveHistory(company, role);

    showToast("Letter Generated");
  } catch (error) {
    console.error("Frontend Error:", error);

    letterOutput.innerHTML = `
            <div class="error-box">
                <p>
                    ${error.message}
                </p>
            </div>
        `;

    showToast(error.message || "AI service busy. Please try again.");
  } finally {
    hideLoading();
  }
});

/* =========================
   DOWNLOAD TXT
========================= */

const downloadTxtBtn = document.getElementById("downloadTxtBtn");

downloadTxtBtn.addEventListener("click", () => {
  const text = letterOutput.innerText;

  if (!text || text.includes("will appear here")) {
    showToast("Nothing to download");
    return;
  }

  const blob = new Blob([text], {
    type: "text/plain",
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;

  link.download = "cover-letter.txt";

  link.click();

  URL.revokeObjectURL(url);
});

/* =========================
   DOWNLOAD PDF
========================= */

const downloadPdfBtn = document.getElementById("downloadPdfBtn");

downloadPdfBtn.addEventListener("click", () => {
  const text = letterOutput.innerText;

  if (!text || text.includes("will appear here")) {
    showToast("Nothing to download");
    return;
  }

  const printWindow = window.open("", "_blank");

  printWindow.document.write(`
            <html>
            <head>
                <title>
                    Cover Letter
                </title>
            </head>
            <body style="
                font-family:Arial;
                padding:40px;
                line-height:1.7;
            ">
                <pre style="
                    white-space:pre-wrap;
                    font-size:16px;
                ">
${text}
                </pre>
            </body>
            </html>
        `);

  printWindow.document.close();

  printWindow.print();
});

/* CLEAR HISTORY */

clearHistoryBtn.addEventListener("click", () => {
  if (confirm("Are you sure you want to clear all history?")) {
    localStorage.removeItem("coverHistory");

    renderHistory();

    showToast("History Cleared");
  }
});
