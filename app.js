(() => {
  const KEY = "english-master-v2";
  const OLD_KEY = "english-master-v1";
  const CHOICES = 4;
  const $ = (id) => document.getElementById(id);

  // 保存データ: level(レベル), mode(出題種別), pos/firstTry("レベル|種別"ごとの進行位置/初回正解数),
  // wrong(間違えた単語のen配列)
  const fresh = () => ({ level: "all", mode: "all", pos: {}, firstTry: {}, wrong: [] });
  let state = load();
  let deck = [];
  let locked = false;
  let missed = false; // 現在の問題で既に間違えたか
  let queue = [];     // 復習モードの出題キュー（先頭が現在の問題）
  let reviewTotal = 0; // 復習セッション開始時の語数

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return { ...fresh(), ...JSON.parse(raw) };
      // 旧バージョンからは復習リストだけ引き継ぐ（単語の並びが変わったため進行位置は引き継がない）
      const old = JSON.parse(localStorage.getItem(OLD_KEY) || "null");
      if (old && Array.isArray(old.wrong)) {
        return { ...fresh(), wrong: old.wrong.filter((en) => WORDS.some((w) => w.en === en)) };
      }
    } catch {}
    return fresh();
  }
  // 進行位置・一発正解数を保存するキー
  const slot = () => `${state.level}|${state.mode}`;
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  }

  function buildDeck() {
    return WORDS.filter((w) =>
      (state.level === "all" || String(w.lv) === String(state.level)) &&
      (state.mode === "all" || w.type === state.mode));
  }

  function shuffle(a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // 間違えた単語だけでキューを作り直す（毎回シャッフル）
  function startReview() {
    queue = shuffle(WORDS.filter((w) => state.wrong.includes(w.en)));
    reviewTotal = queue.length;
  }

  function buildLevels() {
    const box = $("levels");
    const items = [{ id: "all", label: "全て", name: "すべてのレベル" }].concat(LEVELS);
    items.forEach((lv) => {
      const b = document.createElement("button");
      b.className = "chip";
      b.dataset.level = lv.id;
      b.innerHTML = `<small>TOEIC</small>${lv.label}`;
      b.title = `${lv.name}（${lv.id === "all" ? WORDS.length : WORDS.filter((w) => w.lv === lv.id).length}語）`;
      b.addEventListener("click", () => setLevel(lv.id));
      box.appendChild(b);
    });
  }

  function updateTabs() {
    $("levels").hidden = state.mode === "review";
    document.querySelectorAll(".chip").forEach((c) =>
      c.classList.toggle("active", c.dataset.level === String(state.level)));
    document.querySelectorAll(".tab").forEach((t) => {
      t.classList.toggle("active", t.dataset.mode === state.mode);
      if (t.dataset.mode === "review") {
        t.textContent = state.wrong.length ? `復習 (${state.wrong.length})` : "復習";
      }
    });
  }

  function render() {
    updateTabs();
    if (state.mode === "review") return renderReview();
    deck = buildDeck();
    const i = state.pos[slot()] || 0;
    const hits = state.firstTry[slot()] || 0;
    $("bar").style.width = deck.length ? (Math.min(i, deck.length) / deck.length) * 100 + "%" : "0%";
    $("pos").textContent = `${Math.min(i + 1, deck.length)} / ${deck.length}`;
    $("score").textContent = `一発正解 ${hits}`;

    if (!deck.length || i >= deck.length) return showDone();
    $("quiz").hidden = false;
    $("done").hidden = true;
    showQuestion(deck[i]);
  }

  function renderReview() {
    const cleared = reviewTotal - queue.length;
    $("bar").style.width = reviewTotal ? (cleared / reviewTotal) * 100 + "%" : "0%";
    $("pos").textContent = `残り ${queue.length} 語`;
    $("score").textContent = `克服 ${cleared} / ${reviewTotal}`;
    if (!queue.length) return showDone();
    $("quiz").hidden = false;
    $("done").hidden = true;
    showQuestion(queue[0]);
  }

  function showQuestion(w) {
    locked = false;
    missed = false;
    const lv = LEVELS.find((l) => l.id === w.lv);
    $("badge").textContent = `${w.type === "word" ? "英単語" : "熟語"}・TOEIC ${lv.label}`;
    $("question").textContent = w.en;
    $("example").textContent = "";
    // 同じ種類から優先してダミー選択肢を選ぶ。同じ意味の語や、類義語（どちらも正解になりうる語）は除外する。
    const similar = new Set(SIMILAR.filter((g) => g.includes(w.en)).flat());
    const pool = shuffle(WORDS.filter((x) => x.en !== w.en && x.ja !== w.ja && !similar.has(x.en)));
    const same = pool.filter((x) => x.type === w.type);
    const dummies = same.concat(pool.filter((x) => x.type !== w.type)).slice(0, CHOICES - 1);
    const list = $("choices");
    list.innerHTML = "";
    shuffle([w, ...dummies]).forEach((opt) => {
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.className = "choice";
      b.textContent = opt.ja;
      b.addEventListener("click", () => answer(b, opt.en === w.en, w));
      li.appendChild(b);
      list.appendChild(li);
    });
    speak(w.en);
  }

  function answer(btn, ok, w) {
    if (locked) return;
    if (!ok) {
      btn.classList.add("wrong");
      btn.disabled = true;
      if (!missed) {
        missed = true;
        if (!state.wrong.includes(w.en)) state.wrong.push(w.en);
        save();
      }
      return;
    }
    locked = true;
    btn.classList.add("correct");
    document.querySelectorAll(".choice").forEach((c) => (c.disabled = true));
    $("example").textContent = w.ex;
    if (state.mode === "review") {
      // 一発正解で克服（リストから外す）。間違えた語はキューの後ろに回してもう一度出す。
      if (!missed) {
        state.wrong = state.wrong.filter((e) => e !== w.en);
        queue.shift();
      } else {
        queue.push(queue.shift());
      }
      save();
      updateTabs();
      return setTimeout(render, 1100);
    }
    if (!missed) state.firstTry[slot()] = (state.firstTry[slot()] || 0) + 1;
    state.pos[slot()] = (state.pos[slot()] || 0) + 1;
    save();
    setTimeout(render, 1100);
  }

  function showDone() {
    $("quiz").hidden = true;
    $("done").hidden = false;
    $("bar").style.width = "100%";
    const review = state.mode === "review";
    if (review) {
      $("doneTitle").textContent = reviewTotal ? "復習完了！ 🎉" : "復習する単語はありません 🎉";
      $("doneText").textContent = reviewTotal
        ? `${reviewTotal} 語をすべて克服しました。`
        : "問題で間違えた単語がここに溜まります。";
      $("restart").textContent = "通常の問題に戻る";
      $("goReview").hidden = true;
    } else {
      const hits = state.firstTry[slot()] || 0;
      $("doneTitle").textContent = "全問クリア！ 🎉";
      $("doneText").textContent = `一発正解 ${hits} / ${deck.length}　復習リスト ${state.wrong.length} 語`;
      $("restart").textContent = "もう一度";
      $("goReview").hidden = !state.wrong.length;
      $("goReview").textContent = `間違えた ${state.wrong.length} 語を復習する`;
    }
  }

  function setLevel(level) {
    state.level = level === "all" ? "all" : Number(level);
    save();
    render();
  }

  function setMode(mode) {
    state.mode = mode;
    if (mode === "review") startReview();
    save();
    render();
  }

  function speak(text) {
    if (!("speechSynthesis" in window)) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/~/g, ""));
      u.lang = "en-US";
      speechSynthesis.speak(u);
    } catch {}
  }

  document.querySelectorAll(".tab").forEach((t) =>
    t.addEventListener("click", () => setMode(t.dataset.mode)));
  $("speak").addEventListener("click", () => speak($("question").textContent));
  $("goReview").addEventListener("click", () => setMode("review"));
  $("restart").addEventListener("click", () => {
    if (state.mode === "review") return setMode("all");
    state.pos[slot()] = 0;
    state.firstTry[slot()] = 0;
    save();
    render();
  });
  $("reset").addEventListener("click", () => {
    if (!confirm("進捗と復習リストをすべてリセットしますか？")) return;
    state = fresh();
    save();
    render();
  });

  if (state.level !== "all" && !LEVELS.some((l) => l.id === state.level)) state.level = "all";
  buildLevels();
  if (state.mode === "review") startReview();
  render();
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
