(() => {
  const KEY = "english-master-v1";
  const CHOICES = 4;
  const $ = (id) => document.getElementById(id);

  // 保存データ: mode, pos(モード別の進行位置), correct(初回正解数), wrong(間違えた単語のen配列)
  const defaults = { mode: "all", pos: {}, firstTry: {}, wrong: [] };
  let state = load();
  let deck = [];
  let locked = false;
  let missed = false; // 現在の問題で既に間違えたか

  function load() {
    try { return { ...defaults, ...JSON.parse(localStorage.getItem(KEY)) }; }
    catch { return { ...defaults }; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  }

  function buildDeck() {
    if (state.mode === "review") return WORDS.filter((w) => state.wrong.includes(w.en));
    if (state.mode === "all") return WORDS;
    return WORDS.filter((w) => w.type === state.mode);
  }

  function shuffle(a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function render() {
    deck = buildDeck();
    document.querySelectorAll(".tab").forEach((t) =>
      t.classList.toggle("active", t.dataset.mode === state.mode));
    const i = state.pos[state.mode] || 0;
    const hits = state.firstTry[state.mode] || 0;
    $("bar").style.width = deck.length ? (Math.min(i, deck.length) / deck.length) * 100 + "%" : "0%";
    $("pos").textContent = `${Math.min(i + 1, deck.length)} / ${deck.length}`;
    $("score").textContent = `一発正解 ${hits}`;

    if (!deck.length || i >= deck.length) return showDone(i);
    $("quiz").hidden = false;
    $("done").hidden = true;
    showQuestion(deck[i]);
  }

  function showQuestion(w) {
    locked = false;
    missed = false;
    $("badge").textContent = w.type === "word" ? "英単語" : "熟語";
    $("question").textContent = w.en;
    $("example").textContent = "";
    // 同じ種類から優先してダミー選択肢を選ぶ（重複する意味は除外）
    const pool = shuffle(WORDS.filter((x) => x.en !== w.en && x.ja !== w.ja));
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
    if (!missed) state.firstTry[state.mode] = (state.firstTry[state.mode] || 0) + 1;
    // 復習モードで正解したら復習リストから外す
    if (state.mode === "review" && !missed) {
      state.wrong = state.wrong.filter((e) => e !== w.en);
      // デッキが縮むので位置は進めない
      save();
      return setTimeout(render, 1100);
    }
    state.pos[state.mode] = (state.pos[state.mode] || 0) + 1;
    save();
    setTimeout(render, 1100);
  }

  function showDone(i) {
    $("quiz").hidden = true;
    $("done").hidden = false;
    if (state.mode === "review" && !deck.length) {
      $("doneTitle").textContent = "復習する単語はありません 🎉";
      $("doneText").textContent = "間違えた単語がここに溜まります。";
      $("restart").hidden = true;
    } else {
      const hits = state.firstTry[state.mode] || 0;
      $("doneTitle").textContent = "全問クリア！ 🎉";
      $("doneText").textContent = `一発正解 ${hits} / ${deck.length}　復習リスト ${state.wrong.length} 語`;
      $("restart").hidden = false;
    }
    $("bar").style.width = "100%";
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
    t.addEventListener("click", () => { state.mode = t.dataset.mode; save(); render(); }));
  $("speak").addEventListener("click", () => speak($("question").textContent));
  $("restart").addEventListener("click", () => {
    state.pos[state.mode] = 0;
    state.firstTry[state.mode] = 0;
    save();
    render();
  });
  $("reset").addEventListener("click", () => {
    if (!confirm("進捗と復習リストをすべてリセットしますか？")) return;
    state = { ...defaults };
    save();
    render();
  });

  render();
})();
