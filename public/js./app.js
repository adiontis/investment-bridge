function showPage(pageId) {
  console.log("Switching to page:", pageId);
  const pages = document.querySelectorAll(".page");
  pages.forEach(page => page.classList.remove("active"));

  const target = document.getElementById(pageId);
  if (target) {
    target.classList.add("active");
    window.scrollTo(0, 0);
  } else {
    console.error("Page not found:", pageId);
  }
}

function logout() {
  alert("Logout clicked");
}

console.log("JavaScript loaded ✅");