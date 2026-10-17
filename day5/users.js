const loadButton = document.querySelector("#load-users");
const filterInput = document.querySelector("#filter-input");
const statusMessage = document.querySelector("#status");
const usersList = document.querySelector("#users-list");

const usersUrl = "https://jsonplaceholder.typicode.com/users";
let users = [];
let hasLoadedUsers = false;

function renderUsers(list) {
  usersList.replaceChildren();

  for (const user of list) {
    const listItem = document.createElement("li");
    const name = document.createElement("h2");
    const email = document.createElement("p");
    const city = document.createElement("p");
    const company = document.createElement("p");

    name.textContent = user.name;
    email.textContent = `Email: ${user.email}`;
    city.textContent = `City: ${user.address.city}`;
    company.textContent = `Company: ${user.company.name}`;

    listItem.append(name, email, city, company);
    usersList.append(listItem);
  }
}

function showFilteredUsers() {
  const searchTerm = filterInput.value.trim().toLowerCase();
  const filteredUsers = users.filter((user) => user.name.toLowerCase().includes(searchTerm));

  renderUsers(filteredUsers);

  if (filteredUsers.length === 0) {
    statusMessage.textContent = "No users match your filter.";
  } else if (filteredUsers.length === users.length) {
    statusMessage.textContent = "Users loaded successfully.";
  } else {
    statusMessage.textContent = `Showing ${filteredUsers.length} of ${users.length} users.`;
  }
}

async function loadUsers() {
  loadButton.disabled = true;
  statusMessage.textContent = "Loading users...";

  try {
    const response = await fetch(usersUrl);
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}.`);
    }

    const loadedUsers = await response.json();
    if (!Array.isArray(loadedUsers)) {
      throw new Error("The server response did not contain a user list.");
    }

    users = loadedUsers;
    hasLoadedUsers = true;
    showFilteredUsers();
  } catch (error) {
    users = [];
    hasLoadedUsers = false;
    usersList.replaceChildren();
    statusMessage.textContent = `Unable to load users: ${error.message}`;
  } finally {
    loadButton.disabled = false;
  }
}

loadButton.addEventListener("click", loadUsers);
filterInput.addEventListener("input", () => {
  if (hasLoadedUsers) {
    showFilteredUsers();
  }
});
