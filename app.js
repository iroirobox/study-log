// ========================================
// 自学ログ
// STEP 2：自学ログ入力 + 保存
// ========================================

const DB_NAME = "StudyLogDB";
const DB_VERSION = 1;

const USER_STORE = "users";
const LOG_STORE = "logs";
const SETTINGS_STORE = "settings";

let db = null;
let currentUser = null;


// ========================================
// IndexedDB
// ========================================

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // ユーザー
      if (!database.objectStoreNames.contains(USER_STORE)) {
        const userStore = database.createObjectStore(USER_STORE, {
          keyPath: "id"
        });

        userStore.createIndex("createdAt", "createdAt", {
          unique: false
        });
      }

      // 自学ログ
      if (!database.objectStoreNames.contains(LOG_STORE)) {
        const logStore = database.createObjectStore(LOG_STORE, {
          keyPath: "id"
        });

        logStore.createIndex("userId", "userId", {
          unique: false
        });

        logStore.createIndex("createdAt", "createdAt", {
          unique: false
        });
      }

      // 設定
      if (!database.objectStoreNames.contains(SETTINGS_STORE)) {
        database.createObjectStore(SETTINGS_STORE, {
          keyPath: "key"
        });
      }
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}


// ========================================
// ユーザー操作
// ========================================

function getAllUsers() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(USER_STORE, "readonly");
    const store = transaction.objectStore(USER_STORE);

    const request = store.getAll();

    request.onsuccess = () => {
      const users = request.result.sort((a, b) => {
        return a.createdAt - b.createdAt;
      });

      resolve(users);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}


function createUser(name) {
  return new Promise((resolve, reject) => {
    const user = {
      id: createId(),
      name: name.trim(),
      createdAt: Date.now()
    };

    const transaction = db.transaction(USER_STORE, "readwrite");
    const store = transaction.objectStore(USER_STORE);

    const request = store.add(user);

    request.onsuccess = () => {
      resolve(user);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}


// ========================================
// ID生成
// ========================================

function createId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2)
  );
}


// ========================================
// 画面切り替え
// ========================================

function showScreen(screenId) {
  const screens = document.querySelectorAll(".screen");

  screens.forEach((screen) => {
    screen.classList.add("hidden");
  });

  const target = document.getElementById(screenId);

  if (target) {
    target.classList.remove("hidden");
  }

  window.scrollTo({
    top: 0,
    behavior: "instant"
  });
}


// ========================================
// 初期化
// ========================================

async function initializeApp() {
  try {
    await openDatabase();

    const users = await getAllUsers();

    if (users.length === 0) {
      showScreen("welcomeScreen");
      return;
    }

    if (users.length === 1) {
      await openHome(users[0]);
      return;
    }

    await showUserSelection();

  } catch (error) {
    console.error(
      "アプリの初期化に失敗しました:",
      error
    );

    alert(
      "データの読み込みに失敗しました。\n" +
      "ブラウザを再読み込みして、もう一度お試しください。"
    );
  }
}


// ========================================
// ユーザー選択画面
// ========================================

async function showUserSelection() {
  const users = await getAllUsers();

  const userList = document.getElementById("userList");

  userList.innerHTML = "";

  users.forEach((user) => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "user-item";

    button.innerHTML = `
      <span class="user-name"></span>
      <span class="user-arrow">›</span>
    `;

    button.querySelector(".user-name").textContent = user.name;

    button.addEventListener("click", () => {
      openHome(user);
    });

    userList.appendChild(button);
  });

  showScreen("userSelectScreen");
}


// ========================================
// ホーム画面
// ========================================

async function openHome(user) {
  currentUser = user;

  const nameElement =
    document.getElementById("currentUserName");

  nameElement.textContent = user.name;

  await updateLogCount();

  showScreen("homeScreen");
}


// ========================================
// ログ操作
// ========================================

