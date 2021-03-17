function showClearIcon() {
  const searchBtn = document.getElementById("searchKey");
  if (!searchBtn) {
    return;
  }

  const clearIcon = document.getElementById("clearIcon");
  if (!clearIcon) {
    return;
  }

  if (searchBtn.value.trim().length >= 1) {
    clearIcon.style.visibility = "visible";
  } else {
    clearIcon.style.visibility = "hidden";
  }
}

function clearSearchBar() {
  const searchBtn = document.getElementById("searchKey");
  const clearIcon = document.getElementById("clearIcon");
  if (searchBtn) {
    searchBtn.value = "";
  }
  if (clearIcon) {
    clearIcon.style.visibility = "hidden";
  }
}

function toggleSideBar() {
  const sideBar = document.getElementById("sideBar");
  let hidden = sideBar.style.visibility === "hidden";
  if (hidden) {
    sideBar.style.visibility = "visible";
  } else {
    sideBar.style.visibility = "hidden";
  }
}
