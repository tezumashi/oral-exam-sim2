// 二等無人航空機操縦士 修了審査 口述審査シミュレーション - アプリロジック
(function () {
  const HISTORY_KEY = "oral-exam-sim-history";

  const screens = {
    start: document.getElementById("screen-start"),
    quiz: document.getElementById("screen-quiz"),
    result: document.getElementById("screen-result"),
    history: document.getElementById("screen-history"),
  };

  const el = {
    sectionChecks: document.getElementById("section-checks"),
    btnStart: document.getElementById("btn-start"),
    btnShowHistory: document.getElementById("btn-show-history"),
    btnHome: document.getElementById("btn-home"),

    progressSection: document.getElementById("progress-section"),
    progressCount: document.getElementById("progress-count"),
    progressBarInner: document.getElementById("progress-bar-inner"),
    questionText: document.getElementById("question-text"),
    answerPrompt: document.getElementById("answer-prompt"),
    answerBox: document.getElementById("answer-box"),
    answerText: document.getElementById("answer-text"),
    gradeButtons: document.getElementById("grade-buttons"),
    btnCorrect: document.getElementById("btn-correct"),
    btnIncorrect: document.getElementById("btn-incorrect"),
    gradedResult: document.getElementById("graded-result"),
    btnReveal: document.getElementById("btn-reveal"),
    btnNext: document.getElementById("btn-next"),

    resultSummary: document.getElementById("result-summary"),
    resultList: document.getElementById("result-list"),
    btnRetryAll: document.getElementById("btn-retry-all"),
    btnRetryWrong: document.getElementById("btn-retry-wrong"),
    btnBackStart: document.getElementById("btn-back-start"),

    historyList: document.getElementById("history-list"),
    btnClearHistory: document.getElementById("btn-clear-history"),
    btnHistoryBack: document.getElementById("btn-history-back"),
  };

  const SECTIONS = [...new Set(QUESTIONS.map((q) => q.section))];

  let queue = [];       // 出題する問題インデックスの配列（QUESTIONSへの参照）
  let currentIndex = 0; // queue内の現在位置
  let phase = "question"; // "question" | "answer" | "graded"
  let results = [];      // {question, answer, correct} の配列

  function showScreen(name) {
    Object.values(screens).forEach((s) => s.classList.add("hidden"));
    screens[name].classList.remove("hidden");
  }

  function buildSectionChecks() {
    el.sectionChecks.innerHTML = "";
    SECTIONS.forEach((sec, i) => {
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = true;
      input.value = sec;
      input.id = `sec-check-${i}`;
      label.appendChild(input);
      label.appendChild(document.createTextNode(sec));
      el.sectionChecks.appendChild(label);
    });
  }

  function getSelectedSections() {
    return Array.from(el.sectionChecks.querySelectorAll("input:checked")).map((i) => i.value);
  }

  function startQuiz(customQueue) {
    if (customQueue) {
      queue = customQueue;
    } else {
      const selected = getSelectedSections();
      let indices = QUESTIONS.map((_, i) => i).filter((i) => selected.includes(QUESTIONS[i].section));
      if (indices.length === 0) indices = QUESTIONS.map((_, i) => i);
      queue = indices;
    }
    currentIndex = 0;
    results = [];
    showScreen("quiz");
    renderQuestion();
  }

  function renderQuestion() {
    phase = "question";
    const qIndex = queue[currentIndex];
    const item = QUESTIONS[qIndex];

    el.progressSection.textContent = item.section;
    el.progressCount.textContent = `${currentIndex + 1} / ${queue.length}`;
    el.progressBarInner.style.width = `${(currentIndex / queue.length) * 100}%`;

    el.questionText.textContent = item.q;
    el.answerText.textContent = item.a;

    el.answerBox.classList.add("hidden");
    el.answerPrompt.classList.remove("hidden");
    el.gradeButtons.classList.add("hidden");
    el.gradedResult.classList.add("hidden");
    el.btnReveal.classList.remove("hidden");
    el.btnNext.classList.add("hidden");
  }

  function revealAnswer() {
    if (phase !== "question") return;
    phase = "answer";
    el.answerBox.classList.remove("hidden");
    el.answerPrompt.classList.add("hidden");
    el.gradeButtons.classList.remove("hidden");
    el.btnReveal.classList.add("hidden");
  }

  function gradeAnswer(isCorrect) {
    if (phase !== "answer") return;
    phase = "graded";
    const qIndex = queue[currentIndex];
    const item = QUESTIONS[qIndex];
    results.push({ question: item.q, answer: item.a, section: item.section, correct: isCorrect });

    el.gradeButtons.classList.add("hidden");
    el.gradedResult.classList.remove("hidden");
    el.gradedResult.classList.toggle("correct", isCorrect);
    el.gradedResult.classList.toggle("incorrect", !isCorrect);
    el.gradedResult.textContent = isCorrect ? "○ 正解として記録しました" : "✕ 不正解として記録しました";

    el.btnNext.classList.remove("hidden");
  }

  function nextQuestion() {
    if (phase !== "graded") return;
    if (currentIndex + 1 >= queue.length) {
      finishQuiz();
    } else {
      currentIndex += 1;
      renderQuestion();
    }
  }

  function finishQuiz() {
    const correctCount = results.filter((r) => r.correct).length;
    const total = results.length;
    saveHistory(correctCount, total);
    showResult();
  }

  function showResult() {
    showScreen("result");
    const correctCount = results.filter((r) => r.correct).length;
    const total = results.length;
    el.resultSummary.textContent = `${total}問中 ${correctCount}問 正解（正答率 ${Math.round((correctCount / total) * 100)}%）`;

    el.resultList.innerHTML = "";
    results.forEach((r) => {
      const div = document.createElement("div");
      div.className = `result-item ${r.correct ? "correct" : "incorrect"}`;
      div.innerHTML = `
        <div class="result-item-head">
          <span>${r.section}</span>
          <span class="mark ${r.correct ? "correct" : "incorrect"}">${r.correct ? "○ 正解" : "✕ 不正解"}</span>
        </div>
        <div class="result-item-q">Q. ${escapeHtml(r.question)}</div>
        <div class="result-item-a">A. ${escapeHtml(r.answer)}</div>
      `;
      el.resultList.appendChild(div);
    });
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function retryWrongOnly() {
    const wrongQuestions = results.filter((r) => !r.correct).map((r) => r.question);
    const wrongIndices = QUESTIONS.map((_, i) => i).filter((i) => wrongQuestions.includes(QUESTIONS[i].q));
    if (wrongIndices.length === 0) {
      alert("間違えた問題はありませんでした。");
      return;
    }
    startQuiz(wrongIndices);
  }

  // ---- 履歴 ----
  function loadHistory() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveHistory(correctCount, total) {
    const history = loadHistory();
    history.unshift({
      date: new Date().toISOString(),
      correct: correctCount,
      total: total,
    });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
  }

  function renderHistory() {
    const history = loadHistory();
    el.historyList.innerHTML = "";
    if (history.length === 0) {
      el.historyList.innerHTML = `<div class="history-empty">まだ学習履歴がありません。</div>`;
      return;
    }
    history.forEach((h) => {
      const d = new Date(h.date);
      const dateStr = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      const rate = Math.round((h.correct / h.total) * 100);
      const div = document.createElement("div");
      div.className = "history-item";
      div.innerHTML = `
        <span class="history-date">${dateStr}</span>
        <span class="history-score">${h.correct} / ${h.total}（${rate}%）</span>
      `;
      el.historyList.appendChild(div);
    });
  }

  function goHome() {
    const inQuiz = !screens.quiz.classList.contains("hidden");
    if (inQuiz && (results.length < queue.length)) {
      if (!confirm("試験を中断してトップ画面に戻りますか？現在の進捗は記録されません。")) return;
    }
    showScreen("start");
  }

  // ---- イベント ----
  el.btnHome.addEventListener("click", goHome);
  el.btnStart.addEventListener("click", () => startQuiz());
  el.btnShowHistory.addEventListener("click", () => {
    renderHistory();
    showScreen("history");
  });
  el.btnHistoryBack.addEventListener("click", () => showScreen("start"));
  el.btnClearHistory.addEventListener("click", () => {
    if (confirm("学習履歴をすべて削除しますか？")) {
      localStorage.removeItem(HISTORY_KEY);
      renderHistory();
    }
  });

  el.btnReveal.addEventListener("click", revealAnswer);
  el.btnCorrect.addEventListener("click", () => gradeAnswer(true));
  el.btnIncorrect.addEventListener("click", () => gradeAnswer(false));
  el.btnNext.addEventListener("click", nextQuestion);

  el.btnRetryAll.addEventListener("click", () => startQuiz());
  el.btnRetryWrong.addEventListener("click", retryWrongOnly);
  el.btnBackStart.addEventListener("click", () => showScreen("start"));

  document.addEventListener("keydown", (e) => {
    if (!screens.quiz.classList.contains("hidden")) {
      if (e.code === "Space") {
        e.preventDefault();
        if (phase === "question") revealAnswer();
        else if (phase === "graded") nextQuestion();
      } else if (e.code === "Enter" || e.code === "ArrowRight") {
        if (phase === "answer") {
          e.preventDefault();
          gradeAnswer(true);
        }
      } else if (e.code === "Backspace" || e.code === "ArrowLeft") {
        if (phase === "answer") {
          e.preventDefault();
          gradeAnswer(false);
        }
      }
    }
  });

  // ---- 初期化 ----
  buildSectionChecks();
  showScreen("start");
})();
