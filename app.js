const DB_NAME = "JigakuLogDB";
const DB_VERSION = 1;
const USERS = "users";
const META = "meta";

let db;
let state = { users: [], currentUserId: null };

const $ = (s) => document.querySelector(s);

document.addEventListener("DOMContentLoaded", init);

async function init() {
  bindEvents();
  try {
    db = await openDB();
    await loadState();
    render();
  } catch (error) {
    console.error(error);
    document.body.innerHTML = "<p style='padding:30px'>自学ログを起動できませんでした。ページを再読み込みしてください。</p>";
  }
}

function bindEvents() {
  $("#firstUserForm").addEventListener("submit", createFirstUser);
  $("#addUserForm").addEventListener("submit", addUser);
  $("#userButton").addEventListener("click", openPanel);
  $("#closeButton").addEventListener("click", closePanel);
  $("#closePanel").addEventListener("click", closePanel);
  document.addEventListener("click", (e) => {
    const item = e.target.closest("[data-user-id]");
    if (item) switchUser(item.dataset.userId);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePanel();
  });
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(USERS))
        database.createObjectStore(USERS, { keyPath: "id" });
      if (!database.objectStoreNames.contains(META))
        database.createObjectStore(META, { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getAllUsers() {
  return new Promise((resolve, reject) => {
    const req = db.transaction(USERS).objectStore(USERS).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function saveUser(user) {
  return new Promise((resolve, reject) => {
    const req = db.transaction(USERS, "readwrite").objectStore(USERS).put(user);
    req.onsuccess = resolve;
    req.onerror = () => reject(req.error);
  });
}

function getMeta(key) {
  return new Promise((resolve, reject) => {
    const req = db.transaction(META).objectStore(META).get(key);
    req.onsuccess = () => resolve(req.result?.value ?? null);
    req.onerror = () => reject(req.error);
  });
}

function saveMeta(key, value) {
  return new Promise((resolve, reject) => {
    const req = db.transaction(META, "readwrite").objectStore(META).put({ key, value });
    req.onsuccess = resolve;
    req.onerror = () => reject(req.error);
  });
}

async function loadState() {
  state.users = await getAllUsers();
  state.users.sort((a, b) => a.createdAt - b.createdAt);
  state.currentUserId = await getMeta("currentUserId");

  if (!state.users.some(u => u.id === state.currentUserId)) {
    state.currentUserId = null;
  }
}

function newUser(name) {
  return {
    id: crypto.randomUUID(),
    name: name.trim(),
    createdAt: Date.now()
  };
}

async function createFirstUser(e) {
  e.preventDefault();
  const input = $("#firstUserName");
  const name = input.value.trim();
  if (!name) return;

  const user = newUser(name);
  await saveUser(user);
  state.users = [user];
  state.currentUserId = user.id;
  await saveMeta("currentUserId", user.id);
  input.value = "";
  render();
  toast("ユーザーを登録しました");
}

async function addUser(e) {
  e.preventDefault();
  const input = $("#newUserName");
  const message = $("#message");
  const name = input.value.trim();
  message.textContent = "";

  if (!name) {
    message.textContent = "ユーザー名を入力してください。";
    return;
  }

  if (state.users.some(u => u.name.toLowerCase() === name.toLowerCase())) {
    message.textContent = "同じ名前のユーザーがすでにあります。";
    return;
  }

  const user = newUser(name);
  await saveUser(user);
  state.users.push(user);
  state.currentUserId = user.id;
  await saveMeta("currentUserId", user.id);
  input.value = "";
  closePanel();
  render();
  toast(`${user.name}さんに切り替えました`);
}

async function switchUser(id) {
  const user = state.users.find(u => u.id === id);
  if (!user) return;

  state.currentUserId = id;
  await saveMeta("currentUserId", id);
  closePanel();
  render();
  toast(`${user.name}さんに切り替えました`);
}

function currentUser() {
  return state.users.find(u => u.id === state.currentUserId);
}

function render() {
  const hasUsers = state.users.length > 0;
  $("#welcome").classList.toggle("hidden", hasUsers);
  $("#home").classList.toggle("hidden", !hasUsers);
  $("#userButton").classList.toggle("hidden", !hasUsers);

  if (!hasUsers) return;

  const user = currentUser() || state.users[0];
  state.currentUserId = user.id;
  saveMeta("currentUserId", user.id);

  $("#currentUserName").textContent = user.name;
  $("#homeUserName").textContent = user.name;
  renderUsers();
}

function renderUsers() {
  const list = $("#userList");
  list.innerHTML = "";

  state.users.forEach(user => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "user-item" + (user.id === state.currentUserId ? " current" : "");
    button.dataset.userId = user.id;

    const avatar = document.createElement("span");
    avatar.className = "avatar";
    avatar.textContent = user.name.slice(0, 1);

    const name = document.createElement("span");
    name.className = "user-name";
    name.textContent = user.name;

    button.append(avatar, name);

    if (user.id === state.currentUserId) {
      const status = document.createElement("span");
      status.className = "status";
      status.textContent = "使用中";
      button.append(status);
    }

    list.append(button);
  });
}

function openPanel() {
  renderUsers();
  $("#panel").classList.remove("hidden");
  setTimeout(() => $("#newUserName").focus(), 0);
}

function closePanel() {
  $("#panel").classList.add("hidden");
}

function toast(text) {
  const el = $("#toast");
  el.textContent = text;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 2200);
}
