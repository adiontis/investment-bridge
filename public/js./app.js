function showPage(pageId) {
  console.log('Showing page:', pageId);

  const pages = document.querySelectorAll('.page');
  pages.forEach(page => page.classList.remove('active'));

  const targetPage = document.getElementById(pageId);
  if (targetPage) {
    targetPage.classList.add('active');
    window.scrollTo(0, 0);
  } else {
    console.error('Page not found:', pageId);
  }
}

function logout() {
  alert('Logout functionality coming soon!');
}

console.log('JavaScript loaded successfully!');