function getUserLogs(userId) {
  return new Promise((resolve, reject) => {
    const transaction =
      db.transaction(LOG_STORE, "readonly");

    const store =
      transaction.objectStore(LOG_STORE);

    const index =
      store.index("userId");

    const request =
      index.getAll(userId);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}


function saveStudyLog(log) {
  return new Promise((resolve, reject) => {
    const transaction =
      db.transaction(LOG_STORE, "readwrite");

    const store =
      transaction.objectStore(LOG_STORE);

    const request =
      store.add(log);

    request.onsuccess = () => {
      resolve(log);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}


async function updateLogCount() {
  if (!currentUser) {
    return;
  }

  try {
    const logs =
      await getUserLogs(currentUser.id);

    document.getElementById("logCount").textContent =
      logs.length;

  } catch (error) {
    console.error(
      "ログ件数の取得に失敗しました:",
      error
    );
  }
}


// ========================================
// 入力内容取得
// ========================================

function getLogFormData() {
  return {
    entry:
      document.getElementById("logEntry").value.trim(),

    known:
      document.getElementById("logKnown").value.trim(),

    question:
      document.getElementById("logQuestion").value.trim(),

    thought:
      document.getElementById("logThought").value.trim(),

    next:
      document.getElementById("logNext").value.trim(),

    memo:
      document.getElementById("logMemo").value.trim(),

    category:
      document.getElementById("logCategory").value.trim(),

    tags:
      document.getElementById("logTags").value.trim()
  };
}


// ========================================
// 入力内容クリア
// ========================================

function clearLogForm() {
  document.getElementById("logEntry").value = "";
  document.getElementById("logKnown").value = "";
  document.getElementById("logQuestion").value = "";
  document.getElementById("logThought").value = "";
  document.getElementById("logNext").value = "";
  document.getElementById("logMemo").value = "";
  document.getElementById("logCategory").value = "";
  document.getElementById("logTags").value = "";
}


// ========================================
// ログ入力画面
// ========================================

function openLogForm() {
  if (!currentUser) {
    return;
  }

  clearLogForm();

  showScreen("logFormScreen");

  document.getElementById("logEntry").focus();
}


// ========================================
// ログ保存
// ========================================

async function handleSaveLog() {
  if (!currentUser) {
    alert("ユーザーが選択されていません。");
    return;
  }

  const data = getLogFormData();

  // 「今日の入口」は今回の記録の入口なので必須
  if (!data.entry) {
    alert("「今日の入口」を入力してください。");

    document.getElementById("logEntry").focus();

    return;
  }

  const log = {
    id: createId(),

    userId: currentUser.id,

    createdAt: Date.now(),

    entry: data.entry,

    known: data.known,

    question: data.question,

    thought: data.thought,

    next: data.next,

    memo: data.memo,

    category: data.category,

    tags: data.tags
  };

  try {
    await saveStudyLog(log);

    await updateLogCount();

    clearLogForm();

    alert("自学ログを保存しました。");

    showScreen("homeScreen");

  } catch (error) {
    console.error(
      "自学ログの保存に失敗しました:",
      error
    );

    alert(
      "自学ログの保存に失敗しました。\n" +
      "もう一度お試しください。"
    );
  }
}


// ========================================
// イベント設定
// ========================================

function setupEvents() {

  // ----------------------------------------
  // 初回ユーザー作成
  // ----------------------------------------

  document
    .getElementById("createFirstUserButton")
    .addEventListener("click", async () => {

      const input =
        document.getElementById("firstUserName");

      const name =
        input.value.trim();

      if (!name) {
        alert("名前を入力してください。");

        input.focus();

        return;
      }

      try {
        const user =
          await createUser(name);

        input.value = "";

        await openHome(user);

      } catch (error) {
        console.error(
          "ユーザー作成に失敗しました:",
          error
        );

        alert(
          "ユーザーの作成に失敗しました。\n" +
          "もう一度お試しください。"
        );
      }
    });


  // ----------------------------------------
  // ユーザー追加
  // ----------------------------------------

  document
    .getElementById("addUserButton")
    .addEventListener("click", () => {

      document.getElementById("newUserName").value = "";

      showScreen("addUserScreen");
    });


  document
    .getElementById("createUserButton")
    .addEventListener("click", async () => {

      const input =
        document.getElementById("newUserName");

      const name =
        input.value.trim();

      if (!name) {
        alert("名前を入力してください。");

        input.focus();

        return;
      }

      try {
        await createUser(name);

        input.value = "";

        await showUserSelection();

      } catch (error) {
        console.error(
          "ユーザー追加に失敗しました:",
          error
        );

        alert(
          "ユーザーの追加に失敗しました。\n" +
          "もう一度お試しください。"
        );
      }
    });


  // ----------------------------------------
  // ユーザー選択へ戻る
  // ----------------------------------------

  document
    .getElementById("backToUserSelectButton")
    .addEventListener("click", async () => {

      await showUserSelection();
    });


  // ----------------------------------------
  // ユーザー切替
  // ----------------------------------------

  document
    .getElementById("switchUserButton")
    .addEventListener("click", async () => {

      const users =
        await getAllUsers();

      if (users.length <= 1) {
        alert(
          "現在、登録されているユーザーは1人です。"
        );

        return;
      }

      await showUserSelection();
    });


  // ----------------------------------------
  // 自学ログ入力画面
  // ----------------------------------------

  document
    .getElementById("newLogButton")
    .addEventListener("click", () => {

      openLogForm();
    });


  // ----------------------------------------
  // 自学ログ保存
  // ----------------------------------------

  document
    .getElementById("saveLogButton")
    .addEventListener("click", async () => {

      await handleSaveLog();
    });


  // ----------------------------------------
  // ログ入力画面からホームへ
  // ----------------------------------------

  document
    .getElementById("backToHomeButton")
    .addEventListener("click", () => {

      showScreen("homeScreen");
    });


  document
    .getElementById("cancelLogButton")
    .addEventListener("click", () => {

      const shouldCancel =
        confirm(
          "入力中の内容は保存されません。\n" +
          "ホームに戻りますか？"
        );

      if (!shouldCancel) {
        return;
      }

      clearLogForm();

      showScreen("homeScreen");
    });


  // ----------------------------------------
  // 記録を見る
  // ----------------------------------------

  document
    .getElementById("viewLogsButton")
    .addEventListener("click", () => {

      showScreen("logsScreen");
    });


  // ----------------------------------------
  // 記録一覧からホームへ
  // ----------------------------------------

  document
    .getElementById("backFromLogsButton")
    .addEventListener("click", () => {

      showScreen("homeScreen");
    });


  // ----------------------------------------
  // Enterキー
  // ----------------------------------------

  document
    .getElementById("firstUserName")
    .addEventListener("keydown", (event) => {

      if (event.key === "Enter") {

        document
          .getElementById("createFirstUserButton")
          .click();
      }
    });


  document
    .getElementById("newUserName")
    .addEventListener("keydown", (event) => {

      if (event.key === "Enter") {

        document
          .getElementById("createUserButton")
          .click();
      }
    });
}


// ========================================
// アプリ開始
// ========================================

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    setupEvents();

    await initializeApp();
  }
);
