function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  updateAuthState();
}

window.logout = logout;