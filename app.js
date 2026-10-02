// ========================================
// 自学ログ
// STEP 1：ユーザー管理 + IndexedDB
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
}


// ========================================
// 初期化
// ========================================

async function initializeApp() {
  try {
    await openDatabase();

    const users = await getAllUsers();

    if (users.length === 0) {
      // 初回
      showScreen("welcomeScreen");
      return;
    }

    if (users.length === 1) {
      // 1人だけなら選択画面を飛ばす
      await openHome(users[0]);
      return;
    }

    // 2人以上ならユーザー選択
    await showUserSelection();

  } catch (error) {
    console.error("アプリの初期化に失敗しました:", error);

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

  const nameElement = document.getElementById("currentUserName");

  nameElement.textContent = user.name;

  await updateLogCount();

  showScreen("homeScreen");
}


// ========================================
// ログ件数
// ========================================

function getUserLogs(userId) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(LOG_STORE, "readonly");
    const store = transaction.objectStore(LOG_STORE);
    const index = store.index("userId");

    const request = index.getAll(userId);

    request.onsuccess = () => {
      resolve(request.result);
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
    const logs = await getUserLogs(currentUser.id);

    document.getElementById("logCount").textContent = logs.length;
  } catch (error) {
    console.error("ログ件数の取得に失敗しました:", error);
  }
}


// ========================================
// イベント設定
// ========================================

function setupEvents() {

  // ------------------------------
  // 初回ユーザー作成
  // ------------------------------

  document
    .getElementById("createFirstUserButton")
    .addEventListener("click", async () => {

      const input = document.getElementById("firstUserName");
      const name = input.value.trim();

      if (!name) {
        alert("名前を入力してください。");
        input.focus();
        return;
      }

      try {
        const user = await createUser(name);

        input.value = "";

        await openHome(user);

      } catch (error) {
        console.error("ユーザー作成に失敗しました:", error);

        alert(
          "ユーザーの作成に失敗しました。\n" +
          "もう一度お試しください。"
        );
      }
    });


  // ------------------------------
  // ユーザー追加
  // ------------------------------

  document
    .getElementById("addUserButton")
    .addEventListener("click", () => {
      document.getElementById("newUserName").value = "";
      showScreen("addUserScreen");
    });


  document
    .getElementById("createUserButton")
    .addEventListener("click", async () => {

      const input = document.getElementById("newUserName");
      const name = input.value.trim();

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
        console.error("ユーザー追加に失敗しました:", error);

        alert(
          "ユーザーの追加に失敗しました。\n" +
          "もう一度お試しください。"
        );
      }
    });


  // ------------------------------
  // ユーザー選択へ戻る
  // ------------------------------

  document
    .getElementById("backToUserSelectButton")
    .addEventListener("click", async () => {
      await showUserSelection();
    });


  // ------------------------------
  // ユーザー切替
  // ------------------------------

  document
    .getElementById("switchUserButton")
    .addEventListener("click", async () => {
      const users = await getAllUsers();

      if (users.length <= 1) {
        alert("現在、登録されているユーザーは1人です。");
        return;
      }

      await showUserSelection();
    });


  // ------------------------------
  // 今回は未実装
  // ------------------------------

  document
    .getElementById("newLogButton")
    .addEventListener("click", () => {
      alert("自学ログの記録機能は、次のステップで追加します。");
    });


  document
    .getElementById("viewLogsButton")
    .addEventListener("click", () => {
      alert("記録一覧は、次のステップで追加します。");
    });


  // ------------------------------
  // Enterキー
  // ------------------------------

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

document.addEventListener("DOMContentLoaded", async () => {
  setupEvents();
  await initializeApp();
});
